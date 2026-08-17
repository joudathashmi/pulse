import { el, $ } from '../lib/dom.js';
import { getLang, t } from '../i18n.js';
import {
  getUser, userOwns, loadReadIds, markRead, canOpenAdmin,
  listUsers, addUser, patchUser, setUserStatus, ROLES, ROLE_ORDER, CLEARANCE,
  displayName, displayRole, displayDept, signOut
} from '../lib/session.js';
import { ownerForMetric, loadQueries } from '../lib/queries.js';
import { INBOX } from '../fixtures/inbox.js';
import { loadExtraInbox } from '../lib/approvals.js';
import { ALERTS } from '../fixtures/alerts.js';
import { displayStatus, isOpenCase, listCases } from '../lib/control.js';
import { renderSettings, setSettingsSection } from './settings.js';
import { openControlCase } from './controlCase.js';

function agencies() {
  return [
    'Economic Affairs',
    'Investment Development Agency',
    'Digital Transformation',
    'Quality · Economic Affairs',
    'Assistant Minister office',
    'Data Council'
  ];
}

function paintPeople(pane, user, s, ar) {
  const people = listUsers();
  const active = people.filter(u => u.status !== 'disabled').length;
  const roleOpts = (selected) => ROLES.map(r =>
    `<option value="${r.id}" ${r.id === selected ? 'selected' : ''}>${ar ? r.nameAr : r.name}</option>`
  ).join('');
  const clearOpts = (selected) => CLEARANCE.map(c =>
    `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${ar ? c.nameAr : c.name}</option>`
  ).join('');
  const deptOpts = (selected) => agencies().map(d =>
    `<option value="${d}" ${d === selected ? 'selected' : ''}>${d}</option>`
  ).join('');

  pane.innerHTML = `
    <div class="desk-people">
      <div class="wh-k">${s.adminTitle || 'User console'}</div>
      <p class="desk-lede">${s.adminSub || ''}</p>
      <p class="desk-lede">${s.adminSeedNote || ''}</p>

      <div class="wh-k">${s.adminAdd || 'Create user'}</div>
      <form class="desk-add is-stack" data-add-user>
        <label>${s.adminPerson || 'Name'}
          <input name="name" required autocomplete="off" placeholder="${s.adminPerson || 'Name'}" />
        </label>
        <label>${s.adminEmail || 'Email'}
          <input name="email" type="email" autocomplete="off" placeholder="name@misa.gov.sa" />
        </label>
        <label>${s.signInPass || 'Password'}
          <input name="pass" type="password" required autocomplete="new-password" />
        </label>
        <label>${s.adminRole || 'Role'}
          <select name="roleId">${roleOpts('owner')}</select>
        </label>
        <label>${s.adminAgency || 'Agency'}
          <select name="dept">${deptOpts('Economic Affairs')}</select>
        </label>
        <label>${s.adminClear || 'Clearance'}
          <select name="clearance">${clearOpts('restricted')}</select>
        </label>
        <button type="submit" class="btn-primary">${s.adminCreate || s.adminAddBtn || 'Create user'}</button>
      </form>

      <div class="wh-k">${s.adminDirectory || 'Directory'} · ${active} ${s.adminActive || 'active desks'}</div>
    </div>`;

  const wrap = $('.desk-people', pane);
  for (const roleId of ROLE_ORDER) {
    const group = people.filter(u => u.roleId === roleId);
    if (!group.length) continue;
    wrap.appendChild(el(`<div class="desk-role-h">${displayRole(group[0], ar)}</div>`));
    for (const u of group) {
      const self = u.id === user.id;
      const row = el(`<article class="desk-person ${u.status === 'disabled' ? 'is-off' : ''}" data-person="${u.id}">
        <div class="desk-person-id">
          <b>${displayName(u, ar)}</b>
          <span class="desk-row-m">${u.email || ''} · ${displayDept(u, ar)}</span>
        </div>
        <label class="desk-person-lab">${s.adminRole || 'Role'}
          <select data-role ${self ? 'disabled' : ''}>${roleOpts(u.roleId)}</select>
        </label>
        <label class="desk-person-lab">${s.adminClear || 'Clearance'}
          <select data-clear>${clearOpts(u.clearance || 'restricted')}</select>
        </label>
        ${self ? `<span class="desk-row-m">${s.adminOn || 'Active'}</span>`
          : `<button type="button" class="desk-mini" data-toggle>${u.status === 'disabled' ? (s.adminEnable || 'Enable') : (s.adminDisable || 'Disable')}</button>`}
      </article>`);
      wrap.appendChild(row);
    }
  }

  wrap.appendChild(el(`<div class="wh-k">${s.adminRoles || 'Roles'}</div>`));
  wrap.appendChild(el(`<p class="desk-lede">${s.adminRolesNote || ''}</p>`));
  const roleList = el('<ul class="desk-role-list"></ul>');
  for (const r of ROLES) {
    roleList.appendChild(el(`<li><b>${ar ? r.nameAr : r.name}</b> ${ar ? r.helpAr : r.help}</li>`));
  }
  wrap.appendChild(roleList);
  wrap.appendChild(el(`<div class="wh-k">${s.adminAccess || 'Access'}</div>`));
  wrap.appendChild(el(`<p class="desk-lede">${s.adminAccessNote || ''}</p>`));
}

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
    panel.classList.toggle('is-people', tab === 'people');
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
      paintPeople(pane, user, s, ar);
      const form = $('[data-add-user]', pane);
      if (form) form.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        addUser({
          name: String(fd.get('name') || ''),
          email: String(fd.get('email') || ''),
          pass: String(fd.get('pass') || ''),
          roleId: String(fd.get('roleId') || 'owner'),
          dept: String(fd.get('dept') || ''),
          clearance: String(fd.get('clearance') || 'restricted')
        });
        render();
      };
      for (const row of pane.querySelectorAll('[data-person]')) {
        const id = row.dataset.person;
        const roleSel = row.querySelector('[data-role]');
        const clearSel = row.querySelector('[data-clear]');
        const tog = row.querySelector('[data-toggle]');
        if (roleSel) {
          roleSel.onchange = () => {
            patchUser(id, { roleId: roleSel.value });
            render();
          };
        }
        if (clearSel) {
          clearSel.onchange = () => {
            patchUser(id, { clearance: clearSel.value });
          };
        }
        if (tog) {
          tog.onclick = () => {
            const person = listUsers().find(u => u.id === id);
            setUserStatus(id, person?.status === 'disabled' ? 'active' : 'disabled');
            render();
          };
        }
      }
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
    panel.classList.toggle('is-people', tab === 'people');
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
