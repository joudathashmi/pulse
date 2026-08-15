import { el, $ } from '../lib/dom.js';
import { t } from '../i18n.js';
import { FLOAT_PRIMARY, FLOAT_MORE, TAB_IDS } from '../config.js';

const ICONS = {
  pulse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.6 11.1 12 4.7l7.4 6.4V20H14.4v-5.4H9.6V20H4.6Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.6 13.2h2l1.1-2.6 1.7 5 1.1-2.4H15.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  fdi: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.8 12h16.4M12 3.8c2.4 2.2 3.8 5.1 3.8 8.2s-1.4 6-3.8 8.2C9.6 18.1 8.2 15.2 8.2 12S9.6 5.9 12 3.8Z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  alerts: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.4c-2.4 0-4.4 1.9-4.4 4.2v2.2c0 1.2-.4 2.3-1.2 3.2L5.4 15h13.2l-1-1c-.8-.9-1.2-2-1.2-3.2V8.6c0-2.3-2-4.2-4.4-4.2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10.2 17.6h3.6c0 .9-.8 1.6-1.8 1.6s-1.8-.7-1.8-1.6Z" fill="currentColor"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
};

function shortLabel(id, s) {
  if (id === 'pulse') return s.floatHome || 'Home';
  if (id === 'fdi') return s.floatFdi || 'FDI';
  if (id === 'alerts') return s.floatAlerts || 'Alerts';
  return s.tabShort?.[id] || s.tabs?.[id] || id;
}

export function mountFloatNav(host, { onGo, getView } = {}) {
  if (!host) return { refresh() {}, closeMore() {} };

  host.innerHTML = `
    <nav class="float-pill" aria-label="Boards">
      <div class="float-items" data-float-items></div>
    </nav>`;

  const more = el(`<div class="float-more hide" data-float-more>
    <button type="button" class="float-more-scrim" data-float-scrim aria-label="Close"></button>
    <div class="float-more-sheet" role="dialog" aria-modal="true" aria-label="More boards">
      <div class="wh-k" data-float-more-k>More</div>
      <div class="float-more-list" data-float-more-list></div>
    </div>
  </div>`);
  document.querySelectorAll('[data-float-more]').forEach(n => n.remove());
  document.body.appendChild(more);

  const items = $('[data-float-items]', host);
  const moreList = $('[data-float-more-list]', more);
  const moreK = $('[data-float-more-k]', more);

  function setMore(open) {
    more.classList.toggle('hide', !open);
    document.body.classList.toggle('more-open', open);
    host.querySelector('[data-float-more-btn]')?.setAttribute('aria-expanded', String(open));
  }

  function closeMore() {
    setMore(false);
  }

  function openMore() {
    setMore(true);
  }

  function paint() {
    const s = t();
    const view = getView?.() || 'pulse';
    const inMore = FLOAT_MORE.includes(view);
    const open = !more.classList.contains('hide');
    moreK.textContent = s.floatMore || 'More';

    items.innerHTML = '';
    for (const id of FLOAT_PRIMARY) {
      const on = view === id;
      const b = el(`<button type="button" class="float-item ${on ? 'is-on' : ''}" data-float="${id}" aria-current="${on ? 'page' : 'false'}">
        <span class="float-ico">${ICONS[id]}</span>
        <span class="float-lab">${shortLabel(id, s)}</span>
      </button>`);
      b.onclick = () => {
        closeMore();
        onGo?.(id);
      };
      items.appendChild(b);
    }
    const moreBtn = el(`<button type="button" class="float-item ${inMore || open ? 'is-on' : ''}" data-float-more-btn aria-expanded="${open}">
      <span class="float-ico">${ICONS.more}</span>
      <span class="float-lab">${s.floatMore || 'More'}</span>
    </button>`);
    moreBtn.onclick = () => {
      if (more.classList.contains('hide')) openMore();
      else closeMore();
    };
    items.appendChild(moreBtn);

    moreList.innerHTML = '';
    for (const id of FLOAT_MORE) {
      const on = view === id;
      const b = el(`<button type="button" class="float-more-item ${on ? 'is-on' : ''}" data-float="${id}">
        <b>${s.tabs?.[id] || id}</b>
        <span>${s.tabHints?.[id] || ''}</span>
      </button>`);
      b.onclick = () => {
        closeMore();
        onGo?.(id);
      };
      moreList.appendChild(b);
    }
  }

  $('[data-float-scrim]', more)?.addEventListener('click', closeMore);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMore();
  });

  paint();
  return { refresh: paint, closeMore };
}

export function isFloatView(id) {
  return TAB_IDS.includes(id);
}
