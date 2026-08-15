import { C } from '../config.js';
import { num } from '../lib/format.js';
import { tableScroll } from '../lib/dom.js';
import { bindCrosshair } from '../lib/crosshair.js';

/** Single series columns. ≤24px thick, 4px rounded cap, square at the baseline. */
export function renderBacktest(host, tableHost, rows) {
  const W = 560, H = 190, ml = 40, mr = 14, mt = 14, mb = 34;
  const max = Math.max(...rows.map(r => r.err)) * 1.25;
  const slot = (W - ml - mr) / rows.length;
  const bw = Math.min(24, slot - 14);
  let bars = '', labels = '';
  rows.forEach((r, i) => {
    const x = ml + i * slot + (slot - bw) / 2;
    const h = (r.err / max) * (H - mt - mb), y = H - mb - h;
    bars += `<path d="M${x} ${H - mb} L${x} ${y + 4} Q${x} ${y} ${x + 4} ${y}
      L${x + bw - 4} ${y} Q${x + bw} ${y} ${x + bw} ${y + 4} L${x + bw} ${H - mb} Z"
      fill="${C.g600}" data-p="${r.p}" data-e="${r.err}" data-es="${r.est}" data-a="${r.act}"/>`;
    labels += `<text x="${x + bw / 2}" y="${H - 18}" text-anchor="middle" font-size="10.5" fill="${C.faint}">${r.p.slice(2)}</text>`;
  });
  const mae = rows.reduce((a, b) => a + b.err, 0) / rows.length;
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img"
      aria-label="Absolute forecast error by quarter, per cent">
    <line x1="${ml}" y1="${H - mb}" x2="${W - mr}" y2="${H - mb}" stroke="${C.line}" stroke-width="1"/>
    <text x="${ml - 8}" y="${mt + 10}" text-anchor="end" font-size="11" fill="${C.faint}">${num(max, 0)}%</text>
    <text x="${ml - 8}" y="${H - mb + 4}" text-anchor="end" font-size="11" fill="${C.faint}">0</text>
    ${bars}${labels}</svg>
    <div class="wh-est" style="margin-top:6px">Mean absolute error
      <b>${num(mae)}%</b> over ${rows.length} quarters</div>`;
  const svg = host.querySelector('svg');
  bindCrosshair(svg, {
    plot: { x0: ml, y0: mt, x1: W - mr, y1: H - mb },
    points: rows.map((r, i) => {
      const x = ml + i * slot + slot / 2;
      const h = (r.err / max) * (H - mt - mb);
      return {
        x,
        y: H - mb - h,
        tip: `<b>${r.p}</b>Estimate ${r.est} · official ${r.act}<br>Error ${r.err}%`
      };
    })
  });
  tableHost.innerHTML = tableScroll(`<table class="wh-table is-static" style="margin-top:8px">
    <thead><tr><th>Quarter</th><th>Estimate</th><th>Official</th><th>Error</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${r.p}</td><td class="num">${num(r.est)}</td><td class="num">${num(r.act)}</td><td class="num">${num(r.err)}%</td></tr>`).join('')}
    </tbody></table>`);
}
