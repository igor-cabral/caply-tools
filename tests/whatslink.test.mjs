import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, buildWhatsAppLink, whatsLink, MAX_MESSAGE } from '../src/assets/js/whatslink-lib.js';

test('normaliza formatos comuns', () => {
  assert.equal(normalizePhone('+55 (48) 99999-9999').digits, '5548999999999');
  assert.equal(normalizePhone('0055 48 99999 9999').digits, '5548999999999');
  assert.equal(normalizePhone('+1 415-555-0132').digits, '14155550132');
});
test('rejeita números inválidos', () => {
  for (const bad of ['', '   ', 'abc', '48999999999x', '048999999999', '123', '1'.repeat(16), '+++']) {
    assert.equal(normalizePhone(bad).ok, false, bad);
  }
});
test('avisa quando o código do país parece faltar', () => {
  assert.ok(normalizePhone('48999999999').hint);
  assert.equal(normalizePhone('+55 48 99999-9999').hint, undefined);
});
test('monta link wa.me com e sem mensagem', () => {
  assert.equal(buildWhatsAppLink('5548999999999'), 'https://wa.me/5548999999999');
  assert.equal(buildWhatsAppLink('5548999999999', '  '), 'https://wa.me/5548999999999');
  assert.equal(buildWhatsAppLink('5548999999999', 'Olá, tudo bem? & mais'), 'https://wa.me/5548999999999?text=Ol%C3%A1%2C%20tudo%20bem%3F%20%26%20mais');
});
test('whatsLink integra validação e limite de mensagem', () => {
  assert.equal(whatsLink('+55 48 99999-9999', 'Oi').url, 'https://wa.me/5548999999999?text=Oi');
  assert.equal(whatsLink('abc').ok, false);
  assert.equal(whatsLink('+5548999999999', 'x'.repeat(MAX_MESSAGE + 1)).ok, false);
});
