import { el } from './dom.js';
import { getKpiMeta } from '../fixtures/kpiMeta.js';
import { t } from '../i18n.js';

let activePop = null;

function closePop() {
  if (activePop) {
    activePop.remove();
    activePop = null;
  }
}

/**
 * Signature mark on a KPI - hover/focus reveals definition, source, calculated-at.
 */
export function kpiMarkHtml(id) {
  return `<button type="button" class="kpi-mark" data-kpi="${id}" aria-label="KPI signature · definition and source" title="Definition · source · calculated">
    <span class="kpi-mark-seal" aria-hidden="true">◆</span>
  </button>`;
}

function bindHover(node, id, brief, onAskDefinition) {
  if (node.dataset.kpiBound) return;
  node.dataset.kpiBound = '1';
  const currentId = () => node.dataset.kpiDef || node.dataset.kpi || id;
  const show = () => openMarkPopover(node, currentId(), brief, onAskDefinition);
  const hide = () => {
    setTimeout(() => {
      if (activePop && !activePop.matches(':hover') && !activePop.contains(document.activeElement)) {
        closePop();
      }
    }, 180);
  };
  node.addEventListener('mouseenter', show);
  node.addEventListener('focus', show);
  node.addEventListener('mouseleave', hide);
  node.addEventListener('blur', hide);
  node.addEventListener('click', (e) => {
    if (node.classList.contains('kpi-mark')) {
      e.preventDefault();
      e.stopPropagation();
      if (activePop?.dataset.kpi === currentId()) closePop();
      else show();
    }
  });
}

export function bindKpiMarks(root, { brief, onAskDefinition } = {}) {
  for (const btn of root.querySelectorAll('.kpi-mark')) {
    bindHover(btn, btn.dataset.kpi, brief, onAskDefinition);
  }
}

/** Hover definition on a printed number. Uses data-kpi-def, plus name/body overrides. */
export function bindNumberDefs(root, { brief, onAskDefinition } = {}) {
  if (!root) return;
  for (const node of root.querySelectorAll('[data-kpi-def]')) {
    bindHover(node, node.dataset.kpiDef, brief, onAskDefinition);
  }
}

export function bindKpiHelp(root, opts = {}) {
  bindKpiMarks(root, opts);
  bindNumberDefs(root, opts);
}

function resolveMeta(id, brief, node) {
  const base = getKpiMeta(id, brief);
  if (base) {
    const copy = { ...base };
    if (node?.dataset.kpiName) copy.name = node.dataset.kpiName;
    if (node?.dataset.kpiBody) copy.definition = node.dataset.kpiBody;
    return copy;
  }
  const info = t().info?.[id];
  return {
    id,
    name: node?.dataset.kpiName || info?.title || id,
    definition: node?.dataset.kpiBody || info?.body || 'This figure is on the live pack. Open Ask Me or the page guide for how it is used.',
    source: 'Live pack',
    method: 'As published',
    calculatedAt: '-',
    calculatedLabel: 'This cycle',
    owner: 'Steward',
    frequency: '-'
  };
}

function openMarkPopover(anchor, id, brief, onAskDefinition) {
  closePop();
  const meta = resolveMeta(id, brief, anchor);
  if (!meta) return;
  const ask = typeof onAskDefinition === 'function';

  const pop = el(`<div class="kpi-pop" role="dialog" data-kpi="${id}" aria-label="${meta.name} definition">
    <div class="kpi-pop-k">KPI signature</div>
    <div class="kpi-pop-title">${meta.name}</div>
    <dl class="kpi-pop-dl">
      <div><dt>Definition</dt><dd>${meta.definition}</dd></div>
      <div><dt>Source</dt><dd>${meta.source}</dd></div>
      <div><dt>Method</dt><dd>${meta.method}</dd></div>
      <div><dt>Calculated</dt><dd>${meta.calculatedLabel}${meta.calculatedAt && meta.calculatedAt !== '-' ? `<br><span class="mono">${meta.calculatedAt}</span>` : ''}</dd></div>
      <div><dt>Owner</dt><dd>${meta.owner}</dd></div>
      <div><dt>Frequency</dt><dd>${meta.frequency}</dd></div>
    </dl>
    ${ask ? `<div class="kpi-pop-actions">
      <button type="button" class="btn-ask" data-ask-def>Ask owner · definition</button>
    </div>` : ''}
  </div>`);

  document.body.appendChild(pop);
  activePop = pop;

  const rect = anchor.getBoundingClientRect();
  const pw = Math.min(340, window.innerWidth - 24);
  let left = rect.left;
  if (left + pw > window.innerWidth - 12) left = window.innerWidth - pw - 12;
  if (left < 12) left = 12;
  pop.style.width = `${pw}px`;
  pop.style.left = `${left}px`;
  pop.style.top = `${rect.bottom + 8}px`;
  requestAnimationFrame(() => {
    const h = pop.getBoundingClientRect().height;
    if (rect.bottom + 8 + h > window.innerHeight - 12) {
      pop.style.top = `${Math.max(12, rect.top - h - 8)}px`;
    }
  });

  pop.addEventListener('mouseleave', closePop);
  const askBtn = pop.querySelector('[data-ask-def]');
  if (askBtn) {
    askBtn.onclick = () => {
      onAskDefinition?.(meta, id);
      closePop();
    };
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePop();
});
