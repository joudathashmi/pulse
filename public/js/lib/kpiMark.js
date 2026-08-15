import { el } from './dom.js';
import { getKpiMeta } from '../fixtures/kpiMeta.js';

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

export function bindKpiMarks(root, { brief, onAskDefinition } = {}) {
  for (const btn of root.querySelectorAll('.kpi-mark')) {
    if (btn.dataset.bound) continue;
    btn.dataset.bound = '1';
    const id = btn.dataset.kpi;
    const show = () => openMarkPopover(btn, id, brief, onAskDefinition);
    const hide = () => {
      setTimeout(() => {
        if (activePop && !activePop.matches(':hover') && !activePop.contains(document.activeElement)) {
          closePop();
        }
      }, 180);
    };
    btn.addEventListener('mouseenter', show);
    btn.addEventListener('focus', show);
    btn.addEventListener('mouseleave', hide);
    btn.addEventListener('blur', hide);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (activePop?.dataset.kpi === id) closePop();
      else show();
    });
  }
}

function openMarkPopover(anchor, id, brief, onAskDefinition) {
  closePop();
  const meta = getKpiMeta(id, brief);
  if (!meta) return;

  const pop = el(`<div class="kpi-pop" role="dialog" data-kpi="${id}" aria-label="${meta.name} definition">
    <div class="kpi-pop-k">KPI signature</div>
    <div class="kpi-pop-title">${meta.name}</div>
    <dl class="kpi-pop-dl">
      <div><dt>Definition</dt><dd>${meta.definition}</dd></div>
      <div><dt>Source</dt><dd>${meta.source}</dd></div>
      <div><dt>Method</dt><dd>${meta.method}</dd></div>
      <div><dt>Calculated</dt><dd>${meta.calculatedLabel}<br><span class="mono">${meta.calculatedAt}</span></dd></div>
      <div><dt>Owner</dt><dd>${meta.owner}</dd></div>
      <div><dt>Frequency</dt><dd>${meta.frequency}</dd></div>
    </dl>
    <div class="kpi-pop-actions">
      <button type="button" class="btn-ask" data-ask-def>Ask owner · definition</button>
    </div>
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
  pop.querySelector('[data-ask-def]').onclick = () => {
    onAskDefinition?.(meta, id);
    closePop();
  };
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePop();
});
