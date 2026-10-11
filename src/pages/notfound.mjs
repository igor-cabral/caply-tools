import { tools } from '../config.mjs';

export default function notFound() {
  const links = tools.map((t) => `<li><a href="/${t.slug}/">${t.name}</a></li>`).join('');
  const body = `
<div class="page-head"><div class="wrap"><h1>Página não encontrada<span class="dot">.</span></h1><p class="lead">O endereço que você acessou não existe ou foi movido.</p></div></div>
<div class="wrap"><div class="prose"><section class="prose-block"><h2>Ferramentas</h2><ul class="plain-list">${links}</ul><p><a class="btn" href="/">Voltar ao início</a></p></section></div></div>`;
  return { path: '/404.html', file: '404.html', title: 'Página não encontrada | Caply Tools', description: 'A página que você procura não foi encontrada no Caply Tools. Volte ao início e use uma das ferramentas gratuitas.', body, noindex: true };
}
