import { C } from '../config.js';
/** Single series sparkline. Optional dashed target is a value on the same scale. */
export function sparkline(values, {
  width = 320,
  height = 44,
  colour = C.g600,
  label = 'Trend',
  target = null
} = {}) {
  const nums = (values || []).map(Number).filter(Number.isFinite);
  if (nums.length < 2) return '';
  const lo = Math.min(...nums, target == null ? Infinity : Number(target));
  const hi = Math.max(...nums, target == null ? -Infinity : Number(target));
  const span = (hi - lo) || 1;
  const X = i => (i / (nums.length - 1)) * (width - 10) + 5;
  const Y = v => height - 6 - ((v - lo) / span) * (height - 14);
  const d = nums.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  const lx = X(nums.length - 1);
  const ly = Y(nums.at(-1));
  const tgt = Number.isFinite(Number(target))
    ? `<line x1="5" x2="${width - 5}" y1="${Y(Number(target)).toFixed(1)}" y2="${Y(Number(target)).toFixed(1)}" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" opacity="0.45"/>`
    : '';
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img"
    aria-label="${label}, last ${nums.length} periods">
    ${tgt}
    <path d="${d}" fill="none" stroke="${colour}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4" fill="${colour}" stroke="#fff" stroke-width="2"/>
  </svg>`;
}
