import { encodeQR, drawQR } from './qr.js';
import { debounce, downloadBlob, flashButton, setStatus, $ } from './ui.js';

const input = $('demo-input');
const canvas = $('demo-canvas');
const open = $('demo-open');
const download = $('demo-download');
const status = $('demo-status');

function render() {
  const value = input.value;
  setStatus(status, '');
  if (!value.trim()) {
    canvas.hidden = true; download.disabled = true; open.href = '/qr-code/';
    return;
  }
  try {
    drawQR(canvas, encodeQR(value, { ecc: 'M' }), 520);
    canvas.hidden = false; download.disabled = false;
    open.href = `/qr-code/?t=text&v=${encodeURIComponent(value)}`;
  } catch {
    canvas.hidden = true; download.disabled = true;
    setStatus(status, 'Esse texto é longo demais para o atalho. Use o gerador completo.', 'warn');
  }
}

download.addEventListener('click', () => {
  const value = input.value;
  if (!value.trim()) return;
  try {
    const off = document.createElement('canvas');
    drawQR(off, encodeQR(value, { ecc: 'M' }), 1024, 4, true);
    off.toBlob((blob) => {
      if (!blob) { setStatus(status, 'Não foi possível gerar o arquivo. Tente o gerador completo.', 'err'); return; }
      downloadBlob(blob, 'qrcode-caply.png');
      flashButton(download, 'Baixado!');
    }, 'image/png');
  } catch {
    setStatus(status, 'Não foi possível gerar o arquivo. Tente o gerador completo.', 'err');
  }
});

input.addEventListener('input', debounce(render, 100));
render();
