/**
 * Financial-statement ledger. Filings stay off the certified Pulse.
 * Uploaded bytes are kept beside the ledger so a steward can re-open the source.
 */
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSampleIfrsPdf, extractBuffer, extractSample } from './fsa-extract.mjs';

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
