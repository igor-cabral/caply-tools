import { site, tools } from '../config.mjs';
import { esc } from '../layout.mjs';

export default function home() {
  const rows = tools.map((t) => `<li class="tool-row ${t.tint}">
    <span class="tool-icon" aria-hidden="true">${t.icon}</span>
    <div class="tool-text">
      <h3><a class="stretch" href="/${t.slug}/">${esc(t.name)}</a></h3>
      <p>${esc(t.summary)}</p>
    </div>
    <svg class="chev" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6"/></svg>
  </li>`).join('');

  const body = `
<section class="hero" aria-labelledby="titulo">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <h1 id="titulo">Ferramentas gratuitas que funcionam direto no seu navegador.</h1>
      <p class="lead">QR Code, link de WhatsApp, sorteios e conversão de imagens. Sem cadastro, sem instalar nada e sem enviar seus arquivos para um servidor.</p>
      <p class="hero-actions"><a class="btn" href="#ferramentas">Ver ferramentas</a><a class="btn btn-secondary" href="#gratuito">Por que é grátis?</a></p>
    </div>
    <div class="demo" aria-labelledby="demo-t">
      <h2 id="demo-t" class="demo-title">Experimente agora</h2>
      <label for="demo-input">Digite um link ou texto</label>
      <input id="demo-input" type="text" autocomplete="off" spellcheck="false" value="Olá! Este QR Code nasceu no seu navegador.">
      <div class="qr-frame demo-frame"><canvas id="demo-canvas" width="256" height="256" role="img" aria-label="QR Code gerado a partir do texto digitado"></canvas></div>
      <p class="demo-foot"><a id="demo-open" href="/qr-code/">Abrir o gerador completo</a></p>
    </div>
  </div>
</section>

<section id="ferramentas" class="section" aria-labelledby="ferr-t">
  <div class="wrap">
    <h2 id="ferr-t">Ferramentas disponíveis</h2>
    <p class="section-lead">Quatro ferramentas completas e prontas para uso. Escolha uma e comece.</p>
    <ul class="tool-list">${rows}</ul>
  </div>
</section>

<section id="gratuito" class="section section-alt" aria-labelledby="grat-t">
  <div class="wrap"><div class="narrow">
    <h2 id="grat-t">Grátis, sem conta e sem enviar seus dados</h2>
    <p>Todas as ferramentas são abertas ao público. Você não precisa criar conta, informar e-mail ou instalar programas.</p>
    <p>O processamento acontece no seu aparelho: o QR Code é desenhado no navegador, as imagens são convertidas no navegador e a lista do sorteio nunca é transmitida. Por isso o Caply Tools é rápido e funciona bem mesmo com internet lenta depois de carregado.</p>
    <p>Nesta versão não há anúncios, planos pagos nem rastreadores de publicidade. O projeto existe para ser útil e, de forma discreta, apresentar o trabalho de quem o criou. Veja os detalhes na página de <a href="/privacidade/">privacidade</a>.</p>
  </div></div>
</section>

<section id="servicos" class="section" aria-labelledby="serv-t">
  <div class="wrap"><div class="narrow">
    <h2 id="serv-t">Quem faz o Caply Tools</h2>
    <p>Sou ${esc(site.author)}, desenvolvedor web. Além de manter estas ferramentas, trabalho com criação de sites, desenvolvimento web e presença digital para quem quer ser encontrado e bem apresentado na internet.</p>
    <p>Se você tem um negócio ou projeto e precisa de um site, uma loja, uma landing page ou de ajustes em algo que já existe, vale conversar.</p>
    <p><a class="btn btn-secondary" href="${site.authorUrl}" rel="noopener">Conhecer o trabalho em igorcabral.dev.br</a></p>
  </div></div>
</section>`;

  return {
    path: '/',
    title: 'Caply Tools: ferramentas online gratuitas, sem cadastro',
    description: 'QR Code, link de WhatsApp, sorteador e conversor de imagens. Ferramentas gratuitas que rodam no seu navegador, sem cadastro e sem enviar seus arquivos.',
    body,
    scripts: ['home.js'],
  };
}
