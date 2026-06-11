/**
 * Camada de dados unificada do AprovaIA (BLOCO 1 / Fase 1.1).
 *
 * Enquanto o login está desativado, todos os dados do usuário vivem em
 * localStorage sob o namespace `aprovaia:v1:*`. A API pública abaixo é
 * estável: quando o login voltar, trocamos a implementação interna para
 * gravar no Supabase sem mudar nenhuma tela.
 */

import { useCallback, useSyncExternalStore } from "react";

const NS = "aprovaia:v1";

// ---------- pub/sub para reagir entre componentes ----------
const listeners = new Map<string, Set<() => void>>();
function subscribe(key: string, cb: () => void) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(cb);
  return () => {
    listeners.get(key)?.delete(cb);
  };
}
function emit(key: string) {
  listeners.get(key)?.forEach((cb) => cb());
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  emit(key);
}

// ---------- hook genérico ----------
function useStored<T>(key: string, fallback: T) {
  const snap = useSyncExternalStore(
    (cb) => subscribe(key, cb),
    () => {
      const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      return raw ?? "__empty__";
    },
    () => "__empty__",
  );
  // re-derive from snapshot string (cheap, parsed once per change)
  const value: T = snap === "__empty__" ? fallback : (() => {
    try { return JSON.parse(snap) as T; } catch { return fallback; }
  })();
  const set = useCallback((updater: T | ((prev: T) => T)) => {
    const prev = read<T>(key, fallback);
    const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
    write(key, next);
  }, [key, fallback]);
  return [value, set] as const;
}

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// =====================================================================
// PROFILE
// =====================================================================
export interface LocalProfile {
  display_name: string | null;
  full_name: string | null;
  age: number | null;
  city: string | null;
  state: string | null;
  works: boolean | null;
  has_children: boolean | null;
  hours_per_day: number | null;
  routine_notes: string | null;
  has_degree: boolean | null;
  degree_name: string | null;
  degree_area: string | null;
  target_concurso: string | null;
  concurso_area: string | null;
  exam_date: string | null;
  level: string | null;
  studied_before: boolean | null;
  feeling: string | null;
  notifications_enabled: boolean;
  focus_mode: boolean;
  reminders_enabled: boolean;
  reviews_enabled: boolean;
  onboarding_completed: boolean;
}

const DEFAULT_PROFILE: LocalProfile = {
  display_name: null, full_name: null, age: null, city: null, state: null,
  works: null, has_children: null, hours_per_day: null, routine_notes: null,
  has_degree: null, degree_name: null, degree_area: null,
  target_concurso: null, concurso_area: null, exam_date: null, level: null,
  studied_before: null, feeling: null,
  notifications_enabled: true, focus_mode: false,
  reminders_enabled: true, reviews_enabled: true,
  onboarding_completed: false,
};

export function useLocalProfile() {
  const [profile, setProfile] = useStored<LocalProfile>(`${NS}:profile`, DEFAULT_PROFILE);
  const update = useCallback((patch: Partial<LocalProfile>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, [setProfile]);
  const reset = useCallback(() => setProfile(DEFAULT_PROFILE), [setProfile]);
  return { profile, update, reset };
}

// =====================================================================
// STUDY SESSIONS
// =====================================================================
export interface StudySession {
  id: string;
  subject: string;
  scheduled_at: string; // ISO
  duration_min: number;
  status: "pending" | "done" | "skipped";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useStudySessions() {
  const [items, setItems] = useStored<StudySession[]>(`${NS}:study_sessions`, []);
  const add = useCallback((input: Omit<StudySession, "id" | "created_at" | "updated_at" | "status"> & { status?: StudySession["status"] }) => {
    const now = new Date().toISOString();
    const item: StudySession = {
      id: uid(), created_at: now, updated_at: now,
      status: input.status ?? "pending",
      subject: input.subject, scheduled_at: input.scheduled_at,
      duration_min: input.duration_min, notes: input.notes ?? null,
    };
    setItems((prev) => [...prev, item]);
    return item;
  }, [setItems]);
  const update = useCallback((id: string, patch: Partial<StudySession>) => {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch, updated_at: new Date().toISOString() } : s)));
  }, [setItems]);
  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((s) => s.id !== id));
  }, [setItems]);
  return { items, add, update, remove };
}

// =====================================================================
// REVISIONS
// =====================================================================
export interface Revision {
  id: string;
  subject: string;
  due_date: string; // YYYY-MM-DD
  completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useRevisions() {
  const [items, setItems] = useStored<Revision[]>(`${NS}:revisions`, []);
  const add = useCallback((input: Omit<Revision, "id" | "created_at" | "updated_at" | "completed">) => {
    const now = new Date().toISOString();
    const item: Revision = {
      id: uid(), created_at: now, updated_at: now, completed: false,
      subject: input.subject, due_date: input.due_date, notes: input.notes ?? null,
    };
    setItems((prev) => [...prev, item]);
    return item;
  }, [setItems]);
  const update = useCallback((id: string, patch: Partial<Revision>) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r)));
  }, [setItems]);
  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((r) => r.id !== id));
  }, [setItems]);
  const complete = useCallback((id: string) => update(id, { completed: true }), [update]);
  return { items, add, update, remove, complete };
}

// =====================================================================
// QUESTION LOGS
// =====================================================================
export interface QuestionLog {
  id: string;
  subject: string;
  total: number;
  correct: number;
  wrong: number;
  logged_at: string;
  created_at: string;
}

export function useQuestionLogs() {
  const [items, setItems] = useStored<QuestionLog[]>(`${NS}:question_logs`, []);
  const add = useCallback((input: Omit<QuestionLog, "id" | "created_at" | "logged_at"> & { logged_at?: string }) => {
    const now = new Date().toISOString();
    const item: QuestionLog = {
      id: uid(), created_at: now, logged_at: input.logged_at ?? now,
      subject: input.subject, total: input.total, correct: input.correct, wrong: input.wrong,
    };
    setItems((prev) => [...prev, item]);
    return item;
  }, [setItems]);
  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((l) => l.id !== id));
  }, [setItems]);
  return { items, add, remove };
}

// =====================================================================
// UTIL: limpa tudo (debug / reset)
// =====================================================================
export function resetAllLocalData() {
  if (typeof window === "undefined") return;
  [`${NS}:profile`, `${NS}:study_sessions`, `${NS}:revisions`, `${NS}:question_logs`].forEach((k) => {
    localStorage.removeItem(k);
    emit(k);
  });
}
