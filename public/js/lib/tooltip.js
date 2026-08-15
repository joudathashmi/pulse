const node = () => document.getElementById('tip');
export function showTip(event, html) {
  const t = node(); t.innerHTML = html; t.style.opacity = 1;
  const r = t.getBoundingClientRect();
  let x = event.clientX + 14, y = event.clientY - 10;
  if (x + r.width  > innerWidth  - 8) x = event.clientX - r.width - 14;
  if (y + r.height > innerHeight - 8) y = innerHeight - r.height - 8;
  t.style.left = `${x}px`; t.style.top = `${y}px`;
}
export function hideTip() { node().style.opacity = 0; }
/** Attach a hover tooltip to a mark. `content` receives the element. */
export function bindTip(node_, content) {
  node_.addEventListener('mousemove', e => showTip(e, content(node_)));
  node_.addEventListener('mouseleave', hideTip);
}
