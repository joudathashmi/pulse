import { el, $ } from '../lib/dom.js';
import { ALERTS } from '../fixtures/alerts.js';
import { getLang, t } from '../i18n.js';
import { bindInfo } from '../lib/infoMark.js';
import { bindNumberDefs } from '../lib/kpiMark.js';
import {
  loadQueries, createQuery, answerQuery, closeQuery, pendingCount
} from '../lib/queries.js';
import { workQueue } from '../lib/work.js';
import { openControlCase } from './controlCase.js';

function alertStateChip(status, s) {
  const map = {
    open: { cls: 'watch', icon: '!', label: s.open },
    overdue: { cls: 'risk', icon: '▲', label: s.overdue },
    closed: { cls: 'ok', icon: '✓', label: s.closed },
    pending: { cls: 'watch', icon: '…', label: s.pending || 'Pending' },
    answered: { cls: 'ok', icon: '✓', label: s.answered || 'Answered' }
  };
  const m = map[status] || map.open;
  return `<span class="st ${m.cls}" role="status"><span class="ic" aria-hidden="true">${m.icon}</span><span class="st-label">${m.label}</span></span>`;
}

function mockOwnerReply(q) {
  return `Thank you. ${q.owner} has reviewed “${q.title}” (value: ${q.value || '-'}).\n\nQualification: the published figure stands; a note will be attached for the Committee if material. Steward sign-off logged.`;
}

/** DEC-04 / DEC-05 alerts + ask-owner qualification. */
export function renderAlerts(root, data = {}, ctx = {}) {
  const s = t();
  const ar = getLang() === 'ar';
  const pending = pendingCount();
  const work = workQueue(data);
  const start = data.startTab || 'signals';

  root.innerHTML = `
    <div class="stage"><div class="panel sig-page" style="padding-top:20px">
      <header class="sig-head">
        <div>
          <div class="wh-k">${s.tabs.alerts}</div>
          <h1 data-info="work">${s.workTitle || 'Work on the pack'}</h1>
          <p class="lede">${s.workSub || 'Open signals, quarantined values, and the next action. Held items do not enter the certified Pulse.'}</p>
        </div>
        <div class="seg" data-tabs>
          <span class="seg-track">
            <button type="button" class="seg-opt" data-tab="signals">${s.alertSignals || 'Open'} (<b data-kpi-def="open">${work.counts.open}</b>)</button>
            <button type="button" class="seg-opt" data-tab="quarantine">${s.workQuarantine || 'Quarantine'} (<b data-kpi-def="quarantine">${work.counts.quarantine}</b>)</button>
            <button type="button" class="seg-opt" data-tab="actions">${s.workActions || 'Actions'} (<b data-kpi-def="actions">${work.counts.actions}</b>)</button>
            <button type="button" class="seg-opt" data-tab="queries">${s.myQueries || 'Questions'}${pending ? ` (${pending})` : ''}</button>
          </span>
        </div>
      </header>
      <div data-panel></div>
    </div></div>`;

  const panel = $('[data-panel]', root);
  const tabs = root.querySelectorAll('[data-tab]');

  const showSignals = () => {
    for (const b of tabs) b.classList.toggle('on', b.dataset.tab === 'signals');
    panel.innerHTML = '<div data-list></div>';
    const list = $('[data-list]', panel);
    for (const a of ALERTS) {
      const sev = a.severity === 'risk' ? 'risk' : 'watch';
      const card = el(`<article class="alert ${sev}" data-alert="${a.id}">
        <div class="sig-top">
          <span class="sig-kind ${sev}">${sev === 'risk' ? (s.sevRisk || 'At risk') : (s.sevWatch || 'Watch')}</span>
          ${alertStateChip(a.status, s)}
        </div>
        <h2 class="t">${ar ? a.titleAr : a.title}</h2>
        <p class="d">${ar ? a.detailAr : a.detail}</p>
        <dl class="sig-meta">
          <div><dt>${s.raisedBy}</dt><dd>${a.raisedBy}</dd></div>
          <div><dt>${s.alertOwner}</dt><dd>${a.owner}</dd></div>
          <div><dt>${s.deadline}</dt><dd>${a.deadline}</dd></div>
        </dl>
        <p class="sig-next"><span>${s.proposed}</span>${ar ? a.actionAr : a.action}</p>
        <div class="alert-actions">
          <button type="button" class="btn-primary" data-ask="${a.id}">${s.askOwner || 'Ask owner for qualification'}</button>
        </div>
        <div class="ask-box hide" data-box="${a.id}"></div>
      </article>`);
      list.appendChild(card);
    }

    for (const btn of list.querySelectorAll('[data-ask]')) {
      btn.onclick = () => {
        const id = btn.dataset.ask;
        const a = ALERTS.find(x => x.id === id);
        const box = list.querySelector(`[data-box="${id}"]`);
        if (!a || !box) return;
        const open = !box.classList.contains('hide');
        for (const b of list.querySelectorAll('.ask-box')) {
          b.classList.add('hide');
          b.innerHTML = '';
        }
        if (open) return;
        box.classList.remove('hide');
        box.innerHTML = `
          <div class="ask-form">
            <div class="k">${s.askOwner || 'Ask owner'}</div>
            <p class="ask-to">${s.toOwner || 'To'}: <b>${a.owner}</b> · <span class="mono">${a.ownerContact}</span></p>
            <p class="ask-val">${s.value || 'Value'}: <b>${a.value}</b> · ${a.metric?.toUpperCase() || ''}</p>
            <label class="ask-label" for="q-${id}">${s.yourQuestion || 'Your qualification question'}</label>
            <textarea id="q-${id}" rows="3">${a.qualifyPrompt || ''}</textarea>
            <div class="ask-row">
              <button type="button" class="btn-primary" data-send="${id}">${s.sendToOwner || 'Send to owner'}</button>
              <button type="button" class="btn-ghost" data-cancel="${id}">${s.cancel || 'Cancel'}</button>
            </div>
          </div>`;
        box.querySelector(`[data-cancel="${id}"]`).onclick = () => {
          box.classList.add('hide');
          box.innerHTML = '';
        };
        box.querySelector(`[data-send="${id}"]`).onclick = () => {
          const text = box.querySelector('textarea')?.value?.trim();
          if (!text) return;
          createQuery({
            alertId: a.id,
            metric: a.metric,
            value: a.value,
            owner: a.owner,
            ownerContact: a.ownerContact,
            question: text,
            title: ar ? a.titleAr : a.title
          });
          box.innerHTML = `<div class="ask-ok">${s.querySent || 'Sent to owner. Track it under “My questions to owners”.'}</div>`;
          setTimeout(showQueries, 700);
        };
      };
    }
  };

  const showQueries = () => {
    for (const b of tabs) b.classList.toggle('on', b.dataset.tab === 'queries');
    const queries = loadQueries();
    if (!queries.length) {
      panel.innerHTML = `<div class="empty-filter">${s.noQueries || 'No qualification questions yet. Open a signal and ask its owner.'}</div>`;
      return;
    }
    panel.innerHTML = '<div data-qlist></div>';
    const list = $('[data-qlist]', panel);
    for (const q of queries) {
      const card = el(`<article class="alert ${q.status === 'pending' ? 'watch' : 'ok'}">
        <div class="sig-top">${alertStateChip(q.status, s)}</div>
        <h2 class="t">${q.title}</h2>
        <p class="d">${q.question}</p>
        <dl class="sig-meta">
          <div><dt>${s.alertOwner}</dt><dd>${q.owner}</dd></div>
          <div><dt>${s.value || 'Value'}</dt><dd>${q.value || '-'}</dd></div>
          <div><dt>${s.contact || 'Contact'}</dt><dd class="mono">${q.ownerContact}</dd></div>
        </dl>
        ${q.answer ? `<p class="sig-next"><span>${s.ownerReply || 'Owner reply'}</span>${q.answer}</p>` : ''}
        <div class="alert-actions" data-actions="${q.id}"></div>
      </article>`);
      list.appendChild(card);
      const actions = card.querySelector(`[data-actions="${q.id}"]`);
      if (q.status === 'pending') {
        const sim = el(`<button type="button" class="btn-ask">${s.simulateReply || 'Simulate owner reply'}</button>`);
        sim.onclick = () => {
          answerQuery(q.id, mockOwnerReply(q));
          showQueries();
        };
        actions.appendChild(sim);
      }
      if (q.status !== 'closed') {
        const close = el(`<button type="button" class="btn-ghost">${s.closeQuery || 'Close'}</button>`);
        close.onclick = () => { closeQuery(q.id); showQueries(); };
        actions.appendChild(close);
      }
    }
    // refresh tab badge
    const n = pendingCount();
    const qb = root.querySelector('[data-tab="queries"]');
    if (qb) qb.textContent = `${s.myQueries || 'Questions'}${n ? ` (${n})` : ''}`;
  };

  const showQuarantine = () => {
    for (const b of tabs) b.classList.toggle('on', b.dataset.tab === 'quarantine');
    if (!work.quarantine.length) {
      panel.innerHTML = `<div class="empty-filter">${s.workNoHold || 'Nothing is held.'}</div>`;
      return;
    }
    panel.innerHTML = '<div data-list></div>';
    const list = $('[data-list]', panel);
    for (const item of work.quarantine) {
      const card = el(`<article class="alert watch">
        <div class="sig-top">
          <span class="sig-kind watch">${s.workHeld || 'Held'}</span>
          ${alertStateChip('pending', { ...s, pending: s.workHeld || 'Held' })}
        </div>
        <h2 class="t">${item.title}</h2>
        <p class="d">${item.detail}</p>
        <dl class="sig-meta">
          <div><dt>${s.alertOwner}</dt><dd>${item.owner}</dd></div>
          <div><dt>${s.workGate || 'Gate'}</dt><dd>${item.gate}</dd></div>
          <div><dt>${s.workSource || 'Source'}</dt><dd>${item.source}</dd></div>
        </dl>
        <div class="alert-actions">
          <button type="button" class="btn-primary" data-open>${item.kind === 'control' ? (s.ctrlOpen || 'Open') : (item.path ? (s.workTrace || 'Trace this row') : (s.workOpenGate || 'Open quality gates'))}</button>
          <button type="button" class="btn-ghost" data-apr>${s.aprReview || 'Review for sign-off'}</button>
        </div>
      </article>`);
      card.querySelector('[data-open]').onclick = () => {
        if (item.kind === 'control') openControlCase(item.id);
        else if (item.path) ctx.openDrill?.(item.path);
        else ctx.go?.(item.go || 'qual');
      };
      card.querySelector('[data-apr]').onclick = () => ctx.openApproval?.(item.id);
      list.appendChild(card);
    }
  };

  const showActions = () => {
    for (const b of tabs) b.classList.toggle('on', b.dataset.tab === 'actions');
    if (!work.actions.length) {
      panel.innerHTML = `<div class="empty-filter">${s.workNoAct || 'No open actions.'}</div>`;
      return;
    }
    panel.innerHTML = '<div data-list></div>';
    const list = $('[data-list]', panel);
    for (const item of work.actions) {
      const card = el(`<article class="alert ${item.status === 'overdue' ? 'risk' : 'watch'}">
        <div class="sig-top">${alertStateChip(item.status, s)}</div>
        <h2 class="t">${item.title}</h2>
        <p class="d">${s.workOn || 'On'} · ${item.on}</p>
        <dl class="sig-meta">
          <div><dt>${s.alertOwner}</dt><dd>${item.owner}</dd></div>
          <div><dt>${s.deadline}</dt><dd>${item.deadline}</dd></div>
        </dl>
        <div class="alert-actions">
          <button type="button" class="btn-primary" data-open>${s.workOpen || 'Open'}</button>
        </div>
      </article>`);
      card.querySelector('[data-open]').onclick = () => {
        if (item.go === 'qual') ctx.go?.('qual');
        else showSignals();
      };
      list.appendChild(card);
    }
  };

  const show = (tab) => {
    if (tab === 'quarantine') showQuarantine();
    else if (tab === 'actions') showActions();
    else if (tab === 'queries') showQueries();
    else showSignals();
  };

  for (const b of tabs) {
    b.onclick = () => show(b.dataset.tab);
  }
  show(start);
  bindInfo(root);
  bindNumberDefs(root);
}

/** Compact ask-owner control for Pulse / chat. */
export function openAskOwnerDialog({ metric, value, owner, ownerContact, title, question }) {
  const existing = document.getElementById('ask-owner-modal');
  if (existing) existing.remove();

  const s = t();
  const modal = el(`<div class="ask-modal" id="ask-owner-modal" role="dialog" aria-modal="true" aria-labelledby="ask-owner-title">
    <div class="ask-modal-card">
      <div class="k" id="ask-owner-title">${s.askOwner || 'Ask owner for qualification'}</div>
      <p class="ask-to">${s.toOwner || 'To'}: <b>${owner}</b> · <span class="mono">${ownerContact}</span></p>
      <p class="ask-val">${title || metric} · ${s.value || 'Value'}: <b>${value || '-'}</b></p>
      <label class="ask-label" for="ask-owner-q">${s.yourQuestion || 'Your qualification question'}</label>
      <textarea id="ask-owner-q" rows="4">${question || `Please qualify the published value for ${title || metric} (${value || '-'}). Is any caveat required for the Committee pack?`}</textarea>
      <div class="ask-row">
        <button type="button" class="btn-primary" data-send>${s.sendToOwner || 'Send to owner'}</button>
        <button type="button" class="btn-ghost" data-cancel>${s.cancel || 'Cancel'}</button>
      </div>
    </div>
  </div>`);
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('[data-cancel]').onclick = close;
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  modal.querySelector('[data-send]').onclick = () => {
    const text = modal.querySelector('textarea')?.value?.trim();
    if (!text) return;
    createQuery({ metric, value, owner, ownerContact, question: text, title: title || metric });
    close();
  };
  modal.querySelector('textarea')?.focus();
}
