// Codificação WAV (PCM) em JavaScript puro — sem dependências, sem DOM. Testável em Node.

export const abortError = () => new DOMException('Conversão cancelada.', 'AbortError');

const defaultYield = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Float [-1, 1] → inteiro de 16 bits com saturação. */
export function floatToInt16(x) {
  if (!(x === x)) return 0; // NaN
  const v = x > 1 ? 1 : x < -1 ? -1 : x;
  return Math.round(v < 0 ? v * 32768 : v * 32767);
}
/** Float [-1, 1] → inteiro de 24 bits com saturação. */
export function floatToInt24(x) {
  if (!(x === x)) return 0;
  const v = x > 1 ? 1 : x < -1 ? -1 : x;
  return Math.round(v < 0 ? v * 8388608 : v * 8388607);
}

/** Cabeçalho RIFF/WAVE de 44 bytes (PCM, formato 1). */
export function wavHeader({ frames, channels, sampleRate, bitDepth }) {
  const bytesPer = bitDepth / 8;
  const dataBytes = frames * channels * bytesPer;
  if (dataBytes + 36 > 0xffffffff) throw new RangeError('O áudio é grande demais para o formato WAV (limite de 4 GB).');
  const h = new DataView(new ArrayBuffer(44));
  const tag = (o, s) => { for (let i = 0; i < 4; i++) h.setUint8(o + i, s.charCodeAt(i)); };
  tag(0, 'RIFF'); h.setUint32(4, 36 + dataBytes, true); tag(8, 'WAVE');
  tag(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, channels, true);
  h.setUint32(24, sampleRate, true); h.setUint32(28, sampleRate * channels * bytesPer, true);
  h.setUint16(32, channels * bytesPer, true); h.setUint16(34, bitDepth, true);
  tag(36, 'data'); h.setUint32(40, dataBytes, true);
  return new Uint8Array(h.buffer);
}

/** Média dos canais (mixagem para mono). */
export function mixToMono(channelData) {
  if (channelData.length === 1) return channelData[0];
  const n = channelData[0].length;
  const out = new Float32Array(n);
  const k = 1 / channelData.length;
  for (const ch of channelData) for (let i = 0; i < n; i++) out[i] += ch[i] * k;
  return out;
}

/**
 * Gera um Blob WAV a partir de canais Float32 (1 ou 2), em blocos, cedendo a thread entre eles
 * para permitir progresso e cancelamento reais.
 * @param {Float32Array[]} channels
 * @param {number} sampleRate
 * @param {{bitDepth?:16|24, chunkFrames?:number, onProgress?:(p:number)=>void, signal?:AbortSignal, yieldFn?:()=>Promise<void>}} [opts]
 */
export async function encodeWav(channels, sampleRate, { bitDepth = 16, chunkFrames = 262144, onProgress, signal, yieldFn = defaultYield } = {}) {
  if (!Array.isArray(channels) || channels.length < 1 || channels.length > 2) throw new RangeError('A conversão aceita 1 ou 2 canais.');
  const frames = channels[0].length;
  if (!channels.every((c) => c.length === frames)) throw new RangeError('Os canais têm tamanhos diferentes.');
  if (frames === 0) throw new RangeError('O áudio está vazio.');
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('Taxa de amostragem inválida.');
  if (bitDepth !== 16 && bitDepth !== 24) throw new RangeError('Profundidade de bits inválida.');
  const nch = channels.length;
  const bytesPer = bitDepth / 8;
  const header = wavHeader({ frames, channels: nch, sampleRate, bitDepth });
  const parts = [header];
  if (signal?.aborted) throw abortError();
  for (let start = 0; start < frames; start += chunkFrames) {
    const n = Math.min(chunkFrames, frames - start);
    const buf = new Uint8Array(n * nch * bytesPer);
    const dv = new DataView(buf.buffer);
    let o = 0;
    if (bitDepth === 16) {
      for (let i = 0; i < n; i++) for (let c = 0; c < nch; c++) { dv.setInt16(o, floatToInt16(channels[c][start + i]), true); o += 2; }
    } else {
      for (let i = 0; i < n; i++) for (let c = 0; c < nch; c++) {
        const v = floatToInt24(channels[c][start + i]);
        buf[o] = v & 0xff; buf[o + 1] = (v >> 8) & 0xff; buf[o + 2] = (v >> 16) & 0xff; o += 3;
      }
    }
    parts.push(buf);
    onProgress?.(Math.min(1, (start + n) / frames));
    if (signal?.aborted) throw abortError();
    await yieldFn();
    if (signal?.aborted) throw abortError();
  }
  return new Blob(parts, { type: 'audio/wav' });
}
