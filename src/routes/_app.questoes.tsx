import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/Topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useProfile";
import { toast } from "sonner";
import { ListChecks, Loader2, Plus, Target, Check, X } from "lucide-react";

export const Route = createFileRoute("/_app/questoes")({
  head: () => ({ meta: [{ title: "Questões — AprovaIA" }] }),
  component: Questoes,
});

interface QLog {
  id: string;
  subject: string;
  total: number;
  correct: number;
  wrong: number;
  logged_at: string;
}

function Questoes() {
  const { user } = useSession();
  const [logs, setLogs] = useState<QLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [total, setTotal] = useState<number>(10);
  const [correct, setCorrect] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("question_logs")
      .select("*")
      .order("logged_at", { ascending: false });
    if (error) toast.error(error.message);
    setLogs((data as QLog[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!user) return;
    if (!subject.trim()) return toast.error("Informe a matéria.");
    if (total <= 0) return toast.error("Total deve ser maior que zero.");
    if (correct < 0 || correct > total) return toast.error("Acertos inválidos.");
    setSaving(true);
    const { error } = await supabase.from("question_logs").insert({
      user_id: user.id,
      subject,
      total,
      correct,
      wrong: total - correct,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Registro salvo.");
    setSubject("");
    setTotal(10);
    setCorrect(0);
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("question_logs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Registro removido.");
    load();
  }

  const totalQ = logs.reduce((a, l) => a + l.total, 0);
  const totalC = logs.reduce((a, l) => a + l.correct, 0);
  const pct = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

  return (
    <>
      <Topbar title="Questões" subtitle="Registre suas resoluções" />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <Stat icon={ListChecks} label="Total de questões" value={String(totalQ)} accent />
          <Stat icon={Check} label="Acertos" value={String(totalC)} />
          <Stat icon={Target} label="Percentual de acertos" value={`${pct}%`} />
        </section>

        <Card className="border-border glass">
          <CardHeader>
            <CardTitle className="text-base">Registrar resolução</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_120px_120px_auto]">
            <div className="space-y-2">
              <Label>Matéria</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Direito Constitucional"
              />
            </div>
            <div className="space-y-2">
              <Label>Total</Label>
              <Input type="number" min={1} value={total} onChange={(e) => setTotal(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Acertos</Label>
              <Input
                type="number"
                min={0}
                max={total}
                value={correct}
                onChange={(e) => setCorrect(Number(e.target.value))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={add} disabled={saving} className="w-full bg-gradient-primary text-primary-foreground shadow-glow">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />Registrar</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid place-items-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <Card className="border-dashed border-border bg-card/40">
            <CardContent className="grid place-items-center gap-2 p-10 text-center">
              <ListChecks className="h-10 w-10 text-muted-foreground" />
              <div className="font-semibold">Nenhuma questão registrada ainda</div>
              <p className="text-sm text-muted-foreground">Registre acima sua primeira resolução.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">Histórico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {logs.map((l) => {
                const p = l.total > 0 ? Math.round((l.correct / l.total) * 100) : 0;
                return (
                  <div
                    key={l.id}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-background/40 p-3 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{l.subject}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {p}% acerto
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(l.logged_at).toLocaleString("pt-BR")} • {l.correct}/{l.total} ({l.wrong} erros)
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" aria-label="Remover registro" className="text-destructive" onClick={() => remove(l.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={`border-border glass ${accent ? "shadow-glow" : ""}`}>
      <CardContent className="flex items-center gap-3 p-5">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${accent ? "bg-gradient-primary" : "bg-accent"}`}>
          <Icon className={`h-5 w-5 ${accent ? "text-primary-foreground" : ""}`} />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
