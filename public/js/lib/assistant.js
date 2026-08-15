import { ownerForMetric, loadQueries, pendingCount } from './queries.js';
import { getKpiMeta } from '../fixtures/kpiMeta.js';

/**
 * Pack-aware assistant - answers from brief.json / series (no external model).
 * Aligns with plan capability: “Ask in plain language”.
 */

function statusWord(status) {
  if (status === 'watch') return 'Watch';
  if (status === 'risk') return 'At risk';
  return 'On track';
}

function n(v, d = 1) {
  if (v == null || Number.isNaN(Number(v))) return '-';
  return Number(v).toLocaleString('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: d
  });
}

function editDist(a, b) {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 1) return 2;
  const dp = Array.from({ length: m + 1 }, (_, i) => {
    const row = Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

const COUNTRY_ALIAS = {
  USA: ['usa', 'us', 'usam', 'u.s', 'u.s.a', 'america', 'american', 'united states', 'united states of america'],
  GBR: ['uk', 'britain', 'england', 'united kingdom', 'great britain'],
  ARE: ['uae', 'emirates', 'united arab emirates'],
  CHN: ['china', 'prc', 'chinese'],
  FRA: ['france', 'french'],
  DEU: ['germany', 'german'],
  JPN: ['japan', 'japanese'],
  IND: ['india', 'indian'],
  KOR: ['korea', 'south korea', 'republic of korea'],
  NLD: ['netherlands', 'holland', 'dutch'],
  CHE: ['switzerland', 'swiss'],
  CAN: ['canada', 'canadian'],
  ITA: ['italy', 'italian'],
  ESP: ['spain', 'spanish'],
  TUR: ['turkey', 'turkiye', 'turkish'],
  EGY: ['egypt', 'egyptian'],
  KWT: ['kuwait', 'kuwaiti'],
  QAT: ['qatar', 'qatari'],
  BHR: ['bahrain', 'bahraini'],
  JOR: ['jordan', 'jordanian'],
  LBN: ['lebanon', 'lebanese'],
  LUX: ['luxembourg'],
  IRL: ['ireland', 'irish'],
  CYM: ['cayman', 'cayman islands'],
  BMU: ['bermuda']
};

const SKIP_ORIGIN = new Set([
  'the', 'for', 'to', 'from', 'was', 'what', 'fdi', 'gfcf', 'saudi', 'ksa',
  'kingdom', 'arabia', 'inflow', 'outflow', 'net', 'stock', 'year', 'into',
  'and', 'how', 'did', 'does', 'about', 'show', 'open', 'please', 'tell'
]);

function parseYear(q) {
  const m = String(q || '').match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : null;
}

function uniqueOrigins(rows = []) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    if (!r?.id || seen.has(r.id)) continue;
    seen.add(r.id);
    out.push({ id: r.id, name: r.name });
  }
  return out;
}

function aliasesFor(c) {
  return [
    String(c.id || '').toLowerCase(),
    String(c.name || '').toLowerCase(),
    ...(COUNTRY_ALIAS[c.id] || [])
  ].filter(Boolean);
}

/** Immediate-country origin from the question. Typos like "usam" resolve to USA. */
export function resolveOrigin(q, rows = []) {
  const lower = String(q || '').toLowerCase();
  const list = uniqueOrigins(rows);
  if (!lower || !list.length) return null;

  for (const c of list) {
    for (const a of aliasesFor(c)) {
      if (a.length >= 4 && lower.includes(a)) return c;
    }
  }

  const tokens = lower.split(/[^a-z0-9\u0600-\u06ff.]+/).filter(Boolean);
  for (const tok of tokens) {
    if (SKIP_ORIGIN.has(tok) || /^\d+$/.test(tok)) continue;
    for (const c of list) {
      const aliases = aliasesFor(c);
      if (aliases.includes(tok)) return c;
      if (tok.length >= 3) {
        for (const a of aliases) {
          if (a.length >= 3 && a.length <= 8 && editDist(tok, a) <= 1) return c;
        }
      }
    }
  }
  return null;
}

function countryYearRow(rows, id, year) {
  return (rows || []).find(r => r.id === id && r.year === year) || null;
}

function latestYearFor(rows, id) {
  const years = (rows || []).filter(r => r.id === id && r.year).map(r => r.year);
  return years.length ? Math.max(...years) : null;
}

function matchSignal(q, signals = []) {
  const words = q.toLowerCase().split(/[^a-z0-9\u0600-\u06ff]+/).filter(w => w.length > 2);
  let best = null, score = 0;
  for (const s of signals) {
    const hay = `${s.name} ${s.nameAr || ''} ${s.id} ${s.source || ''}`.toLowerCase();
    let sc = 0;
    for (const w of words) if (hay.includes(w)) sc += 1;
    if (sc > score) { score = sc; best = s; }
  }
  return score >= 1 ? best : null;
}

export const PAGE_HELP = {
  pulse: {
    name: 'Investment Pulse Operating System',
    hint: 'The gold orb is the certified headline. FDI monitor opens the country map. The orb opens the four-tap drill.'
  },
  fdi: {
    name: 'FDI',
    hint: 'Gold arrows are immediate-country inflows. Tap a flag chip to pin a country. Play from 2021 walks the years.'
  },
  drill: {
    name: 'Drill path',
    hint: 'Four taps: headline, indicator, sector or region, then the source record.'
  },
  now: {
    name: 'Nowcast',
    hint: 'In-quarter estimate versus the official print. On this host the path is a populated synthetic estimate, not a MISA calculation. It never replaces the certified figure.'
  },
  alerts: {
    name: 'Work on the pack',
    hint: 'Open, Quarantine and Actions are the work lists. Held values do not enter the certified Pulse.'
  },
  qual: {
    name: 'Quality',
    hint: 'Six DQAF gates. A machine flags; a named person signs.'
  },
  intake: {
    name: 'Intake',
    hint: 'Live connectors pull published feeds. A person certifies. The certified Pulse is not overwritten.'
  },
  inv: {
    name: 'Inventory',
    hint: '326 ministry metrics. The Pulse board shows only the certified pack - 2 headlines and 20 signals.'
  },
  about: {
    name: 'Provenance',
    hint: 'What is loaded from source files versus what this prototype models so the live path can be exercised.'
  },
  settings: {
    name: 'Settings',
    hint: 'Help menu, the board guide, the data glossary, KPI owners, and email-alert preferences. On your desk and in Display.'
  }
};

export function pageHelp(view) {
  return PAGE_HELP[view] || PAGE_HELP.pulse;
}

/** Proactive offer when the user looks stuck. Pack only. */
export function nudgeHelp(view) {
  const page = pageHelp(view);
  const extra = {
    pulse: { label: 'Open work on the pack', prompt: 'Show alerts' },
    fdi: { label: 'Who leads inflow?', prompt: 'Who leads inflow?' },
    drill: { label: 'How do I use this page?', prompt: 'How do I use this page?' },
    alerts: { label: 'Ask owner about GFCF', prompt: 'Ask owner about GFCF' },
    now: { label: 'What is the nowcast?', prompt: 'What is the nowcast?' },
    inv: { label: 'Where do we stand?', prompt: 'Where do we stand?' },
    qual: { label: 'Show alerts', prompt: 'Show alerts' },
    intake: { label: 'Show alerts', prompt: 'Show alerts' },
    about: { label: 'Open FDI', prompt: 'Open FDI' },
    settings: { label: 'Start the guide', prompt: 'Start the guide' }
  };
  return {
    text: `Need a hand finding something? You are on ${page.name}. ${page.hint}\n\nAsk for a number, a page, or a named owner. Or start the guide.`,
    actions: [
      { label: 'I need help', prompt: 'I need help' },
      extra[view] || extra.pulse,
      { label: 'Start the guide', prompt: 'Start the guide' }
    ]
  };
}

export function answerQuestion(raw, data = {}, ctx = {}) {
  const q = (raw || '').trim();
  if (!q) {
    return {
      text: 'How can I help? Ask about this page, FDI, GFCF, alerts, or say you need support.',
      actions: []
    };
  }

  const lower = q.toLowerCase();
  const brief = data.brief || {};
  const fdi = brief.headlines?.fdi;
  const gfcf = brief.headlines?.gfcf;
  const signals = brief.signals || [];
  const actions = [];

  const wantsOpen = /\b(open|show|drill|take me|go to|افتح|اعرض)\b/i.test(q);
  const aboutFdi = /\b(fdi|foreign direct|استثمار أجنبي|الاستثمار الأجنبي)\b/i.test(q);
  const aboutGfcf = /\b(gfcf|capital formation|تكوين رأس|رأس المال)\b/i.test(q);
  const aboutWhy = /\b(why|why did|what moved|سبب|لماذا|ليش)\b/i.test(q);
  const aboutSignal = /\b(signal|leading|pmi|cds|confidence|import|export|deal|مؤشر|إشارة)\b/i.test(q);
  const aboutAlert = /\b(alert|risk|watch|overdue|تنبيه)\b/i.test(q);
  const aboutQualify = /\b(ask owner|qualify|qualification|clarify|caveat|اسأل المالك|توضيح)\b/i.test(q);
  const aboutDef = /\b(defin|what is|what does .+ mean|how is .+ calculated|تعريف|معنى)\b/i.test(q);
  const aboutNowcast = /\b(nowcast|estimate|forecast|تقدير|توقع)\b/i.test(q);
  const aboutTour = /\b(tour|start the guide|start guide|walk me|show me around|جولة|المرشد)\b/i.test(q);
  const aboutHelp = /\b(help|support|assist|how do i|how to|what can you|this page|explain this|مرحبا|مساعدة|دعم)\b/i.test(q);
  const aboutWhere = /\b(where do we stand|how are we|position|أين نقف|الوضع)\b/i.test(q);
  const aboutMyQueries = /\b(my questions|my queries|pending questions|أسئلتي)\b/i.test(q);
  const aboutDesk = /\b(my desk|messages|assignments|what do i own|ownership|my kpis|مكتبي|رسائلي|تكليف|ملكية)\b/i.test(q);
  const aboutAdmin = /\b(admin|user console|directory|data council|sign out|log ?out|وحدة المستخدم|مجلس البيانات|خروج)\b/i.test(q);
  const aboutSettings = /\b(settings|glossary|email alerts?|kpi owners?|help menu|help guide|إعدادات|مسرد)\b/i.test(q);

  if (aboutSettings) {
    const tab = /\bglossary|مسرد\b/i.test(q) ? 'glossary'
      : /\bowner|ملاك\b/i.test(q) ? 'owners'
      : /\bemail|بريد|تنبيه\b/i.test(q) ? 'mail'
      : 'help';
    actions.push({ label: 'Open Settings', run: () => ctx.openDesk?.('settings', tab) || ctx.go?.('settings', { section: tab }) });
    return {
      text: 'Settings holds the help menu, the board guide, the data glossary, KPI owners, and email-alert preferences. Open Display or your desk - not a board tab.',
      actions
    };
  }

  if (aboutTour) {
    queueMicrotask(() => ctx.startTour?.());
    return {
      text: 'Starting the Guide. It walks the live board, the country map, how a number is traced, and how a feed is certified.',
      actions: []
    };
  }

  if (aboutHelp) {
    const page = pageHelp(ctx.getView?.());
    return {
      text: `Help and support · ${page.name}\n${page.hint}\n\nI can explain this page, open FDI / Nowcast / Alerts, define a number, or ask a named owner to qualify it. Say what you need.`,
      actions: [
        { label: 'Open FDI', run: () => ctx.go?.('fdi') },
        { label: 'Open Alerts', run: () => ctx.go?.('alerts') },
        { label: 'Ask owner · GFCF', run: () => {
          const info = ownerForMetric('gfcf', brief);
          ctx.openAskOwner?.({
            metric: 'gfcf',
            value: String(info.value ?? gfcf?.pulseValue ?? ''),
            owner: info.owner,
            ownerContact: info.contact,
            title: 'GFCF'
          });
        }}
      ]
    };
  }

  if (aboutDef) {
    const id = aboutGfcf ? 'gfcf' : aboutFdi ? 'fdi' : (matchSignal(q, signals)?.id || 'fdi');
    const meta = getKpiMeta(id, brief) || getKpiMeta(aboutGfcf ? 'gfcf' : 'fdi', brief);
    if (meta) {
      actions.push({
        label: 'Ask owner · definition',
        run: () => ctx.openAskOwner?.({
          metric: meta.id,
          value: '',
          owner: meta.owner,
          ownerContact: ownerForMetric(meta.id, brief).contact,
          title: meta.name,
          question: `Please confirm the official definition of “${meta.name}”.\n\n${meta.definition}`
        })
      });
      return {
        text: `${meta.name}\n\nDefinition: ${meta.definition}\n\nSource: ${meta.source}\nMethod: ${meta.method}\nCalculated: ${meta.calculatedLabel}\nOwner: ${meta.owner}\n\nHover the ◆ signature on any KPI tile for the same stamp.`,
        actions
      };
    }
  }

  if (aboutAdmin) {
    actions.push({ label: 'Open Settings', run: () => ctx.openDesk?.('settings') || ctx.go?.('settings') });
    actions.push({ label: 'Open my desk', run: () => ctx.openDesk?.() });
    return {
      text: 'Sign out is on your desk and in Display. Settings is in that same menu: help, the glossary, KPI owners and email alerts. If you are admin, People is a tab on the desk.',
      actions
    };
  }

  if (aboutDesk) {
    const tab = /\b(assign|تكليف)\b/i.test(q) ? 'assign' : /\b(own|kpi|ملكية)\b/i.test(q) ? 'own' : 'messages';
    actions.push({ label: 'Open my desk', run: () => ctx.openDesk?.(tab) });
    return {
      text: 'Your desk is the user menu in the header. Messages from owners, assignments on you, and the KPIs this desk owns. It is your work - the ministry boards stay in the tab bar.',
      actions
    };
  }

  if (aboutMyQueries) {
    const list = loadQueries();
    const pending = pendingCount();
    actions.push({ label: 'Open Alerts · my questions', run: () => ctx.go?.('alerts') });
    if (!list.length) {
      return { text: 'You have no qualification questions yet. Say “ask owner about GFCF” or open Alerts.', actions };
    }
    const lines = list.slice(0, 5).map(x => `• ${x.status}: ${x.title} → ${x.owner}`).join('\n');
    return {
      text: `${pending} pending of ${list.length} question(s) to owners:\n${lines}`,
      actions
    };
  }

  if (aboutQualify) {
    const metric = aboutGfcf ? 'gfcf' : aboutFdi ? 'fdi' : (matchSignal(q, signals)?.metric || matchSignal(q, signals)?.id || 'gfcf');
    const info = ownerForMetric(metric, brief);
    const label = info.label || metric.toUpperCase();
    actions.push({
      label: `Ask ${info.owner}`,
      run: () => ctx.openAskOwner?.({
        metric,
        value: String(info.value ?? ''),
        owner: info.owner,
        ownerContact: info.contact,
        title: label,
        question: `Please qualify the published value for ${label} (${info.value || '-'}). Is any caveat required for the Committee pack?`
      })
    });
    actions.push({ label: 'Open Alerts', run: () => ctx.go?.('alerts') });
    return {
      text: `Owner for ${label}: ${info.owner} (${info.contact}).\nPublished value: ${info.value || '-'}.\nOpen the form to send a qualification request - tracked under Alerts → My questions to owners.`,
      actions
    };
  }

  const year = parseYear(q);
  const cutRows = data.fdiCut?.countries || [];
  const origin = resolveOrigin(q, cutRows);
  const histYears = data.fdiHistory?.years || [];
  const cutYears = [...new Set(cutRows.map(r => r.year))].sort((a, b) => a - b);
  const cutFrom = cutYears[0];
  const cutTo = cutYears[cutYears.length - 1];

  if (origin) {
    const askedYear = year;
    const useYear = askedYear || latestYearFor(cutRows, origin.id);
    const row = useYear ? countryYearRow(cutRows, origin.id, useYear) : null;
    const national = histYears.find(y => y.year === useYear);
    actions.push({
      label: `Open ${origin.name} · ${useYear || 'FDI'}`,
      run: () => {
        window.__pulseFdiFocus = { year: useYear, countryId: origin.id };
        window.dispatchEvent(new CustomEvent('pulse-fdi-focus', { detail: window.__pulseFdiFocus }));
        ctx.go?.('fdi');
      }
    });
    if (!useYear || (askedYear && (askedYear < cutFrom || askedYear > cutTo))) {
      return {
        text: `${origin.name} into the Kingdom is on the Invest Saudi country cut for ${cutFrom}-${cutTo}. ${askedYear || 'That year'} is not in this series. Open FDI and pick a published year.`,
        actions
      };
    }
    if (!row) {
      return {
        text: `${origin.name} has no published immediate-country row for ${useYear}. The cut covers ${cutFrom}-${cutTo}. Open FDI to see the counterparts that did land.`,
        actions
      };
    }
    const share = national?.inflow && row.inflow != null
      ? `${n((row.inflow / national.inflow) * 100, 0)}% of ${useYear} national inflow`
      : null;
    const yearNote = askedYear ? String(useYear) : `${useYear} (latest published year)`;
    return {
      text: [
        `${origin.name} into the Kingdom · ${yearNote}`,
        `Immediate-country inflow ${n(row.inflow)} SAR bn`,
        `Net ${n(row.net)} · stock ${n(row.stock)}`,
        share,
        `Source: Invest Saudi FDI Insights (immediate country). This is not the certified Pulse Q1 print.`
      ].filter(Boolean).join('\n'),
      actions
    };
  }

  if (aboutFdi && year && year !== 2026) {
    const national = histYears.find(y => y.year === year);
    actions.push({
      label: `Open FDI · ${year}`,
      run: () => {
        window.__pulseFdiFocus = { year };
        window.dispatchEvent(new CustomEvent('pulse-fdi-focus', { detail: window.__pulseFdiFocus }));
        ctx.go?.('fdi');
      }
    });
    if (!national) {
      return {
        text: `National FDI in the Inflows workbook is ${histYears[0]?.year || 2016}-${histYears.at(-1)?.year || 2024}. ${year} is not in that sheet. Country origins for those years are on the FDI map.`,
        actions
      };
    }
    return {
      text: [
        `National FDI · ${year} (Inflows workbook)`,
        `Inflow ${n(national.inflow)} SAR bn · net ${n(national.net)} · stock ${n(national.stock)}`,
        `Country origins for ${year} are on the FDI map. Name a counterpart (for example United States ${year}) for the immediate-country row.`
      ].join('\n'),
      actions
    };
  }

  if (wantsOpen && aboutFdi) {
    actions.push({ label: 'Open FDI path', run: () => ctx.openDrill?.(['fdi']) });
    return {
      text: `Opening FDI. Net FDI is ${n(fdi?.netQ1)} SAR bn (inflow ${n(fdi?.inflowQ1)}, outflow ${n(fdi?.outflowQ1)}). Year target ${n(fdi?.yearTarget)} SAR bn.`,
      actions
    };
  }

  if (wantsOpen && aboutGfcf) {
    actions.push({ label: 'Open GFCF path', run: () => ctx.openDrill?.(['gfcf']) });
    return {
      text: `Opening GFCF. Pulse value ${n(gfcf?.pulseValue, 0)} SAR bn (Q1 issued actual). Year target ${n(gfcf?.yearTarget, 0)} SAR bn.`,
      actions
    };
  }

  if (aboutWhere || (aboutFdi && aboutGfcf) || /stand on investment|investment pulse/i.test(lower)) {
    actions.push(
      { label: 'Drill FDI', run: () => ctx.openDrill?.(['fdi']) },
      { label: 'Drill GFCF', run: () => ctx.openDrill?.(['gfcf']) }
    );
    return {
      text: `Live position · ${brief.source?.asOfLabel || 'July 2026'}\n\nFDI · ${statusWord(fdi?.status)}\nNet ${n(fdi?.netQ1 ?? fdi?.pulseValue)} SAR bn · 2026 target ${n(fdi?.yearTarget)}\nInflow ${n(fdi?.inflowQ1)} · outflow ${n(fdi?.outflowQ1)}\n\nGFCF · ${statusWord(gfcf?.status)}\n${n(gfcf?.pulseValue, 0)} SAR bn · ${gfcf?.pulseLabel || 'Q1'} · 2026 target ${n(gfcf?.yearTarget, 0)}\n\nHold: Q2 actuals not issued by GASTAT.`,
      actions
    };
  }

  if (/\b(who leads|leads .+ inflow|largest origin)\b/i.test(q) || (/\bleads\b/.test(lower) && /\binflow\b/.test(lower))) {
    const rows = (data.fdiCut?.countries || [])
      .filter(c => c.year === 2024 && (c.inflow || 0) > 0)
      .sort((a, b) => (b.inflow || 0) - (a.inflow || 0));
    const top = rows[0];
    actions.push({ label: 'Open FDI', run: () => ctx.go?.('fdi') });
    if (top) {
      return {
        text: `${top.name} leads 2024 immediate-country inflow at ${n(top.inflow)} SAR bn. The next names are on the FDI map and the flag list under it.`,
        actions
      };
    }
    return { text: 'The country cut has not landed yet. Open FDI after Intake pulls investsaudi.sa/fdi.', actions };
  }

  if (aboutFdi && aboutWhy) {
    actions.push({ label: 'Open FDI components', run: () => ctx.openDrill?.(['fdi']) });
    return {
      text: `FDI net ${n(fdi?.netQ1)} SAR bn is the certified headline (BPM6). Inflow ${n(fdi?.inflowQ1)} minus outflow ${n(fdi?.outflowQ1)}. The Q1 forecast band on this host is synthetic (${n(fdi?.eaForecastQ1Low)}–${n(fdi?.eaForecastQ1High)}). Open the drill path for equity / reinvested earnings / debt, then sector and source records.`,
      actions
    };
  }

  if (aboutFdi) {
    actions.push({ label: 'Open FDI', run: () => ctx.openDrill?.(['fdi']) });
    return {
      text: `FDI · ${fdi?.status || 'on track'}\nNet ${n(fdi?.netQ1)} SAR bn (Q1)\nInflow ${n(fdi?.inflowQ1)} · Outflow ${n(fdi?.outflowQ1)}\nH1 forecast ${n(fdi?.h1Forecast)} · 2026 target ${n(fdi?.yearTarget)}\nCumulative to 2025: ${n(fdi?.cumulativeActual2025Bn, 0)} SAR bn of ${fdi?.cumulativeTarget2030Tn} trillion (2030 NIS).`,
      actions
    };
  }

  if (aboutGfcf && aboutWhy) {
    actions.push({ label: 'Open GFCF', run: () => ctx.openDrill?.(['gfcf']) });
    return {
      text: `GFCF is on watch. Pulse shows the Q1 issued actual (${n(gfcf?.pulseValue, 0)} SAR bn). Unissued quarters on this host use a synthetic populated forecast, not an Economic Affairs calculation. Q2 actual is not issued by GASTAT yet.`,
      actions
    };
  }

  if (aboutGfcf) {
    actions.push({ label: 'Open GFCF', run: () => ctx.openDrill?.(['gfcf']) });
    actions.push({
      label: 'Ask owner to qualify',
      run: () => {
        const info = ownerForMetric('gfcf', brief);
        ctx.openAskOwner?.({
          metric: 'gfcf',
          value: String(gfcf?.pulseValue ?? ''),
          owner: info.owner,
          ownerContact: info.contact,
          title: 'GFCF'
        });
      }
    });
    return {
      text: `GFCF · ${gfcf?.status || 'watch'}\n${n(gfcf?.pulseValue, 0)} SAR bn · ${gfcf?.pulseLabel || 'Q1'}\nSynthetic Q2 forecast ${n(gfcf?.eaForecastQ2, 0)} · H1 ${n(gfcf?.h1Forecast, 0)}\n2026 target ${n(gfcf?.yearTarget, 0)} SAR bn\nCumulative: ${gfcf?.cumulativeActual2025Tn} / ${gfcf?.cumulativeTarget2030Tn} trillion toward 2030.`,
      actions
    };
  }

  if (aboutAlert) {
    actions.push({ label: 'Open Alerts', run: () => ctx.go?.('alerts') });
    const risky = signals.filter(s => s.status === 'risk');
    const names = risky.map(s => s.name).slice(0, 4).join('; ') || 'none flagged in pack signals';
    return {
      text: `At-risk leading signals: ${names}. Open Alerts to ask the named owner for qualification.`,
      actions
    };
  }

  if (aboutNowcast) {
    actions.push({ label: 'Open Nowcast', run: () => ctx.go?.('now') });
    return {
      text: 'In-quarter estimates sit on the Nowcast tab. On this hosted prototype they are populated synthetic figures, not MISA calculations. Provisional, with a confidence band, and never a replacement for the official print (FCT-05).',
      actions
    };
  }

  const sig = matchSignal(q, signals);
  if (sig || aboutSignal) {
    const hit = sig || signals[0];
    if (hit) {
      actions.push({ label: `Drill via ${hit.metric?.toUpperCase() || 'FDI'}`, run: () => ctx.openDrill?.([hit.metric || 'fdi']) });
      actions.push({
        label: 'Ask owner to qualify',
        run: () => {
          const info = ownerForMetric(hit.id || hit.metric, brief);
          ctx.openAskOwner?.({
            metric: hit.id || hit.metric,
            value: hit.value,
            owner: info.owner,
            ownerContact: info.contact,
            title: hit.name
          });
        }
      });
      return {
        text: `${hit.name}\nLatest ${hit.value}${hit.delta ? ` (${hit.delta})` : ''}${hit.period ? ` · ${hit.period}` : ''}\nSource ${hit.source || '-'} · ${hit.freq || ''}\nImpact: ${hit.impact || hit.status} on ${(hit.metric || '').toUpperCase()}.`,
        actions
      };
    }
  }

  return {
    text: 'I answer from signed Pulse figures only. Ask about this page, FDI, GFCF, alerts - or say you need support from an owner.',
    actions: [
      { label: 'Ask owner · GFCF', run: null, prompt: 'Ask owner about GFCF' },
      { label: 'Open Alerts', run: () => ctx.go?.('alerts') }
    ]
  };
}
