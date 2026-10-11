// Formatação de resultados para copiar, imprimir e exportar (sem DOM).
// Formas de resultado: names | numbers | teams | order | pairs | bracket.

const NOTE = 'Gerado no navegador com números aleatórios do Web Crypto. Sem certificação ou auditoria oficial.';

export function formatDateTime(when = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(when);
}

const TITLES = { names: 'Sorteio de nomes', numbers: 'Sorteio de números', teams: 'Formação de equipes', order: 'Ordem sorteada', pairs: 'Confrontos sorteados', bracket: 'Chave eliminatória' };
export const resultTitle = (r) => (r.kind === 'teams' && r.label === 'Grupo' ? 'Distribuição em grupos' : TITLES[r.kind]);

/** Linhas do corpo do resultado em texto simples. */
export function bodyLines(r) {
  switch (r.kind) {
    case 'names': return r.winners.map((w, i) => `${i + 1}. ${w}`);
    case 'order': return r.items.map((w, i) => `${i + 1}. ${w}`);
    case 'numbers': return r.values.map((v, i) => `${i + 1}. ${v}`);
    case 'pairs': return [...r.pairs.map(([a, b], i) => `Jogo ${i + 1}: ${a} x ${b}`), ...(r.bye ? [`De folga: ${r.bye}`] : [])];
    case 'teams': return r.teams.flatMap((t, i) => [`${r.label} ${i + 1} (${t.length}):`, ...t.map((n) => `  - ${n}`), '']).slice(0, -1);
    case 'bracket': return r.rounds.flatMap((rd, i) => [`${rd.name}:`, ...rd.matches.map((m) => (m.bye ? `  Jogo ${m.no}: ${m.a} (avança direto)` : `  Jogo ${m.no}: ${m.a} x ${m.b}`)), ...(i < r.rounds.length - 1 ? [''] : [])]);
    default: return [];
  }
}

/** Texto para copiar. `bare` devolve só o corpo (sem cabeçalho). */
export function resultToText(r, { when = new Date(), bare = false } = {}) {
  const body = bodyLines(r).join('\n');
  if (bare) return body;
  return `${resultTitle(r)}\nRealizado em ${formatDateTime(when)}\n\n${body}\n\n${NOTE}`;
}

/** Evita injeção de fórmulas ao abrir no Excel/Planilhas (=, +, -, @, tab, CR no início). */
export function csvCell(value, { numeric = false } = {}) {
  let s = String(value ?? '');
  if (!numeric && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV com separador ponto e vírgula (padrão do Excel em português). */
export function resultToCsv(r) {
  const row = (cells) => cells.join(';');
  const c = (v) => csvCell(v);
  const lines = [];
  switch (r.kind) {
    case 'names': lines.push(row(['posição', 'nome']), ...r.winners.map((w, i) => row([i + 1, c(w)]))); break;
    case 'order': lines.push(row(['ordem', 'nome']), ...r.items.map((w, i) => row([i + 1, c(w)]))); break;
    case 'numbers': lines.push(row(['posição', 'número']), ...r.values.map((v, i) => row([i + 1, csvCell(v, { numeric: true })]))); break;
    case 'pairs': lines.push(row(['jogo', 'participante A', 'participante B']), ...r.pairs.map(([a, b], i) => row([i + 1, c(a), c(b)])), ...(r.bye ? [row(['folga', c(r.bye), ''])] : [])); break;
    case 'teams': lines.push(row([r.label.toLowerCase(), 'nome']), ...r.teams.flatMap((t, i) => t.map((n) => row([`${r.label} ${i + 1}`, c(n)])))); break;
    case 'bracket': lines.push(row(['rodada', 'jogo', 'participante A', 'participante B']), ...r.rounds.flatMap((rd) => rd.matches.map((m) => row([c(rd.name), m.no, c(m.a), m.bye ? c('(avança direto)') : c(m.b)])))); break;
    default: break;
  }
  return `${lines.join('\r\n')}\r\n`;
}
