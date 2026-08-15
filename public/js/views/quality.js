import { el, $ } from '../lib/dom.js';
import { t } from '../i18n.js';
import { displayStatus, gateCounts, listCases } from '../lib/control.js';
import { openControlCase } from './controlCase.js';

export function renderQuality(root) {
  const s = t();
  root.innerHTML = `
    <div class="stage"><div class="panel" style="padding-top:20px">
      <h1>IMF DQAF · quality gates</h1>
      <p class="lede">${s.ctrlQualLede || 'Live pulls are checked against six gates. Failed values are quarantined, assigned, fixed, and ticked. The certified Pulse is not overwritten here. A machine flags. A person signs. The orb does not move until a later pack sign-off.'}</p>
      <div class="k" style="margin-top:18px">Gates this cycle</div>
      <div data-gates style="margin-top:10px"></div>
      <div class="k" style="margin-top:22px">Exception queue</div>
      <div data-exq style="margin-top:10px"></div>
    </div></div>`;

  const paint = () => {
    const cases = listCases();
    const g = $('[data-gates]', root);
    const q = $('[data-exq]', root);
    if (!g || !q) return;
    g.innerHTML = '';
    q.innerHTML = '';
    gateCounts(cases).forEach((gate, i) => {
      g.appendChild(el(`<div class="gate"><div class="n">${i + 1}</div>
        <div class="t"><b>${gate.name}</b><span>${gate.detail}</span></div>
        <div class="c">${gate.checked} ${s.ctrlChecked || 'live cases'}<br><b class="${gate.held ? 'warn' : 'good'}">${gate.held} ${s.ctrlHeldCycle || 'held this cycle'}</b></div></div>`));
    });
    if (!cases.length) {
      q.appendChild(el(`<p class="wh-est">${s.ctrlNoCases || 'No quarantined cases this cycle. Pull live sources on Intake.'}</p>`));
      return;
    }
    for (const c of cases) {
      const card = el(`<div class="alert ${c.status === 'ready' ? 'ok' : 'watch'}">
        <div class="t">${c.title}</div>
        <div class="d">${c.reason}</div>
        <div class="m"><span class="tag n">${displayStatus(c, s)}</span> owner <b>${c.owner || '—'}</b> · ${(c.failedGates || []).join(' · ') || '—'}</div>
        <div class="a">${c.tick
          ? `${s.ctrlTick || 'Tick'} · ${c.tick.status} · ${c.tick.byName || c.tick.by || '—'} · ${(c.tick.at || '').slice(0, 16).replace('T', ' ')}`
          : (s.ctrlReadyHint || 'A machine flags. A person signs. The orb does not move until a later pack sign-off.')}</div>
        <button type="button" class="btn-ask" data-open="${c.id}">${s.ctrlOpen || 'Open'}</button>
      </div>`);
      card.querySelector('[data-open]').onclick = () => openControlCase(c.id);
      q.appendChild(card);
    }
  };

  paint();
  root._paintQuality = paint;
  if (!root._ctrlBound) {
    root._ctrlBound = true;
    window.addEventListener('pulse-control', () => {
      if (!root.isConnected) return;
      root._paintQuality?.();
    });
  }
}
