import { site, tools } from './config.mjs';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const brandMark = `<svg class="brand-mark" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="9" fill="currentColor"/><path d="M8 8h7v7H8zM17 17h7v7h-7z" fill="none" stroke="var(--on-brand)" stroke-width="2.4" stroke-linejoin="round"/><rect x="19.5" y="9.5" width="3.5" height="3.5" rx="1" fill="var(--accent)"/><rect x="9" y="19" width="3.5" height="3.5" rx="1" fill="var(--on-brand)"/></svg>`;

function header(currentPath) {
  const links = tools
    .map((t) => `<li><a href="/${t.slug}/"${currentPath === `/${t.slug}/` ? ' aria-current="page"' : ''}>${esc(t.short)}</a></li>`)
    .join('');
  return `<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/" aria-label="Caply Tools, página inicial">${brandMark}<span class="brand-word">caply<span class="brand-sub">tools</span></span></a>
    <nav aria-label="Principal"><ul class="nav">${links}<li><a class="nav-cta" href="/#servicos">Serviços</a></li></ul></nav>
  </div>
</header>`;
}

function footer() {
  const links = tools.map((t) => `<li><a href="/${t.slug}/">${esc(t.name)}</a></li>`).join('');
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <p class="footer-brand">Caply Tools</p>
      <p class="muted">Ferramentas gratuitas, sem cadastro, feitas por ${esc(site.author)}.</p>
    </div>
    <nav aria-label="Ferramentas"><p class="footer-h">Ferramentas</p><ul>${links}</ul></nav>
    <nav aria-label="Institucional"><p class="footer-h">Institucional</p><ul>
      <li><a href="/privacidade/">Privacidade</a></li>
      <li><a href="/#servicos">Serviços de desenvolvimento web</a></li>
      <li><a href="${site.authorUrl}" rel="noopener">igorcabral.dev.br</a></li>
    </ul></nav>
  </div>
  <div class="wrap footer-base"><p class="muted">© ${new Date().getFullYear()} ${esc(site.author)}. Todos os direitos reservados.</p></div>
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
    `<meta name="theme-color" content="#1e40af">`,
    `<meta name="color-scheme" content="light dark">`,
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
  const items = tools.filter((t) => t.slug !== currentSlug).map((t) => `<li><a href="/${t.slug}/"><strong>${esc(t.name)}</strong><span class="muted"> ${esc(t.summary)}</span></a></li>`).join('');
  return `<section class="prose-block" aria-labelledby="outras"><h2 id="outras">Outras ferramentas</h2><ul class="plain-list">${items}</ul></section>`;
}

export function servicesNote() {
  return `<aside class="svc-note" aria-label="Sobre o autor">
  <p>O Caply Tools é mantido por <strong>${esc(site.author)}</strong>, que cria sites e sistemas web sob medida. Se precisar de ajuda para colocar seu negócio na internet, <a href="/#servicos">saiba mais</a>.</p>
</aside>`;
}

export function toolHero(tool, lead) {
  return `<div class="page-head"><div class="wrap">
  <p class="crumbs"><a href="/">Início</a> / ${esc(tool.short)}</p>
  <h1>${esc(tool.name)}</h1>
  <p class="lead">${lead}</p>
</div></div>`;
}
