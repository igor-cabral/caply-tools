import { LIMITS, sniffAudioFormat, validateAudioFile, validateDuration, formatDuration, estimateOutputBytes, describeSettings, outputFilename, describeError, normalizeSettings } from './audio-lib.js';
import { convertAudio, detectSupport, isAbort, readDuration } from './audio-convert.js';
import { formatBytes } from './image-lib.js';
import { $, setError, setStatus } from './ui.js';

const fileInput = $('au-file'), drop = $('au-drop'), errorEl = $('au-error'), statusEl = $('au-status');
const list = $('au-list'), empty = $('au-empty'), summary = $('au-summary'), actions = $('au-actions');
const btnAll = $('au-convert-all'), btnClear = $('au-clear');

const items = [];
let running = null;
let nextId = 1;

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const checked = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
const readSettings = () => ({ sampleRate: Number($('au-rate').value), bitDepth: Number($('au-bits').value), channels: checked('ch'), format: 'wav' });

// ---------- suporte do navegador ----------
const support = detectSupport();
(function renderSupport() {
  const ul = $('au-support');
  support.probes.forEach((p) => {
    const li = el('li', `sup sup-${p.level}`);
    li.append(el('strong', '', p.label), el('span', 'sup-state', p.text));
    ul.append(li);
  });
  if (!support.webAudio) {
    setError(errorEl, 'Este navegador não oferece a Web Audio API, necessária para converter áudio. Use uma versão recente do Chrome, Edge, Firefox ou Safari.');
    fileInput.disabled = true;
  }
})();
const probeFor = { wav: 'wav', mp3: 'mp3', ogg: 'ogg', flac: 'flac', m4a: 'm4a', aac: 'aac' };
const probeLevel = (id) => support.probes.find((p) => p.id === probeFor[id])?.level;

// ---------- interface de cada item ----------
function metaText(item) {
  const parts = [item.sniff.label, formatBytes(item.file.size), item.durationSec != null ? formatDuration(item.durationSec) : 'duração indisponível'];
  if (item.durationSec != null && item.state !== 'done') {
    try { parts.push(`WAV de até ≈ ${formatBytes(estimateOutputBytes(item.durationSec, readSettings()))}`); } catch { /* configuração inválida */ }
  }
  return parts.join(' · ');
}

function buildItem(item) {
  const li = el('li', 'audio-item');
  const head = el('div', 'ai-head');
  const name = el('p', 'ai-name', item.file.name);
  const meta = el('p', 'ai-meta');
  head.append(name, meta);
  const warn = el('p', 'ai-warn');
  const progress = document.createElement('progress');
  progress.className = 'ai-progress'; progress.max = 100; progress.setAttribute('aria-label', `Progresso de ${item.file.name}`);
  const status = el('p', 'ai-status');
  const audio = document.createElement('audio');
  audio.controls = true; audio.preload = 'metadata'; audio.setAttribute('aria-label', `Prévia do resultado de ${item.file.name}`);
  const row = el('div', 'ai-actions');
  const mk = (txt, cls, label) => { const b = el('button', `btn btn-sm ${cls}`, txt); b.type = 'button'; b.setAttribute('aria-label', `${txt} ${item.file.name}`); b.dataset.label = label; return b; };
  const btnConvert = mk('Converter', '', 'convert');
  const btnCancel = mk('Cancelar', 'btn-secondary', 'cancel');
  const btnRemove = mk('Remover', 'btn-ghost', 'remove');
  const dl = el('a', 'btn btn-sm', 'Baixar WAV');
  dl.setAttribute('aria-label', `Baixar WAV de ${item.file.name}`);
  row.append(btnConvert, btnCancel, dl, btnRemove);
  li.append(head, warn, progress, status, audio, row);
  item.ui = { li, meta, warn, progress, status, audio, btnConvert, btnCancel, btnRemove, dl };
  btnConvert.addEventListener('click', () => enqueue(item));
  btnCancel.addEventListener('click', () => cancel(item));
  btnRemove.addEventListener('click', () => removeItem(item));
  list.append(li);
  paint(item);
}

const PHASES = {
  ler: 'Lendo o arquivo…',
  decodificar: 'Decodificando… (o navegador não informa o andamento desta etapa)',
  processar: 'Ajustando canais e taxa de amostragem…',
};

function paint(item) {
  const u = item.ui; const s = item.state;
  u.li.dataset.state = s;
  u.meta.textContent = metaText(item);
  u.warn.textContent = item.warning || ''; u.warn.hidden = !item.warning;
  u.progress.hidden = s !== 'working';
  if (s === 'working') {
    if (item.phase === 'codificar' && item.progress != null) u.progress.value = Math.round(item.progress * 100); else u.progress.removeAttribute('value');
  }
  const text = {
    ready: 'Pronto para converter.', queued: 'Na fila…',
    working: item.cancelRequested ? 'Cancelando… o navegador termina a etapa atual e descarta o resultado.' : (item.phase === 'codificar' ? `Gerando o WAV… ${Math.round((item.progress || 0) * 100)}%` : PHASES[item.phase] || 'Convertendo…'),
    done: item.result ? `Concluído: ${describeSettings(item.settings)}, ${formatBytes(item.result.size)}, ${formatDuration(item.result.info.durationSec)}.` : '',
    error: item.error, canceled: 'Cancelado. Nada foi guardado.',
  }[s];
  u.status.textContent = text;
  u.status.classList.toggle('is-error', s === 'error');
  u.btnConvert.hidden = !['ready', 'error', 'canceled', 'done'].includes(s);
  u.btnConvert.firstChild.textContent = s === 'ready' ? 'Converter' : s === 'done' ? 'Converter de novo' : 'Tentar de novo';
  u.btnCancel.hidden = !['working', 'queued'].includes(s);
  u.btnCancel.disabled = Boolean(item.cancelRequested);
  const done = s === 'done' && item.result;
  u.audio.hidden = !done; u.dl.hidden = !done;
  refreshGlobal();
}

function refreshGlobal() {
  empty.hidden = items.length > 0;
  actions.hidden = items.length === 0;
  const count = (st) => items.filter((i) => i.state === st).length;
  const parts = [`${items.length} ${items.length === 1 ? 'arquivo' : 'arquivos'}`];
  if (count('done')) parts.push(`${count('done')} ${count('done') === 1 ? 'convertido' : 'convertidos'}`);
  if (count('working') + count('queued')) parts.push(`${count('working') + count('queued')} em andamento`);
  if (count('error')) parts.push(`${count('error')} com erro`);
  summary.textContent = items.length ? parts.join(', ') : '';
  btnAll.disabled = !items.some((i) => ['ready', 'error', 'canceled'].includes(i.state));
}

function retainedBytes() { return items.reduce((n, i) => n + (i.result ? i.result.size : 0), 0); }

// ---------- adicionar arquivos ----------
async function addFiles(fileList) {
  const files = [...fileList];
  const problems = [];
  let added = 0;
  for (const file of files) {
    if (items.length >= LIMITS.maxQueue) { problems.push(`A fila aceita até ${LIMITS.maxQueue} arquivos. "${file.name}" e os próximos foram ignorados.`); break; }
    const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    const sniff = sniffAudioFormat(head);
    const v = validateAudioFile(file, sniff);
    if (!v.ok) { problems.push(`${file.name}: ${v.error}`); continue; }
    const durationSec = await readDuration(file);
    if (durationSec != null) { const d = validateDuration(durationSec); if (!d.ok) { problems.push(`${file.name}: ${d.error}`); continue; } }
    const item = { id: nextId++, file, sniff, durationSec, state: 'ready', phase: null, progress: null, result: null, error: '', warning: '', removed: false, controller: null, cancelRequested: false, settings: null };
    if (durationSec == null && probeLevel(sniff.id) === 'no') item.warning = 'Este navegador informa que não abre este formato. A conversão provavelmente vai falhar.';
    else if (durationSec == null) item.warning = 'Não foi possível ler a duração. Se a conversão falhar, o arquivo pode estar corrompido.';
    items.push(item); buildItem(item); added++;
  }
  setError(errorEl, problems.join('\n'));
  if (added) setStatus(statusEl, `${added} ${added === 1 ? 'arquivo adicionado' : 'arquivos adicionados'} à fila.`, 'ok');
  else if (problems.length) setStatus(statusEl, '');
  refreshGlobal();
}

// ---------- conversão ----------
function cleanupResult(item) {
  if (!item.result) return;
  const u = item.ui;
  u.audio.pause(); u.audio.removeAttribute('src'); u.audio.load();
  u.dl.removeAttribute('href'); u.dl.removeAttribute('download');
  URL.revokeObjectURL(item.result.url);
  item.result = null;
}

function enqueue(item) {
  if (['working', 'queued'].includes(item.state)) return;
  item.state = 'queued'; item.cancelRequested = false; paint(item);
  pump();
}

async function pump() {
  if (running) return;
  const next = items.find((i) => i.state === 'queued');
  if (!next) return;
  running = next;
  try { await convert(next); } finally { running = null; }
  pump();
}

async function convert(item) {
  cleanupResult(item);
  item.error = ''; item.state = 'working'; item.phase = 'ler'; item.progress = null; item.cancelRequested = false;
  const controller = new AbortController(); item.controller = controller;
  let settings;
  try { settings = normalizeSettings(readSettings()); } catch (e) { item.state = 'error'; item.error = e.message; item.controller = null; paint(item); return; }
  item.settings = settings; paint(item);
  try {
    const { blob, info } = await convertAudio(item.file, settings, {
      signal: controller.signal,
      onPhase: (p) => { item.phase = p; item.progress = p === 'codificar' ? 0 : null; if (!item.removed) paint(item); },
      onProgress: (p) => { item.progress = p; if (!item.removed) paint(item); },
    });
    if (item.removed) return; // removido durante a conversão: descarta sem criar URL
    const url = URL.createObjectURL(blob);
    item.result = { url, size: blob.size, info };
    item.state = 'done';
    item.ui.audio.src = url;
    item.ui.dl.href = url; item.ui.dl.download = outputFilename(item.file.name);
    setStatus(statusEl, `${item.file.name} convertido para WAV.`, 'ok');
    if (retainedBytes() > LIMITS.maxResultBytes) setStatus(statusEl, `Os resultados guardados somam ${formatBytes(retainedBytes())}. Baixe e remova alguns para liberar memória.`, 'warn');
  } catch (e) {
    if (item.removed) return;
    if (isAbort(e)) { item.state = 'canceled'; setStatus(statusEl, `${item.file.name}: conversão cancelada.`); } else {
      item.state = 'error'; item.error = describeError(e, item.sniff); setStatus(statusEl, `${item.file.name}: não foi possível converter.`, 'err');
    }
  } finally {
    item.controller = null; item.cancelRequested = false;
    if (!item.removed) paint(item);
  }
}

function cancel(item) {
  if (item.state === 'queued') { item.state = 'ready'; paint(item); return; }
  if (item.state === 'working' && item.controller) { item.cancelRequested = true; item.controller.abort(); paint(item); }
}

function removeItem(item) {
  item.removed = true;
  item.controller?.abort();
  cleanupResult(item);
  item.ui.li.remove();
  const i = items.indexOf(item); if (i >= 0) items.splice(i, 1);
  refreshGlobal();
}

// ---------- eventos ----------
fileInput.addEventListener('change', async () => { const files = [...fileInput.files]; fileInput.value = ''; if (files.length) await addFiles(files); });
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
drop.addEventListener('drop', (e) => { if (e.dataTransfer?.files?.length && !fileInput.disabled) addFiles(e.dataTransfer.files); });
btnAll.addEventListener('click', () => items.filter((i) => ['ready', 'error', 'canceled'].includes(i.state)).forEach(enqueue));
btnClear.addEventListener('click', () => { [...items].forEach(removeItem); setError(errorEl, ''); setStatus(statusEl, 'Fila e resultados removidos.'); });
document.querySelectorAll('#au-bits, #au-rate, input[name="ch"]').forEach((c) => c.addEventListener('change', () => items.forEach((i) => { if (i.state !== 'working') i.ui.meta.textContent = metaText(i); })));
window.addEventListener('pagehide', () => items.forEach(cleanupResult));

refreshGlobal();
