// Confrontos e chaves eliminatórias simples (sem DOM).
import { cryptoUint32, shuffle, LIMITS } from './raffle-lib.js';

/** Confrontos em duplas. Com número ímpar, uma pessoa fica de folga. */
export function makePairs(names, source = cryptoUint32) {
  if (names.length < 2) throw new RangeError('Adicione pelo menos 2 participantes para sortear confrontos.');
  const order = shuffle(names, source);
  const bye = order.length % 2 === 1 ? order.pop() : null;
  const pairs = [];
  for (let i = 0; i < order.length; i += 2) pairs.push([order[i], order[i + 1]]);
  return { pairs, bye };
}

const nextPow2 = (n) => 2 ** Math.ceil(Math.log2(n));

function roundName(matches) {
  return { 1: 'Final', 2: 'Semifinais', 4: 'Quartas de final', 8: 'Oitavas de final' }[matches] || null;
}

/**
 * Chave eliminatória simples. Se o número de participantes não for potência de 2,
 * algumas pessoas avançam direto (folga) na 1ª rodada; as folgas são sorteadas
 * e distribuídas pela chave, e nunca há um confronto "folga contra folga".
 * @returns {{size:number, byes:number, rounds:{name:string, matches:{no:number,a:string,b:string|null,bye:boolean}[]}[]}}
 */
export function makeBracket(names, source = cryptoUint32) {
  const n = names.length;
  if (n < 2) throw new RangeError('Adicione pelo menos 2 participantes para montar uma chave.');
  if (n > LIMITS.maxBracket) throw new RangeError(`A chave aceita até ${LIMITS.maxBracket} participantes.`);
  const size = nextPow2(n);
  const matchCount = size / 2;
  const byes = size - n;

  const order = shuffle(names, source);
  const byeSlots = new Set(shuffle(Array.from({ length: matchCount }, (_, i) => i), source).slice(0, byes));
  let next = 0;
  let gameNo = 1;
  const first = [];
  for (let m = 0; m < matchCount; m++) {
    if (byeSlots.has(m)) first.push({ no: gameNo++, a: order[next++], b: null, bye: true });
    else { first.push({ no: gameNo++, a: order[next++], b: order[next++], bye: false }); }
  }

  const rounds = [{ matches: first }];
  let prev = first;
  while (prev.length > 1) {
    const cur = [];
    for (let i = 0; i < prev.length; i += 2) {
      const label = (m) => (m.bye ? m.a : `Vencedor do jogo ${m.no}`);
      cur.push({ no: gameNo++, a: label(prev[i]), b: label(prev[i + 1]), bye: false });
    }
    rounds.push({ matches: cur });
    prev = cur;
  }
  rounds.forEach((r, i) => { r.name = roundName(r.matches.length) || `Rodada ${i + 1}`; });
  return { size, byes, rounds };
}
