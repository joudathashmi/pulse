import { el, $ } from '../lib/dom.js';
import { num } from '../lib/format.js';
import { BRIEF, LEADING } from '../fixtures/brief.js';
import { getLang, t } from '../i18n.js';

function spark(values) {
  if (!values?.length) return '';
  const w = 88, h = 28, pad = 2;
  const min = Math.min(...values), max = Math.max(...values);
  const span = (max - min) || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="mini-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.4" points="${pts}"/></svg>`;
}

function progress(actual, target) {
  const pct = Math.min(100, Math.round((actual / target) * 100));
  return `<div class="prog"><i style="width:${pct}%"></i><span>${pct}%</span></div>`;
}

/**
 * Landing scoreboard - mirrors the July 2026 organisational performance brief.
 */
export function renderBriefLanding(panel, navigate) {
  const s = t();
  const ar = getLang() === 'ar';
  const g = BRIEF.gfcf;
  const f = BRIEF.fdi;

  panel.innerHTML = `
    <div class="board">
      <div class="board-kicker">
        <span>${ar ? BRIEF.classificationAr : BRIEF.classification}</span>
        <span class="sep">·</span>
        <span>${ar ? BRIEF.meetingAr : BRIEF.meeting}</span>
        <span class="sep">·</span>
        <span>${ar ? BRIEF.asOfAr : BRIEF.asOf}</span>
      </div>
      <h2 class="ep-title">${s.level1Title}</h2>
      <p class="ep-sub">${ar ? BRIEF.strategyAr : BRIEF.strategy}. ${s.level1Sub}</p>

      <div class="score-grid">
        <article class="score-card" data-open="gfcf">
          <div class="score-head">
            <div class="ep-k">GFCF · ${g.method}</div>
            <button type="button" class="score-open" data-go="gfcf">${s.openGfcf} ›</button>
          </div>
          <div class="score-name">${ar ? g.nameAr : g.name}</div>
          <div class="ep-hero">${num(g.q1Actual, 0)}<span class="unit">${s.sarBn}</span></div>
          <div class="score-tag">${s.q1Actual}</div>
          <dl class="score-meta">
            <div><dt>${s.eaForecast} Q1</dt><dd>${num(g.q1Forecast, 0)}</dd></div>
            <div><dt>${s.eaForecast} Q2</dt><dd>${num(g.q2Forecast, 0)}</dd></div>
            <div><dt>${s.h1Forecast}</dt><dd>${num(g.h1Forecast, 0)}</dd></div>
            <div><dt>${s.target2026}</dt><dd>${num(g.target2026, 0)}</dd></div>
          </dl>
          <div class="score-cum">
            <div class="lab">${s.cumulative2030}</div>
            <div class="cum-row">
              <b>${g.cumulativeActual2025Tn} ${s.trillion}</b>
              <span>/ ${g.cumulativeTarget2030Tn} ${s.trillion}</span>
            </div>
            ${progress(g.cumulativeActual2025Tn, g.cumulativeTarget2030Tn)}
          </div>
          <p class="score-note">${ar ? g.noteAr : g.note}</p>
        </article>

        <article class="score-card" data-open="fdi">
          <div class="score-head">
            <div class="ep-k">FDI · ${f.method}</div>
            <button type="button" class="score-open" data-go="fdi">${s.openFdi} ›</button>
          </div>
          <div class="score-name">${ar ? f.nameAr : f.name}</div>
          <div class="ep-hero">${num(f.netQ1)}<span class="unit">${s.sarBn}</span></div>
          <div class="score-tag">${s.netFdi} · Q1</div>
          <dl class="score-meta">
            <div><dt>${s.inflow}</dt><dd>${num(f.inflowQ1)}</dd></div>
            <div><dt>${s.outflow}</dt><dd>${num(f.outflowQ1)}</dd></div>
            <div><dt>${s.eaForecast} Q1</dt><dd>${num(f.q1ForecastLow)}-${num(f.q1ForecastHigh)}</dd></div>
            <div><dt>${s.h1Forecast}</dt><dd>${num(f.h1Forecast)}</dd></div>
          </dl>
          <div class="score-cum">
            <div class="lab">${s.cumulative2030}</div>
            <div class="cum-row">
              <b>${num(f.cumulativeActual2025Bn, 0)} ${s.sarBn}</b>
              <span>/ ${f.cumulativeTarget2030Tn} ${s.trillion}</span>
            </div>
            ${progress(f.cumulativeActual2025Bn, f.cumulativeTarget2030Tn * 1000)}
          </div>
          <p class="score-note">${ar ? f.noteAr : f.note}</p>
        </article>
      </div>

      <div class="ep-k" style="margin-top:22px">${s.leadingTitle}</div>
      <p class="ep-sub" style="margin-top:4px">${s.leadingSub}</p>
      <div class="lead-grid" data-leads></div>

      <div class="ep-actions" style="margin-top:18px">
        <button class="btn-primary" type="button" data-fdi>${s.openFdi} · ${s.dqafPath}</button>
        <button class="btn-ghost" type="button" data-gfcf>${s.openGfcf} · ${s.dqafPath}</button>
        <button class="btn-ghost" type="button" data-pack>${s.pack}</button>
      </div>
    </div>`;

  const leads = $('[data-leads]', panel);
  for (const L of LEADING) {
    const imp = L.impact === 'positive' ? 'pos' : L.impact === 'negative' ? 'neg' : 'watch';
    const label = L.impact === 'positive' ? s.impactPos : L.impact === 'negative' ? s.impactNeg : s.statusWatch;
    leads.appendChild(el(`<article class="lead-card ${imp}">
      <div class="lead-top">
        <span class="lead-imp">${label}</span>
        ${spark(L.series)}
      </div>
      <div class="lead-name">${ar ? L.nameAr : L.name}</div>
      <div class="lead-val">${L.latest}<span>${L.delta}</span></div>
      <div class="lead-src">${L.source} · ${L.freq} · ${L.period}</div>
    </article>`));
  }

  for (const b of panel.querySelectorAll('[data-go], [data-fdi], [data-gfcf]')) {
    b.onclick = () => navigate([b.dataset.go || (b.hasAttribute('data-fdi') ? 'fdi' : 'gfcf')]);
  }
  $('[data-pack]', panel).onclick = () => window.print();
}
