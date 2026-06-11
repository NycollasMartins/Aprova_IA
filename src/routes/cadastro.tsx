import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Criar conta — AprovaIA" }] }),
  component: CadastroPage,
});

function CadastroPage() {
  const nav = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Senha deve ter ao menos 6 caracteres."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: { display_name: displayName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message.includes("registered") ? "E-mail já cadastrado. Faça login." : error.message);
      return;
    }
    toast.success("Conta criada! Vamos personalizar sua experiência.");
    nav({ to: "/onboarding" });
  }

  // Google sign-in placeholder removido (módulo opcional).

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 area-bg opacity-90" />
      <div className="absolute inset-0 bg-gradient-hero opacity-70" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Já tenho conta</Link>
        </div>

        <div className="animate-fade-in">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" /> Onboarding em ~2 minutos
          </div>
          <h1 className="text-2xl font-bold">Crie sua conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A IA vai te conhecer e montar um plano sob medida.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label>Como deseja ser chamado?</Label>
              <Input placeholder="Seu nome" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" placeholder="voce@exemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
