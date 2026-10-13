import { toolBySlug } from '../config.mjs';
import { esc, relatedTools, servicesNote, toolHero } from '../layout.mjs';
import { LIMITS, OUTPUT_FORMATS } from '../assets/js/audio-lib.js';

const mb = (n) => `${Math.round(n / 1024 / 1024)} MB`;
const mp3 = OUTPUT_FORMATS.find((f) => f.id === 'mp3');

export default function audio() {
  const t = toolBySlug['conversor-de-audio'];
  const rates = [[44100, '44,1 kHz (padrão, qualidade de CD)'], [48000, '48 kHz (vídeo e estúdio)'], [22050, '22,05 kHz (voz, arquivo menor)'], [16000, '16 kHz (voz, bem menor)']]
    .map(([v, l]) => `<option value="${v}"${v === 44100 ? ' selected' : ''}>${l}</option>`).join('');

  const body = `
${toolHero(t, 'Converta um ou vários arquivos de áudio para WAV, ouça uma prévia e baixe o resultado. O arquivo é processado no seu aparelho e não é enviado a nenhum servidor.')}
<div class="wrap">
  <div class="tool" id="au-tool">
    <div class="panel">
      <div class="dropzone" id="au-drop">
        <input type="file" id="au-file" multiple accept="audio/*,video/mp4,video/webm,.mp3,.wav,.ogg,.oga,.opus,.flac,.m4a,.aac,.webm,.mp4,.aif,.aiff" class="sr-only-focus">
        <label for="au-file" class="drop-label"><span class="drop-title">Escolher arquivos de áudio</span><span class="muted">ou arraste e solte aqui. Até ${LIMITS.maxQueue} arquivos, ${mb(LIMITS.maxFileBytes)} e ${LIMITS.maxDurationSec / 60} minutos cada.</span></label>
      </div>
      <p class="field-error multi" id="au-error" role="alert"></p>

      <fieldset class="seg">
        <legend>Formato de saída</legend>
        <label><input type="radio" name="ofmt" value="wav" checked><span>WAV</span></label>
        <label><input type="radio" name="ofmt" value="mp3" disabled aria-describedby="au-mp3-note"><span>MP3 (indisponível)</span></label>
      </fieldset>
      <p class="hint" id="au-mp3-note">${esc(mp3.reason)}</p>

      <div class="field">
        <label for="au-bits">Profundidade de bits</label>
        <select id="au-bits">
          <option value="16" selected>16 bits (padrão, funciona em qualquer lugar)</option>
          <option value="24">24 bits (mais fiel, arquivo 50% maior)</option>
        </select>
      </div>
      <div class="field">
        <label for="au-rate">Taxa de amostragem</label>
        <select id="au-rate">${rates}</select>
      </div>
      <fieldset class="seg">
        <legend>Canais</legend>
        <label><input type="radio" name="ch" value="keep" checked><span>Manter (até estéreo)</span></label>
        <label><input type="radio" name="ch" value="mono"><span>Mono (arquivo menor)</span></label>
      </fieldset>
      <p class="hint">Arquivos com mais de 2 canais (como 5.1) são mixados para estéreo ou mono.</p>

      <details class="opts">
        <summary>O que este navegador consegue abrir</summary>
        <ul class="support-list" id="au-support"></ul>
        <p class="hint">É uma estimativa do próprio navegador, não uma garantia. O teste definitivo é tentar converter: se o formato não for compatível, a ferramenta avisa.</p>
      </details>
    </div>

    <div class="panel result" aria-labelledby="au-res-t">
      <h2 id="au-res-t" class="panel-title">Fila de conversão</h2>
      <p class="placeholder" id="au-empty">Nenhum arquivo ainda. Escolha ou arraste arquivos de áudio para começar.</p>
      <ol class="audio-list" id="au-list" role="list"></ol>
      <p class="meta" id="au-summary"></p>
      <div class="actions" id="au-actions" hidden>
        <button type="button" class="btn" id="au-convert-all">Converter todos</button>
        <button type="button" class="btn btn-secondary" id="au-clear">Limpar tudo</button>
      </div>
      <p class="status" id="au-status" role="status" aria-live="polite"></p>
      <p class="note-box">Os arquivos são lidos e convertidos no seu navegador e ficam apenas na memória desta página. Ao remover um item ou fechar a página, os dados temporários são descartados.</p>
    </div>
  </div>

  <div class="prose">
    <section class="prose-block" aria-labelledby="como">
      <h2 id="como">Como converter um áudio para WAV</h2>
      <ol>
        <li>Escolha ou arraste um ou mais arquivos. Cada um aparece na fila com formato, tamanho e duração.</li>
        <li>Defina a profundidade de bits, a taxa de amostragem e os canais. Os padrões (16 bits, 44,1 kHz) servem para a maioria dos casos.</li>
        <li>Clique em Converter, ou em Converter todos para processar a fila, um arquivo por vez.</li>
        <li>Ouça a prévia e baixe o WAV. Você pode cancelar uma conversão em andamento ou remover itens a qualquer momento.</li>
      </ol>
    </section>
    <section class="prose-block" aria-labelledby="formatos">
      <h2 id="formatos">O que funciona e o que não funciona</h2>
      <p>A saída é sempre <strong>WAV</strong> (PCM sem compressão). Gerar MP3 ainda não é possível: exige um codificador de terceiros que não está incluído nesta versão.</p>
      <p>Os formatos de entrada dependem do <strong>seu navegador</strong>, porque quem decodifica o arquivo é ele. Os navegadores costumam abrir WAV e MP3, mas OGG, FLAC e M4A/AAC variam de um navegador para outro. Quando um arquivo não é compatível, você vê uma mensagem clara em vez de um resultado quebrado. O painel "O que este navegador consegue abrir" mostra a estimativa do seu navegador.</p>
      <p>Não prometemos suporte a todos os codecs. Arquivos protegidos por DRM e formatos como WMA e MIDI não são abertos pelos navegadores e não são contornados.</p>
    </section>
    <section class="prose-block" aria-labelledby="como-feito">
      <h2 id="como-feito">Como a conversão é feita</h2>
      <p>O navegador decodifica o arquivo com a Web Audio API, a ferramenta ajusta canais e taxa de amostragem e grava o WAV em blocos, o que permite mostrar o progresso real dessa etapa. A decodificação em si é feita pelo navegador e ele não informa o andamento, por isso essa fase mostra uma barra sem porcentagem.</p>
      <p>Para evitar travar o aparelho, cada arquivo pode ter até ${mb(LIMITS.maxFileBytes)} e ${LIMITS.maxDurationSec / 60} minutos: dez minutos de áudio estéreo decodificado ocupam cerca de 212 MB de memória, além do WAV gerado. Em celulares, prefira arquivos mais curtos ou a opção mono.</p>
    </section>
    <section class="prose-block" aria-labelledby="video">
      <h2 id="video">Extrair o áudio de um vídeo</h2>
      <p>Arquivos MP4 e WebM são aceitos e, quando o navegador consegue decodificar a trilha de áudio, o WAV contém só o som. Isso depende do navegador e do codec do vídeo. A ferramenta não contorna proteções: vídeos protegidos simplesmente não são abertos.</p>
    </section>
    <section class="prose-block" aria-labelledby="faq">
      <h2 id="faq">Perguntas frequentes</h2>
      <details><summary>Meu arquivo é enviado para algum servidor?</summary><p>Não. Ele é lido e convertido no seu navegador. Nada do conteúdo sai do seu aparelho.</p></details>
      <details><summary>Por que o WAV fica tão maior que o MP3?</summary><p>O WAV guarda o som sem compressão. Um minuto de áudio estéreo em 16 bits e 44,1 kHz ocupa cerca de 10 MB. Para reduzir, escolha mono ou uma taxa de amostragem menor.</p></details>
      <details><summary>Dá para converter para MP3?</summary><p>Ainda não. A saída disponível é WAV. O MP3 depende de um codificador que não está nesta versão.</p></details>
      <details><summary>Por que meu arquivo M4A ou AAC não abriu?</summary><p>Nem todo navegador decodifica AAC. Tente outro navegador (por exemplo, o Safari abre AAC nativamente) ou converta o arquivo antes com outro programa.</p></details>
      <details><summary>Qual é a diferença entre 16 e 24 bits?</summary><p>24 bits guardam mais detalhe da dinâmica do som e são úteis para edição profissional. Para ouvir e compartilhar, 16 bits bastam e o arquivo é menor.</p></details>
      <details><summary>Por que a barra de progresso não tem porcentagem no início?</summary><p>A decodificação é feita pelo próprio navegador, que não informa o andamento. A porcentagem aparece na fase seguinte, quando o WAV é gerado.</p></details>
    </section>
    ${relatedTools('conversor-de-audio')}
    ${servicesNote()}
  </div>
</div>`;
  return { path: '/conversor-de-audio/', title: t.metaTitle, description: t.metaDescription, body, scripts: ['audio-tool.js'] };
}
