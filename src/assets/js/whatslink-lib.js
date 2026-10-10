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
  const explicit = /^(\+|00)/.test(raw); // o usuário informou o código do país de propósito
  if (!explicit) {
    if (looksLikeBrazilianLocal(digits)) {
      out.hint = 'Parece um número do Brasil sem o código do país. O WhatsApp precisa do 55 no início.';
      out.suggestion = `55${digits}`;
    } else if (digits.length <= 10 && !digits.startsWith('1')) {
      out.hint = 'Confira se o código do país está incluído (Brasil: 55).';
    }
  }
  return out;
}

const BR_DDD = new Set([11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99]);

/** DDD brasileiro válido + 8 dígitos (fixo) ou 9 dígitos começando em 9 (celular). */
export function looksLikeBrazilianLocal(digits) {
  if (digits.length !== 10 && digits.length !== 11) return false;
  if (!BR_DDD.has(Number(digits.slice(0, 2)))) return false;
  return digits.length === 11 ? digits[2] === '9' : /[2-5]/.test(digits[2]);
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
  return { ok: true, url: buildWhatsAppLink(phone.digits, message), digits: phone.digits, hint: phone.hint, suggestion: phone.suggestion };
}
