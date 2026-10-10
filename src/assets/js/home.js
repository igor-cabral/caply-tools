import { encodeQR, drawQR } from './qr.js';
import { debounce, $ } from './ui.js';

const input = $('demo-input');
const canvas = $('demo-canvas');
const open = $('demo-open');

function render() {
  const value = input.value;
  if (!value.trim()) { canvas.hidden = true; open.href = '/qr-code/'; return; }
  try {
    drawQR(canvas, encodeQR(value, { ecc: 'M' }), 520);
    canvas.hidden = false;
    open.href = `/qr-code/?t=text&v=${encodeURIComponent(value)}`;
  } catch {
    canvas.hidden = true;
  }
}
input.addEventListener('input', debounce(render, 100));
render();
