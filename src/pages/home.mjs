import { site, tools } from '../config.mjs';
import { esc } from '../layout.mjs';

const dot = '<span class="dot">.</span>';
const arrow = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

export default function home() {
  const rows = tools.map((t) => `<li class="tool-row">
    <span class="tool-icon" aria-hidden="true">${t.icon}</span>
    <div class="tool-main">
      <h3><a class="stretch" href="/${t.slug}/">${esc(t.name)}</a></h3>
      <p>${esc(t.summary)}</p>
      <ul class="chips" aria-label="Recursos">${t.tags.map((x) => `<li class="chip">${esc(x)}</li>`).join('')}</ul>
    </div>
    <span class="tool-open" aria-hidden="true">${arrow}</span>
  </li>`).join('');

  const body = `
<section class="hero" aria-labelledby="titulo">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="chip chip-local">Executado 100% no seu navegador</p>
      <h1 id="titulo">Ferramentas grátis que resolvem o básico${dot}</h1>
      <p class="lead">QR Code, link de WhatsApp, sorteio e conversão de imagens. Sem cadastro, sem instalar nada e sem enviar seus arquivos para um servidor.</p>
      <p class="hero-actions"><a class="btn" href="#ferramentas">Ver as ferramentas</a><a class="btn btn-secondary" href="#gratuito">Por que é grátis?</a></p>
    </div>
    <div class="demo" aria-labelledby="demo-t">
      <h2 id="demo-t" class="demo-title">Faça um QR Code agora</h2>
      <label for="demo-input">Link ou texto</label>
      <input id="demo-input" type="text" autocomplete="off" spellcheck="false" value="Olá! Este QR Code nasceu no seu navegador.">
      <div class="qr-frame demo-frame"><canvas id="demo-canvas" width="256" height="256" role="img" aria-label="QR Code gerado a partir do texto digitado"></canvas></div>
      <p class="demo-foot"><button type="button" class="btn" id="demo-download">Baixar PNG</button><a class="btn btn-secondary" id="demo-open" href="/qr-code/">Abrir o gerador completo</a></p>
      <p class="status" id="demo-status" role="status" aria-live="polite"></p>
    </div>
  </div>
</section>

<section id="ferramentas" class="section" aria-labelledby="ferr-t">
  <div class="wrap">
    <div class="section-head">
      <h2 id="ferr-t">Escolha uma ferramenta${dot}</h2>
      <p class="lead">Cada uma abre direto, funciona no navegador e pode ser usada quantas vezes você quiser.</p>
    </div>
    <ul class="index">${rows}</ul>
  </div>
</section>

<section id="gratuito" class="proof" aria-labelledby="grat-t">
  <div class="wrap proof-grid">
    <div>
      <h2 id="grat-t">O que você digita fica no seu aparelho${dot}</h2>
      <p class="lead">O QR Code é desenhado, a imagem é convertida e o sorteio é feito no próprio navegador. É por isso que não há conta, nem anúncios: o projeto existe para ser útil e, de forma discreta, mostrar o trabalho de quem o criou.</p>
      <p><a href="/privacidade/">Ler a página de privacidade</a></p>
    </div>
    <ul class="facts">
      <li class="fact"><h3>Tudo no seu aparelho</h3><p>Links, textos, senhas de Wi-Fi, números e imagens não são transmitidos a nenhum servidor desta plataforma.</p></li>
      <li class="fact"><h3>Sem cadastro</h3><p>Não pedimos conta, e-mail nem instalação. Abra a ferramenta e use.</p></li>
      <li class="fact"><h3>Sem anúncios nem rastreadores</h3><p>Esta versão não tem anúncios, planos pagos, cookies nem ferramentas de análise.</p></li>
    </ul>
  </div>
</section>

<section id="criador" class="section maker" aria-labelledby="serv-t">
  <div class="wrap maker-grid">
    <img class="maker-icon" src="/assets/img/igor-cabral-icon.png" width="288" height="294" alt="Logotipo de igor cabral, design &amp; web: um boné azul e branco">
    <div>
      <h2 id="serv-t">Feito por ${esc(site.author)}, que também cria sites${dot}</h2>
      <p>Sou desenvolvedor web. Além de manter estas ferramentas, trabalho com criação de sites, desenvolvimento web e presença digital para quem quer ser encontrado e bem apresentado na internet.</p>
      <p>Se você tem um negócio ou projeto e precisa de um site, de uma landing page ou de ajustes em algo que já existe, vale conversar.</p>
      <div class="maker-cta"><a class="btn" href="${site.authorUrl}" rel="noopener">Conhecer o trabalho</a><p>igorcabral.dev.br</p></div>
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
