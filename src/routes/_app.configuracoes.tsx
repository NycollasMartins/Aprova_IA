import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Topbar } from "@/components/Topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConcurso } from "@/contexts/ConcursoContext";
import { ConcursoCatalogList } from "@/components/ConcursoCatalogList";
// LogoutDialog removido — login desativado (BLOCO 1)
import { toast } from "sonner";
import { Loader2, Upload, KeyRound, GraduationCap, Hourglass, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — AprovaIA" }] }),
  component: Configuracoes,
});

function Configuracoes() {
  const { user, profile, loading, refresh } = useProfile();
  const [savingTab, setSavingTab] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  if (loading || !profile) {
    return (
      <div className="grid flex-1 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const set = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  async function saveTab(tab: string, fields: string[]) {
    if (!user) return;
    setSavingTab(tab);
    const payload: any = {};
    fields.forEach((f) => {
      let v = form[f];
      if (["age", "hours_per_day"].includes(f)) v = v ? Number(v) : null;
      if (typeof v === "string" && v === "") v = null;
      payload[f] = v;
    });
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setSavingTab(null);
    if (error) return toast.error(error.message);
    toast.success("Alterações salvas.");
    refresh();
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = data.publicUrl;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setForm((f: any) => ({ ...f, avatar_url: url }));
    setUploading(false);
    toast.success("Foto atualizada.");
    refresh();
  }

  const name = form.display_name ?? form.full_name ?? user?.email ?? "";
  const initials = (name || "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <Topbar title="Configurações" subtitle="Gerencie sua conta e preferências" />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <Tabs defaultValue="conta" className="w-full">
          <TabsList className="grid w-full max-w-xl grid-cols-4">
            <TabsTrigger value="conta">Conta</TabsTrigger>
            <TabsTrigger value="estudos">Estudos</TabsTrigger>
            <TabsTrigger value="seguranca">Segurança</TabsTrigger>
            <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          </TabsList>

          {/* CONTA */}
          <TabsContent value="conta" className="mt-4 space-y-4">
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>Conta</CardTitle>
                <CardDescription>Suas informações pessoais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    {form.avatar_url && <AvatarImage src={form.avatar_url} alt={name} />}
                    <AvatarFallback className="bg-gradient-primary text-lg text-primary-foreground">
                      {initials || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
                    />
                    <Button asChild variant="outline" disabled={uploading}>
                      <span>
                        {uploading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {uploading ? "Enviando..." : "Trocar foto"}
                      </span>
                    </Button>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Como deseja ser chamado">
                    <Input value={form.display_name ?? ""} onChange={(e) => set("display_name")(e.target.value)} />
                  </Field>
                  <Field label="Nome completo">
                    <Input value={form.full_name ?? ""} onChange={(e) => set("full_name")(e.target.value)} />
                  </Field>
                  <Field label="E-mail">
                    <Input value={profile.email ?? user?.email ?? ""} disabled />
                  </Field>
                  <Field label="Idade">
                    <Input
                      type="number"
                      value={form.age ?? ""}
                      onChange={(e) => set("age")(e.target.value)}
                    />
                  </Field>
                  <Field label="Cidade">
                    <Input value={form.city ?? ""} onChange={(e) => set("city")(e.target.value)} />
                  </Field>
                  <Field label="Estado (UF)">
                    <Input
                      maxLength={2}
                      value={form.state ?? ""}
                      onChange={(e) => set("state")(e.target.value.toUpperCase())}
                    />
                  </Field>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() =>
                      saveTab("conta", ["display_name", "full_name", "age", "city", "state", "avatar_url"])
                    }
                    disabled={savingTab === "conta"}
                    className="bg-gradient-primary text-primary-foreground shadow-glow"
                  >
                    {savingTab === "conta" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ESTUDOS */}
          <TabsContent value="estudos" className="mt-4 space-y-4">
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>Estudos</CardTitle>
                <CardDescription>Seu concurso, formação e nível</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ConcursoEstudoBlock />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Horas por dia">
                    <Input
                      type="number"
                      min={1}
                      max={16}
                      value={form.hours_per_day ?? ""}
                      onChange={(e) => set("hours_per_day")(e.target.value)}
                    />
                  </Field>
                  <Field label="Nível de estudo">
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.level ?? "intermediario"}
                      onChange={(e) => set("level")(e.target.value)}
                    >
                      <option value="iniciante">Iniciante</option>
                      <option value="intermediario">Intermediário</option>
                      <option value="avancado">Avançado</option>
                    </select>
                  </Field>
                  <Field label="Rotina">
                    <Input
                      value={form.routine_notes ?? ""}
                      onChange={(e) => set("routine_notes")(e.target.value)}
                      placeholder="Ex: estudo no contraturno"
                    />
                  </Field>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() =>
                      saveTab("estudos", [
                        "hours_per_day",
                        "level",
                        "routine_notes",
                      ])
                    }
                    disabled={savingTab === "estudos"}
                    className="bg-gradient-primary text-primary-foreground shadow-glow"
                  >
                    {savingTab === "estudos" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEGURANCA */}
          <TabsContent value="seguranca" className="mt-4">
            <SecurityTab email={user?.email ?? ""} />
          </TabsContent>

          {/* NOTIFICACOES */}
          <TabsContent value="notificacoes" className="mt-4 space-y-4">
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>Como você quer ser lembrado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { k: "notifications_enabled", l: "Notificações gerais" },
                  { k: "reminders_enabled", l: "Lembretes de estudo" },
                  { k: "reviews_enabled", l: "Revisões automáticas" },
                  { k: "focus_mode", l: "Modo foco (silencia tudo)" },
                ].map((o) => (
                  <div
                    key={o.k}
                    className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-3"
                  >
                    <span className="text-sm font-medium">{o.l}</span>
                    <Switch checked={!!form[o.k]} onCheckedChange={set(o.k)} />
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() =>
                      saveTab("notificacoes", [
                        "notifications_enabled",
                        "reminders_enabled",
                        "reviews_enabled",
                        "focus_mode",
                      ])
                    }
                    disabled={savingTab === "notificacoes"}
                    className="bg-gradient-primary text-primary-foreground shadow-glow"
                  >
                    {savingTab === "notificacoes" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground">
            Voltar ao dashboard
          </Link>
        </p>
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/**
 * Bloco do concurso na aba Estudos: mostra o concurso ativo + status (vindo do
 * edital vigente) e permite trocar escolhendo outro do catálogo. A data da
 * prova e os tópicos vêm do edital — não são mais digitados aqui.
 */
function ConcursoEstudoBlock() {
  const { active, status, examDate, selectConcurso } = useConcurso();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function pick(id: string) {
    setSaving(true);
    const { error } = await selectConcurso(id);
    setSaving(false);
    setOpen(false);
    if (error) toast.error(error.message);
    else toast.success("Concurso atualizado.");
  }

  const daysLeft = examDate
    ? Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Concurso atual</div>
            <div className="font-semibold">{active ? active.concurso.nome : "Nenhum selecionado"}</div>
            {active && status === "pre_edital" && (
              <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-warning">
                <Hourglass className="h-3 w-3" /> PRÉ-EDITAL — edital ainda não publicado
              </span>
            )}
            {active && status === "com_data" && daysLeft !== null && (
              <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <CalendarClock className="h-3 w-3 text-primary" /> Prova em {daysLeft} dias
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? "Trocar concurso" : "Escolher concurso"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" /> Escolher concurso
            </DialogTitle>
          </DialogHeader>
          <ConcursoCatalogList selectedId={active?.concurso.id ?? null} onSelect={pick} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SecurityTab({ email }: { email: string }) {
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePassword() {
    if (pwd.length < 6) return toast.error("A senha precisa ter no mínimo 6 caracteres.");
    if (pwd !== pwd2) return toast.error("As senhas não coincidem.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Senha alterada com sucesso.");
    setPwd("");
    setPwd2("");
  }

  return (
    <div className="space-y-4">
      <Card className="glass border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Alterar senha
          </CardTitle>
          <CardDescription>Conta: {email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nova senha">
              <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            </Field>
            <Field label="Confirmar senha">
              <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={changePassword}
              disabled={saving}
              className="bg-gradient-primary text-primary-foreground shadow-glow"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar senha"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bloco "Encerrar sessão" removido enquanto o login está desativado. */}
    </div>
  );
}

