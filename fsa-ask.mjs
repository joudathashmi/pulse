/**
 * Statement-scoped answers. Pack Ask Me stays separate.
 * Replies in the UI language. Numbers come only from the selected filing.
 */
import { STATEMENTS } from './fsa-extract.mjs';

function line(filing, key) {
  return (filing?.lines || []).find(l => l.key === key) || null;
}

function ratio(filing, id) {
  return (filing?.assessment?.ratios || []).find(r => r.id === id) || null;
}

function fmt(n, lang, { pct = false, digits = 0 } = {}) {
  if (n == null || Number.isNaN(Number(n))) return lang === 'ar' ? '—' : '—';
  if (pct) {
    return `${(Number(n) * 100).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })}%`;
  }
  const abs = Math.abs(Number(n));
  const body = abs.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
  return Number(n) < 0 ? `(${body})` : body;
}

function yoy(row) {
  if (!row || row.current == null || row.prior == null || row.prior === 0) return null;
  return (row.current - row.prior) / Math.abs(row.prior);
}

const KEY_Q = [
  ['revenue', /revenue|turnover|sales|إيراد|مبيعات/i],
  ['net_profit', /net profit|profit for the year|net income|صافي الربح|ربح السنة/i],
  ['gross_profit', /gross profit|مجمل الربح/i],
  ['operating_profit', /operating profit|الربح التشغيلي/i],
  ['total_assets', /total assets|إجمالي الأصول|مجموع الموجودات/i],
  ['equity', /equity|حقوق الملك/i],
  ['cash', /cash equivalent|نقد وما|نقدية/i],
  ['total_liab', /total liabilities|إجمالي الالتزام|المطلوبات/i],
  ['inventory', /inventor|مخزون/i],
  ['cfo', /operating cash|أنشطة تشغيل/i]
];

const RATIO_Q = [
  ['current', /current ratio|نسبة التداول/i],
  ['quick', /quick ratio|النسبة السريعة/i],
  ['de', /debt|leverage|التزامات إلى|الرفع/i],
  ['roe', /roe|return on equity|العائد على حقوق/i],
  ['roa', /roa|return on assets|العائد على الأصول/i],
  ['gross', /gross margin|هامش مجمل/i],
  ['opm', /operating margin|الهامش التشغيلي/i],
  ['npm', /net margin|صافي الهامش/i]
];

export function answerFiling(filing, raw, lang = 'en') {
  const ar = lang === 'ar';
  const q = String(raw || '').trim();
  if (!filing) {
    return {
      text: ar ? 'اختر قائمة مالية أولاً.' : 'Select a financial statement first.',
      cites: []
    };
  }
  if (!q) {
    return {
      text: ar
        ? `اسأل عن ${filing.identity?.entityAr || filing.identity?.entity || 'هذه القائمة'}. الإيراد، الربح، النسب، أو الاكتمال.`
        : `Ask about ${filing.identity?.entity || 'this filing'}. Revenue, profit, ratios, or completeness.`,
      cites: []
    };
  }

  const id = filing.identity || {};
  const unit = id.unit || "SAR '000";
  const cites = [];

  const citeLine = (row) => {
    if (!row) return;
    cites.push({
      key: row.key,
      statement: row.statement,
      page: row.page,
      label: ar ? row.labelAr : row.label,
      current: row.current,
      prior: row.prior
    });
  };

  if (/who|كيان|شركة|entity|what company/i.test(q) && /fil|stat|قائمة|هذه/i.test(q) || /^(who is this|ما هذه الشركة)/i.test(q)) {
    return {
      text: ar
        ? `${id.entityAr || id.entity} · ${id.periodLabel || ''} · ${id.framework || 'IFRS'} · ${unit}. ${filing.synthetic ? 'تركيبي · مُعبَّأ. لا يكتب النبض.' : 'مستخرج من الملف.'}`
        : `${id.entity} · ${id.periodLabel || ''} · ${id.framework || 'IFRS'} · ${unit}. ${filing.synthetic ? 'Synthetic · populated. Does not write the Pulse.' : 'Extracted from the uploaded file.'}`,
      cites
    };
  }

  if (/complete|اكتمال|missing|ناقص|ias 1|المطلوب/i.test(q)) {
    const c = filing.assessment?.completeness || {};
    const bits = STATEMENTS.filter(s => s.id !== 'notes').map(s =>
      `${ar ? s.titleAr : s.title}: ${c[s.id] ? (ar ? 'موجود' : 'present') : (ar ? 'ضعيف' : 'thin')}`
    );
    return {
      text: (ar ? 'اكتمال معيار 1 · ' : 'IAS 1 completeness · ') + bits.join(ar ? ' · ' : ' · '),
      cites
    };
  }

  if (/gate|بواب|جودة|assess|تقييم|articulation|اتساق/i.test(q)) {
    const gates = filing.assessment?.gates || [];
    const lines = gates.map(g =>
      `${ar ? g.nameAr : g.name}: ${g.status} — ${ar ? g.detailAr : g.detail}`
    );
    return {
      text: (ar
        ? 'تقييم آلي. الآلة تستخرج والشخص يوقّع. لا يُكتب النبض.\n\n'
        : 'Machine assessment. A person still signs. The Pulse is not written.\n\n') + lines.join('\n'),
      cites
    };
  }

  for (const [idR, re] of RATIO_Q) {
    if (re.test(q)) {
      const row = ratio(filing, idR);
      if (!row || row.value == null) {
        return {
          text: ar ? 'تعذّر حساب هذه النسبة من البنود المستخرجة.' : 'That ratio could not be computed from the extracted lines.',
          cites
        };
      }
      const pct = /margin|هامش/.test(row.name) || /margin|هامش/.test(row.nameAr);
      return {
        text: ar
          ? `${row.nameAr} = ${fmt(row.value, 'ar', { pct, digits: pct ? 1 : 2 })}${row.prior != null ? ` · السنة المقارنة ${fmt(row.prior, 'ar', { pct, digits: pct ? 1 : 2 })}` : ''}. ${row.convention}.`
          : `${row.name} = ${fmt(row.value, 'en', { pct, digits: pct ? 1 : 2 })}${row.prior != null ? ` · comparative ${fmt(row.prior, 'en', { pct, digits: pct ? 1 : 2 })}` : ''}. ${row.convention}.`,
        cites
      };
    }
  }

  if (/yoy|year on year|تغير|نمو|compared|مقارن/i.test(q)) {
    const keys = ['revenue', 'net_profit', 'total_assets', 'equity'];
    const parts = [];
    for (const key of keys) {
      const row = line(filing, key);
      if (!row) continue;
      citeLine(row);
      const ch = yoy(row);
      parts.push(ar
        ? `${row.labelAr}: ${fmt(row.current, 'ar')} ← ${fmt(row.prior, 'ar')} (${ch == null ? '—' : fmt(ch, 'ar', { pct: true })})`
        : `${row.label}: ${fmt(row.current, 'en')} vs ${fmt(row.prior, 'en')} (${ch == null ? '—' : fmt(ch, 'en', { pct: true })})`);
    }
    return {
      text: parts.join('\n') || (ar ? 'لا أرقام مقارنة كافية.' : 'Not enough comparative figures.'),
      cites
    };
  }

  for (const [key, re] of KEY_Q) {
    if (re.test(q)) {
      const row = line(filing, key);
      if (!row) {
        return {
          text: ar ? 'هذا البند لم يُستخرج من الملف.' : 'That line was not mapped from the file.',
          cites
        };
      }
      citeLine(row);
      const ch = yoy(row);
      return {
        text: ar
          ? `${row.labelAr} · ${id.periodLabel || ''} · ${fmt(row.current, 'ar')} ${unit}${row.prior != null ? ` · ${id.comparative || 'المقارنة'} ${fmt(row.prior, 'ar')}` : ''}${ch != null ? ` · التغير ${fmt(ch, 'ar', { pct: true })}` : ''}. ${row.ifrs} · صفحة ${row.page || '—'}. المصدر: «${row.sourceLabel}».`
          : `${row.label} · ${id.periodLabel || ''} · ${fmt(row.current, 'en')} ${unit}${row.prior != null ? ` · ${id.comparative || 'prior'} ${fmt(row.prior, 'en')}` : ''}${ch != null ? ` · change ${fmt(ch, 'en', { pct: true })}` : ''}. ${row.ifrs} · page ${row.page || '—'}. Source label: “${row.sourceLabel}”.`,
        cites
      };
    }
  }

  if (/ratio|نسب|margin|هامش|return|عائد/i.test(q)) {
    const rows = (filing.assessment?.ratios || []).filter(r => r.value != null);
    const parts = rows.map(r => {
      const pct = /margin|هامش|return|عائد/.test(r.name);
      return `${ar ? r.nameAr : r.name} ${fmt(r.value, ar ? 'ar' : 'en', { pct, digits: pct ? 1 : 2 })}`;
    });
    return {
      text: parts.join(ar ? ' · ' : ' · ') || (ar ? 'لا نسب بعد.' : 'No ratios yet.'),
      cites
    };
  }

  const mapped = filing.lines?.length || 0;
  return {
    text: ar
      ? `${id.entityAr || id.entity} · ${id.periodLabel || ''} · ${mapped} بنداً مستخرجاً. اسأل عن الإيراد أو الربح أو نسبة التداول أو الاكتمال. التقييم لا يكتب النبض.`
      : `${id.entity} · ${id.periodLabel || ''} · ${mapped} mapped lines. Ask for revenue, profit, the current ratio, or completeness. This assessment does not write the Pulse.`,
    cites
  };
}
