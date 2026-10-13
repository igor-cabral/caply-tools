import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav, wavHeader, mixToMono, floatToInt16, floatToInt24 } from '../src/assets/js/audio-wav.js';

/** Lê um WAV PCM (formato 1) e devolve cabeçalho e amostras inteiras intercaladas. */
async function parseWav(blob) {
  const buf = await blob.arrayBuffer();
  const dv = new DataView(buf);
  const tag = (o) => String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
  const h = { riff: tag(0), riffSize: dv.getUint32(4, true), wave: tag(8), fmt: tag(12), fmtSize: dv.getUint32(16, true), format: dv.getUint16(20, true), channels: dv.getUint16(22, true), rate: dv.getUint32(24, true), byteRate: dv.getUint32(28, true), blockAlign: dv.getUint16(32, true), bits: dv.getUint16(34, true), data: tag(36), dataBytes: dv.getUint32(40, true), total: buf.byteLength };
  const n = h.dataBytes / (h.bits / 8);
  const samples = new Array(n);
  for (let i = 0; i < n; i++) {
    if (h.bits === 16) samples[i] = dv.getInt16(44 + i * 2, true);
    else { const o = 44 + i * 3; let v = dv.getUint8(o) | (dv.getUint8(o + 1) << 8) | (dv.getUint8(o + 2) << 16); if (v & 0x800000) v -= 0x1000000; samples[i] = v; }
  }
  return { h, samples };
}
const f32 = (a) => Float32Array.from(a);

test('cabeçalho WAV estéreo 16 bits tem todos os campos corretos', async () => {
  const ch = [new Float32Array(1000), new Float32Array(1000)];
  const { h } = await parseWav(await encodeWav(ch, 44100));
  assert.deepEqual([h.riff, h.wave, h.fmt, h.data], ['RIFF', 'WAVE', 'fmt ', 'data']);
  assert.equal(h.fmtSize, 16); assert.equal(h.format, 1); assert.equal(h.channels, 2); assert.equal(h.rate, 44100);
  assert.equal(h.bits, 16); assert.equal(h.blockAlign, 4); assert.equal(h.byteRate, 176400);
  assert.equal(h.dataBytes, 4000); assert.equal(h.riffSize, 36 + 4000); assert.equal(h.total, 44 + 4000);
});
test('24 bits mono: blockAlign, byteRate e tamanho', async () => {
  const { h } = await parseWav(await encodeWav([new Float32Array(500)], 48000, { bitDepth: 24 }));
  assert.deepEqual([h.channels, h.bits, h.blockAlign, h.byteRate, h.dataBytes, h.rate], [1, 24, 3, 144000, 1500, 48000]);
});
test('16 bits: valores exatos, saturação e NaN', async () => {
  const { samples } = await parseWav(await encodeWav([f32([0, 1, -1, 0.5, -0.5, 2, -2, NaN, Infinity, -Infinity])], 44100));
  assert.deepEqual(samples, [0, 32767, -32768, 16384, -16384, 32767, -32768, 0, 32767, -32768]);
});
test('24 bits: valores exatos e saturação', async () => {
  const { samples } = await parseWav(await encodeWav([f32([0, 1, -1, 0.5, -0.5, 5, -5, NaN])], 44100, { bitDepth: 24 }));
  assert.deepEqual(samples, [0, 8388607, -8388608, 4194304, -4194304, 8388607, -8388608, 0]);
  assert.equal(floatToInt24(1), 8388607); assert.equal(floatToInt16(-1), -32768);
});
test('estéreo é intercalado L,R,L,R', async () => {
  const { samples } = await parseWav(await encodeWav([f32([1, 0, 1]), f32([-1, -1, 0])], 44100));
  assert.deepEqual(samples, [32767, -32768, 0, -32768, 32767, 0]);
});
test('ida e volta: senoide volta com erro < 1 LSB', async () => {
  const N = 4410; const x = new Float32Array(N).map((_, i) => 0.8 * Math.sin(2 * Math.PI * 440 * i / 44100));
  const { samples } = await parseWav(await encodeWav([x], 44100));
  let max = 0; samples.forEach((s, i) => { max = Math.max(max, Math.abs(s / 32768 - x[i])); });
  assert.ok(max < 1 / 16384, `erro máximo ${max}`);
});
test('blocos pequenos geram os mesmos bytes e chamam progress/yield por bloco', async () => {
  const x = new Float32Array(10).map((_, i) => (i - 5) / 6); const y = x.map((v) => -v);
  const whole = new Uint8Array(await (await encodeWav([x, y], 44100)).arrayBuffer());
  const prog = []; let yields = 0;
  const chunked = new Uint8Array(await (await encodeWav([x, y], 44100, { chunkFrames: 3, onProgress: (p) => prog.push(p), yieldFn: async () => { yields++; } })).arrayBuffer());
  assert.deepEqual(chunked, whole);
  assert.equal(prog.length, 4); assert.equal(yields, 4); assert.equal(prog.at(-1), 1);
  assert.ok(prog.every((p, i) => i === 0 || p > prog[i - 1]), 'progresso estritamente crescente');
});
test('cancelar no meio interrompe com AbortError e não devolve resultado', async () => {
  const ac = new AbortController(); let chunks = 0;
  await assert.rejects(
    encodeWav([new Float32Array(1000)], 44100, { chunkFrames: 100, signal: ac.signal, onProgress: () => { if (++chunks === 3) ac.abort(); } }),
    (e) => e.name === 'AbortError',
  );
  assert.equal(chunks, 3, 'parou logo após o cancelamento');
});
test('já cancelado antes de começar', async () => {
  const ac = new AbortController(); ac.abort();
  await assert.rejects(encodeWav([new Float32Array(10)], 44100, { signal: ac.signal }), (e) => e.name === 'AbortError');
});
test('entradas inválidas são recusadas com RangeError', async () => {
  const ok = new Float32Array(10);
  await assert.rejects(encodeWav([], 44100), RangeError);
  await assert.rejects(encodeWav([ok, ok, ok], 44100), RangeError);
  await assert.rejects(encodeWav([new Float32Array(0)], 44100), /vazio/);
  await assert.rejects(encodeWav([ok, new Float32Array(9)], 44100), /tamanhos diferentes/);
  await assert.rejects(encodeWav([ok], 100), RangeError);
  await assert.rejects(encodeWav([ok], 44100.5), RangeError);
  await assert.rejects(encodeWav([ok], 44100, { bitDepth: 8 }), RangeError);
  await assert.rejects(encodeWav('x', 44100), RangeError);
});
test('WAV acima de 4 GB é recusado no cabeçalho', () => {
  assert.throws(() => wavHeader({ frames: 2 ** 31, channels: 2, bitDepth: 24, sampleRate: 44100 }), /4 GB/);
  assert.equal(wavHeader({ frames: 10, channels: 1, bitDepth: 16, sampleRate: 44100 }).length, 44);
});
test('mixToMono faz a média e preserva mono', () => {
  const l = f32([1, 0.5, -1]); const r = f32([0, 0.5, 1]);
  assert.deepEqual([...mixToMono([l, r])], [0.5, 0.5, 0]);
  assert.equal(mixToMono([l]), l);
});
test('1 milhão de quadros é codificado rapidamente', async () => {
  const t = performance.now(); const x = new Float32Array(1_000_000).map((_, i) => Math.sin(i / 50));
  const b = await encodeWav([x], 44100);
  assert.equal(b.size, 44 + 2_000_000); assert.ok(performance.now() - t < 3000);
});
