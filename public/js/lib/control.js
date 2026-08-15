/**
 * Shared KPI control ledger. Pulse headlines are never written here.
 * Server JSON is the source of truth; localStorage is only a fallback.
 */
import { GATES } from '../fixtures/quality.js';
import { getUser, displayName } from './session.js';
import { maskCases } from './syntheticPack.js';

const KEY = 'misa-pulse-control-v1';

export const DQAF_GATES = GATES.map(g => g[0]);

let cache = readLocal();

function readLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function setCache(cases) {
  cache = maskCases(Array.isArray(cases) ? cases : []);
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch { /* quota */ }
  return cache;
}

function emit() {
  window.dispatchEvent(new CustomEvent('pulse-control'));
  window.dispatchEvent(new CustomEvent('pulse-approvals'));
  window.dispatchEvent(new CustomEvent('pulse-desk'));
}

export function listCases() {
  return cache;
}

export function getCase(id) {
  return cache.find(c => c.id === id) || null;
}

export function isOpenCase(c) {
  return c && c.status !== 'ready';
}

export function mapGate(label = '') {
  const s = String(label).toLowerCase();
  if (s.includes('schema') || s.includes('unit') || (s.includes('definition') && !s.includes('vintage'))) {
    return 'Schema and type';
  }
  if (s.includes('range') || s.includes('plausib')) return 'Range and plausibility';
  if (s.includes('hierarchy') || s.includes('reconcil') || s.includes('cross')) {
    return 'Cross-source reconciliation';
  }
  if (s.includes('anomaly') || s.includes('outlier') || s.includes('break')) return 'Anomaly detection';
  if (s.includes('complete') || s.includes('fresh') || s.includes('vintage') || s.includes('acquire')) {
    return 'Completeness and freshness';
  }
  return 'Human sign-off';
}

export function statusLabel(status, s = {}) {
  if (status === 'in_fix') return s.ctrlStatusFix || 'In fix';
  if (status === 'ready') return s.ctrlStatusReady || 'Ready for pack';
  if (status === 'returned') return s.ctrlStatusReturned || 'Returned';
  return s.ctrlStatusHeld || 'Held';
}

export function displayStatus(c, s = {}) {
  if (c?.tick?.status === 'returned' && c.status === 'held') return s.ctrlStatusReturned || 'Returned';
  return statusLabel(c?.status, s);
}

function mergeLocal(prev, incoming) {
  if (prev?.status === 'ready') {
    return { ...prev, updatedAt: prev.updatedAt };
  }
  return {
    id: incoming.id,
    title: incoming.title || prev?.title || incoming.id,
    kpi: incoming.kpi || prev?.kpi || '',
    period: incoming.period || prev?.period || '',
    source: incoming.source || prev?.source || '',
    pulledValue: incoming.pulledValue ?? prev?.pulledValue ?? '',
    unit: incoming.unit || prev?.unit || '',
    pulseValue: incoming.pulseValue ?? prev?.pulseValue ?? '',
    pulseUnit: incoming.pulseUnit || prev?.pulseUnit || 'SAR bn',
    failedGates: incoming.failedGates?.length ? incoming.failedGates : (prev?.failedGates || []),
    reason: incoming.reason || prev?.reason || '',
    owner: incoming.owner || prev?.owner || '',
    path: incoming.path || prev?.path || null,
    go: incoming.go || prev?.go || 'intake',
    assignee: prev?.assignee || incoming.assignee || '',
    status: prev?.status || 'held',
    fix: prev?.fix || null,
    tick: prev?.tick || null,
    createdAt: prev?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function json(url, opts) {
  const res = await fetch(url, { cache: 'no-store', ...opts });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || res.statusText || 'Control API failed');
  return body;
}

export async function refreshCases() {
  try {
    const { cases } = await json('/api/control/cases');
    setCache(cases);
  } catch {
    setCache(readLocal());
  }
  emit();
  return cache;
}

export async function upsertCases(rows = []) {
  try {
    const { cases } = await json('/api/control/cases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cases: rows })
    });
    setCache(cases);
  } catch {
    const map = new Map(cache.map(c => [c.id, c]));
    for (const row of rows) {
      if (!row?.id) continue;
      map.set(row.id, mergeLocal(map.get(row.id), row));
    }
    setCache([...map.values()]);
  }
  emit();
  return cache;
}

function actor() {
  const user = getUser();
  return { by: user?.id || '', byName: displayName(user) || 'A desk' };
}

export async function assignCase(id, assignee) {
  const payload = { assignee, ...actor() };
  try {
    const { case: row } = await json(`/api/control/cases/${encodeURIComponent(id)}/assign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setCache(cache.map(c => (c.id === id ? row : c)));
  } catch {
    setCache(cache.map(c => (c.id === id ? { ...c, assignee, updatedAt: new Date().toISOString() } : c)));
  }
  emit();
  return getCase(id);
}

export async function fixCase(id, fields) {
  const payload = { ...fields, ...actor() };
  try {
    const { case: row } = await json(`/api/control/cases/${encodeURIComponent(id)}/fix`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setCache(cache.map(c => (c.id === id ? row : c)));
  } catch {
    const row = {
      ...getCase(id),
      status: 'in_fix',
      fix: { ...fields, ...actor(), at: new Date().toISOString() },
      updatedAt: new Date().toISOString()
    };
    setCache(cache.map(c => (c.id === id ? row : c)));
  }
  emit();
  return getCase(id);
}

export async function tickCase(id, { status = 'approved', note = '' } = {}) {
  const payload = { status, note, ...actor() };
  try {
    const { case: row } = await json(`/api/control/cases/${encodeURIComponent(id)}/tick`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setCache(cache.map(c => (c.id === id ? row : c)));
  } catch {
    const approved = status === 'approved';
    const row = {
      ...getCase(id),
      status: approved ? 'ready' : 'held',
      tick: { status: approved ? 'approved' : 'returned', note, ...actor(), at: new Date().toISOString() },
      updatedAt: new Date().toISOString()
    };
    setCache(cache.map(c => (c.id === id ? row : c)));
  }
  emit();
  return getCase(id);
}

export function gateCounts(cases = cache) {
  const open = cases.filter(isOpenCase);
  return GATES.map(([name, detail]) => {
    const held = open.filter(c => (c.failedGates || []).includes(name)).length;
    const checked = cases.filter(c => (c.failedGates || []).includes(name)).length;
    return { name, detail, held, checked };
  });
}

export function casesFromWork(quarantine = []) {
  return quarantine.map(q => ({
    id: q.id,
    title: q.title,
    kpi: (q.path && q.path[0]) || '',
    period: q.title,
    source: q.source || '',
    pulledValue: '',
    unit: '',
    failedGates: [mapGate(q.gate)],
    reason: q.detail,
    owner: q.owner,
    path: q.path || null,
    go: q.go || 'alerts'
  }));
}
