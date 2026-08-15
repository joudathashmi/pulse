/**
 * Living pulse orb - thick glowing particle ring, dark core, target arc.
 * Inspired by biometric “healthspan” orbs; not a flat progress circle.
 * Respects prefers-reduced-motion.
 */

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mountPulseOrb(canvas, {
  color = '#E8A84A',
  fill = 0.86
} = {}) {
  if (!canvas) return { destroy() {}, set() {} };
  const ctx = canvas.getContext('2d', { alpha: true });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let hue = color;
  let progress = fill;
  let [cr, cg, cb] = hexToRgb(hue);
  let raf = 0;
  let t = 0;
  let w = 0;
  let dpr = 1;

  const ringN = reduced ? 70 : 220;
  const dustN = reduced ? 16 : 55;
  const ring = Array.from({ length: ringN }, () => ({
    a: Math.random() * Math.PI * 2,
    r: 0.90 + Math.random() * 0.16,
    s: (0.0012 + Math.random() * 0.0038) * (Math.random() < 0.5 ? -1 : 1),
    z: 0.7 + Math.random() * 2.8,
    o: 0.25 + Math.random() * 0.75,
    wob: Math.random() * Math.PI * 2
  }));
  const dust = Array.from({ length: dustN }, () => ({
    a: Math.random() * Math.PI * 2,
    r: 0.42 + Math.random() * 0.42,
    s: (0.0006 + Math.random() * 0.002) * (Math.random() < 0.5 ? -1 : 1),
    z: 0.4 + Math.random() * 1.6,
    o: 0.08 + Math.random() * 0.28
  }));

  const size = () => {
    const nextDpr = Math.min(2, window.devicePixelRatio || 1);
    const next = Math.round(canvas.clientWidth || 280);
    if (next === w && nextDpr === dpr) return w;
    w = next;
    dpr = nextDpr;
    canvas.width = w * dpr;
    canvas.height = w * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return w;
  };

  const draw = () => {
    const dim = size();
    const cx = dim / 2;
    const cy = dim / 2;
    const breath = reduced ? 1 : 1 + Math.sin(t * 0.018) * 0.028;
    const R = dim * 0.40 * breath;
    ctx.clearRect(0, 0, dim, dim);

    const light = document.documentElement.getAttribute('data-theme') === 'aurora';
    const pr = light ? Math.round(cr * 0.82) : cr;
    const pg = light ? Math.round(cg * 0.76) : cg;
    const pb = light ? Math.round(cb * 0.62) : cb;
    const bloom = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.55);
    bloom.addColorStop(0, `rgba(${pr},${pg},${pb},${light ? 0.08 : 0.10})`);
    bloom.addColorStop(0.45, `rgba(${pr},${pg},${pb},${light ? 0.12 : 0.16})`);
    bloom.addColorStop(0.72, `rgba(${pr},${pg},${pb},${light ? 0.04 : 0.05})`);
    bloom.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.55, 0, Math.PI * 2);
    ctx.fill();

    const core = ctx.createRadialGradient(cx, cy, 2, cx, cy, R * 0.82);
    if (light) {
      core.addColorStop(0, 'rgba(255,253,248,0.98)');
      core.addColorStop(0.62, 'rgba(248,244,236,0.88)');
      core.addColorStop(1, 'rgba(248,244,236,0)');
    } else {
      core.addColorStop(0, 'rgba(8,8,10,0.92)');
      core.addColorStop(0.7, 'rgba(8,8,10,0.55)');
      core.addColorStop(1, 'rgba(8,8,10,0)');
    }
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.82, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.shadowColor = `rgba(${pr},${pg},${pb},${light ? 0.45 : 0.9})`;
    ctx.shadowBlur = Math.max(light ? 14 : 22, dim * (light ? 0.06 : 0.1));
    ctx.strokeStyle = `rgba(${pr},${pg},${pb},${light ? 0.78 : 0.62})`;
    ctx.lineWidth = Math.max(12, dim * 0.046);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const clamped = Math.max(0.08, Math.min(1, progress));
    ctx.save();
    ctx.shadowColor = `rgba(${Math.min(255, pr + 40)},${Math.min(255, pg + 40)},${Math.min(255, pb + 40)},${light ? 0.45 : 0.85})`;
    ctx.shadowBlur = light ? 10 : 18;
    ctx.strokeStyle = `rgba(${Math.min(255, pr + 50)},${Math.min(255, pg + 50)},${Math.min(255, pb + 50)},0.95)`;
    ctx.lineWidth = Math.max(4, dim * 0.014);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamped);
    ctx.stroke();
    ctx.restore();

    const plot = (p, inner) => {
      if (!reduced) p.a += p.s;
      const jitter = inner ? 0 : Math.sin(t * 0.03 + p.wob) * 0.012;
      const rr = (p.r + jitter) * R;
      const x = cx + Math.cos(p.a) * rr;
      const y = cy + Math.sin(p.a) * rr;
      const twinkle = 0.55 + 0.45 * Math.sin(t * 0.025 + p.a * 3);
      ctx.globalAlpha = p.o * twinkle;
      ctx.fillStyle = inner
        ? `rgba(${Math.min(255, pr + 40)},${Math.min(255, pg + 40)},${Math.min(255, pb + 40)},1)`
        : `rgb(${pr},${pg},${pb})`;
      ctx.beginPath();
      ctx.arc(x, y, p.z, 0, Math.PI * 2);
      ctx.fill();
    };

    for (const p of dust) plot(p, true);
    for (const p of ring) plot(p, false);
    ctx.globalAlpha = 1;

    t += 1;
    if (!reduced) raf = requestAnimationFrame(draw);
  };

  draw();
  const onResize = () => {
    w = 0;
    if (reduced) draw();
  };
  window.addEventListener('resize', onResize);
  return {
    set(next = {}) {
      if (next.color) {
        hue = next.color;
        [cr, cg, cb] = hexToRgb(hue);
      }
      if (next.fill != null) progress = next.fill;
      if (reduced) draw();
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    }
  };
}
