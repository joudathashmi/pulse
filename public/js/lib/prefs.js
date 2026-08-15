/**
 * Desk preferences for the prototype. Swap for ministry profile API later.
 */

const OWNER_KEY = 'misa-pulse-owners-v1';
const MAIL_KEY = 'misa-pulse-mail-alerts-v1';

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadOwnerPatch() {
  const raw = read(OWNER_KEY, {});
  return raw && typeof raw === 'object' ? raw : {};
}

export function setOwnerPatch(id, next) {
  const all = loadOwnerPatch();
  const key = String(id || '').toLowerCase();
  if (!key) return all;
  if (!next) delete all[key];
  else {
    all[key] = {
      owner: String(next.owner || '').trim(),
      contact: String(next.contact || '').trim(),
      userId: next.userId || ''
    };
  }
  localStorage.setItem(OWNER_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent('pulse-desk'));
  return all;
}

export function defaultMailPrefs(user) {
  return {
    email: user?.email || '',
    onRisk: true,
    onWatch: false,
    onOverdue: true,
    onReply: true,
    digest: 'daily'
  };
}

export function loadMailPrefs(user) {
  const saved = read(MAIL_KEY, null);
  return { ...defaultMailPrefs(user), ...(saved && typeof saved === 'object' ? saved : {}) };
}

export function saveMailPrefs(prefs) {
  const next = {
    email: String(prefs.email || '').trim(),
    onRisk: Boolean(prefs.onRisk),
    onWatch: Boolean(prefs.onWatch),
    onOverdue: Boolean(prefs.onOverdue),
    onReply: Boolean(prefs.onReply),
    digest: ['off', 'immediate', 'daily'].includes(prefs.digest) ? prefs.digest : 'daily'
  };
  localStorage.setItem(MAIL_KEY, JSON.stringify(next));
  return next;
}
