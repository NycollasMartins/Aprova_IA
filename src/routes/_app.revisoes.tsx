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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useProfile";
import { toast } from "sonner";
import { Plus, Loader2, RotateCcw, Trash2 } from "lucide-react";

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
}

function Revisoes() {
  const { user } = useSession();
  const [items, setItems] = useState<Rev[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", due_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("revisions")
      .select("*")
      .order("due_date", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data as Rev[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!user) return;
    if (!form.subject.trim()) return toast.error("Informe a matéria.");
    setSaving(true);
    const { error } = await supabase.from("revisions").insert({
      user_id: user.id,
      subject: form.subject,
      due_date: form.due_date,
      notes: form.notes || null,
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
      <Topbar title="Revisões" subtitle="Suas revisões pendentes" />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <Card className="border-border glass">
          <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Fila de revisões</h2>
              <p className="text-xs text-muted-foreground">
                {pending.length} pendente{pending.length === 1 ? "" : "s"} • {completed.length} concluída
                {completed.length === 1 ? "" : "s"}
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
                  <Plus className="mr-1 h-4 w-4" /> Nova revisão
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova revisão</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Matéria / tópico</Label>
                    <Input
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Ex: Cláusulas pétreas"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data prevista</Label>
                    <Input
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notas</Label>
                    <Input
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={add} disabled={saving} className="bg-gradient-primary text-primary-foreground">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid place-items-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <Card className="border-dashed border-border bg-card/40">
            <CardContent className="grid place-items-center gap-2 p-10 text-center">
              <RotateCcw className="h-10 w-10 text-muted-foreground" />
              <div className="font-semibold">Nenhuma revisão ainda</div>
              <p className="text-sm text-muted-foreground">Crie sua primeira revisão acima.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card/60">
            <CardContent className="space-y-2 p-4">
              {items.map((r) => {
                const today = new Date().toISOString().slice(0, 10);
                const late = !r.completed && r.due_date < today;
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3"
                  >
                    <Checkbox checked={r.completed} onCheckedChange={() => toggle(r)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-medium ${r.completed ? "line-through text-muted-foreground" : ""}`}>
                          {r.subject}
                        </span>
                        {late && (
                          <Badge variant="destructive" className="text-[10px]">
                            Atrasada
                          </Badge>
                        )}
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
