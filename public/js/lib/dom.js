export const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); return node; };
export const tableScroll = (html) => `<div class="wh-table-wrap">${html}</div>`;
