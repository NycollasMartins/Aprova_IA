/**
 * StudyTimerWidget — cronômetro de horas líquidas no canto superior direito.
 * Pílula compacta com play/pause + tempo; popover com matéria e finalizar.
 */

import { useStudyTimer, formatHMS } from "@/contexts/StudyTimerContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, Square, Timer, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export function StudyTimerWidget() {
  const { running, elapsedMs, subject, setSubject, toggle, reset, finish, saving } = useStudyTimer();
  const active = elapsedMs > 0 || running;

  async function handleFinish() {
    try {
      await finish();
      toast.success("Tempo de estudo registrado.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao registrar tempo.");
    }
  }

  return (
    <div className="flex items-center">
      <button
        onClick={toggle}
        title={running ? "Pausar estudo" : "Iniciar estudo"}
        className={`flex items-center gap-1.5 rounded-l-xl border border-r-0 border-border py-1.5 pl-2.5 pr-2 transition ${
          running ? "bg-primary/15 text-primary shadow-glow" : "bg-card/60 hover:bg-accent"
        }`}
      >
        {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        <Timer className={`h-3.5 w-3.5 ${running ? "" : "text-muted-foreground"}`} />
      </button>

      <Popover>
        <PopoverTrigger asChild>
          <button
            className={`rounded-r-xl border border-border py-1.5 px-2.5 font-mono text-xs tabular-nums transition hover:bg-accent ${
              active ? "font-semibold" : "text-muted-foreground"
            }`}
            title="Detalhes do cronômetro"
          >
            {formatHMS(elapsedMs)}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72">
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Horas líquidas de estudo</div>
              <div className="font-mono text-2xl font-bold tabular-nums">{formatHMS(elapsedMs)}</div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Matéria (opcional)</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex.: Direito Constitucional"
                className="h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={toggle} variant={running ? "outline" : "default"} className={`flex-1 ${running ? "" : "bg-gradient-primary text-primary-foreground"}`}>
                {running ? <><Pause className="mr-1 h-4 w-4" /> Pausar</> : <><Play className="mr-1 h-4 w-4" /> {elapsedMs > 0 ? "Retomar" : "Iniciar"}</>}
              </Button>
              <Button onClick={handleFinish} disabled={saving || elapsedMs < 1000} className="flex-1 bg-success text-success-foreground hover:opacity-90">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Square className="mr-1 h-4 w-4" /> Finalizar</>}
              </Button>
            </div>
            {elapsedMs > 0 && (
              <Button onClick={reset} variant="ghost" size="sm" className="w-full text-muted-foreground">
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Descartar
              </Button>
            )}
            <p className="text-center text-[11px] text-muted-foreground">
              Só conta o tempo rodando. "Finalizar" salva como estudo concluído.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
