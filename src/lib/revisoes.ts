/**
 * Regras de revisão por desempenho (Etapa 3).
 *
 * A revisão é "puxada" pelo desempenho: quanto pior o acerto, mais cedo o
 * conteúdo volta. Mapeia o % de acerto para um dos intervalos configurados
 * (padrão 2/4/7/15/30 dias). Puro (sem Supabase/React).
 */

export interface LogLite {
  subject: string;
  total: number;
  correct: number;
}

export interface Sugestao {
  subject: string;
  acerto_pct: number;
  intervalo_dias: number;
  due_date: string; // YYYY-MM-DD
}

const INTERVALOS_PADRAO = [2, 4, 7, 15, 30];

/** Escolhe o intervalo (em dias) conforme o % de acerto. */
export function intervaloPorDesempenho(pct: number, intervalos: number[] = INTERVALOS_PADRAO): number {
  const iv = intervalos.length >= 5 ? intervalos : INTERVALOS_PADRAO;
  if (pct < 40) return iv[0]; // ruim → volta logo (~2 dias)
  if (pct < 60) return iv[1];
  if (pct < 75) return iv[2];
  if (pct < 90) return iv[3];
  return iv[4]; // ótimo → volta tarde (~30 dias)
}

function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Gera sugestões de revisão a partir dos logs de questões, agregados por
 * matéria. Ignora matérias que já têm revisão pendente.
 */
export function sugerirRevisoes(
  logs: LogLite[],
  opts: { intervalos?: number[]; jaPendentes?: Set<string>; hoje?: Date } = {},
): Sugestao[] {
  const intervalos = opts.intervalos ?? INTERVALOS_PADRAO;
  const jaPendentes = opts.jaPendentes ?? new Set<string>();
  const hoje = opts.hoje ?? new Date();

  const agg = new Map<string, { total: number; correct: number }>();
  for (const l of logs) {
    const a = agg.get(l.subject) ?? { total: 0, correct: 0 };
    a.total += l.total;
    a.correct += l.correct;
    agg.set(l.subject, a);
  }

  const out: Sugestao[] = [];
  for (const [subject, v] of agg) {
    if (v.total <= 0) continue;
    if (jaPendentes.has(subject.toLowerCase())) continue;
    const pct = Math.round((v.correct / v.total) * 100);
    const intervalo = intervaloPorDesempenho(pct, intervalos);
    const due = new Date(hoje);
    due.setDate(due.getDate() + intervalo);
    out.push({ subject, acerto_pct: pct, intervalo_dias: intervalo, due_date: ymdLocal(due) });
  }
  // Pior desempenho primeiro (revisão mais urgente no topo).
  return out.sort((a, b) => a.acerto_pct - b.acerto_pct);
}
