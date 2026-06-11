import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  Sparkles,
  Brain,
  Target,
  TrendingUp,
  Shield,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AprovaIA — Inteligência para sua aprovação" },
      { name: "description", content: "Plataforma de IA que monta seu plano, acompanha sua evolução e te leva até a aprovação no concurso público." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 area-bg opacity-90" aria-hidden />
      <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-80" aria-hidden />

      {/* NAV */}
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button size="sm" variant="ghost">
              Entrar
            </Button>
          </Link>
          <Link to="/cadastro">
            <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
              Começar
            </Button>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <main className="relative mx-auto max-w-6xl px-6 pb-24 pt-12 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            IA adaptativa em tempo real
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Sua aprovação,
            <br />
            guiada por <span className="text-gradient">inteligência artificial</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            O AprovaIA conhece você, seu concurso e sua rotina — e monta um plano
            que evolui junto com seu desempenho. Sem planilha, sem achismo.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/onboarding">
              <Button size="lg" className="h-12 gap-2 bg-gradient-primary px-6 text-base text-primary-foreground shadow-glow hover:opacity-95">
                Começar agora <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {["Grátis para começar", "Sem cartão", "Cancelamento a qualquer momento"].map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {s}
              </span>
            ))}
          </div>
        </div>

        {/* FEATURES */}
        <section className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { i: Brain, t: "IA Tutor 24/7", d: "Tira dúvidas, gera resumos e questões direcionadas." },
            { i: Target, t: "Cronograma adaptativo", d: "Reage ao seu desempenho semana a semana." },
            { i: TrendingUp, t: "Analytics premium", d: "Veja exatamente onde você cresce e onde precisa reforçar." },
            { i: Shield, t: "Repetição espaçada", d: "Suas revisões na hora certa, automaticamente." },
          ].map((f) => (
            <div key={f.t} className="group relative overflow-hidden rounded-2xl border border-border glass p-5 hover-lift">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
                <f.i className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="mt-4 text-sm font-semibold">{f.t}</div>
              <p className="mt-1 text-xs text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>

        {/* IDENTITY */}
        <section className="mt-24 rounded-3xl border border-border glass p-8 sm:p-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" /> Identidade que se adapta
              </div>
              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                Uma plataforma diferente para <span className="text-gradient">cada concurso</span>.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Militar, Policial, Tribunal, Saúde ou Fiscal — o AprovaIA muda
                cores, ambientação e linguagem visual para refletir o universo
                do seu objetivo. Você sente que está dentro dele.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {[
                { l: "Militar", c: "oklch(0.62 0.13 145)" },
                { l: "Policial", c: "oklch(0.62 0.22 25)" },
                { l: "Tribunal", c: "oklch(0.78 0.14 80)" },
                { l: "Saúde", c: "oklch(0.78 0.13 220)" },
                { l: "Fiscal", c: "oklch(0.68 0.16 245)" },
              ].map((a) => (
                <div key={a.l} className="rounded-2xl border border-border bg-background/40 p-3 text-center">
                  <div className="mx-auto h-10 w-10 rounded-xl" style={{ background: a.c, boxShadow: `0 0 18px ${a.c}` }} />
                  <div className="mt-2 text-[11px] font-medium">{a.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} AprovaIA. Inteligência para sua aprovação.
        </footer>
      </main>
    </div>
  );
}
