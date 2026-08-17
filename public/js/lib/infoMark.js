import { showTip, hideTip } from './tooltip.js';
import { t } from '../i18n.js';

function copy(id) {
  const row = t().info?.[id];
  if (row?.body) return row;
  return null;
}

function tipHtml(id) {
  const row = copy(id);
  if (!row) return '';
  return `<b>${row.title}</b>${row.body}`;
}

export function bindInfo(root = document) {
  for (const node of root.querySelectorAll('[data-info]')) {
    if (node.dataset.infoBound) continue;
    node.dataset.infoBound = '1';
    const html = () => tipHtml(node.dataset.info);
    node.addEventListener('mousemove', (e) => {
      const body = html();
      if (!body) return;
      showTip(e, body);
    });
    node.addEventListener('mouseleave', hideTip);
    node.addEventListener('blur', hideTip);
    node.addEventListener('click', hideTip);
  }
}
