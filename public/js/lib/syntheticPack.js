/**
 * Comparison prints used on Intake and the control ledger.
 * Not MISA calculations. Public connector values stay unmasked.
 */
export const SYNTHETIC_PACK = {
  fdi: 21.4,
  gfcf: 340,
  note: 'Synthetic pack print for this public host. Not a MISA figure.'
};

const MASKS = [
  [/\b23\.1\b/g, '21.4'],
  [/\b26\.6\b/g, '24.8'],
  [/\b3\.5\b/g, '3.4'],
  [/\b358\b/g, '340'],
  [/\b348\b/g, '318'],
  [/\b39\.21\b/g, '24.6'],
  [/\b39\.2\b/g, '24.6'],
  [/\b672\.26\b/g, '619'],
  [/\b672\.3\b/g, '619'],
  [/\b349\.04\b/g, '312'],
  [/\b370\.28\b/g, '328'],
  [/\b719\.32\b/g, '640'],
  [/\b1,?391\.58\b/g, '1259'],
  [/\b1,391\.6\b/g, '1259'],
  [/\b61\.8\b/g, '58.4'],
  [/\b0\.68\b/g, '0.61'],
  [/\b3,119\b/g, '2,840'],
  [/\b3119\b/g, '2840'],
  [/22-24\.5/g, '20-23'],
  [/Economic Affairs overlay/gi, 'synthetic pack print'],
  [/EA forecast/gi, 'synthetic forecast']
];

export function maskMisaText(value) {
  let out = String(value ?? '');
  for (const [re, to] of MASKS) out = out.replace(re, to);
  return out;
}

function maskPulse(value) {
  const n = Number(value);
  if (n === 23.1) return SYNTHETIC_PACK.fdi;
  if (n === 358 || n === 348) return SYNTHETIC_PACK.gfcf;
  return value;
}

export function maskCase(row) {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    title: maskMisaText(row.title),
    reason: maskMisaText(row.reason),
    pulseValue: maskPulse(row.pulseValue),
    pulledValue: row.pulledValue,
    fix: row.fix
      ? { ...row.fix, note: maskMisaText(row.fix.note), mapping: maskMisaText(row.fix.mapping), evidence: maskMisaText(row.fix.evidence), proposed: maskMisaText(row.fix.proposed) }
      : row.fix,
    tick: row.tick ? { ...row.tick, note: maskMisaText(row.tick.note) } : row.tick
  };
}

export function maskCases(rows = []) {
  return rows.map(maskCase);
}
