import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Recuperar senha — AprovaIA" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 area-bg opacity-90" />
      <div className="absolute inset-0 bg-gradient-hero opacity-70" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <Link to="/"><Logo /></Link>
        <div className="mt-10 animate-fade-in">
          {sent ? (
            <div className="rounded-2xl border border-border glass p-6 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary shadow-glow">
                <MailCheck className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="mt-4 text-xl font-bold">Verifique seu e-mail</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enviamos um link para <strong className="text-foreground">{email}</strong>. Clique nele para redefinir sua senha.
              </p>
              <Link to="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
                Voltar para login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Recuperar senha</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Informe seu e-mail e enviaremos um link para redefinir.
              </p>
              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
                </Button>
                <Link to="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
                  Voltar
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
