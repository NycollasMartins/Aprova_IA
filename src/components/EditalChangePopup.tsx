/**
 * EditalChangePopup — avisa o aluno quando o edital do concurso ativo mudou
 * desde a última vez que ele viu (retificação publicada pelo admin).
 *
 * Mostra o DIFF de tópicos (adicionados / removidos) entre a versão vista
 * (user_concursos.last_seen_edital_id) e a vigente, mais o resumo do admin.
 * Ao fechar, marca o edital vigente como visto. O recálculo do cronograma
 * entra na Etapa 3 (este componente só notifica).
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConcurso } from "@/contexts/ConcursoContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Minus, FileText, Loader2 } from "lucide-react";

interface TopicoRef {
  titulo: string;
  materia: string;
}

function keyOf(t: TopicoRef) {
  return `${t.materia}›${t.titulo}`.toLowerCase();
}

async function fetchTopicos(editalId: string): Promise<TopicoRef[]> {
  const { data } = await supabase
    .from("edital_topicos")
    .select("titulo, materia:edital_materias(nome)")
    .eq("edital_id", editalId);
  return (data ?? []).map((t: any) => ({
    titulo: t.titulo as string,
    materia: (t.materia?.nome as string) ?? "—",
  }));
}

export function EditalChangePopup() {
  const { active, markEditalSeen } = useConcurso();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<TopicoRef[]>([]);
  const [removed, setRemoved] = useState<TopicoRef[]>([]);

  const lastSeen = active?.link.last_seen_edital_id ?? null;
  const vigente = active?.edital ?? null;
  const changed = !!vigente && lastSeen !== null && lastSeen !== vigente.id;

  useEffect(() => {
    if (!active || !vigente) return;

    // Primeira vez sem referência: marca como visto, sem pop-up.
    if (lastSeen === null) {
      markEditalSeen();
      return;
    }
    if (!changed) return;

    let alive = true;
    setLoading(true);
    Promise.all([fetchTopicos(lastSeen), fetchTopicos(vigente.id)]).then(([oldT, newT]) => {
      if (!alive) return;
      const oldKeys = new Set(oldT.map(keyOf));
      const newKeys = new Set(newT.map(keyOf));
      setAdded(newT.filter((t) => !oldKeys.has(keyOf(t))));
      setRemoved(oldT.filter((t) => !newKeys.has(keyOf(t))));
      setLoading(false);
      setOpen(true);
    });
    return () => {
      alive = false;
    };
  }, [active, vigente, lastSeen, changed, markEditalSeen]);

  async function handleClose() {
    setOpen(false);
    await markEditalSeen();
  }

  if (!vigente) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            O edital foi atualizado
          </DialogTitle>
          <DialogDescription>
            {active?.concurso.nome} — versão {vigente.versao}
            {vigente.tipo === "retificacao" ? " (retificação)" : ""}.
            Revise as mudanças abaixo; seu cronograma será recalculado.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid place-items-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="max-h-[55vh] space-y-4 overflow-y-auto">
            {vigente.resumo_mudancas && (
              <div className="rounded-xl border border-border bg-card/50 p-3 text-sm">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" /> Resumo do admin
                </div>
                <p className="whitespace-pre-wrap">{vigente.resumo_mudancas}</p>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-success">
                <Plus className="h-4 w-4" /> Tópicos adicionados
                <Badge variant="secondary" className="ml-auto">{added.length}</Badge>
              </div>
              {added.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum.</p>
              ) : (
                <ul className="space-y-1">
                  {added.map((t, i) => (
                    <li key={i} className="rounded-lg border border-success/30 bg-success/5 px-3 py-1.5 text-sm">
                      <span className="text-xs text-muted-foreground">{t.materia} • </span>{t.titulo}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
                <Minus className="h-4 w-4" /> Tópicos removidos
                <Badge variant="secondary" className="ml-auto">{removed.length}</Badge>
              </div>
              {removed.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum.</p>
              ) : (
                <ul className="space-y-1">
                  {removed.map((t, i) => (
                    <li key={i} className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-sm line-through text-muted-foreground">
                      <span className="text-xs">{t.materia} • </span>{t.titulo}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleClose} className="bg-gradient-primary text-primary-foreground">
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
