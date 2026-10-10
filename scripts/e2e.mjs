// Sobe o servidor local e roda os testes de navegador (Python/Playwright). Uso: npm run test:e2e
import { spawn, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.E2E_PORT || '4179';
const server = spawn(process.execPath, ['scripts/serve.mjs', port], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1200));
let code = 0;
for (const f of ['tests/e2e/e2e.py', 'tests/e2e/audit.py']) {
  const r = spawnSync('python3', [f, `http://localhost:${port}`], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) code = 1;
}
server.kill();
process.exit(code);
