import { TAB_IDS, STAMP } from './config.js';
import { mountFloatNav } from './views/floatNav.js';
import { $, $$, el } from './lib/dom.js';
import { loadAll } from './data/index.js';
import { getLang, setLang, onLangChange, t } from './i18n.js';
import { renderPulse } from './views/pulse.js';
import { renderDrill } from './views/drilldown.js';
import { renderNowcastView } from './views/nowcast.js';
import { renderQuality } from './views/quality.js';
import { renderInventory } from './views/inventory.js';
import { renderProvenance } from './views/provenance.js';
import { renderAlerts, openAskOwnerDialog } from './views/alerts.js';
import { mountChat } from './views/chat.js';
import { THEMES, initTheme, applyTheme, getTheme } from './lib/theme.js';
import { initShell, applyShell, getShell } from './lib/shell.js';
import { renderIntake } from './views/intake.js';
import { renderFdi } from './views/fdi.js';
import { mountTour } from './lib/tour.js';
import { mountDesk } from './views/desk.js';
import { mountApprovals } from './views/approvals.js';
import { mountLogin } from './views/login.js';
import { isSignedIn, signOut } from './lib/session.js';
import { refreshCases } from './lib/control.js';

const state = { view: 'pulse', path: [], data: null, refreshing: false };

function paintChrome() {
  const s = t();
  const brand = $('[data-brand]');
  const brandSub = $('[data-brand-sub]');
  if (brand) brand.textContent = s.brand;
  if (brandSub) brandSub.textContent = s.brandSub;
  const liveWord = $('[data-live-word]');
  if (liveWord) liveWord.textContent = s.live;
  const live = $('[data-live]');
  if (live) {
    const tip = s.liveTip || 'Live · the certified pack is current';
    live.setAttribute('aria-label', tip);
    live.setAttribute('title', tip);
    live.dataset.tip = tip;
  }
  const displayWord = $('[data-display-word]');
  if (displayWord) displayWord.textContent = s.display;
  const guideBtn = $('[data-tour-start]');
  if (guideBtn) guideBtn.textContent = s.guide;
  const outBtn = $('[data-sign-out]');
  if (outBtn) outBtn.textContent = s.signOut || 'Sign out';
  const setK = $('[data-set-menu-k]');
  if (setK) setK.textContent = s.setTitle || 'Settings';
  const setLabels = {
    help: s.setHelpShort || 'Help',
    glossary: s.setGlossary || 'Glossary',
    owners: s.setOwners || 'KPI owners',
    mail: s.setMail || 'Email alerts'
  };
  for (const b of $$('[data-open-settings]')) {
    const key = b.dataset.openSettings;
    if (setLabels[key]) b.textContent = setLabels[key];
  }
  const themeMenu = $('[data-theme-menu]');
  if (themeMenu) themeMenu.setAttribute('aria-label', s.theme);
  const shellMenu = $('[data-shell-menu]');
  if (shellMenu) shellMenu.setAttribute('aria-label', s.layout);
  const langMenu = $('[data-lang-menu]');
  if (langMenu) langMenu.setAttribute('aria-label', s.language);
  for (const tab of $$('#tabs .tab')) {
    const id = tab.dataset.v;
    if (s.tabs[id]) tab.textContent = s.tabs[id];
    if (s.tabHints?.[id]) {
      tab.title = s.tabHints[id];
      tab.setAttribute('aria-label', `${s.tabs[id]} · ${s.tabHints[id]}`);
    }
  }
  const stamp = $('[data-dock-stamp]');
  if (stamp && state.data?.brief?.source) {
    const src = state.data.brief.source;
    stamp.textContent = `${src.asOfLabel || STAMP} · meeting ${src.meeting ?? '-'}`;
  }
}

let chat = null;
let desk = null;
let approvals = null;
let login = null;
let tour = null;
let floatNav = null;

function go(view, { scroll = true } = {}) {
  state.view = view;
  for (const tab of $$('#tabs .tab')) tab.setAttribute('aria-selected', String(tab.dataset.v === view));
  for (const id of TAB_IDS) $(`#v-${id}`)?.classList.toggle('hide', id !== view);
  chat?.onView?.(view);
  floatNav?.closeMore();
  floatNav?.refresh();
  if (scroll) window.scrollTo({ top: 0 });
}

function openView(id) {
  if (id === 'drill') {
    openDrill(state.path.length ? state.path : ['fdi']);
    return;
  }
  if (id === 'pulse') {
    renderPulse($('#v-pulse'), state.data, pulseCtx());
    go('pulse');
    return;
  }
  state.view = id;
  if (id === 'fdi') renderFdi($('#v-fdi'), state.data, { openDrill });
  if (id === 'now') renderNowcastView($('#v-now'), state.data);
  if (id === 'alerts') renderAlerts($('#v-alerts'), state.data, workCtx());
  if (id === 'qual') renderQuality($('#v-qual'));
  if (id === 'intake') renderIntake($('#v-intake'), state.data, { refreshBoard: refreshData });
  if (id === 'inv') renderInventory($('#v-inv'), state.data.inventory);
  if (id === 'about') renderProvenance($('#v-about'));
  go(id);
}

function workCtx() {
  return { openDrill, go, openApproval: (id) => approvals?.open(id) };
}

function openWork(tab) {
  renderAlerts($('#v-alerts'), { ...state.data, startTab: tab }, workCtx());
  go('alerts');
}

function pulseCtx() {
  return { openDrill, go, openWork };
}

function openSettings(section) {
  desk?.open('settings', section);
}

function openDrill(path) {
  if (!path?.length) {
    state.path = [];
    renderPulse($('#v-pulse'), state.data, pulseCtx());
    go('pulse');
    return;
  }
  state.path = path;
  renderDrill($('#v-drill'), state.path, state.data, (next) => {
    if (!next?.length) {
      openDrill([]);
      return;
    }
    state.path = next;
    renderDrill($('#v-drill'), state.path, state.data, openDrill);
  });
  go('drill');
}

function renderActive() {
  if (!state.data) return;
  paintChrome();
  if (state.view === 'pulse') renderPulse($('#v-pulse'), state.data, pulseCtx());
  else if (state.view === 'fdi') renderFdi($('#v-fdi'), state.data, { openDrill });
  else if (state.view === 'drill') openDrill(state.path.length ? state.path : ['fdi']);
  else if (state.view === 'now') renderNowcastView($('#v-now'), state.data);
  else if (state.view === 'alerts') renderAlerts($('#v-alerts'), state.data, workCtx());
  else if (state.view === 'qual') renderQuality($('#v-qual'));
  else if (state.view === 'intake') renderIntake($('#v-intake'), state.data, { refreshBoard: refreshData });
  else if (state.view === 'inv') renderInventory($('#v-inv'), state.data.inventory);
  else if (state.view === 'about') renderProvenance($('#v-about'));
  go(state.view);
  desk?.refresh();
  approvals?.refresh();
}

async function refreshData() {
  if (state.refreshing) return;
  state.refreshing = true;
  const btn = $('[data-refresh]');
  const lab = btn?.querySelector('span');
  if (btn) {
    btn.disabled = true;
    if (lab) lab.textContent = '…';
  }
  try {
    state.data = await loadAll();
    renderActive();
    if (lab) lab.textContent = 'Done';
    setTimeout(() => {
      if (lab) lab.textContent = 'Refresh';
    }, 1400);
  } catch (err) {
    if (lab) lab.textContent = 'Failed';
    console.error(err);
  } finally {
    state.refreshing = false;
    if (btn) btn.disabled = false;
  }
}

function mountSeg(host, kicker, items, current, onPick) {
  if (!host) return;
  host.innerHTML = `<span class="seg-k">${kicker}</span><span class="seg-track"></span>`;
  const track = host.querySelector('.seg-track');
  for (const item of items) {
    const b = el(`<button type="button" class="seg-opt ${item.id === current ? 'on' : ''}" data-id="${item.id}" title="${item.desc || item.label}">${item.label}</button>`);
    b.onclick = () => {
      onPick(item.id);
      for (const x of track.querySelectorAll('.seg-opt')) x.classList.toggle('on', x.dataset.id === item.id);
    };
    track.appendChild(b);
  }
}

function mountTheme() {
  const s = t();
  mountSeg($('[data-theme-menu]'), s.theme, THEMES, getTheme(), applyTheme);
}

function mountShell() {
  const s = t();
  mountSeg($('[data-shell-menu]'), s.layout, [
    { id: 'phone', label: 'Mobile', desc: 'Phone-width simulation, 430px' },
    { id: 'desk', label: 'Web', desc: 'Desktop layout' }
  ], getShell(), applyShell);
}

function mountLang() {
  const s = t();
  mountSeg($('[data-lang-menu]'), s.language, [
    { id: 'en', label: 'EN' },
    { id: 'ar', label: 'AR' }
  ], getLang(), (id) => setLang(id));
}

function mountDisplay() {
  const wrap = $('[data-display]');
  const btn = $('[data-display-open]');
  const menu = $('#pulse-display');
  if (!wrap || !btn || !menu) return;

  function setOpen(next) {
    menu.hidden = !next;
    btn.setAttribute('aria-expanded', String(next));
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(menu.hidden);
  });
  $('[data-tour-start]', menu)?.addEventListener('click', () => setOpen(false));
  for (const b of $$('[data-open-settings]', menu)) {
    b.addEventListener('click', () => {
      setOpen(false);
      openSettings(b.dataset.openSettings);
    });
  }
  $('[data-sign-out]', menu)?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    tour?.stop();
    desk?.close();
    signOut();
  });
  $('[data-desk-open]')?.addEventListener('click', () => setOpen(false));
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !wrap.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) setOpen(false);
  });
}

async function boot() {
  initTheme();
  initShell();
  mountTheme();
  mountShell();
  mountLang();
  mountDisplay();
  paintChrome();
  login = mountLogin($('#auth-root'));
  const TOUR_KEY = 'misa-pulse-tour-launched';
  let wasSignedIn = isSignedIn();
  let pendingGuide = false;

  function launchGuide() {
    if (!isSignedIn()) return;
    if (!tour || !state.data) {
      pendingGuide = true;
      return;
    }
    pendingGuide = false;
    sessionStorage.setItem(TOUR_KEY, '1');
    window.setTimeout(() => {
      if (isSignedIn() && !document.body.classList.contains('signed-out')) {
        tour.start();
      }
    }, 520);
  }

  function applyAuth() {
    const on = isSignedIn();
    document.body.classList.toggle('signed-out', !on);
    document.body.classList.toggle('signed-in', on);
    if (on) {
      login?.hide();
      desk?.refresh();
      paintChrome();
      if (!wasSignedIn) launchGuide();
      wasSignedIn = true;
      return;
    }
    wasSignedIn = false;
    pendingGuide = false;
    sessionStorage.removeItem(TOUR_KEY);
    tour?.stop();
    chat?.close();
    desk?.close();
    approvals?.close();
    login?.show();
    paintChrome();
  }
  window.addEventListener('pulse-auth', applyAuth);
  applyAuth();
  const tabs = $('#tabs');
  const s = t();
  for (const id of TAB_IDS) {
    const hint = s.tabHints?.[id] || '';
    const b = el(`<button class="tab" role="tab" data-v="${id}" title="${hint}" aria-label="${s.tabs[id]} · ${hint}" aria-selected="${id === state.view}">${s.tabs[id]}</button>`);
    b.onclick = () => openView(id);
    tabs.appendChild(b);
  }
  floatNav = mountFloatNav($('#float-root'), {
    getView: () => state.view,
    onGo: openView
  });
  $('.brand')?.addEventListener('click', (e) => {
    e.preventDefault();
    desk?.close();
    approvals?.close();
    chat?.close();
    floatNav?.closeMore();
    openView('pulse');
  });

  onLangChange(() => {
    mountTheme();
    mountShell();
    mountLang();
    paintChrome();
    renderActive();
    desk?.refresh();
    login?.refresh();
    floatNav?.refresh();
  });

  state.data = await loadAll();
  await refreshCases();
  renderPulse($('#v-pulse'), state.data, pulseCtx());
  renderFdi($('#v-fdi'), state.data, { openDrill });
  renderNowcastView($('#v-now'), state.data);
  renderAlerts($('#v-alerts'), state.data, workCtx());
  renderQuality($('#v-qual'));
  renderIntake($('#v-intake'), state.data, { refreshBoard: refreshData });
  renderInventory($('#v-inv'), state.data.inventory);
  renderProvenance($('#v-about'));
  paintChrome();
  go('pulse');
  desk = mountDesk($('#desk-root'), {
    getData: () => state.data,
    go: (view) => {
      if (view === 'alerts') renderAlerts($('#v-alerts'), state.data, workCtx());
      go(view);
    },
    openDrill,
    startTour: () => tour?.start(),
    openAskOwner: (opts) => openAskOwnerDialog(opts)
  });
  approvals = mountApprovals($('#approve-root'), {
    getData: () => state.data,
    openDrill,
    go: (view) => {
      if (view === 'alerts') {
        renderAlerts($('#v-alerts'), state.data, workCtx());
        go('alerts');
      } else go(view);
    }
  });
  window.addEventListener('pulse-control', () => {
    approvals?.refresh();
    desk?.refresh();
    if (!state.data) return;
    if (state.view === 'alerts') renderAlerts($('#v-alerts'), state.data, workCtx());
  });
  tour = mountTour({ go, getView: () => state.view, closeDesk: () => desk?.close() });
  applyAuth();
  if (pendingGuide || (isSignedIn() && !sessionStorage.getItem(TOUR_KEY))) {
    launchGuide();
  }
  chat = mountChat($('#chat-root'), {
    getData: () => state.data,
    getView: () => state.view,
    startTour: () => tour.start(),
    openDrill,
    openAskOwner: (opts) => openAskOwnerDialog(opts),
    openDesk: (tab, section) => desk?.open(tab, section),
    go: (view, opts) => {
      if (view === 'settings') {
        openSettings(opts?.section);
        return;
      }
      openView(view);
    }
  });
}

boot().catch(err => {
  document.querySelector('.wrap').innerHTML =
    `<div class="card" style="margin-top:24px"><b>Could not start.</b><br>${err.message}
     <div class="meta" style="margin-top:8px">Run <code>npm start</code> and open the served URL.</div></div>`;
});
