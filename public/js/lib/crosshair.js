import { showTip, hideTip } from './tooltip.js';

function svgPoint(svg, clientX, clientY) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(ctm.inverse());
}

function svgLine(ns, cls) {
  const el = document.createElementNS(ns, 'line');
  el.setAttribute('class', cls);
  el.setAttribute('pointer-events', 'none');
  return el;
}

/**
 * Vertical + horizontal cross on a cartesian SVG.
 * points: [{ x, y, ys?, tip }] in viewBox units.
 */
export function bindCrosshair(svg, { plot, points, color } = {}) {
  if (!svg || !points?.length) return () => {};
  const ns = 'http://www.w3.org/2000/svg';
  const vb = svg.viewBox?.baseVal;
  const box = plot || {
    x0: 0,
    y0: 0,
    x1: vb?.width || 0,
    y1: vb?.height || 0
  };

  svg.querySelector('.chart-cross')?.remove();
  svg.querySelector('.chart-cross-hit')?.remove();

  const g = document.createElementNS(ns, 'g');
  g.setAttribute('class', 'chart-cross');
  g.setAttribute('opacity', '0');
  if (color) g.style.color = color;

  const v = svgLine(ns, 'chart-cross-v');
  const h = svgLine(ns, 'chart-cross-h');
  const mark = document.createElementNS(ns, 'circle');
  mark.setAttribute('class', 'chart-cross-dot');
  mark.setAttribute('r', '4');
  mark.setAttribute('pointer-events', 'none');
  g.append(v, h, mark);
  svg.appendChild(g);

  const hit = document.createElementNS(ns, 'rect');
  hit.setAttribute('class', 'chart-cross-hit');
  hit.setAttribute('fill', 'transparent');
  hit.setAttribute('x', String(box.x0));
  hit.setAttribute('y', String(box.y0));
  hit.setAttribute('width', String(Math.max(0, box.x1 - box.x0)));
  hit.setAttribute('height', String(Math.max(0, box.y1 - box.y0)));
  svg.appendChild(hit);

  const show = (e) => {
    const p = svgPoint(svg, e.clientX, e.clientY);
    let best = points[0];
    let dist = Infinity;
    for (const pt of points) {
      const d = Math.abs(pt.x - p.x);
      if (d < dist) {
        dist = d;
        best = pt;
      }
    }
    const ys = best.ys?.length ? best.ys : [best.y];
    let y = ys[0];
    let yDist = Infinity;
    for (const yy of ys) {
      const d = Math.abs(yy - p.y);
      if (d < yDist) {
        yDist = d;
        y = yy;
      }
    }
    v.setAttribute('x1', best.x);
    v.setAttribute('x2', best.x);
    v.setAttribute('y1', box.y0);
    v.setAttribute('y2', box.y1);
    h.setAttribute('x1', box.x0);
    h.setAttribute('x2', box.x1);
    h.setAttribute('y1', y);
    h.setAttribute('y2', y);
    mark.setAttribute('cx', best.x);
    mark.setAttribute('cy', y);
    g.setAttribute('opacity', '1');
    if (best.tip) showTip(e, best.tip);
  };

  const hide = () => {
    g.setAttribute('opacity', '0');
    hideTip();
  };

  hit.addEventListener('pointerdown', show);
  hit.addEventListener('pointermove', show);
  hit.addEventListener('pointerleave', hide);
  hit.addEventListener('pointercancel', hide);
  return hide;
}

/** Read [data-pt] marks and data-plot="x0,y0,x1,y1" from an SVG. */
export function bindMarkedChart(svg) {
  if (!svg) return () => {};
  const points = [...svg.querySelectorAll('[data-pt]')].map(n => ({
    x: Number(n.getAttribute('cx') || n.dataset.x || 0),
    y: Number(n.getAttribute('cy') || n.dataset.y || 0),
    ys: n.dataset.ys ? n.dataset.ys.split(',').map(Number) : undefined,
    tip: n.dataset.tip || ''
  }));
  if (!points.length) return () => {};
  const raw = (svg.dataset.plot || '').split(',').map(Number);
  const plot = raw.length === 4 && raw.every(Number.isFinite)
    ? { x0: raw[0], y0: raw[1], x1: raw[2], y1: raw[3] }
    : undefined;
  return bindCrosshair(svg, { plot, points });
}

export function bindCharts(root) {
  if (!root) return;
  for (const svg of root.querySelectorAll('svg[data-plot], svg.wh-chart, svg.fdi-spark')) {
    if (svg.querySelector('[data-pt]')) bindMarkedChart(svg);
  }
}
