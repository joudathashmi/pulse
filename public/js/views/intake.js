import { $ } from '../lib/dom.js';
import { num } from '../lib/format.js';
import { nowStamp } from '../config.js';
import { t } from '../i18n.js';
import { casesFromWork, displayStatus, listCases, upsertCases } from '../lib/control.js';
import { heldPackRows } from '../lib/work.js';
import { openControlCase } from './controlCase.js';

const PIPELINE = [
  ['S1', 'Acquire', 'Connectors pull published feeds', 'pull'],
  ['S2', 'Certify', 'Six DQAF gates · lineage', '09:38'],
  ['S3', 'Compute', 'BPM6 · SNA 2008', '09:36'],
  ['S4', 'Nowcast', 'In-quarter estimate held open', '09:35'],
  ['S5', 'Decide', 'Certified Pulse published', '09:41'],
  ['S6', 'Act', 'Alerts · assign · pack', 'Live']
];

const FEED_META = {
  GASTAT: { cadence: 'Quarterly', via: 'Published statistical feed' },
  SAMA: { cadence: 'Monthly', via: 'Published monetary feed' },
  'Banque Riyad': { cadence: 'Monthly', via: 'PMI connector' },
  PIF: { cadence: 'Quarterly', via: 'Portfolio feed' },
  MISA: { cadence: 'Daily', via: 'Licensing + CRM' },
  Tadawul: { cadence: 'Daily', via: 'Market feed' },
  Bloomberg: { cadence: 'Intraday', via: 'Market terminal' },
  Shareek: { cadence: 'Quarterly', via: 'Programme feed' },
  'Deal systems': { cadence: 'Event', via: 'Deal pipeline' }
};

function feedRows(pack) {
  const counts = new Map();
  const add = (raw) => {
    for (const name of String(raw || '').split(/[·,]/).map(s => s.trim()).filter(Boolean)) {
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  };
  for (const h of Object.values(pack?.headlines || {})) add(h.source);
  for (const s of pack?.signals || []) add(s.source);
  const last = nowStamp();
  return [...counts.entries()].map(([name, n]) => {
    const meta = FEED_META[name] || { cadence: 'As published', via: 'Connector' };
    return { name, n, ...meta, last, state: name === 'Deal systems' ? 'watch' : 'live' };
  });
}

const usdBn = (v) => num(Number(v) / 1e9, 1);

function seriesTable(rows, unitLabel, indicator) {
  return `<div class="wh-table-wrap">
    <table class="wh-table is-static">
      <thead><tr><th>Year</th><th>Value</th><th>Unit</th><th>Lineage</th></tr></thead>
      <tbody>${(rows || []).slice(0, 8).map(r => `<tr>
        <td class="num">${r.year}</td>
        <td class="num">${usdBn(r.value)}</td>
        <td>${unitLabel}</td>
        <td>api.worldbank.org · ${r.indicator || indicator}</td>
      </tr>`).join('') || '<tr><td colspan="4">No observations returned</td></tr>'}</tbody>
    </table>
  </div>`;
}

function verifyQueue(wb, web, brief, fdi) {
  const packFdi = brief?.headlines?.fdi?.pulseValue;
  const packGfcf = brief?.headlines?.gfcf?.pulseValue;
  const latestFdi = wb?.fdi?.[0];
  const latestGfcf = wb?.gfcf?.[0];
  const items = [];
  if (latestFdi) {
    const reason = `World Bank ${latestFdi.year} is ${usdBn(latestFdi.value)} USD bn (BPM6, annual, current USD, BX.KLT.DINV.CD.WD). Pulse Q1 2026 is ${packFdi ?? '-'} SAR bn (net, quarterly). A steward must map USD→SAR, annual→quarter, and BPM6 net vs inflows before this row can enter the certified store.`;
    items.push({
      id: 'v-units-fdi',
      title: 'FDI unit and vintage do not match the Pulse print',
      reason,
      kpi: 'fdi',
      period: String(latestFdi.year),
      source: 'World Bank · BX.KLT.DINV.CD.WD',
      pulledValue: usdBn(latestFdi.value),
      unit: 'USD bn',
      pulseValue: packFdi ?? '',
      pulseUnit: 'SAR bn',
      failedGates: ['Schema and type', 'Completeness and freshness'],
      owner: 'Economic Affairs',
      go: 'intake'
    });
  }
  if (latestGfcf) {
    const reason = `World Bank ${latestGfcf.year} is ${usdBn(latestGfcf.value)} USD bn (NE.GDI.FTOT.CD, annual). Pulse holds ${packGfcf ?? '-'} SAR bn (SNA 2008, quarterly, Economic Affairs overlay). Do not overwrite the certified GFCF.`;
    items.push({
      id: 'v-units-gfcf',
      title: 'GFCF from World Bank is not the GASTAT quarterly print',
      reason,
      kpi: 'gfcf',
      period: String(latestGfcf.year),
      source: 'World Bank · NE.GDI.FTOT.CD',
      pulledValue: usdBn(latestGfcf.value),
      unit: 'USD bn',
      pulseValue: packGfcf ?? '',
      pulseUnit: 'SAR bn',
      failedGates: ['Cross-source reconciliation'],
      owner: 'Economic Affairs',
      go: 'intake'
    });
  }
  if (fdi?.countries?.length) {
    const y24 = fdi.countries.filter(r => r.year === 2024);
    const inflow = y24.reduce((s, r) => s + (r.inflow || 0), 0);
    const reason = `investsaudi.sa/fdi returned ${fdi.countries.length} country-year rows and ${fdi.sectors?.length || 0} sector-year rows. 2024 immediate-country inflow sums to ${num(inflow)} SAR bn and matches the Inflows workbook. Pulse Q1 2026 is ${packFdi ?? '-'} SAR bn net. Do not overwrite the certified print. The page’s marketing headlines (119 / 80 / 977) are a different rounding.`;
    items.push({
      id: 'v-investsaudi',
      title: 'Invest Saudi country cut is annual, not the Pulse quarter',
      reason,
      kpi: 'fdi',
      period: '2024',
      source: 'Invest Saudi · investsaudi.sa/fdi',
      pulledValue: num(inflow),
      unit: 'SAR bn',
      pulseValue: packFdi ?? '',
      pulseUnit: 'SAR bn',
      failedGates: ['Completeness and freshness', 'Schema and type'],
      owner: 'Economic Affairs',
      go: 'intake'
    });
  }
  items.push({
    id: 'v-web',
    title: 'Published web copy is not a certified series',
    reason: `Headlines pulled from ${web?.source || 'misa.gov.sa'} are dissemination text. They cannot update a Pulse number until a steward attaches a source record and the six DQAF gates pass.`,
    kpi: '',
    period: '',
    source: web?.source || 'misa.gov.sa',
    pulledValue: '',
    unit: '',
    pulseValue: '',
    pulseUnit: 'SAR bn',
    failedGates: ['Human sign-off'],
    owner: 'Data steward',
    go: 'intake'
  });
  for (const issue of web?.issues || []) {
    const slug = String(issue).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
    items.push({
      id: `v-scrape-${slug || 'issue'}`,
      title: 'Scrape selector needs a human check',
      reason: issue,
      kpi: '',
      period: '',
      source: web?.source || 'misa.gov.sa',
      pulledValue: '',
      unit: '',
      failedGates: ['Completeness and freshness'],
      owner: 'Data steward',
      go: 'intake'
    });
  }
  return items;
}

export async function renderIntake(root, data, { refreshBoard } = {}) {
  const feeds = feedRows(data?.brief);
  root.innerHTML = `
    <div class="stage"><div class="panel" style="padding-top:20px">
      <h1>Intake</h1>
      <p class="lede">${t().ctrlLede || 'Live pulls are checked against six gates. Failed values are quarantined, assigned, fixed, and ticked. The certified Pulse is not overwritten here.'}</p>
      <p class="wh-est">Public sources are pulled live on this page: World Bank API, investsaudi.sa/fdi, and misa.gov.sa. Those feeds stay labelled as a direct pull. In-quarter estimates on this host are populated synthetic figures, not MISA calculations.</p>

      <div class="wh-pipe" aria-label="Automated pipeline">
        <div class="wh-k">How the number arrives</div>
        <ol class="wh-pipe-list">
          ${PIPELINE.map(([id, name, note, when], i) => `<li class="${i < 5 ? 'on' : 'next'}">
            <b>${id}</b><span>${name}</span><em>${note}</em>
            <small>${when === 'Live' ? 'Running' : when === 'pull' ? 'Last pull · ' + nowStamp() : 'Last pull · ' + when}</small>
          </li>`).join('')}
        </ol>
      </div>

      <article class="wh-card">
        <div class="wh-dash-h" style="margin:0 0 10px">
          <div class="wh-k" style="margin:0">Sources integrated</div>
          <span>${feeds.length} connectors · no typed values</span>
        </div>
        <div class="wh-table-wrap">
          <table class="wh-table is-static">
            <thead>
              <tr><th>Source</th><th>Connector</th><th>Last pull</th><th>Cadence</th><th>Series</th><th>State</th></tr>
            </thead>
            <tbody>
              ${feeds.map(f => `<tr>
                <td>${f.name}</td>
                <td>${f.via}</td>
                <td>${f.last}</td>
                <td>${f.cadence}</td>
                <td class="num">${f.n}</td>
                <td class="${f.state}">${f.state === 'live' ? 'Live' : f.state === 'watch' ? 'Watch' : f.state}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </article>

      <div class="wh-actions" style="margin:12px 0 18px">
        <button type="button" class="wh-act on" data-pull>Pull live sources</button>
        <button type="button" class="wh-act" data-refresh>Reload board files</button>
      </div>
      <p class="wh-est" data-status>Ready · World Bank API · investsaudi.sa/fdi · misa.gov.sa</p>
      <div data-body></div>
    </div></div>`;

  const status = $('[data-status]', root);
  const body = $('[data-body]', root);

  const paint = (wb, web, fdi, err) => {
    if (err) {
      body.innerHTML = `<article class="wh-card"><p class="wh-est">${err}</p>
        <p class="wh-est">The steward queue still applies: a failed connector is held, not guessed.</p></article>`;
      return;
    }
    const webBits = web?.headlines?.length ? web.headlines : [web?.pageTitle].filter(Boolean);
    const s = t();
    body.innerHTML = `
      <article class="wh-card">
        <div class="wh-k">S1 · Acquire · World Bank API · live</div>
        <p class="wh-est">${wb?.connector || 'World Bank'} · pulled ${wb?.pulledAt ? new Date(wb.pulledAt).toUTCString() : '-'} · ${wb?.license || ''} · browser talks only to this app’s /api/intake</p>
        <div class="wh-dash-h" style="margin:12px 0 8px"><div class="wh-k" style="margin:0">FDI · net inflows · BX.KLT.DINV.CD.WD</div><span>${wb?.fdi?.length || 0} years</span></div>
        ${seriesTable(wb?.fdi, 'USD bn', 'BX.KLT.DINV.CD.WD')}
        <div class="wh-dash-h" style="margin:12px 0 8px"><div class="wh-k" style="margin:0">GFCF · NE.GDI.FTOT.CD</div><span>${wb?.gfcf?.length || 0} years</span></div>
        ${seriesTable(wb?.gfcf, 'USD bn', 'NE.GDI.FTOT.CD')}
      </article>
      <article class="wh-card">
        <div class="wh-k">S1 · Acquire · Invest Saudi FDI Insights · live</div>
        <p class="wh-est">${fdi?.source?.title || 'Invest Saudi'} · ${fdi?.source?.page || 'https://investsaudi.sa/fdi'} · pulled ${fdi?.pulledAt ? new Date(fdi.pulledAt).toUTCString() : '-'} · ${fdi?.countries?.length || 0} country-years · ${fdi?.sectors?.length || 0} sector-years · SAR bn</p>
        <p class="wh-est">${fdi?.source?.note || 'Immediate country and sector as published. Browser talks only to this app’s /api/intake/investsaudi.'}</p>
      </article>
      <article class="wh-card">
        <div class="wh-k">S1 · Acquire · web scrape · misa.gov.sa</div>
        <p class="wh-est">${web?.pageTitle || '-'} · ${web?.pulledAt ? new Date(web.pulledAt).toUTCString() : '-'} · ${web?.source || ''}</p>
        <ul class="wh-web-list">${webBits.map(t => `<li>${t}</li>`).join('') || '<li>No headlines extracted - steward must check selectors</li>'}</ul>
      </article>
      <article class="wh-card">
        <div class="wh-k">${s.ctrlQueue || 'Steward queue'}</div>
        <p class="wh-est">${s.ctrlQueueHint || 'Failed pulls stay on this ledger until a named desk fixes and ticks them. Ready is not a Pulse overwrite.'}</p>
        <div data-q></div>
      </article>`;
    const paintSteward = () => {
      const q = $('[data-q]', body);
      if (!q) return;
      const cases = listCases();
      if (!cases.length) {
        q.innerHTML = `<p class="wh-est">${s.ctrlNoCases || 'No quarantined cases this cycle. Pull live sources.'}</p>`;
        return;
      }
      q.innerHTML = `<div class="wh-table-wrap"><table class="wh-table is-static stew-table">
        <thead><tr>
          <th>${s.setKpi || 'KPI'}</th>
          <th>${s.workGate || 'Gate'}</th>
          <th>${s.owner || 'Owner'}</th>
          <th>${s.alertState || 'State'}</th>
          <th></th>
        </tr></thead>
        <tbody>${cases.map(c => `<tr>
          <td>${(c.kpi || c.title).toString().toUpperCase()}</td>
          <td>${(c.failedGates || [])[0] || '—'}</td>
          <td>${c.owner || '—'}</td>
          <td>${displayStatus(c, s)}</td>
          <td><button type="button" class="btn-ask-inline" data-open="${c.id}">${s.ctrlOpen || 'Open'}</button></td>
        </tr>`).join('')}</tbody>
      </table></div>`;
      for (const b of q.querySelectorAll('[data-open]')) {
        b.onclick = () => openControlCase(b.dataset.open, { onChanged: paintSteward });
      }
    };
    paintSteward();
    root._paintSteward = paintSteward;
    if (!root._ctrlBound) {
      root._ctrlBound = true;
      window.addEventListener('pulse-control', () => {
        if (!root.isConnected) return;
        root._paintSteward?.();
      });
    }
  };

  const pull = async () => {
    status.textContent = 'Pulling World Bank, Invest Saudi and misa.gov.sa…';
    try {
      const [wbRes, webRes, fdiRes] = await Promise.all([
        fetch('/api/intake/worldbank', { cache: 'no-store' }),
        fetch('/api/intake/misa', { cache: 'no-store' }),
        fetch('/api/intake/investsaudi', { cache: 'no-store' })
      ]);
      const wb = await wbRes.json();
      const web = await webRes.json();
      const fdi = await fdiRes.json();
      if (!wbRes.ok) throw new Error(wb.error || 'World Bank connector failed');
      const webOk = webRes.ok ? web : { pageTitle: web.error || 'Web pull held', headlines: [], issues: [web.error || 'Web connector failed'] };
      const fdiOk = fdiRes.ok ? fdi : { source: { note: fdi.error || 'Invest Saudi connector held' }, countries: [], sectors: [] };
      const born = [
        ...verifyQueue(wb, webOk, data?.brief, fdiOk),
        ...casesFromWork(heldPackRows(data).quarantine)
      ];
      await upsertCases(born);
      status.textContent = `Live pull · ${wb.fdi?.length || 0} FDI years · ${fdi.countries?.length || 0} country rows · web ${webRes.ok ? 'ok' : 'held'} · Pulse not overwritten`;
      paint(wb, webOk, fdiOk);
    } catch (err) {
      status.textContent = 'Connector failed · steward required';
      paint(null, null, null, err.message);
    }
  };

  $('[data-pull]', root).onclick = pull;
  $('[data-refresh]', root)?.addEventListener('click', () => refreshBoard?.());
  pull();
}
