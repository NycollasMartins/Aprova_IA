import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/Topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useConcurso } from "@/contexts/ConcursoContext";
import { toast } from "sonner";
import { Plus, Loader2, RotateCcw, Trash2, Sparkles, Check, X, TrendingDown } from "lucide-react";
import { sugerirRevisoes, type Sugestao } from "@/lib/revisoes";

export const Route = createFileRoute("/_app/revisoes")({
  head: () => ({ meta: [{ title: "Revisões — AprovaIA" }] }),
  component: Revisoes,
});

interface Rev {
  id: string;
  subject: string;
  due_date: string;
  completed: boolean;
  notes: string | null;
  origem: string;
  acerto_pct: number | null;
  intervalo_dias: number | null;
}

const MODOS = [
  { v: "manual", l: "Manual", d: "Você cria as revisões." },
  { v: "auto", l: "Automático", d: "O sistema cria sozinho pelo desempenho." },
  { v: "combinado", l: "Combinado", d: "O sistema sugere e você confirma." },
];

function Revisoes() {
  const { user, profile, updateProfile } = useProfile();
  const { active } = useConcurso();
  const [items, setItems] = useState<Rev[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", due_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [saving, setSaving] = useState(false);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [working, setWorking] = useState(false);

  const modo = (profile as any)?.revisao_modo ?? "combinado";
  const intervalos: number[] = (profile as any)?.revisao_intervalos ?? [2, 4, 7, 15, 30];
  const concursoId = active?.concurso.id ?? null;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("revisions")
      .select("id, subject, due_date, completed, notes, origem, acerto_pct, intervalo_dias")
      .order("due_date", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data as Rev[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Gera sugestões de revisão a partir do desempenho (question_logs).
  const gerarSugestoes = useCallback(async (silent = false): Promise<Sugestao[]> => {
    if (!user) return [];
    const { data: logs } = await supabase.from("question_logs").select("subject, total, correct");
    const jaPendentes = new Set(items.filter((i) => !i.completed).map((i) => i.subject.toLowerCase()));
    const sug = sugerirRevisoes((logs ?? []) as any, { intervalos, jaPendentes });
    setSugestoes(sug);
    if (!silent && sug.length === 0) toast.info("Sem novas sugestões — registre questões para gerar revisões por desempenho.");
    return sug;
  }, [user, items, intervalos]);

  // Cria uma revisão + uma sessão de revisão no cronograma (integração).
  async function agendarRevisao(s: Sugestao, origem: string) {
    if (!user) return;
    const { error: rErr } = await supabase.from("revisions").insert({
      user_id: user.id, concurso_id: concursoId, subject: s.subject, due_date: s.due_date,
      origem, acerto_pct: s.acerto_pct, intervalo_dias: s.intervalo_dias,
    });
    if (rErr) { toast.error(rErr.message); return; }
    // Sessão tipo revisão no dia previsto (aparece no Cronograma).
    const at = new Date(`${s.due_date}T08:00:00`);
    await supabase.from("study_sessions").insert({
      user_id: user.id, concurso_id: concursoId, subject: `Revisão: ${s.subject}`,
      scheduled_at: at.toISOString(), duration_min: 30, status: "pending", tipo: "revisao",
    });
  }

  async function aceitar(s: Sugestao) {
    setWorking(true);
    await agendarRevisao(s, "auto");
    setSugestoes((prev) => prev.filter((x) => x.subject !== s.subject));
    setWorking(false);
    toast.success(`Revisão de "${s.subject}" agendada para ${new Date(s.due_date).toLocaleDateString("pt-BR")}.`);
    load();
  }

  function dispensar(s: Sugestao) {
    setSugestoes((prev) => prev.filter((x) => x.subject !== s.subject));
  }

  async function gerarAuto() {
    setWorking(true);
    const sug = await gerarSugestoes(true);
    for (const s of sug) await agendarRevisao(s, "auto");
    setSugestoes([]);
    setWorking(false);
    if (sug.length) toast.success(`${sug.length} revisão(ões) criadas automaticamente pelo desempenho.`);
    else toast.info("Sem novas sugestões no momento.");
    load();
  }

  async function setModo(v: string) {
    await updateProfile({ revisao_modo: v } as any);
    setSugestoes([]);
  }

  async function add() {
    if (!user) return;
    if (!form.subject.trim()) return toast.error("Informe a matéria.");
    setSaving(true);
    const { error } = await supabase.from("revisions").insert({
      user_id: user.id, concurso_id: concursoId, subject: form.subject, due_date: form.due_date,
      notes: form.notes || null, origem: "manual",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Revisão criada.");
    setForm({ subject: "", due_date: new Date().toISOString().slice(0, 10), notes: "" });
    setOpen(false);
    load();
  }

  async function toggle(r: Rev) {
    const { error } = await supabase.from("revisions").update({ completed: !r.completed }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("revisions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Revisão removida.");
    load();
  }

  const pending = items.filter((i) => !i.completed);
  const completed = items.filter((i) => i.completed);

  return (
    <>
      <Topbar title="Revisões" subtitle="Puxadas pelo seu desempenho" />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        {/* Cabeçalho: modo + ação */}
        <Card className="border-border glass">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold">Fila de revisões</h2>
                <p className="text-xs text-muted-foreground">
                  {pending.length} pendente{pending.length === 1 ? "" : "s"} • {completed.length} concluída{completed.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {modo === "auto" ? (
                  <Button onClick={gerarAuto} disabled={working} className="bg-gradient-primary text-primary-foreground shadow-glow">
                    {working ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                    Gerar pelo desempenho
                  </Button>
                ) : modo === "combinado" ? (
                  <Button onClick={() => gerarSugestoes(false)} disabled={working} className="bg-gradient-primary text-primary-foreground shadow-glow">
                    {working ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                    Sugerir revisões
                  </Button>
                ) : null}
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><Plus className="mr-1 h-4 w-4" /> Manual</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nova revisão</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Matéria / tópico</Label>
                        <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Ex: Cláusulas pétreas" />
                      </div>
                      <div className="space-y-2">
                        <Label>Data prevista</Label>
                        <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Notas</Label>
                        <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                      <Button onClick={add} disabled={saving} className="bg-gradient-primary text-primary-foreground">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Seletor de modo */}
            <div className="grid gap-2 sm:grid-cols-3">
              {MODOS.map((m) => (
                <button
                  key={m.v}
                  onClick={() => setModo(m.v)}
                  className={`rounded-xl border p-3 text-left transition ${
                    modo === m.v ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-card/40 hover:border-primary/40"
                  }`}
                >
                  <div className="text-sm font-semibold">{m.l}</div>
                  <div className="text-xs text-muted-foreground">{m.d}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sugestões (modo combinado) */}
        {sugestoes.length > 0 && (
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4 text-primary" /> Sugestões por desempenho
              </CardTitle>
              <p className="text-xs text-muted-foreground">Pior desempenho volta mais cedo. Aceite as que quiser.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {sugestoes.map((s) => (
                <div key={s.subject} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{s.subject}</span>
                      <Badge variant={s.acerto_pct < 60 ? "destructive" : "secondary"} className="text-[10px]">{s.acerto_pct}% acerto</Badge>
                      <Badge variant="outline" className="text-[10px]">em {s.intervalo_dias} dias</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Prevista: {new Date(s.due_date).toLocaleDateString("pt-BR")}</div>
                  </div>
                  <Button size="sm" onClick={() => aceitar(s)} disabled={working} className="bg-gradient-primary text-primary-foreground">
                    <Check className="mr-1 h-3.5 w-3.5" /> Aceitar
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => dispensar(s)} aria-label="Dispensar"><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Lista de revisões */}
        {loading ? (
          <div className="grid place-items-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <Card className="border-dashed border-border bg-card/40">
            <CardContent className="grid place-items-center gap-2 p-10 text-center">
              <RotateCcw className="h-10 w-10 text-muted-foreground" />
              <div className="font-semibold">Nenhuma revisão ainda</div>
              <p className="text-sm text-muted-foreground">
                {modo === "manual" ? "Crie uma revisão manual acima." : "Registre questões e gere revisões pelo desempenho."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card/60">
            <CardContent className="space-y-2 p-4">
              {items.map((r) => {
                const today = new Date().toISOString().slice(0, 10);
                const late = !r.completed && r.due_date < today;
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
                    <Checkbox checked={r.completed} onCheckedChange={() => toggle(r)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-medium ${r.completed ? "line-through text-muted-foreground" : ""}`}>{r.subject}</span>
                        {late && <Badge variant="destructive" className="text-[10px]">Atrasada</Badge>}
                        {r.origem !== "manual" && <Badge variant="secondary" className="text-[10px]">auto</Badge>}
                        {r.acerto_pct != null && <Badge variant="outline" className="text-[10px]">{r.acerto_pct}%</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.due_date).toLocaleDateString("pt-BR")}
                        {r.notes && ` • ${r.notes}`}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" aria-label="Excluir revisão" className="text-destructive" onClick={() => remove(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
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
