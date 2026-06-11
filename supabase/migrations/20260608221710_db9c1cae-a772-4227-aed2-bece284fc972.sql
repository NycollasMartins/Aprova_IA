-- Restaura EXECUTE em has_role para authenticated.
-- A função é usada dentro de políticas RLS (profiles, study_sessions, etc).
-- Sem EXECUTE, qualquer operação cuja policy referencie has_role falha com
-- "permission denied for function has_role".
-- Continua sendo seguro: SECURITY DEFINER apenas consulta public.user_roles.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;