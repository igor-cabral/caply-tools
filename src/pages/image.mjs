import { toolBySlug } from '../config.mjs';
import { relatedTools, servicesNote, toolHero } from '../layout.mjs';

export default function image() {
  const t = toolBySlug['conversor-de-imagens'];
  const body = `
${toolHero(t, 'Troque o formato de uma imagem entre PNG, JPEG e WebP sem enviar o arquivo para lugar nenhum. A conversão acontece no seu navegador.')}
<div class="wrap">
  <div class="tool" id="im-tool">
    <div class="panel">
      <div class="dropzone" id="im-drop">
        <input type="file" id="im-file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp" class="sr-only-focus">
        <label for="im-file" class="drop-label"><span class="drop-title">Escolher imagem</span><span class="muted">ou arraste e solte aqui. PNG, JPEG, WebP, GIF ou BMP até 20 MB.</span></label>
      </div>
      <p class="field-error" id="im-error" role="alert"></p>

      <div id="im-source" hidden>
        <figure class="preview"><img id="im-src-img" alt="Pré-visualização da imagem escolhida"><figcaption id="im-src-info"></figcaption></figure>

        <fieldset class="seg">
          <legend>Converter para</legend>
          <label><input type="radio" name="fmt" value="png"><span>PNG</span></label>
          <label><input type="radio" name="fmt" value="jpeg"><span>JPEG</span></label>
          <label><input type="radio" name="fmt" value="webp" checked><span>WebP</span></label>
        </fieldset>

        <div class="field" id="im-quality-field">
          <label for="im-quality">Qualidade: <output id="im-quality-out" for="im-quality">90</output>%</label>
          <input type="range" id="im-quality" min="40" max="100" step="5" value="90">
          <p class="hint">Menos qualidade gera arquivos menores. PNG não perde qualidade.</p>
        </div>
        <p class="hint" id="im-note"></p>
        <div class="actions">
          <button type="button" class="btn" id="im-convert">Converter</button>
          <button type="button" class="btn btn-ghost" id="im-reset">Remover imagem</button>
        </div>
      </div>
    </div>

    <div class="panel result" aria-labelledby="im-res-t">
      <h2 id="im-res-t" class="panel-title">Resultado</h2>
      <p class="placeholder" id="im-placeholder">A imagem convertida aparece aqui.</p>
      <div id="im-result" hidden>
        <figure class="preview"><img id="im-out-img" alt="Pré-visualização da imagem convertida"><figcaption id="im-out-info"></figcaption></figure>
        <div class="actions"><a class="btn" id="im-download" href="#" download>Baixar imagem</a></div>
      </div>
      <p class="status" id="im-status" role="status" aria-live="polite"></p>
    </div>
  </div>

  <div class="prose">
    <section class="prose-block" aria-labelledby="como">
      <h2 id="como">Como converter uma imagem</h2>
      <ol>
        <li>Escolha o arquivo ou arraste-o para a área indicada.</li>
        <li>Selecione o formato de saída. Para JPEG e WebP, ajuste a qualidade.</li>
        <li>Clique em Converter, confira o resultado e baixe.</li>
      </ol>
    </section>
    <section class="prose-block" aria-labelledby="qual">
      <h2 id="qual">Qual formato escolher?</h2>
      <p><strong>PNG</strong> preserva todos os detalhes e a transparência, e é bom para logotipos, capturas de tela e ilustrações. <strong>JPEG</strong> gera arquivos menores para fotografias, mas não tem transparência: áreas transparentes ficam com fundo branco. <strong>WebP</strong> costuma ficar menor que os outros dois com boa qualidade e é aceito pelos navegadores atuais, sendo uma boa escolha para sites.</p>
    </section>
    <section class="prose-block" aria-labelledby="faq">
      <h2 id="faq">Perguntas frequentes</h2>
      <details><summary>Minhas imagens são enviadas para algum servidor?</summary><p>Não. O arquivo é lido e convertido no seu navegador, e os dados temporários são descartados quando você remove a imagem ou fecha a página.</p></details>
      <details><summary>Por que o WebP não aparece como opção em alguns aparelhos?</summary><p>A exportação em WebP depende do navegador. Se o seu não suportar, avisamos no momento da conversão e você pode usar PNG ou JPEG.</p></details>
      <details><summary>E os GIFs animados?</summary><p>Aceitamos GIF como arquivo de entrada, mas apenas o primeiro quadro é convertido. A animação não é preservada.</p></details>
      <details><summary>Existe limite de tamanho?</summary><p>Sim: 20 MB por arquivo e cerca de 40 megapixels, para não travar o navegador.</p></details>
      <details><summary>Dá para converter áudio?</summary><p>Ainda não. Esta ferramenta trabalha apenas com imagens.</p></details>
    </section>
    ${relatedTools('conversor-de-imagens')}
    ${servicesNote()}
  </div>
</div>`;
  return { path: '/conversor-de-imagens/', title: t.metaTitle, description: t.metaDescription, body, scripts: ['image-tool.js'] };
}
