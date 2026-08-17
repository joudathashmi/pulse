import { el } from '../lib/dom.js';
import { t } from '../i18n.js';
import { listUsers, displayName, displayDept, getUser } from '../lib/session.js';
import { assignCase, displayStatus, fixCase, getCase } from '../lib/control.js';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function when(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function assigneeName(id) {
  if (!id) return '-';
  const user = listUsers().find(u => u.id === id);
  return user ? displayName(user) : id;
}

export function openControlCase(id, { onChanged } = {}) {
  const existing = document.getElementById('control-case-modal');
  if (existing) existing.remove();

  const paint = () => {
    const s = t();
    const row = getCase(id);
    if (!row) return;
    const me = getUser();
    const people = listUsers().filter(u => u.status !== 'disabled');
    const modal = document.getElementById('control-case-modal') || el(`<div class="ask-modal case-modal" id="control-case-modal" role="dialog" aria-modal="true"></div>`);
    modal.innerHTML = `
      <div class="ask-modal-card case-modal-card">
        <div class="wh-k">${s.ctrlCase || 'Control case'}</div>
        <div class="k" id="control-case-title">${esc(row.title)}</div>
        <p class="wh-est">${esc(row.reason)}</p>
        <dl class="sig-meta">
          <div><dt>${s.setKpi || 'KPI'}</dt><dd>${esc((row.kpi || '-').toUpperCase())}</dd></div>
          <div><dt>${s.ctrlPulled || 'Pulled value'}</dt><dd>${esc(row.pulledValue || '-')} ${esc(row.unit || '')}</dd></div>
          <div><dt>${s.ctrlPulse || 'Pulse print'}</dt><dd>${esc(row.pulseValue || '-')} ${esc(row.pulseUnit || '')} · ${esc(s.synthBadge || 'Synthetic · populated')}</dd></div>
          <div><dt>${s.owner || 'Owner'}</dt><dd>${esc(row.owner || '-')}</dd></div>
          <div><dt>${s.workSource || 'Source'}</dt><dd>${esc(row.source || '-')}</dd></div>
          <div><dt>${s.ctrlAssignee || 'Assignee'}</dt><dd>${esc(assigneeName(row.assignee))}</dd></div>
          <div><dt>${s.alertState || 'State'}</dt><dd>${esc(displayStatus(row, s))}</dd></div>
        </dl>
        <p class="wh-est"><b>${s.ctrlGates || 'Failed gates'}</b> · ${esc((row.failedGates || []).join(' · ') || '-')}</p>
        <p class="wh-est">${s.ctrlReadyHint || 'Ready means fit to consider for the next signed pack. The gold orb does not move until a later pack sign-off.'}</p>

        <label class="ask-label">${s.ctrlAssignee || 'Assignee'}
          <select data-assignee>
            <option value="">${s.ctrlUnassigned || 'Unassigned'}</option>
            ${people.map(u => `<option value="${esc(u.id)}" ${u.id === row.assignee ? 'selected' : ''}>${esc(displayName(u))} · ${esc(displayDept(u))}</option>`).join('')}
          </select>
        </label>
        <div class="ask-row">
          <button type="button" class="btn-primary" data-assign>${s.ctrlAssign || 'Assign'}</button>
        </div>

        <label class="ask-label">${s.ctrlWrong || 'What was wrong'}
          <textarea data-note rows="2" placeholder="${s.ctrlWrongPh || 'Units, vintage, or definition'}">${esc(row.fix?.note || '')}</textarea>
        </label>
        <label class="ask-label">${s.ctrlMap || 'How it is mapped'}
          <textarea data-map rows="2" placeholder="${s.ctrlMapPh || 'WB annual USD is not the GASTAT quarter'}">${esc(row.fix?.mapping || '')}</textarea>
        </label>
        <label class="ask-label">${s.ctrlEvidence || 'Evidence / source record'}
          <textarea data-ev rows="2">${esc(row.fix?.evidence || '')}</textarea>
        </label>
        <label class="ask-label">${s.ctrlProposed || 'Proposed pack interpretation (optional)'}
          <textarea data-prop rows="2">${esc(row.fix?.proposed || '')}</textarea>
        </label>
        <div class="ask-row">
          <button type="button" class="btn-primary" data-fix ${row.status === 'ready' ? 'disabled' : ''}>${s.ctrlFix || 'Save fix'}</button>
          <button type="button" class="btn-ghost" data-close>${s.cancel || 'Close'}</button>
        </div>

        <div class="wh-k" style="margin-top:16px">${s.ctrlAudit || 'Audit'}</div>
        <ul class="case-audit">
          <li>${esc(s.ctrlOpened || 'Opened')} · ${esc(when(row.createdAt))}</li>
          ${row.assignee ? `<li>${esc(s.ctrlAssign || 'Assign')} · ${esc(assigneeName(row.assignee))}</li>` : ''}
          ${row.fix ? `<li>${esc(s.ctrlStatusFix || 'In fix')} · ${esc(row.fix.byName || row.fix.by || '-')} · ${esc(when(row.fix.at))}${row.fix.mapping ? ` · ${esc(row.fix.mapping)}` : ''}</li>` : ''}
          ${row.tick ? `<li>${esc(s.ctrlTick || 'Tick')} · ${esc(row.tick.status)} · ${esc(row.tick.byName || row.tick.by || '-')} · ${esc(when(row.tick.at))}${row.tick.note ? ` · ${esc(row.tick.note)}` : ''}</li>` : ''}
          <li>${esc(s.ctrlUpdated || 'Updated')} · ${esc(when(row.updatedAt))}${me ? ` · ${esc(displayName(me))}` : ''}</li>
        </ul>
      </div>`;
    if (!modal.isConnected) document.body.appendChild(modal);

    const close = () => {
      if (modal._esc) document.removeEventListener('keydown', modal._esc);
      modal.remove();
    };
    modal.querySelector('[data-close]').onclick = close;
    modal.addEventListener('pointerdown', (e) => {
      if (e.target === modal) close();
    });
    if (!modal._esc) {
      modal._esc = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', modal._esc);
    }
    modal.querySelector('[data-assign]').onclick = async () => {
      await assignCase(id, modal.querySelector('[data-assignee]')?.value || '');
      onChanged?.();
      paint();
    };
    modal.querySelector('[data-fix]').onclick = async () => {
      await fixCase(id, {
        note: modal.querySelector('[data-note]')?.value || '',
        mapping: modal.querySelector('[data-map]')?.value || '',
        evidence: modal.querySelector('[data-ev]')?.value || '',
        proposed: modal.querySelector('[data-prop]')?.value || ''
      });
      onChanged?.();
      paint();
    };
  };

  paint();
}
