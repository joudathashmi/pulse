import { $ } from '../lib/dom.js';
import { num } from '../lib/format.js';
import { exportCsv } from '../lib/export.js';
import { hideTip } from '../lib/tooltip.js';
import { loadWorld, renderFdiWorld } from '../charts/world.js';
import { bindCharts } from '../lib/crosshair.js';
import { pullFdiInvestSaudi } from '../data/index.js';
import { flagImg } from '../lib/flags.js';

const ARROW_MIN = 0.35;
const ARROW_CAP = 18;
const LAPSE_FROM = 2021;
const LAPSE_MS = 4200;

let lapseTimer = null;
let applyFdiFocus = null;

window.addEventListener('pulse-fdi-focus', (e) => {
  const detail = e.detail || window.__pulseFdiFocus;
  if (applyFdiFocus) applyFdiFocus(detail);
  else window.__pulseFdiFocus = detail;
});

function stopLapse() {
  if (lapseTimer) {
    clearInterval(lapseTimer);
    lapseTimer = null;
  }
}

const SECTOR_SHORT = {
  'Wholesale and retail trade; repair of motor vehicles and motorcycles': 'Wholesale and retail',
  'Financial And Insurance Activities': 'Finance and insurance',
  'Transportation and storage': 'Transport and storage',
  'Information And Communication': 'ICT',
  'Professional, Scientific And Technical Activities': 'Professional and scientific',
  'Administrative And Support Service Activities': 'Admin and support',
  'Electricity, gas, steam and air conditioning supply': 'Electricity and gas',
  'Water supply; sewerage, waste management and remediation activities': 'Water and waste',
  'Accommodation And Food Service Activities': 'Accommodation and food',
  'Human health and social work activities': 'Health and social work',
  'Agriculture, Forestry And Fishing': 'Agriculture',
  'Arts, Entertainment And Recreation': 'Arts and recreation',
  'Other service activities': 'Other services'
};

function seriesChart(years, key, color) {
  const W = 560, H = 88, pl = 8, pr = 36, pt = 8, pb = 18;
  const vals = years.map(y => y[key]);
  const max = Math.max(...vals) * 1.08;
  const X = i => pl + (i / (years.length - 1)) * (W - pl - pr);
  const Y = v => pt + (1 - v / max) * (H - pt - pb);
  const d = years.map((y, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(y[key]).toFixed(1)}`).join(' ');
  const last = years[years.length - 1];
  const pts = years.map((y, i) =>
    `<circle data-pt cx="${X(i)}" cy="${Y(y[key])}" data-tip="<b>${y.year}</b>${key} ${num(y[key])} SAR bn" r="0" fill="none"/>`
  ).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" class="fdi-spark" aria-label="${key} by year" data-plot="${pl},${pt},${W - pr},${H - pb}">
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2"/>
    <circle cx="${X(years.length - 1)}" cy="${Y(last[key])}" r="3" fill="${color}"/>
    <text x="${X(years.length - 1) + 6}" y="${Y(last[key]) + 4}" font-size="11" fill="${color}">${num(last[key])}</text>
    ${pts}
  </svg>`;
}

function sectorBars(rows) {
  const max = Math.max(0, ...rows.map(r => r.inflow || 0));
  return rows.map(r => {
    const pct = max ? ((r.inflow || 0) / max) * 100 : 0;
    const label = SECTOR_SHORT[r.sector] || r.sector;
    return `<div class="fdi-bar" title="${r.sector}">
      <div class="fdi-bar-lab">${label}</div>
      <div class="fdi-bar-track"><span style="width:${pct.toFixed(1)}%"></span></div>
      <div class="fdi-bar-n num">${num(r.inflow ?? 0)}</div>
    </div>`;
  }).join('');
}

function yearCut(cut, year) {
  const countries = (cut?.countries || [])
    .filter(r => r.year === year)
    .sort((a, b) => (b.inflow || 0) - (a.inflow || 0));
  const sectors = (cut?.sectors || [])
    .filter(r => r.year === year)
    .sort((a, b) => (b.inflow || 0) - (a.inflow || 0));
  return { countries, sectors };
}

function asArrows(countries, pinned) {
  const drawable = countries.filter(o => o.id && o.lon != null && o.lat != null && (o.inflow || 0) > 0);
  const material = drawable.filter(o => o.inflow >= ARROW_MIN).slice(0, ARROW_CAP);
  const top = material.length >= 12 ? material : drawable.slice(0, 12);
  const extra = drawable.filter(o => pinned.has(o.id) && !top.some(t => t.id === o.id));
  return [...top, ...extra].map(o => ({
    id: o.id, name: o.name, lon: o.lon, lat: o.lat, value: o.inflow
  }));
}

function scaleMax(cut, fromYear) {
  return Math.max(0, ...(cut?.countries || [])
    .filter(c => c.year >= fromYear && (c.inflow || 0) > 0)
    .map(c => c.inflow));
}

function sheetCell(v) {
  if (v == null || v === '' || v === '??' || v === '؟؟') return '—';
  if (typeof v === 'number') return num(v);
  return String(v);
}

function lapseInsight(cut, year, row, prevRow, pinned) {
  const cur = yearCut(cut, year).countries.filter(c => (c.inflow || 0) > 0);
  const prev = yearCut(cut, year - 1).countries;
  const top = cur[0];
  if (!top) {
    return {
      title: `${year} · waiting on the country cut`,
      body: 'The Invest Saudi pull has not landed yet. Play will name the origin once it does.'
    };
  }
  const prevMap = new Map(prev.map(c => [c.id || c.name, c]));
  let rise = null;
  let fall = null;
  for (const c of cur) {
    const delta = (c.inflow || 0) - (prevMap.get(c.id || c.name)?.inflow || 0);
    if (!rise || delta > rise.delta) rise = { name: c.name, delta, inflow: c.inflow };
    if (!fall || delta < fall.delta) fall = { name: c.name, delta, inflow: c.inflow };
  }
  const bits = [];
  if (row && prevRow) {
    const d = row.inflow - prevRow.inflow;
    bits.push(`National inflow ${d >= 0 ? 'up' : 'down'} ${num(Math.abs(d))} to ${num(row.inflow)} SAR bn.`);
  }
  if (rise && rise.delta > 0.2) {
    bits.push(`${rise.name} rises ${num(rise.delta)} to ${num(rise.inflow)}.`);
  }
  if (fall && fall.delta < -0.2 && fall.name !== rise?.name) {
    bits.push(`${fall.name} eases ${num(Math.abs(fall.delta))}.`);
  }
  const pin = [...pinned].map(id => cur.find(c => c.id === id)).find(Boolean);
  if (pin) bits.push(`Selected · ${pin.name} ${num(pin.inflow || 0)}.`);
  return {
    title: `${year} · ${top.name} leads at ${num(top.inflow)}`,
    body: bits.join(' ') || `${top.name} is the largest immediate-country inflow this year.`
  };
}

export async function renderFdi(root, data, { openDrill } = {}) {
  const pack = data?.fdiHistory;
  const years = pack?.years || [];
  if (!years.length) {
    root.innerHTML = `<div class="stage"><div class="panel" style="padding-top:20px">
      <h1>FDI</h1><p class="lede">The 2016-2024 workbook did not load.</p></div></div>`;
    return;
  }

  stopLapse();
  const pack2026 = data?.indicators2026;
  const yearList = [...years.map(y => y.year), ...(pack2026 ? [2026] : [])];
  let year = years[years.length - 1].year;
  const maxStock = Math.max(...years.map(y => y.stock));
  let cut = data?.fdiCut || { countries: [], sectors: [] };
  const pinned = new Set();
  const lapseYears = years.map(y => y.year).filter(y => y >= LAPSE_FROM);

  root.innerHTML = `
    <div class="stage"><div class="panel fdi-panel" style="padding-top:20px">
      <h1>FDI</h1>
      <p class="lede">2016-2024 is the Inflows workbook and the Invest Saudi country cut. 2026 is the Indicators pack sheet - forecast versus GASTAT actual. Blanks stay blank.</p>

      <div class="fdi-kpis" data-kpis></div>
      <div class="fdi-years" data-years role="tablist" aria-label="Year"></div>

      <div data-pack class="hide"></div>
      <div data-hist>
      <article class="wh-card fdi-map-card" data-tour="map">
        <div class="wh-dash-h" style="margin:0 0 8px">
          <div class="wh-k" style="margin:0">World · immediate country to the Kingdom</div>
          <span data-map-meta></span>
        </div>
        <div class="fdi-map" data-map></div>
        <div class="fdi-flags" data-flag-legend data-tour="flags"></div>
        <div class="fdi-lapse">
          <button type="button" class="btn-ghost" data-lapse-play>Play from 2021</button>
          <div class="seg fdi-lapse-years" data-lapse-years role="tablist" aria-label="Time-lapse"></div>
        </div>
        <article class="fdi-insight" data-insight>
          <span class="wh-kind is-insight">Insight</span>
          <h2 data-insight-title></h2>
          <p data-insight-body></p>
        </article>
        <p class="wh-est" data-map-note></p>
      </article>

      <div class="fdi-split">
        <article class="wh-card">
          <div class="wh-dash-h" style="margin:0 0 8px">
            <div class="wh-k" style="margin:0">Immediate country</div>
            <span>
              <span data-origin-meta></span>
              <button type="button" class="wh-act" data-fdi-csv>CSV</button>
            </span>
          </div>
          <div class="wh-table-wrap">
            <table class="wh-table is-static">
              <thead><tr><th>Rank</th><th>Country</th><th>Inflow</th><th>Net</th><th>Stock</th></tr></thead>
              <tbody data-origins></tbody>
            </table>
          </div>
        </article>
        <article class="wh-card">
          <div class="wh-dash-h" style="margin:0 0 8px">
            <div class="wh-k" style="margin:0">Sector</div>
            <span data-sector-meta></span>
          </div>
          <div data-sectors></div>
        </article>
      </div>

      <div class="fdi-series">
        <article class="wh-card">
          <div class="wh-k">Stock</div>
          <div data-spark-stock></div>
        </article>
        <article class="wh-card">
          <div class="wh-k">Net flow</div>
          <div data-spark-net></div>
        </article>
        <article class="wh-card">
          <div class="wh-k">Inflow</div>
          <div data-spark-inflow></div>
        </article>
      </div>

      <div class="wh-table-wrap">
        <table class="wh-table is-static">
          <thead><tr><th>Year</th><th>Stock</th><th>Net flow</th><th>Inflow</th></tr></thead>
          <tbody data-rows></tbody>
        </table>
      </div>
      <p class="wh-est" data-source-note></p>
      </div>
    </div></div>`;

  const gold = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#C4A35A';
  const ok = getComputedStyle(document.documentElement).getPropertyValue('--ok').trim() || '#3D9B78';
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-soft').trim() || '#c8c8ce';
  $('[data-spark-stock]', root).innerHTML = seriesChart(years, 'stock', gold);
  $('[data-spark-net]', root).innerHTML = seriesChart(years, 'net', ink);
  $('[data-spark-inflow]', root).innerHTML = seriesChart(years, 'inflow', ok);
  bindCharts(root);

  const yearBar = $('[data-years]', root);
  yearBar.innerHTML = yearList.map(y =>
    `<button type="button" class="fdi-yr" data-year="${y}">${y}</button>`
  ).join('');
  const lapseBar = $('[data-lapse-years]', root);
  lapseBar.innerHTML = `<span class="seg-track">${lapseYears.map(y =>
    `<button type="button" class="seg-opt" data-lapse="${y}">${y}</button>`
  ).join('')}</span>`;
  const playBtn = $('[data-lapse-play]', root);

  $('[data-rows]', root).innerHTML = years.map(y => `<tr data-y="${y.year}">
    <td class="num">${y.year}</td>
    <td class="num">${num(y.stock)}</td>
    <td class="num">${num(y.net)}</td>
    <td class="num">${num(y.inflow)}</td>
  </tr>`).join('');

  let world;
  try {
    world = await loadWorld();
  } catch (err) {
    $('[data-map]', root).innerHTML = `<p class="wh-est">${err.message}</p>`;
    return;
  }

  const setYear = (next, { keepPlay = false } = {}) => {
    year = next;
    if (!keepPlay) stopLapse();
    paint();
  };

  const paintPack = () => {
    const fdi = pack2026?.fdi;
    const gfcf = pack2026?.gfcf;
    const q1 = fdi?.rows?.find(r => r.id === 'q1');
    const q2 = fdi?.rows?.find(r => r.id === 'q2');
    $('[data-kpis]', root).innerHTML = `
      <div class="fdi-kpi"><div class="k">Year</div><div class="stat">2026</div><div class="meta">Indicators pack</div></div>
      <div class="fdi-kpi"><div class="k">FDI net · Q1 actual</div><div class="stat">${sheetCell(q1?.netA)}</div><div class="meta">SAR bn · issued</div></div>
      <div class="fdi-kpi"><div class="k">FDI net · Q2 forecast</div><div class="stat">${sheetCell(q2?.netF)}</div><div class="meta">GASTAT actual not issued</div></div>
      <div class="fdi-kpi"><div class="k">Stock to 2025</div><div class="stat">${sheetCell(fdi?.cumulative2025Stock)}</div><div class="meta">SAR bn cumulative</div></div>`;
    $('[data-pack]', root).innerHTML = `
      <p class="wh-est">${pack2026?.source?.file || ''} · ${pack2026?.source?.sheet || ''} · ${pack2026?.source?.owners || ''}</p>
      <div class="wh-k">FDI · 2026 sheet</div>
      <div class="wh-table-wrap fdi-sheet">
        <table class="wh-table is-static">
          <thead><tr><th>Period</th><th>Inflow fcast</th><th>Inflow actual</th><th>Outflow fcast</th><th>Outflow actual</th><th>Net fcast</th><th>Net actual</th><th>Note</th></tr></thead>
          <tbody>${(fdi?.rows || []).map(r => `<tr class="${r.issued ? 'is-on' : ''}" data-pack-row="${r.id}" tabindex="0">
            <td>${r.period}</td>
            <td class="num">${sheetCell(r.inflowF)}</td>
            <td class="num">${r.issued ? sheetCell(r.inflowA) : 'Not issued'}</td>
            <td class="num">${sheetCell(r.outflowF)}</td>
            <td class="num">${r.issued ? sheetCell(r.outflowA) : 'Not issued'}</td>
            <td class="num">${sheetCell(r.netF)}</td>
            <td class="num">${r.issued ? sheetCell(r.netA) : 'Not issued'}</td>
            <td>${r.note || '—'}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
      <p class="wh-est">Target 2026 ${sheetCell(fdi?.target2026)} · 2030 stock ${sheetCell(fdi?.target2030)} · country map is not in this sheet.</p>
      <div class="wh-k">GFCF · same workbook</div>
      <div class="wh-table-wrap fdi-sheet">
        <table class="wh-table is-static">
          <thead><tr><th>Period</th><th>Forecast</th><th>Actual</th><th>Note</th></tr></thead>
          <tbody>${(gfcf?.rows || []).map(r => `<tr class="${r.issued ? 'is-on' : ''}" data-gfcf-row="${r.id}" tabindex="0">
            <td>${r.period}</td>
            <td class="num">${sheetCell(r.forecast)}</td>
            <td class="num">${r.issued ? sheetCell(r.actual) : 'Not issued'}</td>
            <td>${r.note || '—'}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
      <p class="wh-est">Cumulative to 2025 ${sheetCell(gfcf?.cumulative2025Tn)} tn · 2026 target ${sheetCell(gfcf?.target2026)} · 2030 ${sheetCell(gfcf?.target2030Tn)} tn. ${gfcf?.targetNote || ''}</p>`;
    const packHost = $('[data-pack]', root);
    for (const tr of packHost.querySelectorAll('[data-pack-row]')) {
      tr.style.cursor = 'pointer';
      tr.onclick = () => openDrill?.(['fdi', 'pack', tr.dataset.packRow]);
    }
    for (const tr of packHost.querySelectorAll('[data-gfcf-row]')) {
      tr.style.cursor = 'pointer';
      tr.onclick = () => openDrill?.(['gfcf', 'pack', tr.dataset.gfcfRow]);
    }
  };

  const paint = ({ boards = true } = {}) => {
    hideTip();
    const isPack = year === 2026;
    $('[data-pack]', root)?.classList.toggle('hide', !isPack);
    $('[data-hist]', root)?.classList.toggle('hide', isPack);
    for (const b of yearBar.querySelectorAll('[data-year]')) {
      b.classList.toggle('on', Number(b.dataset.year) === year);
    }
    if (isPack) {
      stopLapse();
      if (playBtn) {
        playBtn.classList.remove('on');
        playBtn.textContent = 'Play from 2021';
      }
      paintPack();
      return;
    }
    const row = years.find(y => y.year === year) || years.at(-1);
    const prevRow = years.find(y => y.year === row.year - 1);
    year = row.year;
    const { countries, sectors } = yearCut(cut, year);
    const playing = Boolean(lapseTimer);
    const arrows = asArrows(countries, pinned);
    const origins = countries
      .filter(o => o.id && o.lon != null)
      .map(o => ({ id: o.id, name: o.name, lon: o.lon, lat: o.lat, value: o.inflow || 0 }));
    const insight = lapseInsight(cut, year, row, prevRow, pinned);

    for (const b of yearBar.querySelectorAll('[data-year]')) {
      b.classList.toggle('on', Number(b.dataset.year) === year);
    }
    for (const b of lapseBar.querySelectorAll('[data-lapse]')) {
      b.classList.toggle('on', Number(b.dataset.lapse) === year);
    }
    playBtn.classList.toggle('on', playing);
    playBtn.textContent = playing ? 'Pause' : 'Play from 2021';
    for (const tr of root.querySelectorAll('[data-rows] tr')) {
      tr.classList.toggle('is-on', Number(tr.dataset.y) === year);
    }
    $('[data-kpis]', root).innerHTML = `
      <div class="fdi-kpi"><div class="k">Year</div><div class="stat">${row.year}</div></div>
      <div class="fdi-kpi"><div class="k">FDI stock</div><div class="stat">${num(row.stock)}</div><div class="meta">SAR bn</div></div>
      <div class="fdi-kpi"><div class="k">Net flow</div><div class="stat">${num(row.net)}</div><div class="meta">SAR bn</div></div>
      <div class="fdi-kpi"><div class="k">Inflow</div><div class="stat">${num(row.inflow)}</div><div class="meta">SAR bn</div></div>`;
    $('[data-map-meta]', root).textContent = arrows.length
      ? `${arrows.length} flows · largest named on the map · ${countries.length} counterparts`
      : 'National totals · country cut not loaded';
    $('[data-insight-title]', root).textContent = insight.title;
    $('[data-insight-body]', root).textContent = insight.body;
    $('[data-flag-legend]', root).innerHTML = arrows.map(o =>
      `<button type="button" class="fdi-flag-chip${pinned.has(o.id) ? ' on' : ''}" data-pin="${o.id}">${flagImg(o.id, o.name)}<span>${o.name}</span><b class="num">${num(o.value)}</b></button>`
    ).join('');
    $('[data-map-note]', root).textContent = playing
      ? ''
      : arrows.length
        ? 'Largest origins are named on the map. The full list is under the map. Click a counterpart or a chip to pin its arrow. Source · investsaudi.sa/fdi.'
        : 'Hover a country for its name. Country arrows wait on the Invest Saudi pull.';
    if (boards) {
      $('[data-origin-meta]', root).textContent = countries.length
        ? `${countries.length} economies · SAR bn`
        : 'No country rows';
      $('[data-sector-meta]', root).textContent = sectors.length
        ? `${sectors.length} sectors · SAR bn`
        : 'No sector rows';
      $('[data-origins]', root).innerHTML = countries.map((o, i) => `<tr data-id="${o.id || ''}" class="${pinned.has(o.id) ? 'is-on' : ''}">
        <td class="num">${i + 1}</td>
        <td>${flagImg(o.id, o.name)} ${o.name}</td>
        <td class="num">${o.inflow == null ? '-' : num(o.inflow)}</td>
        <td class="num">${o.net == null ? '-' : num(o.net)}</td>
        <td class="num">${o.stock == null ? '-' : num(o.stock)}</td>
      </tr>`).join('') || '<tr><td colspan="5">Country cut did not load.</td></tr>';
      $('[data-sectors]', root).innerHTML = sectors.length
        ? sectorBars(sectors)
        : '<p class="wh-est">Sector cut did not load.</p>';
      $('[data-source-note]', root).textContent = [
        pack.source?.note,
        cut.source?.note,
        `Workbook · ${(pack.source?.files || []).join(' · ') || 'Inflows sheet'}.`,
        cut.source?.page ? `Country and sector · ${cut.source.page}.` : ''
      ].filter(Boolean).join(' ');
    }
    renderFdiWorld($('[data-map]', root), world, {
      row,
      maxStock,
      origins,
      arrows,
      wash: playing ? arrows.slice(0, 1) : arrows,
      pinned: [...pinned],
      maxValue: scaleMax(cut, LAPSE_FROM) || undefined,
      animate: false,
      labels: true,
      quietHub: playing,
      onPick: origin => {
        if (!origin?.id) return;
        if (pinned.has(origin.id)) pinned.delete(origin.id);
        else pinned.add(origin.id);
        paint();
      }
    });
  };

  const togglePin = id => {
    if (!id) return;
    if (pinned.has(id)) pinned.delete(id);
    else pinned.add(id);
    paint();
  };

  const playLapse = () => {
    if (lapseTimer) {
      stopLapse();
      paint();
      return;
    }
    year = LAPSE_FROM;
    lapseTimer = setInterval(() => {
      const i = lapseYears.indexOf(year);
      if (i < 0 || i >= lapseYears.length - 1) {
        stopLapse();
        paint();
        return;
      }
      year = lapseYears[i + 1];
      paint({ boards: false });
    }, LAPSE_MS);
    paint({ boards: false });
  };

  yearBar.addEventListener('click', e => {
    const b = e.target.closest('[data-year]');
    if (!b) return;
    setYear(Number(b.dataset.year));
  });
  lapseBar.addEventListener('click', e => {
    const b = e.target.closest('[data-lapse]');
    if (!b) return;
    setYear(Number(b.dataset.lapse));
  });
  playBtn.addEventListener('click', playLapse);
  $('[data-rows]', root).addEventListener('click', e => {
    const tr = e.target.closest('tr[data-y]');
    if (!tr) return;
    setYear(Number(tr.dataset.y));
  });
  $('[data-origins]', root).addEventListener('click', e => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    togglePin(tr.dataset.id);
  });
  $('[data-fdi-csv]', root)?.addEventListener('click', () => {
    const { countries } = yearCut(cut, year);
    exportCsv(`fdi-countries-${year}.csv`, [
      ['rank', 'id', 'name', 'inflow', 'net', 'stock', 'year'],
      ...countries.map((o, i) => [i + 1, o.id, o.name, o.inflow ?? '', o.net ?? '', o.stock ?? '', year])
    ]);
  });
  $('[data-flag-legend]', root).addEventListener('click', e => {
    const b = e.target.closest('[data-pin]');
    if (!b) return;
    togglePin(b.dataset.pin);
  });
  applyFdiFocus = (opts = {}) => {
    const next = opts || {};
    if (next.year && yearList.includes(next.year)) setYear(next.year);
    if (next.countryId) {
      pinned.clear();
      pinned.add(next.countryId);
      paint();
    }
  };
  if (window.__pulseFdiFocus) {
    const pending = window.__pulseFdiFocus;
    window.__pulseFdiFocus = null;
    applyFdiFocus(pending);
  } else {
    paint();
  }

  pullFdiInvestSaudi().then(live => {
    if (!live?.countries?.length) return;
    cut = live;
    if (data) data.fdiCut = live;
    paint();
  }).catch(() => {});
}
