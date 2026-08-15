/**
 * Live intake - World Bank API + published MISA / Invest Saudi sources.
 * Served at /api/intake/* so the browser never talks to third parties directly.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { INVEST_SAUDI_API, normalizeInvestSaudi } from './fdi-geo.mjs';

const WORLD_PATH = fileURLToPath(new URL('./public/data/world-110m.json', import.meta.url));

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

async function getJson(url) {
  const r = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'InvestmentPulse/0.1 (Ministry of Investment prototype)' }
  });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}

function wbSeries(payload, code) {
  const rows = Array.isArray(payload) ? payload[1] : [];
  return (rows || [])
    .filter(r => r && r.value != null)
    .map(r => ({
      year: r.date,
      value: r.value,
      indicator: r.indicator?.value || code,
      country: r.country?.value || 'Saudi Arabia',
      source: 'World Bank Open Data API',
      url: `https://api.worldbank.org/v2/country/SAU/indicator/${code}?format=json`
    }));
}

function extractMisa(html) {
  const titles = [];
  const re = /<(h[1-4]|a)[^>]*>([^<]{16,160})<\/\1>/gi;
  let m;
  while ((m = re.exec(html)) && titles.length < 8) {
    const t = m[2].replace(/\s+/g, ' ').trim();
    if (/ministry|investment|استثمار|وزارة/i.test(t)) titles.push(t);
  }
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i);
  const issues = [];
  if (titles.length < 3) {
    issues.push('Few headlines extracted from misa.gov.sa. The page structure may have changed, or Arabic markup was skipped. A steward must confirm the scrape selectors before this feed is trusted.');
  }
  issues.push('og:title and on-page headlines are dissemination copy, not a statistical series. They cannot enter the certified store.');
  return {
    source: 'https://misa.gov.sa/',
    pulledAt: new Date().toISOString(),
    pageTitle: og ? og[1] : 'Ministry of Investment',
    headlines: titles.slice(0, 5),
    issues
  };
}

export async function handleIntakeApi(path, res) {
  try {
    if (path === '/api/intake/worldbank') {
      const [fdi, gfcf] = await Promise.all([
        getJson('https://api.worldbank.org/v2/country/SAU/indicator/BX.KLT.DINV.CD.WD?format=json&per_page=12'),
        getJson('https://api.worldbank.org/v2/country/SAU/indicator/NE.GDI.FTOT.CD?format=json&per_page=12')
      ]);
      send(res, 200, {
        pulledAt: new Date().toISOString(),
        connector: 'World Bank Indicators API v2',
        license: 'CC BY 4.0',
        fdi: wbSeries(fdi, 'BX.KLT.DINV.CD.WD'),
        gfcf: wbSeries(gfcf, 'NE.GDI.FTOT.CD')
      });
      return true;
    }
    if (path === '/api/intake/misa') {
      const r = await fetch('https://misa.gov.sa/', {
        headers: { 'User-Agent': 'InvestmentPulse/0.1 (Ministry of Investment prototype)', Accept: 'text/html' }
      });
      if (!r.ok) throw new Error(`misa.gov.sa → ${r.status}`);
      const html = await r.text();
      send(res, 200, extractMisa(html));
      return true;
    }
    if (path === '/api/intake/investsaudi') {
      const [page, worldRaw] = await Promise.all([
        getJson(INVEST_SAUDI_API),
        readFile(WORLD_PATH, 'utf8')
      ]);
      send(res, 200, normalizeInvestSaudi(page, JSON.parse(worldRaw)));
      return true;
    }
    send(res, 404, { error: 'Unknown intake route' });
    return true;
  } catch (err) {
    send(res, 502, { error: String(err.message || err), steward: 'Human verification required - connector failed.' });
    return true;
  }
}
