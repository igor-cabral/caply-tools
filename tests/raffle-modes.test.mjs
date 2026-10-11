import test from 'node:test';
import assert from 'node:assert/strict';
import { shuffle, drawNames, drawNumbers, drawOrder, validateNumberDraw, validateParticipants, applyExclusions, LIMITS } from '../src/assets/js/raffle-lib.js';
import { planTeams, parseSeparations, splitTeams } from '../src/assets/js/raffle-groups.js';
import { makePairs, makeBracket } from '../src/assets/js/raffle-bracket.js';
import { resultToText, resultToCsv, csvCell, resultTitle } from '../src/assets/js/raffle-export.js';

function xorshift(seed = 2463534242) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s; };
}
const chi2 = (counts, expected) => counts.reduce((a, c) => a + ((c - expected) ** 2) / expected, 0);
const range = (n, f = (i) => `P${i + 1}`) => Array.from({ length: n }, (_, i) => f(i));

// ---------- embaralhar / nomes / ordem ----------
test('shuffle é uma permutação e não altera a entrada', () => {
  const a = range(20); const b = shuffle(a);
  assert.deepEqual([...b].sort(), [...a].sort());
  assert.deepEqual(a, range(20));
});
test('ordem: as 6 permutações de 3 elementos são equiprováveis', () => {
  const src = xorshift(7); const m = new Map(); const N = 60000;
  for (let i = 0; i < N; i++) { const k = drawOrder(['a', 'b', 'c'], src).join(''); m.set(k, (m.get(k) || 0) + 1); }
  assert.equal(m.size, 6); assert.ok(chi2([...m.values()], N / 6) < 20.5);
});
test('nomes com repetição: sorteia com reposição e é uniforme', () => {
  const src = xorshift(11); const counts = [0, 0, 0, 0]; const N = 40000;
  const out = drawNames(['a', 'b', 'c', 'd'], N > 10000 ? 10000 : N, { repeat: true, source: src });
  out.forEach((x) => counts['abcd'.indexOf(x)]++);
  assert.equal(out.length, 10000); assert.ok(chi2(counts, 2500) < 16.3, `chi2=${chi2(counts, 2500)}`);
  assert.equal(drawNames(['x'], 5, { repeat: true }).length, 5, 'pode pedir mais que a lista');
});
test('nomes sem repetição continua exigindo count <= lista', () => {
  assert.throws(() => drawNames(['a', 'b'], 3, { repeat: false }), RangeError);
  assert.throws(() => drawNames([], 1, { repeat: true }), RangeError);
  assert.throws(() => drawNames(['a'], LIMITS.maxCount + 1, { repeat: true }), RangeError);
});
test('exclusões removem nomes sem diferenciar maiúsculas', () => {
  assert.deepEqual(applyExclusions(['Ana', 'Bruno', 'Carla'], ' bruno \n\nDIEGO'), { names: ['Ana', 'Carla'], removed: 1 });
});
test('validateParticipants: mínimo, máximo e nomes enormes', () => {
  assert.equal(validateParticipants([]).ok, false);
  assert.match(validateParticipants(['a'], { min: 2 }).error, /pelo menos 2/);
  assert.equal(validateParticipants(range(LIMITS.maxParticipants + 1)).ok, false);
  assert.equal(validateParticipants(['x'.repeat(LIMITS.maxNameLength + 1)]).ok, false);
  assert.equal(validateParticipants(['a', 'b'], { min: 2 }).ok, true);
});

// ---------- números ----------
test('números sem repetição: únicos, dentro do intervalo, inclusive negativos', () => {
  for (let k = 0; k < 50; k++) {
    const v = drawNumbers({ min: -5, max: 5, count: 8 });
    assert.equal(new Set(v).size, 8); v.forEach((x) => assert.ok(x >= -5 && x <= 5 && Number.isInteger(x)));
  }
});
test('números: pedir todos os valores devolve uma permutação do intervalo', () => {
  assert.deepEqual(drawNumbers({ min: 1, max: 10, count: 10 }).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(drawNumbers({ min: 7, max: 7, count: 1 }), [7]);
});
test('números: intervalo gigante é rápido e correto (Floyd, sem listar o intervalo)', () => {
  const t = performance.now();
  const v = drawNumbers({ min: 0, max: 2 ** 32 - 1, count: 5000 });
  assert.equal(new Set(v).size, 5000); assert.ok(performance.now() - t < 500);
  v.forEach((x) => assert.ok(x >= 0 && x <= 2 ** 32 - 1));
});
test('números: subconjuntos de 2 em 4 são equiprováveis e a ordem também (12 pares ordenados)', () => {
  const src = xorshift(5); const m = new Map(); const N = 60000;
  for (let i = 0; i < N; i++) { const k = drawNumbers({ min: 1, max: 4, count: 2 }, src).join(','); m.set(k, (m.get(k) || 0) + 1); }
  assert.equal(m.size, 12); assert.ok(chi2([...m.values()], N / 12) < 31.3, `chi2=${chi2([...m.values()], N / 12)}`);
});
test('números com repetição são uniformes e podem repetir', () => {
  const src = xorshift(21); const c = new Array(6).fill(0); const v = drawNumbers({ min: 1, max: 6, count: 10000, repeat: true }, src);
  v.forEach((x) => c[x - 1]++); assert.ok(chi2(c, 10000 / 6) < 20.5);
  assert.ok(new Set(drawNumbers({ min: 1, max: 2, count: 20, repeat: true })).size <= 2);
});
test('números: opção de ordenar', () => {
  const v = drawNumbers({ min: 1, max: 100, count: 30, sort: true }); assert.deepEqual(v, [...v].sort((a, b) => a - b));
});
test('números: validações com mensagens claras', () => {
  assert.match(validateNumberDraw({ min: 5, max: 1, count: 1 }).error, /menor número/);
  assert.match(validateNumberDraw({ min: 1, max: 5, count: 6, repeat: false }).error, /apenas 5/);
  assert.equal(validateNumberDraw({ min: 1, max: 5, count: 6, repeat: true }).ok, true);
  assert.equal(validateNumberDraw({ min: 1.5, max: 5, count: 1 }).ok, false);
  assert.equal(validateNumberDraw({ min: NaN, max: 5, count: 1 }).ok, false);
  assert.equal(validateNumberDraw({ min: 0, max: 2 ** 32, count: 1 }).ok, false, 'intervalo > 2^32');
  assert.equal(validateNumberDraw({ min: 1, max: 5, count: 0 }).ok, false);
  assert.equal(validateNumberDraw({ min: 1, max: 5, count: LIMITS.maxCount + 1, repeat: true }).ok, false);
  assert.throws(() => drawNumbers({ min: 9, max: 1, count: 1 }), RangeError);
});

// ---------- equipes ----------
test('planTeams: tamanhos somam n e diferem no máximo 1', () => {
  for (let n = 2; n <= 40; n++) for (let v = 1; v <= n; v++) for (const mode of ['teams', 'perTeam']) {
    const p = planTeams(n, { mode, value: v }); assert.ok(p.ok);
    assert.equal(p.sizes.reduce((a, b) => a + b, 0), n);
    assert.ok(Math.max(...p.sizes) - Math.min(...p.sizes) <= 1);
    assert.equal(p.teams, mode === 'teams' ? v : Math.ceil(n / v));
  }
  assert.deepEqual(planTeams(10, { mode: 'perTeam', value: 4 }).sizes, [4, 3, 3]);
});
test('planTeams: erros', () => {
  assert.match(planTeams(5, { mode: 'teams', value: 6 }).error, /apenas 5/);
  assert.equal(planTeams(1, { mode: 'teams', value: 1 }).ok, false);
  assert.equal(planTeams(5, { mode: 'teams', value: 0 }).ok, false);
  assert.equal(planTeams(5, { mode: 'perTeam', value: 2.5 }).ok, false);
  assert.equal(planTeams(5, { mode: 'perTeam', value: 6 }).ok, false);
});
test('splitTeams sem restrições: todos aparecem uma única vez, nos tamanhos pedidos', () => {
  for (let k = 0; k < 30; k++) {
    const names = range(23); const { sizes } = planTeams(23, { mode: 'teams', value: 5 });
    const r = splitTeams(names, sizes);
    assert.ok(r.ok); assert.deepEqual(r.teams.map((t) => t.length).sort(), [...sizes].sort());
    assert.deepEqual(r.teams.flat().sort(), [...names].sort());
  }
});
test('splitTeams: 4 pessoas em 2 duplas, as 3 divisões são equiprováveis', () => {
  const src = xorshift(3); const m = new Map(); const N = 30000;
  for (let i = 0; i < N; i++) {
    const r = splitTeams(['a', 'b', 'c', 'd'], [2, 2], [], src);
    const k = r.teams.map((t) => [...t].sort().join('')).sort().join('|'); m.set(k, (m.get(k) || 0) + 1);
  }
  assert.equal(m.size, 3); assert.ok(chi2([...m.values()], N / 3) < 13.8);
});
test('parseSeparations: linhas, separadores, nomes desconhecidos e linhas inválidas', () => {
  const names = ['Ana', 'Bruno', 'Carla', 'Diego'];
  const r = parseSeparations('Ana, bruno\nCarla | Diego | ana\nsó um\nZeca, Ana\n\n', names);
  assert.deepEqual(r.groups, [[0, 1], [2, 3, 0]]); assert.deepEqual(r.unknown, ['Zeca']); assert.equal(r.ignored, 2);
});
test('splitTeams com separações: sempre cumpre (varias rodadas)', () => {
  const names = range(12); const groups = [[0, 1], [2, 3, 4], [5, 6]];
  for (let k = 0; k < 40; k++) {
    const r = splitTeams(names, planTeams(12, { mode: 'teams', value: 3 }).sizes, groups);
    assert.ok(r.ok);
    for (const team of r.teams) for (const g of groups) assert.ok(g.filter((i) => team.includes(names[i])).length <= 1, 'separados');
    assert.deepEqual(r.teams.flat().sort(), [...names].sort());
  }
});
test('splitTeams: restrição apertada que só a busca completa resolve', () => {
  // 6 pessoas, 3 equipes de 2: A-B-C mutuamente separados e D-E-F mutuamente separados => cada equipe tem 1 de cada trio
  const names = ['A', 'B', 'C', 'D', 'E', 'F']; const groups = [[0, 1, 2], [3, 4, 5]];
  for (let k = 0; k < 20; k++) {
    const r = splitTeams(names, [2, 2, 2], groups, xorshift(100 + k));
    assert.ok(r.ok);
    r.teams.forEach((t) => assert.equal(t.filter((x) => 'ABC'.includes(x)).length, 1));
  }
});
test('splitTeams: impossibilidade é detectada e explicada', () => {
  const names = ['A', 'B', 'C', 'D'];
  const tooMany = splitTeams(names, [2, 2], [[0, 1, 2]]);
  assert.equal(tooMany.ok, false); assert.match(tooMany.error, /3 pessoas/);
  // impossível por tamanho: A-B, C-D, A-C, B-D, A-D, B-C (todos separados) com 2 equipes
  const all = splitTeams(names, [2, 2], [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]]);
  assert.equal(all.ok, false);
  assert.throws(() => splitTeams(names, [2, 3]), RangeError);
});

// ---------- confrontos e chaves ----------
test('makePairs: par e ímpar', () => {
  const p = makePairs(range(8)); assert.equal(p.pairs.length, 4); assert.equal(p.bye, null);
  const q = makePairs(range(7)); assert.equal(q.pairs.length, 3); assert.ok(q.bye);
  assert.deepEqual([...q.pairs.flat(), q.bye].sort(), range(7).sort());
  assert.throws(() => makePairs(['só']), RangeError);
});
test('makeBracket: propriedades para n de 2 a 70', () => {
  for (let n = 2; n <= 70; n++) {
    const names = range(n); const b = makeBracket(names);
    const size = 2 ** Math.ceil(Math.log2(n));
    assert.equal(b.size, size); assert.equal(b.byes, size - n);
    assert.equal(b.rounds.length, Math.log2(size));
    const games = b.rounds.flatMap((r) => r.matches); assert.equal(games.length, size - 1);
    assert.deepEqual(games.map((g) => g.no), range(size - 1, (i) => i + 1), 'numeração sequencial');
    const first = b.rounds[0].matches;
    assert.deepEqual(first.flatMap((m) => [m.a, m.b]).filter(Boolean).sort(), [...names].sort(), 'cada pessoa uma vez');
    assert.equal(first.filter((m) => m.bye).length, size - n);
    first.forEach((m) => assert.ok(m.a && (m.bye ? m.b === null : m.b), 'nunca folga contra folga'));
    // referências "Vencedor do jogo N" apontam para jogos da rodada anterior
    b.rounds.slice(1).forEach((r, ri) => r.matches.forEach((m) => [m.a, m.b].forEach((s) => {
      const mm = /^Vencedor do jogo (\d+)$/.exec(s);
      if (mm) assert.ok(b.rounds[ri].matches.some((g) => g.no === Number(mm[1]) && !g.bye));
      else assert.ok(b.rounds[ri].matches.some((g) => g.bye && g.a === s), 'quem tem folga entra com o nome');
    })));
  }
});
test('makeBracket: nomes das rodadas e limites', () => {
  assert.deepEqual(makeBracket(range(8)).rounds.map((r) => r.name), ['Quartas de final', 'Semifinais', 'Final']);
  assert.deepEqual(makeBracket(range(2)).rounds.map((r) => r.name), ['Final']);
  assert.equal(makeBracket(range(16)).rounds[0].name, 'Oitavas de final');
  assert.equal(makeBracket(range(32)).rounds[0].name, 'Rodada 1');
  assert.throws(() => makeBracket(['só']), RangeError);
  assert.throws(() => makeBracket(range(LIMITS.maxBracket + 1)), RangeError);
});
test('makeBracket: posição das folgas é distribuída (não ficam todas no topo)', () => {
  const pos = new Array(8).fill(0);
  for (let i = 0; i < 4000; i++) makeBracket(range(13)).rounds[0].matches.forEach((m, j) => { if (m.bye) pos[j]++; });
  const exp = (4000 * 3) / 8; assert.ok(chi2(pos, exp) < 24.3, `chi2=${chi2(pos, exp)}`); // df=7, p=0,001
});

// ---------- exportação ----------
test('csvCell neutraliza fórmulas e escapa aspas/ponto e vírgula', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('+55 48'), "'+55 48"); assert.equal(csvCell('-x'), "'-x"); assert.equal(csvCell('@a'), "'@a");
  assert.equal(csvCell('a;b'), '"a;b"'); assert.equal(csvCell('Ana'), 'Ana');
  assert.equal(csvCell(-5, { numeric: true }), '-5', 'número negativo legítimo não é alterado');
});
test('texto e CSV de cada tipo de resultado', () => {
  const when = new Date('2026-10-10T12:00:00Z');
  const names = { kind: 'names', winners: ['Ana', 'Bia'] };
  assert.match(resultToText(names, { when }), /^Sorteio de nomes\nRealizado em .+\n\n1\. Ana\n2\. Bia\n\nGerado no navegador.*Sem certificação/s);
  assert.equal(resultToText(names, { bare: true }), '1. Ana\n2. Bia');
  assert.equal(resultToCsv(names), 'posição;nome\r\n1;Ana\r\n2;Bia\r\n');
  assert.equal(resultToCsv({ kind: 'numbers', values: [-3, 7] }), 'posição;número\r\n1;-3\r\n2;7\r\n');
  const teams = { kind: 'teams', label: 'Equipe', teams: [['a', 'b'], ['c']] };
  assert.equal(resultToText(teams, { bare: true }), 'Equipe 1 (2):\n  - a\n  - b\n\nEquipe 2 (1):\n  - c');
  assert.equal(resultToCsv(teams), 'equipe;nome\r\nEquipe 1;a\r\nEquipe 1;b\r\nEquipe 2;c\r\n');
  assert.equal(resultTitle({ kind: 'teams', label: 'Grupo' }), 'Distribuição em grupos');
  const pairs = { kind: 'pairs', pairs: [['a', 'b']], bye: 'c' };
  assert.equal(resultToText(pairs, { bare: true }), 'Jogo 1: a x b\nDe folga: c');
  const br = { kind: 'bracket', rounds: [{ name: 'Semifinais', matches: [{ no: 1, a: 'a', b: 'b', bye: false }, { no: 2, a: 'c', b: null, bye: true }] }, { name: 'Final', matches: [{ no: 3, a: 'Vencedor do jogo 1', b: 'c', bye: false }] }] };
  assert.match(resultToText(br, { bare: true }), /Semifinais:\n {2}Jogo 1: a x b\n {2}Jogo 2: c \(avança direto\)\n\nFinal:\n {2}Jogo 3:/);
  assert.match(resultToCsv(br), /^rodada;jogo;participante A;participante B\r\nSemifinais;1;a;b\r\nSemifinais;2;c;\(avança direto\)\r\nFinal;3;Vencedor do jogo 1;c\r\n$/);
  assert.equal(resultToCsv({ kind: 'names', winners: ['=1+1'] }), "posição;nome\r\n1;'=1+1\r\n");
});
