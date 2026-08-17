export const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); return node; };
export const tableScroll = (html) => `<div class="wh-table-wrap">${html}</div>`;

export function pinWindow(fn) {
  const x = window.scrollX;
  const y = window.scrollY;
  const restore = () => window.scrollTo({ left: x, top: y, behavior: 'auto' });
  const out = fn();
  restore();
  requestAnimationFrame(restore);
  return out;
}

export function intoViewIfNeeded(el, { behavior = 'auto', block = 'nearest', inline = 'nearest', pad = 48 } = {}) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  if (r.top >= pad && r.bottom <= vh - 8 && r.left >= 0 && r.right <= vw) return;
  el.scrollIntoView({ behavior, block, inline });
}

export function stayPutOnDetails(root = document) {
  root.addEventListener('click', (e) => {
    const summary = e.target.closest?.('summary');
    if (!summary || !root.contains(summary)) return;
    if (e.target.closest('a, button, input, textarea, select, label')) return;
    const details = summary.parentElement;
    if (!(details instanceof HTMLDetailsElement)) return;
    e.preventDefault();
    pinWindow(() => {
      details.open = !details.open;
    });
  }, true);
}
