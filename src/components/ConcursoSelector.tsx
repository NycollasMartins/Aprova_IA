/**
 * ConcursoSelector — seletor de concurso "na parte superior" (Topbar).
 * Mostra o concurso ativo + status (PRÉ-EDITAL ou contagem para a prova),
 * permite trocar entre os concursos do aluno e escolher um novo do catálogo.
 */

import { useState } from "react";
import { useConcurso } from "@/contexts/ConcursoContext";
import { ConcursoCatalogList } from "@/components/ConcursoCatalogList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check, Plus, GraduationCap, CalendarClock, Hourglass, Loader2 } from "lucide-react";
import { toast } from "sonner";

function daysUntil(dateStr: string) {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000));
}

export function ConcursoSelector() {
  const { active, status, examDate, meusConcursos, selectConcurso, loading } = useConcurso();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  async function pick(id: string) {
    setSwitching(true);
    const { error } = await selectConcurso(id);
    setSwitching(false);
    setPickerOpen(false);
    if (error) toast.error(error.message);
    else toast.success("Concurso selecionado.");
  }

  if (loading) {
    return <div className="h-9 w-40 animate-pulse rounded-xl border border-border bg-card/40" />;
  }

  // Sem concurso ainda: botão de escolher.
  if (!active) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
          className="gap-2 border-dashed"
        >
          <GraduationCap className="h-4 w-4 text-primary" />
          Escolher concurso
        </Button>
        <PickerDialog open={pickerOpen} onOpenChange={setPickerOpen} activeId={null} onPick={pick} switching={switching} />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-left transition hover:bg-accent">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="max-w-[140px] truncate text-xs font-semibold sm:max-w-[200px]">
                  {active.concurso.nome}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </div>
              <StatusBadge status={status} examDate={examDate} />
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Meus concursos</DropdownMenuLabel>
          {meusConcursos.map((m) => (
            <DropdownMenuItem
              key={m.id}
              onClick={() => !m.ativo && pick(m.concurso_id)}
              className="gap-2"
            >
              <span className="min-w-0 flex-1 truncate">{m.concurso?.nome}</span>
              {m.ativo && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPickerOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Escolher outro concurso
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        activeId={active.concurso.id}
        onPick={pick}
        switching={switching}
      />
    </>
  );
}

function StatusBadge({ status, examDate }: { status: string; examDate: string | null }) {
  if (status === "pre_edital") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-warning">
        <Hourglass className="h-3 w-3" /> PRÉ-EDITAL
      </span>
    );
  }
  if (status === "com_data" && examDate) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
        <CalendarClock className="h-3 w-3 text-primary" /> Prova em {daysUntil(examDate)}d
      </span>
    );
  }
  return null;
}

function PickerDialog({
  open,
  onOpenChange,
  activeId,
  onPick,
  switching,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  activeId: string | null;
  onPick: (id: string) => void;
  switching: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" /> Escolher concurso
            {switching && <Loader2 className="h-4 w-4 animate-spin" />}
          </DialogTitle>
        </DialogHeader>
        <ConcursoCatalogList selectedId={activeId} onSelect={onPick} />
      </DialogContent>
    </Dialog>
  );
}
