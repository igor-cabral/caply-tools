// Lógica do WhatsLink (sem DOM).
export const MAX_MESSAGE = 1500;

/**
 * Normaliza um telefone internacional. Aceita "+55 (48) 99999-9999", "0055...", etc.
 * @returns {{ok:true, digits:string, hint?:string}|{ok:false, error:string}}
 */
export function normalizePhone(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: false, error: 'Informe o número com o código do país.' };
  if (/[^\d\s()+\-.]/.test(raw)) return { ok: false, error: 'Use apenas números, espaços, parênteses, hífens e o sinal +.' };
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!digits) return { ok: false, error: 'Informe o número com o código do país.' };
  if (digits.startsWith('0')) return { ok: false, error: 'Comece pelo código do país (no Brasil, 55), sem o zero inicial.' };
  if (digits.length < 8) return { ok: false, error: 'Número curto demais. Inclua código do país, DDD e telefone.' };
  if (digits.length > 15) return { ok: false, error: 'Número longo demais. O padrão internacional permite até 15 dígitos.' };
  const out = { ok: true, digits };
  if (digits.length <= 11 && !digits.startsWith('55') && !digits.startsWith('1')) {
    out.hint = 'Confira se o código do país está incluído. Para o Brasil, o número começa com 55.';
  }
  return out;
}

export function buildWhatsAppLink(digits, message = '') {
  const msg = String(message ?? '').trim();
  const base = `https://wa.me/${digits}`;
  return msg ? `${base}?text=${encodeURIComponent(msg)}` : base;
}

export function whatsLink(phoneInput, message = '') {
  const phone = normalizePhone(phoneInput);
  if (!phone.ok) return phone;
  if (String(message).length > MAX_MESSAGE) {
    return { ok: false, error: `A mensagem passa de ${MAX_MESSAGE} caracteres. Reduza o texto.` };
  }
  return { ok: true, url: buildWhatsAppLink(phone.digits, message), digits: phone.digits, hint: phone.hint };
}
