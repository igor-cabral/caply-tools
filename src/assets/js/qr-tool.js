import { encodeQR, drawQR, qrToSvg, maxBytes } from './qr.js';
import { urlPayload, textPayload, wifiPayload } from './qr-content.js';
import { $, copyText, debounce, downloadBlob, setError, setStatus } from './ui.js';

const form = $('qr-form');
const canvas = $('qr-canvas');
const placeholder = $('qr-placeholder');
const errorEl = $('qr-error');
const statusEl = $('qr-status');
const meta = $('qr-meta');
const btnPng = $('qr-png'), btnSvg = $('qr-svg'), btnCopy = $('qr-copy');
const panels = [...form.querySelectorAll('[data-panel]')];

let current = null; // { qr, payload }
const touched = new Set();

const kind = () => form.querySelector('input[name="kind"]:checked').value;

function showPanel() {
  panels.forEach((p) => { p.hidden = p.dataset.panel !== kind(); });
  syncPass();
}
function syncPass() {
  $('qr-pass-field').hidden = $('qr-security').value === 'nopass';
}

function getPayload() {
  switch (kind()) {
    case 'url': return { ...urlPayload($('qr-url').value), fields: [$('qr-url')], empty: !$('qr-url').value.trim() };
    case 'text': return { ...textPayload($('qr-text').value), fields: [$('qr-text')], empty: !$('qr-text').value.trim() };
    default: return {
      ...wifiPayload({ ssid: $('qr-ssid').value, password: $('qr-pass').value, security: $('qr-security').value, hidden: $('qr-hidden').checked }),
      fields: [$('qr-ssid'), $('qr-pass')], empty: !$('qr-ssid').value.trim() && !$('qr-pass').value,
    };
  }
}

function clearResult() {
  current = null;
  canvas.hidden = true;
  placeholder.hidden = false;
  meta.textContent = '';
  [btnPng, btnSvg, btnCopy].forEach((b) => { b.disabled = true; });
}

function render() {
  setStatus(statusEl, '');
  const p = getPayload();
  if (!p.ok) {
    clearResult();
    const show = touched.has(kind()) && !p.empty;
    setError(errorEl, show ? p.error : '', p.fields);
    return;
  }
  setError(errorEl, '', p.fields);
  try {
    const qr = encodeQR(p.value, { ecc: $('qr-ecc').value });
    drawQR(canvas, qr, 600);
    canvas.hidden = false;
    placeholder.hidden = true;
    current = { qr, payload: p.value };
    meta.textContent = `Versão ${qr.version} do QR Code, ${qr.size}×${qr.size} módulos, correção ${qr.ecc}.`;
    [btnPng, btnSvg, btnCopy].forEach((b) => { b.disabled = false; });
  } catch (e) {
    clearResult();
    const limit = maxBytes($('qr-ecc').value);
    setError(errorEl, e instanceof RangeError && /grande/.test(e.message)
      ? `O conteúdo é grande demais para um QR Code neste nível de correção (limite de cerca de ${limit} bytes). Reduza o texto ou escolha correção menor.`
      : 'Não foi possível gerar o QR Code com esse conteúdo.', p.fields);
  }
}

const renderSoon = debounce(render, 120);

form.addEventListener('submit', (e) => { e.preventDefault(); touched.add(kind()); render(); });
form.addEventListener('input', (e) => { if (e.target.name !== 'kind') touched.add(kind()); renderSoon(); });
form.addEventListener('change', (e) => {
  if (e.target.name === 'kind') { showPanel(); setError(errorEl, ''); render(); }
  if (e.target.id === 'qr-security') syncPass();
  render();
});
$('qr-showpass').addEventListener('change', (e) => { $('qr-pass').type = e.target.checked ? 'text' : 'password'; });

function pngBlob() {
  const size = Number($('qr-size').value);
  const off = document.createElement('canvas');
  drawQR(off, current.qr, size, 4, true);
  return new Promise((resolve) => off.toBlob((b) => { off.width = 0; off.height = 0; resolve(b); }, 'image/png'));
}

btnPng.addEventListener('click', async () => {
  if (!current) return;
  const blob = await pngBlob();
  if (!blob) { setStatus(statusEl, 'Seu navegador não conseguiu gerar o PNG. Tente baixar em SVG.', 'err'); return; }
  downloadBlob(blob, 'qrcode-caply.png');
  setStatus(statusEl, 'PNG baixado.', 'ok');
});
btnSvg.addEventListener('click', () => {
  if (!current) return;
  downloadBlob(new Blob([qrToSvg(current.qr)], { type: 'image/svg+xml' }), 'qrcode-caply.svg');
  setStatus(statusEl, 'SVG baixado.', 'ok');
});
btnCopy.addEventListener('click', async () => {
  if (!current) return;
  const ok = await copyText(current.payload);
  setStatus(statusEl, ok ? 'Conteúdo copiado.' : 'Não foi possível copiar. Selecione o texto e copie manualmente.', ok ? 'ok' : 'err');
});

// Pré-preenchimento via ?t=url|text&v=...
const params = new URLSearchParams(location.search);
const t = params.get('t'), v = params.get('v');
if (v && (t === 'url' || t === 'text')) {
  form.querySelector(`input[name="kind"][value="${t}"]`).checked = true;
  $(t === 'url' ? 'qr-url' : 'qr-text').value = v;
  touched.add(t);
}
showPanel();
render();
