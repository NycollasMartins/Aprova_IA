/**
 * useRole — papéis do usuário logado (owner/admin/user) a partir de
 * public.user_roles. Usado para liberar a área de admin (cadastro de editais).
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useProfile";

export function useRole() {
  const { user, loading: sessionLoading } = useSession();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!active) return;
        setRoles((data ?? []).map((r) => r.role as string));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, sessionLoading]);

  const isAdmin = roles.includes("admin") || roles.includes("owner");
  const isOwner = roles.includes("owner");

  return { roles, isAdmin, isOwner, loading: sessionLoading || loading };
}
