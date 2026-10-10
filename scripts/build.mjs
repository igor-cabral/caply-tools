// Gera o site estático em dist/ a partir de src/. Sem dependências externas.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/config.mjs';
import { renderPage } from '../src/layout.mjs';
import home from '../src/pages/home.mjs';
import qr from '../src/pages/qr.mjs';
import whatslink from '../src/pages/whatslink.mjs';
import raffle from '../src/pages/raffle.mjs';
import image from '../src/pages/image.mjs';
import privacy from '../src/pages/privacy.mjs';
import notFound from '../src/pages/notfound.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function build({ outDir = join(root, 'dist'), log = true } = {}) {
  if (site.siteUrl && !/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(site.siteUrl)) {
    throw new Error(`SITE_URL inválida: "${site.siteUrl}". Use somente origem https, sem caminho (ex.: https://tools.igorcabral.dev.br).`);
  }
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  cpSync(join(root, 'src', 'assets'), join(outDir, 'assets'), { recursive: true });

  const pages = [home, qr, whatslink, raffle, image, privacy, notFound].map((fn) => fn());
  for (const p of pages) {
    const file = p.file || `${p.path.replace(/^\/|\/$/g, '')}/index.html`.replace(/^\//, '');
    const target = join(outDir, p.path === '/' ? 'index.html' : file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, renderPage(p));
  }

  const indexable = pages.filter((p) => !p.noindex);

  // robots.txt e sitemap: o sitemap só existe quando SITE_URL está definido.
  let robots = 'User-agent: *\nAllow: /\n';
  if (site.siteUrl) {
    const urls = indexable.map((p) => `  <url><loc>${site.siteUrl}${p.path}</loc></url>`).join('\n');
    writeFileSync(join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
    robots += `\nSitemap: ${site.siteUrl}/sitemap.xml\n`;
  } else if (log) {
    console.warn('Aviso: SITE_URL vazia. Canonical, og:url e sitemap.xml foram omitidos.');
  }
  writeFileSync(join(outDir, 'robots.txt'), robots);

  // Cabeçalhos de segurança (Netlify/Cloudflare Pages). Para outros hosts, replique no servidor.
  const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
  writeFileSync(join(outDir, '_headers'), `/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Cross-Origin-Opener-Policy: same-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n`);

  if (log) console.log(`Build concluído em ${outDir}: ${pages.length} páginas (${indexable.length} indexáveis). URL pública: ${site.siteUrl || '(nenhuma)'}`);
  return { outDir, pages };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build();
  if (!existsSync(join(root, 'dist', 'index.html'))) process.exit(1);
}
