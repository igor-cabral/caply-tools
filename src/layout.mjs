import { site, tools } from './config.mjs';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const dot = '<span class="dot">.</span>';

function header(currentPath) {
  const links = tools
    .map((t) => `<li><a href="/${t.slug}/"${currentPath === `/${t.slug}/` ? ' aria-current="page"' : ''}>${esc(t.short)}</a></li>`)
    .join('');
  return `<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/" aria-label="Caply Tools, página inicial">caply tools${dot}</a>
    <nav aria-label="Principal"><ul class="nav">${links}</ul></nav>
    <a class="header-cta" href="${site.authorUrl}" rel="noopener">Criar meu site</a>
  </div>
</header>`;
}

function footer() {
  const links = tools.map((t) => `<li><a href="/${t.slug}/">${esc(t.name)}</a></li>`).join('');
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <a class="footer-logo" href="${site.authorUrl}" rel="noopener"><img src="/assets/img/igor-cabral-white.png" width="640" height="161" alt="igor cabral. design &amp; web"></a>
      <p>O Caply Tools é um projeto de ${esc(site.author)}: ferramentas gratuitas, sem cadastro, que funcionam no seu navegador.</p>
    </div>
    <nav aria-label="Ferramentas"><p class="footer-h">Ferramentas</p><ul>${links}</ul></nav>
    <nav aria-label="Institucional"><p class="footer-h">Institucional</p><ul>
      <li><a href="/privacidade/">Privacidade</a></li>
      <li><a href="/#criador">Quem faz o Caply Tools</a></li>
      <li><a href="${site.authorUrl}" rel="noopener">igorcabral.dev.br</a></li>
    </ul></nav>
  </div>
  <div class="wrap footer-base"><p>© ${new Date().getFullYear()} ${esc(site.author)}. Todos os direitos reservados.</p><p>Nenhum dado digitado nas ferramentas é enviado a servidores.</p></div>
</footer>`;
}

/** Monta uma página HTML completa. */
export function renderPage({ path, title, description, body, scripts = [], noindex = false }) {
  const canonical = site.siteUrl && !noindex ? `${site.siteUrl}${path}` : '';
  const ogImage = site.siteUrl ? `${site.siteUrl}/assets/og-image.png` : '';
  const tags = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    noindex ? `<meta name="robots" content="noindex">` : '',
    canonical ? `<link rel="canonical" href="${canonical}">` : '',
    `<meta name="theme-color" content="#0a0a0a">`,
    `<meta name="color-scheme" content="light">`,
    `<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${site.name}">`,
    `<meta property="og:locale" content="${site.locale}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    canonical ? `<meta property="og:url" content="${canonical}">` : '',
    ogImage ? `<meta property="og:image" content="${ogImage}">` : '',
    ogImage ? `<meta property="og:image:width" content="1200">` : '',
    ogImage ? `<meta property="og:image:height" content="630">` : '',
    ogImage ? `<meta property="og:image:alt" content="Caply Tools: ferramentas online gratuitas, sem cadastro">` : '',
    `<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">`,
    ogImage ? `<meta name="twitter:image" content="${ogImage}">` : '',
    `<link rel="preload" href="/assets/fonts/archivo-latin-wght.woff2" as="font" type="font/woff2" crossorigin>`,
    `<link rel="stylesheet" href="/assets/css/site.css">`,
  ].filter(Boolean).join('\n  ');
  const scriptTags = scripts.map((s) => `<script type="module" src="/assets/js/${s}"></script>`).join('\n');
  return `<!doctype html>
<html lang="${site.lang}">
<head>
  ${tags}
</head>
<body>
<a class="skip" href="#conteudo">Pular para o conteúdo</a>
${header(path)}
<main id="conteudo" tabindex="-1">
${body}
</main>
${footer()}
${scriptTags}
</body>
</html>
`;
}

/** Blocos reutilizados nas páginas de ferramenta. */
export function relatedTools(currentSlug) {
  const items = tools.filter((t) => t.slug !== currentSlug).map((t) => `<li><a href="/${t.slug}/"><strong>${esc(t.name)}</strong><span>${esc(t.summary)}</span></a></li>`).join('');
  return `<section class="prose-block" aria-labelledby="outras"><h2 id="outras">Outras ferramentas${dot}</h2><ul class="plain-list">${items}</ul></section>`;
}

export function servicesNote() {
  return `<aside class="maker-note dark" aria-label="Sobre o autor">
  <img src="/assets/img/igor-cabral-icon.png" width="288" height="294" alt="">
  <p><strong>${esc(site.author)}</strong> mantém o Caply Tools e cria sites e sistemas web sob medida. Precisa colocar seu negócio na internet?</p>
  <a class="btn" href="${site.authorUrl}" rel="noopener">Conhecer o trabalho</a>
</aside>`;
}

export function toolHero(tool, lead) {
  return `<div class="page-head"><div class="wrap">
  <p class="crumbs"><a href="/">Início</a> / ${esc(tool.short)}</p>
  <p class="chip chip-local">Executado 100% no seu navegador</p>
  <h1>${esc(tool.name)}${dot}</h1>
  <p class="lead">${lead}</p>
</div></div>`;
}
