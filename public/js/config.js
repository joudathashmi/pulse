/** Brand + status tokens available to JS (CSS owns the rest - see styles/tokens.css). */
export const C = {
  g900:'#0D3D2E', g800:'#0D3D2E', g700:'#1F4D3A', g600:'#16845B', lime:'#7BD3A8',
  clay:'#B4543E', amber:'#B8860B', neutral:'#5A6B64',
  line:'#D5DDD8', hair:'#D5DDD8', tint:'#E8F2EC', mut:'#5A6B64', faint:'#3D4A44', ink:'#14201C',
  statusOk:'#02714E', statusWatch:'#B8860B', statusAlert:'#C62828'
};

/**
 * Two-series chart palette. Validated with the dataviz palette checker:
 * lightness / chroma / normal-vision / contrast all PASS; CVD separation sits in the
 * 6–8 floor band, which is legal ONLY with secondary encoding - hence the dashed vs
 * solid line styles and the direct end-labels in charts/nowcast.js. Do not swap these
 * for two greens without re-running the validator.
 */
export const SERIES = { estimate: C.g600, official: C.clay };

/** Status palette is reserved. Never reuse for a data series. Always paired with icon + label. */
export const STATUS = {
  ok:    { cls:'ok',    icon:'✓', label:'On track' },
  watch: { cls:'watch', icon:'!', label:'Watch' },
  risk:  { cls:'risk',  icon:'▲', label:'Alert' }
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatStamp(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function nowStamp() {
  return formatStamp(new Date());
}

export const STAMP = nowStamp();

/** Tab ids only - labels come from i18n (DEC-08). */
export const TAB_IDS = ['pulse', 'fdi', 'drill', 'now', 'alerts', 'qual', 'intake', 'fsa', 'inv', 'about'];
export const FLOAT_PRIMARY = ['pulse', 'fdi', 'alerts'];
export const FLOAT_MORE = TAB_IDS.filter(id => !FLOAT_PRIMARY.includes(id));
