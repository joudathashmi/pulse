import { C, SERIES } from '../config.js';
import { num } from '../lib/format.js';
import { tableScroll } from '../lib/dom.js';
import { bindCrosshair } from '../lib/crosshair.js';

/**
 * Two series. Colour alone is not the identity channel: the estimate is dashed and the
 * official print solid, both carry direct end-labels, and the legend states the line style.
 * Crosshair + tooltip per interaction spec. A table view lives beside it in the view.
 */
export function renderNowcast(host, tableHost, data) {
  const W = 900, H = 330, ml = 54, mr = 120, mt = 18, mb = 42;
  const N = data.path, official = data.official;
  const all = N.flatMap(p => [p.lo, p.hi]).concat([official]);
  const min = Math.floor(Math.min(...all) - 2), max = Math.ceil(Math.max(...all) + 2);
  const X = w => ml + (w / 19) * (W - ml - mr);
  const Y = v => H - mb - ((v - min) / (max - min)) * (H - mt - mb);

  const band = N.map(p => `${X(p.w).toFixed(1)},${Y(p.hi).toFixed(1)}`).join(' ') + ' ' +
               N.slice().reverse().map(p => `${X(p.w).toFixed(1)},${Y(p.lo).toFixed(1)}`).join(' ');
  const line = N.map((p, i) => `${i ? 'L' : 'M'}${X(p.w).toFixed(1)} ${Y(p.est).toFixed(1)}`).join(' ');

  let grid = '';
  const step = Math.max(2, Math.round((max - min) / 5));
  for (let v = min; v <= max; v += step) {
    grid += `<line x1="${ml}" y1="${Y(v)}" x2="${W - mr}" y2="${Y(v)}" stroke="${C.hair}" stroke-width="1"/>
      <text x="${ml - 10}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="${C.faint}">${v}</text>`;
  }
  let xlabels = '';
  for (const w of [0, 4, 8, 13, 19]) {
    const label = w === 13 ? 'Quarter end' : w === 19 ? 'Official print' : `Week ${w}`;
    xlabels += `<text x="${X(w)}" y="${H - 18}" text-anchor="middle" font-size="11" fill="${C.faint}">${label}</text>`;
  }
  const slot = (W - ml - mr) / 19;
  const hits = N.map(p => `<rect x="${X(p.w) - slot / 2}" y="${mt}" width="${slot}" height="${H - mt - mb}"
    fill="transparent" data-w="${p.w}" data-e="${p.est}" data-l="${p.lo}" data-h="${p.hi}"/>`).join('');

  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img"
    aria-label="Synthetic populated nowcast estimate with confidence band against a demo official print">
    <polygon points="${band}" fill="${SERIES.estimate}" opacity="0.10"/>
    ${grid}
    <line x1="${X(13)}" y1="${mt}" x2="${X(13)}" y2="${H - mb}" stroke="${C.line}" stroke-width="1"/>
    <path d="${line}" fill="none" stroke="${SERIES.estimate}" stroke-width="2" stroke-dasharray="7 5" stroke-linecap="round"/>
    <line x1="${X(13)}" y1="${Y(official)}" x2="${X(19)}" y2="${Y(official)}" stroke="${SERIES.official}" stroke-width="2"/>
    <circle cx="${X(19)}" cy="${Y(official)}" r="5" fill="${SERIES.official}" stroke="#fff" stroke-width="2"/>
    <circle cx="${X(13)}" cy="${Y(N[13].est)}" r="5" fill="${SERIES.estimate}" stroke="#fff" stroke-width="2"/>
    <text x="${X(13) + 10}" y="${Y(N[13].est) - 12}" font-size="12" font-weight="600" fill="${C.ink}">Synthetic ${num(N[13].est)}</text>
    <text x="${X(19) + 10}" y="${Y(official) + 5}" font-size="12" font-weight="600" fill="${C.ink}">Official ${num(official)}</text>
    ${xlabels}<g data-hits>${hits}</g>
  </svg>`;

  const svg = host.querySelector('svg');
  bindCrosshair(svg, {
    plot: { x0: ml, y0: mt, x1: W - mr, y1: H - mb },
    points: [
      ...N.map(p => ({
        x: X(p.w),
        y: Y(p.est),
        tip: `<b>Week ${p.w} of the quarter</b>Estimate ${num(p.est)} SAR bn<br>Band ${num(p.lo)} to ${num(p.hi)}`
      })),
      {
        x: X(19),
        y: Y(official),
        tip: `<b>Official print</b>${num(official)} SAR bn · six weeks after quarter end`
      }
    ]
  });

  tableHost.innerHTML = tableScroll(`<table class="wh-table is-static" style="margin-top:8px">
    <thead><tr><th>Week</th><th>Estimate</th><th>Lower</th><th>Upper</th></tr></thead><tbody>
    ${N.map(p => `<tr><td class="num">${p.w}</td><td class="num">${num(p.est)}</td><td class="num">${num(p.lo)}</td><td class="num">${num(p.hi)}</td></tr>`).join('')}
    <tr><td>Official print (synthetic demo)</td><td class="num" colspan="3">${num(official)} SAR bn, six weeks after quarter end · populated, not a MISA figure</td></tr>
    </tbody></table>`);
}
