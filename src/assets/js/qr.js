// Codificador de QR Code (modo byte/UTF-8, versões 1–40, níveis L/M/Q/H).
// Implementação própria, sem dependências, executada 100% no navegador.
// Referência: ISO/IEC 18004. Tabelas de blocos/ECC conforme a norma.

export const ECC_LEVELS = ['L', 'M', 'Q', 'H'];
const ECC_INDEX = { L: 0, M: 1, Q: 2, H: 3 };
const FORMAT_BITS = { L: 1, M: 0, Q: 3, H: 2 };

const ECC_CODEWORDS_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];
const NUM_ERROR_CORRECTION_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

/** Número de módulos de dados (incluindo ECC) para uma versão. */
export function rawDataModules(ver) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
}

/** Codewords de dados disponíveis (sem ECC). */
export function dataCodewords(ver, ecc) {
  const e = ECC_INDEX[ecc];
  return Math.floor(rawDataModules(ver) / 8) - ECC_CODEWORDS_PER_BLOCK[e][ver] * NUM_ERROR_CORRECTION_BLOCKS[e][ver];
}

/** Maior tamanho (em bytes UTF-8) que cabe na versão 40 para um nível. */
export function maxBytes(ecc) {
  return Math.floor((dataCodewords(40, ecc) * 8 - 4 - 16) / 8);
}

// ---------- Reed–Solomon sobre GF(256), polinômio 0x11D ----------
function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

export function rsDivisor(degree) {
  const result = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

export function rsRemainder(data, divisor) {
  const result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ result.shift();
    result.push(0);
    divisor.forEach((coef, i) => { result[i] ^= gfMul(coef, factor); });
  }
  return result;
}

// ---------- Utilidades ----------
const bit = (x, i) => ((x >>> i) & 1) !== 0;

function alignmentPositions(ver) {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2;
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
  const size = ver * 4 + 17;
  const res = [6];
  for (let pos = size - 7; res.length < n; pos -= step) res.splice(1, 0, pos);
  return res;
}

export function formatBits(ecc, mask) {
  const data = (FORMAT_BITS[ecc] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

export function versionBits(ver) {
  let rem = ver;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (ver << 12) | rem;
}

function utf8(text) {
  return Array.from(new TextEncoder().encode(text));
}

function buildCodewords(bytes, ver, ecc) {
  const capBits = dataCodewords(ver, ecc) * 8;
  const bits = [];
  const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, ver <= 9 ? 8 : 16);
  bytes.forEach((b) => push(b, 8));
  push(0, Math.min(4, capBits - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capBits; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    data.push(v);
  }
  return data;
}

function addEccAndInterleave(data, ver, ecc) {
  const e = ECC_INDEX[ecc];
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[e][ver];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[e][ver];
  const rawCodewords = Math.floor(rawDataModules(ver) / 8);
  const numShort = numBlocks - (rawCodewords % numBlocks);
  const shortLen = Math.floor(rawCodewords / numBlocks);
  const blocks = [];
  const div = rsDivisor(blockEccLen);
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const len = shortLen - blockEccLen + (i < numShort ? 0 : 1);
    const dat = data.slice(k, k + len);
    k += len;
    const eccBytes = rsRemainder(dat, div);
    if (i < numShort) dat.push(0);
    blocks.push(dat.concat(eccBytes));
  }
  const result = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((blk, j) => {
      if (i !== shortLen - blockEccLen || j >= numShort) result.push(blk[i]);
    });
  }
  return result;
}

// ---------- Matriz ----------
function makeMatrix(ver, codewords, ecc, forcedMask = -1) {
  const size = ver * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFn = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFn = (x, y, dark) => { modules[y][x] = dark; isFn[y][x] = true; };

  for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, d !== 2 && d !== 4);
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const al = alignmentPositions(ver);
  al.forEach((cy, i) => al.forEach((cx, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      setFn(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }));

  const drawFormat = (mask) => {
    const bits = formatBits(ecc, mask);
    for (let i = 0; i <= 5; i++) setFn(8, i, bit(bits, i));
    setFn(8, 7, bit(bits, 6)); setFn(8, 8, bit(bits, 7)); setFn(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(bits, i));
    setFn(8, size - 8, true);
  };
  drawFormat(0); // reserva as áreas
  if (ver >= 7) {
    const bits = versionBits(ver);
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3), b = Math.floor(i / 3);
      setFn(a, b, bit(bits, i)); setFn(b, a, bit(bits, i));
    }
  }

  // Zigue-zague de dados
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
        if (!isFn[y][x] && i < codewords.length * 8) {
          modules[y][x] = bit(codewords[i >>> 3], 7 - (i & 7));
          i++;
        }
      }
    }
  }

  const applyMask = (mask) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let inv;
      switch (mask) {
        case 0: inv = (x + y) % 2 === 0; break;
        case 1: inv = y % 2 === 0; break;
        case 2: inv = x % 3 === 0; break;
        case 3: inv = (x + y) % 3 === 0; break;
        case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
        case 5: inv = ((x * y) % 2) + ((x * y) % 3) === 0; break;
        case 6: inv = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        default: inv = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
      }
      if (!isFn[y][x] && inv) modules[y][x] = !modules[y][x];
    }
  };

  let best = 0, bestScore = Infinity;
  for (let m = 0; m < 8 && forcedMask < 0; m++) {
    applyMask(m); drawFormat(m);
    const s = penalty(modules);
    if (s < bestScore) { bestScore = s; best = m; }
    applyMask(m); // desfaz (XOR)
  }
  if (forcedMask >= 0) best = forcedMask;
  applyMask(best); drawFormat(best);
  return { size, modules, mask: best };
}

function penalty(modules) {
  const n = modules.length;
  let score = 0;
  const lines = [];
  for (let y = 0; y < n; y++) lines.push(modules[y].map((v) => (v ? '1' : '0')).join(''));
  for (let x = 0; x < n; x++) lines.push(modules.map((r) => (r[x] ? '1' : '0')).join(''));
  const finderRe = /(?=(00001011101|10111010000))/g;
  for (const l of lines) {
    for (const m of l.matchAll(/0{5,}|1{5,}/g)) score += 3 + (m[0].length - 5);
    score += 40 * [...l.matchAll(finderRe)].length;
  }
  let dark = 0;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (modules[y][x]) dark++;
      if (x < n - 1 && y < n - 1) {
        const c = modules[y][x];
        if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3;
      }
    }
  }
  const total = n * n;
  score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return score;
}

/**
 * Gera um QR Code.
 * @param {string} text conteúdo (UTF-8)
 * @param {{ecc?: 'L'|'M'|'Q'|'H', boostEcc?: boolean}} [opts]
 * @returns {{size:number, version:number, ecc:string, mask:number, modules:boolean[][]}}
 */
export function encodeQR(text, { ecc = 'M', boostEcc = false, mask: forcedMask = -1 } = {}) {
  if (!(ecc in ECC_INDEX)) throw new RangeError('Nível de correção inválido.');
  const bytes = utf8(String(text));
  if (bytes.length === 0) throw new RangeError('O conteúdo está vazio.');
  let ver = 0;
  for (let v = 1; v <= 40; v++) {
    const needed = 4 + (v <= 9 ? 8 : 16) + bytes.length * 8;
    if (needed <= dataCodewords(v, ecc) * 8) { ver = v; break; }
  }
  if (!ver) throw new RangeError('Conteúdo grande demais para um QR Code.');
  let level = ecc;
  if (boostEcc) {
    for (const cand of ['Q', 'H']) {
      if (ECC_INDEX[cand] > ECC_INDEX[level] && 4 + (ver <= 9 ? 8 : 16) + bytes.length * 8 <= dataCodewords(ver, cand) * 8) level = cand;
    }
  }
  const codewords = addEccAndInterleave(buildCodewords(bytes, ver, level), ver, level);
  const { size, modules, mask } = makeMatrix(ver, codewords, level, forcedMask);
  return { size, version: ver, ecc: level, mask, modules };
}

// ---------- Renderização ----------
/**
 * Desenha em um canvas (fundo branco, módulos pretos, zona de silêncio de 4 módulos).
 * Com `exact`, o canvas tem exatamente `targetPx` pixels (bordas dos módulos arredondadas);
 * sem `exact`, usa escala inteira, que garante módulos idênticos (melhor para a pré-visualização).
 */
export function drawQR(canvas, qr, targetPx = 512, quiet = 4, exact = false) {
  const total = qr.size + quiet * 2;
  const scale = exact ? targetPx / total : Math.max(1, Math.floor(targetPx / total));
  const px = exact ? targetPx : total * scale;
  canvas.width = px; canvas.height = px;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = '#000000';
  for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) {
    if (!qr.modules[y][x]) continue;
    const x0 = Math.round((x + quiet) * scale), x1 = Math.round((x + quiet + 1) * scale);
    const y0 = Math.round((y + quiet) * scale), y1 = Math.round((y + quiet + 1) * scale);
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  return px;
}

/** Serializa como SVG. */
export function qrToSvg(qr, quiet = 4) {
  const total = qr.size + quiet * 2;
  let d = '';
  for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) {
    if (qr.modules[y][x]) d += `M${x + quiet},${y + quiet}h1v1h-1z`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
