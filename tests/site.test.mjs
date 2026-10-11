import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = mkdtempSync(join(tmpdir(), 'caply-'));
let pages;

before(async () => {
  const { build } = await import('../scripts/build.mjs');
  ({ pages } = build({ outDir: out, log: false }));
});

const htmlOf = (p) => readFileSync(join(out, p.path === '/' ? 'index.html' : (p.file || `${p.path.slice(1)}index.html`)), 'utf8');

test('todas as páginas existem e têm estrutura semântica básica', () => {
  assert.equal(pages.length, 11);
  for (const p of pages) {
    const html = htmlOf(p);
    assert.match(html, /<html lang="pt-BR">/);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${p.path}: um único h1`);
    assert.equal((html.match(/<main /g) || []).length, 1, `${p.path}: um main`);
    assert.equal((html.match(/<title>/g) || []).length, 1);
    assert.match(html, /<meta name="description" content="[^"]{50,170}">/, `${p.path}: meta description`);
    assert.match(html, /property="og:title"/);
    assert.doesNotMatch(html, /\sstyle="/, `${p.path}: sem estilos inline (CSP)`);
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/, `${p.path}: sem scripts inline (CSP)`);
  }
});

test('títulos ≤ 65 caracteres e descrições entre 70 e 160 (SEO)', () => {
  for (const p of pages) {
    assert.ok(p.title.length <= 65, `${p.path}: título com ${p.title.length}`);
    assert.ok(p.description.length >= 70 && p.description.length <= 160, `${p.path}: descrição com ${p.description.length}`);
  }
});

test('acessibilidade estrutural: main focável para o link de pulo e formulários nomeados', () => {
  for (const p of pages) {
    const html = htmlOf(p);
    assert.match(html, /<main id="conteudo" tabindex="-1">/, p.path);
    assert.match(html, /href="#conteudo"/);
    for (const m of html.matchAll(/<form\b[^>]*>/g)) assert.match(m[0], /aria-label="[^"]+"/, `${p.path}: form sem nome`);
  }
});

test('títulos e descrições são únicos', () => {
  const titles = pages.map((p) => p.title); const descs = pages.map((p) => p.description);
  assert.equal(new Set(titles).size, titles.length);
  assert.equal(new Set(descs).size, descs.length);
});

test('links internos e scripts apontam para arquivos reais', () => {
  for (const p of pages) {
    const html = htmlOf(p);
    for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
      const path = m[1];
      const file = path.endsWith('/') ? join(out, path, 'index.html') : join(out, path);
      assert.ok(existsSync(file), `${p.path}: ${path} não existe`);
    }
  }
});

test('ids usados pelo JavaScript de cada ferramenta existem no HTML', () => {
  const map = { 'home.js': '/', 'qr-tool.js': '/qr-code/', 'whatslink-tool.js': '/whatslink/', 'raffle-tool.js': '/sorteador/', 'image-tool.js': '/conversor-de-imagens/' };
  for (const [js, path] of Object.entries(map)) {
    const src = readFileSync(join(root, 'src/assets/js', js), 'utf8');
    const html = htmlOf(pages.find((p) => p.path === path));
    const ids = new Set([...src.matchAll(/\$\('([\w-]+)'\)/g)].map((m) => m[1]));
    assert.ok(ids.size >= 3, `${js}: ids encontrados`);
    for (const id of ids) assert.ok(html.includes(`id="${id}"`), `${js}: #${id} ausente em ${path}`);
    assert.ok(html.includes(`/assets/js/${js}`), `${path} carrega ${js}`);
  }
});

test('ids são únicos dentro de cada página', () => {
  for (const p of pages) {
    const ids = [...htmlOf(p).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, `${p.path}: ids duplicados`);
  }
});

test('campos de formulário têm rótulo associado', () => {
  for (const p of pages) {
    const html = htmlOf(p);
    for (const m of html.matchAll(/<(?:input|select|textarea)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
      const tag = m[0];
      if (/type="(radio|checkbox|file|hidden)"/.test(tag) && !/type="file"/.test(tag)) continue;
      assert.ok(html.includes(`for="${m[1]}"`), `${p.path}: #${m[1]} sem label`);
    }
  }
});

const buildWithEnv = (env) => {
  const dir = mkdtempSync(join(tmpdir(), 'caply-env-'));
  execFileSync(process.execPath, ['-e', `import('${join(root, 'scripts/build.mjs')}').then(m=>m.build({outDir:${JSON.stringify(dir)},log:false}))`], { env: { ...process.env, ...env }, stdio: 'pipe' });
  return dir;
};
const PROD = 'https://tools.igorcabral.dev.br';

test('padrão de produção: canonical, og:url, sitemap e robots usam tools.igorcabral.dev.br', () => {
  const dir2 = mkdtempSync(join(tmpdir(), 'caply-def-'));
  execFileSync(process.execPath, ['-e', `import('${join(root, 'scripts/build.mjs')}').then(m=>m.build({outDir:${JSON.stringify(dir2)},log:false}))`], { env: Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'SITE_URL')), stdio: 'pipe' });
  for (const [path, file] of [['/', 'index.html'], ['/qr-code/', 'qr-code/index.html'], ['/whatslink/', 'whatslink/index.html'], ['/sorteador/', 'sorteador/index.html'], ['/conversor-de-imagens/', 'conversor-de-imagens/index.html'], ['/privacidade/', 'privacidade/index.html']]) {
    const html = readFileSync(join(dir2, file), 'utf8');
    assert.ok(html.includes(`<link rel="canonical" href="${PROD}${path}">`), `canonical ${path}`);
    assert.ok(html.includes(`<meta property="og:url" content="${PROD}${path}">`), `og:url ${path}`);
  }
  const sm = readFileSync(join(dir2, 'sitemap.xml'), 'utf8');
  assert.equal((sm.match(/<loc>/g) || []).length, 10);
  assert.ok(sm.includes(`<loc>${PROD}/</loc>`) && !sm.includes('404') && !sm.includes('localhost'));
  assert.match(readFileSync(join(dir2, 'robots.txt'), 'utf8'), new RegExp(`Sitemap: ${PROD}/sitemap\\.xml`));
  const home = readFileSync(join(dir2, 'index.html'), 'utf8');
  assert.ok(home.includes(`<meta property="og:image" content="${PROD}/assets/og-image.png">`));
  assert.match(home, /twitter:card" content="summary_large_image"/);
  assert.ok(existsSync(join(dir2, 'assets/og-image.png')), 'imagem OG existe no build');
  assert.ok(!readFileSync(join(dir2, '404.html'), 'utf8').includes('canonical'));
  assert.match(readFileSync(join(dir2, '404.html'), 'utf8'), /noindex/);
});

test('SITE_URL vazia desliga canonical e sitemap', () => {
  const dir = buildWithEnv({ SITE_URL: '' });
  assert.ok(!existsSync(join(dir, 'sitemap.xml')));
  assert.ok(!readFileSync(join(dir, 'index.html'), 'utf8').includes('rel="canonical"'));
  assert.ok(!readFileSync(join(dir, 'index.html'), 'utf8').includes('og:image'), 'sem URL absoluta não há og:image');
  assert.match(readFileSync(join(dir, 'robots.txt'), 'utf8'), /Allow: \//);
});

test('SITE_URL inválida derruba o build', () => {
  assert.throws(() => buildWithEnv({ SITE_URL: 'http://inseguro.test/caminho' }));
  assert.throws(() => buildWithEnv({ SITE_URL: 'tools.igorcabral.dev.br' }));
});

test('nenhum segredo, .env ou process.env vai para o bundle público', () => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  const files = walk(out);
  assert.ok(!files.some((f) => /(^|\/)\.env/.test(f)), 'sem arquivos .env');
  const patterns = [/process\.env/, /sk-[A-Za-z0-9_-]{20,}/, /AKIA[0-9A-Z]{16}/, /gh[pousr]_[A-Za-z0-9]{30,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /xox[baprs]-[A-Za-z0-9-]{10,}/, /(api[_-]?key|secret|bearer)\s*[:=]\s*["'][^"']{8,}/i];
  for (const f of files) {
    const txt = readFileSync(f, 'utf8');
    for (const re of patterns) assert.doesNotMatch(txt, re, `${f} casa ${re}`);
  }
});

test('cada página tem seu próprio index.html (recarregar não gera 404)', () => {
  for (const p of pages.filter((x) => !x.file)) {
    const f = p.path === '/' ? 'index.html' : `${p.path.slice(1)}index.html`;
    assert.ok(existsSync(join(out, f)), `${p.path} -> ${f}`);
  }
  assert.ok(existsSync(join(out, '404.html')));
  assert.ok(!existsSync(join(out, '_redirects')), 'sem regra catch-all que mascararia 404s');
});

test('com SITE_URL: canonical, og:url e sitemap sem a página 404', () => {
  const dir = mkdtempSync(join(tmpdir(), 'caply-url-'));
  execFileSync(process.execPath, ['-e', `import('${join(root, 'scripts/build.mjs')}').then(m=>m.build({outDir:${JSON.stringify(dir)},log:false}))`], { env: { ...process.env, SITE_URL: 'https://exemplo.test/' } });
  const sm = readFileSync(join(dir, 'sitemap.xml'), 'utf8');
  assert.match(sm, /<loc>https:\/\/exemplo\.test\/qr-code\/<\/loc>/);
  assert.ok(!sm.includes('404'));
  assert.equal((sm.match(/<loc>/g) || []).length, 10);
  assert.match(readFileSync(join(dir, 'qr-code/index.html'), 'utf8'), /rel="canonical" href="https:\/\/exemplo\.test\/qr-code\/"/);
  assert.match(readFileSync(join(dir, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/exemplo\.test\/sitemap\.xml/);
});

test('JS das ferramentas não faz requisições de rede', () => {
  const dir = join(root, 'src/assets/js');
  for (const f of readdirSync(dir)) {
    assert.doesNotMatch(readFileSync(join(dir, f), 'utf8'), /\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket/, f);
  }
});

test('tipografia auto-hospedada: fonte e licença existem, o CSS as usa e não importa nada externo', () => {
  assert.ok(existsSync(join(out, 'assets/fonts/archivo-latin-wght.woff2')), 'woff2 no build');
  assert.ok(existsSync(join(out, 'assets/fonts/OFL-Archivo.txt')), 'licença OFL junto da fonte');
  const css = readFileSync(join(out, 'assets/css/site.css'), 'utf8');
  assert.match(css, /url\(\/assets\/fonts\/archivo-latin-wght\.woff2\)/);
  assert.doesNotMatch(css, /@import|https?:\/\//, 'CSS sem recursos externos (CSP e privacidade)');
  for (const p of pages) assert.match(htmlOf(p), /rel="preload" href="\/assets\/fonts\/archivo-latin-wght\.woff2" as="font" type="font\/woff2" crossorigin/, p.path);
});

test('home: quatro ferramentas no índice, atalho de QR com download e seção do criador', () => {
  const html = htmlOf(pages.find((p) => p.path === '/'));
  assert.equal((html.match(/class="tool-row"/g) || []).length, 4);
  assert.match(html, /id="demo-download"/);
  assert.match(html, /id="criador"/);
  assert.match(html, /assets\/img\/igor-cabral-icon\.png/);
});

test('todas as páginas levam ao site profissional e exibem a assinatura do autor no rodapé', () => {
  for (const p of pages) {
    const html = htmlOf(p);
    assert.ok(html.includes('href="https://igorcabral.dev.br" rel="noopener"'), `${p.path}: link para o site profissional`);
    assert.match(html, /<img src="\/assets\/img\/igor-cabral-white\.png"[^>]*alt="igor cabral\. design &amp; web"/, `${p.path}: logo do autor no rodapé`);
    assert.doesNotMatch(html, /href="\/#servicos"/, `${p.path}: âncora antiga removida`);
  }
});

test('o JS das ferramentas não depende de classes visuais removidas', () => {
  const css = readFileSync(join(out, 'assets/css/site.css'), 'utf8');
  for (const cls of ['is-over', 'is-done']) assert.ok(css.includes(`.${cls}`), `.${cls} estilizada`);
  for (const kind of ['ok', 'err', 'warn']) assert.ok(css.includes(`.status.${kind}`), `.status.${kind} estilizado`);
});
