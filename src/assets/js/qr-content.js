// Montagem e validação do conteúdo dos QR Codes (sem DOM).
export const WIFI_SECURITY = ['WPA', 'WEP', 'nopass'];

/** Escapa caracteres especiais do formato WIFI: (\ ; , : "). */
export function escapeWifi(value) {
  return String(value).replace(/([\\;,:"])/g, '\\$1');
}

export function wifiPayload({ ssid, password = '', security = 'WPA', hidden = false }) {
  const name = String(ssid ?? '');
  if (!name.trim()) return { ok: false, error: 'Informe o nome da rede (SSID).' };
  if (name.length > 32) return { ok: false, error: 'O nome da rede deve ter até 32 caracteres.' };
  if (!WIFI_SECURITY.includes(security)) return { ok: false, error: 'Tipo de segurança inválido.' };
  if (security === 'WPA') {
    if (password.length < 8) return { ok: false, error: 'Senhas WPA/WPA2 precisam ter pelo menos 8 caracteres.' };
    if (password.length > 63) return { ok: false, error: 'Senhas WPA/WPA2 têm no máximo 63 caracteres.' };
  }
  if (security === 'WEP' && !password) return { ok: false, error: 'Informe a senha da rede.' };
  let out = `WIFI:T:${security};S:${escapeWifi(name)};`;
  if (security !== 'nopass') out += `P:${escapeWifi(password)};`;
  if (hidden) out += 'H:true;';
  return { ok: true, value: `${out};` };
}

export function urlPayload(input) {
  let v = String(input ?? '').trim();
  if (!v) return { ok: false, error: 'Informe o endereço do link.' };
  if (/\s/.test(v)) return { ok: false, error: 'O link não pode conter espaços.' };
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = `https://${v}`;
  let url;
  try { url = new URL(v); } catch { return { ok: false, error: 'Esse link não parece válido. Exemplo: https://exemplo.com.br' }; }
  if (!['http:', 'https:'].includes(url.protocol)) return { ok: false, error: 'Use um link que comece com http:// ou https://.' };
  if (!url.hostname.includes('.') && url.hostname !== 'localhost') return { ok: false, error: 'O endereço precisa de um domínio, como exemplo.com.br.' };
  return { ok: true, value: v };
}

export function textPayload(input) {
  const v = String(input ?? '');
  if (!v.trim()) return { ok: false, error: 'Digite o texto que o QR Code deve conter.' };
  return { ok: true, value: v };
}
