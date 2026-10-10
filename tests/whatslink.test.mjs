import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, buildWhatsAppLink, whatsLink, looksLikeBrazilianLocal, MAX_MESSAGE } from '../src/assets/js/whatslink-lib.js';

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
test('não avisa quando o código do país foi informado explicitamente (+ ou 00)', () => {
  assert.equal(normalizePhone('+48 512 345 678').hint, undefined, 'Polônia com + não é erro');
  assert.equal(normalizePhone('+55 48 99999-9999').hint, undefined);
  assert.equal(normalizePhone('0055 48 99999 9999').hint, undefined);
  assert.equal(normalizePhone('+1 415-555-0132').hint, undefined);
});
test('detecta número brasileiro sem código do país e sugere o 55', () => {
  const r = normalizePhone('(48) 99999-9999');
  assert.match(r.hint, /55/);
  assert.equal(r.suggestion, '5548999999999');
  assert.equal(normalizePhone('48 3333-4444').suggestion, '554833334444', 'fixo com 10 dígitos');
  assert.equal(normalizePhone('55 99999-9999').suggestion, '5555999999999', 'DDD 55 (RS) não é código do país');
});
test('não sugere 55 para números que já têm código ou não parecem brasileiros', () => {
  assert.equal(normalizePhone('5548999999999').suggestion, undefined);
  assert.equal(normalizePhone('14155550132').suggestion, undefined);
  assert.equal(looksLikeBrazilianLocal('01999999999'), false);
  assert.equal(looksLikeBrazilianLocal('4899999999'), false, '10 dígitos com 9 após o DDD');
  assert.equal(looksLikeBrazilianLocal('1234567'), false);
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
