import { C } from '../config.js';
/** Single series sparkline. */
export function sparkline(values, { width = 320, height = 44, colour = C.g600, label = 'Trend' } = {}) {
  const min = Math.min(...values), max = Math.max(...values), span = (max - min) || 1;
  const X = i => (i / (values.length - 1)) * (width - 10) + 5;
  const Y = v => height - 6 - ((v - min) / span) * (height - 14);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  const lx = X(values.length - 1), ly = Y(values.at(-1));
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img"
    aria-label="${label}, last ${values.length} periods">
    <path d="${d}" fill="none" stroke="${colour}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4" fill="${colour}" stroke="#fff" stroke-width="2"/>
  </svg>`;
}
