import { el, $ } from '../lib/dom.js';
import { t } from '../i18n.js';
import { getUser, displayName } from '../lib/session.js';
import { mine, pendingCount, decide } from '../lib/approvals.js';

export function mountApprovals(host, { getData, openDrill, go } = {}) {
  if (!host) return { open() {}, close() {}, refresh() {} };

  let open = false;
  let active = null;

  host.innerHTML = `
    <div class="desk-scrim hide" data-apr-scrim></div>
    <aside class="desk-panel hide" id="pulse-approvals" role="dialog" aria-modal="true" aria-labelledby="apr-title">
      <div data-apr></div>
    </aside>`;

  const scrim = $('[data-apr-scrim]', host);
  const panel = $('#pulse-approvals', host);
  const body = $('[data-apr]', host);

  function paintBadge() {
    const n = pendingCount(getData?.() || {}, getUser());
    const badge = document.querySelector('[data-apr-badge]');
    const btn = document.querySelector('[data-apr-open]');
    if (badge) {
      badge.textContent = n > 9 ? '9+' : String(n);
      badge.classList.toggle('hide', n === 0);
    }
    if (btn) {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', n
        ? `${n} waiting for your sign-off`
        : (t().aprEmpty || 'No approvals waiting'));
    }
  }

  function render() {
    const s = t();
    const data = getData?.() || {};
    const list = mine(data);
    const item = active ? list.find(x => x.id === active) : null;

    if (item) {
      body.innerHTML = `
        <header class="desk-head">
          <div>
            <div class="wh-k">${s.aprKicker || 'Your sign-off'}</div>
            <div class="desk-name" id="apr-title">${item.title}</div>
          </div>
          <button type="button" class="desk-x" data-back aria-label="${s.cancel || 'Back'}">×</button>
        </header>
        <div class="desk-body apr-body">
          <p class="set-lede">${item.detail}</p>
          <dl class="sig-meta">
            <div><dt>${s.setKpi || 'KPI'}</dt><dd>${(item.kpi || '-').toUpperCase()}</dd></div>
            <div><dt>${s.ctrlPulled || 'Pulled value'}</dt><dd>${item.value || '-'}</dd></div>
            <div><dt>${s.ctrlPulse || 'Pulse print'}</dt><dd>${item.pulseValue || '-'}</dd></div>
            <div><dt>${s.owner || 'Owner'}</dt><dd>${item.owner}</dd></div>
            <div><dt>${s.workSource || 'Source'}</dt><dd>${item.source}</dd></div>
            <div><dt>${s.workGate || 'Gate'}</dt><dd>${item.gate}</dd></div>
          </dl>
          ${item.fix ? `<p class="set-lede">${s.ctrlStatusFix || 'In fix'} · ${item.fix.byName || item.fix.by || ''} · ${item.fix.mapping || item.fix.note || ''}</p>` : ''}
          <p class="wh-est">${s.ctrlReadyHint || 'Ready means fit to consider for the next signed pack. The certified Pulse does not move until a later pack sign-off.'}</p>
          <ol class="set-guide">
            <li>${s.aprStep1 || 'Read the held figure and why it is waiting.'}</li>
            <li>${s.aprStep2 || 'Open the source path and check the record.'}</li>
            <li>${s.aprStep3 || 'Sign it through, or return it. The requesting desk is notified.'}</li>
          </ol>
          <label class="ask-label">${s.aprNote || 'Note to the requesting desk'}
            <textarea data-note rows="3" placeholder="${s.aprNotePh || 'Optional note'}"></textarea>
          </label>
          <div class="apr-acts">
            <button type="button" class="btn-primary" data-verify>${s.aprVerify || 'Verify source'}</button>
            <button type="button" class="btn-primary" data-ok>${s.aprYes || 'Approve'}</button>
            <button type="button" class="btn-ghost" data-no>${s.aprNo || 'Return'}</button>
          </div>
        </div>`;
      body.querySelector('[data-back]')?.addEventListener('click', () => { active = null; render(); });
      body.querySelector('[data-verify]').onclick = () => {
        if (item.path) openDrill?.(item.path);
        else go?.(item.go || 'qual');
      };
      body.querySelector('[data-ok]').onclick = async () => {
        await decide(item.id, 'approved', body.querySelector('[data-note]')?.value);
        active = null;
        render();
      };
      body.querySelector('[data-no]').onclick = async () => {
        await decide(item.id, 'returned', body.querySelector('[data-note]')?.value);
        active = null;
        render();
      };
      return;
    }

    body.innerHTML = `
      <header class="desk-head">
        <div>
          <div class="wh-k">${s.aprKicker || 'Your sign-off'}</div>
          <div class="desk-name" id="apr-title">${s.aprTitle || 'Approvals'}</div>
          <div class="desk-role">${displayName(getUser()) || ''}</div>
        </div>
        <button type="button" class="desk-x" data-close aria-label="${s.cancel || 'Close'}">×</button>
      </header>
      <div class="desk-body">
        ${list.length
          ? list.map(x => `<button type="button" class="desk-row" data-item="${x.id}">
              <span class="sig-kind watch">${s.aprWait || 'Needs you'}</span>
              <b>${x.title}</b>
              <span class="desk-row-d">${x.detail}</span>
              <span class="desk-row-m">${x.owner} · ${x.source}</span>
            </button>`).join('')
          : `<div class="empty-filter">${s.aprEmpty || 'Nothing waiting for your sign-off.'}</div>`}
      </div>`;
    for (const b of body.querySelectorAll('[data-item]')) {
      b.onclick = () => { active = b.dataset.item; render(); };
    }
  }

  function openPanel(id) {
    if (id) active = id;
    open = true;
    render();
    paintBadge();
    scrim.classList.remove('hide');
    panel.classList.remove('hide');
    document.body.classList.add('desk-open');
  }

  function close() {
    open = false;
    active = null;
    scrim.classList.add('hide');
    panel.classList.add('hide');
    document.body.classList.remove('desk-open');
    paintBadge();
  }

  panel.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-close]')) {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  });
  document.querySelector('[data-apr-open]')?.addEventListener('click', () => (open ? close() : openPanel()));
  scrim.addEventListener('pointerdown', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) close();
  });
  window.addEventListener('pulse-approvals', () => { paintBadge(); if (open) render(); });
  window.addEventListener('pulse-control', () => { paintBadge(); if (open) render(); });
  window.addEventListener('pulse-auth', () => { paintBadge(); if (open) render(); });
  window.addEventListener('pulse-desk', paintBadge);

  paintBadge();
  return { open: openPanel, close, refresh: () => { paintBadge(); if (open) render(); } };
}
