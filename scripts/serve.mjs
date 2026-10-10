// Servidor estático local para dist/ (URLs limpas e 404.html). Uso: node scripts/serve.mjs [porta]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.argv[2] || process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.png': 'image/png' };

// Reaproveita os cabeçalhos de segurança de dist/_headers (CSP etc.) para testar como em produção.
const extra = {};
const hp = join(root, '_headers');
if (existsSync(hp)) for (const l of readFileSync(hp, 'utf8').split('\n')) { const m = l.match(/^\s+([\w-]+):\s*(.+)$/); if (m) extra[m[1]] = m[2]; }

async function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  let file = resolve(root, clean);
  if (file !== root && !file.startsWith(root + sep)) return null;
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
    await stat(file);
    return file;
  } catch { return null; }
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = await resolveFile(url.pathname);
  let status = 200;
  if (!file) { file = join(root, '404.html'); status = 404; }
  try {
    const data = await readFile(file);
    res.writeHead(status, { ...extra, 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(500); res.end('Erro. Rode "npm run build" antes.');
  }
}).listen(port, () => console.log(`Caply Tools em http://localhost:${port}`));
