import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ConcursoArea = "neutro" | "fiscal" | "militar" | "policial" | "tribunal" | "saude";

export const AREAS: { id: ConcursoArea; label: string; description: string }[] = [
  { id: "neutro", label: "Neutro", description: "Tema IA padrão" },
  { id: "fiscal", label: "Fiscal", description: "Azul corporativo" },
  { id: "militar", label: "Militar", description: "Verde tático" },
  { id: "policial", label: "Policial", description: "Preto e vermelho" },
  { id: "tribunal", label: "Tribunal", description: "Vinho e dourado" },
  { id: "saude", label: "Saúde", description: "Azul claro" },
];

interface ThemeCtx {
  area: ConcursoArea;
  setArea: (a: ConcursoArea) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

/** Detecta a área a partir do nome de um concurso. */
export function detectArea(concurso: string | null | undefined): ConcursoArea {
  if (!concurso) return "neutro";
  const s = concurso.toLowerCase();
  if (/\b(militar|ex[eé]rcito|marinha|aeron[aá]utica|bombeir|espcex|essa|eags|eaof|ime|ita|epcar)\b/.test(s)) return "militar";
  if (/\b(pol[ií]cia|pf|prf|pc|pm|pen[ai]l|agente|escriv[aã]o|papiloscop|depen)\b/.test(s)) return "policial";
  if (/\b(tribunal|trt|trf|tj|tre|tst|stj|stf|mp[fu]?|minist[eé]rio p[uú]blico|magistratura|cnj|defensor)\b/.test(s)) return "tribunal";
  if (/\b(sa[uú]de|hospital|m[eé]dico|enferm|fiocruz|sus|inca|anvisa)\b/.test(s)) return "saude";
  if (/\b(fiscal|receita|icms|iss|auditor|sefaz|rfb|fazend[áa]rio|tesouro)\b/.test(s)) return "fiscal";
  return "neutro";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [area, setArea] = useState<ConcursoArea>(() => {
    if (typeof window === "undefined") return "neutro";
    return (localStorage.getItem("aprovaia.area") as ConcursoArea) || "neutro";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", area);
    document.documentElement.classList.add("dark");
    localStorage.setItem("aprovaia.area", area);
  }, [area]);

  return <Ctx.Provider value={{ area, setArea }}>{children}</Ctx.Provider>;
}

export function useArea() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useArea must be used within ThemeProvider");
  return ctx;
}
