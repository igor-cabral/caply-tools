import test from 'node:test';
import assert from 'node:assert/strict';
import { wifiPayload, urlPayload, textPayload, escapeWifi } from '../src/assets/js/qr-content.js';

test('Wi-Fi WPA básico', () => {
  assert.deepEqual(wifiPayload({ ssid: 'Casa', password: 'senha1234', security: 'WPA' }), { ok: true, value: 'WIFI:T:WPA;S:Casa;P:senha1234;;' });
});
test('Wi-Fi escapa caracteres especiais', () => {
  assert.equal(escapeWifi('a;b,c:d"e\\f'), 'a\\;b\\,c\\:d\\"e\\\\f');
  assert.equal(wifiPayload({ ssid: 'Rede;1', password: 'p:ss,word1', security: 'WPA' }).value, 'WIFI:T:WPA;S:Rede\\;1;P:p\\:ss\\,word1;;');
});
test('Wi-Fi sem senha e rede oculta', () => {
  assert.equal(wifiPayload({ ssid: 'Aberta', security: 'nopass' }).value, 'WIFI:T:nopass;S:Aberta;;');
  assert.equal(wifiPayload({ ssid: 'X', password: '12345678', security: 'WPA', hidden: true }).value, 'WIFI:T:WPA;S:X;P:12345678;H:true;;');
});
test('Wi-Fi valida campos', () => {
  assert.equal(wifiPayload({ ssid: '  ', password: '12345678' }).ok, false);
  assert.match(wifiPayload({ ssid: 'X', password: '123', security: 'WPA' }).error, /8 caracteres/);
  assert.equal(wifiPayload({ ssid: 'X', password: '', security: 'WEP' }).ok, false);
  assert.equal(wifiPayload({ ssid: 'x'.repeat(33), password: '12345678' }).ok, false);
  assert.equal(wifiPayload({ ssid: 'X', password: '12345678', security: 'ABC' }).ok, false);
});
test('URL: normaliza e valida', () => {
  assert.equal(urlPayload('exemplo.com.br').value, 'https://exemplo.com.br');
  assert.equal(urlPayload('  http://a.com/x?y=1 ').value, 'http://a.com/x?y=1');
  for (const bad of ['', 'javascript:alert(1)', 'ftp://a.com', 'sem espaço.com', 'palavra', 'data:text/html,x']) {
    assert.equal(urlPayload(bad).ok, false, bad);
  }
});
test('Texto: não aceita vazio', () => {
  assert.equal(textPayload('  \n').ok, false);
  assert.deepEqual(textPayload('olá'), { ok: true, value: 'olá' });
});
