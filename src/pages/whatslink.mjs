import { toolBySlug } from '../config.mjs';
import { relatedTools, servicesNote, toolHero } from '../layout.mjs';

export default function whatslink() {
  const t = toolBySlug.whatslink;
  const body = `
${toolHero(t, 'Crie um link que abre direto uma conversa no WhatsApp, com uma mensagem inicial se você quiser. Ideal para site, bio de rede social, cartão de visita e e-mail.')}
<div class="wrap">
  <div class="tool" id="wl-tool">
    <form class="panel" id="wl-form" novalidate>
      <div class="field">
        <label for="wl-phone">Número com código do país</label>
        <input id="wl-phone" type="tel" inputmode="tel" autocomplete="off" placeholder="+55 48 99999-9999" aria-describedby="wl-phone-hint">
        <p class="hint" id="wl-phone-hint">Inclua o código do país e o DDD. Para o Brasil, comece com 55.</p>
      </div>
      <div class="field">
        <label for="wl-msg">Mensagem inicial <span class="muted">(opcional)</span></label>
        <textarea id="wl-msg" rows="4" maxlength="1500" placeholder="Olá! Vi o seu site e gostaria de saber mais."></textarea>
        <p class="hint"><span id="wl-count">0</span> / 1500 caracteres</p>
      </div>
      <p class="field-error" id="wl-error" role="alert"></p>
      <p class="field-hint-warn" id="wl-warn"></p>
    </form>

    <div class="panel result" aria-labelledby="wl-res-t">
      <h2 id="wl-res-t" class="panel-title">Seu link</h2>
      <label for="wl-out" class="sr-only">Link gerado</label>
      <input id="wl-out" type="text" readonly value="" placeholder="O link aparece aqui" class="mono">
      <div class="actions">
        <button type="button" class="btn" id="wl-copy" disabled>Copiar link</button>
        <a class="btn btn-secondary" id="wl-open" href="#" target="_blank" rel="noopener noreferrer" aria-disabled="true">Abrir no WhatsApp</a>
        <a class="btn btn-secondary" id="wl-qr" href="#" aria-disabled="true">Gerar QR Code do link</a>
      </div>
      <p class="status" id="wl-status" role="status" aria-live="polite"></p>
      <p class="note-box"><strong>Em planejamento:</strong> links curtos próprios, com página intermediária e contagem regressiva, ainda não existem. Eles exigem armazenamento e proteção contra abuso e serão adicionados em uma etapa futura. Por enquanto, o link gerado aqui é o endereço oficial <code>wa.me</code>.</p>
    </div>
  </div>

  <div class="prose">
    <section class="prose-block" aria-labelledby="como">
      <h2 id="como">Como funciona o link wa.me</h2>
      <p>O endereço <code>wa.me</code> é o formato oficial do WhatsApp para abrir uma conversa a partir de um link. Ele é montado com o número no formato internacional, apenas dígitos, e, opcionalmente, um texto pré-preenchido. Quando alguém toca no link, o WhatsApp abre a conversa com você e deixa a mensagem pronta para enviar.</p>
      <ol>
        <li>Digite o número completo, com código do país e DDD.</li>
        <li>Se quiser, escreva a mensagem que deve aparecer pronta.</li>
        <li>Copie o link e cole onde desejar, ou gere um QR Code dele com um clique.</li>
      </ol>
    </section>
    <section class="prose-block" aria-labelledby="dicas">
      <h2 id="dicas">Dicas para converter mais conversas</h2>
      <p>Escreva uma mensagem inicial curta que diga de onde a pessoa veio, por exemplo "Olá! Vim pelo seu site e gostaria de um orçamento". Isso ajuda você a identificar a origem do contato. Teste o link no próprio celular antes de divulgar.</p>
    </section>
    <section class="prose-block" aria-labelledby="faq">
      <h2 id="faq">Perguntas frequentes</h2>
      <details><summary>Meu número é enviado para o Caply Tools?</summary><p>Não. O link é montado no seu navegador. O número só aparece no endereço que você copiar e compartilhar.</p></details>
      <details><summary>Preciso de WhatsApp Business?</summary><p>Não. O link funciona com o WhatsApp comum e com o WhatsApp Business.</p></details>
      <details><summary>Por que meu número é recusado?</summary><p>O número deve ter entre 8 e 15 dígitos, incluir o código do país e não pode começar com zero. No Brasil, um celular fica assim: 55, DDD de dois dígitos e nove dígitos do telefone.</p></details>
      <details><summary>O link tem validade?</summary><p>Não. Enquanto o número existir no WhatsApp, o link continua funcionando.</p></details>
    </section>
    ${relatedTools('whatslink')}
    ${servicesNote()}
  </div>
</div>`;
  return { path: '/whatslink/', title: t.metaTitle, description: t.metaDescription, body, scripts: ['whatslink-tool.js'] };
}
