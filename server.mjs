// Dependency-free static server. `npm start` then open http://localhost:5173
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { handleIntakeApi } from './intake-api.mjs';
import { handleControlApi } from './control-store.mjs';

const ROOT = new URL('./public/', import.meta.url).pathname;
const PORT = process.env.PORT || 5173;
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2' };

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.startsWith('/api/intake')) {
      await handleIntakeApi(p.replace(/\/$/, ''), res);
      return;
    }
    if (p.startsWith('/api/control')) {
      await handleControlApi(req, res);
      return;
    }
    if (p.endsWith('/')) p += 'index.html';
    const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    await stat(file);
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`Investment Pulse Operating System → http://localhost:${PORT}`));
