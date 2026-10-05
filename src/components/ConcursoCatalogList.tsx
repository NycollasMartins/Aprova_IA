/**
 * ConcursoCatalogList — lista o catálogo de concursos (admin) e deixa o aluno
 * escolher um. Presentacional: apenas busca os concursos ativos e dispara
 * onSelect(concursoId). Quem usa decide o que fazer (matricular, trocar etc.).
 * Reaproveitado no onboarding, em Configurações e no seletor da Topbar.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Loader2, Check, Search, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";

type Concurso = Tables<"concursos">;

export function ConcursoCatalogList({
  selectedId,
  onSelect,
}: {
  selectedId?: string | null;
  onSelect: (concursoId: string) => void;
}) {
  const [items, setItems] = useState<Concurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    supabase
      .from("concursos")
      .select("*")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => {
        if (!alive) return;
        setItems((data ?? []) as Concurso[]);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = items.filter((c) =>
    `${c.nome} ${c.orgao ?? ""} ${c.banca ?? ""} ${c.cargo ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="grid place-items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center">
        <GraduationCap className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhum concurso disponível no catálogo ainda. O administrador precisa cadastrar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar concurso..." className="pl-9" />
      </div>
      <div className="max-h-[50vh] space-y-2 overflow-y-auto">
        {filtered.map((c) => {
          const active = selectedId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                active
                  ? "border-primary bg-primary/10 shadow-glow"
                  : "border-border bg-card/50 hover:border-primary/40"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.nome}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {[c.orgao, c.banca, c.cargo, c.ano].filter(Boolean).join(" • ") || "—"}
                </div>
              </div>
              {c.status === "pre_edital" && (
                <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                  PRÉ-EDITAL
                </span>
              )}
              {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">Nenhum resultado para "{q}".</p>
        )}
      </div>
    </div>
  );
}
