// Pipeline de conversão no navegador: ler → decodificar (Web Audio) → ajustar canais/taxa → codificar.
// Tudo local: nenhum dado é enviado a servidores. Libera contexto de áudio e referências ao terminar.
import { LIMITS, normalizeSettings, PLAYABLE_PROBES, classifySupport, validateDuration } from './audio-lib.js';
import { abortError, encodeWav, mixToMono } from './audio-wav.js';

const Ctx = () => globalThis.AudioContext || globalThis.webkitAudioContext;
const OfflineCtx = () => globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;

/** Encoders por formato de saída. Para MP3, registre aqui um encoder: (channels, sampleRate, opts) => Promise<Blob>. */
export const ENCODERS = {
  wav: (channels, sampleRate, opts) => encodeWav(channels, sampleRate, opts),
};

export function isAbort(err) { return err?.name === 'AbortError'; }

/** O que este navegador oferece. As respostas de canPlayType são estimativas, não garantias. */
export function detectSupport() {
  const audio = typeof Audio === 'function' ? new Audio() : null;
  return {
    webAudio: Boolean(Ctx()),
    offline: Boolean(OfflineCtx()),
    probes: PLAYABLE_PROBES.map((p) => ({ ...p, ...classifySupport(audio ? audio.canPlayType(p.type) : '') })),
  };
}

const decode = (ctx, buf) => new Promise((resolve, reject) => {
  const p = ctx.decodeAudioData(buf, resolve, reject); // Safari antigo só aceita callbacks
  if (p && typeof p.then === 'function') p.then(resolve, reject);
});

async function render(buffer, channels, sampleRate, length) {
  const O = OfflineCtx();
  const off = new O(channels, length, sampleRate);
  const src = off.createBufferSource();
  src.buffer = buffer;
  src.connect(off.destination);
  src.start();
  return off.startRendering();
}

/**
 * Converte um arquivo de áudio (ou o áudio de um vídeo) para o formato de saída.
 * @returns {Promise<{blob: Blob, info: object}>}
 */
export async function convertAudio(file, rawSettings, { signal, onPhase = () => {}, onProgress = () => {} } = {}) {
  const settings = normalizeSettings(rawSettings);
  const AudioCtx = Ctx();
  if (!AudioCtx) throw new Error('Este navegador não oferece a Web Audio API, necessária para converter áudio.');
  const check = () => { if (signal?.aborted) throw abortError(); };

  onPhase('ler'); check();
  let data = await file.arrayBuffer();
  check();

  onPhase('decodificar');
  let ctx;
  try { ctx = new AudioCtx({ sampleRate: settings.sampleRate }); } catch { ctx = new AudioCtx(); }
  let decoded;
  try { decoded = await decode(ctx, data); } finally { data = null; ctx.close?.().catch?.(() => {}); }
  check();
  const dur = validateDuration(decoded.duration);
  if (!dur.ok) throw new RangeError(dur.error);

  onPhase('processar');
  const srcCh = decoded.numberOfChannels;
  const targetCh = settings.channels === 'mono' ? 1 : 2;
  let buffer = decoded;
  if (decoded.sampleRate !== settings.sampleRate) { // navegador sem a opção sampleRate: reamostra
    if (!OfflineCtx()) throw new Error('Este navegador não consegue reamostrar o áudio.');
    buffer = await render(decoded, Math.min(srcCh, 2) || 1, settings.sampleRate, Math.ceil(decoded.duration * settings.sampleRate));
    check();
  }
  let channels;
  if (srcCh > 2) { // mixagem padrão do Web Audio (ex.: 5.1 → estéreo/mono)
    const out = await render(buffer, targetCh, buffer.sampleRate, buffer.length);
    channels = Array.from({ length: targetCh }, (_, i) => out.getChannelData(i));
  } else {
    const raw = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    channels = settings.channels === 'mono' ? [mixToMono(raw)] : raw;
  }
  check();

  onPhase('codificar');
  const encoder = ENCODERS[settings.format];
  if (!encoder) throw new RangeError('Formato de saída indisponível nesta versão.');
  const blob = await encoder(channels, buffer.sampleRate, { bitDepth: settings.bitDepth, signal, onProgress });
  const info = { frames: channels[0].length, channels: channels.length, sampleRate: buffer.sampleRate, bitDepth: settings.bitDepth, durationSec: channels[0].length / buffer.sampleRate, sourceChannels: srcCh, bytes: blob.size };
  decoded = null; buffer = null; channels = null; // libera o PCM decodificado
  return { blob, info };
}

/** Lê a duração pelos metadados (sem decodificar). Retorna null se o navegador não conseguir. */
export function readDuration(file, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    let done = false;
    const finish = (v) => { if (done) return; done = true; clearTimeout(t); a.removeAttribute('src'); a.load(); URL.revokeObjectURL(url); resolve(v); };
    const t = setTimeout(() => finish(null), timeoutMs);
    a.preload = 'metadata';
    a.onloadedmetadata = () => finish(Number.isFinite(a.duration) && a.duration > 0 ? a.duration : null);
    a.onerror = () => finish(null);
    a.src = url;
  });
}

export { LIMITS };
