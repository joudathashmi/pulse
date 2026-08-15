import { loadOwnerPatch } from './prefs.js';

/**
 * Qualification requests to metric owners (DEC-04/05 style).
 * Stored in localStorage for the prototype; swap for API later.
 */

const KEY = 'misa-pulse-owner-queries';

export function loadQueries() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('pulse-desk'));
  return list;
}

export function createQuery({
  metric = '',
  value = '',
  owner = '',
  ownerContact = '',
  question = '',
  alertId = null,
  title = ''
}) {
  const q = {
    id: `q-${Date.now().toString(36)}`,
    metric,
    value: String(value ?? ''),
    owner,
    ownerContact: ownerContact || defaultContact(owner),
    question: question.trim(),
    alertId,
    title: title || `${metric || 'Value'} · qualification`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    answer: null,
    answeredAt: null
  };
  const list = loadQueries();
  list.unshift(q);
  save(list);
  return q;
}

export function answerQuery(id, answer) {
  const list = loadQueries().map(q => {
    if (q.id !== id) return q;
    return {
      ...q,
      status: 'answered',
      answer,
      answeredAt: new Date().toISOString()
    };
  });
  save(list);
  return list.find(q => q.id === id);
}

export function closeQuery(id) {
  const list = loadQueries().map(q => q.id === id ? { ...q, status: 'closed' } : q);
  save(list);
  return list;
}

export function pendingCount() {
  return loadQueries().filter(q => q.status === 'pending').length;
}

function withPatch(patch, base) {
  if (!patch) return base;
  return {
    ...base,
    owner: patch.owner || base.owner,
    contact: patch.contact || base.contact
  };
}

function defaultContact(owner = '') {
  const o = owner.toLowerCase();
  if (o.includes('investment development')) return 'ida.steward@misa.gov.sa';
  if (o.includes('economic')) return 'economic.affairs@misa.gov.sa';
  if (o.includes('strategy')) return 'strategy@misa.gov.sa';
  return 'data.steward@misa.gov.sa';
}

/** Resolve owner for a headline / signal from pack context. */
export function ownerForMetric(metric, brief) {
  const id = (metric || '').toLowerCase();
  const patch = loadOwnerPatch()[id];
  const h = brief?.headlines?.[id];
  if (h?.owner) {
    return withPatch(patch, { owner: h.owner, contact: defaultContact(h.owner), value: h.pulseValue, label: h.name });
  }
  const sig = (brief?.signals || []).find(s => s.id === id || s.metric === id);
  if (sig) {
    const owner = (sig.id === 'deals' || sig.id === 'closure')
      ? 'Investment Development Agency'
      : sig.source?.includes('MISA') ? 'Ministry of Investment'
      : sig.source?.includes('GASTAT') ? 'GASTAT liaison · Economic Affairs'
      : sig.source?.includes('SAMA') ? 'SAMA liaison · Economic Affairs'
      : sig.source || 'Economic Affairs';
    return withPatch(patch, { owner, contact: defaultContact(owner), value: sig.value, label: sig.name });
  }
  if (id === 'fdi' || id === 'gfcf') {
    return withPatch(patch, {
      owner: 'Economic Affairs',
      contact: defaultContact('Economic Affairs'),
      value: '',
      label: id.toUpperCase()
    });
  }
  return withPatch(patch, { owner: 'Economic Affairs', contact: defaultContact('Economic Affairs'), value: '', label: metric || 'Indicator' });
}
