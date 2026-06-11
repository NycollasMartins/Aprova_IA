import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/Topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useArea, AREAS } from "@/contexts/ThemeContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AreaDecor, AREA_META } from "@/components/AreaAmbience";
import {
  CalendarDays, CheckCircle2, ChevronRight, Flame, ListChecks, RefreshCw,
  Sparkles, Target, Timer, TrendingUp,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — AprovaIA" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { area } = useArea();
  const { profile, loading, effectiveId } = useProfile();
  const areaLabel = AREAS.find((a) => a.id === area)?.label ?? "Neutro";
  const meta = AREA_META[area];
  const AreaIcon = meta.icon;

  const [sessions, setSessions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [revs, setRevs] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const load = useCallback(async () => {
    if (!effectiveId) return;
    setDataLoading(true);
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const [s, l, r] = await Promise.all([
      supabase.from("study_sessions").select("*").gte("scheduled_at", since).order("scheduled_at"),
      supabase.from("question_logs").select("*").gte("logged_at", since),
      supabase.from("revisions").select("*").eq("completed", false).order("due_date").limit(5),
    ]);
    const err = s.error || l.error || r.error;
    if (err) toast.error("Erro ao carregar dados: " + err.message);
    setSessions(s.data ?? []);
    setLogs(l.data ?? []);
    setRevs(r.data ?? []);
    setDataLoading(false);
  }, [effectiveId]);

  useEffect(() => { load(); }, [load]);

  if (loading || dataLoading) {
    return <div className="grid flex-1 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const greeting = profile?.display_name ? `Olá, ${profile.display_name}` : "Olá";
  const concursoLabel = profile?.target_concurso ?? "Concurso ainda não definido";
  const daysLeft = profile?.exam_date
    ? Math.max(0, Math.ceil((new Date(profile.exam_date).getTime() - Date.now()) / 86400000))
    : null;
  const metaDiaria = profile?.hours_per_day ?? 4;

  // derived
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter((s) => s.scheduled_at.slice(0, 10) === todayStr);
  const doneToday = todaySessions.filter((s) => s.status === "done");
  const hoursThisWeek = sessions
    .filter((s) => s.status === "done")
    .reduce((a, s) => a + (s.duration_min || 0), 0) / 60;
  const horasHoje = doneToday.reduce((a, s) => a + (s.duration_min || 0), 0) / 60;
  const totalQ = logs.reduce((a, l) => a + l.total, 0);
  const totalC = logs.reduce((a, l) => a + l.correct, 0);
  const pct = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

  // weekly chart
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    const h = sessions
      .filter((s) => s.status === "done" && s.scheduled_at.slice(0, 10) === key)
      .reduce((a, s) => a + (s.duration_min || 0), 0) / 60;
    const q = logs
      .filter((l) => l.logged_at.slice(0, 10) === key)
      .reduce((a, l) => a + l.total, 0);
    return { d: ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][d.getDay()], h: Number(h.toFixed(1)), q };
  });

  // por matéria
  const bySubject = new Map<string, { total: number; correct: number }>();
  logs.forEach((l) => {
    const s = bySubject.get(l.subject) ?? { total: 0, correct: 0 };
    s.total += l.total; s.correct += l.correct;
    bySubject.set(l.subject, s);
  });
  const subjects = Array.from(bySubject.entries()).map(([name, v]) => ({
    name,
    acerto: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
  }));

  const hasAnyData = sessions.length + logs.length + revs.length > 0;

  return (
    <>
      <Topbar title="Centro de Comando" subtitle={meta.mission} />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <section key={area} className="relative overflow-hidden rounded-2xl border border-border glass p-6 sm:p-8 animate-fade-in">
          <div className="absolute inset-0 bg-gradient-hero opacity-60" />
          <AreaDecor />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                <AreaIcon className="h-7 w-7" />
              </div>
              <div>
                <Badge className="mb-2 gap-1 bg-primary/15 text-primary hover:bg-primary/20">
                  <Sparkles className="h-3 w-3" /> {areaLabel} • {meta.tagline}
                </Badge>
                <h2 className="text-2xl font-bold sm:text-3xl">{greeting}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{concursoLabel}</p>
              </div>
            </div>
            <div className="grid w-full max-w-md grid-cols-3 gap-3">
              <MiniStat label="Prova em" value={daysLeft !== null ? `${daysLeft}d` : "—"} accent />
              <MiniStat label="Sessões hoje" value={`${doneToday.length}/${todaySessions.length}`} icon={Flame} />
              <MiniStat label="Meta diária" value={`${metaDiaria}h`} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Timer} label="Horas estudadas (7d)" value={`${hoursThisWeek.toFixed(1)}h`} accent />
          <Stat icon={CheckCircle2} label="Taxa de acerto" value={`${pct}%`} />
          <Stat icon={ListChecks} label="Questões resolvidas (7d)" value={String(totalQ)} />
          <Stat icon={Target} label="Meta diária" value={`${horasHoje.toFixed(1)}h / ${metaDiaria}h`} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border glass">
            <CardHeader>
              <CardTitle className="text-base">Cronograma de hoje</CardTitle>
              <p className="text-xs text-muted-foreground">
                {doneToday.length} de {todaySessions.length} concluídas
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {todaySessions.length === 0 ? (
                <EmptyMini text="Nenhuma sessão para hoje." cta="Criar sessão" to="/cronograma" />
              ) : (
                todaySessions.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
                    <CheckCircle2 className={`h-4 w-4 ${s.status === "done" ? "text-success" : "text-muted-foreground"}`} />
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm font-medium ${s.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                        {s.subject}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} • {s.duration_min} min
                      </div>
                    </div>
                  </div>
                ))
              )}
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to="/cronograma">Ver cronograma <ChevronRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-4 w-4 text-primary" /> Revisões pendentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {revs.length === 0 ? (
                <EmptyMini text="Nenhuma revisão pendente." cta="Criar revisão" to="/revisoes" />
              ) : (
                revs.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
                    <div className="h-2 w-2 rounded-full bg-warning" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.subject}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.due_date).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to="/revisoes">Ver todas <ChevronRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border glass">
            <CardHeader>
              <CardTitle className="text-base">Próximos passos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!profile?.target_concurso && (
                <NextAction text="Defina seu concurso alvo" to="/configuracoes" />
              )}
              {!profile?.exam_date && (
                <NextAction text="Adicione a data da prova" to="/configuracoes" />
              )}
              <NextAction text="Registre uma sessão de estudo" to="/cronograma" />
              <NextAction text="Registre questões resolvidas" to="/questoes" />
            </CardContent>
          </Card>
        </section>

        {!hasAnyData ? (
          <Card className="border-dashed border-border bg-card/40">
            <CardContent className="grid place-items-center gap-2 p-10 text-center">
              <Sparkles className="h-10 w-10 text-muted-foreground" />
              <div className="font-semibold">Nenhum dado disponível ainda.</div>
              <p className="text-sm text-muted-foreground">Comece registrando seus estudos para ver gráficos e estatísticas reais.</p>
            </CardContent>
          </Card>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border glass">
              <CardHeader>
                <CardTitle className="text-base">Evolução semanal</CardTitle>
                <p className="text-xs text-muted-foreground">Horas estudadas vs questões</p>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weekly}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey="h" stroke="var(--primary)" strokeWidth={2.5} fill="url(#g1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border glass">
              <CardHeader>
                <CardTitle className="text-base">Acerto por matéria</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {subjects.length === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">
                    Nenhum dado disponível ainda.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjects}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="acerto" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={`border-border glass ${accent ? "shadow-glow" : ""}`}>
      <CardContent className="p-5">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${accent ? "bg-gradient-primary" : "bg-accent"}`}>
          <Icon className={`h-5 w-5 ${accent ? "text-primary-foreground" : ""}`} />
        </div>
        <div className="mt-4 text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, accent, icon: Icon }: any) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-4 text-center backdrop-blur">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3 text-primary" />} {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${accent ? "text-gradient" : ""}`}>{value}</div>
    </div>
  );
}

function EmptyMini({ text, cta, to }: { text: string; cta: string; to: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background/30 p-4 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild variant="link" size="sm" className="mt-1">
        <Link to={to}>{cta}</Link>
      </Button>
    </div>
  );
}

function NextAction({ text, to }: { text: string; to: string }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-2 text-sm hover:border-primary/40">
      <span>{text}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
