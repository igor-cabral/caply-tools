import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, OUTPUT_FORMATS, sniffAudioFormat, validateAudioFile, validateDuration, formatDuration, estimateDecodedBytes, wavBytes, normalizeSettings, estimateOutputBytes, describeSettings, outputFilename, describeError, classifySupport, PLAYABLE_PROBES } from '../src/assets/js/audio-lib.js';
import { ENCODERS, convertAudio, detectSupport, isAbort } from '../src/assets/js/audio-convert.js';

const bytes = (...a) => Uint8Array.from(a);
const asc = (s) => [...s].map((c) => c.charCodeAt(0));
const pad = (a, n = 16) => Uint8Array.from([...a, ...new Array(Math.max(0, n - a.length)).fill(0)]);

test('identifica formatos pelos bytes iniciais', () => {
  const id = (b) => sniffAudioFormat(pad(b))?.id;
  assert.equal(id([...asc('RIFF'), 0, 0, 0, 0, ...asc('WAVE')]), 'wav');
  assert.equal(id(asc('OggS')), 'ogg');
  assert.equal(id(asc('fLaC')), 'flac');
  assert.equal(id(asc('ID3')), 'mp3');
  assert.equal(id([0xff, 0xfb, 0x90, 0]), 'mp3');
  assert.equal(id([0xff, 0xf3, 0x90, 0]), 'mp3', 'MPEG-2 camada III');
  assert.equal(id([0xff, 0xe3, 0x90, 0]), 'mp3', 'MPEG-2.5 camada III');
  assert.equal(id([0xff, 0xf1, 0x50, 0]), 'aac');
  assert.equal(id([0xff, 0xf9, 0x50, 0]), 'aac');
  assert.equal(id([0, 0, 0, 0x20, ...asc('ftyp'), ...asc('M4A ')]), 'm4a');
  assert.equal(id([0, 0, 0, 0x20, ...asc('ftyp'), ...asc('isom')]), 'mp4');
  assert.equal(id([0x1a, 0x45, 0xdf, 0xa3]), 'webm');
  assert.equal(id([...asc('FORM'), 0, 0, 0, 0, ...asc('AIFF')]), 'aiff');
});
test('reconhece formatos que os navegadores não abrem e os marca como não suportados', () => {
  const wma = sniffAudioFormat(pad([0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11]));
  assert.equal(wma.id, 'wma'); assert.equal(wma.supported, false);
  assert.equal(sniffAudioFormat(pad(asc('MThd'))).supported, false);
  assert.equal(sniffAudioFormat(pad(asc('#!AMR'))).supported, false);
});
test('rejeita o que não é áudio', () => {
  assert.equal(sniffAudioFormat(pad(asc('isto nao e audio'))), null);
  assert.equal(sniffAudioFormat(bytes()), null);
  assert.equal(sniffAudioFormat(bytes(1, 2)), null);
  assert.equal(sniffAudioFormat(pad([...asc('RIFF'), 0, 0, 0, 0, ...asc('AVI ')])), null, 'RIFF que não é WAVE');
  assert.equal(sniffAudioFormat(pad([0xff, 0xfd, 0, 0])), null, 'camada II não é tratada');
  assert.equal(sniffAudioFormat(pad([0x25, 0x50, 0x44, 0x46])), null, 'PDF');
  assert.equal(sniffAudioFormat(pad([0x89, 0x50, 0x4e, 0x47])), null, 'PNG');
});
test('validação do arquivo: vazio, grande, desconhecido, não suportado, ok', () => {
  const wav = sniffAudioFormat(pad([...asc('RIFF'), 0, 0, 0, 0, ...asc('WAVE')]));
  assert.equal(validateAudioFile({ size: 0 }, wav).error, 'O arquivo está vazio.');
  assert.match(validateAudioFile({ size: LIMITS.maxFileBytes + 1 }, wav).error, /limite é 50,00 MB/);
  assert.match(validateAudioFile({ size: 10 }, null).error, /Formato não reconhecido/);
  assert.match(validateAudioFile({ size: 10 }, sniffAudioFormat(pad([0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11]))).error, /WMA/);
  assert.deepEqual(validateAudioFile({ size: LIMITS.maxFileBytes }, wav), { ok: true });
});
test('duração: formatação e limite', () => {
  assert.equal(formatDuration(0), '0:00'); assert.equal(formatDuration(65.4), '1:05'); assert.equal(formatDuration(3725), '1:02:05');
  assert.equal(formatDuration(NaN), '—'); assert.equal(formatDuration(-1), '—'); assert.equal(formatDuration(Infinity), '—');
  assert.equal(validateDuration(600).ok, true);
  assert.match(validateDuration(601).error, /10:00/);
});
test('estimativas de memória e de tamanho do WAV', () => {
  assert.equal(estimateDecodedBytes({ durationSec: 600, sampleRate: 44100, channels: 2 }), 211_680_000);
  assert.equal(wavBytes(44100, 2, 16), 44 + 176400);
  assert.equal(wavBytes(1000, 1, 24), 44 + 3000);
  assert.equal(estimateOutputBytes(10, { sampleRate: 44100, bitDepth: 16, channels: 'keep' }), 44 + 441000 * 4);
  assert.equal(estimateOutputBytes(10, { sampleRate: 22050, bitDepth: 24, channels: 'mono' }), 44 + 220500 * 3);
});
test('configurações: padrões, validação e MP3 indisponível', () => {
  assert.deepEqual(normalizeSettings(), { sampleRate: 44100, bitDepth: 16, channels: 'keep', format: 'wav' });
  assert.throws(() => normalizeSettings({ sampleRate: 12345 }), /Taxa/);
  assert.throws(() => normalizeSettings({ bitDepth: 8 }), /Profundidade/);
  assert.throws(() => normalizeSettings({ channels: 'surround' }), /canais/);
  assert.throws(() => normalizeSettings({ format: 'ogg' }), /desconhecido/);
  assert.throws(() => normalizeSettings({ format: 'mp3' }), /encoder/);
  assert.equal(describeSettings({ bitDepth: 24, sampleRate: 22050, channels: 'mono' }), 'WAV 24 bits, 22,05 kHz, mono');
  assert.equal(describeSettings({ bitDepth: 16, sampleRate: 44100, channels: 'keep' }), 'WAV 16 bits, 44,1 kHz, estéreo');
});
test('registro de formatos de saída: só WAV está disponível e MP3 explica por quê', () => {
  assert.deepEqual(OUTPUT_FORMATS.filter((f) => f.available).map((f) => f.id), ['wav']);
  const mp3 = OUTPUT_FORMATS.find((f) => f.id === 'mp3');
  assert.equal(mp3.available, false); assert.match(mp3.reason, /encoder/);
  assert.deepEqual(Object.keys(ENCODERS), ['wav'], 'nenhum encoder de MP3 foi inventado');
});
test('nome do arquivo de saída', () => {
  assert.equal(outputFilename('música.mp3'), 'música.wav');
  assert.equal(outputFilename('take 1.final.ogg'), 'take 1.final.wav');
  assert.equal(outputFilename('voz.WAV'), 'voz-convertido.wav', 'evita sobrescrever o original');
  assert.equal(outputFilename('semextensao'), 'semextensao.wav');
  assert.equal(outputFilename(''), 'audio.wav');
  assert.equal(outputFilename('.mp3'), 'mp3.wav', 'nunca começa com ponto (arquivo oculto)');
  assert.equal(outputFilename('../../etc/passwd.mp3'), 'etcpasswd.wav');
  assert.ok(!/[\\/<>:"|?*]/.test(outputFilename('../../a<b>:c.mp3')));
});
test('mensagens de erro compreensíveis', () => {
  const m4a = { label: 'M4A (AAC)' };
  assert.match(describeError(new DOMException('x', 'EncodingError'), m4a), /não conseguiu decodificar.*M4A \(AAC\).*codec/s);
  assert.match(describeError(new DOMException('Unable to decode audio data', 'Error'), null), /não conseguiu decodificar/);
  assert.equal(describeError(new DOMException('c', 'AbortError')), 'Conversão cancelada.');
  assert.equal(describeError(new RangeError('A duração passa do limite.')), 'A duração passa do limite.');
  assert.match(describeError(new RangeError('Array buffer allocation failed')), /memória/);
  assert.match(describeError(new Error('qualquer coisa')), /Não foi possível converter/);
  assert.equal(isAbort(new DOMException('c', 'AbortError')), true); assert.equal(isAbort(new Error('x')), false);
});
test('canPlayType é traduzido sem prometer demais', () => {
  assert.deepEqual(classifySupport('probably'), { level: 'yes', text: 'Sim' });
  assert.deepEqual(classifySupport('maybe'), { level: 'maybe', text: 'Provável' });
  assert.deepEqual(classifySupport(''), { level: 'no', text: 'Não' });
  assert.ok(PLAYABLE_PROBES.length >= 6);
});
test('fora do navegador: sem Web Audio a conversão falha com mensagem clara; MP3 é recusado antes de qualquer trabalho', async () => {
  const sup = detectSupport(); assert.equal(sup.webAudio, false); assert.ok(sup.probes.every((p) => p.level === 'no'));
  await assert.rejects(convertAudio({ arrayBuffer: async () => new ArrayBuffer(1) }, { format: 'mp3' }), /encoder/);
  await assert.rejects(convertAudio({ arrayBuffer: async () => new ArrayBuffer(1) }, {}), /Web Audio/);
});
