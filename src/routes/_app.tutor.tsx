import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/Topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Construction } from "lucide-react";

export const Route = createFileRoute("/_app/tutor")({
  head: () => ({ meta: [{ title: "IA Tutor — AprovaIA" }] }),
  component: Tutor,
});

// Tutor IA temporariamente desativado: a Edge Function "ai-tutor" ainda não
// existe. Em vez de simular respostas, mostramos um estado honesto "em breve".
// Para reativar: implementar supabase/functions/ai-tutor e restaurar o chat.
function Tutor() {
  return (
    <>
      <Topbar title="IA Tutor" subtitle="Tire dúvidas sobre seu concurso" />
      <main className="flex-1 p-4 sm:p-6">
        <Card className="border-dashed border-border bg-card/40">
          <CardContent className="grid place-items-center gap-3 p-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
              <Construction className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="text-lg font-semibold">IA Tutor em breve</div>
            <p className="max-w-md text-sm text-muted-foreground">
              Estamos finalizando a integração de inteligência artificial. Enquanto
              isso, registre seus estudos, questões e revisões — seu desempenho já
              está sendo acompanhado.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/dashboard">
                <Sparkles className="mr-1 h-4 w-4" /> Voltar ao dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
