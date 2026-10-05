import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/Topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useConcurso } from "@/contexts/ConcursoContext";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, CheckCircle2, Loader2, Calendar, Sparkles,
  AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, Hourglass,
} from "lucide-react";
import {
  planSessions, cargaDiaria, startOfDay, addDays, ymd, type TopicoLite,
} from "@/lib/cronograma";

export const Route = createFileRoute("/_app/cronograma")({
  head: () => ({ meta: [{ title: "Cronograma — AprovaIA" }] }),
  component: Cronograma,
});

interface Session {
  id: string;
  subject: string;
  scheduled_at: string;
  duration_min: number;
  status: string;
  notes: string | null;
  tipo: string;
  topico_id: string | null;
}

const HORIZONTE_PRE_EDITAL = 90; // dias

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

function Cronograma() {
  const { profile, user } = useProfile();
  const { active, status, examDate } = useConcurso();
  const [items, setItems] = useState<Session[]>([]);
  const [pendentes, setPendentes] = useState<TopicoLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);

  const hoursPerDay = profile?.hours_per_day ?? 4;
  const minutosPorTopico = (profile as any)?.minutos_por_topico ?? 60;
  const concursoId = active?.concurso.id ?? null;
  const editalId = active?.edital?.id ?? null;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: sess } = await supabase
      .from("study_sessions")
      .select("id, subject, scheduled_at, duration_min, status, notes, tipo, topico_id")
      .order("scheduled_at", { ascending: true });
    const sessions = (sess as Session[]) ?? [];
    setItems(sessions);

    // Tópicos pendentes = do edital vigente, não concluídos e sem sessão.
    if (editalId) {
      const [{ data: tops }, { data: prog }] = await Promise.all([
        supabase.from("edital_topicos").select("id, titulo, materia:edital_materias(nome)").eq("edital_id", editalId).order("ordem"),
        supabase.from("user_topico_progresso").select("topico_id").eq("concluido", true),
      ]);
      const concluidos = new Set((prog ?? []).map((p) => p.topico_id));
      const comSessao = new Set(sessions.map((s) => s.topico_id).filter(Boolean) as string[]);
      const pend = (tops ?? [])
        .filter((t: any) => !concluidos.has(t.id) && !comSessao.has(t.id))
        .map((t: any) => ({ id: t.id as string, titulo: t.titulo as string, materia: (t.materia?.nome as string) ?? "—" }));
      setPendentes(pend);
    } else {
      setPendentes([]);
    }
    setLoading(false);
  }, [user, editalId]);

  useEffect(() => { load(); }, [load]);

  const today = startOfDay(new Date());
  const horizonEnd = examDate ? startOfDay(new Date(examDate)) : addDays(today, HORIZONTE_PRE_EDITAL);

  // ---- geração automática ----
  async function gerar() {
    if (!user || !concursoId) return;
    if (pendentes.length === 0) {
      toast.info("Todos os tópicos do edital já estão no cronograma ou concluídos.");
      return;
    }
    setWorking(true);
    const planned = planSessions({
      topicos: pendentes,
      start: today,
      end: horizonEnd < today ? addDays(today, HORIZONTE_PRE_EDITAL) : horizonEnd,
      hoursPerDay,
      minutosPorTopico,
    });
    const rows = planned.map((p) => ({ ...p, user_id: user.id, concurso_id: concursoId }));
    const { error } = await supabase.from("study_sessions").insert(rows);
    setWorking(false);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} sessões adicionadas ao cronograma.`);
    load();
  }

  // ---- reorganização de atrasadas (meta não cumprida) ----
  const overdue = items.filter((s) => s.status === "pending" && ymd(new Date(s.scheduled_at)) < ymd(today));

  async function reorganizar() {
    if (!user || overdue.length === 0) return;
    setWorking(true);

    const { porDiaPorHoras } = cargaDiaria({
      start: today, end: horizonEnd < today ? addDays(today, HORIZONTE_PRE_EDITAL) : horizonEnd,
      hoursPerDay, minutosPorTopico, totalTopicos: 0,
    });

    // Conta sessões pendentes já agendadas por dia (de hoje em diante).
    const countByDay = new Map<string, number>();
    items
      .filter((s) => s.status === "pending" && ymd(new Date(s.scheduled_at)) >= ymd(today))
      .forEach((s) => {
        const k = ymd(new Date(s.scheduled_at));
        countByDay.set(k, (countByDay.get(k) ?? 0) + 1);
      });

    const updates: { id: string; scheduled_at: string }[] = [];
    for (const s of overdue) {
      // Acha o primeiro dia (de hoje em diante) com vaga.
      let d = today;
      for (let i = 0; i < 365; i++) {
        const k = ymd(d);
        if ((countByDay.get(k) ?? 0) < porDiaPorHoras) {
          countByDay.set(k, (countByDay.get(k) ?? 0) + 1);
          const novo = startOfDay(d);
          novo.setHours(8, 0, 0, 0);
          updates.push({ id: s.id, scheduled_at: novo.toISOString() });
          break;
        }
        d = addDays(d, 1);
      }
    }

    for (const u of updates) {
      await supabase.from("study_sessions").update({ scheduled_at: u.scheduled_at }).eq("id", u.id);
    }
    setWorking(false);
    toast.warning(`Meta não cumprida: ${updates.length} sessão(ões) reorganizadas para os próximos dias.`);
    load();
  }

  async function toggleDone(s: Session) {
    const newStatus = s.status === "done" ? "pending" : "done";
    const { error } = await supabase.from("study_sessions").update({ status: newStatus }).eq("id", s.id);
    if (error) return toast.error(error.message);
    // Ao concluir um tópico novo, registra progresso (alimenta o Dashboard).
    if (s.topico_id && user) {
      if (newStatus === "done") {
        await supabase.from("user_topico_progresso").upsert(
          { user_id: user.id, topico_id: s.topico_id, concluido: true },
          { onConflict: "user_id,topico_id" },
        );
      } else {
        await supabase.from("user_topico_progresso").delete().eq("user_id", user.id).eq("topico_id", s.topico_id);
      }
    }
    load();
  }

  async function moveDay(s: Session, delta: number) {
    const d = new Date(s.scheduled_at);
    d.setDate(d.getDate() + delta);
    const { error } = await supabase.from("study_sessions").update({ scheduled_at: d.toISOString() }).eq("id", s.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("study_sessions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Sessão removida.");
    load();
  }

  function openCreate() {
    setEditing({
      id: "", subject: "", scheduled_at: toLocalInput(new Date().toISOString()),
      duration_min: 60, status: "pending", notes: "", tipo: "manual", topico_id: null,
    });
    setOpen(true);
  }
  function openEdit(s: Session) {
    setEditing({ ...s, scheduled_at: toLocalInput(s.scheduled_at) });
    setOpen(true);
  }

  // Agrupa por dia (apenas de hoje em diante; atrasadas vão no aviso).
  const upcoming = items.filter((s) => ymd(new Date(s.scheduled_at)) >= ymd(today));
  const byDay = new Map<string, Session[]>();
  upcoming.forEach((s) => {
    const k = ymd(new Date(s.scheduled_at));
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(s);
  });
  const days = Array.from(byDay.keys()).sort();

  return (
    <>
      <Topbar title="Cronograma" subtitle="Suas matérias do dia, geradas pelo edital" />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        {/* Cabeçalho / geração */}
        <Card className="border-border glass">
          <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">
                {active ? active.concurso.nome : "Nenhum concurso selecionado"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {!active
                  ? "Escolha um concurso no topo para montar o cronograma."
                  : status === "pre_edital"
                    ? `Modo PRÉ-EDITAL — ritmo leve, horizonte de ${HORIZONTE_PRE_EDITAL} dias.`
                    : `Prova em ${ymd(horizonEnd)} • ${pendentes.length} tópico(s) pendente(s)`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" /> Sessão manual
              </Button>
              <Button
                onClick={gerar}
                disabled={working || !active || !editalId || pendentes.length === 0}
                className="bg-gradient-primary text-primary-foreground shadow-glow"
              >
                {working ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                Gerar automático
              </Button>
            </div>
          </CardContent>
        </Card>

        {active && status === "pre_edital" && (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="flex items-center gap-3 p-4 text-sm">
              <Hourglass className="h-5 w-5 shrink-0 text-warning" />
              <span>
                Concurso em <strong>PRÉ-EDITAL</strong>: sem data de prova. Foque em ver o máximo de material;
                o cronograma usa um horizonte de {HORIZONTE_PRE_EDITAL} dias e será recalculado quando o edital sair.
              </span>
            </CardContent>
          </Card>
        )}

        {!editalId && active && (
          <Card className="border-dashed border-border bg-card/40">
            <CardContent className="p-5 text-sm text-muted-foreground">
              Este concurso ainda não tem um edital vigente com tópicos. Peça ao admin para cadastrar o edital —
              aí o cronograma automático fica disponível.
            </CardContent>
          </Card>
        )}

        {/* Aviso de meta não cumprida */}
        {overdue.length > 0 && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
                <div className="text-sm">
                  <strong>{overdue.length} sessão(ões) não concluída(s)</strong> de dias anteriores.
                  A meta desses dias não foi cumprida.
                </div>
              </div>
              <Button variant="outline" onClick={reorganizar} disabled={working}>
                {working ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
                Reorganizar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Agenda */}
        {loading ? (
          <div className="grid place-items-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : days.length === 0 ? (
          <Card className="border-dashed border-border bg-card/40">
            <CardContent className="grid place-items-center gap-3 p-10 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground" />
              <div>
                <div className="font-semibold">Cronograma vazio</div>
                <p className="text-sm text-muted-foreground">
                  {active && editalId
                    ? "Clique em \"Gerar automático\" para distribuir os tópicos do edital."
                    : "Selecione um concurso com edital para gerar, ou crie sessões manuais."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {days.map((dayKey) => (
              <DayCard
                key={dayKey}
                dayKey={dayKey}
                sessions={byDay.get(dayKey)!}
                metaHoras={hoursPerDay}
                onToggle={toggleDone}
                onMove={moveDay}
                onEdit={openEdit}
                onRemove={remove}
              />
            ))}
          </div>
        )}

        <SessionDialog
          open={open}
          onOpenChange={setOpen}
          session={editing}
          userId={user?.id}
          concursoId={concursoId}
          onSaved={() => { setOpen(false); load(); }}
        />
      </main>
    </>
  );
}

function DayCard({
  dayKey, sessions, metaHoras, onToggle, onMove, onEdit, onRemove,
}: {
  dayKey: string;
  sessions: Session[];
  metaHoras: number;
  onToggle: (s: Session) => void;
  onMove: (s: Session, delta: number) => void;
  onEdit: (s: Session) => void;
  onRemove: (id: string) => void;
}) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const isToday = ymd(new Date()) === dayKey;
  const totalMin = sessions.reduce((a, s) => a + s.duration_min, 0);
  const doneMin = sessions.filter((s) => s.status === "done").reduce((a, s) => a + s.duration_min, 0);

  return (
    <Card className={`border-border ${isToday ? "glass shadow-glow" : "bg-card/60"}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {isToday && <Badge className="bg-primary/15 text-primary">Hoje</Badge>}
          <span className="capitalize">
            {date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" })}
          </span>
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {(doneMin / 60).toFixed(1)}h / {(totalMin / 60).toFixed(1)}h • meta {metaHoras}h
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        {sessions.map((s) => (
          <div key={s.id} className="flex flex-col gap-2 rounded-xl border border-border bg-background/40 p-3 sm:flex-row sm:items-center">
            <button onClick={() => onToggle(s)} className="shrink-0" aria-label="Concluir">
              <CheckCircle2 className={`h-5 w-5 ${s.status === "done" ? "text-success" : "text-muted-foreground"}`} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-sm font-medium ${s.status === "done" ? "text-muted-foreground line-through" : ""}`}>
                  {s.subject}
                </span>
                {s.tipo === "revisao" && <Badge variant="secondary" className="text-[10px]">Revisão</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(s.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} • {s.duration_min} min
                {s.notes && ` • ${s.notes}`}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onMove(s, -1)} aria-label="Dia anterior"><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onMove(s, 1)} aria-label="Próximo dia"><ChevronRight className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(s)} aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onRemove(s.id)}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SessionDialog({
  open, onOpenChange, session, userId, concursoId, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: Session | null;
  userId: string | undefined;
  concursoId: string | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Session | null>(session);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(session); }, [session]);

  async function save() {
    if (!form || !userId) return;
    if (!form.subject.trim()) return toast.error("Informe a matéria.");
    setSaving(true);
    const payload = {
      subject: form.subject,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_min: Number(form.duration_min) || 60,
      status: form.status,
      notes: form.notes || null,
    };
    const { error } = form.id
      ? await supabase.from("study_sessions").update(payload).eq("id", form.id)
      : await supabase.from("study_sessions").insert({ ...payload, user_id: userId, concurso_id: concursoId, tipo: "manual" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Sessão atualizada." : "Sessão criada.");
    onSaved();
  }

  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{form.id ? "Editar sessão" : "Nova sessão"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Matéria / tópico</Label>
            <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Ex: Direito Constitucional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data / hora</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Duração (min)</Label>
              <Input type="number" min={5} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Tópicos, material, observações..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
