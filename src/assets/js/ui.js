// Utilidades de interface compartilhadas.

export function setStatus(el, message, kind = '') {
  el.textContent = message;
  el.className = `status${kind ? ` ${kind}` : ''}`;
}

export function setError(el, message, inputs = []) {
  el.textContent = message || '';
  inputs.forEach((i) => {
    const ids = new Set((i.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    if (message) { i.setAttribute('aria-invalid', 'true'); ids.add(el.id); } else { i.removeAttribute('aria-invalid'); ids.delete(el.id); }
    if (ids.size) i.setAttribute('aria-describedby', [...ids].join(' ')); else i.removeAttribute('aria-describedby');
  });
}

/** Feedback temporário em um botão (ex.: "Copiado!"), conforme o design system (1,8 s). */
export function flashButton(btn, text = 'Copiado!', ms = 1800) {
  if (!btn.dataset.label) btn.dataset.label = btn.textContent;
  btn.textContent = text;
  btn.classList.add('is-done');
  clearTimeout(btn._flash);
  btn._flash = setTimeout(() => { btn.textContent = btn.dataset.label; btn.classList.remove('is-done'); }, ms);
}

export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* cai no plano B */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.className = 'sr-only';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function debounce(fn, ms = 120) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export const $ = (id) => document.getElementById(id);
