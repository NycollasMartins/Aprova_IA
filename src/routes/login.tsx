import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, ShieldCheck, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — AprovaIA" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message);
      return;
    }
    // Decide o destino conforme o onboarding já concluído ou não.
    const userId = data.user?.id;
    let onboarded = true;
    if (userId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", userId)
        .maybeSingle();
      onboarded = prof?.onboarding_completed ?? false;
    }
    setLoading(false);
    toast.success("Bem-vindo de volta!");
    nav({ to: onboarded ? "/dashboard" : "/onboarding", replace: true });
  }

  // Google sign-in pode ser ativado pelo painel — placeholder removido para evitar dependência ausente.

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 area-bg opacity-90" />
      <div className="absolute inset-0 bg-gradient-hero opacity-70" />
      <div className="relative grid min-h-screen lg:grid-cols-2">
        <div className="hidden flex-col justify-between border-r border-border bg-card/30 p-10 lg:flex">
          <Link to="/"><Logo /></Link>
          <div className="space-y-6">
            <h2 className="max-w-md text-4xl font-semibold leading-tight">
              Sua aprovação,<br />guiada por <span className="text-gradient">inteligência artificial</span>.
            </h2>
            <div className="space-y-3">
              {[
                { icon: Sparkles, t: "IA Tutor 24/7", d: "Tire dúvidas e gere resumos instantâneos." },
                { icon: TrendingUp, t: "Cronograma adaptativo", d: "Ajustado ao seu rendimento em tempo real." },
                { icon: ShieldCheck, t: "Privado e seguro", d: "Seus dados são só seus." },
              ].map((f) => (
                <div key={f.t} className="flex items-start gap-3 rounded-xl border border-border bg-card/50 p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary">
                    <f.icon className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{f.t}</div>
                    <div className="text-xs text-muted-foreground">{f.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AprovaIA.</p>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md animate-fade-in">
            <div className="mb-8 lg:hidden"><Link to="/"><Logo /></Link></div>
            <h1 className="text-2xl font-bold">Bem-vindo de volta</h1>
            <p className="mt-1 text-sm text-muted-foreground">Entre para continuar sua trilha.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" placeholder="voce@exemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">Esqueci</Link>
                </div>
                <Input id="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
              </Button>
              <div className="relative my-2 text-center text-xs text-muted-foreground">
                <span className="relative z-10 bg-background px-2">apenas e-mail e senha por enquanto</span>
                <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
              </div>
              <p className="pt-3 text-center text-sm text-muted-foreground">
                Novo por aqui?{" "}
                <Link to="/cadastro" className="font-medium text-primary hover:underline">Crie sua conta</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
