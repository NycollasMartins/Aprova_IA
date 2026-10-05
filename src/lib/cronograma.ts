/**
 * Lógica pura de agendamento do cronograma (Etapa 3).
 *
 * Gera/redistribui sessões de estudo a partir dos tópicos do edital vigente,
 * respeitando as horas/dia do aluno. Mantido puro (sem Supabase/React) para
 * ser testável e reutilizável pela tela de Cronograma.
 */

export interface TopicoLite {
  id: string;
  titulo: string;
  materia: string;
}

export interface PlannedSession {
  topico_id: string;
  subject: string;
  scheduled_at: string; // ISO
  duration_min: number;
  status: "pending";
  tipo: "novo";
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** YYYY-MM-DD no fuso LOCAL (não usar toISOString, que converte p/ UTC). */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

/** ISO de um horário local: dia `date` + offset de minutos a partir das 08:00. */
function isoAt(date: Date, offsetMin: number): string {
  const d = startOfDay(date);
  d.setMinutes(8 * 60 + offsetMin);
  return d.toISOString();
}

export interface PlanOptions {
  topicos: TopicoLite[]; // tópicos pendentes (não concluídos, sem sessão), na ordem
  start: Date;
  end: Date; // horizonte (data da prova ou hoje+90 em pré-edital)
  hoursPerDay: number;
  minutosPorTopico: number;
}

/**
 * Distribui os tópicos pendentes pelos dias entre `start` e `end`.
 * Capacidade por dia vem das horas/dia; se o horizonte for curto, aumenta a
 * carga diária para caber tudo (a tela avisa quando isso acontece).
 */
export function planSessions(opts: PlanOptions): PlannedSession[] {
  const { topicos, start, end, hoursPerDay, minutosPorTopico } = opts;
  if (topicos.length === 0) return [];

  const dur = Math.max(15, Math.round(minutosPorTopico));
  const capacidadeMin = Math.max(dur, Math.round((hoursPerDay || 1) * 60));
  const porDiaPorHoras = Math.max(1, Math.floor(capacidadeMin / dur));

  const dias = Math.max(1, diffDays(end, start) + 1);
  const porDiaParaCaber = Math.ceil(topicos.length / dias);
  const porDia = Math.max(porDiaPorHoras, porDiaParaCaber);

  const out: PlannedSession[] = [];
  topicos.forEach((t, i) => {
    const diaIndex = Math.floor(i / porDia);
    const posicaoNoDia = i % porDia;
    const date = addDays(start, diaIndex);
    out.push({
      topico_id: t.id,
      subject: `${t.materia} — ${t.titulo}`,
      scheduled_at: isoAt(date, posicaoNoDia * dur),
      duration_min: dur,
      status: "pending",
      tipo: "novo",
    });
  });
  return out;
}

/** Quantos tópicos por dia a carga atual exige (p/ aviso de carga pesada). */
export function cargaDiaria(opts: Omit<PlanOptions, "topicos"> & { totalTopicos: number }): {
  porDia: number;
  porDiaPorHoras: number;
  sobrecarregado: boolean;
} {
  const dur = Math.max(15, Math.round(opts.minutosPorTopico));
  const capacidadeMin = Math.max(dur, Math.round((opts.hoursPerDay || 1) * 60));
  const porDiaPorHoras = Math.max(1, Math.floor(capacidadeMin / dur));
  const dias = Math.max(1, diffDays(opts.end, opts.start) + 1);
  const porDiaParaCaber = Math.ceil(opts.totalTopicos / dias);
  const porDia = Math.max(porDiaPorHoras, porDiaParaCaber);
  return { porDia, porDiaPorHoras, sobrecarregado: porDia > porDiaPorHoras };
}
