/**
 * ConcursoContext — concurso ATIVO do aluno + edital VIGENTE (Etapa 2).
 *
 * É a base de tudo: o concurso selecionado "na parte superior" define qual
 * edital vigente alimenta cronograma, progresso e dashboard. Também expõe o
 * status (PRÉ-EDITAL quando não há data de prova) e o vínculo user_concursos
 * (com last_seen_edital_id, usado pelo pop-up de mudança de edital).
 */

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useProfile";
import { useArea, ConcursoArea } from "@/contexts/ThemeContext";
import type { Tables } from "@/integrations/supabase/types";

export type Concurso = Tables<"concursos">;
export type Edital = Tables<"editais">;
export type UserConcurso = Tables<"user_concursos">;

export type ConcursoStatus = "sem_concurso" | "pre_edital" | "com_data";

interface Active {
  link: UserConcurso;
  concurso: Concurso;
  edital: Edital | null; // vigente
}

interface ConcursoCtx {
  loading: boolean;
  active: Active | null;
  status: ConcursoStatus;
  examDate: string | null; // data_prova do edital vigente
  meusConcursos: (UserConcurso & { concurso: Concurso })[];
  refresh: () => Promise<void>;
  /** Seleciona (matricula, se preciso) e ativa um concurso do catálogo. */
  selectConcurso: (concursoId: string) => Promise<{ error: Error | null }>;
  /** Marca o edital vigente como "visto" (fecha o pop-up de mudança). */
  markEditalSeen: () => Promise<void>;
}

const Ctx = createContext<ConcursoCtx | null>(null);

export function ConcursoProvider({ children }: { children: ReactNode }) {
  const { user, loading: sessionLoading } = useSession();
  const { setArea } = useArea();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Active | null>(null);
  const [meusConcursos, setMeus] = useState<(UserConcurso & { concurso: Concurso })[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setActive(null);
      setMeus([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: links } = await supabase
      .from("user_concursos")
      .select("*, concurso:concursos(*)")
      .eq("user_id", user.id);

    const list = (links ?? []) as (UserConcurso & { concurso: Concurso })[];
    setMeus(list);

    const activeLink = list.find((l) => l.ativo) ?? null;
    if (!activeLink || !activeLink.concurso) {
      setActive(null);
      setLoading(false);
      return;
    }

    const { data: edital } = await supabase
      .from("editais")
      .select("*")
      .eq("concurso_id", activeLink.concurso_id)
      .eq("vigente", true)
      .maybeSingle();

    setActive({ link: activeLink, concurso: activeLink.concurso, edital: edital ?? null });
    if (activeLink.concurso.area) setArea(activeLink.concurso.area as ConcursoArea);
    setLoading(false);
  }, [user, setArea]);

  useEffect(() => {
    if (!sessionLoading) refresh();
  }, [sessionLoading, refresh]);

  const selectConcurso = useCallback(
    async (concursoId: string) => {
      if (!user) return { error: new Error("Sem sessão ativa.") };

      // Edital vigente atual vira o "já visto" — evita pop-up na 1ª seleção.
      const { data: vigente } = await supabase
        .from("editais")
        .select("id")
        .eq("concurso_id", concursoId)
        .eq("vigente", true)
        .maybeSingle();

      const { error } = await supabase
        .from("user_concursos")
        .upsert(
          {
            user_id: user.id,
            concurso_id: concursoId,
            ativo: true,
            last_seen_edital_id: vigente?.id ?? null,
          },
          { onConflict: "user_id,concurso_id" },
        );
      if (!error) await refresh();
      return { error: error ? new Error(error.message) : null };
    },
    [user, refresh],
  );

  const markEditalSeen = useCallback(async () => {
    if (!user || !active?.edital) return;
    await supabase
      .from("user_concursos")
      .update({ last_seen_edital_id: active.edital.id })
      .eq("id", active.link.id);
    await refresh();
  }, [user, active, refresh]);

  const examDate = active?.edital?.data_prova ?? null;
  const status: ConcursoStatus = !active ? "sem_concurso" : examDate ? "com_data" : "pre_edital";

  return (
    <Ctx.Provider
      value={{ loading, active, status, examDate, meusConcursos, refresh, selectConcurso, markEditalSeen }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useConcurso() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConcurso must be used within ConcursoProvider");
  return ctx;
}
