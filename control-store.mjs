/**
 * Shared KPI control ledger. One JSON file. Pulse headlines are never written here.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('./data/control-ledger.json', import.meta.url));

const empty = () => ({ cases: [], updatedAt: null });

async function load() {
  try {
    const raw = JSON.parse(await readFile(FILE, 'utf8'));
    if (!raw || !Array.isArray(raw.cases)) return empty();
    return raw;
  } catch {
    return empty();
  }
}

async function save(doc) {
  await mkdir(dirname(FILE), { recursive: true });
  const next = { cases: doc.cases, updatedAt: new Date().toISOString() };
  await writeFile(FILE, JSON.stringify(next, null, 2));
  return next;
}

export async function listCases() {
  return (await load()).cases;
}

function nowIso() {
  return new Date().toISOString();
}

function mergeCase(prev, incoming) {
  const base = {
    id: incoming.id,
    title: incoming.title || prev?.title || incoming.id,
    kpi: incoming.kpi || prev?.kpi || '',
    period: incoming.period || prev?.period || '',
    source: incoming.source || prev?.source || '',
    pulledValue: incoming.pulledValue ?? prev?.pulledValue ?? '',
    unit: incoming.unit || prev?.unit || '',
    pulseValue: incoming.pulseValue ?? prev?.pulseValue ?? '',
    pulseUnit: incoming.pulseUnit || prev?.pulseUnit || 'SAR bn',
    failedGates: (incoming.failedGates && incoming.failedGates.length)
      ? incoming.failedGates
      : (prev?.failedGates || []),
    reason: incoming.reason || prev?.reason || '',
    owner: incoming.owner || prev?.owner || '',
    path: incoming.path || prev?.path || null,
    go: incoming.go || prev?.go || 'intake',
    assignee: prev?.assignee || incoming.assignee || '',
    status: prev?.status || 'held',
    fix: prev?.fix || null,
    tick: prev?.tick || null,
    createdAt: prev?.createdAt || nowIso(),
    updatedAt: nowIso()
  };
  if (prev?.status === 'ready') {
    return { ...base, status: 'ready', assignee: prev.assignee, fix: prev.fix, tick: prev.tick };
  }
  return base;
}

export async function upsertCases(incoming = []) {
  const doc = await load();
  const map = new Map(doc.cases.map(c => [c.id, c]));
  for (const row of incoming) {
    if (!row?.id) continue;
    map.set(row.id, mergeCase(map.get(row.id), row));
  }
  const next = await save({ cases: [...map.values()] });
  return next.cases;
}

export async function getCase(id) {
  return (await listCases()).find(c => c.id === id) || null;
}

export async function assignCase(id, { assignee = '', by = '' } = {}) {
  const doc = await load();
  const cases = doc.cases.map(c => {
    if (c.id !== id) return c;
    return { ...c, assignee: String(assignee || ''), updatedAt: nowIso(), updatedBy: by };
  });
  if (!cases.some(c => c.id === id)) return null;
  await save({ cases });
  return cases.find(c => c.id === id);
}

export async function fixCase(id, { note = '', mapping = '', evidence = '', proposed = '', by = '', byName = '' } = {}) {
  const doc = await load();
  let found = null;
  const cases = doc.cases.map(c => {
    if (c.id !== id) return c;
    found = {
      ...c,
      status: 'in_fix',
      fix: {
        note: String(note || '').trim(),
        mapping: String(mapping || '').trim(),
        evidence: String(evidence || '').trim(),
        proposed: String(proposed || '').trim(),
        by,
        byName,
        at: nowIso()
      },
      updatedAt: nowIso()
    };
    return found;
  });
  if (!found) return null;
  await save({ cases });
  return found;
}

export async function tickCase(id, { status = 'approved', note = '', by = '', byName = '' } = {}) {
  const approved = status === 'approved';
  const doc = await load();
  let found = null;
  const cases = doc.cases.map(c => {
    if (c.id !== id) return c;
    found = {
      ...c,
      status: approved ? 'ready' : 'held',
      tick: {
        status: approved ? 'approved' : 'returned',
        note: String(note || '').trim(),
        by,
        byName,
        at: nowIso()
      },
      updatedAt: nowIso()
    };
    return found;
  });
  if (!found) return null;
  await save({ cases });
  return found;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}'));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function send(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

export async function handleControlApi(req, res) {
  const path = new URL(req.url, 'http://x').pathname.replace(/\/$/, '');
  try {
    if (req.method === 'GET' && path === '/api/control/cases') {
      send(res, 200, { cases: await listCases() });
      return true;
    }
    if (req.method === 'POST' && path === '/api/control/cases') {
      const body = await readBody(req);
      send(res, 200, { cases: await upsertCases(body.cases || []) });
      return true;
    }
    const assign = path.match(/^\/api\/control\/cases\/([^/]+)\/assign$/);
    if (req.method === 'POST' && assign) {
      const body = await readBody(req);
      const row = await assignCase(decodeURIComponent(assign[1]), body);
      if (!row) { send(res, 404, { error: 'Case not found' }); return true; }
      send(res, 200, { case: row });
      return true;
    }
    const fix = path.match(/^\/api\/control\/cases\/([^/]+)\/fix$/);
    if (req.method === 'POST' && fix) {
      const body = await readBody(req);
      const row = await fixCase(decodeURIComponent(fix[1]), body);
      if (!row) { send(res, 404, { error: 'Case not found' }); return true; }
      send(res, 200, { case: row });
      return true;
    }
    const tick = path.match(/^\/api\/control\/cases\/([^/]+)\/tick$/);
    if (req.method === 'POST' && tick) {
      const body = await readBody(req);
      const row = await tickCase(decodeURIComponent(tick[1]), body);
      if (!row) { send(res, 404, { error: 'Case not found' }); return true; }
      send(res, 200, { case: row });
      return true;
    }
    send(res, 404, { error: 'Unknown control route' });
    return true;
  } catch (err) {
    send(res, 500, { error: String(err.message || err) });
    return true;
  }
}
