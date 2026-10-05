import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useSession } from "@/hooks/useProfile";
import { AREAS } from "@/contexts/ThemeContext";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import {
  Loader2, ShieldAlert, Plus, Pencil, Trash2, ChevronRight, FileText, BookOpen, CheckCircle2, Layers,
} from "lucide-react";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Admin — AprovaIA" }] }),
  component: AdminPage,
});

type Concurso = Tables<"concursos">;
type Edital = Tables<"editais">;
type Materia = Tables<"edital_materias">;
type Topico = Tables<"edital_topicos">;

function AdminPage() {
  const { isAdmin, loading } = useRole();

  if (loading) {
    return <div className="grid flex-1 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!isAdmin) {
    return (
      <>
        <Topbar title="Admin" />
        <main className="grid flex-1 place-items-center p-6">
          <Card className="max-w-md border-border">
            <CardContent className="grid place-items-center gap-2 p-10 text-center">
              <ShieldAlert className="h-10 w-10 text-warning" />
              <div className="font-semibold">Acesso restrito</div>
              <p className="text-sm text-muted-foreground">
                Esta área é exclusiva para administradores. Fale com o responsável se precisar de acesso.
              </p>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }
  return <AdminConsole />;
}

function AdminConsole() {
  const { user } = useSession();
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [selConcurso, setSelConcurso] = useState<Concurso | null>(null);

  const loadConcursos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("concursos").select("*").order("nome");
    if (error) toast.error(error.message);
    setConcursos((data as Concurso[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadConcursos(); }, [loadConcursos]);

  return (
    <>
      <Topbar title="Admin — Editais" subtitle="Cadastro de concursos, editais, matérias e tópicos" />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <ConcursosPanel
            concursos={concursos}
            loading={loading}
            selectedId={selConcurso?.id ?? null}
            onSelect={setSelConcurso}
            onChanged={loadConcursos}
            userId={user?.id}
          />
          {selConcurso ? (
            <EditaisPanel concurso={selConcurso} userId={user?.id} />
          ) : (
            <Card className="border-dashed border-border bg-card/40">
              <CardContent className="grid h-full place-items-center gap-2 p-10 text-center">
                <Layers className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Selecione um concurso à esquerda para gerenciar seus editais.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}

/* ------------------------------- CONCURSOS ------------------------------- */

function ConcursosPanel({
  concursos, loading, selectedId, onSelect, onChanged, userId,
}: {
  concursos: Concurso[]; loading: boolean; selectedId: string | null;
  onSelect: (c: Concurso) => void; onChanged: () => void; userId?: string;
}) {
  const [editing, setEditing] = useState<Partial<Concurso> | null>(null);
  const [open, setOpen] = useState(false);

  function openCreate() { setEditing({ status: "pre_edital", ativo: true, area: "neutro" }); setOpen(true); }
  function openEdit(c: Concurso) { setEditing(c); setOpen(true); }

  async function remove(id: string) {
    const { error } = await supabase.from("concursos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Concurso removido.");
    onChanged();
  }

  return (
    <Card className="border-border glass">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Concursos</CardTitle>
        <Button size="sm" onClick={openCreate} className="bg-gradient-primary text-primary-foreground">
          <Plus className="mr-1 h-4 w-4" /> Novo
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="grid place-items-center p-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : concursos.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Nenhum concurso. Crie o primeiro.</p>
        ) : (
          concursos.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-2 rounded-xl border p-3 transition ${
                selectedId === c.id ? "border-primary bg-primary/10" : "border-border bg-background/40 hover:border-primary/40"
              }`}
            >
              <button className="min-w-0 flex-1 text-left" onClick={() => onSelect(c)}>
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{c.nome}</span>
                  {!c.ativo && <Badge variant="outline" className="text-[10px]">oculto</Badge>}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {[c.orgao, c.banca, c.ano].filter(Boolean).join(" • ") || "—"}
                </div>
              </button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)} aria-label="Editar">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <DeleteBtn onConfirm={() => remove(c.id)} label="Excluir concurso? Editais e tópicos vinculados também serão removidos." />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))
        )}
      </CardContent>
      <ConcursoDialog open={open} onOpenChange={setOpen} value={editing} userId={userId} onSaved={() => { setOpen(false); onChanged(); }} />
    </Card>
  );
}

function ConcursoDialog({
  open, onOpenChange, value, userId, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; value: Partial<Concurso> | null; userId?: string; onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Concurso>>(value ?? {});
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(value ?? {}); }, [value]);

  async function save() {
    if (!form.nome?.trim()) return toast.error("Informe o nome do concurso.");
    setSaving(true);
    const payload = {
      nome: form.nome,
      banca: form.banca || null,
      orgao: form.orgao || null,
      cargo: form.cargo || null,
      area: form.area || "neutro",
      ano: form.ano ? Number(form.ano) : null,
      status: form.status || "pre_edital",
      ativo: form.ativo ?? true,
    };
    const { error } = form.id
      ? await supabase.from("concursos").update(payload).eq("id", form.id)
      : await supabase.from("concursos").insert({ ...payload, created_by: userId ?? null });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Concurso atualizado." : "Concurso criado.");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{form.id ? "Editar concurso" : "Novo concurso"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Nome *"><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Polícia Federal — Agente" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Órgão"><Input value={form.orgao ?? ""} onChange={(e) => setForm({ ...form, orgao: e.target.value })} /></Field>
            <Field label="Banca"><Input value={form.banca ?? ""} onChange={(e) => setForm({ ...form, banca: e.target.value })} /></Field>
            <Field label="Cargo"><Input value={form.cargo ?? ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></Field>
            <Field label="Ano"><Input type="number" value={form.ano ?? ""} onChange={(e) => setForm({ ...form, ano: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Área (tema)">
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.area ?? "neutro"} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                {AREAS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status ?? "pre_edital"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pre_edital">Pré-edital</option>
                <option value="edital_publicado">Edital publicado</option>
                <option value="encerrado">Encerrado</option>
              </select>
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-3">
            <span className="text-sm font-medium">Visível no catálogo do aluno</span>
            <Switch checked={form.ativo ?? true} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
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

/* -------------------------------- EDITAIS -------------------------------- */

function EditaisPanel({ concurso, userId }: { concurso: Concurso; userId?: string }) {
  const [editais, setEditais] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Edital | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Edital> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("editais").select("*").eq("concurso_id", concurso.id).order("versao", { ascending: false });
    if (error) toast.error(error.message);
    const list = (data as Edital[]) ?? [];
    setEditais(list);
    setSel((prev) => list.find((e) => e.id === prev?.id) ?? list.find((e) => e.vigente) ?? list[0] ?? null);
    setLoading(false);
  }, [concurso.id]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    const nextVersao = (editais[0]?.versao ?? 0) + 1;
    setEditing({ versao: nextVersao, tipo: nextVersao === 1 ? "original" : "retificacao", vigente: true });
    setOpen(true);
  }
  function openEdit(e: Edital) { setEditing(e); setOpen(true); }

  async function remove(id: string) {
    const { error } = await supabase.from("editais").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Edital removido.");
    load();
  }

  async function setVigente(e: Edital) {
    const { error } = await supabase.from("editais").update({ vigente: true }).eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success(`Versão ${e.versao} agora é a vigente.`);
    load();
  }

  return (
    <div className="space-y-6">
      <Card className="border-border glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">{concurso.nome}</CardTitle>
            <p className="text-xs text-muted-foreground">Versões do edital (v1, v2 = retificações)</p>
          </div>
          <Button size="sm" onClick={openCreate} className="bg-gradient-primary text-primary-foreground">
            <Plus className="mr-1 h-4 w-4" /> Nova versão
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="grid place-items-center p-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : editais.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Nenhum edital. Crie a versão 1 (original).</p>
          ) : (
            editais.map((e) => (
              <div
                key={e.id}
                className={`flex items-center gap-2 rounded-xl border p-3 transition ${
                  sel?.id === e.id ? "border-primary bg-primary/10" : "border-border bg-background/40 hover:border-primary/40"
                }`}
              >
                <button className="min-w-0 flex-1 text-left" onClick={() => setSel(e)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">v{e.versao} — {e.tipo === "original" ? "Original" : "Retificação"}</span>
                    {e.vigente && <Badge className="bg-success/15 text-success text-[10px]">VIGENTE</Badge>}
                    {e.data_prova ? (
                      <Badge variant="outline" className="text-[10px]">Prova: {new Date(e.data_prova).toLocaleDateString("pt-BR")}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-warning">Sem data (pré-edital)</Badge>
                    )}
                  </div>
                  {e.titulo && <div className="mt-0.5 truncate text-xs text-muted-foreground">{e.titulo}</div>}
                </button>
                {!e.vigente && (
                  <Button size="sm" variant="outline" onClick={() => setVigente(e)}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Tornar vigente
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(e)} aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                <DeleteBtn onConfirm={() => remove(e.id)} label="Excluir esta versão do edital e seus tópicos?" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {sel && <MateriasPanel edital={sel} />}

      <EditalDialog
        open={open}
        onOpenChange={setOpen}
        value={editing}
        concursoId={concurso.id}
        vigenteAtual={editais.find((e) => e.vigente) ?? null}
        userId={userId}
        onSaved={() => { setOpen(false); load(); }}
      />
    </div>
  );
}

function EditalDialog({
  open, onOpenChange, value, concursoId, vigenteAtual, userId, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; value: Partial<Edital> | null;
  concursoId: string; vigenteAtual: Edital | null; userId?: string; onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Edital>>(value ?? {});
  const [saving, setSaving] = useState(false);
  const [copiar, setCopiar] = useState(true);
  useEffect(() => { setForm(value ?? {}); setCopiar(true); }, [value]);

  const isNova = !form.id;
  const podeCopiar = isNova && !!vigenteAtual;

  async function save() {
    setSaving(true);
    const payload = {
      versao: form.versao ?? 1,
      tipo: form.tipo || "original",
      titulo: form.titulo || null,
      data_publicacao: form.data_publicacao || null,
      data_prova: form.data_prova || null,
      vigente: form.vigente ?? true,
      resumo_mudancas: form.resumo_mudancas || null,
    };

    if (form.id) {
      const { error } = await supabase.from("editais").update(payload).eq("id", form.id);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Edital atualizado.");
      return onSaved();
    }

    const { data: novo, error } = await supabase
      .from("editais")
      .insert({ ...payload, concurso_id: concursoId, created_by: userId ?? null })
      .select("id")
      .single();
    if (error) { setSaving(false); return toast.error(error.message); }

    // Opcional: duplicar matérias/tópicos do edital vigente atual (base p/ retificação).
    if (podeCopiar && copiar && vigenteAtual && novo) {
      await copyEstrutura(vigenteAtual.id, novo.id);
    }
    setSaving(false);
    toast.success("Versão criada.");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{form.id ? `Editar edital v${form.versao}` : "Nova versão do edital"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Versão"><Input type="number" min={1} value={form.versao ?? 1} onChange={(e) => setForm({ ...form, versao: Number(e.target.value) })} /></Field>
            <Field label="Tipo">
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.tipo ?? "original"} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="original">Original</option>
                <option value="retificacao">Retificação</option>
              </select>
            </Field>
          </div>
          <Field label="Título / identificação"><Input value={form.titulo ?? ""} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Edital de abertura nº 1/2026" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de publicação"><Input type="date" value={form.data_publicacao ?? ""} onChange={(e) => setForm({ ...form, data_publicacao: e.target.value })} /></Field>
            <Field label="Data da prova"><Input type="date" value={form.data_prova ?? ""} onChange={(e) => setForm({ ...form, data_prova: e.target.value })} /></Field>
          </div>
          <p className="text-xs text-muted-foreground">Sem data da prova = concurso fica em <strong>PRÉ-EDITAL</strong>.</p>
          <Field label="Resumo das mudanças (aparece no aviso ao aluno)"><Textarea value={form.resumo_mudancas ?? ""} onChange={(e) => setForm({ ...form, resumo_mudancas: e.target.value })} placeholder="Ex.: Incluído tópico X; removido Y; alterada data da prova." /></Field>
          <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-3">
            <span className="text-sm font-medium">Tornar esta a versão vigente</span>
            <Switch checked={form.vigente ?? true} onCheckedChange={(v) => setForm({ ...form, vigente: v })} />
          </div>
          {podeCopiar && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-3">
              <span className="text-sm font-medium">Copiar matérias/tópicos da versão vigente</span>
              <Switch checked={copiar} onCheckedChange={setCopiar} />
            </div>
          )}
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

async function copyEstrutura(fromEditalId: string, toEditalId: string) {
  const { data: materias } = await supabase.from("edital_materias").select("*").eq("edital_id", fromEditalId).order("ordem");
  for (const m of (materias as Materia[]) ?? []) {
    const { data: novaMateria } = await supabase
      .from("edital_materias")
      .insert({ edital_id: toEditalId, nome: m.nome, peso: m.peso, ordem: m.ordem })
      .select("id")
      .single();
    if (!novaMateria) continue;
    const { data: topicos } = await supabase.from("edital_topicos").select("*").eq("materia_id", m.id).order("ordem");
    const rows = ((topicos as Topico[]) ?? []).map((t) => ({
      materia_id: novaMateria.id, edital_id: toEditalId, titulo: t.titulo, codigo: t.codigo, ordem: t.ordem,
    }));
    if (rows.length) await supabase.from("edital_topicos").insert(rows);
  }
}

/* -------------------------- MATÉRIAS & TÓPICOS -------------------------- */

function MateriasPanel({ edital }: { edital: Edital }) {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [topicos, setTopicos] = useState<Topico[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaMateria, setNovaMateria] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: m }, { data: t }] = await Promise.all([
      supabase.from("edital_materias").select("*").eq("edital_id", edital.id).order("ordem"),
      supabase.from("edital_topicos").select("*").eq("edital_id", edital.id).order("ordem"),
    ]);
    setMaterias((m as Materia[]) ?? []);
    setTopicos((t as Topico[]) ?? []);
    setLoading(false);
  }, [edital.id]);

  useEffect(() => { load(); }, [load]);

  async function addMateria() {
    if (!novaMateria.trim()) return;
    const { error } = await supabase.from("edital_materias").insert({ edital_id: edital.id, nome: novaMateria.trim(), ordem: materias.length });
    if (error) return toast.error(error.message);
    setNovaMateria("");
    load();
  }

  async function removeMateria(id: string) {
    const { error } = await supabase.from("edital_materias").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <Card className="border-border glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-primary" /> Matérias e tópicos — v{edital.versao}
        </CardTitle>
        <p className="text-xs text-muted-foreground">Os tópicos são a base do progresso, cronograma e dashboard do aluno.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={novaMateria} onChange={(e) => setNovaMateria(e.target.value)} placeholder="Nova matéria (ex.: Direito Constitucional)" onKeyDown={(e) => e.key === "Enter" && addMateria()} />
          <Button onClick={addMateria} className="bg-gradient-primary text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> Matéria</Button>
        </div>

        {loading ? (
          <div className="grid place-items-center p-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : materias.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma matéria ainda.</p>
        ) : (
          materias.map((m) => (
            <MateriaItem
              key={m.id}
              materia={m}
              topicos={topicos.filter((t) => t.materia_id === m.id)}
              onChanged={load}
              onRemove={() => removeMateria(m.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function MateriaItem({
  materia, topicos, onChanged, onRemove,
}: {
  materia: Materia; topicos: Topico[]; onChanged: () => void; onRemove: () => void;
}) {
  const [novo, setNovo] = useState("");

  async function addTopico() {
    if (!novo.trim()) return;
    const { error } = await supabase.from("edital_topicos").insert({
      materia_id: materia.id, edital_id: materia.edital_id, titulo: novo.trim(), ordem: topicos.length,
    });
    if (error) return toast.error(error.message);
    setNovo("");
    onChanged();
  }

  async function removeTopico(id: string) {
    const { error } = await supabase.from("edital_topicos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChanged();
  }

  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{materia.nome}</span>
          <Badge variant="outline" className="text-[10px]">{topicos.length} tópico{topicos.length === 1 ? "" : "s"}</Badge>
        </div>
        <DeleteBtn onConfirm={onRemove} label={`Excluir a matéria "${materia.nome}" e seus tópicos?`} />
      </div>
      <div className="space-y-1.5">
        {topicos.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-1.5">
            <span className="min-w-0 flex-1 truncate text-sm">{t.codigo ? <span className="text-muted-foreground">{t.codigo} </span> : null}{t.titulo}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeTopico(t.id)} aria-label="Excluir tópico"><Trash2 className="h-3 w-3" /></Button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Novo tópico..." className="h-9" onKeyDown={(e) => e.key === "Enter" && addTopico()} />
        <Button size="sm" variant="outline" onClick={addTopico}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

/* -------------------------------- HELPERS -------------------------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function DeleteBtn({ onConfirm, label }: { onConfirm: () => void; label: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>{label} Esta ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
