// Configuração central do site. Edite aqui nomes, descrições e links.
// URL pública de produção. Pode ser sobrescrita pela variável SITE_URL no build
// (ex.: para um preview). SITE_URL="" desliga canonical/og:url/sitemap.
// SITE_URL é pública por natureza: não coloque segredos em variáveis do build.
export const PRODUCTION_URL = 'https://tools.igorcabral.dev.br';

export const site = {
  name: 'Caply Tools',
  locale: 'pt_BR',
  lang: 'pt-BR',
  siteUrl: (process.env.SITE_URL ?? PRODUCTION_URL).trim().replace(/\/+$/, ''),
  author: 'Igor Cabral',
  // Domínio profissional informado. Apenas a raiz é usada: páginas específicas
  // (portfólio, serviços, contato) só devem ser linkadas depois de verificadas.
  authorUrl: 'https://igorcabral.dev.br',
};

const ic = (paths) => `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

export const tools = [
  {
    slug: 'qr-code',
    tags: ['Link', 'Texto', 'Wi-Fi', 'PNG e SVG'],
    name: 'Gerador de QR Code',
    short: 'QR Code',
    summary: 'Crie QR Codes de links, textos e redes Wi-Fi e baixe em PNG.',
    metaTitle: 'Gerador de QR Code grátis: link, texto e Wi-Fi | Caply Tools',
    metaDescription: 'Crie QR Codes de links, textos e redes Wi-Fi e baixe em PNG. Grátis, sem cadastro, e o conteúdo nunca sai do seu navegador.',
    icon: ic('<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4h-1"/>'),
  },
  {
    slug: 'whatslink',
    tags: ['wa.me', 'Mensagem pronta', 'QR do link'],
    name: 'WhatsLink',
    short: 'WhatsLink',
    summary: 'Gere um link wa.me para abrir uma conversa no WhatsApp com mensagem pronta.',
    metaTitle: 'WhatsLink: gerador de link para WhatsApp (wa.me) | Caply Tools',
    metaDescription: 'Gere um link wa.me para abrir conversas no WhatsApp com mensagem inicial opcional. Grátis, sem cadastro e sem enviar seu número a servidores.',
    icon: ic('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>'),
  },
  {
    slug: 'sorteador',
    tags: ['Sem repetição', 'Copiar resultado'],
    name: 'Sorteador',
    short: 'Sorteador',
    summary: 'Sorteie um ou vários vencedores a partir de uma lista de nomes, sem repetição.',
    metaTitle: 'Sorteador de nomes online grátis | Caply Tools',
    metaDescription: 'Cole uma lista de nomes e sorteie um ou mais vencedores sem repetição. Aleatoriedade do navegador, grátis e sem cadastro.',
    icon: ic('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.1" fill="currentColor"/><circle cx="9" cy="15" r="1.1" fill="currentColor"/>'),
  },
  {
    slug: 'conversor-de-imagens',
    tags: ['PNG', 'JPEG', 'WebP'],
    name: 'Conversor de imagens',
    short: 'Conversor de imagens',
    summary: 'Converta imagens entre PNG, JPEG e WebP direto no navegador.',
    metaTitle: 'Conversor de imagens: PNG, JPEG e WebP online | Caply Tools',
    metaDescription: 'Converta imagens entre PNG, JPEG e WebP no próprio navegador. Suas fotos não são enviadas a nenhum servidor. Grátis e sem cadastro.',
    icon: ic('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 3 3 3-4 5 6"/>'),
  },
  {
    slug: 'conversor-de-audio',
    tags: ['WAV', 'Prévia', 'Fila'],
    name: 'Conversor de áudio',
    short: 'Conversor de áudio',
    summary: 'Converta arquivos de áudio para WAV no navegador, com prévia e download.',
    metaTitle: 'Conversor de áudio para WAV online grátis | Caply Tools',
    metaDescription: 'Converta arquivos de áudio para WAV no navegador, com prévia e download. Sem enviar arquivos a servidores. Os formatos aceitos dependem do seu navegador.',
    icon: ic('<path d="M4 10v4M8 6v12M12 3v18M16 8v8M20 11v2"/>'),
  },
];

export const toolBySlug = Object.fromEntries(tools.map((t) => [t.slug, t]));
