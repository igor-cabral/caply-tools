import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeQR, rsDivisor, rsRemainder, formatBits, versionBits, dataCodewords, maxBytes, qrToSvg } from '../src/assets/js/qr.js';

test('Reed–Solomon: vetor de referência de "HELLO WORLD" (1-M)', () => {
  const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
  assert.deepEqual(rsRemainder(data, rsDivisor(10)), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
});

test('bits de formato conhecidos (máscara 0)', () => {
  assert.equal(formatBits('M', 0), 0b101010000010010);
  assert.equal(formatBits('L', 0), 0b111011111000100);
  assert.equal(formatBits('Q', 0), 0b011010101011111);
  assert.equal(formatBits('H', 0), 0b001011010001001);
});

test('bits de versão conhecidos', () => {
  assert.equal(versionBits(7), 0x07c94);
  assert.equal(versionBits(8), 0x085bc);
});

test('capacidades conforme a norma', () => {
  assert.equal(dataCodewords(1, 'L'), 19);
  assert.equal(dataCodewords(1, 'M'), 16);
  assert.equal(dataCodewords(1, 'Q'), 13);
  assert.equal(dataCodewords(1, 'H'), 9);
  assert.equal(dataCodewords(40, 'L'), 2956);
  assert.equal(maxBytes('L'), 2953);
  assert.equal(maxBytes('M'), 2331);
  assert.equal(maxBytes('Q'), 1663);
  assert.equal(maxBytes('H'), 1273);
});

test('seleção automática de versão pelo tamanho em bytes UTF-8', () => {
  assert.equal(encodeQR('a'.repeat(14), { ecc: 'M' }).version, 1);
  assert.equal(encodeQR('a'.repeat(15), { ecc: 'M' }).version, 2);
  assert.equal(encodeQR('a'.repeat(17), { ecc: 'L' }).version, 1);
  assert.equal(encodeQR('a'.repeat(18), { ecc: 'L' }).version, 2);
  assert.equal(encodeQR('ç'.repeat(8), { ecc: 'M' }).version, 2, 'ç ocupa 2 bytes');
});

test('estrutura: tamanho, finders, timing e módulo escuro', () => {
  const qr = encodeQR('HELLO', { ecc: 'M' });
  assert.equal(qr.size, 21);
  assert.equal(qr.modules.length, 21);
  for (let i = 0; i < 7; i++) {
    assert.ok(qr.modules[0][i] && qr.modules[6][i] && qr.modules[i][0] && qr.modules[i][6], 'borda do finder');
  }
  assert.ok(qr.modules[3][3] && !qr.modules[1][1], 'centro escuro, anel claro');
  for (let i = 8; i < qr.size - 8; i++) assert.equal(qr.modules[6][i], i % 2 === 0, 'timing horizontal');
  assert.ok(qr.modules[qr.size - 8][8], 'módulo escuro fixo');
  const big = encodeQR('x'.repeat(200), { ecc: 'L' });
  assert.equal(big.size, big.version * 4 + 17);
});

test('é determinístico', () => {
  assert.deepEqual(encodeQR('https://exemplo.com.br').modules, encodeQR('https://exemplo.com.br').modules);
});

test('erros: vazio, grande demais e nível inválido', () => {
  assert.throws(() => encodeQR(''), /vazio/);
  assert.throws(() => encodeQR('a'.repeat(3000), { ecc: 'L' }), /grande/);
  assert.throws(() => encodeQR('a', { ecc: 'X' }), /inválido/);
  assert.doesNotThrow(() => encodeQR('a'.repeat(maxBytes('L')), { ecc: 'L' }));
});

test('boostEcc eleva a correção quando sobra espaço', () => {
  assert.equal(encodeQR('A', { ecc: 'L', boostEcc: true }).ecc, 'H');
  assert.equal(encodeQR('A', { ecc: 'L' }).ecc, 'L');
});

test('SVG tem viewBox com zona de silêncio', () => {
  const qr = encodeQR('A');
  assert.match(qrToSvg(qr), new RegExp(`viewBox="0 0 ${qr.size + 8} ${qr.size + 8}"`));
});
