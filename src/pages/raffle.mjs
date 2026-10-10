import { toolBySlug } from '../config.mjs';
import { relatedTools, servicesNote, toolHero } from '../layout.mjs';

export default function raffle() {
  const t = toolBySlug.sorteador;
  const body = `
${toolHero(t, 'Cole a lista de participantes, escolha quantos vencedores você quer e sorteie. Cada pessoa só pode ser sorteada uma vez por rodada.')}
<div class="wrap">
  <div class="tool" id="rf-tool">
    <form class="panel" id="rf-form" aria-label="Dados do sorteio" novalidate>
      <div class="field">
        <label for="rf-names">Participantes (um nome por linha)</label>
        <textarea id="rf-names" rows="10" autocomplete="off" spellcheck="false" aria-describedby="rf-count" placeholder="Ana Souza&#10;Bruno Lima&#10;Carla Dias"></textarea>
        <p class="hint" id="rf-count" aria-live="polite">0 participantes</p>
      </div>
      <div class="field narrow-field">
        <label for="rf-winners">Quantidade de vencedores</label>
        <input id="rf-winners" type="number" inputmode="numeric" min="1" step="1" value="1">
      </div>
      <label class="check"><input type="checkbox" id="rf-dedupe" checked> Ignorar nomes repetidos (sem diferenciar maiúsculas)</label>
      <p class="field-error" id="rf-error" role="alert"></p>
      <div class="actions">
        <button type="submit" class="btn" id="rf-draw">Sortear</button>
        <button type="button" class="btn btn-ghost" id="rf-clear">Limpar lista</button>
      </div>
    </form>

    <div class="panel result" aria-labelledby="rf-res-t">
      <h2 id="rf-res-t" class="panel-title">Resultado</h2>
      <p class="placeholder" id="rf-placeholder">O resultado do sorteio aparece aqui.</p>
      <div id="rf-result" hidden>
        <ol class="winners" id="rf-list" role="list"></ol>
        <p class="meta" id="rf-meta"></p>
        <div class="actions">
          <button type="button" class="btn" id="rf-again">Novo sorteio</button>
          <button type="button" class="btn btn-secondary" id="rf-copy">Copiar resultados</button>
        </div>
      </div>
      <p class="status" id="rf-status" role="status" aria-live="polite"></p>
      <p class="note-box">Este sorteio usa o gerador de números aleatórios do navegador e não possui certificação nem auditoria oficial. Para promoções com regras legais, consulte as exigências aplicáveis.</p>
    </div>
  </div>

  <div class="prose">
    <section class="prose-block" aria-labelledby="como">
      <h2 id="como">Como usar o sorteador</h2>
      <ol>
        <li>Cole ou digite os nomes, um por linha. Linhas em branco são ignoradas.</li>
        <li>Defina quantos vencedores serão sorteados.</li>
        <li>Clique em Sortear. Para repetir com a mesma lista, use Novo sorteio.</li>
        <li>Copie o resultado e compartilhe onde quiser.</li>
      </ol>
    </section>
    <section class="prose-block" aria-labelledby="justo">
      <h2 id="justo">Como o sorteio é feito</h2>
      <p>A escolha usa números aleatórios do navegador (a mesma fonte usada em operações de segurança) e um embaralhamento que dá a todos os participantes exatamente a mesma chance. Não há viés de posição: estar no começo ou no fim da lista não altera as probabilidades. Em um mesmo sorteio, ninguém vence duas vezes.</p>
    </section>
    <section class="prose-block" aria-labelledby="faq">
      <h2 id="faq">Perguntas frequentes</h2>
      <details><summary>A lista de participantes é enviada para algum lugar?</summary><p>Não. Tudo acontece no seu navegador e a lista some quando você fecha a página.</p></details>
      <details><summary>Dois nomes iguais contam como duas chances?</summary><p>Por padrão, não: nomes repetidos são ignorados para evitar duplicidade acidental. Se quiser que uma pessoa tenha mais chances, desmarque a opção de ignorar repetidos e escreva o nome mais de uma vez. Ainda assim, o sorteio pode escolher o mesmo nome em posições diferentes.</p></details>
      <details><summary>Quantos participantes posso colocar?</summary><p>Milhares de nomes funcionam sem problemas em um celular ou computador comum.</p></details>
    </section>
    ${relatedTools('sorteador')}
    ${servicesNote()}
  </div>
</div>`;
  return { path: '/sorteador/', title: t.metaTitle, description: t.metaDescription, body, scripts: ['raffle-tool.js'] };
}
