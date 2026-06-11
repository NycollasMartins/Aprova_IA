import { useArea } from "@/contexts/ThemeContext";
import {
  Shield,
  Swords,
  Scale,
  HeartPulse,
  Building2,
  Sparkles,
  LucideIcon,
} from "lucide-react";

export const AREA_META: Record<
  string,
  { icon: LucideIcon; tagline: string; mission: string }
> = {
  neutro: {
    icon: Sparkles,
    tagline: "Inteligência adaptativa",
    mission: "Sua jornada começa aqui",
  },
  militar: {
    icon: Swords,
    tagline: "Operação Tática",
    mission: "Disciplina, estratégia e execução",
  },
  policial: {
    icon: Shield,
    tagline: "Central de Inteligência",
    mission: "Investigação, agilidade e combate",
  },
  tribunal: {
    icon: Scale,
    tagline: "Câmara de Autoridade",
    mission: "Sofisticação, autoridade e seriedade",
  },
  saude: {
    icon: HeartPulse,
    tagline: "Clínica de Alta Performance",
    mission: "Clareza, organização e tranquilidade",
  },
  fiscal: {
    icon: Building2,
    tagline: "Mesa de Inteligência Fiscal",
    mission: "Análise, estratégia e elite financeira",
  },
};

/** Full-screen ambient layer behind the app (fixed). */
export function AreaAmbientLayer() {
  const { area } = useArea();
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 area-bg opacity-90"
      data-area={area}
    />
  );
}

/** Animated decorative SVG that adapts to the current area. */
export function AreaDecor({ className = "" }: { className?: string }) {
  const { area } = useArea();

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {area === "neutro" && <NeutroOrb />}
      {area === "militar" && <MilitarRadar />}
      {area === "policial" && <PolicialSirene />}
      {area === "tribunal" && <TribunalColumns />}
      {area === "saude" && <SaudeEcg />}
      {area === "fiscal" && <FiscalTicker />}
    </div>
  );
}

function NeutroOrb() {
  return (
    <div className="absolute -right-10 -top-10 h-72 w-72 opacity-70">
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <defs>
          <radialGradient id="orb" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary-glow)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="95" fill="url(#orb)" />
        {[40, 65, 90].map((r, i) => (
          <circle
            key={r}
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="var(--primary)"
            strokeOpacity={0.25 - i * 0.05}
            strokeDasharray="2 6"
          />
        ))}
        <circle cx="135" cy="70" r="2.5" fill="var(--primary-glow)" className="animate-pulse-glow" />
        <circle cx="75" cy="140" r="2" fill="var(--primary-glow)" />
      </svg>
    </div>
  );
}

function MilitarRadar() {
  return (
    <div className="absolute -right-10 -top-10 h-72 w-72 opacity-60">
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <defs>
          <radialGradient id="rad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--primary-glow)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--primary-glow)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="95" fill="url(#rad)" />
        {[30, 55, 80].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="var(--primary)" strokeOpacity="0.35" strokeDasharray="2 4" />
        ))}
        <line x1="100" y1="100" x2="100" y2="5" stroke="var(--primary)" strokeOpacity="0.4" />
        <line x1="100" y1="100" x2="195" y2="100" stroke="var(--primary)" strokeOpacity="0.4" />
        <g className="animate-radar">
          <path d="M100,100 L100,5 A95,95 0 0,1 195,100 Z" fill="url(#sweep)" />
        </g>
        <circle cx="138" cy="62" r="2.5" fill="var(--primary-glow)" className="animate-pulse-glow" />
        <circle cx="70" cy="140" r="2" fill="var(--primary-glow)" />
        <circle cx="155" cy="130" r="2" fill="var(--primary-glow)" />
      </svg>
    </div>
  );
}

function PolicialSirene() {
  return (
    <>
      <div className="absolute right-6 top-6 flex gap-3">
        <span className="h-3 w-3 rounded-full bg-[oklch(0.62_0.22_25)] shadow-[0_0_18px_4px_oklch(0.62_0.22_25/.6)] animate-sirene-red" />
        <span className="h-3 w-3 rounded-full bg-[oklch(0.55_0.2_260)] shadow-[0_0_18px_4px_oklch(0.55_0.2_260/.6)] animate-sirene-blue" />
      </div>
      <div className="absolute -bottom-6 -right-6 h-60 w-60 opacity-50">
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <defs>
            <pattern id="cross" width="14" height="14" patternUnits="userSpaceOnUse">
              <path d="M7 0 L7 14 M0 7 L14 7" stroke="var(--primary)" strokeOpacity=".18" strokeWidth=".6" />
            </pattern>
          </defs>
          <rect width="200" height="200" fill="url(#cross)" />
          <path d="M10 160 Q60 110 100 130 T 195 70" fill="none" stroke="var(--primary)" strokeWidth="1.4" strokeOpacity=".7" strokeDasharray="3 5" />
          <circle cx="100" cy="130" r="4" fill="var(--primary-glow)" className="animate-pulse-glow" />
          <circle cx="195" cy="70" r="3" fill="var(--primary-glow)" />
        </svg>
      </div>
    </>
  );
}

function TribunalColumns() {
  return (
    <div className="absolute inset-0 opacity-40">
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="col" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity=".6" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 110, 180, 250, 320].map((x) => (
          <g key={x}>
            <rect x={x} y="10" width="34" height="180" fill="url(#col)" opacity=".35" />
            <rect x={x - 4} y="6" width="42" height="6" fill="var(--primary)" opacity=".5" />
            <rect x={x - 4} y="186" width="42" height="6" fill="var(--primary)" opacity=".5" />
          </g>
        ))}
      </svg>
      <div className="absolute right-6 top-6 grid h-14 w-14 place-items-center rounded-full border border-[color:var(--primary)]/40 animate-float-slow">
        <Scale className="h-7 w-7 text-[color:var(--primary)]" />
      </div>
    </div>
  );
}

function SaudeEcg() {
  return (
    <div className="absolute inset-x-0 bottom-0 h-32 opacity-70">
      <svg viewBox="0 0 600 120" preserveAspectRatio="none" className="h-full w-full">
        <line x1="0" y1="60" x2="600" y2="60" stroke="var(--primary)" strokeOpacity=".15" />
        <path
          d="M0 60 L80 60 L95 60 L105 30 L115 90 L125 60 L200 60 L215 60 L225 20 L235 100 L245 60 L380 60 L395 60 L405 25 L415 95 L425 60 L600 60"
          fill="none" stroke="var(--primary)" strokeWidth="2" className="animate-ecg"
        />
      </svg>
      <div className="absolute right-6 top-2 grid h-10 w-10 place-items-center rounded-xl bg-[color:var(--primary)]/15 border border-[color:var(--primary)]/30 animate-float-slow">
        <HeartPulse className="h-5 w-5 text-[color:var(--primary)]" />
      </div>
    </div>
  );
}

function FiscalTicker() {
  const items = ["IBOV ▲ 1.2%", "USD 5.18", "SELIC 10.5%", "IPCA 0.42%", "DI 11.1%", "S&P ▲ 0.8%"];
  return (
    <>
      <div className="absolute inset-x-0 bottom-0 flex overflow-hidden border-t border-border/60 bg-background/40 backdrop-blur-sm">
        <div className="flex animate-ticker whitespace-nowrap py-1.5 text-[10px] font-mono tracking-wider text-muted-foreground">
          {[...items, ...items, ...items, ...items].map((s, i) => (
            <span key={i} className="px-6">
              <span className="text-[color:var(--primary)]">●</span> {s}
            </span>
          ))}
        </div>
      </div>
      <div className="absolute right-6 top-6 h-24 w-40 opacity-70">
        <svg viewBox="0 0 160 80" className="h-full w-full">
          <defs>
            <linearGradient id="bars" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity=".2" />
              <stop offset="100%" stopColor="var(--primary-glow)" stopOpacity=".9" />
            </linearGradient>
          </defs>
          {[12, 28, 18, 42, 36, 58, 48, 70].map((h, i) => (
            <rect key={i} x={i * 20 + 2} y={80 - h} width="14" height={h} rx="2" fill="url(#bars)" />
          ))}
        </svg>
      </div>
    </>
  );
}
