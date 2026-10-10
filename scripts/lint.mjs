// Lint leve sem dependências: verifica sintaxe de todos os .js/.mjs e problemas comuns.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dirs = ['src', 'scripts', 'tests'];
const files = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (['.js', '.mjs'].includes(extname(p))) files.push(p); } };
dirs.forEach((d) => walk(join(root, d)));

let problems = 0;
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { problems++; console.error(`Sintaxe: ${f}\n${e.stderr}`); continue; }
  const src = readFileSync(f, 'utf8');
  if (f.includes(`${join('src', 'assets')}`)) {
    if (/\b(localStorage|sessionStorage|eval\(|document\.write\()/.test(src)) { problems++; console.error(`Uso não permitido em ${f}`); }
    if (/\bfetch\(|XMLHttpRequest|sendBeacon/.test(src)) { problems++; console.error(`Requisição de rede inesperada em ${f} (as ferramentas devem rodar localmente)`); }
    if (/console\.log/.test(src)) { problems++; console.error(`console.log esquecido em ${f}`); }
  }
}
console.log(`Lint: ${files.length} arquivos verificados, ${problems} problema(s).`);
process.exit(problems ? 1 : 0);
