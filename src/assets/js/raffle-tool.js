import { parseNames, drawWinners, validateRaffle, formatResults } from './raffle-lib.js';
import { $, copyText, flashButton, setError, setStatus } from './ui.js';

const form = $('rf-form'), names = $('rf-names'), count = $('rf-winners'), dedupe = $('rf-dedupe');
const errorEl = $('rf-error'), statusEl = $('rf-status'), counter = $('rf-count');
const resultBox = $('rf-result'), placeholder = $('rf-placeholder'), list = $('rf-list'), meta = $('rf-meta');
let lastWinners = [];

const read = () => parseNames(names.value, { dedupe: dedupe.checked });

function updateCounter() {
  const { names: n, duplicates } = read();
  const dup = duplicates ? `, ${duplicates} repetido${duplicates === 1 ? '' : 's'} ignorado${duplicates === 1 ? '' : 's'}` : '';
  counter.textContent = `${n.length} participante${n.length === 1 ? '' : 's'}${dup}`;
}

function draw() {
  setStatus(statusEl, '');
  const { names: n } = read();
  const wanted = Number(count.value);
  const check = validateRaffle(n.length, wanted);
  if (!check.ok) {
    setError(errorEl, check.error, [count.value && n.length ? count : names]);
    return;
  }
  setError(errorEl, '', [names, count]);
  lastWinners = drawWinners(n, wanted);
  list.replaceChildren(...lastWinners.map((w) => { const li = document.createElement('li'); li.textContent = w; return li; }));
  const when = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
  meta.textContent = `${lastWinners.length} de ${n.length} participantes, sorteio feito em ${when}.`;
  placeholder.hidden = true;
  resultBox.hidden = false;
  const spoken = lastWinners.length <= 10 ? `: ${lastWinners.join(', ')}` : '';
  setStatus(statusEl, `Sorteio realizado, ${lastWinners.length} vencedor${lastWinners.length === 1 ? '' : 'es'}${spoken}.`, 'ok');
}

form.addEventListener('submit', (e) => { e.preventDefault(); draw(); });
$('rf-again').addEventListener('click', draw);
names.addEventListener('input', () => {
  updateCounter(); setError(errorEl, '', [names, count]);
  if (!resultBox.hidden) setStatus(statusEl, 'A lista mudou depois deste sorteio. Clique em Novo sorteio para atualizar o resultado.', 'warn');
});
dedupe.addEventListener('change', updateCounter);
count.addEventListener('input', () => setError(errorEl, '', [names, count]));
$('rf-clear').addEventListener('click', () => {
  names.value = '';
  lastWinners = [];
  resultBox.hidden = true; placeholder.hidden = false;
  list.replaceChildren();
  setError(errorEl, '', [names, count]);
  setStatus(statusEl, '');
  updateCounter();
  names.focus();
});
$('rf-copy').addEventListener('click', async () => {
  const ok = await copyText(formatResults(lastWinners));
  if (ok) flashButton($('rf-copy'));
  setStatus(statusEl, ok ? 'Resultados copiados.' : 'Não foi possível copiar. Selecione o texto e copie manualmente.', ok ? 'ok' : 'err');
});
updateCounter();
