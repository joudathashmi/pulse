import { $, el, intoViewIfNeeded, pinWindow } from '../lib/dom.js';
import { getLang, t } from '../i18n.js';
import { askFiling, fileKind, fileUrl, listFilings, loadSample, removeFiling, uploadFiling } from '../lib/fsa.js';

function isPhone() {
  return document.documentElement.getAttribute('data-shell') === 'phone';
}

export function releaseFsa() {
  document.body.classList.remove('is-fsa-job');
  const box = document.getElementById('fsa-jobbox');
  if (box) box.hidden = true;
}

const STMTS = ['sfp', 'pl', 'cf', 'eq', 'notes'];

const SECTIONS = {
  sfp: [
    { en: 'Current assets', ar: 'الأصول المتداولة', keys: ['cash', 'receivables', 'inventory', 'current_assets'] },
    { en: 'Non-current assets', ar: 'الأصول غير المتداولة', keys: ['ppe', 'intangibles', 'noncurrent_assets', 'total_assets'] },
    { en: 'Current liabilities', ar: 'الالتزامات المتداولة', keys: ['payables', 'short_debt', 'current_liab'] },
    { en: 'Non-current liabilities', ar: 'الالتزامات غير المتداولة', keys: ['long_debt', 'noncurrent_liab', 'total_liab'] },
    { en: 'Equity', ar: 'حقوق الملكية', keys: ['share_capital', 'retained', 'equity', 'equity_liab'] }
  ],
  pl: [
    { en: 'Operating result', ar: 'النتيجة التشغيلية', keys: ['revenue', 'cogs', 'gross_profit', 'opex', 'operating_profit'] },
    { en: 'Finance and zakat', ar: 'التمويل والزكاة', keys: ['finance_cost', 'profit_before_tax', 'zakat_tax', 'net_profit'] }
  ],
  cf: [
    { en: 'Cash flows', ar: 'التدفقات النقدية', keys: ['cfo', 'cfi', 'cff', 'net_cash', 'cash_open', 'cash_close'] }
  ]
};

const TOTALS = new Set(['current_assets', 'noncurrent_assets', 'current_liab', 'noncurrent_liab', 'total_liab', 'equity', 'gross_profit', 'operating_profit', 'net_cash']);
const GRAND = new Set(['total_assets', 'equity_liab', 'net_profit', 'cash_close']);
const RATIO_KEYS = {
  current: ['current_assets', 'current_liab'],
  quick: ['current_assets', 'inventory', 'current_liab'],
  de: ['total_liab', 'equity'],
  roe: ['net_profit', 'equity'],
  roa: ['net_profit', 'total_assets'],
  gross: ['gross_profit', 'revenue'],
  opm: ['operating_profit', 'revenue'],
  npm: ['net_profit', 'revenue']
};
const GATE_STMT = { completeness: 'sfp', articulation: 'sfp', cash: 'cf', identity: 'sfp', language: 'sfp', signoff: 'notes' };
const KPI_KEYS = [
  { key: 'revenue', stmt: 'pl' },
  { key: 'net_profit', stmt: 'pl' },
  { key: 'total_assets', stmt: 'sfp' },
  { ratio: 'current', stmt: 'sfp' }
];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function copy() {
  return t().fsa || {};
}

function loc() {
  return getLang() === 'ar' ? 'ar-SA' : 'en-GB';
}

function money(n) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  const abs = Math.abs(Number(n));
  const body = abs.toLocaleString(loc(), { maximumFractionDigits: 0 });
  return Number(n) < 0 ? `(${body})` : body;
}

function pct(n) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return `${(Number(n) * 100).toLocaleString(loc(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function ratioTxt(n, kind) {
  if (n == null) return '-';
  if (kind === 'pct') return pct(n);
  return Number(n).toLocaleString(loc(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function yoy(row) {
  if (!row || row.current == null || row.prior == null || row.prior === 0) return null;
  return (row.current - row.prior) / Math.abs(row.prior);
}

function statusWord(st, f) {
  if (st === 'ok') return f.ok || 'On track';
  if (st === 'risk') return f.risk || 'At risk';
  return f.watch || 'Watch';
}

function isJunkName(s) {
  return /^(خيارات اخرى|خيارات أخرى|other options|select|اختر|untitled|fs)$/i.test(String(s || '').trim());
}

function filingTitle(row, f) {
  const id = row.identity || {};
  const ar = id.entityAr;
  const en = id.entity;
  const pick = getLang() === 'ar' ? (ar || en) : (en || ar);
  if (pick && !isJunkName(pick)) return pick;
  const file = String(row.file?.name || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  return file || f.untitled || 'Untitled filing';
}

function readyClock(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(loc(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function listStatus(row, f) {
  if (row.status === 'failed') return { cls: 'failed', word: f.status?.failed || 'Failed' };
  if (row.synthetic) return { cls: 'ok', word: f.synthShort || 'Sample' };
  return { cls: 'ok', word: f.readyWord || 'Ready' };
}

function stmtTitle(stmt, f) {
  if (getLang() === 'ar') return stmt.titleAr || f[stmt.id] || stmt.title;
  return stmt.title || f[stmt.id] || stmt.id;
}

function rowClass(key) {
  if (GRAND.has(key)) return 'is-grand';
  if (TOTALS.has(key)) return 'is-total';
  return '';
}

function sourceBody(sheets, stmtId, chosen, fx, selLine) {
  const mine = (sheets || []).filter(s => s.id === stmtId);
  const list = mine.length ? mine : (sheets || []);
  const sheet = list[chosen] || list[0];
  if (!sheet) {
    return `<div class="fsa-view-sheet"><p class="wh-est">${esc(fx.sheetHint || '')}</p></div>`;
  }
  const tabs = list.length > 1
    ? `<div class="fsa-src-tabs">${list.map((s, i) =>
        `<button type="button" class="fsa-stmt ${s === sheet ? 'is-on' : ''}" data-src="${i}">${esc(getLang() === 'ar' ? (s.titleAr || s.title) : (s.title || s.titleAr))}</button>`
      ).join('')}</div>`
    : '';
  const year = sheet.currentYear || fx.current || '';
  const prior = sheet.priorYear || fx.prior || '';
  const rows = (sheet.rows || []).map(r => {
    const cls = r.kind === 'header' ? 'is-head' : r.kind === 'total' ? 'is-total' : '';
    const on = selLine && (
      (selLine.current != null && r.current === selLine.current && (r.label === selLine.label || r.labelAr === selLine.labelAr || r.label === selLine.sourceLabel))
      || r.label === selLine.label
      || r.labelAr === selLine.labelAr
    );
    return `<tr class="${cls}${on ? ' is-on' : ''}" data-src-row="${esc(r.label || r.labelAr || '')}" data-src-amt="${r.current ?? ''}">
      <td class="num">${r.kind === 'header' ? '' : esc(r.n || '')}</td>
      <td>${esc(r.label || '')}</td>
      <td class="ar">${esc(r.labelAr || '')}</td>
      <td class="num">${r.kind === 'header' ? '' : money(r.current)}</td>
      <td class="num">${r.kind === 'header' ? '' : money(r.prior)}</td>
    </tr>`;
  }).join('');
  return `${tabs}
    <div class="fsa-src-paper">
      <div class="fsa-src-h">
        <b>${esc(sheet.title || '')}</b>
        <strong>${esc(sheet.titleAr || '')}</strong>
        <span>${esc(fx.packMci || 'MCI iFile')} · ${esc(year)}${prior ? ` / ${esc(prior)}` : ''}</span>
      </div>
      <div class="fsa-src-scroll">
        <table class="fsa-src">
          <thead><tr>
            <th class="num">#</th>
            <th>English</th>
            <th>العربية</th>
            <th class="num">${esc(year)}</th>
            <th class="num">${esc(prior)}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function lineRow(ln, fx, selected, hot) {
  const ch = yoy(ln);
  const label = getLang() === 'ar' ? ln.labelAr : ln.label;
  const max = Math.max(Math.abs(Number(ln.current) || 0), Math.abs(Number(ln.prior) || 0), 1);
  const wNow = Math.round((Math.abs(Number(ln.current) || 0) / max) * 100);
  const wPrior = Math.round((Math.abs(Number(ln.prior) || 0) / max) * 100);
  return `<tr class="${rowClass(ln.key)}${selected ? ' is-on' : ''}${hot && !selected ? ' is-hot' : ''}" data-line="${esc(ln.key)}" data-stmt="${esc(ln.statement || '')}" data-page="${esc(ln.page || '')}" tabindex="0">
    <td>
      <span class="fsa-line-lab">${esc(label)}</span>
      <span class="fsa-spark" aria-hidden="true"><i class="is-now" style="width:${wNow}%"></i><i class="is-prior" style="width:${wPrior}%"></i></span>
    </td>
    <td class="num">${money(ln.current)}</td>
    <td class="num">${money(ln.prior)}</td>
    <td class="num fsa-chg ${ch == null ? '' : ch < 0 ? 'risk' : 'ok'}">${ch == null ? '' : pct(ch)}</td>
  </tr>`;
}

function sheetBody(active, lines, period, prior, fx, selectedKey, hotKeys = []) {
  if (active?.id === 'notes') {
    return `<p class="fsa-notes">${esc(fx.noNotes || '')}</p>`;
  }
  const head = `<thead><tr>
    <th></th>
    <th class="num">${esc(period || fx.current || '')}</th>
    <th class="num">${esc(prior || fx.prior || '')}</th>
    <th class="num">${esc(fx.change || '')}</th>
  </tr></thead>`;
  const groups = SECTIONS[active?.id];
  const used = new Set();
  let body = '';
  if (groups) {
    const byKey = Object.fromEntries(lines.map(l => [l.key, l]));
    for (const g of groups) {
      const rows = g.keys.map(k => byKey[k]).filter(Boolean);
      if (!rows.length) continue;
      rows.forEach(r => used.add(r.key));
      body += `<tr class="fsa-sec"><td colspan="4">${esc(getLang() === 'ar' ? g.ar : g.en)}</td></tr>`;
      body += rows.map(ln => lineRow(ln, fx, selectedKey === ln.key, hotKeys.includes(ln.key))).join('');
    }
  }
  const rest = lines.filter(l => !used.has(l.key));
  if (rest.length) body += rest.map(ln => lineRow(ln, fx, selectedKey === ln.key, hotKeys.includes(ln.key))).join('');
  if (!body) body = `<tr><td colspan="4">${esc(fx.noLines || '')}</td></tr>`;
  return `<table class="fsa-sheet">${head}<tbody>${body}</tbody></table>`;
}

function fileSize(n) {
  const v = Number(n);
  if (!v || Number.isNaN(v)) return '';
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${Math.round(v / 1024)} KB`;
  return `${(v / (1024 * 1024)).toLocaleString(loc(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
}

function jobHint(step, fx) {
  if (step === 'read') return fx.progReadHint || 'Reading the file on this device.';
  if (step === 'upload') return fx.progUploadHint || 'Sending the file to the extractor.';
  if (step === 'extract') return fx.progExtractHint || 'Mapping lines from the source.';
  if (step === 'verify') return fx.progVerifyHint || 'Checking IAS 1 completeness.';
  if (step === 'done') return fx.progReadyHint || 'The filing is open in the workspace.';
  return '';
}

function lineByKey(row, key) {
  return (row?.lines || []).find(l => l.key === key) || null;
}

function inspectHtml(row, fx) {
  const sel = row._sel;
  if (!sel) {
    return `<aside class="fsa-inspect is-idle" data-inspect>
      <div class="fsa-card-k">${esc(fx.inspect || 'Inspector')}</div>
      <p>${esc(fx.inspectIdle || '')}</p>
    </aside>`;
  }
  if (sel.type === 'ratio') {
    const r = (row.assessment?.ratios || []).find(x => x.id === sel.id);
    const kind = /margin|هامش|return|عائد/.test(`${r?.name || ''} ${r?.nameAr || ''}`) ? 'pct' : 'x';
    return `<aside class="fsa-inspect" data-inspect>
      <div class="fsa-card-k">${esc(fx.ratios || 'Ratios')}</div>
      <h3>${esc(getLang() === 'ar' ? (r?.nameAr || '') : (r?.name || ''))}</h3>
      <p class="fsa-inspect-num">${esc(ratioTxt(r?.value, kind))}${r?.prior == null ? '' : ` · ${esc(ratioTxt(r.prior, kind))}`}</p>
      <p>${esc(r?.convention || '')}</p>
      <div class="fsa-inspect-acts">
        ${(RATIO_KEYS[sel.id] || []).map(k => {
          const ln = lineByKey(row, k);
          return ln ? `<button type="button" class="wh-act" data-jump-line="${esc(k)}" data-jump-stmt="${esc(ln.statement || '')}">${esc(getLang() === 'ar' ? ln.labelAr : ln.label)}</button>` : '';
        }).join('')}
      </div>
    </aside>`;
  }
  if (sel.type === 'gate') {
    const g = (row.assessment?.gates || []).find(x => x.id === sel.id);
    return `<aside class="fsa-inspect" data-inspect>
      <div class="fsa-card-k">${esc(fx.gates || 'Gates')}</div>
      <h3>${esc(getLang() === 'ar' ? (g?.nameAr || '') : (g?.name || ''))}</h3>
      <p>${esc(getLang() === 'ar' ? (g?.detailAr || '') : (g?.detail || ''))}</p>
      <p class="fsa-inspect-st ${g?.status || ''}">${esc(statusWord(g?.status, fx))}</p>
    </aside>`;
  }
  const ln = lineByKey(row, sel.key);
  if (!ln) {
    return `<aside class="fsa-inspect is-idle" data-inspect>
      <div class="fsa-card-k">${esc(fx.inspect || 'Inspector')}</div>
      <p>${esc(fx.inspectIdle || '')}</p>
    </aside>`;
  }
  const ch = yoy(ln);
  const max = Math.max(Math.abs(Number(ln.current) || 0), Math.abs(Number(ln.prior) || 0), 1);
  const wNow = Math.round((Math.abs(Number(ln.current) || 0) / max) * 100);
  const wPrior = Math.round((Math.abs(Number(ln.prior) || 0) / max) * 100);
  return `<aside class="fsa-inspect" data-inspect>
    <div class="fsa-card-k">${esc(fx.inspect || 'Inspector')}</div>
    <h3>${esc(getLang() === 'ar' ? ln.labelAr : ln.label)}</h3>
    <p class="fsa-inspect-bi">${esc(ln.label)} · ${esc(ln.labelAr || '')}</p>
    <p class="fsa-inspect-num">${esc(money(ln.current))}${ln.prior == null ? '' : ` / ${esc(money(ln.prior))}`}</p>
    <p>${esc(fx.compare || 'Current vs prior')}${ch == null ? '' : ` · ${esc(pct(ch))}`}</p>
    <div class="fsa-inspect-bars" aria-hidden="true">
      <span><i style="width:${wNow}%"></i></span>
      <span class="is-prior"><i style="width:${wPrior}%"></i></span>
    </div>
    <p class="fsa-inspect-ifrs">${esc(ln.ifrs || '')}${ln.page ? ` · ${esc(fx.page || 'p.')} ${esc(ln.page)}` : ''}</p>
    <div class="fsa-inspect-acts">
      <button type="button" class="wh-act on" data-ask-line="${esc(ln.key)}">${esc(fx.askLine || 'Ask this line')}</button>
      <button type="button" class="wh-act" data-show-src="${esc(ln.key)}" data-page="${esc(ln.page || '')}">${esc(fx.showSource || 'Show in source')}</button>
    </div>
  </aside>`;
}

function kpiHtml(row, fx) {
  const chips = KPI_KEYS.map(item => {
    if (item.ratio) {
      const r = (row.assessment?.ratios || []).find(x => x.id === item.ratio);
      if (!r || r.value == null) return '';
      const on = row._sel?.type === 'ratio' && row._sel.id === item.ratio;
      return `<button type="button" class="fsa-kpi ${on ? 'is-on' : ''}" data-kpi-ratio="${esc(item.ratio)}" data-jump-stmt="${esc(item.stmt)}">
        <b>${esc(getLang() === 'ar' ? r.nameAr : r.name)}</b>
        <strong>${esc(ratioTxt(r.value, 'x'))}</strong>
      </button>`;
    }
    const ln = lineByKey(row, item.key);
    if (!ln || ln.current == null) return '';
    const on = row._sel?.type === 'line' && row._sel.key === item.key;
    const label = getLang() === 'ar' ? ln.labelAr : ln.label;
    return `<button type="button" class="fsa-kpi ${on ? 'is-on' : ''}" data-kpi-line="${esc(item.key)}" data-jump-stmt="${esc(item.stmt)}">
      <b>${esc(label)}</b>
      <strong>${esc(money(ln.current))}</strong>
    </button>`;
  }).filter(Boolean).join('');
  if (!chips) return '';
  return `<div class="fsa-kpis" aria-label="${esc(fx.kpis || 'Headline figures')}">${chips}</div>`;
}

export function renderFsa(root) {
  const f = copy();
  root.innerHTML = `
    <div class="stage"><div class="panel fsa">
      <header class="fsa-mast">
        <div class="wh-k">IAS 1 · IFRS</div>
        <h1>${esc(f.title || 'Financial statements')}</h1>
        <p class="lede">${esc(f.lede || '')}</p>
      </header>

      <section class="fsa-card fsa-upload" data-add>
        <div class="fsa-upload-h">
          <div class="fsa-card-k">${esc(f.stepFile || 'Upload')}</div>
          <p class="fsa-card-lede">${esc(f.addLede || '')}</p>
        </div>
        <input type="file" data-file accept=".pdf,.xlsx,.xls,.zip,application/pdf,application/zip,image/*" multiple hidden />
        <div class="fsa-upload-acts">
          <button type="button" class="btn-primary fsa-upload-btn" data-upload>${esc(f.uploadBtn || 'Upload filing')}</button>
          <button type="button" class="fsa-sample" data-sample>${esc(f.sample || 'Load sample')}</button>
        </div>
        <button type="button" class="fsa-dropzone" data-zone title="${esc(f.accepts || '')}">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.2V4.8M8.2 8.2 12 4.8l3.8 3.4M5.2 19.2h13.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span><em>${esc(f.dropHere || 'Click or drop a file')}</em> ${esc(f.dropHint || '')}</span>
        </button>
        <div class="fsa-progress" data-job-inline hidden></div>
        <div class="fsa-lib">
          <div class="fsa-lib-head">
            <div class="fsa-card-k">${esc(f.library || 'Filings')}</div>
            <span class="fsa-lib-n" data-lib-n></span>
          </div>
          <p class="fsa-lib-err" data-lib-err hidden></p>
          <div data-list></div>
        </div>
      </section>

      <div class="fsa-work" data-work></div>
    </div></div>`;

  const state = { filings: [], selected: null, stmt: 'sfp', chat: [], page: 1, pane: 'split', src: 0, waiting: false, job: null, sel: null, focus: 'add', fold: { process: !isPhone(), extract: true, ask: !isPhone() } };

  releaseFsa();

  const listEl = $('[data-list]', root);
  const libN = $('[data-lib-n]', root);
  const work = $('[data-work]', root);
  const errEl = $('[data-lib-err]', root);
  const fileInput = $('[data-file]', root);
  const uploadBtn = $('[data-upload]', root);
  const sampleBtn = $('[data-sample]', root);
  const addCard = $('[data-add]', root);
  const zoneBtn = $('[data-zone]', root);
  const inlineJob = $('[data-job-inline]', root);
  const panel = $('.panel.fsa', root);

  function applyFolds(scope = root) {
    const phone = isPhone();
    pinWindow(() => {
      for (const d of scope.querySelectorAll('details[data-fold]')) {
        const id = d.dataset.fold;
        const next = phone ? !!state.fold[id] : true;
        if (d.open !== next) d.open = next;
        d.ontoggle = () => {
          state.fold[id] = d.open;
        };
      }
    });
  }
  applyFolds(root);

  function jobBox() {
    let box = document.getElementById('fsa-jobbox');
    if (!box) {
      box = el(`<div class="fsa-jobbox" id="fsa-jobbox" hidden role="dialog" aria-modal="true" aria-labelledby="fsa-jobbox-title" aria-valuemin="0" aria-valuemax="100">
        <div class="fsa-jobbox-card">
          <div class="fsa-jobbox-k" id="fsa-jobbox-title"></div>
          <div class="fsa-jobbox-dial" data-dial>
            <strong data-pct>0</strong>
            <span data-pct-l>%</span>
          </div>
          <b class="fsa-jobbox-name" data-name></b>
          <span class="fsa-jobbox-size" data-size></span>
          <ol class="fsa-jobbox-steps" data-steps></ol>
          <p class="fsa-jobbox-hint" data-hint></p>
          <button type="button" class="btn-ghost" data-job-dismiss hidden></button>
        </div>
      </div>`);
      document.body.appendChild(box);
    }
    box.querySelector('[data-job-dismiss]').onclick = () => {
      if (state.job?.busy) return;
      state.job = null;
      paintProgress();
    };
    return box;
  }

  function setErr(msg) {
    if (!errEl) return;
    errEl.hidden = !msg;
    errEl.textContent = msg || '';
  }

  function setBusy(on) {
    const fx = copy();
    if (uploadBtn) {
      uploadBtn.disabled = on;
      uploadBtn.textContent = on ? (fx.uploadingBtn || 'Working…') : (fx.uploadBtn || 'Upload filing');
    }
    if (zoneBtn) {
      zoneBtn.disabled = on;
      const label = zoneBtn.querySelector('em');
      if (label) label.textContent = on ? (fx.uploadingBtn || 'Working…') : (fx.dropHere || 'Click or drop a file');
    }
    if (sampleBtn) sampleBtn.disabled = on;
    addCard?.classList.toggle('is-busy', on);
  }

  function pathStep() {
    const job = state.job;
    if (job?.busy) {
      if (job.step === 'read' || job.step === 'upload') return 'add';
      if (job.step === 'extract') return 'extract';
      if (job.step === 'verify') return 'gates';
      return 'extract';
    }
    if (!current()) return 'add';
    return state.focus || 'extract';
  }

  function paintPath() {
    const order = ['add', 'extract', 'gates', 'chat'];
    const row = current();
    const on = pathStep();
    const idx = Math.max(0, order.indexOf(on));
    for (const li of root.querySelectorAll('.fsa-path li')) {
      const id = li.querySelector('[data-jump]')?.dataset.jump;
      const i = order.indexOf(id);
      const isOn = id === on;
      const isDone = Boolean(row) && i >= 0 && i < idx;
      li.classList.toggle('is-on', isOn);
      li.classList.toggle('is-done', isDone);
      li.classList.toggle('is-wait', !row && i > 0);
      const btn = li.querySelector('button');
      if (btn) {
        if (isOn) btn.setAttribute('aria-current', 'step');
        else btn.removeAttribute('aria-current');
      }
    }
  }

  function paintProgress() {
    const fx = copy();
    const box = jobBox();
    const job = state.job;
    const dismiss = box.querySelector('[data-job-dismiss]');
    if (!job) {
      box.hidden = true;
      box.classList.remove('is-work', 'is-fail', 'is-ok');
      document.body.classList.remove('is-fsa-job');
      if (inlineJob) {
        inlineJob.hidden = true;
        inlineJob.innerHTML = '';
      }
      paintList();
      paintPath();
      return;
    }
    const steps = [
      { id: 'read', label: fx.progRead || 'Reading' },
      { id: 'upload', label: fx.progUpload || 'Uploading' },
      { id: 'extract', label: fx.progExtract || 'Extracting' },
      { id: 'verify', label: fx.progVerify || 'Verifying' },
      { id: 'done', label: fx.progReady || 'Ready' }
    ];
    const failed = job.step === 'fail';
    const order = ['read', 'upload', 'extract', 'verify', 'done'];
    const idx = failed ? -1 : Math.max(0, order.indexOf(job.step));
    const pct = failed ? 0 : Math.max(1, Math.min(100, Math.round(Number(job.pct) || ((idx + 1) / steps.length) * 100)));
    const size = fileSize(job.size);
    const hint = job.hint || jobHint(job.step, fx);
    const title = failed
      ? (fx.progFail || 'Failed')
      : job.step === 'done'
        ? (fx.progReady || 'Ready')
        : (fx.progressTitle || 'Loading filing');
    box.hidden = false;
    document.body.classList.add('is-fsa-job');
    box.classList.toggle('is-work', job.busy && !failed && job.step !== 'done');
    box.classList.toggle('is-fail', failed);
    box.classList.toggle('is-ok', job.step === 'done');
    const k = box.querySelector('.fsa-jobbox-k');
    const pctEl = box.querySelector('[data-pct]');
    const pctL = box.querySelector('[data-pct-l]');
    const dial = box.querySelector('[data-dial]');
    const nameEl = box.querySelector('[data-name]');
    const sizeEl = box.querySelector('[data-size]');
    const hintEl = box.querySelector('[data-hint]');
    const stepsEl = box.querySelector('[data-steps]');
    if (k) k.textContent = title;
    if (pctEl) pctEl.textContent = String(pct);
    if (pctL) pctL.textContent = '%';
    dial?.style.setProperty('--pct', String(pct));
    if (nameEl) nameEl.textContent = job.name || fx.jobFile || 'File';
    if (sizeEl) sizeEl.textContent = size;
    if (hintEl) {
      hintEl.textContent = hint;
      hintEl.className = `fsa-jobbox-hint${failed ? ' is-fail' : job.step === 'done' ? ' is-ok' : ''}`;
    }
    if (stepsEl) {
      stepsEl.innerHTML = steps.map((s, i) => {
        const cls = failed ? '' : i < idx ? 'is-done' : i === idx ? 'is-on' : '';
        return `<li class="${cls}"><em>${i + 1}</em>${esc(s.label)}</li>`;
      }).join('');
    }
    if (dismiss) {
      dismiss.hidden = !failed && job.step !== 'done';
      dismiss.textContent = fx.progDismiss || 'Close';
    }
    box.setAttribute('aria-valuenow', String(pct));
    if (inlineJob) {
      inlineJob.hidden = job.step === 'done' && !job.busy;
      const step = failed
        ? (fx.progFail || 'Failed')
        : job.step === 'extract' ? (fx.progExtract || 'Extracting')
          : job.step === 'verify' ? (fx.progVerify || 'Verifying')
            : job.step === 'read' ? (fx.progRead || 'Reading')
              : job.step === 'done' ? (fx.progReady || 'Ready')
                : (fx.progUpload || 'Uploading');
      inlineJob.innerHTML = `<div class="fsa-progress-k">${esc(title)}</div>
        <div class="fsa-job"><b>${esc(job.name || fx.jobFile || 'File')}</b><span>${pct}%</span></div>
        <div class="fsa-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
        <p class="fsa-file-hint${failed ? ' is-fail' : ''}">${esc(step)}${hint ? ` · ${esc(hint)}` : ''}</p>`;
    }
    paintList();
    paintPath();
  }

  function paintList() {
    const fx = copy();
    const job = state.job;
    const showJob = job && job.step !== 'done';
    const n = state.filings.length;
    if (libN) libN.textContent = n || showJob ? `${n + (showJob ? 1 : 0)} ${fx.libCount || 'on this desk'}` : '';
    const jobCard = showJob ? (() => {
      const failed = job.step === 'fail';
      const order = ['read', 'upload', 'extract', 'verify', 'done'];
      const idx = failed ? 0 : Math.max(0, order.indexOf(job.step));
      const pct = failed ? 0 : Math.max(1, Math.min(100, Math.round(Number(job.pct) || ((idx + 1) / 5) * 100)));
      const step = failed
        ? (fx.progFail || 'Failed')
        : job.step === 'extract' ? (fx.progExtract || 'Extracting')
          : job.step === 'verify' ? (fx.progVerify || 'Verifying')
            : job.step === 'read' ? (fx.progRead || 'Reading')
              : (fx.progUpload || 'Uploading');
      const size = fileSize(job.size);
      return `<article class="fsa-file is-busy ${failed ? 'is-fail' : ''}" data-job-row>
        <div class="fsa-file-main">
          <div class="fsa-file-top">
            <b>${esc(job.name || fx.jobFile || 'File')}</b>
            <i class="${failed ? 'failed' : 'watch'}">${esc(failed ? (fx.progFail || 'Failed') : (fx.processing || 'Processing'))}</i>
          </div>
          <span>${esc(step)} · ${pct}%</span>
          ${size ? `<em>${esc(size)}</em>` : ''}
          <div class="fsa-file-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
          <p class="fsa-file-hint${failed ? ' is-fail' : ''}">${esc(job.hint || jobHint(job.step, fx))}</p>
        </div>
      </article>`;
    })() : '';
    if (!n && !jobCard) {
      listEl.innerHTML = `<p class="fsa-empty-line">${esc(fx.empty || 'No filings on this desk yet.')}</p>`;
      paintPath();
      return;
    }
    listEl.innerHTML = jobCard + state.filings.map(row => {
      const on = row.id === state.selected;
      const id = row.identity || {};
      const st = listStatus(row, fx);
      const when = readyClock(row.updatedAt || row.createdAt);
      const mapped = Number(row.extract?.mapped) || 0;
      const warn = row.status === 'failed' ? (row.extract?.warnings?.[0] || '') : '';
      const canRemove = !row.synthetic;
      const meta = [
        id.periodLabel,
        row.extract?.pack === 'mci-ifile' ? (fx.packMci || 'MCI iFile') : (id.framework || 'IFRS'),
        mapped ? `${mapped} ${fx.lines || 'lines'}` : ''
      ].filter(Boolean).join(' · ');
      return `<article class="fsa-file ${on ? 'is-on' : ''} ${st.cls === 'failed' ? 'is-fail' : ''}" data-row="${esc(row.id)}">
        <button type="button" class="fsa-file-main" data-id="${esc(row.id)}">
          <div class="fsa-file-top">
            <b>${esc(filingTitle(row, fx))}</b>
            <i class="${st.cls}">${esc(st.word)}</i>
          </div>
          <span>${esc(meta)}</span>
          <em>${row.synthetic ? esc(fx.synthBadge || 'Synthetic · populated') : esc(row.file?.name || '')}</em>
          ${when ? `<time datetime="${esc(row.updatedAt || row.createdAt)}">${esc(fx.timeReady || 'Ready')} ${esc(when)}</time>` : ''}
          ${warn ? `<p class="fsa-file-warn">${esc(warn)}</p>` : ''}
        </button>
        <div class="fsa-file-acts">
          ${row.hasFile ? `<a class="wh-act" href="${esc(fileUrl(row.id))}" target="_blank" rel="noopener">${esc(fx.sourceView || 'Source')}</a>` : ''}
          ${canRemove
            ? `<button type="button" class="wh-act is-risk" data-drop="${esc(row.id)}">${esc(fx.remove || 'Remove')}</button>`
            : `<span class="fsa-file-keep">${esc(fx.keepSample || '')}</span>`}
        </div>
      </article>`;
    }).join('');
    const open = (id) => {
      state.selected = id;
      state.stmt = 'sfp';
      state.chat = [];
      state.waiting = false;
      state.sel = null;
      state.focus = 'extract';
      setErr('');
      paintList();
      paintWork();
    };
    for (const b of listEl.querySelectorAll('[data-id]')) {
      b.onclick = () => open(b.dataset.id);
    }
    for (const b of listEl.querySelectorAll('[data-drop]')) {
      b.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropFiling(b.dataset.drop);
      };
    }
    paintPath();
  }

  async function dropFiling(id) {
    const fx = copy();
    const row = state.filings.find(x => x.id === id);
    if (!row || row.synthetic) {
      setErr(fx.keepSample || 'The sample stays on the desk');
      return;
    }
    if (!window.confirm(fx.removeAsk || 'Remove this filing from the desk?')) return;
    try {
      await removeFiling(id);
      state.filings = state.filings.filter(x => x.id !== id);
      if (state.selected === id) {
        state.selected = state.filings[0]?.id || null;
        state.chat = [];
        state.sel = null;
      }
      setErr('');
      paintList();
      paintWork();
    } catch (err) {
      setErr(err.message);
    }
  }

  function current() {
    return state.filings.find(x => x.id === state.selected) || state.filings[0] || null;
  }

  function paintWork() {
    const fx = copy();
    const row = current();
    if (!row) {
      work.innerHTML = `<article class="fsa-page">
        <section class="fsa-card fsa-analysis fsa-empty" data-empty>
          <div class="fsa-card-k">${esc(fx.stageTitle || 'Workspace')}</div>
          <h2>${esc(fx.pickTitle || 'No filing selected')}</h2>
          <p>${esc(fx.pick || '')}</p>
          <button type="button" class="btn-primary" data-empty-up>${esc(fx.uploadBtn || 'Upload filing')}</button>
        </section>
      </article>`;
      work.querySelector('[data-empty-up]')?.addEventListener('click', () => fileInput.click());
      paintPath();
      return;
    }
    state.selected = row.id;
    row._sel = state.sel;
    const pinX = window.scrollX;
    const pinY = window.scrollY;
    const keepAsk = state.focus === 'chat' && work.querySelector('[data-q]') === document.activeElement;
    const pages = Math.max(1, Number(row.file?.pages) || 1);
    if (!state.page || state.page > pages) state.page = 1;
    const kind = fileKind(row);
    const src = fileUrl(row.id, kind === 'pdf' ? state.page : null);
    const id = row.identity || {};
    const stmts = STMTS.map(sid => row.statements?.[sid]).filter(Boolean);
    const active = stmts.find(s => s.id === state.stmt) || stmts[0];
    const lines = (active?.id === 'notes'
      ? []
      : (active?.lines || [])).slice();
    const ratios = row.assessment?.ratios || [];
    const gates = row.assessment?.gates || [];
    const period = id.periodLabel || '';
    const prior = id.comparative || '';

    const selLine = state.sel?.type === 'line' ? lineByKey(row, state.sel.key) : null;
    const selKeys = state.sel?.type === 'ratio' ? (RATIO_KEYS[state.sel.id] || []) : state.sel?.type === 'line' ? [state.sel.key] : [];
    const paperNotes = active?.id === 'notes'
      ? `<p class="fsa-notes">${esc(row.extract?.preview || fx.noNotes || '')}</p>`
      : sheetBody(active, lines, period, prior, fx, state.sel?.type === 'line' ? state.sel.key : null, selKeys);

    const gateHtml = gates.map(g => {
      const on = state.sel?.type === 'gate' && state.sel.id === g.id ? ' is-on' : '';
      const name = getLang() === 'ar' ? g.nameAr : g.name;
      const detail = getLang() === 'ar' ? g.detailAr : g.detail;
      return `<li class="${g.status}${on}">
            <button type="button" data-gate="${esc(g.id)}" title="${esc(detail || '')}">
              <i></i>
              <b>${esc(name)}</b>
              <em>${esc(statusWord(g.status, fx))}</em>
            </button>
          </li>`;
    }).join('') || `<li class="watch"><i></i><b>${esc(fx.gates || 'Gates')}</b></li>`;

    const stmtTabs = stmts.map(s =>
      `<button type="button" class="fsa-stmt ${s.id === active?.id ? 'is-on' : ''}" data-stmt="${s.id}" role="tab" aria-selected="${s.id === active?.id}">${esc(stmtTitle(s, fx))}</button>`
    ).join('');

    const ratioHtml = ratios.map(r => {
      const rKind = /margin|هامش|return|عائد/.test(`${r.name} ${r.nameAr}`) ? 'pct' : 'x';
      const on = state.sel?.type === 'ratio' && state.sel.id === r.id ? ' is-on' : '';
      const priorTxt = r.prior == null ? '' : ratioTxt(r.prior, rKind);
      return `<button type="button" class="fsa-ratio${on}" data-ratio="${esc(r.id)}">
                  <b>${esc(getLang() === 'ar' ? r.nameAr : r.name)}</b>
                  <strong>${ratioTxt(r.value, rKind)}</strong>
                  <span>${priorTxt}</span>
                </button>`;
    }).join('');

    const pager = kind === 'pdf'
      ? `<button type="button" class="wh-act" data-pg-prev aria-label="${esc(fx.prevPage || 'Previous page')}">‹</button>
                <span class="fsa-pg">${esc(fx.page || 'p.')} ${state.page} / ${pages}</span>
                <button type="button" class="wh-act" data-pg-next aria-label="${esc(fx.nextPage || 'Next page')}">›</button>`
      : '';

    let viewer = `<p class="wh-est">${esc(fx.noFile || 'No source file is stored for this filing.')}</p>`;
    if (row.hasFile || (row.sourceSheets || []).length) {
      if (kind === 'image') viewer = `<img class="fsa-view-img" src="${esc(src)}" alt="${esc(row.file?.name || '')}" />`;
      else if ((row.sourceSheets || []).length) viewer = sourceBody(row.sourceSheets, active?.id, state.src, fx, selLine);
      else if (kind === 'sheet') {
        viewer = `<div class="fsa-view-sheet">
              <p class="wh-est">${esc(fx.sheetHint || 'Excel opens in a spreadsheet. The extract stays on this desk.')}</p>
              <a class="wh-act on" href="${esc(fileUrl(row.id))}" download>${esc(fx.download || 'Download workbook')}</a>
            </div>`;
      } else if (isPhone()) {
        viewer = `<div class="fsa-view-sheet">
              <p class="wh-est">${esc(fx.openFile || 'Open')} ${esc(row.file?.name || '')}</p>
              <a class="btn-primary" href="${esc(src)}" target="_blank" rel="noopener">${esc(fx.openFile || 'Open')}</a>
            </div>`;
      } else {
        viewer = `<iframe class="fsa-view-frame" title="${esc(fx.sourceView || 'Source file')}" src="${esc(src)}"></iframe>`;
      }
    }

    const activeTitle = stmtTitle(active || { title: '', titleAr: '' }, fx);

    work.innerHTML = `
      <article class="fsa-page">
      <section class="fsa-card fsa-analysis" data-extract>
        <header class="fsa-analysis-h" data-id-card>
          <div class="fsa-id-row">
            <div>
              <div class="fsa-card-k">${esc(fx.identity || 'Filing')}</div>
              <h2>${esc(filingTitle(row, fx))}</h2>
              <p>${esc(id.framework || 'IFRS')} · ${esc(id.unit || '')} · ${esc(period)}${prior ? ` / ${esc(prior)}` : ''}</p>
            </div>
            <div class="fsa-id-meta">
              ${row.synthetic ? `<span class="fsa-pill is-synth">${esc(fx.synthBadge || 'Synthetic · populated')}</span>` : ''}
              ${row.extract?.pack === 'mci-ifile' ? `<span class="fsa-pill is-on">${esc(fx.packMci || 'MCI iFile')}</span>` : ''}
              <span>${row.extract?.mapped || 0} ${esc(fx.lines || 'lines')}</span>
              ${row.synthetic ? '' : `<button type="button" class="wh-act" data-del>${esc(fx.remove || 'Remove')}</button>`}
            </div>
          </div>
          ${kpiHtml(row, fx)}
          <div class="fsa-verify" data-gates>
            <div class="fsa-card-k">${esc(fx.stepGate || 'Verify')}</div>
            <ul class="fsa-gates">${gateHtml}</ul>
          </div>
        </header>
        <div class="fsa-toolbar">
          <div class="fsa-stmt-nav" role="tablist">${stmtTabs}</div>
          <div class="fsa-pane-nav" role="tablist" aria-label="${esc(fx.view || 'View')}">
            <button type="button" class="fsa-stmt ${state.pane !== 'source' ? 'is-on' : ''}" data-pane="extract">${esc(fx.extractView || 'Extract')}</button>
            <button type="button" class="fsa-stmt ${state.pane === 'source' ? 'is-on' : ''}" data-pane="source">${esc(fx.sourceView || 'Source file')}</button>
          </div>
        </div>
        <div class="fsa-body ${state.pane === 'source' ? 'is-source' : 'is-extract'}">
          <div class="fsa-extract">
            <div class="fsa-paper">
              <div class="fsa-paper-h">
                <b>${esc(filingTitle(row, fx))}</b>
                <strong>${esc(activeTitle)}</strong>
                <span>${esc(period)} · ${esc(id.unit || '')} · ${esc(active?.ias || 'IAS 1')}</span>
              </div>
              ${paperNotes}
              ${inspectHtml(row, fx)}
            </div>
            <div class="fsa-tick-wrap">
              <div class="fsa-card-k">${esc(fx.ratios || 'Ratios')}</div>
              <div class="fsa-tick">${ratioHtml}</div>
            </div>
          </div>
          <aside class="fsa-viewer" aria-label="${esc(fx.sourceView || 'Source file')}">
            <header class="fsa-viewer-h">
              <div>
                <div class="wh-k">${esc(fx.sourceView || 'Source file')}</div>
                <p>${esc(row.file?.name || fx.untitled || 'Filing')}</p>
              </div>
              <div class="fsa-viewer-acts">
                ${pager}
                ${row.hasFile ? `<a class="wh-act" href="${esc(fileUrl(row.id))}" target="_blank" rel="noopener">${esc(fx.openFile || 'Open')}</a>` : ''}
              </div>
            </header>
            ${viewer}
          </aside>
        </div>
      </section>

      <aside class="fsa-card fsa-ask" data-chat aria-label="${esc(fx.chatTitle || 'Ask this filing')}">
        <header class="fsa-chat-h">
          <div class="fsa-chat-id">
            <span class="fsa-chat-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M7 3.8h7.2L19 8.4V20.2H7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14.1 3.8v4.7H19M9.2 12.2h7.2M9.2 15.4h7.2M9.2 18.4h4.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </span>
            <div>
              <div class="fsa-card-k">${esc(fx.stepAsk || 'Ask')}</div>
              <div class="fsa-chat-title">${esc(fx.chatTitle || 'Ask this filing')}</div>
              <p class="fsa-chat-sub">${esc(fx.howAsk || fx.chatSub || '')}</p>
            </div>
          </div>
        </header>
        <div class="fsa-stream" data-stream role="log" aria-live="polite"></div>
        <div class="fsa-suggest" data-suggest></div>
        <form class="fsa-form" data-form>
          <input type="text" data-q enterkeyhint="send" autocomplete="off" placeholder="${esc(fx.chatPh || '')}" aria-label="${esc(fx.chatTitle || 'Ask')}" />
          <button type="submit" class="chat-send" ${state.waiting ? 'disabled' : ''} aria-label="${esc(fx.send || 'Send')}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.2 12h14.2M13.2 6.8 19.4 12l-6.2 5.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </form>
      </aside>
      </article>`;

    for (const b of work.querySelectorAll('[data-stmt]')) {
      b.onclick = () => {
        state.stmt = b.dataset.stmt;
        state.src = 0;
        paintWork();
      };
    }
    for (const b of work.querySelectorAll('[data-src]')) {
      b.onclick = () => {
        state.src = Number(b.dataset.src) || 0;
        paintWork();
      };
    }
    for (const b of work.querySelectorAll('[data-pane]')) {
      b.onclick = () => {
        state.pane = b.dataset.pane;
        paintWork();
      };
    }
    work.querySelector('[data-pg-prev]')?.addEventListener('click', () => {
      state.page = Math.max(1, state.page - 1);
      paintWork();
    });
    work.querySelector('[data-pg-next]')?.addEventListener('click', () => {
      state.page = Math.min(pages, state.page + 1);
      paintWork();
    });
    for (const tr of work.querySelectorAll('[data-line]')) {
      const pick = () => {
        const key = tr.dataset.line;
        const ln = lineByKey(row, key);
        state.sel = { type: 'line', key, stmt: tr.dataset.stmt || ln?.statement || state.stmt };
        state.focus = 'extract';
        if (tr.dataset.stmt) state.stmt = tr.dataset.stmt;
        const p = Number(tr.dataset.page);
        if (p) state.page = p;
        paintWork();
        work.querySelector(`[data-line="${key}"]`)?.focus({ preventScroll: true });
      };
      tr.addEventListener('click', pick);
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick();
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const rows = [...work.querySelectorAll('[data-line]')];
          const i = rows.indexOf(tr);
          const next = rows[e.key === 'ArrowDown' ? i + 1 : i - 1];
          next?.focus();
          next?.click();
        }
      });
    }
    for (const b of work.querySelectorAll('[data-ratio]')) {
      b.onclick = () => {
        state.sel = { type: 'ratio', id: b.dataset.ratio };
        const keys = RATIO_KEYS[b.dataset.ratio] || [];
        const ln = keys.map(k => lineByKey(row, k)).find(Boolean);
        if (ln?.statement) state.stmt = ln.statement;
        paintWork();
      };
    }
    for (const b of work.querySelectorAll('[data-gate]')) {
      b.onclick = () => {
        state.sel = { type: 'gate', id: b.dataset.gate };
        state.focus = 'gates';
        const stmt = GATE_STMT[b.dataset.gate];
        if (stmt) state.stmt = stmt;
        paintWork();
        if (b.dataset.gate === 'signoff') {
          state.fold.ask = true;
          applyFolds(work);
          intoViewIfNeeded(work.querySelector('[data-chat]'));
        }
      };
    }
    for (const b of work.querySelectorAll('[data-kpi-line]')) {
      b.onclick = () => {
        const key = b.dataset.kpiLine;
        if (b.dataset.jumpStmt) state.stmt = b.dataset.jumpStmt;
        state.sel = { type: 'line', key, stmt: b.dataset.jumpStmt || state.stmt };
        paintWork();
      };
    }
    for (const b of work.querySelectorAll('[data-kpi-ratio]')) {
      b.onclick = () => {
        state.sel = { type: 'ratio', id: b.dataset.kpiRatio };
        if (b.dataset.jumpStmt) state.stmt = b.dataset.jumpStmt;
        paintWork();
      };
    }
    for (const b of work.querySelectorAll('[data-jump-line]')) {
      b.onclick = () => {
        const key = b.dataset.jumpLine;
        if (b.dataset.jumpStmt) state.stmt = b.dataset.jumpStmt;
        state.sel = { type: 'line', key, stmt: b.dataset.jumpStmt || state.stmt };
        paintWork();
      };
    }
    work.querySelector('[data-show-src]')?.addEventListener('click', () => {
      const p = Number(work.querySelector('[data-show-src]').dataset.page);
      if (p) state.page = p;
      if (window.matchMedia('(max-width: 959px)').matches) state.pane = 'source';
      paintWork();
      work.querySelector('.fsa-viewer')?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    });
    for (const tr of work.querySelectorAll('[data-src-row]')) {
      tr.addEventListener('click', () => {
        const amt = tr.dataset.srcAmt === '' ? null : Number(tr.dataset.srcAmt);
        const lab = tr.dataset.srcRow;
        const hit = (row.lines || []).find(l =>
          (l.statement === state.stmt || !state.stmt)
          && (
            (amt != null && l.current === amt && (l.label === lab || l.labelAr === lab || l.sourceLabel === lab))
            || l.label === lab
            || l.labelAr === lab
          )
        ) || (row.lines || []).find(l => amt != null && l.current === amt);
        if (hit) {
          state.sel = { type: 'line', key: hit.key, stmt: hit.statement };
          if (hit.statement) state.stmt = hit.statement;
          paintWork();
        }
      });
    }
    work.querySelector('[data-del]')?.addEventListener('click', () => dropFiling(row.id));

    const stream = $('[data-stream]', work);
    const suggest = $('[data-suggest]', work);
    const form = $('[data-form]', work);
    const input = $('[data-q]', work);

    function citeRow(c) {
      if (!c) return '';
      const amt = c.current == null ? '' : money(c.current);
      return `<button type="button" class="fsa-cite" data-cite-key="${esc(c.key || '')}" data-cite-stmt="${esc(c.statement || '')}" data-cite-page="${esc(c.page || '')}">
        <b>${esc(c.label || fx.line || 'Line')}</b>
        ${amt ? `<span>${amt}</span>` : ''}
      </button>`;
    }

    function paintChat() {
      if (!state.chat.length && !state.waiting) {
        stream.innerHTML = `<div class="fsa-chat-empty">
          <span class="fsa-chat-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M7 3.8h7.2L19 8.4V20.2H7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14.1 3.8v4.7H19M9.2 12.2h7.2M9.2 15.4h7.2M9.2 18.4h4.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </span>
          <p>${esc(fx.chatHello || '')}</p>
          <em>${esc(fx.chatLock || '')}</em>
        </div>`;
        return;
      }
      const pending = state.waiting
        ? `<div class="fsa-bubble bot is-wait"><div class="fsa-wait" aria-hidden="true"><i></i><i></i><i></i></div><div>${esc(fx.chatWait || 'Reading the extract…')}</div></div>`
        : '';
      stream.innerHTML = state.chat.map(m => {
        const cites = (m.cites || []).map(citeRow).join('');
        return `<div class="fsa-bubble ${m.role}">
          <div>${esc(m.text)}</div>
          ${cites ? `<div class="fsa-cites">${cites}</div>` : ''}
        </div>`;
      }).join('') + pending;
      stream.scrollTop = stream.scrollHeight;
      for (const b of stream.querySelectorAll('[data-cite-key]')) {
        b.onclick = () => {
          if (b.dataset.citeStmt) state.stmt = b.dataset.citeStmt;
          if (b.dataset.citePage) state.page = Number(b.dataset.citePage) || state.page;
          if (b.dataset.citeKey) state.sel = { type: 'line', key: b.dataset.citeKey, stmt: b.dataset.citeStmt || state.stmt };
          state.focus = 'extract';
          paintWork();
        };
      }
    }

    const prompts = getLang() === 'ar'
      ? [fx.qRev || 'ما الإيراد؟', fx.qProfit || 'ما ربح السنة؟', fx.qRatio || 'نسبة التداول', fx.qComp || 'هل القائمة مكتملة؟']
      : [fx.qRev || 'What is revenue?', fx.qProfit || 'Profit for the year', fx.qRatio || 'Current ratio', fx.qComp || 'Is the filing complete?'];
    suggest.innerHTML = prompts.map(p => `<button type="button" class="chat-chip" data-p="${esc(p)}">${esc(p)}</button>`).join('');
    for (const b of suggest.querySelectorAll('[data-p]')) {
      b.onclick = () => ask(b.dataset.p);
    }

    async function ask(q) {
      const text = String(q || input.value || '').trim();
      if (!text || state.waiting) return;
      input.value = '';
      state.chat.push({ role: 'me', text });
      state.waiting = true;
      paintChat();
      try {
        const ans = await askFiling(row.id, text, getLang());
        state.waiting = false;
        state.chat.push({ role: 'bot', text: ans.text || '', cites: ans.cites || [] });
        const cite = ans.cites?.[0];
        if (cite?.statement) state.stmt = cite.statement;
        if (cite?.page) state.page = Number(cite.page) || state.page;
        if (cite?.key) state.sel = { type: 'line', key: cite.key, stmt: cite.statement || state.stmt };
        paintWork();
      } catch (err) {
        state.waiting = false;
        state.chat.push({ role: 'bot', text: err.message });
        paintChat();
      }
    }

    form.onsubmit = (e) => {
      e.preventDefault();
      state.focus = 'chat';
      paintPath();
      ask();
    };
    input?.addEventListener('focus', () => {
      state.focus = 'chat';
      paintPath();
    });
    work.querySelector('[data-ask-line]')?.addEventListener('click', () => {
      const key = work.querySelector('[data-ask-line]').dataset.askLine;
      const ln = lineByKey(row, key);
      const label = getLang() === 'ar' ? (ln?.labelAr || ln?.label) : (ln?.label || key);
      ask(getLang() === 'ar' ? `ما ${label}؟` : `What is ${label}?`);
    });
    paintChat();
    applyFolds(work);
    paintPath();
    if (state.focus === 'extract') {
      intoViewIfNeeded(work.querySelector('tr.is-on'));
    } else {
      window.scrollTo({ left: pinX, top: pinY, behavior: 'auto' });
      requestAnimationFrame(() => window.scrollTo({ left: pinX, top: pinY, behavior: 'auto' }));
    }
    if (keepAsk) work.querySelector('[data-q]')?.focus({ preventScroll: true });
  }

  function onJob(p) {
    const fx = copy();
    state.job = {
      ...(state.job || {}),
      ...p,
      hint: p.hint || (p.step === 'fail' ? p.hint : jobHint(p.step, fx))
    };
    paintProgress();
  }

  async function finishJob(filing, warning) {
    const fx = copy();
    onJob({ step: 'verify', pct: 96, hint: fx.progVerifyHint });
    await new Promise(r => setTimeout(r, 220));
    onJob({ step: 'done', pct: 100, hint: fx.progReadyHint, busy: false });
    state.filings = [filing, ...state.filings.filter(x => x.id !== filing.id)];
    state.selected = filing.id;
    state.stmt = 'sfp';
    state.chat = [];
    state.waiting = false;
    state.sel = null;
    state.focus = 'extract';
    setErr(warning || '');
    paintList();
    paintWork();
    intoViewIfNeeded(work.querySelector('.fsa-analysis'));
    await new Promise(r => setTimeout(r, 900));
    if (state.job?.step === 'done' && !state.job?.busy) {
      state.job = null;
      paintProgress();
    }
  }

  async function refresh() {
    setErr('');
    try {
      state.filings = await listFilings();
      if (!state.selected) state.selected = state.filings[0]?.id || null;
      paintList();
      paintWork();
    } catch (err) {
      setErr(err.message);
    }
  }

  uploadBtn?.addEventListener('click', () => fileInput.click());
  zoneBtn?.addEventListener('click', () => fileInput.click());

  function jump(id) {
    state.focus = id || 'add';
    if (id === 'extract') state.fold.extract = true;
    if (id === 'chat') state.fold.ask = true;
    if (id !== 'add') applyFolds(work);
    paintPath();
    if (id === 'add') {
      intoViewIfNeeded(addCard, { block: 'nearest' });
      addCard?.classList.add('is-over');
      setTimeout(() => addCard?.classList.remove('is-over'), 900);
      return;
    }
    const map = { extract: '[data-extract]', gates: '[data-gates]', chat: '[data-chat]' };
    const node = work.querySelector(map[id]);
    if (!node) return;
    if (node.matches('details')) node.open = true;
    intoViewIfNeeded(node);
  }
  for (const b of root.querySelectorAll('[data-jump]')) {
    b.onclick = () => jump(b.dataset.jump);
  }

  sampleBtn.onclick = async () => {
    if (state.job?.busy) return;
    setErr('');
    state.job = { busy: true, step: 'upload', pct: 12, name: 'Horizon-KSA-FY2025-IFRS.pdf' };
    setBusy(true);
    paintProgress();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const filing = await loadSample(onJob);
      await finishJob(filing);
    } catch (err) {
      onJob({ step: 'fail', pct: 0, hint: err.message, busy: false });
      setErr(err.message);
    } finally {
      if (state.job) state.job.busy = false;
      setBusy(false);
    }
  };

  async function ingest(input) {
    const files = (typeof FileList !== 'undefined' && input instanceof FileList)
      ? [...input]
      : Array.isArray(input) ? input : input ? [input] : [];
    if (!files.length || state.job?.busy) return;
    const xlsx = files.filter(f => /\.xlsx?$/i.test(f.name));
    const pdfs = files.filter(f => /\.pdf$/i.test(f.name));
    const batches = (files.length === 2 && xlsx.length === 1 && pdfs.length === 1)
      ? [[xlsx[0], pdfs[0]]]
      : files.map(f => [f]);
    for (const batch of batches) {
      await ingestBatch(batch);
    }
  }

  async function ingestBatch(files) {
    if (!files?.length || state.job?.busy) return;
    const lead = files[0];
    setErr('');
    state.job = {
      busy: true,
      step: 'read',
      pct: 4,
      name: files.length > 1 ? `${lead.name} + ${files[1].name}` : lead.name,
      size: files.reduce((n, f) => n + (f.size || 0), 0)
    };
    setBusy(true);
    paintProgress();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const filing = await uploadFiling(files, onJob);
      await finishJob(filing, '');
    } catch (err) {
      onJob({ step: 'fail', pct: 0, hint: err.message, busy: false });
      setErr(err.message);
    } finally {
      if (state.job) state.job.busy = false;
      setBusy(false);
    }
  }

  fileInput.addEventListener('change', () => {
    const files = fileInput.files;
    fileInput.value = '';
    ingest(files);
  });

  addCard.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    addCard.classList.add('is-over');
  });
  addCard.addEventListener('dragleave', () => addCard.classList.remove('is-over'));
  addCard.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    addCard.classList.remove('is-over');
    ingest(e.dataTransfer?.files);
  });
  panel?.addEventListener('dragover', (e) => {
    if (![...e.dataTransfer.types].includes('Files')) return;
    e.preventDefault();
    addCard?.classList.add('is-over');
  });
  panel?.addEventListener('dragleave', (e) => {
    if (!panel.contains(e.relatedTarget)) addCard?.classList.remove('is-over');
  });
  panel?.addEventListener('drop', (e) => {
    if (![...e.dataTransfer.types].includes('Files')) return;
    e.preventDefault();
    addCard?.classList.remove('is-over');
    ingest(e.dataTransfer?.files);
  });

  refresh();
}
