import { whatsLink } from './whatslink-lib.js';
import { $, copyText, setError, setStatus } from './ui.js';

const phone = $('wl-phone'), msg = $('wl-msg'), out = $('wl-out');
const errorEl = $('wl-error'), warn = $('wl-warn'), statusEl = $('wl-status');
const btnCopy = $('wl-copy'), open = $('wl-open'), qr = $('wl-qr');
let touched = false;

function setLinks(url) {
  out.value = url || '';
  btnCopy.disabled = !url;
  [open, qr].forEach((a) => {
    if (url) { a.removeAttribute('aria-disabled'); } else { a.setAttribute('aria-disabled', 'true'); a.setAttribute('href', '#'); a.tabIndex = -1; }
  });
  if (url) {
    open.href = url; open.tabIndex = 0;
    qr.href = `/qr-code/?t=url&v=${encodeURIComponent(url)}`; qr.tabIndex = 0;
  }
}

function render() {
  setStatus(statusEl, '');
  $('wl-count').textContent = String(msg.value.length);
  warn.textContent = '';
  if (!phone.value.trim()) { setError(errorEl, '', [phone]); setLinks(''); return; }
  const r = whatsLink(phone.value, msg.value);
  if (!r.ok) {
    setLinks('');
    setError(errorEl, touched ? r.error : '', [phone]);
    return;
  }
  setError(errorEl, '', [phone]);
  warn.textContent = r.hint || '';
  setLinks(r.url);
}

$('wl-form').addEventListener('submit', (e) => { e.preventDefault(); touched = true; render(); });
[phone, msg].forEach((el) => el.addEventListener('input', () => { touched = true; render(); }));
[open, qr].forEach((a) => a.addEventListener('click', (e) => { if (a.getAttribute('aria-disabled') === 'true') e.preventDefault(); }));
btnCopy.addEventListener('click', async () => {
  const ok = await copyText(out.value);
  setStatus(statusEl, ok ? 'Link copiado.' : 'Não foi possível copiar. Selecione o link e copie manualmente.', ok ? 'ok' : 'err');
});
setLinks('');
render();
