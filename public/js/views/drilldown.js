import { el, $, tableScroll } from '../lib/dom.js';
import { num } from '../lib/format.js';
import { LEVELS, SECTORS, RECORDS, isParentCertified } from '../fixtures/drilldown.js';
import { KSA_REGIONS } from '../fixtures/flows.js';
import { certChip } from '../lib/status.js';
import { t } from '../i18n.js';
import { kpiMarkHtml, bindKpiHelp } from '../lib/kpiMark.js';
import { openAskOwnerDialog } from './alerts.js';
import { ownerForMetric } from '../lib/queries.js';
import { exportCsv, exportPdfPrint } from '../lib/export.js';
import { shareEmail, shareTeams, copyText } from '../lib/share.js';
import {
  packFile, packMetric, packPeriod, packSignal, fdiFields, gfcfFields, fieldState
} from '../lib/lineage.js';

/**
 * Plan slide 21 drill - one tap deeper each time:
 * 01 Headline → 02 Indicator → 03 Sector / region → 04 Source record
 * Every number carries its control chain.
 */

const LEVEL_LABELS = ['Headline', 'Indicator', 'Sector / region', 'Source record'];

function chain(o) {
  return `<div class="chainrow">
    <span>Source <b>${o.source}</b></span>
    <span>Method <b>${o.method}</b></span>
    <span>Status <b>${o.state || o.certificate || '-'}</b></span>
  </div>`;
}

function cutButton({ name, value, status, share, tone, onClick, metric }) {
  const b = el(`<button type="button" class="cut${tone ? ` is-${tone}` : ''}">
    <span class="cut-k">${status}</span>
    <span class="cut-n">${name}</span>
    <span class="cut-v" data-kpi-def="${metric || 'fdi'}">${value}</span>
    ${share ? `<span class="cut-s">${share}</span>` : ''}
  </button>`);
  b.onclick = onClick;
  return b;
}

function normalize(path) {
  let p = Array.isArray(path) ? [...path] : [];
  if (p[1] === 'pack' || p[1] === 'row') return p;
  if (p.length === 2 && !['comp', 'sector', 'region'].includes(p[1])) p = [p[0], 'comp', p[1]];
  if (p.length === 3 && !['comp'].includes(p[1])) p = [p[0], 'comp', p[1], 'sector', p[2]];
  return p;
}

function stepIndex(path) {
  if (!path.length) return 0;
  if (path.length === 1) return 0;
  if (path[1] === 'comp' && path.length === 3) return 1;
  if (path.length >= 5) return path.length > 5 || path[5] ? 3 : 2;
  if (path[3] === 'sector' || path[3] === 'region') return 2;
  return Math.min(path.length - 1, 3);
}

function crumbs(path, head, pack) {
  const out = [{ label: 'Pulse', path: null }];
  if (!path.length) return out;
  out.push({ label: head?.name || path[0], path: [path[0]] });
  if (path[1] === 'pack') {
    const row = packPeriod(pack, path[0], path[2]);
    if (path[2]) out.push({ label: row?.period || path[2], path: path.slice(0, 3) });
    if (path[3] === 'field' && path[4]) {
      const fields = path[0] === 'gfcf' ? gfcfFields(row || {}) : fdiFields(row || {});
      const field = fields.find(f => f.id === path[4]);
      out.push({ label: field?.label || path[4], path: path.slice(0, 5) });
    }
    return out;
  }
  if (path[1] === 'comp') {
    out.push({ label: path[2], path: path.slice(0, 3) });
    if (path[3] === 'sector') out.push({ label: path[4], path: path.slice(0, 5) });
    if (path[3] === 'region') {
      const r = KSA_REGIONS.find(x => x.id === path[4]);
      out.push({ label: r?.name || path[4], path: path.slice(0, 5) });
    }
    if (path[5]) out.push({ label: path[5], path: path.slice(0, 6) });
  }
  return out;
}

function sheetVal(v) {
  if (v == null || v === '') return '-';
  if (typeof v === 'number') return num(v);
  return String(v);
}

export function renderDrill(root, path, data, navigate) {
  const s = t();
  const series = data?.series || data || {};
  const pack = data?.indicators2026;
  path = normalize(path);
  if (!path.length) path = ['fdi'];

  const sig = packSignal(pack, path[0]);
  const head = LEVELS[path[0]] || (sig ? {
    name: sig.name,
    method: sig.freq || 'As published',
    owner: sig.owner,
    source: sig.source,
    state: sig.value == null ? 'No data' : 'On the sheet'
  } : null);
  const value = series.cur?.[path[0]];
  const step = path[1] === 'pack'
    ? (path[3] === 'field' ? 2 : path[2] ? 1 : 0)
    : sig && !LEVELS[path[0]] ? (path[1] === 'row' ? 3 : 0)
    : stepIndex(path);
  const certified = LEVELS[path[0]] ? isParentCertified(path[0]) : false;

  root.innerHTML = `
    <div class="drill">
      <div class="drill-bar" data-crumb>
        <div class="drill-bar-k">From Pulse · you are here</div>
        <div class="drill-bar-path" data-crumb-path></div>
      </div>
      <div class="levels" data-levels></div>
      <div class="wh-actions drill-acts no-print">
        <button type="button" class="wh-act" data-d-csv>Export CSV</button>
        <button type="button" class="wh-act" data-d-pdf>PDF</button>
        <button type="button" class="wh-act" data-d-assign>Assign</button>
        <button type="button" class="wh-act" data-d-teams>Share on Teams</button>
        <button type="button" class="wh-act" data-d-email>Share via email</button>
        <button type="button" class="wh-act" data-d-copy>Copy link</button>
      </div>
      <div class="panel" data-panel></div>
    </div>`;

  const crumb = $('[data-crumb-path]', root);
  const trail = crumbs(path, head, pack);
  trail.forEach((c, i, arr) => {
    const here = i === arr.length - 1;
    if (c.path === null) {
      const b = el(`<button type="button">${c.label}</button>`);
      b.onclick = () => navigate([]);
      crumb.appendChild(b);
    } else {
      const b = el(`<button type="button" class="${here ? 'here' : ''}">${c.label}</button>`);
      if (!here) b.onclick = () => navigate(c.path);
      crumb.appendChild(b);
    }
    if (i < arr.length - 1) crumb.appendChild(el('<span class="sep" aria-hidden="true">/</span>'));
  });
  const here = trail[trail.length - 1];
  const kicker = $('[data-crumb] .drill-bar-k', root);
  if (kicker && here) {
    kicker.textContent = trail.length > 1
      ? `From Pulse · you are at ${here.label}`
      : 'From Pulse';
  }

  const levels = $('[data-levels]', root);
  LEVEL_LABELS.forEach((label, i) => {
    levels.appendChild(el(`<div class="level ${i === step ? 'on' : ''}">
      <span class="n">0${i + 1}</span>${label}</div>`));
  });

  const panel = $('[data-panel]', root);
  bindDrillActs(root, { path, head, value });
  const src = packFile(pack);
  const seal = () => bindKpiHelp(root, {
    brief: pack,
    onAskDefinition: (meta, id) => {
      const info = ownerForMetric(id, pack);
      openAskOwnerDialog({
        metric: id,
        value: String(value ?? ''),
        owner: info.owner || meta.owner,
        ownerContact: info.contact,
        title: meta.name,
        question: `Please confirm the official definition of “${meta.name}”.\n\n${meta.definition}\n\nSource: ${meta.source}\nCalculated: ${meta.calculatedLabel}`
      });
    }
  });

  if (!head) {
    panel.innerHTML = `<p class="lede">No pack row for “${path[0]}”.</p>`;
    return;
  }

  if (sig && !LEVELS[path[0]]) {
    panel.innerHTML = `
      <div class="k">01 · Indicator</div>
      <h2 class="wh-ind" style="margin-top:6px">${sig.name}${kpiMarkHtml(sig.id)}</h2>
      <div class="hero" data-kpi-def="${sig.id}">${sig.value ?? '-'}<span>${sig.asOf || ''}</span></div>
      <p class="lede">${sig.note || 'Leading signal from the Indicators pack.'}</p>
      ${chain({ source: sig.source, method: sig.freq, state: sig.value == null ? 'No data' : 'On the sheet' })}
      <div class="record">
        <div class="k">04 · Source record</div>
        <h2 style="margin-top:6px">${src.file}</h2>
        <div class="grid2">
          <div><div class="lab">Sheet</div><div class="val">${sig.sheet}</div></div>
          <div><div class="lab">Row</div><div class="val">${sig.row}</div></div>
          <div><div class="lab">Value</div><div class="val">${sig.value ?? 'No data'}</div></div>
          <div><div class="lab">As of</div><div class="val">${sig.asOf || '-'}</div></div>
          <div><div class="lab">Source</div><div class="val">${sig.source}</div></div>
          <div><div class="lab">Owner</div><div class="val">${sig.owner}</div></div>
          <div><div class="lab">Frequency</div><div class="val">${sig.freq}</div></div>
          <div><div class="lab">State</div><div class="val">${sig.value == null ? 'Empty in pack' : 'Loaded from sheet'}</div></div>
        </div>
      </div>`;
    seal();
    return;
  }

  if (path[1] === 'pack') {
    const metric = packMetric(pack, path[0]);
    const row = packPeriod(pack, path[0], path[2]);
    const fields = path[0] === 'gfcf' ? gfcfFields(row || {}) : fdiFields(row || {});
    if (!row) {
      panel.innerHTML = `<p class="lede">Period ${path[2]} is not on the sheet.</p>`;
      return;
    }
    if (path[3] === 'field') {
      const field = fields.find(f => f.id === path[4]) || fields[0];
      const state = fieldState(row, field);
      panel.innerHTML = `
        <div class="k">03 · Field</div>
        <h2 style="margin-top:6px">${field.label} · ${row.period}</h2>
        <div class="hero" data-kpi-def="${path[0]}">${sheetVal(field.value)}<span>SAR bn</span></div>
        <p class="lede">${state}. ${row.note || ''}</p>
        <div class="record">
          <div class="k">04 · Source record</div>
          <h2 style="margin-top:6px">${src.file}</h2>
          <div class="grid2">
            <div><div class="lab">Sheet</div><div class="val">${src.sheet}</div></div>
            <div><div class="lab">Period</div><div class="val">${row.period}</div></div>
            <div><div class="lab">Field</div><div class="val">${field.label}</div></div>
            <div><div class="lab">Value</div><div class="val">${sheetVal(field.value)}</div></div>
            <div><div class="lab">Role</div><div class="val">${field.role}</div></div>
            <div><div class="lab">State</div><div class="val">${state}</div></div>
            <div><div class="lab">Owner</div><div class="val">${head.owner}</div></div>
            <div><div class="lab">Meeting</div><div class="val">${src.title || 'Meeting 5 · July 2026'}</div></div>
          </div>
          ${chain({
            source: src.file,
            method: head.method,
            state,
            lineage: `${src.sheet} · ${row.period} · ${field.label}`
          })}
        </div>`;
      seal();
      return;
    }
    panel.innerHTML = `
      <div class="k">02 · Period</div>
      <h2 style="margin-top:6px">${row.period}</h2>
      <p class="lede">${row.issued ? 'GASTAT actual issued.' : 'GASTAT actual not issued.'} ${row.note || ''}</p>
      ${chain({ source: src.file, method: head.method, state: row.issued ? 'Issued' : 'Held' })}
      <div class="k" style="margin-top:20px">Fields on this row</div>
      <div class="cuts" data-list></div>`;
    const list = $('[data-list]', panel);
    for (const field of fields) {
      list.appendChild(cutButton({
        name: field.label,
        value: sheetVal(field.value),
        status: fieldState(row, field),
        share: field.role,
        metric: path[0],
        onClick: () => navigate([path[0], 'pack', row.id, 'field', field.id])
      }));
    }
    seal();
    return;
  }

  // 01 Headline
  if (path.length === 1) {
    const total = head.components.reduce((a, c) => a + Number(c[1]), 0);
    panel.innerHTML = `
      <div class="k">01 · Headline</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:6px">
        <h2 class="wh-ind">${head.name}${kpiMarkHtml(path[0])}</h2>
        ${certChip(certified)}
      </div>
      <div class="hero" data-kpi-def="${path[0]}">${num(value, path[0] === 'gfcf' ? 0 : 1)}<span>${s.sarBn}</span></div>
      ${certified ? '' : `<p class="lede">${s.certIncompleteHint}</p>`}
      ${chain({ ...head, quality: 'Six gates', lineage: `${src.file} → ${src.sheet}`, certificate: certified ? 'Certified' : 'Incomplete' })}
      <div class="k" style="margin-top:20px">${s.packFrom || 'From the Indicators pack'}</div>
      <p class="wh-est">${src.file}${src.sheet ? ` · ${src.sheet}` : ''}</p>
      <div class="cuts" data-pack-list></div>
      <div class="k" style="margin-top:20px">BPM6 / SNA composition</div>
      <div class="cuts" data-list></div>
      <details class="tv"><summary>${s.viewTable}</summary>
        ${tableScroll(`<table class="wh-table is-static" style="margin-top:8px"><thead><tr><th>Indicator</th><th>SAR bn</th><th>Availability</th><th>Certified</th></tr></thead>
        <tbody>${head.components.map(c => `<tr><td>${c[0]}</td><td class="num">${num(c[1], path[0] === 'gfcf' ? 0 : 1)}</td><td>${c[2]}</td><td>${c[4] ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody></table>`)}
      </details>`;

    const packList = $('[data-pack-list]', panel);
    const metric = packMetric(pack, path[0]);
    for (const row of metric?.rows || []) {
      const shown = path[0] === 'gfcf'
        ? (row.issued ? row.actual : row.forecast)
        : (row.issued ? row.netA : row.netF);
      const blank = shown == null || shown === '';
      packList.appendChild(cutButton({
        name: row.period,
        value: sheetVal(shown),
        status: row.issued
          ? (s.packIssued || 'Issued')
          : blank
            ? (s.packNotIssued || 'Not issued')
            : (s.eaForecast || 'EA forecast'),
        share: row.issued
          ? (s.packIssuedActual || 'GASTAT actual · SAR bn')
          : blank
            ? (s.packGastatHold || 'GASTAT actual not issued')
            : (s.packEaForecast || 'Economic Affairs forecast · SAR bn'),
        metric: path[0],
        onClick: () => navigate([path[0], 'pack', row.id])
      }));
    }
    const list = $('[data-list]', panel);
    const dec = path[0] === 'gfcf' ? 0 : 1;
    for (const [name, val, , childCert] of head.components) {
      list.appendChild(cutButton({
        name,
        value: `${num(val, dec)}<span class="cut-u">${s.sarBn}</span>`,
        status: childCert ? (s.certComplete || 'Certified') : (s.certIncompleteShort || 'Incomplete'),
        share: `${Math.round((Number(val) / total) * 100)}% ${s.ofHeadline || 'of headline'}`,
        tone: childCert ? 'ok' : 'watch',
        metric: path[0],
        onClick: () => navigate([path[0], 'comp', name])
      }));
    }
    seal();
    return;
  }

  // 02 Indicator
  if (path[1] === 'comp' && path.length === 3) {
    const comp = head.components.find(c => c[0] === path[2]);
    panel.innerHTML = `
      <div class="k">02 · Indicator</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:6px">
        <h2>${path[2]}</h2>
        ${certChip(!!comp?.[4])}
      </div>
      <div class="hero" data-kpi-def="${path[0]}">${num(comp?.[1] ?? 0, path[0] === 'gfcf' ? 0 : 1)}<span>${s.sarBn}</span></div>
      <p class="lede">${comp?.[3] || ''}</p>
      ${chain({ ...head, quality: 'Six gates passed', lineage: 'Component → certified store', certificate: comp?.[4] ? 'Certified' : 'Incomplete' })}
      <div class="dim">
        <button type="button" class="on" data-dim="sector">By sector</button>
        <button type="button" data-dim="region">By region</button>
      </div>
      <div class="k" style="margin-top:16px">Where it moves</div>
      <div class="cuts" data-list></div>
      <details class="tv"><summary>${s.viewTable}</summary><div class="wh-table-wrap" data-cut-table></div></details>`;

    const list = $('[data-list]', panel);
    const tableHost = $('[data-cut-table]', panel);
    const draw = (cut) => {
      for (const b of panel.querySelectorAll('[data-dim]')) b.classList.toggle('on', b.dataset.dim === cut);
      list.innerHTML = '';
      if (cut === 'sector') {
        const total = SECTORS.reduce((a, x) => a + Number(x[1]), 0);
        tableHost.innerHTML = tableScroll(`<table class="wh-table is-static" style="margin-top:8px"><thead><tr><th>Sector</th><th>SAR bn</th><th>ISIC</th><th>YoY</th></tr></thead>
          <tbody>${SECTORS.map(x => `<tr><td>${x[0]}</td><td class="num">${num(x[1])}</td><td>${x[2]}</td><td class="num">${x[3]}</td></tr>`).join('')}</tbody></table>`);
        for (const [name, val, isic, yoy] of SECTORS) {
          list.appendChild(cutButton({
            name,
            value: num(val),
            status: `${isic} · ${yoy}`,
            share: `${Math.round((Number(val) / total) * 100)}% of this cut`,
            metric: path[0],
            onClick: () => navigate([path[0], 'comp', path[2], 'sector', name])
          }));
        }
      } else {
        const key = path[0];
        tableHost.innerHTML = tableScroll(`<table class="wh-table is-static" style="margin-top:8px"><thead><tr><th>Region</th><th>FDI</th><th>GFCF</th></tr></thead>
          <tbody>${KSA_REGIONS.map(r => `<tr><td>${r.name}</td><td class="num">${num(r.fdi)}</td><td class="num">${num(r.gfcf, 0)}</td></tr>`).join('')}</tbody></table>`);
        for (const r of [...KSA_REGIONS].sort((a, b) => b[key] - a[key])) {
          list.appendChild(cutButton({
            name: r.name,
            value: num(r[key], key === 'gfcf' ? 0 : 1),
            status: `Regional ${key.toUpperCase()}`,
            metric: path[0],
            onClick: () => navigate([path[0], 'comp', path[2], 'region', r.id])
          }));
        }
      }
    };
    for (const b of panel.querySelectorAll('[data-dim]')) b.onclick = () => { draw(b.dataset.dim); seal(); };
    draw('sector');
    seal();
    return;
  }

  // 03 Sector / region → 04 Source records
  if (path[3] === 'sector' || path[3] === 'region') {
    const isSector = path[3] === 'sector';
    const label = isSector ? path[4] : (KSA_REGIONS.find(r => r.id === path[4])?.name || path[4]);
    const sector = isSector ? SECTORS.find(x => x[0] === path[4]) : null;
    const region = !isSector ? KSA_REGIONS.find(r => r.id === path[4]) : null;
    const records = RECORDS.filter(r => {
      if (isSector) return true;
      if (!region) return true;
      const a = r.region.toLowerCase();
      const b = region.name.toLowerCase();
      return a === b || a.includes(b.split(' ')[0]) || b.includes(a.split(' ')[0]);
    });
    const rows = records.length ? records : RECORDS;

    panel.innerHTML = `
      <div class="k">${isSector ? '03 · Sector' : '03 · Region'}</div>
      <h2 style="margin-top:6px">${label}</h2>
      <p class="lede">${isSector
        ? `${sector?.[2] || ''} · ${sector?.[4] || ''} · ${sector?.[3] || ''}`
        : `Regional ${path[0].toUpperCase()} ${region ? num(region[path[0]], path[0] === 'gfcf' ? 0 : 1) + ' ' + s.sarBn : ''}`}</p>
      ${chain({ ...head, quality: 'Six gates passed', lineage: 'Dimension → certified store', certificate: 'Provisional' })}
      <div class="k" style="margin-top:18px">Source records</div>
      <div class="cuts" data-list></div>
      <details class="tv"><summary>${s.viewTable}</summary>
        ${tableScroll(`<table class="wh-table is-static" style="margin-top:8px"><thead><tr><th>Record</th><th>Type</th><th>Region</th><th>Date</th><th>SAR bn</th><th>Evidence</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td class="mono">${r.id}</td><td>${r.type}</td><td>${r.region}</td><td>${r.date}</td><td class="num">${num(r.value)}</td><td>${r.evidence}</td></tr>`).join('')}</tbody></table>`)}
      </details>
      <div data-detail></div>`;

    const list = $('[data-list]', panel);
    const detail = $('[data-detail]', panel);
    const showRecord = (r, btn) => {
      for (const x of list.querySelectorAll('.cut')) x.classList.toggle('on', x === btn);
      detail.innerHTML = `
        <div class="record">
          <div class="k">04 · Source record</div>
          <h2 style="margin-top:6px">${r.id}</h2>
          <div class="grid2">
            <div><div class="lab">Value</div><div class="val" data-kpi-def="${path[0]}">${num(r.value)} ${s.sarBn}</div></div>
            <div><div class="lab">Type</div><div class="val">${r.type}</div></div>
            <div><div class="lab">Region</div><div class="val">${r.region}</div></div>
            <div><div class="lab">Date</div><div class="val">${r.date}</div></div>
            <div><div class="lab">Investor</div><div class="val">${r.investor}</div></div>
            <div><div class="lab">Entity</div><div class="val">${r.entity}</div></div>
            <div><div class="lab">Evidence</div><div class="val">${r.evidence}</div></div>
            <div><div class="lab">Steward</div><div class="val">${r.steward}</div></div>
          </div>
          ${chain({
            source: r.evidence,
            lineage: `${r.lineage || 'Certified store'} · record ${r.id} · ${r.date}`,
            method: head.method,
            quality: 'Record-level · field: value, type, region, date, investor, entity, evidence, steward',
            owner: r.steward,
            certificate: 'Certified'
          })}
        </div>`;
    };
    for (const r of rows) {
      const row = cutButton({
        name: r.id,
        value: num(r.value),
        status: `${r.type} · ${r.region}`,
        share: `${r.date} · ${r.evidence}`,
        metric: path[0],
        onClick: () => navigate([path[0], 'comp', path[2], path[3], path[4], r.id])
      });
      list.appendChild(row);
      if (path[5] === r.id) showRecord(r, row);
    }
    seal();
  }
}

function tableToRows(root) {
  const table = root.querySelector('.panel table');
  if (!table) return [['path', 'value'], [location.hash || 'drill', '']];
  const rows = [];
  for (const tr of table.querySelectorAll('tr')) {
    rows.push([...tr.children].map(td => td.textContent.trim()));
  }
  return rows;
}

function bindDrillActs(root, { path, head, value }) {
  const label = head?.name || path[0];
  const body = [
    `Investment Pulse Operating System · drill`,
    `${label} · ${value ?? '-'} SAR bn`,
    `Path: ${path.join(' → ')}`,
    location.href
  ].join('\n');

  root.querySelector('[data-d-csv]')?.addEventListener('click', () => {
    exportCsv(`pulse-drill-${path.join('-')}-${Date.now()}.csv`, tableToRows(root));
  });
  root.querySelector('[data-d-pdf]')?.addEventListener('click', () => exportPdfPrint(`Pulse drill · ${label}`));
  root.querySelector('[data-d-assign]')?.addEventListener('click', () => {
    const info = ownerForMetric(path[0]);
    openAskOwnerDialog({
      metric: path[0],
      value: String(value ?? ''),
      owner: info.owner,
      ownerContact: info.contact,
      title: label,
      question: `Please own this drill path (${path.join(' → ')}) and assign the next action for the Committee pack.`
    });
  });
  root.querySelector('[data-d-email]')?.addEventListener('click', () => shareEmail({
    subject: `Investment Pulse Operating System · ${label}`,
    body
  }));
  root.querySelector('[data-d-teams]')?.addEventListener('click', () => shareTeams({
    title: `Investment Pulse Operating System · ${label}`,
    text: body,
    url: location.href
  }));
  root.querySelector('[data-d-copy]')?.addEventListener('click', async () => {
    await copyText(body);
    const n = document.getElementById('tip');
    if (n) {
      n.textContent = 'Copied drill path';
      n.style.opacity = 1;
      n.style.left = '50%';
      n.style.top = '18px';
      n.style.transform = 'translateX(-50%)';
      setTimeout(() => { n.style.opacity = 0; n.style.transform = ''; }, 1600);
    }
  });
}
