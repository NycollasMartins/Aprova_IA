import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useProfile";
import { detectArea, useArea } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Vamos te conhecer — AprovaIA" }] }),
  component: OnboardingPage,
});

const STEPS = [
  { key: "identidade", label: "Identidade", greeting: "Para começar, como deseja ser chamado?" },
  { key: "vida", label: "Sua rotina", greeting: "Vamos entender como é o seu dia." },
  { key: "formacao", label: "Formação", greeting: "Sua formação ajuda a IA a calibrar o plano." },
  { key: "objetivo", label: "Objetivo", greeting: "Agora o mais importante: seu sonho." },
];

interface Answers {
  display_name: string;
  age: string;
  city: string;
  state: string;
  works: boolean | null;
  has_children: boolean | null;
  hours_per_day: string;
  routine_notes: string;
  has_degree: boolean | null;
  degree_name: string;
  degree_area: string;
  target_concurso: string;
  studied_before: boolean | null;
  feeling: string;
  exam_date: string;
  level: string;
}

function OnboardingPage() {
  const nav = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const { setArea } = useArea();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [a, setA] = useState<Answers>({
    display_name: "", age: "", city: "", state: "",
    works: null, has_children: null, hours_per_day: "4", routine_notes: "",
    has_degree: null, degree_name: "", degree_area: "",
    target_concurso: "", studied_before: null, feeling: "",
    exam_date: "", level: "intermediario",
  });

  useEffect(() => {
    if (sessionLoading) return;
    // Caminho B: onboarding exige sessão. Sem login, volta para /login.
    if (!user) {
      nav({ to: "/login", replace: true });
      return;
    }
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        // Pré-preenche com o que já existe (útil ao "refazer onboarding").
        setA((prev) => ({
          ...prev,
          display_name: data.display_name ?? prev.display_name,
          age: data.age != null ? String(data.age) : prev.age,
          city: data.city ?? prev.city,
          state: data.state ?? prev.state,
          works: data.works ?? prev.works,
          has_children: data.has_children ?? prev.has_children,
          hours_per_day: data.hours_per_day != null ? String(data.hours_per_day) : prev.hours_per_day,
          routine_notes: data.routine_notes ?? prev.routine_notes,
          has_degree: data.has_degree ?? prev.has_degree,
          degree_name: data.degree_name ?? prev.degree_name,
          degree_area: data.degree_area ?? prev.degree_area,
          target_concurso: data.target_concurso ?? prev.target_concurso,
          studied_before: data.studied_before ?? prev.studied_before,
          feeling: data.feeling ?? prev.feeling,
          exam_date: data.exam_date ?? prev.exam_date,
          level: data.level ?? prev.level,
        }));
        if (data.onboarding_completed) nav({ to: "/dashboard", replace: true });
      }
    });
  }, [user, sessionLoading, nav]);

  function setField<K extends keyof Answers>(k: K, v: Answers[K]) {
    setA((prev) => ({ ...prev, [k]: v }));
  }

  async function finish() {
    if (!user) {
      nav({ to: "/login", replace: true });
      return;
    }
    setSaving(true);
    const area = detectArea(a.target_concurso);
    const payload = {
      display_name: a.display_name || null,
      age: a.age ? Number(a.age) : null,
      city: a.city || null,
      state: a.state || null,
      works: a.works,
      has_children: a.has_children,
      hours_per_day: a.hours_per_day ? Number(a.hours_per_day) : null,
      routine_notes: a.routine_notes || null,
      has_degree: a.has_degree,
      degree_name: a.degree_name || null,
      degree_area: a.degree_area || null,
      target_concurso: a.target_concurso || null,
      concurso_area: area,
      exam_date: a.exam_date || null,
      level: a.level,
      studied_before: a.studied_before,
      feeling: a.feeling || null,
      onboarding_completed: true,
    };

    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    setArea(area);
    toast.success("Plano configurado! Bem-vindo ao AprovaIA.");
    nav({ to: "/dashboard", replace: true });
  }

  const canNext =
    (step === 0 && a.display_name.trim().length > 0) ||
    (step === 1 && a.works !== null && Number(a.hours_per_day) > 0) ||
    (step === 2 && a.has_degree !== null) ||
    (step === 3 && a.target_concurso.trim().length > 0);

  if (sessionLoading) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 area-bg opacity-90" />
      <div className="absolute inset-0 bg-gradient-hero opacity-60" />
      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-8">
        <Logo />

        {/* Stepper */}
        <div className="mt-8 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex flex-1 items-center gap-2">
              <div className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-gradient-primary" : "bg-border"}`} />
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{STEPS[step].label} · {step + 1} de {STEPS.length}</div>

        <div className="mt-8 flex-1 animate-fade-in" key={step}>
          {/* IA message */}
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="rounded-2xl rounded-tl-sm border border-border glass p-4">
              <div className="text-xs font-semibold text-primary">IA AprovaIA</div>
              <p className="mt-1 text-sm">{STEPS[step].greeting}</p>
            </div>
          </div>

          <div className="mt-6 space-y-5 pl-13">
            {step === 0 && (
              <>
                <Field label="Como deseja ser chamado?"><Input value={a.display_name} onChange={(e) => setField("display_name", e.target.value)} placeholder="Seu nome ou apelido" /></Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Idade"><Input type="number" min={14} max={99} value={a.age} onChange={(e) => setField("age", e.target.value)} /></Field>
                  <Field label="Cidade"><Input value={a.city} onChange={(e) => setField("city", e.target.value)} /></Field>
                  <Field label="Estado"><Input maxLength={2} placeholder="SP" value={a.state} onChange={(e) => setField("state", e.target.value.toUpperCase())} /></Field>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="Você trabalha atualmente?">
                  <Choice value={a.works} onChange={(v) => setField("works", v)} options={[{ v: true, l: "Sim, trabalho" }, { v: false, l: "Dedicação total" }]} />
                </Field>
                <Field label="Possui filhos?">
                  <Choice value={a.has_children} onChange={(v) => setField("has_children", v)} options={[{ v: true, l: "Sim" }, { v: false, l: "Não" }]} />
                </Field>
                <Field label={`Horas disponíveis por dia: ${a.hours_per_day}h`}>
                  <input type="range" min={1} max={14} value={a.hours_per_day} onChange={(e) => setField("hours_per_day", e.target.value)} className="w-full accent-[var(--primary)]" />
                </Field>
                <Field label="Como é sua rotina? (opcional)">
                  <Input placeholder="Ex.: estudo de manhã antes do trabalho" value={a.routine_notes} onChange={(e) => setField("routine_notes", e.target.value)} />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Possui graduação?">
                  <Choice value={a.has_degree} onChange={(v) => setField("has_degree", v)} options={[{ v: true, l: "Sim" }, { v: false, l: "Ainda não" }]} />
                </Field>
                {a.has_degree && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Qual graduação?"><Input value={a.degree_name} onChange={(e) => setField("degree_name", e.target.value)} placeholder="Ex.: Direito" /></Field>
                    <Field label="Área de formação"><Input value={a.degree_area} onChange={(e) => setField("degree_area", e.target.value)} placeholder="Humanas, Exatas..." /></Field>
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <Field label="Qual concurso você deseja?">
                  <Input value={a.target_concurso} onChange={(e) => setField("target_concurso", e.target.value)} placeholder="Ex.: PRF, TRT-SP, Receita Federal" />
                  {a.target_concurso && (
                    <p className="mt-2 text-xs text-primary">
                      Detectamos área: <strong className="capitalize">{detectArea(a.target_concurso)}</strong>. O visual vai se adaptar.
                    </p>
                  )}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Data da prova (opcional)"><Input type="date" value={a.exam_date} onChange={(e) => setField("exam_date", e.target.value)} /></Field>
                  <Field label="Seu nível">
                    <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={a.level} onChange={(e) => setField("level", e.target.value)}>
                      <option value="iniciante">Iniciante</option>
                      <option value="intermediario">Intermediário</option>
                      <option value="avancado">Avançado</option>
                    </select>
                  </Field>
                </div>
                <Field label="Já estudou para esse concurso antes?">
                  <Choice value={a.studied_before} onChange={(v) => setField("studied_before", v)} options={[{ v: true, l: "Sim" }, { v: false, l: "Primeira vez" }]} />
                </Field>
                <Field label="Como você está se sentindo hoje?">
                  <Input placeholder="Ex.: motivado, ansioso, focado..." value={a.feeling} onChange={(e) => setField("feeling", e.target.value)} />
                </Field>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          <Button variant="ghost" disabled={step === 0 || saving} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
              Continuar <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button disabled={!canNext || saving} onClick={finish} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar meu plano"}
            </Button>
          )}
        </div>
      </div>
    </div>
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

function Choice({ value, onChange, options }: { value: boolean | null; onChange: (v: boolean) => void; options: { v: boolean; l: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.l}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-2xl border p-3 text-sm font-medium transition-all ${active ? "border-primary bg-gradient-surface shadow-glow" : "border-border bg-card/50 hover:border-primary/40"}`}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}
