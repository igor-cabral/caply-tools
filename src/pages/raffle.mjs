import { toolBySlug } from '../config.mjs';
import { esc, relatedTools, servicesNote, toolHero } from '../layout.mjs';
import { MODES } from '../assets/js/raffle-modes.js';

// Conteúdo explicativo próprio de cada modalidade (sem texto repetido entre páginas).
const CONTENT = {
  nomes: {
    lead: 'Cole a lista de participantes, escolha quantos vencedores você quer e sorteie. Por padrão, cada pessoa só pode ser sorteada uma vez.',
    steps: ['Cole ou digite os nomes, um por linha. Linhas em branco são ignoradas.', 'Defina quantos vencedores serão sorteados.', 'Se quiser que o mesmo nome possa sair mais de uma vez, marque a opção de permitir repetição.', 'Clique em Sortear. Para repetir com a mesma lista, use Novo sorteio.'],
    howTitle: 'Como o sorteio de nomes é feito',
    how: ['A escolha usa números aleatórios do navegador (<code>crypto.getRandomValues</code>) e um embaralhamento que dá a todos exatamente a mesma chance. Estar no começo ou no fim da lista não altera as probabilidades.', 'Sem repetição, ninguém vence duas vezes no mesmo sorteio. Com repetição, cada vencedor é sorteado de novo entre todos os nomes, então a mesma pessoa pode sair várias vezes.'],
    faq: [
      ['A lista de participantes é enviada para algum lugar?', 'Não. Tudo acontece no seu navegador e a lista some quando você fecha a página.'],
      ['Dois nomes iguais contam como duas chances?', 'Por padrão, não: nomes repetidos são ignorados para evitar duplicidade acidental. Para dar mais chances a alguém, desmarque a opção de ignorar repetidos e escreva o nome mais de uma vez.'],
      ['Posso usar em um sorteio de promoção?', 'A ferramenta não tem certificação nem auditoria. Se o sorteio tiver regras legais, como em promoções comerciais, confira as exigências aplicáveis.'],
      ['Quantos participantes posso colocar?', 'Até 10.000 nomes por lista.'],
    ],
  },
  numeros: {
    lead: 'Defina o menor e o maior número, escolha quantos quer sortear e decida se o mesmo número pode repetir. Útil para bingo, rifas, dados e escolhas rápidas.',
    steps: ['Informe o menor e o maior número do intervalo (podem ser negativos).', 'Escolha quantos números quer sortear.', 'Marque "Permitir repetição" se o mesmo número puder sair mais de uma vez.', 'Se preferir, peça o resultado em ordem crescente e clique em Sortear números.'],
    howTitle: 'Como o sorteio de números é feito',
    how: ['Sem repetição, usamos o algoritmo de Floyd: ele escolhe um conjunto de números distintos com chances iguais sem precisar listar todo o intervalo. Por isso funciona mesmo com intervalos enormes (até 4,29 bilhões de valores possíveis). Em seguida, a ordem de saída também é embaralhada.', 'Com repetição, cada número é sorteado de forma independente em todo o intervalo. Os números aleatórios vêm do Web Crypto do navegador.'],
    faq: [
      ['Posso sortear números de bingo ou rifa?', 'Pode. Por exemplo, de 1 a 75, sem repetição. Cada rodada gera um conjunto novo; a ferramenta não guarda o histórico das rodadas anteriores.'],
      ['Dá para sortear números decimais?', 'Não. Esta ferramenta sorteia apenas números inteiros.'],
      ['Qual é o máximo de números por sorteio?', 'Até 10.000 por vez. Sem repetição, a quantidade não pode passar do tamanho do intervalo.'],
      ['Posso receber os números em ordem?', 'Sim. Marque a opção de ordem crescente. Sem ela, a ordem de saída é aleatória.'],
    ],
  },
  equipes: {
    lead: 'Divida uma lista de pessoas em equipes ou grupos aleatórios, por número de equipes ou por pessoas em cada uma. Os tamanhos ficam o mais equilibrados possível.',
    steps: ['Cole os nomes, um por linha.', 'Escolha se quer informar o número de equipes ou quantas pessoas por equipe.', 'Se precisar, indique quem não pode ficar na mesma equipe e quem deve ficar de fora.', 'Clique em Formar equipes. Use Novo sorteio para tentar outra divisão.'],
    howTitle: 'Como as equipes são formadas',
    how: ['Embaralhamos a lista e distribuímos as pessoas. Os tamanhos diferem no máximo em uma pessoa: 10 pessoas em 3 equipes viram equipes de 4, 3 e 3. Qual equipe recebe a vaga extra também é sorteado.', 'Quando você define pessoas que não podem ficar juntas, a ferramenta sorteia até cumprir as regras. Se isso for difícil, faz uma busca completa e avisa quando for impossível. Com regras, o resultado é sempre válido, mas nem todas as divisões possíveis têm exatamente a mesma chance.'],
    faq: [
      ['Equipe e grupo são diferentes?', 'Não. O método é o mesmo; você só escolhe como o resultado é chamado.'],
      ['Como indico quem não pode ficar junto?', 'Em "Pessoas que não podem ficar juntas", escreva uma regra por linha, com os nomes separados por vírgula. Exemplo: "Ana, Bruno" separa os dois. Uma linha com três nomes separa os três entre si.'],
      ['E se o número de pessoas não dividir certo?', 'As equipes ficam com tamanhos próximos, com diferença de no máximo uma pessoa.'],
      ['Posso deixar alguém de fora?', 'Sim. Em "Excluir participantes", escreva os nomes que não devem entrar na divisão.'],
    ],
  },
  ordem: {
    lead: 'Sorteie a ordem de apresentação, de fala ou de participação de uma lista. Todos aparecem uma única vez, em posição aleatória.',
    steps: ['Cole os nomes, um por linha.', 'Se alguém não vai participar, coloque o nome em "Excluir participantes".', 'Clique em Sortear a ordem.', 'Copie, imprima ou baixe a lista numerada.'],
    howTitle: 'Como a ordem é sorteada',
    how: ['A ordem é um embaralhamento completo da lista, feito com números aleatórios do navegador. Todas as ordens possíveis têm a mesma chance, então ninguém é favorecido por estar no começo da lista original.', 'Se você refizer o sorteio, a ordem muda por completo. Não há memória entre um sorteio e o seguinte.'],
    faq: [
      ['Para que serve sortear a ordem?', 'Para definir quem apresenta primeiro em uma aula ou reunião, a ordem de fala em uma dinâmica ou a sequência de jogadores em uma partida.'],
      ['Posso imprimir a lista?', 'Pode. O botão Imprimir mostra só o resultado, sem o resto da página.'],
      ['Dá para fixar alguém em uma posição?', 'Ainda não. A ferramenta sorteia a ordem inteira.'],
    ],
  },
  chaves: {
    lead: 'Sorteie confrontos em duplas ou monte uma chave eliminatória completa. Quando o número de participantes não fecha, as folgas são sorteadas e distribuídas pela chave.',
    steps: ['Cole os participantes, um por linha.', 'Escolha entre chave eliminatória e confrontos em duplas.', 'Clique em Sortear chave.', 'Imprima ou baixe a chave para acompanhar o torneio.'],
    howTitle: 'Como a chave é montada',
    how: ['Os participantes são embaralhados e distribuídos nos jogos da primeira rodada. Se o número não for uma potência de 2 (8, 16, 32…), algumas pessoas avançam direto, e as posições dessas folgas são sorteadas. Nunca há um confronto de folga contra folga.', 'Nas rodadas seguintes, cada vaga mostra "Vencedor do jogo N" até você saber o resultado. A ferramenta sorteia o chaveamento, mas não registra os placares.'],
    faq: [
      ['Como funcionam as folgas?', 'Com 6 participantes, a chave tem 8 vagas: 2 pessoas avançam direto para as semifinais, e as outras 4 se enfrentam na primeira rodada.'],
      ['Serve para campeonato de pontos corridos?', 'Não. Aqui há apenas chave eliminatória simples e confrontos em duplas.'],
      ['Tem dupla eliminação ou disputa de terceiro lugar?', 'Não. Essas variações não foram implementadas.'],
      ['Qual é o limite de participantes?', 'A chave aceita até 256 participantes.'],
    ],
  },
};

function toolMarkup(initial) {
  const radio = (name, value, label, checked) => `<label><input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}><span>${label}</span></label>`;
  const modeRadios = MODES.map((m) => radio('mode', m.id, esc(m.label), m.id === initial.id)).join('');
  return `
  <div class="tool" id="rf-tool" data-mode="${initial.id}">
    <form class="panel" id="rf-form" aria-label="Dados do sorteio" novalidate>
      <fieldset class="seg mode-seg">
        <legend>O que você quer sortear?</legend>
        ${modeRadios}
      </fieldset>
      <p class="mode-help" id="rf-mode-help">${esc(initial.help)}</p>

      <div data-for="nomes equipes ordem chaves">
        <div class="field">
          <label for="rf-names">Participantes (um nome por linha)</label>
          <textarea id="rf-names" rows="9" autocomplete="off" spellcheck="false" aria-describedby="rf-count" placeholder="Ana Souza&#10;Bruno Lima&#10;Carla Dias"></textarea>
          <p class="hint" id="rf-count" aria-live="polite">0 participantes</p>
        </div>
        <label class="check"><input type="checkbox" id="rf-dedupe" checked> Ignorar nomes repetidos (sem diferenciar maiúsculas)</label>
        <details class="opts">
          <summary>Excluir participantes</summary>
          <div class="field">
            <label for="rf-exclude">Nomes a deixar de fora (um por linha)</label>
            <textarea id="rf-exclude" rows="3" autocomplete="off" spellcheck="false"></textarea>
            <p class="hint">Quem estiver aqui é removido da lista antes do sorteio.</p>
          </div>
        </details>
      </div>

      <div data-for="nomes">
        <div class="field narrow-field">
          <label for="rf-winners">Quantidade de vencedores</label>
          <input id="rf-winners" type="number" inputmode="numeric" min="1" step="1" value="1">
        </div>
        <label class="check"><input type="checkbox" id="rf-repeat"> Permitir que o mesmo nome saia mais de uma vez</label>
      </div>

      <div data-for="numeros" hidden>
        <div class="num-grid">
          <div class="field"><label for="rf-min">Menor número</label><input id="rf-min" type="number" inputmode="numeric" step="1" value="1"></div>
          <div class="field"><label for="rf-max">Maior número</label><input id="rf-max" type="number" inputmode="numeric" step="1" value="60"></div>
          <div class="field"><label for="rf-ncount">Quantidade</label><input id="rf-ncount" type="number" inputmode="numeric" min="1" step="1" value="6"></div>
        </div>
        <label class="check"><input type="checkbox" id="rf-nrepeat"> Permitir repetição do mesmo número</label>
        <label class="check"><input type="checkbox" id="rf-nsort"> Mostrar em ordem crescente</label>
      </div>

      <div data-for="equipes" hidden>
        <fieldset class="seg">
          <legend>Como dividir?</legend>
          ${radio('tmode', 'teams', 'Número de equipes', true)}
          ${radio('tmode', 'perTeam', 'Pessoas por equipe', false)}
        </fieldset>
        <div class="field narrow-field">
          <label for="rf-tvalue" id="rf-tvalue-label">Quantas equipes?</label>
          <input id="rf-tvalue" type="number" inputmode="numeric" min="1" step="1" value="2">
        </div>
        <fieldset class="seg">
          <legend>Chamar de</legend>
          ${radio('tlabel', 'Equipe', 'Equipes', true)}
          ${radio('tlabel', 'Grupo', 'Grupos', false)}
        </fieldset>
        <details class="opts">
          <summary>Pessoas que não podem ficar juntas</summary>
          <div class="field">
            <label for="rf-sep">Uma regra por linha, nomes separados por vírgula</label>
            <textarea id="rf-sep" rows="3" autocomplete="off" spellcheck="false" placeholder="Ana, Bruno"></textarea>
            <p class="hint">Cada linha separa todas as pessoas citadas entre si. Os nomes precisam estar na lista de participantes.</p>
          </div>
        </details>
      </div>

      <div data-for="chaves" hidden>
        <fieldset class="seg">
          <legend>Formato</legend>
          ${radio('bmode', 'bracket', 'Chave eliminatória', true)}
          ${radio('bmode', 'pairs', 'Confrontos em duplas', false)}
        </fieldset>
      </div>

      <p class="field-error" id="rf-error" role="alert"></p>
      <div class="actions">
        <button type="submit" class="btn" id="rf-draw">${esc(initial.action)}</button>
        <button type="button" class="btn btn-ghost" id="rf-clear">Limpar</button>
      </div>
    </form>

    <div class="panel result" aria-labelledby="rf-res-t">
      <h2 id="rf-res-t" class="panel-title">Resultado</h2>
      <p class="placeholder" id="rf-placeholder">O resultado do sorteio aparece aqui.</p>
      <div id="rf-result" hidden>
        <p class="print-head" id="rf-print-head"></p>
        <div id="rf-output"></div>
        <p class="meta" id="rf-meta"></p>
        <div class="actions">
          <button type="button" class="btn" id="rf-again">Novo sorteio</button>
          <button type="button" class="btn btn-secondary" id="rf-copy">Copiar resultado</button>
          <button type="button" class="btn btn-secondary" id="rf-print">Imprimir</button>
          <button type="button" class="btn btn-secondary" id="rf-csv">Baixar CSV</button>
        </div>
      </div>
      <p class="status" id="rf-status" role="status" aria-live="polite"></p>
      <p class="note-box">Os números aleatórios vêm do Web Crypto do navegador. O sorteio não tem certificação nem auditoria oficial. Para promoções com regras legais, confira as exigências aplicáveis.</p>
    </div>
  </div>`;
}

export default function raffle() {
  const base = toolBySlug.sorteador;
  return MODES.map((m) => {
    const c = CONTENT[m.id];
    const crumbs = m.id === 'nomes' ? undefined : `<a href="/">Início</a> / <a href="/sorteador/">Sorteador</a> / ${esc(m.label)}`;
    const faq = c.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
    const modes = MODES.map((x) => `<li><a href="${x.path}"${x.id === m.id ? ' aria-current="page"' : ''}><strong>${esc(x.label)}</strong><span>${esc(x.help)}</span></a></li>`).join('');
    const body = `
${toolHero({ ...base, name: m.h1, short: 'Sorteador' }, c.lead, crumbs)}
<div class="wrap">
${toolMarkup(m)}
  <div class="prose">
    <section class="prose-block" aria-labelledby="como">
      <h2 id="como">Como usar</h2>
      <ol>${c.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    </section>
    <section class="prose-block" aria-labelledby="justo">
      <h2 id="justo">${esc(c.howTitle)}</h2>
      ${c.how.map((p) => `<p>${p}</p>`).join('')}
    </section>
    <section class="prose-block" aria-labelledby="faq">
      <h2 id="faq">Perguntas frequentes</h2>
      ${faq}
    </section>
    <section class="prose-block" aria-labelledby="modalidades">
      <h2 id="modalidades">Modalidades do sorteador</h2>
      <ul class="plain-list">${modes}</ul>
    </section>
    ${relatedTools('sorteador')}
    ${servicesNote()}
  </div>
</div>`;
    return { path: m.path, title: m.title, description: m.description, body, scripts: ['raffle-tool.js'] };
  });
}
