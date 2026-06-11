import { AREAS, useArea } from "@/contexts/ThemeContext";
import { Shield, Swords, Scale, HeartPulse, Building2, Sparkles, LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  neutro: Sparkles,
  militar: Swords,
  policial: Shield,
  tribunal: Scale,
  saude: HeartPulse,
  fiscal: Building2,
};

export function AreaSwitcher() {
  const { area, setArea } = useArea();
  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Área do concurso
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
      </div>
      <div className="grid grid-cols-5 gap-1">
        {AREAS.map((a) => {
          const Icon = ICONS[a.id] ?? Sparkles;
          const active = area === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setArea(a.id)}
              title={`${a.label} — ${a.description}`}
              className={`grid h-9 place-items-center rounded-lg border transition-all ${
                active
                  ? "border-primary bg-primary/15 text-primary shadow-glow"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-accent/40"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Tema: <span className="font-medium text-foreground">{AREAS.find((x) => x.id === area)?.label}</span>
      </div>
    </div>
  );
}
