import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPartsHandler, TEST_KEY } from './favorit.js';

const root = resolve(process.env.BUILD_OUT_DIR || fileURLToPath(new URL('../dist', import.meta.url)));
const handler = createPartsHandler({ key: process.env.FAVORIT_API_KEY?.trim() || TEST_KEY });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/parts') return handler(req, res);
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const path = resolve(root, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
    if (!path.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const content = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(Number(process.env.PORT) || 3000, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${Number(process.env.PORT) || 3000}`);
});
