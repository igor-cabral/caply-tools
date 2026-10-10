// Lógica do Conversor de imagens (sem DOM).
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_PIXELS = 40_000_000; // ~40 megapixels
export const OUTPUT_FORMATS = {
  png: { mime: 'image/png', ext: 'png', label: 'PNG', lossy: false },
  jpeg: { mime: 'image/jpeg', ext: 'jpg', label: 'JPEG', lossy: true },
  webp: { mime: 'image/webp', ext: 'webp', label: 'WebP', lossy: true },
};

/** Identifica o formato real pelos primeiros bytes (não confia só na extensão). */
export function sniffImageType(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const ascii = (s, o) => [...s].every((c, i) => b[o + i] === c.charCodeAt(0));
  if (b.length >= 8 && b[0] === 0x89 && ascii('PNG', 1) && b[4] === 0x0d && b[5] === 0x0a) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 12 && ascii('RIFF', 0) && ascii('WEBP', 8)) return 'image/webp';
  if (b.length >= 6 && (ascii('GIF87a', 0) || ascii('GIF89a', 0))) return 'image/gif';
  if (b.length >= 2 && ascii('BM', 0)) return 'image/bmp';
  return null;
}

export function validateImageFile({ size }, sniffedType) {
  if (!size) return { ok: false, error: 'O arquivo está vazio.' };
  if (size > MAX_FILE_BYTES) return { ok: false, error: `O arquivo tem ${formatBytes(size)}. O limite é ${formatBytes(MAX_FILE_BYTES)}.` };
  if (!sniffedType) return { ok: false, error: 'Formato não suportado. Use uma imagem PNG, JPEG, WebP, GIF ou BMP.' };
  return { ok: true };
}

export function validateDimensions(width, height) {
  if (!width || !height) return { ok: false, error: 'Não foi possível ler as dimensões da imagem.' };
  if (width * height > MAX_PIXELS) {
    return { ok: false, error: `A imagem tem ${width}×${height} px, acima do limite de ${Math.round(MAX_PIXELS / 1e6)} megapixels.` };
  }
  return { ok: true };
}

export function outputFilename(originalName, formatKey) {
  const fmt = OUTPUT_FORMATS[formatKey];
  if (!fmt) throw new RangeError('Formato de saída inválido.');
  const base = String(originalName || 'imagem').replace(/\.[^./\\]+$/, '').replace(/[^\p{L}\p{N}._ -]/gu, '').trim() || 'imagem';
  return `${base}.${fmt.ext}`;
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(n / 1024 / 1024).toFixed(2).replace('.', ',')} MB`;
}
