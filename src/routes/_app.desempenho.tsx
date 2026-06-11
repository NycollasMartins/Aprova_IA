import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/Topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useProfile";
import { toast } from "sonner";
import { Loader2, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_app/desempenho")({
  head: () => ({ meta: [{ title: "Desempenho — AprovaIA" }] }),
  component: Desempenho,
});

function Desempenho() {
  const { user } = useSession();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from("question_logs").select("*").order("logged_at");
    if (error) toast.error("Erro ao carregar desempenho: " + error.message);
    setLogs(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="grid flex-1 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const totalQ = logs.reduce((a, l) => a + l.total, 0);
  const totalC = logs.reduce((a, l) => a + l.correct, 0);
  const pct = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

  const bySubject = new Map<string, { total: number; correct: number }>();
  logs.forEach((l) => {
    const s = bySubject.get(l.subject) ?? { total: 0, correct: 0 };
    s.total += l.total; s.correct += l.correct;
    bySubject.set(l.subject, s);
  });
  const subjects = Array.from(bySubject.entries()).map(([m, v]) => ({
    m, acerto: Math.round((v.correct / v.total) * 100),
  }));

  return (
    <>
      <Topbar title="Desempenho" subtitle="Sua evolução real" />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        {logs.length === 0 ? (
          <Card className="border-dashed border-border bg-card/40">
            <CardContent className="grid place-items-center gap-2 p-10 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground" />
              <div className="font-semibold">Nenhum dado disponível ainda.</div>
              <p className="text-sm text-muted-foreground">Comece registrando questões para ver seu desempenho.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <Card className="border-border glass shadow-glow">
                <CardContent className="p-5">
                  <div className="text-xs text-muted-foreground">Acerto geral</div>
                  <div className="mt-2 text-3xl font-bold">{pct}%</div>
                </CardContent>
              </Card>
              <Card className="border-border glass">
                <CardContent className="p-5">
                  <div className="text-xs text-muted-foreground">Questões resolvidas</div>
                  <div className="mt-2 text-3xl font-bold">{totalQ}</div>
                </CardContent>
              </Card>
              <Card className="border-border glass">
                <CardContent className="p-5">
                  <div className="text-xs text-muted-foreground">Matérias estudadas</div>
                  <div className="mt-2 text-3xl font-bold">{subjects.length}</div>
                </CardContent>
              </Card>
            </section>

            <Card className="border-border bg-card/60">
              <CardHeader><CardTitle className="text-base">Acerto por matéria</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjects}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="acerto" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </>
  );
}
