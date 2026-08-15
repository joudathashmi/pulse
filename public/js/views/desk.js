import { el, $ } from '../lib/dom.js';
import { getLang, t } from '../i18n.js';
import {
  getUser, userOwns, loadReadIds, markRead, canOpenAdmin,
  listUsers, addUser, setUserStatus, ROLES, ROLE_ORDER,
  displayName, displayRole, displayDept, signOut
} from '../lib/session.js';
import { ownerForMetric, loadQueries } from '../lib/queries.js';
import { INBOX } from '../fixtures/inbox.js';
import { loadExtraInbox } from '../lib/approvals.js';
import { ALERTS } from '../fixtures/alerts.js';
import { displayStatus, isOpenCase, listCases } from '../lib/control.js';
import { renderSettings, setSettingsSection } from './settings.js';
import { openControlCase } from './controlCase.js';

function kindLabel(kind, s) {
  if (kind === 'reply') return s.deskReply || 'Owner reply';
  if (kind === 'ask') return s.deskAsk || 'Question';
  return s.deskNote || 'Note';
}

function statusWord(status, s) {
  if (status === 'overdue') return s.overdue;
  if (status === 'open') return s.open;
  if (status === 'pending') return s.pending || 'Pending';
  if (status === 'answered') return s.answered || 'Answered';
  if (status === 'watch') return s.statusWatch || 'Watch';
  if (status === 'risk') return s.statusRisk || 'At risk';
  if (status === 'ok') return s.statusOk || 'On track';
  if (status === 'held' || status === 'in_fix' || status === 'ready' || status === 'returned') {
    return displayStatus({ status }, s);
  }
  return status;
}

function day(iso) {
  return (iso || '').slice(0, 10) || '-';
}

function inboxFor(user, ar) {
  const read = loadReadIds();
  return [...loadExtraInbox(), ...INBOX]
    .filter(m => userOwns(user, m.toDept) || userOwns(user, m.from))
    .map(m => ({
      id: m.id,
      title: ar && m.titleAr ? m.titleAr : m.title,
      body: ar && m.bodyAr ? m.bodyAr : m.body,
      from: m.from,
      at: m.at,
      kind: m.kind,
      alertId: m.alertId,
      unread: !read.has(m.id)
    }));
}

function queryMessages(ar) {
  return loadQueries().map(q => ({
    id: q.id,
    title: q.title,
    body: q.answer || q.question,
    from: q.answer ? q.owner : (ar ? 'أنت' : 'You'),
    at: q.answeredAt || q.createdAt,
    kind: q.answer ? 'reply' : 'ask',
    alertId: q.alertId,
    unread: q.status === 'pending',
    query: true
  }));
}

function assignmentsFor(user) {
  const owned = ALERTS.filter(a => userOwns(user, a.owner)).map(a => ({
    id: a.id,
    title: a.title,
    titleAr: a.titleAr,
    owner: a.owner,
    deadline: a.deadline,
    status: a.status,
    metric: a.metric,
    kind: 'signal'
  }));
  const sent = loadQueries().filter(q => q.status === 'pending').map(q => ({
    id: q.id,
    title: q.title,
    owner: q.owner,
    deadline: (q.createdAt || '').slice(0, 10),
    status: 'pending',
    metric: q.metric,
    kind: 'query'
  }));
  const cases = listCases().filter(c => {
    if (!isOpenCase(c)) return false;
    if (c.assignee && c.assignee === user.id) return true;
    return userOwns(user, c.owner);
  }).map(c => ({
    id: c.id,
    title: c.title,
    owner: c.owner,
    deadline: (c.updatedAt || '').slice(0, 10),
    status: c.status,
    metric: c.kpi,
    kind: 'control'
  }));
  return [...cases, ...owned, ...sent];
}

function ownedKpis(user, brief) {
  const items = [];
  for (const id of ['fdi', 'gfcf']) {
    const info = ownerForMetric(id, brief);
    if (!userOwns(user, info.owner)) continue;
    const h = brief?.headlines?.[id];
    items.push({
      id,
      name: info.label || id.toUpperCase(),
      value: h?.pulseValue ?? info.value,
      unit: 'SAR bn',
      status: h?.status || 'ok',
      owner: info.owner,
      kind: 'headline'
    });
  }
  for (const sig of brief?.signals || []) {
    const info = ownerForMetric(sig.id, brief);
    if (!userOwns(user, info.owner)) continue;
    items.push({
      id: sig.id,
      name: sig.name,
      value: sig.value,
      unit: '',
      status: sig.status,
      owner: info.owner,
      kind: 'signal'
    });
  }
  return items;
}

function badgeCount(user) {
  const unread = inboxFor(user, false).filter(m => m.unread).length;
  const overdue = assignmentsFor(user).filter(a => a.status === 'overdue').length;
  return unread + overdue;
}

export function mountDesk(host, { getData, go, openDrill, startTour, openAskOwner } = {}) {
  if (!host) return { open() {}, close() {}, refresh() {} };

  let tab = 'messages';
  let open = false;

  host.innerHTML = `
    <div class="desk-scrim hide" data-scrim></div>
    <aside class="desk-panel hide" id="pulse-desk" role="dialog" aria-modal="true" aria-labelledby="desk-title">
      <div data-desk></div>
    </aside>`;

  const scrim = $('[data-scrim]', host);
  const panel = $('#pulse-desk', host);
  const body = $('[data-desk]', host);

  function paintChrome() {
    const user = getUser();
    const ava = document.querySelector('[data-user-ava]');
    const name = document.querySelector('[data-user-name]');
    const dept = document.querySelector('[data-user-dept]');
    const badge = document.querySelector('[data-desk-badge]');
    const btn = document.querySelector('[data-desk-open]');
    if (!user) return;
    if (ava) ava.textContent = user.initials;
    if (name) name.textContent = displayName(user, getLang() === 'ar');
    if (dept) dept.textContent = displayRole(user, getLang() === 'ar');
    const n = badgeCount(user);
    if (badge) {
      badge.textContent = n > 9 ? '9+' : String(n);
      badge.classList.toggle('hide', n === 0);
    }
    if (btn) {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', `${displayName(user, getLang() === 'ar')} · ${t().deskMenu || 'Your desk'}`);
    }
  }

  function render() {
    const s = t();
    const ar = getLang() === 'ar';
    const user = getUser();
    if (!user) return;
    const brief = getData?.()?.brief || {};
    const messages = [...inboxFor(user, ar), ...queryMessages(ar)];
    const assigns = assignmentsFor(user);
    const kpis = ownedKpis(user, brief);
    const hot = kpis.filter(k => k.status === 'watch' || k.status === 'risk');
    const ok = kpis.filter(k => k.status === 'ok' && k.kind === 'signal');
    const headlines = kpis.filter(k => k.kind === 'headline');

    body.innerHTML = `
      <header class="desk-head">
        <div class="desk-who">
          <span class="user-ava is-lg" aria-hidden="true">${user.initials}</span>
          <div>
            <div class="desk-name" id="desk-title">${displayName(user, ar)}</div>
            <div class="desk-role">${displayRole(user, ar)}</div>
          </div>
        </div>
        <div class="desk-head-acts">
          <button type="button" class="desk-out" data-out>${s.signOut || 'Sign out'}</button>
          <button type="button" class="desk-x" data-close aria-label="${s.cancel || 'Close'}">×</button>
        </div>
      </header>
      <div class="seg desk-tabs" data-tabs>
        <span class="seg-track">
          <button type="button" class="seg-opt ${tab === 'messages' ? 'on' : ''}" data-tab="messages">${s.deskMessages || 'Messages'}${messages.filter(m => m.unread).length ? ` (${messages.filter(m => m.unread).length})` : ''}</button>
          <button type="button" class="seg-opt ${tab === 'assign' ? 'on' : ''}" data-tab="assign">${s.deskAssign || 'Assignments'}${assigns.length ? ` (${assigns.length})` : ''}</button>
          <button type="button" class="seg-opt ${tab === 'own' ? 'on' : ''}" data-tab="own">${s.deskOwn || 'Owned'}${kpis.length ? ` (${kpis.length})` : ''}</button>
          ${canOpenAdmin(user) ? `<button type="button" class="seg-opt ${tab === 'people' ? 'on' : ''}" data-tab="people">${s.deskPeople || 'People'}</button>` : ''}
          <button type="button" class="seg-opt ${tab === 'settings' ? 'on' : ''}" data-tab="settings">${s.deskSettings || s.setTitle || 'Settings'}</button>
        </span>
      </div>
      <div class="desk-body" data-body></div>`;

    const pane = $('[data-body]', body);
    if (tab === 'messages') {
      if (!messages.length) {
        pane.innerHTML = `<div class="empty-filter">${s.deskNoMessages || 'No messages on this desk.'}</div>`;
      } else {
        for (const m of messages) {
          pane.appendChild(el(`<button type="button" class="desk-row ${m.unread ? 'is-unread' : ''}" data-msg="${m.id}" data-alert="${m.alertId || ''}">
            <span class="sig-kind">${kindLabel(m.kind, s)}</span>
            <b>${m.title}</b>
            <span class="desk-row-d">${m.body}</span>
            <span class="desk-row-m">${m.from} · ${day(m.at)}</span>
          </button>`));
        }
      }
    } else if (tab === 'people' && canOpenAdmin(user)) {
      for (const roleId of ROLE_ORDER) {
        const group = listUsers().filter(u => u.roleId === roleId);
        if (!group.length) continue;
        pane.appendChild(el(`<div class="wh-k">${displayRole(group[0], ar)}</div>`));
        for (const u of group) {
          const row = el(`<div class="desk-row desk-person ${u.status === 'disabled' ? 'is-off' : ''}">
            <b>${displayName(u, ar)}</b>
            <span class="desk-row-m">${displayRole(u, ar)}${u.roleId === 'owner' ? ` · ${displayDept(u, ar)}` : ''}${u.status === 'disabled' ? ` · ${s.adminDisabled || 'Off'}` : ''}</span>
          </div>`);
          if (u.id !== user.id) {
            const tog = el(`<button type="button" class="desk-mini">${u.status === 'disabled' ? (s.adminEnable || 'On') : (s.adminDisable || 'Off')}</button>`);
            tog.onclick = () => {
              setUserStatus(u.id, u.status === 'disabled' ? 'active' : 'disabled');
              render();
            };
            row.appendChild(tog);
          }
          pane.appendChild(row);
        }
      }
      const form = el(`<form class="desk-add">
        <input name="name" required autocomplete="off" placeholder="${s.adminPerson || 'Name'}" />
        <input name="pass" type="password" required autocomplete="new-password" placeholder="${s.signInPass || 'Password'}" />
        <select name="roleId">${ROLES.map(r => `<option value="${r.id}">${ar ? r.nameAr : r.name}</option>`).join('')}</select>
        <button type="submit" class="btn-primary">${s.adminAddBtn || 'Add'}</button>
      </form>`);
      form.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        addUser({
          name: String(fd.get('name') || ''),
          roleId: String(fd.get('roleId') || 'owner'),
          pass: String(fd.get('pass') || '')
        });
        render();
      };
      pane.appendChild(form);
    } else if (tab === 'settings') {
      renderSettings(pane, getData?.() || {}, {
        startSection: undefined,
        startTour: () => {
          close();
          startTour?.();
        },
        openAskOwner,
        go: (view) => {
          close();
          go?.(view);
        }
      });
    } else if (tab === 'assign') {
      if (!assigns.length) {
        pane.innerHTML = `<div class="empty-filter">${s.deskNoAssign || 'Nothing assigned to this desk.'}</div>`;
      } else {
        for (const a of assigns) {
          const title = ar && a.titleAr ? a.titleAr : a.title;
          pane.appendChild(el(`<button type="button" class="desk-row" data-case="${a.kind === 'control' ? a.id : ''}" data-alert="${a.kind === 'signal' ? a.id : ''}" data-metric="${a.metric || ''}">
            <span class="st ${a.status === 'overdue' || a.status === 'risk' ? 'risk' : 'watch'}"><span class="st-label">${statusWord(a.status, s)}</span></span>
            <b>${title}</b>
            <span class="desk-row-m">${a.owner} · ${s.deadline} ${a.deadline || '-'}</span>
          </button>`));
        }
      }
    } else {
      const bits = [];
      if (headlines.length) {
        bits.push(`<div class="wh-k">${s.deskHeadlines || 'Headlines you own'}</div>`);
        for (const k of headlines) {
          bits.push(`<button type="button" class="desk-row" data-kpi="${k.id}">
            <span class="st ${k.status}"><span class="st-label">${statusWord(k.status, s)}</span></span>
            <b>${k.name}</b>
            <span class="desk-row-m">${k.value ?? '-'} ${k.unit} · ${k.owner}</span>
          </button>`);
        }
      }
      if (hot.length) {
        bits.push(`<div class="wh-k">${s.deskWatch || 'Watch and at risk on your desk'}</div>`);
        for (const k of hot.filter(x => x.kind !== 'headline')) {
          bits.push(`<button type="button" class="desk-row" data-kpi="${k.id}">
            <span class="st ${k.status}"><span class="st-label">${statusWord(k.status, s)}</span></span>
            <b>${k.name}</b>
            <span class="desk-row-m">${k.value ?? '-'} · ${k.owner}</span>
          </button>`);
        }
      }
      if (ok.length) {
        bits.push(`<p class="desk-ok">${ok.length} ${s.deskOnTrack || 'leading signals on track on this desk'}.</p>`);
      }
      if (!kpis.length) {
        bits.push(`<div class="empty-filter">${s.deskNoOwn || 'This desk does not own a Pulse headline or signal.'}</div>`);
      }
      pane.innerHTML = bits.join('');
    }

    for (const b of body.querySelectorAll('[data-tab]')) {
      b.onclick = () => { tab = b.dataset.tab; render(); };
    }
    for (const row of pane.querySelectorAll('[data-msg]')) {
      row.onclick = () => {
        markRead([row.dataset.msg]);
        paintChrome();
        close();
        go?.('alerts');
      };
    }
    for (const row of pane.querySelectorAll('[data-case]')) {
      if (!row.dataset.case) continue;
      row.onclick = () => {
        close();
        openControlCase(row.dataset.case);
      };
    }
    for (const row of pane.querySelectorAll('[data-alert], [data-metric]')) {
      if (row.dataset.msg || row.dataset.case) continue;
      row.onclick = () => { close(); go?.('alerts'); };
    }
    for (const row of pane.querySelectorAll('[data-kpi]')) {
      row.onclick = () => {
        close();
        openDrill?.([row.dataset.kpi]);
      };
    }
  }

  function openDesk(nextTab, section) {
    if (nextTab) tab = nextTab;
    if (section) setSettingsSection(section);
    if (tab === 'people' && !canOpenAdmin(getUser())) tab = 'messages';
    open = true;
    render();
    paintChrome();
    scrim.classList.remove('hide');
    panel.classList.remove('hide');
    document.body.classList.add('desk-open');
  }

  let ignoreTrigger = false;

  function close() {
    open = false;
    scrim.classList.add('hide');
    panel.classList.add('hide');
    document.body.classList.remove('desk-open');
    paintChrome();
    ignoreTrigger = true;
    setTimeout(() => { ignoreTrigger = false; }, 400);
  }

  panel.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-close]')) {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.target.closest('[data-out]')) {
      e.preventDefault();
      e.stopPropagation();
      close();
      signOut();
    }
  });
  const trigger = document.querySelector('[data-desk-open]');
  trigger?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (ignoreTrigger) return;
    if (open) close();
    else openDesk();
  });
  scrim.addEventListener('pointerdown', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) close();
  });

  window.addEventListener('pulse-desk', () => {
    paintChrome();
    if (open) render();
  });
  window.addEventListener('pulse-control', () => {
    paintChrome();
    if (open) render();
  });

  paintChrome();
  return { open: openDesk, close, refresh: () => { paintChrome(); if (open) render(); } };
}
