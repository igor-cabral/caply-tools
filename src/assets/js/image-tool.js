import { OUTPUT_FORMATS, sniffImageType, validateImageFile, validateDimensions, outputFilename, formatBytes } from './image-lib.js';
import { $, setError, setStatus } from './ui.js';

const fileInput = $('im-file'), drop = $('im-drop');
const errorEl = $('im-error'), statusEl = $('im-status');
const sourceBox = $('im-source'), srcImg = $('im-src-img'), srcInfo = $('im-src-info');
const quality = $('im-quality'), qualityField = $('im-quality-field'), qualityOut = $('im-quality-out'), note = $('im-note');
const resultBox = $('im-result'), placeholder = $('im-placeholder'), outImg = $('im-out-img'), outInfo = $('im-out-info'), download = $('im-download');
const btnConvert = $('im-convert');

let state = { file: null, srcUrl: null, outUrl: null, img: null, type: null };

const fmt = () => document.querySelector('input[name="fmt"]:checked').value;

function revoke(key) {
  if (state[key]) { URL.revokeObjectURL(state[key]); state[key] = null; }
}
function clearResult() {
  revoke('outUrl');
  outImg.removeAttribute('src');
  download.removeAttribute('href');
  resultBox.hidden = true;
  placeholder.hidden = false;
}
function reset() {
  clearResult();
  revoke('srcUrl');
  srcImg.removeAttribute('src');
  state = { file: null, srcUrl: null, outUrl: null, img: null, type: null };
  fileInput.value = '';
  sourceBox.hidden = true;
  setError(errorEl, '');
  setStatus(statusEl, '');
}

function syncOptions() {
  const f = OUTPUT_FORMATS[fmt()];
  qualityField.hidden = !f.lossy;
  const msgs = [];
  if (fmt() === 'jpeg') msgs.push('JPEG não tem transparência: áreas transparentes ficarão com fundo branco.');
  if (state.type === 'image/gif') msgs.push('GIF animado: apenas o primeiro quadro será convertido.');
  note.textContent = msgs.join(' ');
  note.hidden = msgs.length === 0;
}

async function loadImage(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

let loadToken = 0; // invalida carregamentos antigos quando o usuário escolhe outra imagem

async function handleFile(file, totalChosen = 1) {
  const token = ++loadToken;
  const stale = () => token !== loadToken;
  reset();
  if (!file) return;
  let url = null;
  try {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (stale()) return;
    const type = sniffImageType(head);
    const v = validateImageFile(file, type);
    if (!v.ok) { setError(errorEl, v.error); return; }
    url = URL.createObjectURL(file);
    let img;
    try { img = await loadImage(url); } catch {
      URL.revokeObjectURL(url);
      if (!stale()) setError(errorEl, 'Não foi possível abrir essa imagem. O arquivo pode estar corrompido.');
      return;
    }
    if (stale()) { URL.revokeObjectURL(url); return; }
    const dims = validateDimensions(img.naturalWidth, img.naturalHeight);
    if (!dims.ok) { URL.revokeObjectURL(url); setError(errorEl, dims.error); return; }
    state = { file, srcUrl: url, outUrl: null, img, type };
    srcImg.src = url;
    srcInfo.textContent = `${file.name}: ${img.naturalWidth}×${img.naturalHeight} px, ${formatBytes(file.size)}`;
    // Sugere um formato de saída diferente do original.
    const suggestion = type === 'image/webp' ? 'png' : type === 'image/png' ? 'webp' : 'png';
    document.querySelector(`input[name="fmt"][value="${suggestion}"]`).checked = true;
    sourceBox.hidden = false;
    syncOptions();
    setStatus(statusEl, totalChosen > 1
      ? `Usamos apenas a primeira das ${totalChosen} imagens escolhidas. Escolha o formato e clique em Converter.`
      : 'Imagem carregada. Escolha o formato e clique em Converter.', 'ok');
  } catch {
    if (url) URL.revokeObjectURL(url);
    if (!stale()) { reset(); setError(errorEl, 'Ocorreu um erro ao ler o arquivo. Tente novamente com outra imagem.'); }
  }
}

async function convert() {
  if (!state.img) return;
  clearResult();
  setError(errorEl, '');
  const key = fmt();
  const f = OUTPUT_FORMATS[key];
  btnConvert.disabled = true;
  setStatus(statusEl, 'Convertendo…');
  const canvas = document.createElement('canvas');
  try {
    canvas.width = state.img.naturalWidth;
    canvas.height = state.img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    if (key === 'jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(state.img, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, f.mime, f.lossy ? Number(quality.value) / 100 : undefined));
    if (!blob) throw new Error('blob');
    if (blob.type !== f.mime) {
      setStatus(statusEl, '');
      setError(errorEl, `Seu navegador não consegue exportar para ${f.label}. Escolha outro formato.`);
      return;
    }
    state.outUrl = URL.createObjectURL(blob);
    outImg.src = state.outUrl;
    outInfo.textContent = `${f.label}: ${canvas.width}×${canvas.height} px, ${formatBytes(blob.size)} (original: ${formatBytes(state.file.size)})`;
    download.href = state.outUrl;
    download.download = outputFilename(state.file.name, key);
    placeholder.hidden = true;
    resultBox.hidden = false;
    setStatus(statusEl, 'Conversão concluída.', 'ok');
  } catch {
    setStatus(statusEl, '');
    setError(errorEl, 'Não foi possível converter essa imagem. Ela pode ser grande demais para a memória do seu aparelho.');
  } finally {
    canvas.width = 0; canvas.height = 0; // libera memória do canvas
    btnConvert.disabled = false;
  }
}

fileInput.addEventListener('change', () => handleFile(fileInput.files[0], fileInput.files.length));
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
drop.addEventListener('drop', (e) => { const files = e.dataTransfer?.files; if (files?.length) handleFile(files[0], files.length); });
document.querySelectorAll('input[name="fmt"]').forEach((r) => r.addEventListener('change', () => { syncOptions(); clearResult(); }));
quality.addEventListener('input', () => {
  qualityOut.textContent = quality.value;
  if (!resultBox.hidden) { clearResult(); setStatus(statusEl, 'Qualidade alterada. Clique em Converter para gerar a nova imagem.'); }
});
btnConvert.addEventListener('click', convert);
$('im-reset').addEventListener('click', () => { loadToken++; reset(); });
window.addEventListener('pagehide', () => { revoke('srcUrl'); revoke('outUrl'); });
