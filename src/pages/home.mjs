import { site, tools } from '../config.mjs';
import { esc } from '../layout.mjs';

export default function home() {
  const cards = tools.map((t) => `<li class="tool-card">
    <span class="tool-icon" aria-hidden="true">${t.icon}</span>
    <h3><a class="stretch" href="/${t.slug}/">${esc(t.name)}</a></h3>
    <p>${esc(t.summary)}</p>
    <ul class="chips" aria-label="Recursos">${t.tags.map((x) => `<li class="chip">${esc(x)}</li>`).join('')}</ul>
    <span class="tool-open" aria-hidden="true">Abrir ferramenta <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="m9 6 6 6-6 6"/></svg></span>
  </li>`).join('');

  const body = `
<section class="hero" aria-labelledby="titulo">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="chip chip-local">Executado 100% no seu navegador</p>
      <h1 id="titulo">Ferramentas gratuitas que resolvem o básico, sem cadastro.</h1>
      <p class="lead">QR Code, link de WhatsApp, sorteios e conversão de imagens. Tudo roda no seu aparelho: sem instalar nada e sem enviar seus arquivos para um servidor.</p>
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
    <p class="section-lead">Quatro ferramentas completas e prontas para usar. Escolha uma e comece.</p>
    <ul class="tool-grid">${cards}</ul>
  </div>
</section>

<section id="gratuito" class="section section-alt" aria-labelledby="grat-t">
  <div class="wrap">
    <h2 id="grat-t">Grátis, sem conta e sem enviar seus dados</h2>
    <p class="section-lead">O projeto existe para ser útil e, de forma discreta, apresentar o trabalho de quem o criou.</p>
    <ul class="benefits">
      <li class="benefit"><h3>Tudo no seu aparelho</h3><p>O QR Code é desenhado, as imagens são convertidas e o sorteio é feito no navegador. Nada disso é transmitido.</p></li>
      <li class="benefit"><h3>Sem cadastro</h3><p>Não pedimos conta, e-mail nem instalação. Abra a ferramenta e use.</p></li>
      <li class="benefit"><h3>Sem anúncios ou rastreadores</h3><p>Nesta versão não há anúncios, planos pagos nem rastreadores de publicidade. Veja a <a href="/privacidade/">página de privacidade</a>.</p></li>
    </ul>
  </div>
</section>

<section id="servicos" class="section" aria-labelledby="serv-t">
  <div class="wrap">
    <div class="svc-card">
      <div>
        <h2 id="serv-t">Quem faz o Caply Tools</h2>
        <p>Sou ${esc(site.author)}, desenvolvedor web. Além de manter estas ferramentas, trabalho com criação de sites, desenvolvimento web e presença digital para quem quer ser encontrado e bem apresentado na internet.</p>
        <p>Se você tem um negócio ou projeto e precisa de um site, uma loja, uma landing page ou de ajustes em algo que já existe, vale conversar.</p>
      </div>
      <div class="svc-cta">
        <a class="btn" href="${site.authorUrl}" rel="noopener">Conhecer o trabalho</a>
        <p class="muted">igorcabral.dev.br</p>
      </div>
    </div>
  </div>
</section>`;

  return {
    path: '/',
    title: 'Caply Tools: ferramentas online gratuitas, sem cadastro',
    description: 'QR Code, link de WhatsApp, sorteador e conversor de imagens. Ferramentas gratuitas que rodam no seu navegador, sem cadastro e sem enviar seus arquivos.',
    body,
    scripts: ['home.js'],
  };
}
