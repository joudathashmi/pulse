/** Client for the financial-statement desk. Never writes brief.headlines. */

async function json(url, opts) {
  const res = await fetch(url, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || res.statusText || 'Request failed');
  return body;
}

function postJsonProgress(url, payload, onUploadPct) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('content-type', 'application/json');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total) onUploadPct?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.upload.onload = () => onUploadPct?.(100);
    xhr.onload = () => {
      let body = {};
      try { body = JSON.parse(xhr.responseText || '{}'); } catch { body = {}; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body.error || xhr.statusText || 'Request failed'));
    };
    xhr.onerror = () => reject(new Error('Could not reach the extractor'));
    xhr.send(JSON.stringify(payload));
  });
}

export async function listFilings() {
  const { filings } = await json('/api/fsa/filings');
  return filings || [];
}

export async function uploadFiling(file, onProgress) {
  const list = (typeof FileList !== 'undefined' && file instanceof FileList)
    ? [...file]
    : Array.isArray(file) ? file : [file];
  const files = list.filter(Boolean);
  if (!files.length) throw new Error('No file');
  const primary = files[0];
  const meta = { name: files.length > 1 ? `${files.length} files` : primary.name, size: files.reduce((n, f) => n + (f.size || 0), 0) };
  onProgress?.({ step: 'read', pct: 6, ...meta });
  const toPart = async (f, start, span) => ({
    name: f.name,
    mime: f.type || guessMime(f.name),
    base64: await fileToBase64(f, (pct) => {
      onProgress?.({ step: 'read', pct: Math.max(6, Math.round(start + (pct / 100) * span)), ...meta });
    })
  });
  const first = await toPart(primary, 4, files.length > 1 ? 12 : 26);
  const companions = [];
  for (let i = 1; i < files.length; i++) {
    companions.push(await toPart(files[i], 18 + i * 5, 5));
  }
  onProgress?.({ step: 'upload', pct: 32, ...meta });
  let pulse = null;
  let extracting = false;
  const tickExtract = () => {
    if (extracting) return;
    extracting = true;
    onProgress?.({ step: 'extract', pct: 72, ...meta });
    let n = 72;
    pulse = setInterval(() => {
      n = Math.min(88, n + 2);
      onProgress?.({ step: 'extract', pct: n, ...meta });
    }, 420);
  };
  try {
    const { filing } = await postJsonProgress('/api/fsa/filings', {
      name: first.name,
      mime: first.mime,
      base64: first.base64,
      companions
    }, (u) => {
      if (u >= 100) tickExtract();
      else onProgress?.({ step: 'upload', pct: 32 + Math.round((u / 100) * 40), ...meta });
    });
    if (pulse) clearInterval(pulse);
    onProgress?.({ step: 'verify', pct: 92, ...meta });
    return filing;
  } catch (err) {
    if (pulse) clearInterval(pulse);
    throw err;
  }
}

export async function loadSample(onProgress) {
  const meta = { name: 'Horizon-KSA-FY2025-IFRS.pdf', size: null };
  onProgress?.({ step: 'upload', pct: 20, ...meta });
  const timer = setTimeout(() => onProgress?.({ step: 'extract', pct: 55, ...meta }), 280);
  try {
    const { filing } = await json('/api/fsa/sample', { method: 'POST' });
    clearTimeout(timer);
    onProgress?.({ step: 'extract', pct: 80, ...meta });
    onProgress?.({ step: 'verify', pct: 92, ...meta });
    return filing;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function removeFiling(id) {
  await json(`/api/fsa/filings/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fileUrl(id, page) {
  const base = `/api/fsa/filings/${encodeURIComponent(id)}/file`;
  return page ? `${base}#page=${page}` : base;
}

export function fileKind(row) {
  const mime = String(row?.file?.mime || '');
  const name = String(row?.file?.name || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/.test(name)) return 'image';
  if (mime.includes('sheet') || mime.includes('excel') || /\.xlsx?$/.test(name)) return 'sheet';
  return 'file';
}

export async function askFiling(id, q, lang) {
  return json(`/api/fsa/filings/${encodeURIComponent(id)}/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q, lang })
  });
}

function guessMime(name) {
  const n = String(name).toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (n.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (n.endsWith('.zip')) return 'application/zip';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function fileToBase64(file, onPct) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onprogress = (e) => {
      if (e.lengthComputable) onPct?.(Math.round((e.loaded / e.total) * 100));
    };
    r.onload = () => {
      onPct?.(100);
      resolve(String(r.result || ''));
    };
    r.onerror = () => reject(new Error('Could not read the file'));
    r.readAsDataURL(file);
  });
}
