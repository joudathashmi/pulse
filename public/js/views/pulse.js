import { el, $ } from '../lib/dom.js';
import { num } from '../lib/format.js';
import { ALERTS } from '../fixtures/alerts.js';
import { nowStamp } from '../config.js';
import { t, getLang } from '../i18n.js';
import { openAskOwnerDialog } from './alerts.js';
import { ownerForMetric } from '../lib/queries.js';
import { kpiMarkHtml, bindKpiMarks } from '../lib/kpiMark.js';
import { mountPulseOrb } from '../lib/orb.js';
import { exportRawJson, exportBriefCsv, exportReportTxt, exportPdfPrint } from '../lib/export.js';
import { shareEmail, shareTeams, copyText, pulseShareBody } from '../lib/share.js';
import { workQueue } from '../lib/work.js';
import { bindCharts } from '../lib/crosshair.js';

/**
 * Pulse home - living orb + the operating system around it.
 * Drill is still four taps: Headline → Indicator → Sector/region → Source record.
 */

const COL = {
  fdi: '#2F8A6A',
  gfcf: '#6BA3FF',
  gold: '#E8A84A',
  ok: '#3D9B78',
  watch: '#C4A35A',
  risk: '#C45C58'
};

let orbHandle = null;
let stampTimer = null;
let tableFilter = 'all';
let highlightI = 0;
let chartKind = 'trend';
let orbMetric = 'fdi';

function packHighlights({ fdi, gfcf, signals, alerts, now, ar, fdiPct, gfcfPct }) {
  const items = [];
  for (const a of alerts) {
    items.push({
      kind: 'alert',
      title: ar && a.titleAr ? a.titleAr : a.title,
      body: ar && a.detailAr ? a.detailAr : a.detail,
      go: 'alerts'
    });
  }
  if (fdi) {
    items.push({
      kind: 'pack',
      title: `FDI ${num(fdi.pulseValue)} SAR bn`,
      body: `Net FDI is ${fdiPct}% of the 2026 target (${num(fdi.yearTarget)}). Certified Q1 print. Open the drill to the source record.`,
      path: ['fdi']
    });
  }
  if (gfcf) {
    items.push({
      kind: 'pack',
      title: `GFCF ${num(gfcf.pulseValue, 0)} SAR bn`,
      body: `Gross fixed capital formation is ${gfcfPct}% of ${num(gfcf.yearTarget, 0)} · ${gfcf.status}. Construction reclassification is the open watch.`,
      path: ['gfcf']
    });
  }
  const pmi = (signals || []).find(s => s.id === 'pmi');
  if (pmi) {
    items.push({
      kind: 'pack',
      title: `PMI ${pmi.value}`,
      body: `Non-oil purchasing managers ${pmi.delta || ''} · ${pmi.period}. Expansion holds above 50.`,
      path: [pmi.metric || 'gfcf']
    });
  }
  if (now) {
    const est = now.path?.[13] ? num(now.path[13].est) : '-';
    items.push({
      kind: 'pack',
      title: 'Quarter still open',
      body: `Q2 actuals are not yet issued by GASTAT. A synthetic populated estimate holds the demo quarter at ${est} SAR bn. It is not a MISA calculation. The official print is never replaced.`,
      go: 'now'
    });
  }
  return items;
}

function progressPct(value, target) {
  if (!target || !Number.isFinite(Number(value))) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(value) / target) * 100)));
}

function paceMultiple(value, target, quarter = 1) {
  const expected = Number(target) * (quarter / 4);
  if (!expected) return 0;
  return Number(value) / expected;
}

function dualLine(hist = []) {
  const rows = hist.slice(-8);
  if (rows.length < 2) return '';
  const W = 640, H = 176, pl = 36, pr = 48, pt = 16, pb = 28;
  const fdi = rows.map(r => r.fdi);
  const gfcf = rows.map(r => r.gfcf);
  const scale = (arr) => {
    const min = Math.min(...arr), max = Math.max(...arr), span = (max - min) || 1;
    return (v) => pt + (1 - (v - min) / span) * (H - pt - pb);
  };
  const Yf = scale(fdi), Yg = scale(gfcf);
  const X = (i) => pl + (i / (rows.length - 1)) * (W - pl - pr);
  const path = (arr, Y) => arr.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  const area = (arr, Y) => `${path(arr, Y)} L${X(arr.length - 1).toFixed(1)} ${H - pb} L${X(0).toFixed(1)} ${H - pb} Z`;
  const last = rows.length - 1;
  const labels = rows.map((r, i) =>
    `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.38)">${(r.p || '').replace('20', '')}</text>`
  ).join('');
  const pts = rows.map((r, i) =>
    `<circle data-pt cx="${X(i)}" cy="${Yf(r.fdi)}" data-ys="${Yf(r.fdi)},${Yg(r.gfcf)}" data-tip="<b>${r.p}</b>FDI ${num(r.fdi)} SAR bn<br>GFCF ${num(r.gfcf, 0)} SAR bn" r="0" fill="none"/>`
  ).join('');
  return `<svg class="wh-chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="FDI and GFCF last eight quarters" data-plot="${pl},${pt},${W - pr},${H - pb}">
    <path d="${area(gfcf, Yg)}" fill="${COL.gfcf}" opacity="0.10"/>
    <path d="${area(fdi, Yf)}" fill="${COL.fdi}" opacity="0.10"/>
    <path d="${path(gfcf, Yg)}" fill="none" stroke="${COL.gfcf}" stroke-width="2.4" stroke-dasharray="7 5"/>
    <path d="${path(fdi, Yf)}" fill="none" stroke="${COL.fdi}" stroke-width="2.4"/>
    <circle cx="${X(last)}" cy="${Yf(fdi[last])}" r="4.5" fill="${COL.fdi}"/>
    <circle cx="${X(last)}" cy="${Yg(gfcf[last])}" r="4.5" fill="${COL.gfcf}"/>
    <text x="${X(last) + 8}" y="${Yf(fdi[last]) + 4}" font-size="11" fill="${COL.fdi}">${num(fdi[last])}</text>
    <text x="${X(last) + 8}" y="${Yg(gfcf[last]) + 4}" font-size="11" fill="${COL.gfcf}">${num(gfcf[last], 0)}</text>
    ${labels}${pts}
  </svg>`;
}

function dualBars(hist = []) {
  const rows = hist.slice(-8);
  if (rows.length < 2) return '';
  const W = 640, H = 176, pl = 28, pr = 12, pt = 12, pb = 28;
  const fdi = rows.map(r => r.fdi);
  const gfcf = rows.map(r => r.gfcf);
  const max = Math.max(...fdi, ...gfcf.map(v => v / 10)) || 1;
  const slot = (W - pl - pr) / rows.length;
  const bars = rows.map((r, i) => {
    const x = pl + i * slot;
    const hf = ((r.fdi / max) * (H - pt - pb));
    const hg = (((r.gfcf / 10) / max) * (H - pt - pb));
    return `<rect x="${x + 4}" y="${H - pb - hf}" width="${slot * 0.32}" height="${hf}" rx="2" fill="${COL.fdi}"/>
      <rect x="${x + slot * 0.4}" y="${H - pb - hg}" width="${slot * 0.32}" height="${hg}" rx="2" fill="${COL.gfcf}"/>
      <text x="${x + slot * 0.36}" y="${H - 8}" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.38)">${(r.p || '').replace('20', '')}</text>
      <circle data-pt cx="${x + slot * 0.36}" cy="${H - pb - Math.max(hf, hg)}" data-ys="${H - pb - hf},${H - pb - hg}" data-tip="<b>${r.p}</b>FDI ${num(r.fdi)} SAR bn<br>GFCF ${num(r.gfcf, 0)} SAR bn" r="0" fill="none"/>`;
  }).join('');
  return `<svg class="wh-chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="FDI and GFCF as columns" data-plot="${pl},${pt},${W - pr},${H - pb}">
    ${bars}
  </svg>`;
}

function dualPulse(hist = []) {
  const rows = hist.slice(-4);
  if (!rows.length) return '';
  return `<div class="wh-pulse-nums">${rows.map(r => `
    <div>
      <b>${(r.p || '').replace('20', '')}</b>
      <span style="color:${COL.fdi}">${num(r.fdi)}</span>
      <em style="color:${COL.gfcf}">${num(r.gfcf, 0)}</em>
    </div>`).join('')}</div>`;
}

function chartHtml(hist) {
  if (chartKind === 'bars') return dualBars(hist);
  if (chartKind === 'pulse') return dualPulse(hist);
  return dualLine(hist);
}

function nowcastLine(path = []) {
  if (path.length < 2) return '';
  const W = 640, H = 140, pl = 8, pr = 8, pt = 10, pb = 8;
  const vals = path.map(p => p.est);
  const min = Math.min(...vals, ...path.map(p => p.lo));
  const max = Math.max(...vals, ...path.map(p => p.hi));
  const span = (max - min) || 1;
  const X = (i) => pl + (i / (path.length - 1)) * (W - pl - pr);
  const Y = (v) => pt + (1 - (v - min) / span) * (H - pt - pb);
  const line = path.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.est).toFixed(1)}`).join(' ');
  const hi = path.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.hi).toFixed(1)}`).join(' ');
  const lo = [...path].reverse().map((p, i) => `L${X(path.length - 1 - i).toFixed(1)} ${Y(p.lo).toFixed(1)}`).join(' ');
  const last = path.length - 1;
  const pts = path.map((p, i) =>
    `<circle data-pt cx="${X(i)}" cy="${Y(p.est)}" data-tip="<b>Week ${p.w}</b>Estimate ${num(p.est)} SAR bn<br>Band ${num(p.lo)} to ${num(p.hi)}" r="0" fill="none"/>`
  ).join('');
  return `<svg class="wh-chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="In-quarter estimate" data-plot="${pl},${pt},${W - pr},${H - pb}">
    <path d="${hi} ${lo}" fill="${COL.gfcf}" opacity="0.12"/>
    <path d="${line}" fill="none" stroke="${COL.gfcf}" stroke-width="2" stroke-dasharray="6 5"/>
    <circle cx="${X(last)}" cy="${Y(path[last].est)}" r="4" fill="${COL.gfcf}"/>
    ${pts}
  </svg>`;
}

function askDefinition(meta, id, brief) {
  const info = ownerForMetric(id, brief);
  openAskOwnerDialog({
    metric: id,
    value: '',
    owner: info.owner || meta.owner,
    ownerContact: info.contact,
    title: meta.name,
    question: `Please confirm or clarify the official definition of “${meta.name}”.\n\nCurrent definition on Pulse:\n${meta.definition}\n\nSource listed: ${meta.source}\nCalculated: ${meta.calculatedLabel}`
  });
}

function activateOnEnter(node, fn) {
  node?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn(e);
    }
  });
}

function gaugeHtml(pace, badge) {
  const x = Math.max(-1, Math.min(3, pace));
  const pct = ((x + 1) / 4) * 100;
  const ticks = Array.from({ length: 41 }, (_, i) => {
    const at = i === Math.round(pct / 2.5);
    const h = 8 + Math.round(Math.sin((i / 40) * Math.PI) * 10);
    return `<i class="${at ? 'on' : ''}" style="height:${at ? 22 : h}px"></i>`;
  }).join('');
  return `<div class="wh-gauge" role="meter" aria-valuenow="${pace.toFixed(2)}" aria-valuemin="-1" aria-valuemax="3">
    <div class="wh-gauge-head">
      <div class="wh-k" style="margin:0">Pace of year</div>
      <span class="wh-badge ${pace < 1 ? 'watch' : 'ok'}">${badge}</span>
    </div>
    <div class="wh-gauge-val">${pace.toFixed(1)}<span>×</span></div>
    <div class="wh-gauge-track">${ticks}</div>
    <div class="wh-gauge-labs"><span>Slow · −1.0×</span><span>1.0×</span><span>Fast · 3.0×</span></div>
  </div>`;
}

function monMark(status) {
  if (status === 'ok') return '✓';
  if (status === 'risk') return '▲';
  return '!';
}

function monWord(status) {
  if (status === 'ok') return 'On track';
  if (status === 'risk') return 'Alert';
  if (status === 'watch') return 'Watch';
  return status || '-';
}

const CHEV = '<svg class="wh-chev" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6 3.2 11.2 8 6 12.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function fdiCutLine(cut) {
  const rows = (cut?.countries || [])
    .filter(c => c.year === 2024 && (c.inflow || 0) > 0)
    .sort((a, b) => (b.inflow || 0) - (a.inflow || 0));
  const top = rows[0];
  if (!top) return 'Country and sector · open FDI';
  return `${top.name} leads 2024 inflow · ${num(top.inflow)} · open FDI`;
}

function toast(msg) {
  const n = document.getElementById('tip');
  if (!n) return;
  n.textContent = msg;
  n.style.opacity = 1;
  n.style.left = '50%';
  n.style.top = '18px';
  n.style.transform = 'translateX(-50%)';
  setTimeout(() => {
    n.style.opacity = 0;
    n.style.transform = '';
  }, 1800);
}

function assignMetric(id, pack, value, title) {
  const info = ownerForMetric(id, pack);
  openAskOwnerDialog({
    metric: id,
    value: String(value ?? info.value ?? ''),
    owner: info.owner,
    ownerContact: info.contact,
    title: title || info.label || id,
    question: `Please own this Pulse item: qualify “${title || info.label || id}” for the Committee pack and assign the next action.`
  });
}

export function renderPulse(root, data, onOpen) {
  orbHandle?.destroy();
  orbHandle = null;

  const ctx = typeof onOpen === 'function' ? { openDrill: onOpen } : (onOpen || {});
  const openDrill = ctx.openDrill;
  const go = ctx.go;
  const openWork = ctx.openWork;
  const work = workQueue(data);
  const s = t();
  const ar = getLang() === 'ar';
  const pack = data?.brief || { headlines: {}, signals: [], source: {} };
  const fdi = pack.headlines?.fdi;
  const gfcf = pack.headlines?.gfcf;
  const signals = pack.signals || [];
  const hist = data?.series?.hist || [];
  const now = data?.nowcast;
  const asOf = pack.source?.asOfLabel || '-';
  const openAlerts = ALERTS.filter(a => a.status === 'open' || a.status === 'overdue');
  const fdiPct = progressPct(fdi?.pulseValue, fdi?.yearTarget);
  const gfcfPct = progressPct(gfcf?.pulseValue, gfcf?.yearTarget);
  const highlights = packHighlights({
    fdi, gfcf, signals, alerts: openAlerts, now, ar, fdiPct, gfcfPct
  });
  const pace = paceMultiple(fdi?.pulseValue, fdi?.yearTarget, 1);
  const prevFdi = hist[hist.length - 1]?.fdi;
  const slower = prevFdi != null && Number(fdi?.pulseValue) < prevFdi;
  const badge = slower ? '▲ slower vs last quarter' : '▼ faster vs last quarter';
  const fill = Math.max(0.12, Math.min(1, fdiPct / 100));
  const chartHint = () => chartKind === 'bars'
    ? 'Bars · GFCF is drawn ÷ 10 so both series fit the same scale. Values stay in SAR bn.'
    : chartKind === 'pulse'
      ? 'Pulse numbers · last four certified quarters, FDI then GFCF.'
      : 'Trend · solid FDI, dashed GFCF. Last eight quarters.';

  const rows = [
    fdi && { id: 'fdi', name: fdi.name, value: num(fdi.pulseValue), status: fdi.status, source: fdi.source, period: fdi.pulseLabel, metric: 'fdi', raw: fdi.pulseValue },
    gfcf && { id: 'gfcf', name: gfcf.name, value: num(gfcf.pulseValue, 0), status: gfcf.status, source: gfcf.source, period: gfcf.pulseLabel, metric: 'gfcf', raw: gfcf.pulseValue },
    ...signals.map(sig => ({
      id: sig.id,
      name: ar && sig.nameAr ? sig.nameAr : sig.name,
      value: sig.value,
      status: sig.status,
      source: sig.source,
      period: sig.period,
      metric: sig.metric || 'fdi',
      delta: sig.delta,
      raw: sig.value
    }))
  ].filter(Boolean);

  root.innerHTML = `
    <div class="wh wh-sys">
      <div class="wh-day">
        <div>
          <b>Pulse · Live</b>
          <div class="wh-day-stamps">
            <span><em>${s.dataAsOf || 'Data as of'}</em> ${asOf}</span>
            <span><em>${s.refreshed || 'Refreshed'}</em> <span data-live-stamp>${nowStamp()}</span></span>
          </div>
        </div>
      </div>

      <div class="wh-stage">
      <div class="wh-hero">
        <div class="wh-orb-wrap" data-metric="fdi" data-orb-open data-tour="orb" tabindex="0" aria-label="Open FDI drill" aria-describedby="orb-tip" title="${s.orbTip || 'Certified headline in SAR bn. Tap to trace.'}">
          <canvas class="wh-orb" data-orb width="280" height="280"></canvas>
          <div class="wh-orb-tip" role="tooltip">${s.orbTip || 'Certified headline in SAR bn. The gold ring is the Pulse. Tap to trace the number.'}</div>
          <div class="wh-orb-read">
            <div class="wh-orb-v" data-orb-v>${fdi ? num(fdi.pulseValue) : '-'}</div>
            <div class="wh-orb-switch" role="tablist" aria-label="Headline">
              <button type="button" class="on" role="tab" aria-selected="true" data-orb-metric="fdi">FDI</button>
              <i aria-hidden="true"></i>
              <button type="button" role="tab" aria-selected="false" data-orb-metric="gfcf">GFCF</button>
            </div>
            <div class="wh-orb-unit">SAR bn</div>
            <div class="wh-orb-vs" data-orb-vs>${fdiPct}% of 2026 target</div>
          </div>
        </div>
        <p class="wh-orb-hint" id="orb-tip">${s.orbHint || 'Certified headline · tap to trace'}</p>
      </div>

      <div class="wh-journal">
        <div class="wh-hl-block">
          <button type="button" class="wh-hl" data-hl data-tour="highlight">
            <div class="wh-hl-top">
              <span class="wh-kind" data-hl-kind></span>
              <div class="wh-hl-copy">
                <h2 data-hl-title></h2>
                <p data-hl-body></p>
              </div>
              <span class="wh-hl-stack" data-hl-next aria-label="Next insight">
                <b data-hl-n></b>
                ${CHEV}
              </span>
            </div>
          </button>
          <div class="wh-hl-dots" data-hl-dots role="tablist" aria-label="Highlights"></div>
        </div>
        <div class="wh-mons">
          <button type="button" class="wh-mon" data-open="fdi" data-tour="monitor">
            <div class="wh-mon-h">FDI monitor ${CHEV}</div>
            <div class="wh-mon-row">
              <span class="wh-sq ${fdi?.status || 'watch'}" aria-hidden="true">${monMark(fdi?.status)}</span>
              <div>
                <b class="${fdi?.status || 'watch'}">${monWord(fdi?.status)}</b>
                <span class="wh-mon-val">${fdi ? num(fdi.pulseValue) : '-'} <em>SAR bn</em></span>
                <span>${fdiPct}% of target ${fdi ? num(fdi.yearTarget) : '-'}</span>
                <span class="wh-mon-cut">${fdiCutLine(data?.fdiCut)}</span>
              </div>
            </div>
          </button>
          <button type="button" class="wh-mon" data-open="gfcf">
            <div class="wh-mon-h">GFCF monitor ${CHEV}</div>
            <div class="wh-mon-row">
              <span class="wh-sq ${gfcf?.status || 'watch'}" aria-hidden="true">${monMark(gfcf?.status)}</span>
              <div>
                <b class="${gfcf?.status || 'watch'}">${monWord(gfcf?.status)}</b>
                <span class="wh-mon-val">${gfcf ? num(gfcf.pulseValue, 0) : '-'} <em>SAR bn</em></span>
                <span>${gfcfPct}% of target ${gfcf ? num(gfcf.yearTarget, 0) : '-'}</span>
                <span class="wh-mon-cut">${gfcf?.note || ''}</span>
              </div>
            </div>
          </button>
        </div>
        <div class="wh-sec-acts no-print">
          <button type="button" class="wh-act" data-copy>Copy</button>
          <button type="button" class="wh-act" data-teams>Teams</button>
          <button type="button" class="wh-act" data-email>Email</button>
        </div>
      </div>
      </div>

      <div class="wh-note" data-note>
        <span aria-hidden="true">⏳</span>
        <p>Investment Pulse Operating System is live on published feeds. Q2 actuals are not yet issued by GASTAT. The in-quarter path on this host is a synthetic populated estimate, not a MISA calculation.</p>
        <button type="button" class="wh-note-x" data-note-x aria-label="Dismiss">×</button>
      </div>

      ${gaugeHtml(pace, badge)}

      <div class="wh-work no-print">
        <div class="wh-k">Work on the pack</div>
        <div class="wh-work-row">
          <button type="button" data-work="signals"><span>Open</span><b>${work.counts.open}</b></button>
          <button type="button" data-work="signals"><span>Overdue</span><b class="risk">${work.counts.overdue}</b></button>
          <button type="button" data-work="quarantine"><span>Quarantine</span><b>${work.counts.quarantine}</b></button>
          <button type="button" data-work="actions"><span>Actions</span><b>${work.counts.actions}</b></button>
        </div>
      </div>

      <div class="wh-dash-h" data-tour="share">
        <div>
          <h2>Explore</h2>
          <span>Certified series · ${rows.length} · tap a row to drill to the source record</span>
        </div>
        <div class="wh-sec-acts no-print">
          <button type="button" class="wh-act" data-csv>CSV</button>
          <button type="button" class="wh-act" data-report>Report</button>
          <button type="button" class="wh-act" data-pdf>PDF</button>
        </div>
      </div>
      <div class="seg wh-filters" data-filters>
        <span class="seg-track">
          <button type="button" class="seg-opt ${tableFilter === 'all' ? 'on' : ''}" data-filter="all">All</button>
          <button type="button" class="seg-opt ${tableFilter === 'fdi' ? 'on' : ''}" data-filter="fdi">FDI</button>
          <button type="button" class="seg-opt ${tableFilter === 'gfcf' ? 'on' : ''}" data-filter="gfcf">GFCF</button>
          <button type="button" class="seg-opt ${tableFilter === 'risk' ? 'on' : ''}" data-filter="risk">At risk</button>
        </span>
      </div>
      <div class="wh-table-wrap" data-tour="explore">
        <table class="wh-table">
          <thead>
            <tr><th>Indicator</th><th>Value</th><th>Status</th><th>Source</th><th>Period</th><th></th></tr>
          </thead>
          <tbody data-table></tbody>
        </table>
      </div>

      <article class="wh-card">
        <div class="wh-dash-h" style="margin:0 0 10px">
          <div class="wh-k" style="margin:0">FDI · GFCF · last eight quarters</div>
          <div class="seg wh-filters" data-chart-kind>
            <span class="seg-track">
              <button type="button" class="seg-opt ${chartKind === 'trend' ? 'on' : ''}" data-kind="trend">Trend</button>
              <button type="button" class="seg-opt ${chartKind === 'bars' ? 'on' : ''}" data-kind="bars">Bars</button>
              <button type="button" class="seg-opt ${chartKind === 'pulse' ? 'on' : ''}" data-kind="pulse">Pulse</button>
            </span>
          </div>
        </div>
        <div class="wh-legend">
          <span><i style="background:${COL.fdi}"></i>FDI · solid</span>
          <span data-legend-gfcf><i style="background:${COL.gfcf}"></i>GFCF · dashed${chartKind === 'bars' ? ' · drawn ÷ 10' : ''}</span>
        </div>
        <p class="wh-est" data-chart-hint>${chartHint()}</p>
        <div data-chart-host>${chartHtml(hist)}</div>
      </article>

      <article class="wh-card" data-go-now tabindex="0" role="button">
        <div class="wh-k">In-quarter estimate · ${s.synthBadge || 'Synthetic · populated'}</div>
        <p class="wh-est">${s.synthNote || 'Populated synthetic figures. Not a MISA calculation.'}</p>
        <p class="wh-est">Estimate ${now?.path?.[13] ? num(now.path[13].est) : '-'} · official print ${now?.official != null ? num(now.official) : '-'} ${s.sarBn}</p>
        ${nowcastLine(now?.path || [])}
        <span class="wh-link">Open nowcast →</span>
      </article>

      <article class="wh-card wh-raw" data-raw-panel>
        <div class="wh-dash-h" style="margin:0 0 8px">
          <div class="wh-k" style="margin:0">Raw pack</div>
          <div class="wh-sec-acts no-print">
            <button type="button" class="wh-act" data-raw>Show</button>
            <button type="button" class="wh-act" data-json>JSON</button>
          </div>
        </div>
        <pre class="wh-pre hide" data-raw-json></pre>
      </article>
    </div>`;

  const canvas = $('[data-orb]', root);
  orbHandle = mountPulseOrb(canvas, { color: COL.gold, fill });

  const openPath = (id) => openDrill?.([id]);
  for (const b of root.querySelectorAll('[data-open]')) {
    b.addEventListener('click', () => {
      if (b.dataset.open === 'fdi' && go) {
        go('fdi');
        return;
      }
      openPath(b.dataset.open);
    });
  }

  const paintOrb = (metric) => {
    orbMetric = metric === 'gfcf' ? 'gfcf' : 'fdi';
    const isG = orbMetric === 'gfcf';
    const wrap = $('.wh-orb-wrap', root);
    const val = $('[data-orb-v]', root);
    const vs = $('[data-orb-vs]', root);
    if (wrap) {
      wrap.dataset.metric = orbMetric;
      wrap.setAttribute('aria-label', isG ? 'Open GFCF drill' : 'Open FDI drill');
    }
    if (val) {
      val.textContent = isG ? (gfcf ? num(gfcf.pulseValue, 0) : '-') : (fdi ? num(fdi.pulseValue) : '-');
      val.classList.remove('is-flip');
      void val.offsetWidth;
      val.classList.add('is-flip');
    }
    if (vs) vs.textContent = isG ? `${gfcfPct}% of 2026 target` : `${fdiPct}% of 2026 target`;
    for (const b of root.querySelectorAll('[data-orb-metric]')) {
      const on = b.dataset.orbMetric === orbMetric;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    }
    for (const m of root.querySelectorAll('.wh-mon[data-open]')) {
      m.classList.toggle('is-orb', m.dataset.open === orbMetric);
    }
    const nextFill = Math.max(0.12, Math.min(1, (isG ? gfcfPct : fdiPct) / 100));
    orbHandle?.set({ color: isG ? '#D4923A' : COL.gold, fill: nextFill });
  };

  for (const b of root.querySelectorAll('[data-orb-metric]')) {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (b.dataset.orbMetric === orbMetric) {
        openPath(orbMetric);
        return;
      }
      paintOrb(b.dataset.orbMetric);
    });
  }
  const wrap = $('.wh-orb-wrap', root);
  wrap?.addEventListener('click', (e) => {
    if (e.target.closest('[data-orb-metric]')) return;
    openPath(orbMetric);
  });
  wrap?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPath(orbMetric);
    }
  });
  if (wrap && !sessionStorage.getItem('misa-pulse-orb-tip')) {
    wrap.classList.add('is-tip');
    sessionStorage.setItem('misa-pulse-orb-tip', '1');
    window.setTimeout(() => wrap.classList.remove('is-tip'), 3200);
  }
  paintOrb(orbMetric);

  const paintHighlight = () => {
    if (!highlights.length) return;
    highlightI = ((highlightI % highlights.length) + highlights.length) % highlights.length;
    const h = highlights[highlightI];
    const title = $('[data-hl-title]', root);
    const body = $('[data-hl-body]', root);
    const n = $('[data-hl-n]', root);
    const kind = $('[data-hl-kind]', root);
    const dots = $('[data-hl-dots]', root);
    if (title) title.textContent = h.title;
    if (body) body.textContent = h.body;
    if (n) n.textContent = `${highlightI + 1}/${highlights.length}`;
    if (kind) {
      kind.textContent = h.kind === 'alert' ? 'Alert' : 'Insight';
      kind.className = `wh-kind ${h.kind === 'alert' ? 'is-alert' : 'is-insight'}`;
    }
    if (dots) {
      dots.innerHTML = highlights.map((item, i) =>
        `<button type="button" class="${i === highlightI ? 'on' : ''}" data-hl-dot="${i}" aria-label="${item.kind === 'alert' ? 'Alert' : 'Insight'} ${i + 1}/${highlights.length}"></button>`
      ).join('');
    }
  };
  const openHighlight = () => {
    const h = highlights[highlightI];
    if (!h) return;
    if (h.go) go?.(h.go);
    else if (h.path) openDrill?.(h.path);
  };
  paintHighlight();
  $('[data-hl-next]', root)?.addEventListener('click', (e) => {
    e.stopPropagation();
    highlightI += 1;
    paintHighlight();
  });
  $('[data-hl-dots]', root)?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-hl-dot]');
    if (!b) return;
    highlightI = Number(b.dataset.hlDot);
    paintHighlight();
  });
  $('[data-hl]', root)?.addEventListener('click', openHighlight);
  activateOnEnter($('[data-hl]', root), openHighlight);
  for (const b of root.querySelectorAll('[data-work]')) {
    b.onclick = () => openWork?.(b.dataset.work) || go?.('alerts');
  }
  const chartHost = $('[data-chart-host]', root);
  const legendG = $('[data-legend-gfcf]', root);
  const hint = $('[data-chart-hint]', root);
  const paintChart = () => {
    if (chartHost) {
      chartHost.innerHTML = chartHtml(hist);
      bindCharts(chartHost);
    }
    if (legendG) legendG.innerHTML = `<i style="background:${COL.gfcf}"></i>GFCF · dashed${chartKind === 'bars' ? ' · drawn ÷ 10' : ''}`;
    if (hint) hint.textContent = chartHint();
  };
  for (const b of root.querySelectorAll('[data-kind]')) {
    b.onclick = () => {
      chartKind = b.dataset.kind;
      for (const x of root.querySelectorAll('[data-kind]')) x.classList.toggle('on', x.dataset.kind === chartKind);
      paintChart();
    };
  }
  for (const b of root.querySelectorAll('[data-go-drill]')) b.addEventListener('click', () => openDrill?.(['fdi']));
  for (const b of root.querySelectorAll('[data-go-alerts]')) {
    b.addEventListener('click', () => go?.('alerts'));
    activateOnEnter(b, () => go?.('alerts'));
  }
  for (const b of root.querySelectorAll('[data-go-now]')) {
    b.addEventListener('click', () => go?.('now'));
    activateOnEnter(b, () => go?.('now'));
  }
  for (const b of root.querySelectorAll('[data-nav]')) {
    b.addEventListener('click', () => go?.(b.dataset.nav));
  }
  root.querySelector('[data-note-x]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    $('[data-note]', root)?.remove();
  });

  const showRaw = () => {
    const pre = $('[data-raw-json]', root);
    const btn = root.querySelector('[data-raw]');
    if (!pre.textContent) {
      pre.textContent = JSON.stringify({
        exportedAt: new Date().toISOString(),
        brief: pack,
        series: data?.series,
        nowcast: data?.nowcast
      }, null, 2);
    }
    const open = pre.classList.toggle('hide') === false;
    if (btn) btn.textContent = open ? 'Hide' : 'Show';
    if (open) pre.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  root.querySelector('[data-raw]')?.addEventListener('click', showRaw);
  root.querySelector('[data-json]')?.addEventListener('click', () => exportRawJson(data));
  root.querySelector('[data-email]')?.addEventListener('click', () => shareEmail({
    subject: 'Investment Pulse Operating System · certified position',
    body: pulseShareBody(data)
  }));
  root.querySelector('[data-teams]')?.addEventListener('click', () => shareTeams({
    title: 'Investment Pulse Operating System',
    text: pulseShareBody(data),
    url: location.href
  }));
  root.querySelector('[data-copy]')?.addEventListener('click', async () => {
    await copyText(`${pulseShareBody(data)}\n${location.href}`);
    toast('Copied Pulse position and link');
  });
  root.querySelector('[data-csv]')?.addEventListener('click', () => exportBriefCsv(data));
  root.querySelector('[data-report]')?.addEventListener('click', () => exportReportTxt(data));
  root.querySelector('[data-pdf]')?.addEventListener('click', () => exportPdfPrint('Investment Pulse Operating System'));

  const tbody = $('[data-table]', root);
  const filters = root.querySelectorAll('[data-filter]');
  const paintTable = () => {
    tbody.innerHTML = '';
    const shown = rows.filter(row => {
      if (tableFilter === 'fdi') return row.metric === 'fdi' || row.id === 'fdi';
      if (tableFilter === 'gfcf') return row.metric === 'gfcf' || row.id === 'gfcf';
      if (tableFilter === 'risk') return row.status === 'risk' || row.status === 'watch';
      return true;
    });
    for (const row of shown) {
      const st = row.status === 'ok' ? 'On track' : row.status === 'watch' ? 'Watch' : row.status === 'risk' ? 'At risk' : (row.status || '-');
      const tr = el(`<tr tabindex="0">
        <td><span class="wh-ind">${row.name}${kpiMarkHtml(row.id)}</span></td>
        <td class="num">${row.value ?? '-'}</td>
        <td class="${row.status || ''}">${st}</td>
        <td>${row.source || '-'}</td>
        <td>${row.period || '-'}</td>
        <td class="wh-row-acts">
          <button type="button" class="wh-linkish" data-explore>Explore</button>
          <button type="button" class="wh-linkish" data-row-assign>Assign</button>
        </td>
      </tr>`);
      const explore = () => openDrill?.([row.id]);
      tr.addEventListener('click', (e) => {
        if (e.target.closest('.kpi-mark, [data-row-assign]')) return;
        explore();
      });
      tr.querySelector('[data-explore]').addEventListener('click', (e) => {
        e.stopPropagation();
        explore();
      });
      tr.querySelector('[data-row-assign]').addEventListener('click', (e) => {
        e.stopPropagation();
        assignMetric(row.id, pack, row.raw, row.name);
      });
      activateOnEnter(tr, explore);
      tbody.appendChild(tr);
    }
  };
  for (const b of filters) {
    b.onclick = () => {
      tableFilter = b.dataset.filter;
      for (const x of filters) x.classList.toggle('on', x.dataset.filter === tableFilter);
      paintTable();
    };
  }
  paintTable();
  bindCharts(root);

  bindKpiMarks(root, {
    brief: pack,
    onAskDefinition: (meta, id) => askDefinition(meta, id, pack)
  });

  const stampEl = $('[data-live-stamp]', root);
  if (stampTimer) clearInterval(stampTimer);
  stampTimer = setInterval(() => {
    if (stampEl) stampEl.textContent = nowStamp();
  }, 30000);
}
