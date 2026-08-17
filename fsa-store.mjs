/**
 * Financial-statement ledger. Filings stay off the certified Pulse.
 * Uploaded bytes are kept beside the ledger so a steward can re-open the source.
 */
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assess, buildSampleIfrsPdf, extractBuffer, extractSample } from './fsa-extract.mjs';

const FILE = fileURLToPath(new URL('./data/fsa-ledger.json', import.meta.url));
const UP = fileURLToPath(new URL('./data/fsa-uploads/', import.meta.url));

const empty = () => ({ filings: [], updatedAt: null });

async function load() {
  try {
    const raw = JSON.parse(await readFile(FILE, 'utf8'));
    if (!raw || !Array.isArray(raw.filings)) return empty();
    return raw;
  } catch {
    return empty();
  }
}

async function save(doc) {
  await mkdir(dirname(FILE), { recursive: true });
  const next = { filings: doc.filings || [], updatedAt: new Date().toISOString() };
  await writeFile(FILE, JSON.stringify(next, null, 2));
  return next;
}

function publicFiling(row) {
  if (!row) return null;
  const { _stored, _displayBuffer, ...rest } = row;
  return {
    ...rest,
    hasFile: Boolean(_stored) || (row.synthetic && row.id === 'fsa-horizon-fy2025')
  };
}

async function persistBytes(id, buffer, name, mime) {
  await mkdir(UP, { recursive: true });
  const stored = `${id}${extFor(name, mime)}`;
  await writeFile(join(UP, stored), buffer);
  return stored;
}

export async function listFilings() {
  const doc = await load();
  if (!doc.filings.length) {
    const sample = await extractSample();
    sample._stored = await persistBytes(sample.id, buildSampleIfrsPdf(), sample.file?.name, 'application/pdf');
    doc.filings = [sample];
    await save(doc);
  }
  return doc.filings.map(publicFiling);
}

export async function getFiling(id) {
  const doc = await load();
  return publicFiling(doc.filings.find(f => f.id === id) || null);
}

export async function addUpload({ name, mime, buffer, companions = [] }) {
  if (!buffer?.length) throw new Error('Empty file');
  const extra = (companions || []).reduce((n, c) => n + (c.buffer?.length || 0), 0);
  if (buffer.length + extra > 32_000_000) throw new Error('File is larger than 32 MB');
  const filing = await extractBuffer(buffer, { name, mime, companions });
  const storedBuf = filing._displayBuffer || buffer;
  const storedName = filing.file?.name || name;
  const storedMime = filing.file?.mime || mime;
  delete filing._displayBuffer;
  filing._stored = await persistBytes(filing.id, storedBuf, storedName, storedMime);
  const queued = Array.isArray(filing._queue) ? filing._queue : [];
  delete filing._queue;
  const extras = [];
  for (const sib of queued) {
    const sibBuf = sib._displayBuffer || sib.file?._raw;
    delete sib._displayBuffer;
    const raw = sibBuf || null;
    if (raw?.length) sib._stored = await persistBytes(sib.id, raw, sib.file?.name || 'filing', sib.file?.mime || 'application/octet-stream');
    extras.push(sib);
  }
  const doc = await load();
  doc.filings = [filing, ...extras, ...doc.filings.filter(f => f.id !== filing.id && !extras.some(s => s.id === f.id))];
  await save(doc);
  return publicFiling(filing);
}

export async function addSample() {
  const filing = await extractSample();
  filing._stored = await persistBytes(filing.id, buildSampleIfrsPdf(), filing.file?.name, 'application/pdf');
  const doc = await load();
  doc.filings = [filing, ...doc.filings.filter(f => f.id !== filing.id)];
  await save(doc);
  return publicFiling(filing);
}

export async function getFilingFile(id) {
  const doc = await load();
  const row = doc.filings.find(f => f.id === id);
  if (!row) return null;
  const mime = row.file?.mime || 'application/pdf';
  const name = row.file?.name || 'statement.pdf';
  if (row._stored) {
    try {
      const buffer = await readFile(join(UP, row._stored));
      return { buffer, mime, name };
    } catch {
      /* fall through to generated sample */
    }
  }
  if (row.synthetic && row.id === 'fsa-horizon-fy2025') {
    return { buffer: buildSampleIfrsPdf(), mime: 'application/pdf', name: name.endsWith('.pdf') ? name : 'Horizon-KSA-FY2025-IFRS.pdf' };
  }
  return null;
}

const REASONS = new Set(['mapping', 'ocr', 'restatement', 'other']);

function parseAmt(raw, fallback, { allowEmpty = false } = {}) {
  if (raw === undefined) return fallback;
  if (raw === '' || raw === null) {
    if (allowEmpty) return null;
    throw new Error('Enter a number');
  }
  const s = String(raw).trim().replace(/,/g, '').replace(/\s/g, '');
  if (!s) {
    if (allowEmpty) return null;
    throw new Error('Enter a number');
  }
  const wrapped = /^\(.*\)$/.test(s);
  const n = Number(wrapped ? s.slice(1, -1) : s);
  if (Number.isNaN(n)) throw new Error('Enter a number');
  return wrapped ? -Math.abs(n) : n;
}

function syncStatementLines(filing) {
  const stmts = filing.statements || {};
  for (const sid of Object.keys(stmts)) {
    if (stmts[sid] && Array.isArray(stmts[sid].lines)) {
      stmts[sid].lines = (filing.lines || []).filter(l => l.statement === sid);
    }
  }
}

export async function correctFilingLine(id, key, body = {}) {
  const doc = await load();
  const filing = doc.filings.find(f => f.id === id);
  if (!filing) return null;
  const ln = (filing.lines || []).find(l => l.key === key);
  if (!ln) throw new Error('Line not found');

  const reason = REASONS.has(body.reason) ? body.reason : '';
  if (!reason) throw new Error('Choose a reason');

  const nextCurrent = parseAmt(body.current, ln.current);
  if (nextCurrent == null || Number.isNaN(Number(nextCurrent))) {
    throw new Error('Enter a current figure');
  }
  const nextPrior = parseAmt(body.prior, ln.prior, { allowEmpty: true });

  if (!ln.extracted) {
    ln.extracted = { current: ln.current, prior: ln.prior ?? null };
  }
  ln.current = nextCurrent;
  ln.prior = nextPrior;
  ln.correction = {
    reason,
    note: String(body.note || '').trim().slice(0, 400),
    at: new Date().toISOString()
  };

  syncStatementLines(filing);

  const pages = [];
  if (filing.extract?.preview) pages.push({ text: filing.extract.preview });
  if (filing.assessment?.completeness?.notes) pages.push({ text: 'Note' });
  filing.assessment = assess(filing.lines, filing.identity || {}, pages, filing.sourceSheets || []);
  const nCorr = (filing.lines || []).filter(l => l.correction).length;
  const sign = (filing.assessment.gates || []).find(g => g.id === 'signoff');
  if (sign) {
    sign.status = 'watch';
    sign.detail = `${nCorr} steward correction${nCorr === 1 ? '' : 's'} on this filing. A person still signs. This does not write the certified Pulse.`;
    sign.detailAr = `${nCorr} تصحيحاً من أمين البيانات على هذه القائمة. الشخص يوقّع. لا يُكتب النبض المعتمد.`;
  }
  filing.assessment.held = (filing.assessment.gates || []).filter(g => g.status !== 'ok').length;
  filing.assessment.status = filing.assessment.held ? 'in_review' : 'assessed';
  if (filing.extract?.usable !== false) filing.status = filing.assessment.status;
  filing.updatedAt = new Date().toISOString();
  await save(doc);
  return publicFiling(filing);
}

export async function removeFiling(id) {
  const doc = await load();
  const row = doc.filings.find(f => f.id === id);
  if (!row) return false;
  if (row.synthetic && row.id === 'fsa-horizon-fy2025') {
    throw new Error('The synthetic sample stays on the desk');
  }
  doc.filings = doc.filings.filter(f => f.id !== id);
  await save(doc);
  if (row._stored) {
    try { await unlink(join(UP, row._stored)); } catch { /* already gone */ }
  }
  return true;
}

function extFor(name, mime) {
  const fromName = String(name || '').match(/\.[a-z0-9]+$/i)?.[0];
  if (fromName) return fromName.toLowerCase();
  if (String(mime).includes('pdf')) return '.pdf';
  if (String(mime).includes('zip')) return '.zip';
  if (String(mime).includes('sheet') || String(mime).includes('excel')) return '.xlsx';
  if (String(mime).startsWith('image/')) return '.png';
  return '.bin';
}
