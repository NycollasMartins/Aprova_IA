-- =====================================================================
-- AprovaIA — Migração consolidada e idempotente (NOVO projeto Supabase)
-- =====================================================================
-- Caminho B: login real + Supabase como fonte única de dados, com RLS.
--
-- Como usar:
--   1. Crie um novo projeto no Supabase.
--   2. Abra SQL Editor → cole este arquivo inteiro → Run.
--   3. (Auth) Desative "Confirm email" em Authentication → Providers → Email
--      para que o cadastro já crie sessão e leve direto ao onboarding.
--   4. Atualize o .env do app (veja o bloco no fim deste arquivo).
--
-- É idempotente: pode rodar mais de uma vez sem erro.
-- Consolida e reconcilia as 6 migrações originais (incl. as idas e vindas
-- de GRANT em has_role/handle_new_user/set_updated_at).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSÕES
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. ENUM de papéis
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'user');
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. TABELAS  (criadas ANTES das funções: has_role/handle_new_user
--    referenciam user_roles/profiles, e o Postgres valida o corpo na criação)
-- ---------------------------------------------------------------------

-- 2.1 profiles — 1:1 com auth.users (alimenta dashboard, onboarding, configurações)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Identidade
  display_name TEXT,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  age INT,
  city TEXT,
  state TEXT,
  -- Vida pessoal
  works BOOLEAN,
  has_children BOOLEAN,
  hours_per_day NUMERIC,
  routine_notes TEXT,
  -- Formação
  has_degree BOOLEAN,
  degree_name TEXT,
  degree_area TEXT,
  -- Objetivo / concurso
  target_concurso TEXT,
  concurso_area TEXT,  -- militar | policial | tribunal | saude | fiscal | neutro
  exam_date DATE,
  level TEXT,          -- iniciante | intermediario | avancado
  studied_before BOOLEAN,
  feeling TEXT,
  -- Preferências de experiência
  notifications_enabled BOOLEAN DEFAULT true,
  focus_mode BOOLEAN DEFAULT false,
  reminders_enabled BOOLEAN DEFAULT true,
  reviews_enabled BOOLEAN DEFAULT true,
  -- Estado
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 user_roles — papéis (owner/admin/user). Alimenta has_role e telas de owner.
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 2.3 study_sessions — cronograma (tela Cronograma + cards do Dashboard)
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | done | skipped
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 question_logs — resoluções de questões (telas Questões e Desempenho)
CREATE TABLE IF NOT EXISTS public.question_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  total INTEGER NOT NULL CHECK (total > 0),
  correct INTEGER NOT NULL DEFAULT 0 CHECK (correct >= 0),
  wrong INTEGER NOT NULL DEFAULT 0 CHECK (wrong >= 0),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT question_logs_correct_lte_total CHECK (correct <= total)
);

-- 2.5 revisions — revisões / repetição espaçada (tela Revisões + Dashboard)
CREATE TABLE IF NOT EXISTS public.revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  due_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 3. FUNÇÕES utilitárias (depois das tabelas que elas referenciam)
-- ---------------------------------------------------------------------

-- Atualiza updated_at em qualquer UPDATE. Roda como invoker (não precisa privilégio).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- Verifica papel do usuário. SECURITY DEFINER para ser usada dentro de policies
-- sem expor a tabela user_roles diretamente.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Cria o profile automaticamente quando um usuário se cadastra.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------
-- 4. ÍNDICES (consultas por usuário e por data)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id        ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user        ON public.study_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_sched  ON public.study_sessions (user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_question_logs_user         ON public.question_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_question_logs_user_logged  ON public.question_logs (user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_revisions_user             ON public.revisions (user_id);
CREATE INDEX IF NOT EXISTS idx_revisions_user_due         ON public.revisions (user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_revisions_user_completed   ON public.revisions (user_id, completed);

-- ---------------------------------------------------------------------
-- 5. TRIGGERS
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS study_sessions_set_updated_at ON public.study_sessions;
CREATE TRIGGER study_sessions_set_updated_at
  BEFORE UPDATE ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS revisions_set_updated_at ON public.revisions;
CREATE TRIGGER revisions_set_updated_at
  BEFORE UPDATE ON public.revisions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- 6. RLS — habilitar
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revisions      ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 7. POLÍTICAS RLS (cada usuário só vê/edita o que é seu; owner vê tudo)
-- ---------------------------------------------------------------------

-- 7.1 profiles
DROP POLICY IF EXISTS "profiles_select_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_owner" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_owner" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_select_owner" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "profiles_update_owner" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- 7.2 user_roles
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manage" ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "user_roles_manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- 7.3 study_sessions
DROP POLICY IF EXISTS "study_sessions_select" ON public.study_sessions;
DROP POLICY IF EXISTS "study_sessions_insert" ON public.study_sessions;
DROP POLICY IF EXISTS "study_sessions_update" ON public.study_sessions;
DROP POLICY IF EXISTS "study_sessions_delete" ON public.study_sessions;

CREATE POLICY "study_sessions_select" ON public.study_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "study_sessions_insert" ON public.study_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_sessions_update" ON public.study_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_sessions_delete" ON public.study_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));

-- 7.4 question_logs (o app só faz insert/select/delete; sem update)
DROP POLICY IF EXISTS "question_logs_select" ON public.question_logs;
DROP POLICY IF EXISTS "question_logs_insert" ON public.question_logs;
DROP POLICY IF EXISTS "question_logs_delete" ON public.question_logs;

CREATE POLICY "question_logs_select" ON public.question_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "question_logs_insert" ON public.question_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "question_logs_delete" ON public.question_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 7.5 revisions
DROP POLICY IF EXISTS "revisions_select" ON public.revisions;
DROP POLICY IF EXISTS "revisions_insert" ON public.revisions;
DROP POLICY IF EXISTS "revisions_update" ON public.revisions;
DROP POLICY IF EXISTS "revisions_delete" ON public.revisions;

CREATE POLICY "revisions_select" ON public.revisions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "revisions_insert" ON public.revisions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "revisions_update" ON public.revisions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "revisions_delete" ON public.revisions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 8. GRANTS (consolidando as idas e vindas das migrações originais)
-- ---------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_logs  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revisions      TO authenticated;
GRANT SELECT                          ON public.user_roles    TO authenticated;

GRANT ALL ON public.profiles       TO service_role;
GRANT ALL ON public.user_roles     TO service_role;
GRANT ALL ON public.study_sessions TO service_role;
GRANT ALL ON public.question_logs  TO service_role;
GRANT ALL ON public.revisions      TO service_role;

-- Funções de trigger: rodam pelo trigger, não precisam de EXECUTE por clientes.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()   FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.handle_new_user()  TO service_role;
GRANT  EXECUTE ON FUNCTION public.set_updated_at()   TO service_role;

-- has_role é usada dentro das policies. O estado final das migrações concedia
-- EXECUTE a authenticated/anon (evita "permission denied for function has_role").
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------
-- 9. STORAGE — bucket "avatars" (upload de foto em Configurações)
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own"    ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own"    ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own"    ON storage.objects;

-- Leitura pública (bucket é public), restrita a objetos com prefixo de pasta.
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] IS NOT NULL);

-- Upload/atualização/remoção apenas na própria pasta: avatars/<uid>/arquivo
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================================
-- 10. (OPCIONAL) Tornar-se OWNER
-- =====================================================================
-- Depois de se cadastrar pela primeira vez, descubra seu id em
-- Authentication → Users e rode (trocando o UUID):
--
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('SEU-UUID-AQUI', 'owner')
-- ON CONFLICT (user_id, role) DO NOTHING;
--
-- =====================================================================
-- 11. VARIÁVEIS DE AMBIENTE (.env) a atualizar para o novo projeto
-- =====================================================================
--   VITE_SUPABASE_URL              = https://<novo-ref>.supabase.co
--   VITE_SUPABASE_PUBLISHABLE_KEY  = <anon/publishable key do novo projeto>
--   VITE_SUPABASE_PROJECT_ID       = <novo-ref>
--   SUPABASE_URL                   = https://<novo-ref>.supabase.co
--   SUPABASE_PUBLISHABLE_KEY       = <anon/publishable key do novo projeto>
--   SUPABASE_PROJECT_ID            = <novo-ref>
--   SUPABASE_SERVICE_ROLE_KEY      = <service role key>  (apenas servidor; opcional)
-- Também atualize supabase/config.toml → project_id = "<novo-ref>".
-- =====================================================================
