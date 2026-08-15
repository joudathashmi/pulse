import { el, $ } from '../lib/dom.js';
import { answerQuestion, pageHelp, nudgeHelp } from '../lib/assistant.js';

/**
 * Help and support on every tab - pack only, no external model.
 */
export function mountChat(host, { getData, openDrill, go, openAskOwner, openDesk, getView, startTour }) {
  host.innerHTML = `
    <button type="button" class="chat-fab" data-open aria-expanded="false" aria-controls="pulse-chat" aria-label="Ask Me">
      <svg class="chat-brain" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 8.8c-2.6-3.2-8.6-3.6-11.8.4C9.2 9.4 5.6 12.4 5.6 17.2c0 2.6 1.4 4.8 3.6 5.8-2 1.6-3.2 4-3 6.4.4 4.6 4.2 7.4 8.8 7.6 1.6 1.8 3.6 2.8 6.4 2.8H24"/>
        <path d="M24 8.8c2.6-3.2 8.6-3.6 11.8.4 3 0.2 6.6 3.2 6.6 8 0 2.6-1.4 4.8-3.6 5.8 2 1.6 3.2 4 3 6.4-.4 4.6-4.2 7.4-8.8 7.6-1.6 1.8-3.6 2.8-6.4 2.8H24"/>
        <path d="M24 11.6v26.2"/>
        <path d="M13.4 16.6c2.6.6 4.2 1.8 4.2 3.8s-1.8 3.2-4 3.6"/>
        <path d="M34.6 16.6c-2.6.6-4.2 1.8-4.2 3.8s1.8 3.2 4 3.6"/>
        <path d="M14.6 28.4c2.8.4 4.4 2 4.4 3.8"/>
        <path d="M33.4 28.4c-2.8.4-4.4 2-4.4 3.8"/>
        <path d="M18.2 13c2-1.2 4-1.2 5.8 0"/>
        <path d="M29.8 13c-2-1.2-4-1.2-5.8 0"/>
      </svg>
      <span class="chat-fab-word">Ask Me</span>
    </button>
    <section id="pulse-chat" class="chat-panel" hidden aria-label="Ask Me">
      <header class="chat-head">
        <div class="chat-head-id">
          <span class="chat-head-mark" aria-hidden="true">
            <svg class="chat-brain" viewBox="0 0 48 48">
              <path d="M24 9.5c-3.4-2.6-8.8-1.8-11.2 2.4-2.6.2-5.6 2.6-5.6 6.6 0 2.2 1.2 4.2 3.2 5.2-1.6 1.2-2.4 3.2-2.4 5.2 0 3.8 2.8 6.4 6.6 6.8 1.2.8 2.4 1.4 3.8 1.4H24"/>
              <path d="M24 9.5c3.4-2.6 8.8-1.8 11.2 2.4 2.6.2 5.6 2.6 5.6 6.6 0 2.2-1.2 4.2-3.2 5.2 1.6 1.2 2.4 3.2 2.4 5.2 0 3.8-2.8 6.4-6.6 6.8-1.2.8-2.4 1.4-3.8 1.4H24"/>
              <path d="M24 11.5v25.2"/>
            </svg>
          </span>
          <div>
            <div class="chat-title">Ask Me</div>
            <div class="chat-sub">Help and support · every page</div>
          </div>
        </div>
        <button type="button" class="chat-close" data-close aria-label="Close">×</button>
      </header>
      <div class="chat-stream" data-stream role="log" aria-live="polite"></div>
      <div class="chat-suggest" data-suggest></div>
      <form class="chat-form" data-form>
        <input type="text" data-input enterkeyhint="send" autocomplete="off"
          placeholder="Ask for help or support…" aria-label="Your question" />
        <button type="submit" class="chat-send" aria-label="Send">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.2 12h14.2M13.2 6.8 19.4 12l-6.2 5.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </form>
    </section>`;

  const panel = $('#pulse-chat', host);
  const stream = $('[data-stream]', host);
  const input = $('[data-input]', host);
  const suggest = $('[data-suggest]', host);
  const fab = $('[data-open]', host);

  const ctx = {
    openDrill: (path) => { openDrill?.(path); close(); },
    go: (view) => { go?.(view); close(); },
    openAskOwner: (opts) => { openAskOwner?.(opts); close(); },
    openDesk: (tab) => { openDesk?.(tab); close(); },
    getData,
    getView,
    startTour: () => { close(); startTour?.(); }
  };

  function suggestionsFor(view) {
    const extra = {
      pulse: ['Where do we stand?', 'Open my desk', 'Show alerts'],
      fdi: ['Who leads inflow?', 'Ask owner about FDI', 'Show alerts'],
      drill: ['How do I use this page?', 'Open FDI', 'Show alerts'],
      now: ['What is the nowcast?', 'Where do we stand?', 'Show alerts'],
      alerts: ['Show alerts', 'Ask owner about GFCF', 'My questions to owners'],
      qual: ['How do I use this page?', 'Show alerts', 'Open FDI'],
      intake: ['How do I use this page?', 'Open FDI', 'Show alerts'],
      inv: ['How do I use this page?', 'Where do we stand?', 'Open FDI'],
      about: ['How do I use this page?', 'Open FDI', 'Show alerts'],
      settings: ['Start the guide', 'Open the data glossary', 'Configure email alerts']
    };
    return ['Start the guide', 'I need help', ...(extra[view] || extra.pulse)];
  }

  function renderSuggest() {
    suggest.innerHTML = '';
    for (const s of suggestionsFor(getView?.() || 'pulse')) {
      const b = el(`<button type="button" class="chat-chip">${s}</button>`);
      b.onclick = () => ask(s);
      suggest.appendChild(b);
    }
  }

  function addBubble(role, text, actions = []) {
    const bubble = el(`<div class="chat-bubble ${role}"></div>`);
    const body = el(`<div class="chat-text"></div>`);
    body.textContent = text;
    bubble.appendChild(body);
    if (actions.length) {
      const row = el('<div class="chat-actions"></div>');
      for (const a of actions) {
        const b = el(`<button type="button" class="chat-action">${a.label}</button>`);
        b.onclick = () => {
          if (typeof a.run === 'function') a.run();
          else if (a.prompt) ask(a.prompt);
        };
        row.appendChild(b);
      }
      bubble.appendChild(row);
    }
    stream.appendChild(bubble);
    stream.scrollTop = stream.scrollHeight;
  }

  const OFFER_KEY = 'misa-pulse-ask-offered';
  let offered = sessionStorage.getItem(OFFER_KEY) === '1';
  let lastClick = Date.now();
  let lastMove = Date.now();
  let dismissedAt = 0;
  let moves = 0;
  let scrolls = 0;
  const hops = [];
  const started = Date.now();

  function ask(q) {
    const question = (q || '').trim();
    if (!question) return;
    addBubble('user', question);
    const res = answerQuestion(question, getData?.() || {}, ctx);
    addBubble('bot', res.text, res.actions || []);
    input.value = '';
  }

  function open(mode) {
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    fab.classList.add('is-open');
    document.body.classList.add('ask-open');
    fab.classList.remove('is-nudge');
    offered = true;
    sessionStorage.setItem(OFFER_KEY, '1');
    renderSuggest();
    if (mode === 'nudge') {
      const offer = nudgeHelp(getView?.());
      addBubble('bot', offer.text, offer.actions || []);
    } else if (!stream.childElementCount) {
      const page = pageHelp(getView?.());
      addBubble('bot', `How can I help? You are on ${page.name}. ${page.hint} Ask for support on a number, this page, or a named owner.`);
    }
    input.focus();
  }

  function close() {
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    fab.classList.remove('is-open');
    document.body.classList.remove('ask-open');
    dismissedAt = Date.now();
  }

  const vv = window.visualViewport;
  const syncKeyboard = () => {
    const inset = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    document.documentElement.style.setProperty('--kb', inset > 40 ? `${inset}px` : '0px');
  };
  vv?.addEventListener('resize', syncKeyboard);
  vv?.addEventListener('scroll', syncKeyboard);
  window.addEventListener('focusin', syncKeyboard);
  window.addEventListener('focusout', () => window.setTimeout(syncKeyboard, 80));
  syncKeyboard();

  fab.onclick = () => (panel.hidden ? open() : close());
  $('[data-close]', host).onclick = close;
  $('[data-form]', host).onsubmit = (e) => {
    e.preventDefault();
    ask(input.value);
  };

  function blocked() {
    return !panel.hidden
      || offered
      || document.body.classList.contains('tour-open')
      || document.body.classList.contains('desk-open')
      || document.body.classList.contains('signed-out')
      || document.getElementById('ask-owner-modal')
      || Date.now() - started < 22000
      || Date.now() - dismissedAt < 40000;
  }

  function looking() {
    if (blocked()) return false;
    const now = Date.now();
    const noClick = now - lastClick > 12000;
    const present = now - lastMove < 6000;
    const restless = moves >= 14 || scrolls >= 5;
    const recentHops = hops.filter(t => now - t < 14000);
    const hopping = recentHops.length >= 3 && now - recentHops[recentHops.length - 1] > 2500;
    return hopping || (noClick && present && restless);
  }

  function offerHelp() {
    if (blocked() || !looking()) return;
    offered = true;
    sessionStorage.setItem(OFFER_KEY, '1');
    fab.classList.add('is-nudge');
    window.setTimeout(() => {
      if (document.body.classList.contains('tour-open') || !panel.hidden) {
        fab.classList.remove('is-nudge');
        return;
      }
      open('nudge');
    }, 900);
  }

  const noteMove = () => { lastMove = Date.now(); moves += 1; };
  const noteClick = () => { lastClick = Date.now(); moves = 0; scrolls = 0; };
  document.addEventListener('mousemove', noteMove, { passive: true });
  document.addEventListener('pointerdown', noteClick, { passive: true });
  document.addEventListener('keydown', noteClick);
  document.addEventListener('scroll', () => { lastMove = Date.now(); scrolls += 1; }, { passive: true, capture: true });
  document.addEventListener('wheel', () => { lastMove = Date.now(); scrolls += 1; }, { passive: true });
  const tick = window.setInterval(offerHelp, 2000);

  renderSuggest();
  return {
    open,
    close,
    ask,
    onView: () => {
      renderSuggest();
      hops.push(Date.now());
      if (hops.length > 10) hops.shift();
    },
    stop: () => clearInterval(tick)
  };
}
