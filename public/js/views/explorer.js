import { el, $, tableScroll } from '../lib/dom.js';
import { num } from '../lib/format.js';
import { LEVELS, SECTORS, RECORDS, isParentCertified } from '../fixtures/drilldown.js';
import { FDI_FLOWS, KSA_REGIONS } from '../fixtures/flows.js';
import { renderSceneMap } from '../charts/map.js';
import { certChip } from '../lib/status.js';
import { getLang, t } from '../i18n.js';
import { renderBriefLanding } from './brief.js';

/**
 * Dissemination brief - IMF DQAF / SDDS information architecture.
 * Path: Dissemination → Methodological composition → Analytical cut → Evidence.
 */

function chain(parts) {
  return `<div class="ep-chain">${parts.map(([k, v]) =>
    `<span>${k}<b>${v}</b></span>`).join('')}</div>`;
}

function level(path) {
  if (!path.length) return 0;
  if (path.length === 1) return 1;
  if (path[1] === 'comp' && path.length === 3) return 2;
  if (path.length >= 5 && (path[3] === 'sector' || path[3] === 'region')) return 3;
  return Math.min(path.length, 3);
}

function crumbs(path, s, head) {
  const out = [{ label: s.start, path: [] }];
  if (!path.length) return out;
  const name = getLang() === 'ar' ? (head.nameAr || head.name) : head.name;
  out.push({ label: name, path: [path[0]] });
  if (path[1] === 'comp') {
    out.push({ label: path[2], path: path.slice(0, 3) });
    if (path[3] === 'sector') out.push({ label: path[4], path: path.slice(0, 5) });
    if (path[3] === 'region') {
      const r = KSA_REGIONS.find(x => x.id === path[4]);
      out.push({ label: r?.name || path[4], path: path.slice(0, 5) });
    }
  }
  return out;
}

function mapScene(path) {
  if (!path.length) return 'headline';
  if (path.length === 1 && path[0] === 'fdi') return 'origins';
  if (path[3] === 'region' || (path.length === 1 && path[0] === 'gfcf')) return 'regions';
  if (path[1] === 'comp') return path[0] === 'fdi' ? 'origins' : 'regions';
  return 'headline';
}

function mapFocus(path) {
  return {
    metric: path[0] || null,
    originId: null,
    regionId: path[3] === 'region' ? path[4] : null
  };
}

function figureCaption(path, s) {
  const scene = mapScene(path);
  if (scene === 'origins') return s.figOrigins;
  if (scene === 'regions') return s.figRegions;
  return s.figHeadline;
}

export function renderExplorer(root, series, path, navigate) {
  const s = t();
  const lv = level(path);
  const head = path[0] ? LEVELS[path[0]] : null;
  const value = path[0] ? series.cur[path[0]] : null;
  const steps = s.dqafSteps;
  const stepSubs = s.dqafSubs;

  root.innerHTML = `
    <div class="brief">
      <div class="brief-topline">
        <div class="brief-crumb" data-crumb></div>
        <div class="brief-period">${s.refPeriod}</div>
      </div>
      <div class="brief-grid">
        <aside class="dqaf-rail" aria-label="DQAF layers">
          <div class="dqaf-lab">${s.dqafRail}</div>
          <div data-steps></div>
        </aside>
        <div class="brief-main">
          <div class="brief-figure">
            <div class="figure-cap">
              <span><b>${s.figure}</b> · ${figureCaption(path, s)}</span>
              <span>${s.unitNote}</span>
            </div>
            <div data-map></div>
          </div>
          <div class="brief-dossier" data-panel></div>
        </div>
      </div>
    </div>`;

  const crumb = $('[data-crumb]', root);
  crumbs(path, s, head || {}).forEach((p, i, arr) => {
    const here = i === arr.length - 1;
    const b = el(`<button type="button" class="${here ? 'is-here' : ''}">${p.label}</button>`);
    if (!here) b.onclick = () => navigate(p.path);
    crumb.appendChild(b);
    if (i < arr.length - 1) crumb.appendChild(el('<span class="sep">/</span>'));
  });

  const rail = $('[data-steps]', root);
  steps.forEach((label, i) => {
    const isOn = lv === 0 ? i === 0 : (lv === 1 ? i === 0 : lv === 2 ? i === 1 : lv === 3 ? i === 2 : i === 3);
    const isDone = lv === 0 ? false : (lv === 1 ? false : i < (lv === 2 ? 1 : lv === 3 ? 2 : 3));
    rail.appendChild(el(`<div class="dqaf-step ${isDone ? 'is-done' : ''} ${isOn ? 'is-on' : ''}">
      <span class="n">0${i + 1}</span>
      <span class="l">${label}<span class="s">${stepSubs[i]}</span></span>
    </div>`));
  });

  renderSceneMap($('[data-map]', root), {
    fdi: series.cur.fdi,
    gfcf: series.cur.gfcf,
    scene: mapScene(path),
    focus: mapFocus(path),
    onPickMetric: (id) => navigate([id]),
    onPickOrigin: () => {
      if (path[0] === 'fdi' || !path.length) navigate(['fdi', 'comp', LEVELS.fdi.components[0][0]]);
    },
    onPickRegion: (r) => {
      if (path[1] === 'comp') navigate([path[0], 'comp', path[2], 'region', r.id]);
      else if (path[0]) navigate([path[0], 'comp', LEVELS[path[0]].components[0][0], 'region', r.id]);
    }
  });

  const panel = $('[data-panel]', root);

  if (!path.length) {
    renderBriefLanding(panel, navigate);
    return;
  }

  if (path.length === 1) {
    const total = head.components.reduce((a, c) => a + Number(c[1]), 0);
    const certified = isParentCertified(path[0]);
    const headName = getLang() === 'ar' ? (head.nameAr || head.name) : head.name;
    panel.innerHTML = `
      <div class="ep-k">${s.level1}</div>
      <div class="ep-headrow">
        <h2 class="ep-title">${headName}</h2>
        ${certChip(certified)}
      </div>
      ${certified ? '' : `<p class="ep-sub cert-warn">${s.certIncompleteHint}</p>`}
      <div class="ep-hero">${num(value, path[0] === 'gfcf' ? 0 : 1)}<span class="unit">${s.sarBn}</span></div>
      <p class="ep-sub">${s.provisional}</p>
      ${chain([
        [s.source, head.source],
        [s.method, head.method],
        [s.quality, s.sixGates],
        [s.owner, head.owner.split(' &')[0]],
        [s.state, head.state]
      ])}
      <div class="ep-k" style="margin-top:22px">${s.level2}</div>
      <div class="ep-list" data-list></div>
      <details class="tv"><summary>${s.viewTable}</summary>
        ${tableScroll(`<table class="wh-table is-static" style="margin-top:8px"><thead><tr><th>Component</th><th>SAR bn</th><th>Availability</th><th>Certified</th></tr></thead>
        <tbody>${head.components.map(c => `<tr><td>${c[0]}</td><td class="num">${num(c[1], path[0] === 'gfcf' ? 0 : 1)}</td><td>${c[2]}</td><td>${c[4] ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody></table>`)}
      </details>
      ${path[0] === 'fdi' ? `<p class="ep-sub" style="margin-top:14px">${s.flowsHint}</p>
        <div class="ep-origin-strip" data-origins></div>
        <details class="tv"><summary>${s.viewTable} · FDI origins</summary>
          ${tableScroll(`<table class="wh-table is-static" style="margin-top:8px"><thead><tr><th>Origin</th><th>SAR bn</th><th>Share</th></tr></thead>
          <tbody>${[...FDI_FLOWS].sort((a,b)=>b.value-a.value).map(f =>
            `<tr><td>${f.name}</td><td class="num">${num(f.value)}</td><td class="num">${Math.round(f.share*100)}%</td></tr>`).join('')}</tbody></table>`)}
        </details>` : ''}`;

    const list = $('[data-list]', panel);
    for (const [name, val, avail, detail, childCert] of head.components) {
      const row = el(`<button class="ep-row" type="button">
        <span>
          <span class="name">${name}</span>
          <span class="note">${avail}${detail ? ' · ' + detail : ''} · ${childCert ? s.certComplete : s.certIncomplete}</span>
          <span class="bar"><i style="width:${Math.max(8, (val / total) * 100)}%"></i></span>
        </span>
        <span class="val">${num(val, path[0] === 'gfcf' ? 0 : 1)}</span>
        <span class="chev">›</span>
      </button>`);
      row.onclick = () => navigate([path[0], 'comp', name]);
      list.appendChild(row);
    }

    const origins = $('[data-origins]', panel);
    if (origins) {
      for (const f of [...FDI_FLOWS].sort((a, b) => b.value - a.value).slice(0, 6)) {
        origins.appendChild(el(`<button class="origin-chip" type="button">
          <b>${f.name.replace('United Arab Emirates', 'UAE').replace('United States', 'USA').replace('United Kingdom', 'UK')}</b>
          <span>${num(f.value)}</span></button>`));
      }
      for (const b of origins.querySelectorAll('.origin-chip')) {
        b.onclick = () => navigate(['fdi', 'comp', head.components[0][0]]);
      }
    }
    return;
  }

  if (path[1] === 'comp' && path.length === 3) {
    const comp = head.components.find(c => c[0] === path[2]);
    panel.innerHTML = `
      <div class="ep-k">${s.level2Title}</div>
      <div class="ep-headrow">
        <h2 class="ep-title">${path[2]}</h2>
        ${certChip(!!comp?.[4])}
      </div>
      <div class="ep-hero">${num(comp?.[1] ?? 0, path[0] === 'gfcf' ? 0 : 1)}<span class="unit">${s.sarBn}</span></div>
      <p class="ep-sub">${comp?.[3] || ''}</p>
      ${chain([
        [s.source, head.source],
        [s.method, head.method],
        [s.quality, s.sixGatesPassed],
        [s.owner, head.owner.split(' &')[0]],
        [s.state, head.state]
      ])}
      <div class="ep-dim">
        <button type="button" class="imap-mode is-on" data-dim="sector">${s.bySector}</button>
        <button type="button" class="imap-mode" data-dim="region">${s.byRegion}</button>
      </div>
      <div class="ep-k" style="margin-top:14px">${s.level3Cut}</div>
      <div class="ep-list" data-list></div>
      <details class="tv"><summary>${s.viewTable}</summary><div class="wh-table-wrap" data-cut-table></div></details>`;

    const list = $('[data-list]', panel);
    const tableHost = $('[data-cut-table]', panel);
    const drawCut = (cut) => {
      for (const b of panel.querySelectorAll('[data-dim]')) b.classList.toggle('is-on', b.dataset.dim === cut);
      list.innerHTML = '';
      if (cut === 'sector') {
        const total = SECTORS.reduce((a, x) => a + Number(x[1]), 0);
        tableHost.innerHTML = tableScroll(`<table class="wh-table is-static" style="margin-top:8px"><thead><tr><th>Sector</th><th>SAR bn</th><th>ISIC</th><th>YoY</th></tr></thead>
          <tbody>${SECTORS.map(x => `<tr><td>${x[0]}</td><td class="num">${num(x[1])}</td><td>${x[2]}</td><td class="num">${x[3]}</td></tr>`).join('')}</tbody></table>`);
        for (const [name, val, isic, yoy] of SECTORS) {
          const row = el(`<button class="ep-row" type="button">
            <span><span class="name">${name}</span><span class="note">${isic} · ${yoy}</span>
            <span class="bar"><i style="width:${Math.max(8, (val / total) * 100)}%"></i></span></span>
            <span class="val">${num(val)}</span><span class="chev">›</span></button>`);
          row.onclick = () => navigate([path[0], 'comp', path[2], 'sector', name]);
          list.appendChild(row);
        }
      } else {
        const key = path[0];
        tableHost.innerHTML = tableScroll(`<table class="wh-table is-static" style="margin-top:8px"><thead><tr><th>Region</th><th>FDI</th><th>GFCF</th></tr></thead>
          <tbody>${KSA_REGIONS.map(r => `<tr><td>${r.name}</td><td class="num">${num(r.fdi)}</td><td class="num">${num(r.gfcf, 0)}</td></tr>`).join('')}</tbody></table>`);
        for (const r of [...KSA_REGIONS].sort((a, b) => b[key] - a[key])) {
          const row = el(`<button class="ep-row" type="button">
            <span><span class="name">${r.name}</span><span class="note">Regional ${key.toUpperCase()}</span></span>
            <span class="val">${num(r[key], key === 'gfcf' ? 0 : 1)}</span><span class="chev">›</span></button>`);
          row.onclick = () => navigate([path[0], 'comp', path[2], 'region', r.id]);
          list.appendChild(row);
        }
      }
    };
    for (const b of panel.querySelectorAll('[data-dim]')) b.onclick = () => drawCut(b.dataset.dim);
    drawCut('sector');
    return;
  }

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
      <div class="ep-k">${isSector ? s.level3Sector : s.level3Region}</div>
      <h2 class="ep-title">${label}</h2>
      <p class="ep-sub">${isSector
        ? `${sector?.[2] || ''} · ${sector?.[4] || ''} · ${sector?.[3] || ''}`
        : `Regional ${path[0].toUpperCase()} ${region ? num(region[path[0]], path[0] === 'gfcf' ? 0 : 1) + ' ' + s.sarBn : ''}`}</p>
      ${chain([
        [s.source, head.source],
        [s.method, head.method],
        [s.quality, s.sixGatesPassed],
        [s.owner, head.owner.split(' &')[0]],
        [s.state, head.state]
      ])}
      <div class="ep-k" style="margin-top:18px">${s.level4}</div>
      <div class="ep-list" data-list></div>
      <details class="tv"><summary>${s.viewTable}</summary>
        ${tableScroll(`<table class="wh-table is-static" style="margin-top:8px"><thead><tr><th>Record</th><th>Type</th><th>Region</th><th>Date</th><th>SAR bn</th><th>Evidence</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td class="mono">${r.id}</td><td>${r.type}</td><td>${r.region}</td><td>${r.date}</td><td class="num">${num(r.value)}</td><td>${r.evidence}</td></tr>`).join('')}</tbody></table>`)}
      </details>
      <div data-detail></div>`;

    const list = $('[data-list]', panel);
    const detail = $('[data-detail]', panel);
    for (const r of rows) {
      const row = el(`<button class="ep-row" type="button" style="grid-template-columns:1fr auto">
        <span>
          <span class="name mono">${r.id}</span>
          <span class="note">${r.type} · ${r.region} · ${r.date} · ${r.evidence}</span>
        </span>
        <span class="val">${num(r.value)}</span>
      </button>`);
      row.onclick = () => {
        for (const x of list.querySelectorAll('.ep-row')) x.classList.toggle('is-on', x === row);
        detail.innerHTML = `
          <div class="ep-record">
            <div class="ep-k">${s.level4Record}</div>
            <div class="ep-title">${r.id}</div>
            <div class="ep-grid">
              <div><div class="lab">Value</div><div class="val">${num(r.value)} ${s.sarBn}</div></div>
              <div><div class="lab">Type</div><div class="val">${r.type}</div></div>
              <div><div class="lab">Region</div><div class="val">${r.region}</div></div>
              <div><div class="lab">Date</div><div class="val">${r.date}</div></div>
              <div><div class="lab">Investor</div><div class="val">${r.investor}</div></div>
              <div><div class="lab">Entity</div><div class="val">${r.entity}</div></div>
              <div><div class="lab">Evidence</div><div class="val">${r.evidence}</div></div>
              <div><div class="lab">Steward</div><div class="val">${r.steward}</div></div>
            </div>
            ${chain([
              [s.source, r.evidence],
              [s.method, head.method],
              [s.quality, 'Record-level'],
              [s.owner, r.steward],
              [s.state, s.certComplete]
            ])}
            <div style="margin-top:10px"><div class="lab">Lineage</div><div class="body" style="margin-top:4px">${r.lineage}</div></div>
          </div>`;
      };
      list.appendChild(row);
    }
  }
}
