export const num = (n, d = 1) =>
  Number(n).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = (n, d = 0) => `${num(n, d)}%`;
