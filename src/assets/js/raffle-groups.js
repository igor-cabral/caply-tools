// Formação aleatória de equipes/grupos (sem DOM).
import { cryptoUint32, shuffle } from './raffle-lib.js';

/** Calcula os tamanhos das equipes (diferença máxima de 1 pessoa entre elas). */
export function planTeams(n, { mode, value }) {
  if (!Number.isInteger(value) || value < 1) {
    return { ok: false, error: mode === 'teams' ? 'Informe quantas equipes quer (número inteiro maior que zero).' : 'Informe quantas pessoas por equipe (número inteiro maior que zero).' };
  }
  if (n < 2) return { ok: false, error: 'Adicione pelo menos 2 participantes para formar equipes.' };
  let teams;
  if (mode === 'teams') {
    if (value > n) return { ok: false, error: `Você pediu ${value} equipes, mas há apenas ${n} participantes.` };
    teams = value;
  } else {
    if (value > n) return { ok: false, error: `Você pediu ${value} pessoas por equipe, mas há apenas ${n} participantes.` };
    teams = Math.ceil(n / value);
  }
  const base = Math.floor(n / teams);
  const extra = n % teams;
  const sizes = Array.from({ length: teams }, (_, i) => base + (i < extra ? 1 : 0));
  return { ok: true, teams, sizes };
}

const key = (s) => s.toLocaleLowerCase('pt-BR');

/**
 * Lê restrições. Cada linha lista pessoas que NÃO podem ficar na mesma equipe,
 * separadas por vírgula, ponto e vírgula ou barra vertical.
 * @returns {{groups:number[][], unknown:string[], ignored:number}} índices em `names`
 */
export function parseSeparations(text, names) {
  const index = new Map(names.map((n, i) => [key(n), i]));
  const groups = [];
  const unknown = new Set();
  let ignored = 0;
  for (const raw of String(text ?? '').split(/\r\n|\r|\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/[,;|]/).map((p) => p.trim().replace(/\s+/g, ' ')).filter(Boolean);
    if (parts.length < 2) { ignored++; continue; }
    const ids = [];
    for (const p of parts) {
      const i = index.get(key(p));
      if (i === undefined) unknown.add(p); else if (!ids.includes(i)) ids.push(i);
    }
    if (ids.length >= 2) groups.push(ids); else ignored++;
  }
  return { groups, unknown: [...unknown], ignored };
}

function deal(order, sizes) {
  const teams = [];
  let k = 0;
  for (const s of sizes) { teams.push(order.slice(k, k + s)); k += s; }
  return teams;
}

/**
 * Divide `names` em equipes com os `sizes` dados, respeitando `groups` (separações).
 * Sem restrições: embaralha e distribui (uniforme). Com restrições: tenta sorteios
 * com rejeição (uniformes) e, se falhar, busca completa — que prova quando é impossível.
 * @returns {{ok:true, teams:string[][]}|{ok:false, error:string}}
 */
export function splitTeams(names, sizes, groups = [], source = cryptoUint32) {
  const n = names.length;
  const t = sizes.length;
  if (sizes.reduce((a, b) => a + b, 0) !== n) throw new RangeError('Os tamanhos não somam o número de participantes.');
  const sizeOrder = shuffle(sizes, source); // quem recebe a equipe maior varia

  if (groups.length === 0) {
    return { ok: true, teams: deal(shuffle(names, source), sizeOrder) };
  }

  const tooBig = groups.find((g) => g.length > t);
  if (tooBig) {
    return { ok: false, error: `Há ${tooBig.length} pessoas que não podem ficar juntas (${tooBig.slice(0, 4).map((i) => names[i]).join(', ')}${tooBig.length > 4 ? '…' : ''}), mas só há ${t} equipe${t === 1 ? '' : 's'}. Reduza as restrições ou crie mais equipes.` };
  }
  const conflict = Array.from({ length: n }, () => new Set());
  for (const g of groups) for (const a of g) for (const b of g) if (a !== b) conflict[a].add(b);

  const valid = (teamsIdx) => teamsIdx.every((team) => team.every((a, i) => team.every((b, j) => i === j || !conflict[a].has(b))));
  const idx = names.map((_, i) => i);

  // 1) Rejeição: mantém a distribuição uniforme entre as divisões válidas.
  for (let attempt = 0; attempt < 400; attempt++) {
    const cand = deal(shuffle(idx, source), sizeOrder);
    if (valid(cand)) return { ok: true, teams: cand.map((tm) => tm.map((i) => names[i])) };
  }

  // 2) Busca completa com ordem aleatória (encontra solução se existir).
  const order = shuffle(idx, source).sort((a, b) => conflict[b].size - conflict[a].size);
  const teamsIdx = Array.from({ length: t }, () => []);
  const room = sizeOrder.slice();
  let nodes = 0;
  const LIMIT = 300000;
  let hitLimit = false;
  const place = (k) => {
    if (k === order.length) return true;
    if (++nodes > LIMIT) { hitLimit = true; return false; }
    const p = order[k];
    const tryOrder = shuffle(Array.from({ length: t }, (_, i) => i), source);
    const seenEmpty = new Set();
    for (const ti of tryOrder) {
      if (room[ti] === 0) continue;
      if (teamsIdx[ti].some((q) => conflict[p].has(q))) continue;
      if (teamsIdx[ti].length === 0) { // equipes vazias do mesmo tamanho são equivalentes
        if (seenEmpty.has(room[ti])) continue;
        seenEmpty.add(room[ti]);
      }
      teamsIdx[ti].push(p); room[ti]--;
      if (place(k + 1)) return true;
      teamsIdx[ti].pop(); room[ti]++;
      if (hitLimit) return false;
    }
    return false;
  };
  if (place(0)) return { ok: true, teams: teamsIdx.map((tm) => tm.map((i) => names[i])) };
  return hitLimit
    ? { ok: false, error: 'Não consegui encontrar uma divisão que cumpra todas as restrições em tempo razoável. Tente reduzir as restrições.' }
    : { ok: false, error: 'Com essas restrições não existe divisão possível nesse formato de equipes. Reduza as restrições ou mude o número de equipes.' };
}

