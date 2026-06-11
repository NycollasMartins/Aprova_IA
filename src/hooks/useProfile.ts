/**
 * useProfile — fonte única de dados de perfil: `public.profiles` no Supabase
 * (Caminho B). O acesso à área privada é protegido por guard em `_app.tsx`,
 * então aqui sempre há sessão. Sem localStorage: uma só fonte de verdade.
 *
 * API pública: { user, profile, loading, refresh, updateProfile, effectiveId }.
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useArea, detectArea, ConcursoArea } from "@/contexts/ThemeContext";
import type { LocalProfile } from "./useLocalStore";

export interface Profile extends LocalProfile {
  id: string;
  email: string | null;
  avatar_url: string | null;
}

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export function useProfile() {
  const { user, loading: sessionLoading } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const { setArea } = useArea();

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    setRemoteLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(data as Profile | null);
    setRemoteLoading(false);
    if (data) {
      const a = (data.concurso_area as ConcursoArea | null) ?? detectArea(data.target_concurso);
      setArea(a);
    }
  }, [user, setArea]);

  useEffect(() => {
    if (!sessionLoading) refresh();
  }, [sessionLoading, refresh]);

  const updateProfile = useCallback(async (patch: Partial<Profile>) => {
    if (!user) return { error: new Error("Sem sessão ativa.") };
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (!error) await refresh();
    return { error };
  }, [user, refresh]);

  const effectiveId = user?.id ?? null;

  return {
    user,
    profile,
    loading: sessionLoading || remoteLoading,
    refresh,
    updateProfile,
    effectiveId,
  };
}
