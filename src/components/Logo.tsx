import { useArea } from "@/contexts/ThemeContext";
import { AREA_META } from "./AreaAmbience";

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  const { area } = useArea();
  const meta = AREA_META[area];
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
        <Icon className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary-glow animate-pulse-glow" />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-base font-bold tracking-tight">
            Aprova<span className="text-gradient">IA</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {meta.tagline}
          </div>
        </div>
      )}
    </div>
  );
}
