/**
 * Data access layer. Today these read static JSON from /data.
 * When the platform exists, swap the bodies for fetches against the metric API -
 * nothing else in the application needs to change.
 *
 * brief.json is the organisational performance pack (fortnightly brief) transcribed
 * for Wave 1. Refresh with: npm run ingest:brief -- "/path/to/pack.pdf"
 */
const get = async (path) => {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
};

export const loadInventory = () => get('./data/inventory.json');
export const loadSeries    = () => get('./data/series.json');
export const loadNowcast   = () => get('./data/nowcast.json');
export const loadBacktest  = () => get('./data/backtest.json');
export const loadBrief     = () => get('./data/brief.json');
export const loadFdiHistory = () => get('./data/fdi-history.json');
export const loadFdiCut = () => get('./data/fdi-investsaudi.json');
export const loadIndicators2026 = () => get('./data/indicators-2026.json');

export async function pullFdiInvestSaudi() {
  const res = await fetch('/api/intake/investsaudi', { cache: 'no-store' });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Invest Saudi connector failed');
  return body;
}

export async function loadAll() {
  const [inventory, series, nowcast, backtest, brief, fdiHistory, fdiCut, indicators2026] = await Promise.all([
    loadInventory(), loadSeries(), loadNowcast(), loadBacktest(), loadBrief(), loadFdiHistory(), loadFdiCut(), loadIndicators2026()
  ]);
  // Keep series.cur aligned to pack headlines (Pulse live values).
  if (brief?.headlines) {
    series.cur = {
      ...series.cur,
      fdi: brief.headlines.fdi.pulseValue,
      gfcf: brief.headlines.gfcf.pulseValue
    };
  }
  const backtestRows = Array.isArray(backtest) ? backtest : (backtest?.rows || []);
  return { inventory, series, nowcast, backtest: backtestRows, brief, fdiHistory, fdiCut, indicators2026 };
}
