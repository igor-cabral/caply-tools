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

// ---------------------------------------------------------------------------
// Extensões (modalidades do Sorteador). Todas aceitam `source` para testes.
// ---------------------------------------------------------------------------

export const LIMITS = Object.freeze({ maxParticipants: 10000, maxNameLength: 120, maxCount: 10000, maxRange: 2 ** 32, maxBracket: 256 });

/** Embaralha (Fisher–Yates) e devolve uma cópia. */
export function shuffle(items, source = cryptoUint32) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, source);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Valida o tamanho da lista e o comprimento dos nomes. */
export function validateParticipants(names, { min = 1 } = {}) {
  if (names.length < min) {
    return { ok: false, error: min <= 1 ? 'Adicione pelo menos um participante (um nome por linha).' : `Esta modalidade precisa de pelo menos ${min} participantes.` };
  }
  if (names.length > LIMITS.maxParticipants) return { ok: false, error: `A lista tem ${names.length} nomes. O limite é ${LIMITS.maxParticipants}.` };
  const long = names.find((n) => n.length > LIMITS.maxNameLength);
  if (long) return { ok: false, error: `Há um nome com mais de ${LIMITS.maxNameLength} caracteres ("${long.slice(0, 24)}…"). Confira se cada nome está em uma linha.` };
  return { ok: true };
}

/** Remove da lista os nomes excluídos (sem diferenciar maiúsculas). */
export function applyExclusions(names, excludedText) {
  const { names: ex } = parseNames(excludedText, { dedupe: true });
  const set = new Set(ex.map((n) => n.toLocaleLowerCase('pt-BR')));
  const kept = names.filter((n) => !set.has(n.toLocaleLowerCase('pt-BR')));
  return { names: kept, removed: names.length - kept.length };
}

/** Sorteio de nomes, com ou sem repetição (reposição). */
export function drawNames(names, count, { repeat = false, source = cryptoUint32 } = {}) {
  if (!Number.isInteger(count) || count < 1) throw new RangeError('A quantidade de vencedores deve ser um número inteiro maior que zero.');
  if (count > LIMITS.maxCount) throw new RangeError(`O máximo é ${LIMITS.maxCount} resultados por sorteio.`);
  if (!repeat) return drawWinners(names, count, source);
  if (names.length < 1) throw new RangeError('Adicione pelo menos um participante (um nome por linha).');
  return Array.from({ length: count }, () => names[randomInt(names.length, source)]);
}

export function validateNumberDraw({ min, max, count, repeat }) {
  if (![min, max, count].every(Number.isFinite)) return { ok: false, error: 'Preencha o menor número, o maior número e a quantidade.' };
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) return { ok: false, error: 'Use apenas números inteiros no intervalo.' };
  if (min > max) return { ok: false, error: 'O menor número não pode ser maior que o maior.' };
  const size = max - min + 1;
  if (size > LIMITS.maxRange) return { ok: false, error: 'O intervalo é grande demais. Use no máximo 4.294.967.296 números possíveis.' };
  if (!Number.isInteger(count) || count < 1) return { ok: false, error: 'A quantidade deve ser um número inteiro maior que zero.' };
  if (count > LIMITS.maxCount) return { ok: false, error: `O máximo é ${LIMITS.maxCount} números por sorteio.` };
  if (!repeat && count > size) {
    return { ok: false, error: `Você pediu ${count} números diferentes, mas o intervalo tem apenas ${size}. Reduza a quantidade ou permita repetições.` };
  }
  return { ok: true, size };
}

/**
 * Sorteia números inteiros em [min, max].
 * Sem repetição usa o algoritmo de Floyd (amostra uniforme sem listar o intervalo) e embaralha a ordem.
 */
export function drawNumbers({ min, max, count, repeat = false, sort = false }, source = cryptoUint32) {
  const v = validateNumberDraw({ min, max, count, repeat });
  if (!v.ok) throw new RangeError(v.error);
  const n = v.size;
  let values;
  if (repeat) {
    values = Array.from({ length: count }, () => min + randomInt(n, source));
  } else {
    const chosen = new Set();
    for (let j = n - count; j < n; j++) {
      const t = randomInt(j + 1, source);
      chosen.add(chosen.has(t) ? j : t);
    }
    values = shuffle([...chosen].map((x) => min + x), source);
  }
  return sort ? values.sort((a, b) => a - b) : values;
}

/** Ordem aleatória (apresentação, participação). */
export function drawOrder(names, source = cryptoUint32) {
  return shuffle(names, source);
}
