/**
 * Accurate world map for FDI into the Kingdom.
 * Land is Natural Earth 110m. Arrows are drawn only when a counterpart row exists
 * (Invest Saudi immediate-country series, or any {id, name, lon, lat, value} list).
 */
import { num } from '../lib/format.js';
import { showTip, hideTip } from '../lib/tooltip.js';
import { flagSrc, flagImg } from '../lib/flags.js';

let worldCache = null;
const ZOOM = { k: 1, cx: 480, cy: 260 };
const K_MIN = 1;
const K_MAX = 6;
const K_STEP = 1.4;

export async function loadWorld() {
  if (worldCache) return worldCache;
  const res = await fetch('./data/world-110m.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('World map failed to load');
  worldCache = await res.json();
  return worldCache;
}

const Riyadh = { lon: 46.72, lat: 24.69 };

function css(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function project(lon, lat, W, H, lon0 = 45) {
  let x = lon - lon0;
  if (x > 180) x -= 360;
  if (x < -180) x += 360;
  return [((x + 180) / 360) * W, ((90 - lat) / 180) * H];
}

function ringToPath(ring, W, H) {
  let d = '';
  let started = false;
  let prev = null;
  for (const [lon, lat] of ring) {
    const p = project(lon, lat, W, H);
    if (prev && Math.abs(p[0] - prev[0]) > W * 0.5) {
      d += `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    } else {
      d += `${started ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    }
    started = true;
    prev = p;
  }
  return d + 'Z';
}

function geomToPath(geom, W, H) {
  if (geom.type === 'Polygon') return geom.coordinates.map(r => ringToPath(r, W, H)).join('');
  return geom.coordinates.map(poly => poly.map(r => ringToPath(r, W, H)).join('')).join('');
}

function toVec(lon, lat) {
  const lo = lon * Math.PI / 180, la = lat * Math.PI / 180;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}

function fromVec(v) {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  const x = v[0] / n, y = v[1] / n, z = v[2] / n;
  return [Math.atan2(y, x) * 180 / Math.PI, Math.asin(Math.max(-1, Math.min(1, z))) * 180 / Math.PI];
}

function greatCircle(a, b, steps = 32) {
  const A = toVec(a.lon, a.lat), B = toVec(b.lon, b.lat);
  let dot = A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
  dot = Math.max(-1, Math.min(1, dot));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return [[a.lon, a.lat], [b.lon, b.lat]];
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s1 = Math.sin((1 - t) * omega) / Math.sin(omega);
    const s2 = Math.sin(t * omega) / Math.sin(omega);
    pts.push(fromVec([A[0] * s1 + B[0] * s2, A[1] * s1 + B[1] * s2, A[2] * s1 + B[2] * s2]));
  }
  return pts;
}

function gcPath(a, b, W, H) {
  const pts = greatCircle(a, b).map(([lon, lat]) => project(lon, lat, W, H));
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    if (Math.abs(pts[i][0] - pts[i - 1][0]) > W * 0.45) d += `M${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
    else d += `L${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  }
  return { d, tip: pts[Math.max(0, pts.length - 2)], end: pts[pts.length - 1] };
}

function shortName(name) {
  return ({
    'United States': 'United States',
    'United Arab Emirates': 'UAE',
    'United Kingdom': 'UK',
    'China, Hong Kong SAR': 'Hong Kong',
    'Korea, Republic of': 'Korea',
    'Yemen, Republic of': 'Yemen',
    'Syrian Arab Republic': 'Syria',
    'Russian Federation': 'Russia'
  })[name] || name;
}

function labelWidth(text) {
  return 20 + text.length * 6.05;
}

function labelBox(x, y, w, h, end) {
  const left = end ? x - w : x;
  return { left, top: y - h + 3, w, h, x, y, end };
}

function boxHits(box, taken, W, H, rx, ry) {
  if (box.left < 6 || box.top < 4 || box.left + box.w > W - 6 || box.top + box.h > H - 6) return true;
  const cx = box.left + box.w / 2;
  const cy = box.top + box.h / 2;
  if (Math.hypot(cx - rx, cy - ry) < 54) return true;
  for (const t of taken) {
    if (!(box.left + box.w + 10 < t.left || t.left + t.w + 10 < box.left
      || box.top + box.h + 8 < t.top || t.top + t.h + 8 < box.top)) return true;
  }
  return false;
}

function placeLabel(ox, oy, rx, ry, W, H, taken, text) {
  const w = labelWidth(text);
  const h = 16;
  const awayX = ox <= rx ? -1 : 1;
  const awayY = oy <= ry ? -1 : 1;
  const offsets = [
    [awayX * 30, awayY * 6],
    [awayX * 30, -awayY * 18],
    [awayX * 48, awayY * 2],
    [awayX * 22, awayY * 24],
    [awayX * 64, -14],
    [awayX * 64, 18],
    [8, awayY * 30],
    [8, -awayY * 30],
    [-awayX * 40, awayY * 8],
    [awayX * 80, awayY * 22],
    [awayX * 80, -awayY * 26],
    [awayX * 16, awayY * 44],
    [-awayX * 56, -awayY * 22],
    [awayX * 36, awayY * 56],
    [-awayX * 24, awayY * 40]
  ];
  for (const [dx, dy] of offsets) {
    const end = dx < 0;
    const x = Math.max(10, Math.min(W - 10, ox + dx));
    const y = Math.max(14, Math.min(H - 12, oy + dy));
    const box = labelBox(x, y, w, h, end);
    if (boxHits(box, taken, W, H, rx, ry)) continue;
    taken.push(box);
    return { x, y, end, ox, oy };
  }
  const end = awayX < 0;
  const x = Math.max(10, Math.min(W - 10, ox + awayX * 36));
  const y = Math.max(14, Math.min(H - 12, oy + awayY * 48));
  const box = labelBox(x, y, w, h, end);
  taken.push(box);
  return { x, y, end, ox, oy };
}

export function renderFdiWorld(host, world, {
  row,
  maxStock,
  origins = [],
  arrows = origins,
  pinned = [],
  wash = arrows,
  maxValue,
  onPick,
  animate = true,
  labels = true,
  quietHub = false
} = {}) {
  const W = 960, H = 520;
  const namedCap = document.documentElement.getAttribute('data-shell') === 'phone' ? 4 : 6;
  const ink = css('--ink', '#f4f4f5');
  const muted = css('--muted', '#8e8e96');
  const line = css('--line', '#2a2a2e');
  const land = css('--tint', '#222226');
  const page = css('--page', '#111114');
  const g800 = css('--g800', '#00714D');
  const gold = css('--accent', '#C4A35A');
  const [rx, ry] = project(Riyadh.lon, Riyadh.lat, W, H);
  const stockR = 8 + ((row?.stock || 0) / (maxStock || 1)) * 22;
  const inflowR = 4 + ((row?.inflow || 0) / Math.max(1, row?.stock || 1)) * 10;

  const originById = new Map(origins.filter(o => o.id).map(o => [o.id, o]));
  const washSet = new Set((wash || arrows).map(o => o.id).filter(Boolean));
  const pinSet = new Set(pinned);
  const lands = world.countries.map(c => {
    const d = geomToPath(c.g, W, H);
    const sau = c.id === 'SAU';
    const origin = originById.get(c.id);
    const lit = washSet.has(c.id);
    const canPick = !sau && origin && origin.lon != null && (origin.value || 0) > 0;
    return `<path data-iso="${c.id}" data-name="${c.n}" d="${d}"
      fill="${sau ? g800 : land}" stroke="${sau ? gold : lit ? gold : line}"
      stroke-width="${sau ? 1.1 : lit ? 0.7 : 0.4}"
      class="fdi-land${sau ? ' is-ksa' : ''}${lit ? ' is-origin' : ''}${canPick ? ' is-pick' : ''}${pinSet.has(c.id) ? ' is-pin' : ''}"/>`;
  }).join('');

  const graticule = [];
  for (let lat = -60; lat <= 75; lat += 15) {
    const a = project(-180, lat, W, H), b = project(180, lat, W, H);
    graticule.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`);
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const a = project(lon, 80, W, H), b = project(lon, -70, W, H);
    graticule.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`);
  }

  const maxO = maxValue || Math.max(0, ...arrows.map(o => o.value));
  const taken = quietHub ? [] : [{ left: 8, top: H - 40, w: 240, h: 36, x: 8, y: H - 8, end: false }];
  const flows = arrows.map((o, i) => {
    const { d, tip, end } = gcPath({ lon: o.lon, lat: o.lat }, Riyadh, W, H);
    const w = 1.2 + (o.value / (maxO || 1)) * 4.2;
    const ang = Math.atan2(end[1] - tip[1], end[0] - tip[0]);
    const ah = 7;
    const head = `${end[0] + Math.cos(ang) * 2},${end[1] + Math.sin(ang) * 2}
      ${end[0] - Math.cos(ang - 0.45) * ah},${end[1] - Math.sin(ang - 0.45) * ah}
      ${end[0] - Math.cos(ang + 0.45) * ah},${end[1] - Math.sin(ang + 0.45) * ah}`;
    const [ox, oy] = project(o.lon, o.lat, W, H);
    const pin = pinSet.has(o.id);
    const lead = i === 0;
    const text = `${shortName(o.name)} ${num(o.value)}`;
    const named = labels && (i < namedCap || pin);
    const lab = named ? placeLabel(ox, oy, rx, ry, W, H, taken, text) : null;
    const src = flagSrc(o.id);
    const fx = lab ? (lab.end ? lab.x - 18 : lab.x) : 0;
    const fy = lab ? lab.y - 10 : 0;
    const flag = lab && src
      ? `<image class="fdi-flag-mark" href="${src}" x="${fx.toFixed(1)}" y="${fy.toFixed(1)}" width="14" height="10"/>`
      : '';
    const tx = lab ? (lab.end ? lab.x - 20 : lab.x + 16).toFixed(1) : '';
    const leader = lab && Math.hypot(lab.x - ox, lab.y - oy) > 22
      ? `<line class="fdi-callout" x1="${ox.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${lab.x.toFixed(1)}" y2="${(lab.y - 2).toFixed(1)}" stroke="${gold}" stroke-width="0.7" opacity="0.4"/>`
      : '';
    const label = lab
      ? `${leader}<text class="fdi-lab" x="${tx}" y="${lab.y.toFixed(1)}"
          text-anchor="${lab.end ? 'end' : 'start'}" fill="${ink}" font-size="11" font-weight="400">${text}</text>`
      : '';
    return `<g class="fdi-flow${pin ? ' is-pin' : ''}${lead ? ' is-lead' : ''}" data-origin="${o.id || i}" style="--i:${i}">
      <path class="fdi-arc" d="${d}" fill="none" stroke="${gold}" stroke-width="${w.toFixed(2)}"
        stroke-linecap="round" opacity="${lead || pin ? 1 : 0.78}"/>
      <polygon points="${head}" fill="${gold}" opacity="${lead || pin ? 1 : 0.85}"/>
      <circle cx="${ox}" cy="${oy}" r="${pin || lead ? 4.2 : 3}" fill="${gold}" stroke="${page}" stroke-width="1"/>
      ${flag}${label}
    </g>`;
  }).join('');

  host.innerHTML = `
    <svg class="fdi-world" viewBox="0 0 ${W} ${H}" width="100%" role="img"
      aria-label="World map. Foreign direct investment into the Kingdom, ${row?.year || ''}. Zoom, or click a counterpart to draw its inflow.">
      <rect width="${W}" height="${H}" fill="${page}"/>
      <g class="fdi-grat" stroke="${line}" stroke-width="0.4" opacity="0.45">${graticule.join('')}</g>
      <g class="fdi-lands">${lands}</g>
      <g class="fdi-flows">${flows}</g>
      <g class="fdi-ksa" pointer-events="none">
        <circle cx="${rx}" cy="${ry}" r="${stockR.toFixed(1)}" fill="${gold}" opacity="0.16"/>
        <circle cx="${rx}" cy="${ry}" r="${inflowR.toFixed(1)}" fill="${gold}" opacity="0.35"/>
        <circle cx="${rx}" cy="${ry}" r="3.4" fill="${gold}" stroke="${page}" stroke-width="1.4"/>
        ${quietHub ? '' : `<text x="16" y="${H - 18}" fill="${ink}" font-size="12" font-weight="700">Kingdom of Saudi Arabia</text>
        <text x="16" y="${H - 4}" fill="${muted}" font-size="11">Inflow ${num(row?.inflow)} SAR bn · ${row?.year}</text>`}
      </g>
    </svg>
    <div class="fdi-zoom" role="group" aria-label="Map zoom">
      <button type="button" class="fdi-zoom-btn" data-zoom="in" aria-label="Zoom in">+</button>
      <button type="button" class="fdi-zoom-btn" data-zoom="out" aria-label="Zoom out">−</button>
      <button type="button" class="fdi-zoom-btn" data-zoom="reset" aria-label="Reset zoom">1×</button>
    </div>`;

  if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const g of host.querySelectorAll('.fdi-flow')) {
      const arc = g.querySelector('.fdi-arc');
      if (!arc) continue;
      const len = Math.max(1, arc.getTotalLength());
      arc.style.setProperty('--len', `${len.toFixed(1)}`);
      g.classList.add('is-draw');
    }
  }

  for (const p of host.querySelectorAll('.fdi-land')) {
    const name = p.dataset.name;
    const iso = p.dataset.iso;
    const origin = origins.find(o => o.id === iso || o.name === name);
    p.addEventListener('mousemove', e => {
      const extra = origin
        ? `Inflow ${num(origin.value)} SAR bn${origin.value > 0 ? ' · click to draw the arrow' : ''}`
        : iso === 'SAU'
          ? `Stock ${num(row?.stock)} · net ${num(row?.net)} · inflow ${num(row?.inflow)} SAR bn`
          : 'No immediate-country row this year';
      showTip(e, `${flagImg(iso, name)}<b>${name}</b>${extra}`);
    });
    p.addEventListener('mouseleave', hideTip);
    p.addEventListener('click', () => {
      if (host.dataset.dragged) {
        delete host.dataset.dragged;
        return;
      }
      if (!onPick || iso === 'SAU') return;
      if (!origin || origin.lon == null || !(origin.value > 0)) return;
      onPick(origin);
    });
  }
  for (const g of host.querySelectorAll('.fdi-flow')) {
    const o = arrows.find(x => (x.id || '') === g.dataset.origin) || arrows[Number(g.dataset.origin)];
    if (!o) continue;
    g.addEventListener('mousemove', e => showTip(e, `${flagImg(o.id, o.name)}<b>${o.name}</b>Inflow ${num(o.value)} SAR bn`));
    g.addEventListener('mouseleave', hideTip);
  }

  bindMapZoom(host, host.querySelector('.fdi-world'), W, H, rx, ry);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function viewBox(W, H) {
  const w = W / ZOOM.k;
  const h = H / ZOOM.k;
  let x = ZOOM.cx - w / 2;
  let y = ZOOM.cy - h / 2;
  x = clamp(x, 0, W - w);
  y = clamp(y, 0, H - h);
  ZOOM.cx = x + w / 2;
  ZOOM.cy = y + h / 2;
  return `${x} ${y} ${w} ${h}`;
}

function clientToSvg(svg, clientX, clientY) {
  const r = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  return {
    x: vb.x + ((clientX - r.left) / r.width) * vb.width,
    y: vb.y + ((clientY - r.top) / r.height) * vb.height
  };
}

function zoomToward(W, H, nextK, sx, sy) {
  const prevK = ZOOM.k;
  const pw = W / prevK;
  const ph = H / prevK;
  const px = ZOOM.cx - pw / 2;
  const py = ZOOM.cy - ph / 2;
  const nx = (sx - px) / pw;
  const ny = (sy - py) / ph;
  ZOOM.k = clamp(nextK, K_MIN, K_MAX);
  const w = W / ZOOM.k;
  const h = H / ZOOM.k;
  ZOOM.cx = sx - (nx - 0.5) * w;
  ZOOM.cy = sy - (ny - 0.5) * h;
}

function bindMapZoom(host, svg, W, H, rx, ry) {
  if (!svg) return;
  svg.setAttribute('viewBox', viewBox(W, H));
  const inBtn = host.querySelector('[data-zoom="in"]');
  const outBtn = host.querySelector('[data-zoom="out"]');
  const resetBtn = host.querySelector('[data-zoom="reset"]');

  const paintZoom = () => {
    svg.setAttribute('viewBox', viewBox(W, H));
    if (inBtn) inBtn.disabled = ZOOM.k >= K_MAX;
    if (outBtn) outBtn.disabled = ZOOM.k <= K_MIN;
    if (resetBtn) resetBtn.disabled = ZOOM.k <= K_MIN + 0.01;
    svg.classList.toggle('is-zoomed', ZOOM.k > 1.01);
  };

  inBtn?.addEventListener('click', e => {
    e.stopPropagation();
    zoomToward(W, H, ZOOM.k * K_STEP, rx, ry);
    paintZoom();
  });
  outBtn?.addEventListener('click', e => {
    e.stopPropagation();
    zoomToward(W, H, ZOOM.k / K_STEP, ZOOM.cx, ZOOM.cy);
    paintZoom();
  });
  resetBtn?.addEventListener('click', e => {
    e.stopPropagation();
    ZOOM.k = 1;
    ZOOM.cx = W / 2;
    ZOOM.cy = H / 2;
    paintZoom();
  });

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const p = clientToSvg(svg, e.clientX, e.clientY);
    const next = e.deltaY < 0 ? ZOOM.k * K_STEP : ZOOM.k / K_STEP;
    zoomToward(W, H, next, p.x, p.y);
    paintZoom();
  }, { passive: false });

  let drag = null;
  svg.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const p = clientToSvg(svg, e.clientX, e.clientY);
    drag = { x: p.x, y: p.y, moved: false, id: e.pointerId };
    svg.setPointerCapture(e.pointerId);
    svg.classList.add('is-drag');
  });
  svg.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = clientToSvg(svg, e.clientX, e.clientY);
    const dx = p.x - drag.x;
    const dy = p.y - drag.y;
    if (Math.hypot(dx, dy) > 2) drag.moved = true;
    if (!drag.moved) return;
    ZOOM.cx -= dx;
    ZOOM.cy -= dy;
    paintZoom();
    const n = clientToSvg(svg, e.clientX, e.clientY);
    drag.x = n.x;
    drag.y = n.y;
    hideTip();
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.moved) host.dataset.dragged = '1';
    drag = null;
    svg.classList.remove('is-drag');
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  paintZoom();
}
