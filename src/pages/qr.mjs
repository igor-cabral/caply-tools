import { toolBySlug } from '../config.mjs';
import { relatedTools, servicesNote, toolHero } from '../layout.mjs';

export default function qr() {
  const t = toolBySlug['qr-code'];
  const body = `
${toolHero(t, 'Transforme um link, um texto ou os dados da sua rede Wi-Fi em um QR Code pronto para imprimir ou compartilhar. Tudo é gerado aqui no seu navegador.')}
<div class="wrap">
  <div class="tool" id="qr-tool">
    <form class="panel" id="qr-form" novalidate>
      <fieldset class="seg">
        <legend>O que o QR Code vai conter?</legend>
        <label><input type="radio" name="kind" value="url" checked><span>Link</span></label>
        <label><input type="radio" name="kind" value="text"><span>Texto</span></label>
        <label><input type="radio" name="kind" value="wifi"><span>Wi-Fi</span></label>
      </fieldset>

      <div class="field" data-panel="url">
        <label for="qr-url">Endereço do link</label>
        <input id="qr-url" type="text" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://exemplo.com.br" aria-describedby="qr-url-hint">
        <p class="hint" id="qr-url-hint">Se você não digitar http:// ou https://, usamos https:// automaticamente.</p>
      </div>

      <div class="field" data-panel="text" hidden>
        <label for="qr-text">Texto</label>
        <textarea id="qr-text" rows="4" autocomplete="off" placeholder="Digite qualquer texto"></textarea>
      </div>

      <div data-panel="wifi" hidden>
        <div class="field">
          <label for="qr-ssid">Nome da rede (SSID)</label>
          <input id="qr-ssid" type="text" autocomplete="off" spellcheck="false" maxlength="32">
        </div>
        <div class="field">
          <label for="qr-security">Segurança</label>
          <select id="qr-security">
            <option value="WPA" selected>WPA/WPA2/WPA3 (mais comum)</option>
            <option value="WEP">WEP</option>
            <option value="nopass">Sem senha</option>
          </select>
        </div>
        <div class="field" id="qr-pass-field">
          <label for="qr-pass">Senha da rede</label>
          <input id="qr-pass" type="password" autocomplete="off" spellcheck="false">
          <label class="check"><input type="checkbox" id="qr-showpass"> Mostrar senha</label>
        </div>
        <label class="check"><input type="checkbox" id="qr-hidden"> Rede oculta</label>
      </div>

      <details class="opts">
        <summary>Opções avançadas</summary>
        <div class="field">
          <label for="qr-size">Tamanho do PNG</label>
          <select id="qr-size">
            <option value="512">512 × 512 px</option>
            <option value="1024" selected>1024 × 1024 px</option>
            <option value="2048">2048 × 2048 px</option>
          </select>
        </div>
        <div class="field">
          <label for="qr-ecc">Correção de erros</label>
          <select id="qr-ecc" aria-describedby="qr-ecc-hint">
            <option value="L">Baixa (L), menos pontos</option>
            <option value="M" selected>Média (M), recomendada</option>
            <option value="Q">Alta (Q)</option>
            <option value="H">Máxima (H), mais pontos</option>
          </select>
          <p class="hint" id="qr-ecc-hint">Níveis maiores aguentam mais sujeira ou desgaste, mas geram um desenho mais denso.</p>
        </div>
      </details>

      <p class="field-error" id="qr-error" role="alert"></p>
    </form>

    <div class="panel result" aria-labelledby="qr-res-t">
      <h2 id="qr-res-t" class="panel-title">Pré-visualização</h2>
      <div class="qr-frame">
        <canvas id="qr-canvas" width="300" height="300" role="img" aria-label="Pré-visualização do QR Code" hidden></canvas>
        <p class="placeholder" id="qr-placeholder">Preencha o formulário para ver o QR Code aqui.</p>
      </div>
      <p class="meta" id="qr-meta"></p>
      <div class="actions">
        <button type="button" class="btn" id="qr-png" disabled>Baixar PNG</button>
        <button type="button" class="btn btn-secondary" id="qr-svg" disabled>Baixar SVG</button>
        <button type="button" class="btn btn-secondary" id="qr-copy" disabled>Copiar conteúdo</button>
      </div>
      <p class="status" id="qr-status" role="status" aria-live="polite"></p>
    </div>
  </div>

  <div class="prose">
    <section class="prose-block" aria-labelledby="como">
      <h2 id="como">Como criar um QR Code</h2>
      <ol>
        <li>Escolha se o código levará um link, um texto livre ou os dados de uma rede Wi-Fi.</li>
        <li>Preencha os campos. O QR Code aparece e se atualiza enquanto você digita.</li>
        <li>Confira a pré-visualização e baixe em PNG (ideal para imagens e impressão) ou SVG (ideal para ampliar sem perder qualidade).</li>
        <li>Antes de imprimir, teste a leitura com a câmera do seu celular.</li>
      </ol>
    </section>
    <section class="prose-block" aria-labelledby="wifi">
      <h2 id="wifi">QR Code de Wi-Fi: visitas conectadas sem digitar senha</h2>
      <p>Ao ler um QR Code de Wi-Fi com a câmera, a maioria dos celulares oferece conectar na rede automaticamente. Informe o nome exato da rede, o tipo de segurança e a senha. Se você não souber o tipo, WPA/WPA2/WPA3 é o padrão da grande maioria dos roteadores atuais. A senha digitada fica apenas neste navegador e não é enviada a ninguém.</p>
    </section>
    <section class="prose-block" aria-labelledby="faq">
      <h2 id="faq">Perguntas frequentes</h2>
      <details><summary>O QR Code expira?</summary><p>Não. O código gerado aqui é estático: o conteúdo está dentro do próprio desenho e ele funciona enquanto o link ou a rede existirem. Como não passa por nenhum serviço intermediário, não há contador de acessos nem como desativá-lo depois.</p></details>
      <details><summary>Posso usar em material impresso e comercial?</summary><p>Pode. Baixe em tamanho grande ou em SVG, mantenha a margem branca ao redor e evite imprimir menor que 2 cm de lado. Sempre teste a leitura antes de imprimir uma tiragem.</p></details>
      <details><summary>Meu conteúdo é enviado para algum servidor?</summary><p>Não. O QR Code é calculado e desenhado no seu navegador. Nada do que você digita sai do seu aparelho.</p></details>
      <details><summary>Qual nível de correção de erros devo escolher?</summary><p>O nível médio (M) atende bem à maior parte dos casos. Use níveis mais altos se o código for impresso em superfícies sujeitas a desgaste. Quanto mais alto o nível, mais denso fica o desenho.</p></details>
    </section>
    ${relatedTools('qr-code')}
    ${servicesNote()}
  </div>
</div>`;
  return { path: '/qr-code/', title: t.metaTitle, description: t.metaDescription, body, scripts: ['qr-tool.js'] };
}
