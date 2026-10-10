import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNames, randomInt, drawWinners, validateRaffle, formatResults, cryptoUint32 } from '../src/assets/js/raffle-lib.js';

// PRNG determinístico (xorshift32) para testes estatísticos reprodutíveis.
function xorshift(seed = 2463534242) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s; };
}
const chi2 = (counts, expected) => counts.reduce((a, c) => a + ((c - expected) ** 2) / expected, 0);

test('parseNames ignora linhas vazias e espaços extras', () => {
  assert.deepEqual(parseNames('  Ana  \n\n Bruno\r\n\r\n  Carla   Dias \n').names, ['Ana', 'Bruno', 'Carla Dias']);
});
test('parseNames remove repetidos sem diferenciar caixa (opcional)', () => {
  const r = parseNames('Ana\nana\nANA\nBia');
  assert.deepEqual(r.names, ['Ana', 'Bia']);
  assert.equal(r.duplicates, 2);
  assert.equal(parseNames('Ana\nana', { dedupe: false }).names.length, 2);
});
test('randomInt rejeita valores que causariam viés', () => {
  const seq = [4294967295, 4294967295, 7]; // >= limite para max=3
  let i = 0;
  assert.equal(randomInt(3, () => seq[i++]), 1);
  assert.equal(i, 3);
});
test('randomInt valida argumentos', () => {
  assert.throws(() => randomInt(0));
  assert.throws(() => randomInt(1.5));
  assert.equal(randomInt(1), 0);
});
test('randomInt é uniforme (qui-quadrado, 6 faces)', () => {
  const src = xorshift(); const counts = new Array(6).fill(0); const N = 60000;
  for (let i = 0; i < N; i++) counts[randomInt(6, src)]++;
  assert.ok(chi2(counts, N / 6) < 20.5, `chi2=${chi2(counts, N / 6)}`); // df=5, p=0,001
});
test('drawWinners devolve vencedores únicos da lista', () => {
  const names = Array.from({ length: 50 }, (_, i) => `P${i}`);
  for (let k = 0; k < 20; k++) {
    const w = drawWinners(names, 10);
    assert.equal(new Set(w).size, 10);
    w.forEach((x) => assert.ok(names.includes(x)));
  }
});
test('sortear todos devolve uma permutação', () => {
  const names = ['a', 'b', 'c', 'd'];
  assert.deepEqual(drawWinners(names, 4).sort(), names);
});
test('não altera a lista original', () => {
  const names = ['a', 'b', 'c']; drawWinners(names, 2);
  assert.deepEqual(names, ['a', 'b', 'c']);
});
test('todas as 6 ordens de 3 elementos são equiprováveis', () => {
  const src = xorshift(99); const map = new Map(); const N = 60000;
  for (let i = 0; i < N; i++) { const k = drawWinners(['a', 'b', 'c'], 3, src).join(''); map.set(k, (map.get(k) || 0) + 1); }
  assert.equal(map.size, 6);
  assert.ok(chi2([...map.values()], N / 6) < 20.5);
});
test('validações', () => {
  assert.equal(validateRaffle(0, 1).ok, false);
  assert.equal(validateRaffle(3, 0).ok, false);
  assert.equal(validateRaffle(3, 1.5).ok, false);
  assert.match(validateRaffle(2, 3).error, /apenas 2 participantes/);
  assert.equal(validateRaffle(3, 3).ok, true);
  assert.throws(() => drawWinners(['a'], 2), RangeError);
});
test('formatResults numera as linhas', () => {
  assert.equal(formatResults(['Ana', 'Bia']), '1. Ana\n2. Bia');
});
test('cryptoUint32 retorna inteiro de 32 bits', () => {
  const v = cryptoUint32(); assert.ok(Number.isInteger(v) && v >= 0 && v <= 0xffffffff);
});
