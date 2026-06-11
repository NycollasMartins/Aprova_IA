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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useProfile";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CheckCircle2, Loader2, Calendar } from "lucide-react";

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
}

// Converte um ISO (UTC, vindo do banco) para o formato do <input datetime-local>
// no fuso LOCAL do usuário — evita o horário "andar" ao abrir para editar.
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

function Cronograma() {
  const { user } = useSession();
  const [items, setItems] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("study_sessions")
      .select("*")
      .order("scheduled_at", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data as Session[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleDone(s: Session) {
    const newStatus = s.status === "done" ? "pending" : "done";
    const { error } = await supabase.from("study_sessions").update({ status: newStatus }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(newStatus === "done" ? "Sessão concluída." : "Sessão reaberta.");
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
      id: "",
      subject: "",
      scheduled_at: toLocalInput(new Date().toISOString()),
      duration_min: 60,
      status: "pending",
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(s: Session) {
    setEditing({ ...s, scheduled_at: toLocalInput(s.scheduled_at) });
    setOpen(true);
  }

  return (
    <>
      <Topbar title="Cronograma" subtitle="Suas sessões de estudo" />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <Card className="border-border glass">
          <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Minhas sessões</h2>
              <p className="text-xs text-muted-foreground">
                {items.length} sessão{items.length === 1 ? "" : "s"} registrada{items.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button onClick={openCreate} className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Plus className="mr-1 h-4 w-4" /> Nova sessão
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid place-items-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <Card className="border-dashed border-border bg-card/40">
            <CardContent className="grid place-items-center gap-3 p-10 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground" />
              <div>
                <div className="font-semibold">Nenhuma sessão ainda</div>
                <p className="text-sm text-muted-foreground">
                  Crie sua primeira sessão de estudo para começar a montar seu cronograma.
                </p>
              </div>
              <Button onClick={openCreate} variant="outline">
                <Plus className="mr-1 h-4 w-4" /> Criar sessão
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">Próximas sessões</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-background/40 p-3 transition hover:border-primary/40 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-medium ${s.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                        {s.subject}
                      </span>
                      <Badge variant={s.status === "done" ? "secondary" : "outline"} className="text-[10px]">
                        {s.status === "done" ? "Concluída" : "Pendente"}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(s.scheduled_at).toLocaleString("pt-BR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      • {s.duration_min} min
                      {s.notes && ` • ${s.notes}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleDone(s)}>
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      {s.status === "done" ? "Reabrir" : "Concluir"}
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Editar sessão" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" aria-label="Excluir sessão" className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(s.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <SessionDialog
          open={open}
          onOpenChange={setOpen}
          session={editing}
          userId={user?.id}
          onSaved={() => {
            setOpen(false);
            load();
          }}
        />
      </main>
    </>
  );
}

function SessionDialog({
  open,
  onOpenChange,
  session,
  userId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: Session | null;
  userId: string | undefined;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Session | null>(session);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(session);
  }, [session]);

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
      : await supabase.from("study_sessions").insert({ ...payload, user_id: userId });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Sessão atualizada." : "Sessão criada.");
    onSaved();
  }

  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar sessão" : "Nova sessão"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Matéria</Label>
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Ex: Direito Constitucional"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data / hora</Label>
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Duração (min)</Label>
              <Input
                type="number"
                min={5}
                value={form.duration_min}
                onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Tópicos, material, observações..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
