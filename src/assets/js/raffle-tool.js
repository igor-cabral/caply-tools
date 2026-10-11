import { parseNames, drawNames, drawNumbers, drawOrder, validateRaffle, validateParticipants, validateNumberDraw, applyExclusions, LIMITS } from './raffle-lib.js';
import { planTeams, parseSeparations, splitTeams } from './raffle-groups.js';
import { makePairs, makeBracket } from './raffle-bracket.js';
import { resultToText, resultToCsv, resultTitle, formatDateTime } from './raffle-export.js';
import { modeById } from './raffle-modes.js';
import { $, copyText, debounce, downloadBlob, flashButton, setError, setStatus } from './ui.js';

const root = $('rf-tool');
const form = $('rf-form');
const errorEl = $('rf-error'), statusEl = $('rf-status'), counter = $('rf-count');
const resultBox = $('rf-result'), placeholder = $('rf-placeholder'), output = $('rf-output'), meta = $('rf-meta');
const names = $('rf-names');

let mode = modeById(root.dataset.mode);
let last = null; // último resultado

const num = (el) => (el.value.trim() === '' ? NaN : Number(el.value));
const checked = (name) => form.querySelector(`input[name="${name}"]:checked`).value;
const plural = (n, one, many) => (n === 1 ? one : many);

// ---------- lista de participantes ----------
function readList() {
  const parsed = parseNames(names.value, { dedupe: $('rf-dedupe').checked });
  const ex = applyExclusions(parsed.names, $('rf-exclude').value);
  return { names: ex.names, duplicates: parsed.duplicates, removed: ex.removed };
}

function updateCounter() {
  const { names: n, duplicates, removed } = readList();
  const extra = [];
  if (duplicates) extra.push(`${duplicates} ${plural(duplicates, 'repetido ignorado', 'repetidos ignorados')}`);
  if (removed) extra.push(`${removed} ${plural(removed, 'excluído', 'excluídos')}`);
  counter.textContent = `${n.length} ${plural(n.length, 'participante', 'participantes')}${extra.length ? `, ${extra.join(', ')}` : ''}`;
}

// ---------- modalidades ----------
function teamLabelWord() { return checked('tlabel'); }
function updateTeamLabel() {
  const word = teamLabelWord().toLowerCase();
  $('rf-tvalue-label').textContent = checked('tmode') === 'teams'
    ? `Quantas ${word === 'equipe' ? 'equipes' : 'grupos'}?`
    : `Quantas pessoas por ${word}?`;
}

function showMode(id, { first = false } = {}) {
  mode = modeById(id);
  form.querySelector(`input[name="mode"][value="${mode.id}"]`).checked = true;
  root.querySelectorAll('[data-for]').forEach((el) => { el.hidden = !el.dataset.for.split(' ').includes(mode.id); });
  $('rf-draw').textContent = mode.action;
  $('rf-mode-help').textContent = mode.help;
  setError(errorEl, '', [...form.querySelectorAll('input, textarea')]);
  if (!first) {
    clearResult();
    document.title = mode.title;
    history.replaceState(null, '', mode.path + location.hash);
  }
  updateTeamLabel();
  updateCounter();
}

function clearResult() {
  last = null;
  resultBox.hidden = true; placeholder.hidden = false;
  output.replaceChildren(); meta.textContent = '';
  root.classList.remove('tool-wide');
  setStatus(statusEl, '');
}

// ---------- sorteio ----------
/** @returns {{result?: object, error?: string, inputs?: HTMLElement[], note?: string}} */
function run() {
  const list = readList();
  switch (mode.id) {
    case 'nomes': {
      const v = validateParticipants(list.names);
      if (!v.ok) return { error: v.error, inputs: [names] };
      const count = num($('rf-winners'));
      const repeat = $('rf-repeat').checked;
      if (!repeat) {
        const c = validateRaffle(list.names.length, count);
        if (!c.ok) return { error: c.error, inputs: [count && list.names.length ? $('rf-winners') : names] };
      } else if (!Number.isInteger(count) || count < 1 || count > LIMITS.maxCount) {
        return { error: `A quantidade deve ser um número inteiro entre 1 e ${LIMITS.maxCount}.`, inputs: [$('rf-winners')] };
      }
      return { result: { kind: 'names', winners: drawNames(list.names, count, { repeat }), meta: { participants: list.names.length, repeat } } };
    }
    case 'numeros': {
      const spec = { min: num($('rf-min')), max: num($('rf-max')), count: num($('rf-ncount')), repeat: $('rf-nrepeat').checked, sort: $('rf-nsort').checked };
      const v = validateNumberDraw(spec);
      if (!v.ok) return { error: v.error, inputs: [$('rf-min'), $('rf-max'), $('rf-ncount')] };
      return { result: { kind: 'numbers', values: drawNumbers(spec), meta: { ...spec, size: v.size } } };
    }
    case 'equipes': {
      const v = validateParticipants(list.names, { min: 2 });
      if (!v.ok) return { error: v.error, inputs: [names] };
      const plan = planTeams(list.names.length, { mode: checked('tmode'), value: num($('rf-tvalue')) });
      if (!plan.ok) return { error: plan.error, inputs: [$('rf-tvalue')] };
      const sep = parseSeparations($('rf-sep').value, list.names);
      const r = splitTeams(list.names, plan.sizes, sep.groups);
      if (!r.ok) return { error: r.error, inputs: [$('rf-sep')] };
      const note = sep.unknown.length ? `Ignorei nomes das regras que não estão na lista: ${sep.unknown.slice(0, 5).join(', ')}${sep.unknown.length > 5 ? '…' : ''}.` : '';
      return { result: { kind: 'teams', label: teamLabelWord(), teams: r.teams, meta: { participants: list.names.length, rules: sep.groups.length } }, note };
    }
    case 'ordem': {
      const v = validateParticipants(list.names, { min: 2 });
      if (!v.ok) return { error: v.error, inputs: [names] };
      return { result: { kind: 'order', items: drawOrder(list.names), meta: { participants: list.names.length } } };
    }
    default: { // chaves
      const v = validateParticipants(list.names, { min: 2 });
      if (!v.ok) return { error: v.error, inputs: [names] };
      if (checked('bmode') === 'pairs') {
        const p = makePairs(list.names);
        return { result: { kind: 'pairs', pairs: p.pairs, bye: p.bye, meta: { participants: list.names.length } } };
      }
      if (list.names.length > LIMITS.maxBracket) return { error: `A chave aceita até ${LIMITS.maxBracket} participantes. Você tem ${list.names.length}.`, inputs: [names] };
      const b = makeBracket(list.names);
      return { result: { kind: 'bracket', rounds: b.rounds, meta: { participants: list.names.length, size: b.size, byes: b.byes } } };
    }
  }
}

// ---------- renderização (sempre com textContent: nada do usuário vira HTML) ----------
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

function renderList(items, extraClass = '') {
  const ol = el('ol', `winners ${extraClass}`.trim());
  ol.id = 'rf-list'; ol.setAttribute('role', 'list');
  items.forEach((t) => ol.append(el('li', '', String(t))));
  return ol;
}

function render(r) {
  let node;
  switch (r.kind) {
    case 'names': node = renderList(r.winners); break;
    case 'order': node = renderList(r.items); break;
    case 'numbers': node = renderList(r.values, 'numbers'); break;
    case 'teams': {
      node = el('div', 'teams');
      r.teams.forEach((t, i) => {
        const s = el('section', 'team');
        const h = el('h3', '', `${r.label} ${i + 1}`); h.append(el('span', 'count', `${t.length} ${plural(t.length, 'pessoa', 'pessoas')}`));
        const ul = el('ul'); t.forEach((n) => ul.append(el('li', '', n)));
        s.append(h, ul); node.append(s);
      });
      break;
    }
    case 'pairs': {
      const ol = el('ol', 'pairs'); ol.id = 'rf-list'; ol.setAttribute('role', 'list');
      r.pairs.forEach(([a, b], i) => {
        const li = el('li', 'game');
        li.append(el('span', 'gno', `Jogo ${i + 1}`), el('span', 'slot', a), el('span', 'vs', 'x'), el('span', 'slot', b));
        ol.append(li);
      });
      if (r.bye) { const li = el('li', 'game bye'); li.append(el('span', 'gno', 'De folga'), el('span', 'slot', r.bye)); ol.append(li); }
      node = ol;
      break;
    }
    default: { // bracket
      node = el('div', 'bracket');
      node.tabIndex = 0; node.setAttribute('role', 'region'); node.setAttribute('aria-label', 'Chave eliminatória, role para o lado para ver todas as rodadas');
      r.rounds.forEach((rd) => {
        const s = el('section', 'round'); s.append(el('h3', '', rd.name));
        const ol = el('ol', 'games'); ol.setAttribute('role', 'list');
        rd.matches.forEach((m) => {
          const li = el('li', 'game');
          li.append(el('span', 'gno', `Jogo ${m.no}`));
          li.append(el('span', `slot${/^Vencedor do jogo/.test(m.a) ? ' pending' : ''}`, m.a));
          if (m.bye) li.append(el('span', 'vs', 'avança direto'));
          else li.append(el('span', 'vs', 'x'), el('span', `slot${/^Vencedor do jogo/.test(m.b) ? ' pending' : ''}`, m.b));
          ol.append(li);
        });
        s.append(ol); node.append(s);
      });
    }
  }
  output.replaceChildren(node);
  root.classList.toggle('tool-wide', r.kind === 'bracket'); // a chave precisa de largura total
}

function describe(r) {
  const m = r.meta || {};
  switch (r.kind) {
    case 'names': return { meta: `${r.winners.length} de ${m.participants} ${plural(m.participants, 'participante', 'participantes')}${m.repeat ? ', com repetição' : ''}`, status: `Sorteio realizado, ${r.winners.length} ${plural(r.winners.length, 'vencedor', 'vencedores')}${r.winners.length <= 10 ? `: ${r.winners.join(', ')}` : ''}.` };
    case 'numbers': return { meta: `${r.values.length} ${plural(r.values.length, 'número', 'números')} entre ${m.min} e ${m.max}${m.repeat ? ', com repetição' : ', sem repetição'}`, status: `Sorteio realizado${r.values.length <= 10 ? `: ${r.values.join(', ')}` : `, ${r.values.length} números`}.` };
    case 'teams': return { meta: `${m.participants} participantes em ${r.teams.length} ${r.label === 'Grupo' ? plural(r.teams.length, 'grupo', 'grupos') : plural(r.teams.length, 'equipe', 'equipes')}${m.rules ? `, ${m.rules} ${plural(m.rules, 'regra', 'regras')} de separação` : ''}`, status: `${r.teams.length} ${r.label === 'Grupo' ? plural(r.teams.length, 'grupo formado', 'grupos formados') : plural(r.teams.length, 'equipe formada', 'equipes formadas')}.` };
    case 'order': return { meta: `${m.participants} participantes`, status: `Ordem sorteada para ${m.participants} participantes.` };
    case 'pairs': return { meta: `${r.pairs.length} ${plural(r.pairs.length, 'confronto', 'confrontos')}${r.bye ? ', 1 pessoa de folga' : ''}`, status: `${r.pairs.length} ${plural(r.pairs.length, 'confronto sorteado', 'confrontos sorteados')}.` };
    default: return { meta: `${m.participants} participantes, chave de ${m.size} vagas${m.byes ? `, ${m.byes} ${plural(m.byes, 'folga', 'folgas')}` : ''}`, status: `Chave montada com ${m.participants} participantes e ${r.rounds.length} ${plural(r.rounds.length, 'rodada', 'rodadas')}.` };
  }
}

function draw() {
  updateCounter();
  setStatus(statusEl, '');
  let out;
  try { out = run(); } catch (e) { out = { error: e instanceof RangeError ? e.message : 'Não foi possível concluir o sorteio. Confira os dados e tente de novo.', inputs: [] }; }
  const all = [...form.querySelectorAll('input[type="text"], input[type="number"], textarea')];
  if (out.error) { setError(errorEl, out.error, out.inputs?.length ? out.inputs : []); return; }
  setError(errorEl, '', all);
  last = { ...out.result, when: new Date() };
  render(last);
  const d = describe(last);
  meta.textContent = `${d.meta}. Realizado em ${formatDateTime(last.when)}.`;
  $('rf-print-head').textContent = `${resultTitle(last)}. ${d.meta}. Realizado em ${formatDateTime(last.when)}.`;
  placeholder.hidden = true; resultBox.hidden = false;
  setStatus(statusEl, out.note ? `${d.status} ${out.note}` : d.status, out.note ? 'warn' : 'ok');
}

// ---------- eventos ----------
form.addEventListener('submit', (e) => { e.preventDefault(); draw(); });
$('rf-again').addEventListener('click', draw);

form.addEventListener('change', (e) => {
  if (e.target.name === 'mode') { showMode(e.target.value); return; }
  if (e.target.name === 'tmode' || e.target.name === 'tlabel') updateTeamLabel();
});
// O navegador pode disparar um evento por linha ao colar listas grandes: agrupamos a recontagem.
const refreshCounter = debounce(updateCounter, 150);
form.addEventListener('input', (e) => {
  if (e.target.name === 'mode') return;
  if (e.target === names || e.target.id === 'rf-exclude') refreshCounter();
  setError(errorEl, '', [...form.querySelectorAll('input[type="text"], input[type="number"], textarea')]);
  if (last) setStatus(statusEl, 'Os dados mudaram depois deste sorteio. Clique em Novo sorteio para atualizar o resultado.', 'warn');
});
$('rf-dedupe').addEventListener('change', updateCounter);

$('rf-clear').addEventListener('click', () => {
  names.value = ''; $('rf-exclude').value = ''; $('rf-sep').value = '';
  clearResult();
  setError(errorEl, '', [...form.querySelectorAll('input[type="text"], input[type="number"], textarea')]);
  updateCounter();
  (mode.id === 'numeros' ? $('rf-min') : names).focus();
});

$('rf-copy').addEventListener('click', async () => {
  if (!last) return;
  const ok = await copyText(resultToText(last, { bare: true }));
  if (ok) flashButton($('rf-copy'));
  setStatus(statusEl, ok ? 'Resultado copiado.' : 'Não foi possível copiar. Selecione o texto e copie manualmente.', ok ? 'ok' : 'err');
});
$('rf-print').addEventListener('click', () => { if (last) window.print(); });
$('rf-csv').addEventListener('click', () => {
  if (!last) return;
  downloadBlob(new Blob([`\ufeff${resultToCsv(last)}`], { type: 'text/csv;charset=utf-8' }), 'sorteio-caply.csv');
  setStatus(statusEl, 'CSV baixado (separado por ponto e vírgula, abre direto no Excel).', 'ok');
});

showMode(mode.id, { first: true });
