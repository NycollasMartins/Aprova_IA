/**
 * StudyTimerContext — cronômetro de horas LÍQUIDAS de estudo (Etapa 4).
 *
 * Conta apenas o tempo em que está rodando (pausas não contam). Vive no nível
 * do _app para sobreviver à navegação entre abas e persiste em localStorage
 * para sobreviver a reloads. Ao finalizar, grava uma study_session concluída
 * (tipo 'cronometro') vinculada ao concurso ativo — alimenta o Dashboard.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useProfile";
import { useConcurso } from "@/contexts/ConcursoContext";

const LS_KEY = "aprovaia.timer";

interface Persisted {
  accumulatedMs: number;
  runningSince: number | null; // timestamp do início do segmento atual
  subject: string;
}

interface TimerCtx {
  running: boolean;
  elapsedMs: number;
  subject: string;
  setSubject: (s: string) => void;
  toggle: () => void;
  reset: () => void;
  finish: () => Promise<void>;
  saving: boolean;
}

const Ctx = createContext<TimerCtx | null>(null);

function loadPersisted(): Persisted {
  if (typeof window === "undefined") return { accumulatedMs: 0, runningSince: null, subject: "" };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {
    /* ignore */
  }
  return { accumulatedMs: 0, runningSince: null, subject: "" };
}

export function StudyTimerProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const { active } = useConcurso();
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const hydrated = useRef(false);

  // Hidrata do localStorage uma vez.
  useEffect(() => {
    const p = loadPersisted();
    setAccumulatedMs(p.accumulatedMs);
    setRunningSince(p.runningSince);
    setSubject(p.subject);
    hydrated.current = true;
  }, []);

  // Persiste a cada mudança relevante.
  useEffect(() => {
    if (!hydrated.current) return;
    const p: Persisted = { accumulatedMs, runningSince, subject };
    try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  }, [accumulatedMs, runningSince, subject]);

  // Tick de 1s enquanto roda (atualiza o display).
  useEffect(() => {
    if (runningSince === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [runningSince]);

  const elapsedMs = accumulatedMs + (runningSince !== null ? Math.max(0, now - runningSince) : 0);
  const running = runningSince !== null;

  const toggle = useCallback(() => {
    setNow(Date.now());
    if (runningSince === null) {
      setRunningSince(Date.now());
    } else {
      setAccumulatedMs((a) => a + Math.max(0, Date.now() - runningSince));
      setRunningSince(null);
    }
  }, [runningSince]);

  const reset = useCallback(() => {
    setAccumulatedMs(0);
    setRunningSince(null);
    setSubject("");
  }, []);

  const finish = useCallback(async () => {
    const total = accumulatedMs + (runningSince !== null ? Math.max(0, Date.now() - runningSince) : 0);
    const minutos = Math.round(total / 60000);
    if (!user) return;
    if (minutos < 1) {
      // Nada relevante a salvar; apenas zera.
      reset();
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("study_sessions").insert({
      user_id: user.id,
      concurso_id: active?.concurso.id ?? null,
      subject: subject.trim() || "Estudo cronometrado",
      scheduled_at: new Date().toISOString(),
      duration_min: minutos,
      status: "done",
      tipo: "cronometro",
    });
    setSaving(false);
    if (error) throw new Error(error.message);
    reset();
  }, [accumulatedMs, runningSince, user, active, subject, reset]);

  return (
    <Ctx.Provider value={{ running, elapsedMs, subject, setSubject, toggle, reset, finish, saving }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStudyTimer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStudyTimer must be used within StudyTimerProvider");
  return ctx;
}

/** Formata milissegundos como HH:MM:SS. */
export function formatHMS(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
