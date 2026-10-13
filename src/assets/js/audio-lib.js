// Conversor de áudio — lógica pura (sem DOM): limites, detecção de formato, validação e mensagens.
import { formatBytes } from './image-lib.js';

export const LIMITS = Object.freeze({
  maxFileBytes: 50 * 1024 * 1024, // 50 MB por arquivo
  maxDurationSec: 600, // 10 min: o PCM decodificado de 10 min estéreo a 44,1 kHz ocupa ~212 MB
  maxQueue: 10,
  maxResultBytes: 300 * 1024 * 1024, // aviso quando os resultados guardados passam disso
});

export const SAMPLE_RATES = Object.freeze([44100, 48000, 22050, 16000]);
export const BIT_DEPTHS = Object.freeze([16, 24]);
export const CHANNEL_MODES = Object.freeze(['keep', 'mono']);

/**
 * Formatos de saída. Para adicionar um novo (ex.: MP3), registre um encoder em audio-convert.js (ENCODERS)
 * e troque `available` para true. Enquanto isso, a interface mostra o motivo da indisponibilidade.
 */
export const OUTPUT_FORMATS = Object.freeze([
  { id: 'wav', label: 'WAV (PCM)', ext: 'wav', mime: 'audio/wav', available: true, reason: '' },
  { id: 'mp3', label: 'MP3', ext: 'mp3', mime: 'audio/mpeg', available: false,
    reason: 'Ainda não disponível: gerar MP3 exige um encoder (biblioteca de terceiros) que não está incluído nesta versão.' },
]);

const FORMATS = {
  wav: { id: 'wav', label: 'WAV', kind: 'audio', supported: true },
  mp3: { id: 'mp3', label: 'MP3', kind: 'audio', supported: true },
  aac: { id: 'aac', label: 'AAC', kind: 'audio', supported: true },
  ogg: { id: 'ogg', label: 'OGG (Vorbis/Opus)', kind: 'audio', supported: true },
  flac: { id: 'flac', label: 'FLAC', kind: 'audio', supported: true },
  m4a: { id: 'm4a', label: 'M4A (AAC)', kind: 'audio', supported: true },
  mp4: { id: 'mp4', label: 'MP4', kind: 'media', supported: true },
  webm: { id: 'webm', label: 'WebM/Matroska', kind: 'media', supported: true },
  aiff: { id: 'aiff', label: 'AIFF', kind: 'audio', supported: true },
  wma: { id: 'wma', label: 'WMA/ASF', kind: 'audio', supported: false, why: 'WMA não é aberto pelos navegadores' },
  midi: { id: 'midi', label: 'MIDI', kind: 'audio', supported: false, why: 'MIDI guarda notas, não áudio gravado' },
  amr: { id: 'amr', label: 'AMR', kind: 'audio', supported: false, why: 'AMR não é aberto pelos navegadores' },
};

/** Testes que o navegador pode responder com HTMLMediaElement.canPlayType (estimativa, não garantia). */
export const PLAYABLE_PROBES = Object.freeze([
  { id: 'wav', label: 'WAV', type: 'audio/wav' },
  { id: 'mp3', label: 'MP3', type: 'audio/mpeg' },
  { id: 'ogg', label: 'OGG Vorbis', type: 'audio/ogg; codecs="vorbis"' },
  { id: 'opus', label: 'Opus (OGG/WebM)', type: 'audio/webm; codecs="opus"' },
  { id: 'flac', label: 'FLAC', type: 'audio/flac' },
  { id: 'm4a', label: 'M4A / AAC', type: 'audio/mp4; codecs="mp4a.40.2"' },
  { id: 'aac', label: 'AAC (ADTS)', type: 'audio/aac' },
]);

/** Traduz o retorno de canPlayType. */
export function classifySupport(answer) {
  if (answer === 'probably') return { level: 'yes', text: 'Sim' };
  if (answer === 'maybe') return { level: 'maybe', text: 'Provável' };
  return { level: 'no', text: 'Não' };
}

const asciiAt = (b, s, o = 0) => [...s].every((c, i) => b[o + i] === c.charCodeAt(0));

/** Identifica o formato pelos primeiros bytes (não confia só na extensão). */
export function sniffAudioFormat(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length < 4) return null;
  if (b.length >= 12 && asciiAt(b, 'RIFF') && asciiAt(b, 'WAVE', 8)) return FORMATS.wav;
  if (asciiAt(b, 'OggS')) return FORMATS.ogg;
  if (asciiAt(b, 'fLaC')) return FORMATS.flac;
  if (asciiAt(b, 'ID3')) return FORMATS.mp3;
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) {
    const layer = (b[1] >> 1) & 3; // 01 = camada III (MP3), 00 = ADTS (AAC)
    if (layer === 1) return FORMATS.mp3;
    if (layer === 0) return FORMATS.aac;
    return null;
  }
  if (b.length >= 12 && asciiAt(b, 'ftyp', 4)) return asciiAt(b, 'M4A ', 8) || asciiAt(b, 'M4B ', 8) ? FORMATS.m4a : FORMATS.mp4;
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return FORMATS.webm;
  if (b.length >= 12 && asciiAt(b, 'FORM') && (asciiAt(b, 'AIFF', 8) || asciiAt(b, 'AIFC', 8))) return FORMATS.aiff;
  if (b.length >= 8 && b[0] === 0x30 && b[1] === 0x26 && b[2] === 0xb2 && b[3] === 0x75) return FORMATS.wma;
  if (asciiAt(b, 'MThd')) return FORMATS.midi;
  if (asciiAt(b, '#!AMR')) return FORMATS.amr;
  return null;
}

export function validateAudioFile({ size }, sniffed) {
  if (!size) return { ok: false, error: 'O arquivo está vazio.' };
  if (size > LIMITS.maxFileBytes) return { ok: false, error: `O arquivo tem ${formatBytes(size)}. O limite é ${formatBytes(LIMITS.maxFileBytes)}.` };
  if (!sniffed) return { ok: false, error: 'Formato não reconhecido. Use um arquivo de áudio (WAV, MP3, OGG, FLAC, M4A…) ou um vídeo MP4/WebM. Os formatos aceitos dependem do seu navegador.' };
  if (!sniffed.supported) return { ok: false, error: `${sniffed.why}. Converta o arquivo com outro programa antes.` };
  return { ok: true };
}

export function formatDuration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '—';
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

export function validateDuration(sec) {
  if (sec > LIMITS.maxDurationSec) {
    return { ok: false, error: `A duração (${formatDuration(sec)}) passa do limite de ${formatDuration(LIMITS.maxDurationSec)}. Arquivos longos não cabem na memória de muitos aparelhos.` };
  }
  return { ok: true };
}

/** Memória do áudio decodificado (Float32). */
export function estimateDecodedBytes({ durationSec, sampleRate, channels = 2 }) {
  return Math.ceil(durationSec * sampleRate * channels * 4);
}

export function wavBytes(frames, channels, bitDepth) {
  return 44 + frames * channels * (bitDepth / 8);
}

export function normalizeSettings({ sampleRate = 44100, bitDepth = 16, channels = 'keep', format = 'wav' } = {}) {
  const fmt = OUTPUT_FORMATS.find((f) => f.id === format);
  if (!fmt) throw new RangeError('Formato de saída desconhecido.');
  if (!fmt.available) throw new RangeError(fmt.reason);
  if (!SAMPLE_RATES.includes(sampleRate)) throw new RangeError('Taxa de amostragem não suportada.');
  if (!BIT_DEPTHS.includes(bitDepth)) throw new RangeError('Profundidade de bits não suportada.');
  if (!CHANNEL_MODES.includes(channels)) throw new RangeError('Modo de canais inválido.');
  return { sampleRate, bitDepth, channels, format };
}

/** Tamanho aproximado do WAV (para "keep" assume estéreo, o máximo possível). */
export function estimateOutputBytes(durationSec, settings) {
  const s = normalizeSettings(settings);
  return wavBytes(Math.ceil(durationSec * s.sampleRate), s.channels === 'mono' ? 1 : 2, s.bitDepth);
}

export function describeSettings(s) {
  return `WAV ${s.bitDepth} bits, ${(s.sampleRate / 1000).toString().replace('.', ',')} kHz, ${s.channels === 'mono' ? 'mono' : 'estéreo'}`;
}

export function outputFilename(originalName, ext = 'wav') {
  const raw = String(originalName || 'audio');
  const dot = raw.lastIndexOf('.');
  const sameExt = dot > 0 && raw.slice(dot + 1).toLowerCase() === ext;
  const base = (dot > 0 ? raw.slice(0, dot) : raw).replace(/[^\p{L}\p{N}._ -]/gu, '').replace(/^[.\s]+/, '').trim() || 'audio'; // sem ponto inicial: não gera arquivo oculto
  return `${base}${sameExt ? '-convertido' : ''}.${ext}`;
}

/** Mensagem compreensível para um erro do pipeline. */
export function describeError(err, sniffed) {
  const name = err?.name || '';
  const label = sniffed?.label ? ` (${sniffed.label})` : '';
  if (name === 'AbortError') return 'Conversão cancelada.';
  if (name === 'EncodingError' || name === 'NotSupportedError' || /decode|unable to decode|encoding/i.test(err?.message || '')) {
    return `O navegador não conseguiu decodificar este arquivo${label}. Ele pode estar corrompido ou usar um codec que este navegador não suporta. Tente outro navegador ou converta o arquivo com outro programa.`;
  }
  if (err instanceof RangeError && !/array buffer|allocation|memory/i.test(err.message)) return err.message;
  if (name === 'RangeError' || /memory|allocation|array buffer/i.test(err?.message || '')) {
    return 'Faltou memória para processar este arquivo. Tente um arquivo menor ou a opção mono.';
  }
  return 'Não foi possível converter este arquivo. Tente novamente ou use outro formato.';
}
