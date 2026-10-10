// Lógica do Sorteador (sem DOM). Aleatoriedade via Web Crypto, sem viés de módulo.

export function parseNames(text, { dedupe = true } = {}) {
  const lines = String(text ?? '').split(/\r\n|\r|\n/).map((l) => l.trim().replace(/\s+/g, ' ')).filter(Boolean);
  if (!dedupe) return { names: lines, duplicates: 0 };
  const seen = new Set();
  const names = [];
  for (const l of lines) {
    const key = l.toLocaleLowerCase('pt-BR');
    if (!seen.has(key)) { seen.add(key); names.push(l); }
  }
  return { names, duplicates: lines.length - names.length };
}

/** Fonte padrão: uint32 criptograficamente aleatório. */
export function cryptoUint32() {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0];
}

/** Inteiro uniforme em [0, max) por amostragem com rejeição (sem viés). */
export function randomInt(max, source = cryptoUint32) {
  if (!Number.isInteger(max) || max < 1 || max > 2 ** 32) throw new RangeError('max inválido');
  const limit = Math.floor(2 ** 32 / max) * max;
  let v;
  do { v = source(); } while (v >= limit);
  return v % max;
}

export function validateRaffle(participantCount, winnerCount) {
  if (participantCount < 1) return { ok: false, error: 'Adicione pelo menos um participante (um nome por linha).' };
  if (!Number.isInteger(winnerCount) || winnerCount < 1) return { ok: false, error: 'A quantidade de vencedores deve ser um número inteiro maior que zero.' };
  if (winnerCount > participantCount) {
    return { ok: false, error: `Você pediu ${winnerCount} vencedores, mas há apenas ${participantCount} participante${participantCount === 1 ? '' : 's'}.` };
  }
  return { ok: true };
}

/** Sorteia `count` participantes distintos (Fisher–Yates parcial). */
export function drawWinners(names, count, source = cryptoUint32) {
  const check = validateRaffle(names.length, count);
  if (!check.ok) throw new RangeError(check.error);
  const pool = names.slice();
  const winners = [];
  for (let i = 0; i < count; i++) {
    const j = i + randomInt(pool.length - i, source);
    [pool[i], pool[j]] = [pool[j], pool[i]];
    winners.push(pool[i]);
  }
  return winners;
}

export function formatResults(winners) {
  return winners.map((w, i) => `${i + 1}. ${w}`).join('\n');
}
