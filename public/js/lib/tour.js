import { $, el } from './dom.js';
import { isSignedIn } from './session.js';

const STEPS = [
  {
    view: 'pulse',
    sel: '.brand',
    title: 'Investment Pulse Operating System',
    body: 'The certified operating picture for FDI and GFCF. The logo and Pulse take you home. This product is the live pack - not a spreadsheet and not a draft.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="tabs"]',
    title: 'Move by tab',
    body: 'On a phone the boards sit in the floating pill: Home, FDI, Alerts, and More. On a wide desk they stay in the top bar. Settings is in Display and on your desk.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="desk"]',
    title: 'Your desk',
    body: 'Your work: messages, assignments, KPIs you own, and Settings. Admin also sees People. Sign out is on this desk and in Display. Ministry tabs stay in the bar.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="approvals"]',
    title: 'Approvals',
    body: 'The bell is what is waiting on you: a held KPI or a figure that needs sign-off. Open it, check the source, then approve or return. The requesting desk gets the message.'
  },
  {
    view: 'pulse',
    sel: '[data-display-open]',
    title: 'Settings',
    body: 'Help, the glossary, KPI owners and email alerts live in Display, with Theme and Sign out. The same Settings tab is on your desk. Not a board tab.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="orb"]',
    title: 'The Pulse',
    body: 'The gold ring is the certified headline. Switch FDI and GFCF. Tap the ring to trace the number.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="highlight"]',
    title: 'Today on the pack',
    body: 'One insight at a time. Tap the card to open it. The dots step through alerts and pack notes. FDI and GFCF monitors sit under it.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="explore"]',
    title: 'Explore the pack',
    body: 'The certified series only - 2 headlines and 20 leading signals. Filter, switch Trend / Bars / Pulse, tap a row to drill to the source record. The ◆ mark is the definition and owner. How the number arrives and the connector list live on Intake.'
  },
  {
    view: 'intake',
    sel: '.wh-pipe',
    title: 'How the number arrives',
    body: 'S1 to S6 is the intake path: acquire, certify, compute, nowcast, decide, act. A machine pulls. A person signs. The certified Pulse is not overwritten here.'
  },
  {
    view: 'fsa',
    sel: '.fsa-mast',
    title: 'Financial statements',
    body: 'A separate desk. Upload an IFRS PDF or Excel. The extractor maps English and Arabic line items. Gate, assess, then ask the selected filing. It never writes the certified Pulse.'
  },
  {
    view: 'fdi',
    sel: '[data-tour="map"]',
    title: 'World map',
    body: 'Immediate-country inflows into the Kingdom. Gold arrows are counterparts with a published row. Use + and − to zoom, drag to pan, Play from 2021 to walk the years. Click a country to pin its arrow.'
  },
  {
    view: 'fdi',
    sel: '[data-tour="flags"]',
    title: 'Flag list',
    body: 'The readable rank. The map names only the largest origins so labels do not stack. Tap a chip to pin that country on the map.'
  },
  {
    view: 'pulse',
    sel: '.chat-fab',
    title: 'Ask Me',
    body: 'Help and support on every tab. It reads the certified pack only - no external model. Ask what a page does, open FDI, or ask a named owner to qualify a number.'
  },
  {
    view: 'pulse',
    sel: '[data-tour="share"]',
    title: 'Share and export',
    body: 'Copy, Teams and email sit on the live position. CSV, the report and PDF sit on Explore, next to the series they export. Raw pack is its own section. Live pulls sit on Intake.'
  }
];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function mountTour({ go, getView, closeDesk }) {
  const start = $('[data-tour-start]');
  if (!start) return { start: () => {}, stop: () => {} };

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

  async function paint() {
    const step = STEPS[i];
    if (step.view && getView?.() !== step.view) {
      go?.(step.view, { scroll: false });
      await wait(40);
    }
    const target = step.sel === '[data-tour="tabs"]'
      ? (() => {
        const dock = document.querySelector('.float-dock');
        const pill = document.querySelector('.float-pill');
        if (dock && pill && getComputedStyle(dock).display !== 'none') return pill;
        return document.querySelector('.tabs');
      })()
      : document.querySelector(step.sel);
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
      await wait(30);
    }
    if (!root) return;
    const hole = $('[data-tour-hole]', root);
    const card = $('[data-tour-card]', root);
    $('[data-tour-k]', root).textContent = `${i + 1} / ${STEPS.length}`;
    $('[data-tour-title]', root).textContent = step.title;
    $('[data-tour-body]', root).textContent = step.body;
    $('[data-tour-back]', root).disabled = i === 0;
    $('[data-tour-next]', root).textContent = i === STEPS.length - 1 ? 'Done' : 'Next';
    document.querySelectorAll('.is-tour').forEach(n => n.classList.remove('is-tour'));
    if (target) {
      target.classList.add('is-tour');
      const box = holeBox(target);
      hole.hidden = false;
      hole.style.top = `${box.top}px`;
      hole.style.left = `${box.left}px`;
      hole.style.width = `${box.width}px`;
      hole.style.height = `${box.height}px`;
      placeCard(card, box);
    } else {
      hole.hidden = true;
      card.style.top = '20%';
      card.style.left = '50%';
      card.style.transform = 'translateX(-50%)';
    }
  }

  function stop() {
    document.querySelectorAll('.is-tour').forEach(n => n.classList.remove('is-tour'));
    window.removeEventListener('keydown', onKey);
    root?.remove();
    root = null;
    document.body.classList.remove('tour-open');
    go?.(origin, { scroll: false });
  }

  async function begin() {
    if (!isSignedIn()) return;
    if (root) stop();
    closeDesk?.();
    origin = getView?.() || 'pulse';
    i = 0;
    root = el(`<div class="tour" role="dialog" aria-label="Guided tour">
      <div class="tour-veil" data-tour-veil></div>
      <div class="tour-hole" data-tour-hole hidden></div>
      <article class="tour-card" data-tour-card>
        <div class="tour-card-k" data-tour-k></div>
        <h2 data-tour-title></h2>
        <p data-tour-body></p>
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

  start.addEventListener('click', begin);
  window.addEventListener('resize', () => { if (root) paint(); });
  return { start: begin, stop };
}
