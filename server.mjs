import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const target = path.resolve(root, `.${relative}`);
    const publicFile = ['index.html', 'style.css', 'main.js', 'engine.js', 'animation.js', 'viewport.js', 'asset-loader.js', 'music.js', 'theme.js', 'camp.js', 'commander-rigs.js', 'manifest.webmanifest', 'favicon.svg'].includes(path.relative(root, target)) || target.startsWith(path.join(root, 'assets', 'game') + path.sep);
    if (!publicFile || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); return res.end('Not found'); }
    const info = await stat(target), etag = `"${info.size}-${Math.floor(info.mtimeMs)}"`;
    const cacheControl = /-v\d+\.(webp|mp3)$/.test(target) ? 'public, max-age=604800, immutable' : 'no-cache';
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag, 'Cache-Control':cacheControl }); return res.end(); }
    const data = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Content-Length':data.length, 'Cache-Control':cacheControl, ETag: etag });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '0.0.0.0', () => {
  console.log(`主公快跑：http://localhost:${port}`);
  for (const list of Object.values(os.networkInterfaces())) for (const address of list || []) if (address.family === 'IPv4' && !address.internal) console.log(`手机同一 Wi-Fi：http://${address.address}:${port}`);
});
