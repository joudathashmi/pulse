import { STATUS } from '../config.js';
import { t } from '../i18n.js';

/** DEC-10: status is never colour alone - icon + word always. */
export const statusChip = (key) => {
  const s = STATUS[key] || STATUS.watch;
  const labels = t();
  const label =
    key === 'ok' ? labels.statusOk :
    key === 'risk' ? labels.statusRisk :
    labels.statusWatch;
  return `<span class="st ${s.cls}" role="status"><span class="ic" aria-hidden="true">${s.icon}</span><span class="st-label">${label}</span></span>`;
};

export const statusColour = (key, C) => key === 'ok' ? C.g600 : key === 'watch' ? C.amber : C.clay;

/** DEC-12 parent certification chip. */
export const certChip = (complete) => {
  const s = t();
  if (complete) {
    return `<span class="st ok" role="status"><span class="ic" aria-hidden="true">✓</span><span class="st-label">${s.certComplete}</span></span>`;
  }
  return `<span class="st watch" role="status"><span class="ic" aria-hidden="true">!</span><span class="st-label">${s.certIncomplete}</span></span>`;
};
