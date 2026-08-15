/**
 * Sign-off queue from open control cases.
 * A tick is recorded on the case. Pulse headlines are never written here.
 */
import { getUser, canOpenAdmin, userOwns, displayName } from './session.js';
import { isOpenCase, listCases, tickCase } from './control.js';

const MSG_KEY = 'misa-pulse-inbox-extra-v1';

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadExtraInbox() {
  const list = read(MSG_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function addDeskMessage({ toDept, from, title, body, kind = 'reply', alertId = '' }) {
  const row = {
    id: `ap-${Date.now().toString(36)}`,
    from: from || 'Pulse',
    fromContact: '',
    title,
    titleAr: title,
    body,
    bodyAr: body,
    at: new Date().toISOString(),
    kind,
    alertId,
    toDept
  };
  const next = [row, ...loadExtraInbox()];
  localStorage.setItem(MSG_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('pulse-desk'));
  return row;
}

function counterpart(owner = '') {
  const o = owner.toLowerCase();
  if (o.includes('investment development')) return 'Economic Affairs';
  if (o.includes('methodology')) return 'Economic Affairs';
  return 'Digital Transformation';
}

function toItem(c) {
  return {
    id: c.id,
    title: c.title,
    detail: c.reason,
    owner: c.owner,
    source: c.source,
    gate: (c.failedGates || []).join(' · ') || 'Human sign-off',
    kpi: c.kpi || '',
    value: c.pulledValue ? `${c.pulledValue} ${c.unit || ''}`.trim() : '',
    pulseValue: c.pulseValue ? `${c.pulseValue} ${c.pulseUnit || ''}`.trim() : '',
    path: c.path || null,
    go: c.go || 'intake',
    requestedBy: counterpart(c.owner),
    kind: 'control',
    status: c.status,
    assignee: c.assignee,
    fix: c.fix,
    tick: c.tick
  };
}

export function catalog() {
  return listCases().map(toItem);
}

export function mine(data = {}, user = getUser()) {
  if (!user) return [];
  return listCases().filter(c => {
    if (!isOpenCase(c)) return false;
    if (canOpenAdmin(user)) return true;
    if (c.assignee && c.assignee === user.id) return true;
    return userOwns(user, c.owner);
  }).map(toItem);
}

export function pendingCount(data = {}, user = getUser()) {
  return mine(data, user).length;
}

export async function decide(id, status, note) {
  const item = catalog().find(x => x.id === id);
  if (!item) return null;
  const user = getUser();
  const row = await tickCase(id, { status, note });
  const who = displayName(user) || 'A desk';
  const approved = status === 'approved';
  addDeskMessage({
    toDept: item.requestedBy,
    from: who,
    title: `${approved ? 'Approved' : 'Returned'} · ${item.title}`,
    body: note?.trim()
      || (approved
        ? `${who} signed this after checking the source. The figure may proceed to a later pack. The certified Pulse was not overwritten.`
        : `${who} returned this. It stays held until another look.`),
    kind: approved ? 'reply' : 'ask',
    alertId: item.id
  });
  return row;
}
