import test from 'node:test';
import assert from 'node:assert/strict';
import { sniffImageType, validateImageFile, validateDimensions, outputFilename, formatBytes, MAX_FILE_BYTES, MAX_PIXELS } from '../src/assets/js/image-lib.js';

const bytes = (...a) => new Uint8Array(a);
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));

test('identifica formatos pelos bytes iniciais', () => {
  assert.equal(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), 'image/png');
  assert.equal(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg');
  assert.equal(sniffImageType(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP'))), 'image/webp');
  assert.equal(sniffImageType(bytes(...ascii('GIF89a'))), 'image/gif');
  assert.equal(sniffImageType(bytes(...ascii('BM'), 0, 0)), 'image/bmp');
});
test('rejeita o que não é imagem suportada', () => {
  assert.equal(sniffImageType(bytes(...ascii('%PDF-1.7'))), null);
  assert.equal(sniffImageType(bytes(...ascii('<svg xmlns='))), null);
  assert.equal(sniffImageType(bytes()), null);
  assert.equal(sniffImageType(bytes(0x89, 0x50)), null);
});
test('valida tamanho e tipo do arquivo', () => {
  assert.equal(validateImageFile({ size: 1000 }, 'image/png').ok, true);
  assert.equal(validateImageFile({ size: 0 }, 'image/png').ok, false);
  assert.match(validateImageFile({ size: MAX_FILE_BYTES + 1 }, 'image/png').error, /limite/);
  assert.equal(validateImageFile({ size: 1000 }, null).ok, false);
});
test('valida dimensões', () => {
  assert.equal(validateDimensions(4000, 3000).ok, true);
  assert.equal(validateDimensions(0, 10).ok, false);
  assert.equal(validateDimensions(MAX_PIXELS, 2).ok, false);
});
test('nome de saída troca a extensão e higieniza', () => {
  assert.equal(outputFilename('foto.final.PNG', 'webp'), 'foto.final.webp');
  assert.equal(outputFilename('minha foto.jpeg', 'png'), 'minha foto.png');
  assert.equal(outputFilename('', 'jpeg'), 'imagem.jpg');
  assert.ok(!/[\\/]/.test(outputFilename('../../etc/passwd.png', 'png')));
  assert.throws(() => outputFilename('a.png', 'gif'));
});
test('formatBytes', () => {
  assert.equal(formatBytes(500), '500 B');
  assert.equal(formatBytes(2048), '2,0 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5,00 MB');
});
