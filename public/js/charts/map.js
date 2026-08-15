import { C } from '../config.js';
import { num } from '../lib/format.js';
import { showTip, hideTip } from '../lib/tooltip.js';
import { FDI_FLOWS, KSA_REGIONS, SAUDI_CENTER } from '../fixtures/flows.js';

const GEO = {
  saudi: [
    [34.6, 28.0], [36.0, 25.6], [38.5, 20.2], [41.0, 17.6], [42.6, 16.5], [43.4, 17.4],
    [47.0, 17.0], [52.0, 19.0], [55.7, 22.0], [52.6, 24.1], [51.6, 24.4], [50.8, 24.7],
    [50.2, 26.2], [48.8, 28.5], [47.6, 29.5], [46.5, 29.1], [44.7, 29.2], [42.0, 31.1],
    [39.3, 32.2], [37.5, 31.0], [36.0, 29.5]
  ],
  peninsula: [
    [42.6, 16.5], [43.5, 12.7], [45.5, 12.7], [48.2, 14.0], [52.2, 15.6], [54.5, 17.0],
    [56.3, 17.9], [58.7, 20.5], [59.8, 22.5], [56.6, 24.6], [55.9, 25.8], [54.0, 24.4],
    [52.5, 24.2], [52.0, 19.0], [47.0, 17.0], [43.4, 17.4]
  ],
  africa: [
    [32.3, 31.4], [29.0, 31.2], [25.0, 31.5], [20.0, 32.8], [15.0, 32.4], [11.0, 33.9],
    [10.2, 37.2], [8.0, 36.9], [3.0, 36.7], [-1.0, 35.8], [-5.4, 35.9], [-8.5, 33.2],
    [-9.8, 30.0], [-13.0, 27.7], [-16.0, 22.0], [-17.0, 16.0], [-16.0, 13.0],
    [-13.5, 10.5], [-9.0, 7.0], [-4.0, 5.4], [1.0, 6.0], [6.0, 4.2], [9.5, 4.0],
    [9.5, 0.0], [13.0, -4.5], [12.0, -6.0], [13.5, -11.0], [12.5, -17.0], [20.0, -20.0],
    [32.0, -20.0], [40.0, -14.0], [40.6, -10.5], [39.2, -6.9], [41.8, -2.0], [45.0, 2.0],
    [48.5, 5.0], [51.4, 11.8], [48.0, 11.5], [44.0, 10.4], [43.3, 12.0], [39.5, 15.0],
    [37.2, 21.8], [34.5, 28.0], [34.9, 29.5]
  ],
  north: [
    [34.2, 31.2], [34.5, 33.2], [35.9, 35.5], [36.0, 36.4], [34.0, 36.2], [31.0, 36.8],
    [29.0, 36.2], [27.0, 36.7], [26.2, 38.5], [26.5, 40.2], [29.0, 41.0], [31.0, 41.2],
    [35.0, 42.0], [38.0, 41.0], [41.0, 41.4], [45.0, 40.3], [48.5, 38.5], [50.0, 37.4],
    [52.0, 36.7], [54.0, 37.0], [53.9, 37.9], [56.0, 38.0], [59.0, 37.7], [61.0, 36.0],
    [61.6, 32.0], [61.0, 29.8], [58.0, 26.8], [55.5, 26.6], [53.0, 27.0], [50.0, 29.8],
    [48.6, 30.1], [47.9, 30.0], [47.7, 31.0], [45.0, 33.0], [42.0, 33.5], [40.0, 34.5],
    [38.8, 33.4], [38.0, 32.5], [35.0, 32.3]
  ],
  india: [
    [61.6, 25.0], [64.0, 25.0], [66.0, 25.5], [68.0, 23.8], [70.0, 21.0], [72.8, 19.0],
    [73.5, 15.0], [76.0, 8.5], [78.0, 8.5], [80.2, 13.0], [80.3, 16.0], [82.0, 17.0],
    [85.0, 19.8], [87.0, 21.5], [89.0, 22.0], [88.5, 26.0], [85.0, 27.0], [81.0, 29.0],
    [77.0, 32.0], [74.0, 34.0], [71.0, 36.0], [68.0, 37.0], [65.0, 35.0], [61.6, 32.0]
  ],
  europe: [
    [-9.3, 43.5], [-9.5, 38.0], [-6.2, 36.0], [-2.2, 36.7], [0.7, 40.7], [3.3, 43.0],
    [7.5, 43.7], [10.5, 44.0], [12.4, 44.2], [13.5, 45.7], [15.5, 44.0], [16.2, 42.5],
    [18.5, 40.3], [19.3, 41.6], [20.0, 39.5], [21.0, 37.0], [23.0, 38.0], [24.0, 40.5],
    [26.2, 40.2], [26.5, 41.5], [28.8, 43.4], [30.5, 46.0], [33.0, 46.3], [36.0, 45.2],
    [38.0, 46.8], [39.5, 48.5], [34.0, 50.5], [26.0, 50.5], [18.0, 49.5], [10.0, 49.0],
    [2.0, 49.5], [-2.0, 48.0], [-4.5, 44.5]
  ]
};

function projectOrtho(lon0, lat0, R, cx, cy) {
  const d = Math.PI / 180;
  const l0 = lon0 * d, p0 = lat0 * d;
  const sp0 = Math.sin(p0), cp0 = Math.cos(p0);
  return (lon, lat) => {
    const l = lon * d, p = lat * d;
    const sp = Math.sin(p), cp = Math.cos(p);
    const dl = l - l0;
    const cosC = sp0 * sp + cp0 * cp * Math.cos(dl);
    return [cx + R * cp * Math.sin(dl), cy - R * (cp0 * sp - sp0 * cp * Math.cos(dl)), cosC > 0.02];
  };
}

function pathFrom(coords, project) {
  return coords.map((c, i) => {
    const [x, y] = project(c[0], c[1]);
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ') + ' Z';
}

/** Quiet IMF-style great-circle hint (quadratic, no dash animation). */
function arc(x1, y1, x2, y2, bend = 0.22) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${(mx - dy * bend).toFixed(1)} ${(my + dx * bend).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/**
 * Analytical map - DataMapper vocabulary:
 * land wash, solid proportional flow arcs, labeled origins, Saudi as focus.
 */
export function renderSceneMap(host, {
  fdi, gfcf, scene = 'headline', focus = {},
  onPickMetric, onPickOrigin, onPickRegion
}) {
  const W = 920, H = 500, R = 220, cx = 450, cy = 255;
  const uid = `s${Math.random().toString(36).slice(2, 7)}`;
  const project = projectOrtho(32, 12, R, cx, cy);
  const [sx, sy] = project(SAUDI_CENTER.lon, SAUDI_CENTER.lat);

  const shapes = Object.fromEntries(
    Object.entries(GEO).map(([k, v]) => [k, pathFrom(v, project)])
  );

  const graticule = [];
  for (let lat = -20; lat <= 55; lat += 15) {
    const pts = [];
    for (let lon = -30; lon <= 110; lon += 4) {
      const [x, y, vis] = project(lon, lat);
      if (vis) pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    if (pts.length > 2) graticule.push('M' + pts.join(' L'));
  }

  const showFlows = scene === 'origins' || (scene === 'headline' && focus.metric === 'fdi');
  const showRegions = scene === 'regions';
  const hotOrigin = focus.originId || null;
  const hotRegion = focus.regionId || null;
  const hotMetric = focus.metric || null;

  let flowLayer = '';
  if (showFlows || scene === 'origins') {
    const max = Math.max(...FDI_FLOWS.map(f => f.value));
    const ranked = [...FDI_FLOWS].sort((a, b) => b.value - a.value);
    ranked.forEach((f, i) => {
      const [x, y, vis] = project(f.lon, f.lat);
      const ox = vis ? x : (f.id === 'us' ? 118 : 138);
      const oy = vis ? y : (f.id === 'us' ? 148 : 158);
      const active = !hotOrigin || hotOrigin === f.id;
      const w = 0.9 + (f.value / max) * 3.2;
      const d = arc(ox, oy, sx, sy, 0.18 + (i % 3) * 0.03);
      const short = f.name.replace('United Arab Emirates', 'UAE').replace('United States', 'USA')
        .replace('United Kingdom', 'UK').split(' ')[0];
      flowLayer += `
        <path class="x-flow" data-origin="${f.id}" d="${d}" fill="none"
          stroke="${C.g800}" stroke-width="${w.toFixed(2)}" stroke-linecap="butt"
          opacity="${active ? 0.55 + (f.value / max) * 0.35 : 0.08}" style="cursor:pointer"/>
        <g class="x-origin" data-origin="${f.id}" style="cursor:pointer;opacity:${active ? 1 : 0.18}">
          <circle cx="${ox}" cy="${oy}" r="3.2" fill="${C.g800}" stroke="#F3F5F4" stroke-width="1.5"/>
          <text x="${ox + 6}" y="${oy - 6}" font-size="10" font-weight="600" fill="${C.ink}"
            font-family="Calibri, Segoe UI, Arial, sans-serif">${short}</text>
          <text x="${ox + 6}" y="${oy + 6}" font-size="10" font-weight="500" fill="${C.mut}"
            font-family="Calibri, Segoe UI, Arial, sans-serif">${num(f.value)}</text>
        </g>`;
    });
  }

  let regionLayer = '';
  if (showRegions) {
    const max = Math.max(...KSA_REGIONS.map(r => r.fdi));
    for (const r of KSA_REGIONS) {
      const [x, y, vis] = project(r.lon, r.lat);
      if (!vis) continue;
      const rad = 7 + (r.fdi / max) * 16;
      const on = hotRegion === r.id;
      regionLayer += `
        <g class="x-region" data-region="${r.id}" style="cursor:pointer;opacity:${!hotRegion || on ? 1 : 0.28}">
          <circle cx="${x}" cy="${y}" r="${rad}" fill="${C.g600}" fill-opacity="${on ? 0.28 : 0.14}" stroke="${C.g800}" stroke-width="1"/>
          <text x="${x}" y="${y + rad + 12}" text-anchor="middle" font-size="10" font-weight="600"
            fill="${C.ink}" font-family="Calibri, Segoe UI, Arial, sans-serif">${r.name}</text>
        </g>`;
    }
  }

  const fdiOn = hotMetric === 'fdi';
  const gfcfOn = hotMetric === 'gfcf';
  const markers = `
    <g class="x-metric" data-metric="fdi" style="cursor:pointer">
      <rect x="${sx - 118}" y="${sy - 92}" width="100" height="58" fill="${fdiOn ? C.g800 : '#FFFFFF'}"
        stroke="${C.g800}" stroke-width="${fdiOn ? 1.5 : 1}"/>
      <text x="${sx - 68}" y="${sy - 72}" text-anchor="middle" font-size="9" font-weight="600"
        letter-spacing="0.12em" fill="${fdiOn ? 'rgba(255,255,255,.7)' : C.mut}"
        font-family="Calibri, Segoe UI, Arial, sans-serif">FDI · BPM6</text>
      <text x="${sx - 68}" y="${sy - 48}" text-anchor="middle" font-size="20" font-weight="600"
        fill="${fdiOn ? '#fff' : C.ink}" font-family="Calibri, Segoe UI, Arial, sans-serif">${num(fdi)}</text>
    </g>
    <g class="x-metric" data-metric="gfcf" style="cursor:pointer">
      <rect x="${sx + 18}" y="${sy - 92}" width="108" height="58" fill="${gfcfOn ? C.g800 : '#FFFFFF'}"
        stroke="${C.g800}" stroke-width="${gfcfOn ? 1.5 : 1}"/>
      <text x="${sx + 72}" y="${sy - 72}" text-anchor="middle" font-size="9" font-weight="600"
        letter-spacing="0.12em" fill="${gfcfOn ? 'rgba(255,255,255,.7)' : C.mut}"
        font-family="Calibri, Segoe UI, Arial, sans-serif">GFCF · SNA</text>
      <text x="${sx + 72}" y="${sy - 48}" text-anchor="middle" font-size="20" font-weight="600"
        fill="${gfcfOn ? '#fff' : C.ink}" font-family="Calibri, Segoe UI, Arial, sans-serif">${num(gfcf, 0)}</text>
    </g>
    <circle cx="${sx}" cy="${sy}" r="4" fill="${C.g800}" stroke="#F3F5F4" stroke-width="1.5"/>`;

  host.innerHTML = `
    <div class="scene-map">
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="FDI and GFCF analytical map">
        <defs>
          <clipPath id="${uid}-clip"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
        </defs>
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="#F7F9F8"/>
        <g clip-path="url(#${uid}-clip)">
          <g stroke="#B8C6C0" stroke-width="0.4" fill="none" opacity="0.45">
            ${graticule.map(d => `<path d="${d}"/>`).join('')}
          </g>
          <path d="${shapes.africa}" fill="#D5DED9"/>
          <path d="${shapes.europe}" fill="#D0DBD5"/>
          <path d="${shapes.north}" fill="#C8D4CE"/>
          <path d="${shapes.india}" fill="#D2DCD6"/>
          <path d="${shapes.peninsula}" fill="#B7C8BF"/>
          <path d="${shapes.saudi}" fill="${C.g800}"/>
          <path d="${shapes.saudi}" fill="none" stroke="#06261C" stroke-width="0.6"/>
          ${flowLayer}
          ${regionLayer}
          ${markers}
        </g>
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#9AABA4" stroke-width="1"/>
      </svg>
    </div>`;

  for (const n of host.querySelectorAll('[data-metric]')) {
    n.addEventListener('click', () => onPickMetric?.(n.dataset.metric));
  }
  for (const n of host.querySelectorAll('[data-origin]')) {
    const f = FDI_FLOWS.find(x => x.id === n.dataset.origin);
    if (!f) continue;
    const tip = `<b>${f.name}</b>Inflow ${num(f.value)} SAR bn · ${Math.round(f.share * 100)}% of FDI`;
    n.addEventListener('mouseenter', e => showTip(e, tip));
    n.addEventListener('mousemove', e => showTip(e, tip));
    n.addEventListener('mouseleave', hideTip);
    n.addEventListener('click', () => { hideTip(); onPickOrigin?.(f); });
  }
  for (const n of host.querySelectorAll('[data-region]')) {
    const r = KSA_REGIONS.find(x => x.id === n.dataset.region);
    if (!r) continue;
    const tip = `<b>${r.name}</b>FDI ${num(r.fdi)} · GFCF ${num(r.gfcf, 0)} SAR bn`;
    n.addEventListener('mouseenter', e => showTip(e, tip));
    n.addEventListener('mousemove', e => showTip(e, tip));
    n.addEventListener('mouseleave', hideTip);
    n.addEventListener('click', () => { hideTip(); onPickRegion?.(r); });
  }
}
