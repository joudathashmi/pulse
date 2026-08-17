import { addSample, addUpload, getFiling, getFilingFile, listFilings, removeFiling } from './fsa-store.mjs';
import { answerFiling } from './fsa-ask.mjs';

function send(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req, limit = 16_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on('data', (c) => {
      n += c.length;
      if (n > limit) {
        reject(new Error('Upload is larger than 12 MB'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
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

function decodeFile(body) {
  const name = String(body.name || 'statement.pdf');
  const mime = String(body.mime || 'application/pdf');
  const raw = String(body.base64 || '').replace(/^data:[^;]+;base64,/, '');
  if (!raw) throw new Error('No file data');
  const companions = (Array.isArray(body.companions) ? body.companions : []).map(c => {
    const cname = String(c.name || 'file');
    const cmime = String(c.mime || 'application/octet-stream');
    const craw = String(c.base64 || '').replace(/^data:[^;]+;base64,/, '');
    if (!craw) throw new Error('Companion file is empty');
    return { name: cname, mime: cmime, buffer: Buffer.from(craw, 'base64') };
  });
  return { name, mime, buffer: Buffer.from(raw, 'base64'), companions };
}

export async function handleFsaApi(req, res) {
  const path = new URL(req.url, 'http://x').pathname.replace(/\/$/, '');
  try {
    if (req.method === 'GET' && path === '/api/fsa/filings') {
      send(res, 200, { filings: await listFilings() });
      return true;
    }
    if (req.method === 'POST' && path === '/api/fsa/filings') {
      const body = await readBody(req);
      const filing = await addUpload(decodeFile(body));
      send(res, 200, { filing });
      return true;
    }
    if (req.method === 'POST' && path === '/api/fsa/sample') {
      send(res, 200, { filing: await addSample() });
      return true;
    }
    const file = path.match(/^\/api\/fsa\/filings\/([^/]+)\/file$/);
    if (req.method === 'GET' && file) {
      const row = await getFilingFile(decodeURIComponent(file[1]));
      if (!row) { send(res, 404, { error: 'Source file not found' }); return true; }
      const mime = row.mime || 'application/octet-stream';
      const inline = mime.includes('pdf') || mime.startsWith('image/');
      const name = String(row.name || 'filing').replace(/["\r\n]/g, '');
      res.writeHead(200, {
        'content-type': mime,
        'content-disposition': `${inline ? 'inline' : 'attachment'}; filename="${name}"`,
        'cache-control': 'no-store',
        'content-length': row.buffer.length
      });
      res.end(row.buffer);
      return true;
    }
    const one = path.match(/^\/api\/fsa\/filings\/([^/]+)$/);
    if (req.method === 'GET' && one) {
      const filing = await getFiling(decodeURIComponent(one[1]));
      if (!filing) { send(res, 404, { error: 'Filing not found' }); return true; }
      send(res, 200, { filing });
      return true;
    }
    if (req.method === 'DELETE' && one) {
      await removeFiling(decodeURIComponent(one[1]));
      send(res, 200, { ok: true });
      return true;
    }
    const ask = path.match(/^\/api\/fsa\/filings\/([^/]+)\/ask$/);
    if (req.method === 'POST' && ask) {
      const body = await readBody(req, 200_000);
      const filing = await getFiling(decodeURIComponent(ask[1]));
      if (!filing) { send(res, 404, { error: 'Filing not found' }); return true; }
      send(res, 200, answerFiling(filing, body.q, body.lang === 'ar' ? 'ar' : 'en'));
      return true;
    }
    send(res, 404, { error: 'Unknown FSA route' });
    return true;
  } catch (err) {
    send(res, 400, { error: String(err.message || err) });
    return true;
  }
}
