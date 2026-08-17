import { $, el } from './dom.js';
import { isSignedIn } from './session.js';
import { t } from '../i18n.js';

const GUIDE_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path fill="currentColor" d="M7.15 6.05c0-.55.48-1 1.12-1 .62 0 1.08.42 1.08.98 0 .4-.18.64-.7 1.12l-.38.36c-.42.4-.62.78-.62 1.38v.18h1.28v-.16c0-.32.12-.54.52-.92l.4-.38c.7-.64 1.02-1.12 1.02-1.82 0-1.18-.98-2.04-2.4-2.04-1.48 0-2.42.9-2.42 2.14h1.3zm.28 5.62h1.42V10.2H7.43v1.47z"/></svg>`;

const STEPS = [
  {
    kind: 'deck',
    kicker: 'Welcome',
    title: 'What this system is',
    body: 'Investment Pulse OS is the certified operating picture for FDI and GFCF. The gold ring is the signed pack. Tabs around it are how you trace a number, pull a feed, hold a value, or read a filing. Nothing here overwrites the Pulse until a named person signs.',
    shots: [
      { id: 'home', view: 'pulse', cap: 'Live board', blurb: 'One gold ring. Two headlines. Twenty signals.' },
      { id: 'fdi', view: 'fdi', cap: 'FDI by country', blurb: 'Who invests into the Kingdom, year by year.' },
      { id: 'work', view: 'alerts', cap: 'Alerts and owners', blurb: 'Open signals, quarantine, and the next action.' },
      { id: 'fsa', view: 'fsa', cap: 'Financial Statements', blurb: 'Upload an IFRS filing, extract, gate, and ask.' }
    ]
  },
  {
    kind: 'deck',
    kicker: 'What you can do',
    title: 'Six moves on this desk',
    body: 'Tap a tile to jump to that board. Or press Next and the guide walks every tab, feature by feature. Hover any number later for its definition.',
    shots: [
      { id: 'trace', view: 'drill', cap: 'Trace a number', blurb: 'Headline, then source record.' },
      { id: 'intake', view: 'intake', cap: 'Intake', blurb: 'Published feeds. Six gates. A person signs.' },
      { id: 'quality', view: 'qual', cap: 'Quality', blurb: 'DQAF gates before Pulse can move.' },
      { id: 'ask', view: 'pulse', sel: '.chat-fab', cap: 'Ask Me', blurb: 'Help from the certified pack only.' }
    ]
  },
  {
    view: 'pulse',
    sel: '.brand',
    title: 'Home',
    body: 'The logo and Pulse take you back to the live board. This product is the signed pack, not a spreadsheet and not a draft.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="tabs"]',
    title: 'Move by tab',
    body: 'On a phone the boards sit in the floating pill: Home, FDI, Alerts, and More. On a wide desk they stay in the top bar. Guide stays in the header on every page.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="desk"]',
    title: 'Your desk',
    body: 'Messages, assignments, KPIs you own, and Settings. Admin also sees People. Sign out is on this desk and in Display.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="approvals"]',
    title: 'Approvals',
    body: 'The bell is what is waiting on you: a held KPI or a figure that needs sign-off. Open it, check the source, then approve or return.'
  },
  {
    view: 'pulse',
    sel: '[data-display-open]',
    title: 'Display',
    body: 'Theme, language, layout, glossary, KPI owners and email alerts. Guide also lives here if you need it again.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="orb"]',
    title: 'The Pulse',
    body: 'The gold ring is the certified headline in SAR billion. Switch FDI and GFCF. Hover the number for its definition. Tap the ring to trace it.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="highlight"]',
    title: 'Today on the pack',
    body: 'One insight at a time. Tap the card to open it. The dots step through alerts and pack notes.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="monitor"]',
    title: 'Monitors',
    body: 'FDI and GFCF side by side. Status is a word plus a mark, never colour alone. Hover the figure. Tap to open the board or the drill.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="work"]',
    title: 'Work on the pack',
    body: 'Open, overdue, quarantine, and actions. Held values do not enter the certified Pulse. Tap a count to open Alerts.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="explore"]',
    title: 'Explore',
    body: 'The certified series only: 2 headlines and 20 leading signals. Filter, switch Trend / Bars / Pulse, tap a row to drill. Hover any value for the definition.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="share"]',
    title: 'Share and export',
    body: 'Copy, Teams and email sit on the live position. CSV, the report and PDF sit on Explore, next to the series they export.'
  },
  {
    view: 'fdi',
    sel: '[data-tour="fdi-kpis"]',
    title: 'FDI figures',
    body: 'Year, stock, net flow and inflow for the selected cut. Hover a number for the definition. 2026 forecast columns on this host are synthetic and populated, not MISA calculations.'
  },
  {
    view: 'fdi',
    sel: '[data-tour="map"]',
    title: 'World map',
    body: 'Immediate-country inflows into the Kingdom. Gold arrows are counterparts with a published row. Use + and - to zoom, drag to pan, Play from 2021 to walk the years.'
  },
  {
    view: 'fdi',
    sel: '[data-tour="flags"]',
    title: 'Flag list',
    body: 'The readable rank. The map names only the largest origins so labels do not stack. Tap a chip to pin that country on the map.'
  },
  {
    view: 'drill',
    sel: '#v-drill .drill-bar',
    title: 'Trace a number',
    body: 'You arrived from Pulse. The path at the top is the trail home. Four taps: headline, indicator, sector or region, then the source record.'
  },
  {
    view: 'drill',
    sel: '#v-drill [data-levels]',
    title: 'Four levels',
    body: 'Each step keeps the control chain: source, method, status. Hover the hero figure for the same definition you saw on the board.'
  },
  {
    view: 'now',
    sel: '#v-now h1',
    title: 'In-quarter estimate',
    body: 'Estimate versus the official print after quarter-end. On this host the path is a populated synthetic figure, not a MISA calculation. It never replaces the certified Pulse.'
  },
  {
    view: 'now',
    sel: '#v-now [data-chart]',
    title: 'Path and backtest',
    body: 'Dashed is the estimate. Solid is the official print. The band is the range. Open the table under each chart. Hover a printed number for the definition.'
  },
  {
    view: 'alerts',
    sel: '#v-alerts h1',
    title: 'Alerts and owners',
    body: 'Open signals, quarantine, and the next action this cycle. Ask a named owner to qualify a figure. Held items stay off the gold ring.'
  },
  {
    view: 'qual',
    sel: '#v-qual h1',
    title: 'Quality gates',
    body: 'IMF DQAF. Six gates. A machine flags. A named person signs. The orb does not move until a later pack sign-off.'
  },
  {
    view: 'qual',
    sel: '#v-qual [data-gates]',
    title: 'Gates this cycle',
    body: 'Each gate shows live cases and how many are held. Hover the counts. Open the exception queue to assign, fix, and tick.'
  },
  {
    view: 'intake',
    sel: '.wh-pipe',
    title: 'How the number arrives',
    body: 'S1 to S6: acquire, certify, compute, nowcast, decide, act. Connectors pull published feeds. A person signs. Refresh does not overwrite the certified Pulse here.'
  },
  {
    view: 'fsa',
    sel: '.fsa-mast',
    title: 'Financial Statements',
    body: 'A separate desk. It never writes the certified Pulse. Upload an IFRS PDF or Excel. The extractor maps English and Arabic line items.'
  },
  {
    view: 'fsa',
    sel: '.fsa-upload',
    title: 'Upload, extract, ask',
    body: 'Drop a filing, gate the extract, then ask the selected file. Hover a ratio or a mapped line for what it means. Picture scans need a sibling Excel for the numbers.'
  },
  {
    view: 'inv',
    sel: '#v-inv h1',
    title: 'All indicators',
    body: 'The ministry catalogue. Pulse shows only the certified pack: 2 headlines and 20 signals. This list is the rest, including series still waiting on an owner or a share.'
  },
  {
    view: 'inv',
    sel: '#v-inv .grid',
    title: 'Inventory counts',
    body: 'Metrics, available, no owner, and sharing. Hover a count. Search and filter the table, then open a row for lineage. Nothing here enters Pulse until a steward certifies it.'
  },
  {
    view: 'about',
    sel: '#v-about h1',
    title: 'What is sourced',
    body: 'Real rows are loaded from source files. Modelled rows exist so the live path can be exercised on this prototype. Keep those two lists distinct.'
  },
  {
    view: 'pulse',
    sel: '.chat-fab',
    title: 'Ask Me',
    body: 'Help on every tab. It reads the certified pack only. Ask what a page does, open FDI, or ask a named owner to qualify a number. Guide is also the ? on each page title.'
  }
];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function firstFeatureIndex(view) {
  if (view === 'pulse') {
    const orb = STEPS.findIndex(s => s.sel === '[data-tour="orb"]');
    if (orb >= 0) return orb;
  }
  const i = STEPS.findIndex(s => s.kind !== 'deck' && s.view === view);
  return i < 0 ? STEPS.findIndex(s => s.kind !== 'deck') : i;
}

function shotIcon(id) {
  const icons = {
    home: '<svg viewBox="0 0 72 40" fill="none"><circle cx="20" cy="20" r="11" stroke="currentColor" stroke-width="2.4"/><circle cx="20" cy="20" r="5" fill="currentColor" opacity="0.35"/><path d="M38 12h26M38 20h20M38 28h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    fdi: '<svg viewBox="0 0 72 40" fill="none"><ellipse cx="36" cy="20" rx="16" ry="16" stroke="currentColor" stroke-width="2.2"/><ellipse cx="36" cy="20" rx="7" ry="16" stroke="currentColor" stroke-width="1.6"/><path d="M20 20h32M22 13h28M22 27h28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="50" cy="12" r="3.2" fill="currentColor"/><path d="M50 15.2v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    work: '<svg viewBox="0 0 72 40" fill="none"><rect x="14" y="8" width="44" height="8" rx="2" stroke="currentColor" stroke-width="1.6"/><rect x="14" y="20" width="44" height="8" rx="2" stroke="currentColor" stroke-width="1.6"/><circle cx="20" cy="12" r="1.8" fill="currentColor"/><circle cx="20" cy="24" r="1.8" fill="currentColor"/><path d="M58 8l4 7h-8l4-7z" fill="currentColor"/></svg>',
    fsa: '<svg viewBox="0 0 72 40" fill="none"><path d="M24 6h18l10 10v18H24V6z" stroke="currentColor" stroke-width="1.8"/><path d="M42 6v10h10" stroke="currentColor" stroke-width="1.8"/><path d="M30 22h16M30 28h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    trace: '<svg viewBox="0 0 72 40" fill="none"><path d="M12 20h16l8-10 8 20 8-10h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="60" cy="20" r="3" fill="currentColor"/></svg>',
    intake: '<svg viewBox="0 0 72 40" fill="none"><circle cx="14" cy="20" r="4" fill="currentColor"/><circle cx="32" cy="20" r="4" fill="currentColor"/><circle cx="50" cy="20" r="4" fill="currentColor"/><circle cx="64" cy="20" r="3.2" stroke="currentColor" stroke-width="1.6"/><path d="M18 20h10M36 20h10M54 20h7" stroke="currentColor" stroke-width="1.6"/></svg>',
    quality: '<svg viewBox="0 0 72 40" fill="none"><rect x="10" y="12" width="8" height="16" rx="1.5" fill="currentColor"/><rect x="22" y="12" width="8" height="16" rx="1.5" fill="currentColor" opacity="0.7"/><rect x="34" y="12" width="8" height="16" rx="1.5" fill="currentColor"/><rect x="46" y="12" width="8" height="16" rx="1.5" fill="currentColor" opacity="0.45"/><rect x="58" y="12" width="8" height="16" rx="1.5" stroke="currentColor" stroke-width="1.5"/></svg>',
    ask: '<svg viewBox="0 0 72 40" fill="none"><path d="M14 10h32a8 8 0 0 1 8 8v6a8 8 0 0 1-8 8H28l-10 6v-6h-4a8 8 0 0 1-8-8v-6a8 8 0 0 1 8-8z" stroke="currentColor" stroke-width="1.8"/><circle cx="58" cy="28" r="7" fill="currentColor"/></svg>'
  };
  return icons[id] || '';
}

function shotHtml(shot) {
  return `<button type="button" class="tour-shot" data-jump-view="${shot.view}" data-jump-sel="${shot.sel || ''}">
    <span class="tour-mini is-${shot.id}" aria-hidden="true">${shotIcon(shot.id)}</span>
    <b>${shot.cap}</b>
    <span>${shot.blurb}</span>
  </button>`;
}

export function pageGuideHtml(view) {
  const label = t().pageGuide || 'Guide for this page';
  return `<button type="button" class="page-guide" data-page-guide="${view}" title="${label}" aria-label="${label}">${GUIDE_ICON}</button>`;
}

export function stampPageGuide(root, view) {
  if (!root || !view || root.querySelector('[data-page-guide]')) return;
  const host = root.querySelector('h1, .fsa-mast h1, .wh-day b, .drill-bar-k');
  if (!host) return;
  host.classList.add('has-page-guide');
  host.insertAdjacentHTML('beforeend', pageGuideHtml(view));
}

export function mountTour({ go, getView, closeDesk }) {
  let i = 0;
  let origin = 'pulse';
  let root = null;

  function frameBox() {
    const phone = document.documentElement.getAttribute('data-shell') === 'phone';
    const frame = phone ? Math.min(390, window.innerWidth) : window.innerWidth;
    const inset = phone ? Math.max(0, (window.innerWidth - frame) / 2) : 0;
    return { frame, inset };
  }

  function holeBox(target) {
    const r = target.getBoundingClientRect();
    const { frame, inset } = frameBox();
    const pad = 8;
    const left = Math.max(inset + 8, r.left - pad);
    return {
      top: Math.max(8, r.top - pad),
      left,
      width: Math.min(inset + frame - left - 8, r.width + pad * 2),
      height: Math.min(window.innerHeight - 16, r.height + pad * 2)
    };
  }

  function placeCard(card, box) {
    const { frame, inset } = frameBox();
    const cw = Math.min(360, frame - 24);
    card.style.width = `${cw}px`;
    card.style.transform = '';
    const below = box.top + box.height + 14;
    const above = box.top - 14;
    const h = card.offsetHeight || 180;
    const floor = window.innerHeight - 12 - (document.querySelector('.float-dock')?.offsetHeight || 0);
    let top = below + h < floor ? below : Math.max(12, above - h);
    let left = Math.min(box.left, inset + frame - cw - 12);
    if (left < inset + 12) left = inset + 12;
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  function resolveTarget(step) {
    if (step.sel === '[data-tour="tabs"]') {
      const dock = document.querySelector('.float-dock');
      const pill = document.querySelector('.float-pill');
      if (dock && pill && getComputedStyle(dock).display !== 'none') return pill;
      return document.querySelector('.tabs');
    }
    return step.sel ? document.querySelector(step.sel) : null;
  }

  async function paint() {
    const step = STEPS[i];
    if (!step || !root) return;
    const deck = step.kind === 'deck';
    root.classList.toggle('is-deck', deck);
    if (!deck && step.view && getView?.() !== step.view) {
      go?.(step.view, { scroll: false });
      await wait(40);
    }
    const target = deck ? null : resolveTarget(step);
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
      await wait(30);
    }
    const hole = $('[data-tour-hole]', root);
    const card = $('[data-tour-card]', root);
    const shots = $('[data-tour-shots]', root);
    $('[data-tour-k]', root).textContent = `${i + 1} / ${STEPS.length}${step.kicker ? ` · ${step.kicker}` : ''}`;
    $('[data-tour-title]', root).textContent = step.title;
    $('[data-tour-body]', root).textContent = step.body;
    $('[data-tour-back]', root).disabled = i === 0;
    $('[data-tour-next]', root).textContent = i === STEPS.length - 1 ? 'Done' : 'Next';
    if (shots) {
      shots.hidden = !deck;
      shots.innerHTML = deck ? (step.shots || []).map(shotHtml).join('') : '';
      for (const b of shots.querySelectorAll('[data-jump-view]')) {
        b.onclick = () => {
          const sel = b.dataset.jumpSel;
          let next = -1;
          if (sel) next = STEPS.findIndex(s => s.sel === sel);
          if (next < 0) next = firstFeatureIndex(b.dataset.jumpView);
          if (next < 0) return;
          i = next;
          paint();
        };
      }
    }
    document.querySelectorAll('.is-tour').forEach(n => n.classList.remove('is-tour'));
    card.classList.toggle('is-deck', deck);
    if (deck) {
      hole.hidden = true;
      const { frame, inset } = frameBox();
      const cw = Math.min(560, frame - 24);
      card.style.width = `${cw}px`;
      card.style.left = `${inset + (frame - cw) / 2}px`;
      card.style.top = '50%';
      card.style.transform = 'translateY(-50%)';
      return;
    }
    if (target) {
      target.classList.add('is-tour');
      const box = holeBox(target);
      hole.hidden = false;
      hole.style.top = `${box.top}px`;
      hole.style.left = `${box.left}px`;
      hole.style.width = `${box.width}px`;
      hole.style.height = `${box.height}px`;
      placeCard(card, box);
      return;
    }
    hole.hidden = true;
    card.style.top = '20%';
    card.style.left = '50%';
    card.style.transform = 'translateX(-50%)';
  }

  function stop() {
    document.querySelectorAll('.is-tour').forEach(n => n.classList.remove('is-tour'));
    window.removeEventListener('keydown', onKey);
    root?.remove();
    root = null;
    document.body.classList.remove('tour-open');
    go?.(origin, { scroll: false });
  }

  async function begin(opts = {}) {
    if (!isSignedIn()) return;
    if (root) stop();
    closeDesk?.();
    origin = getView?.() || 'pulse';
    i = opts.view ? Math.max(0, firstFeatureIndex(opts.view)) : 0;
    root = el(`<div class="tour" role="dialog" aria-label="Guided tour">
      <div class="tour-veil" data-tour-veil></div>
      <div class="tour-hole" data-tour-hole hidden></div>
      <article class="tour-card" data-tour-card>
        <div class="tour-card-k" data-tour-k></div>
        <h2 data-tour-title></h2>
        <p data-tour-body></p>
        <div class="tour-shots" data-tour-shots hidden></div>
        <div class="tour-card-acts">
          <button type="button" class="tour-skip" data-tour-skip>Skip</button>
          <span class="tour-card-nav">
            <button type="button" class="wh-act" data-tour-back>Back</button>
            <button type="button" class="wh-act on" data-tour-next>Next</button>
          </span>
        </div>
      </article>
    </div>`);
    document.body.appendChild(root);
    document.body.classList.add('tour-open');
    $('[data-tour-skip]', root).onclick = stop;
    $('[data-tour-veil]', root).onclick = stop;
    $('[data-tour-back]', root).onclick = () => { if (i > 0) { i -= 1; paint(); } };
    $('[data-tour-next]', root).onclick = () => {
      if (i >= STEPS.length - 1) { stop(); return; }
      i += 1;
      paint();
    };
    window.addEventListener('keydown', onKey);
    await paint();
  }

  function onKey(e) {
    if (!root) return;
    if (e.key === 'Escape') stop();
    if (e.key === 'ArrowRight') $('[data-tour-next]', root)?.click();
    if (e.key === 'ArrowLeft') $('[data-tour-back]', root)?.click();
  }

  document.addEventListener('click', (e) => {
    const page = e.target.closest('[data-page-guide]');
    if (page) {
      e.preventDefault();
      e.stopPropagation();
      begin({ view: page.dataset.pageGuide });
      return;
    }
    if (e.target.closest('[data-tour-start]')) {
      e.preventDefault();
      begin();
    }
  });
  window.addEventListener('resize', () => { if (root) paint(); });
  return { start: begin, stop };
}
