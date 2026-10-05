-- =====================================================================
-- AprovaIA — Módulo EDITAL (Etapa 2)  — idempotente
-- =====================================================================
-- Fundação de TUDO: catálogo de concursos (admin) → editais versionados
-- (v1, v2…) → matérias → tópicos. O aluno seleciona um concurso e o
-- sistema passa a refletir o EDITAL VIGENTE (cronograma, progresso, dashboard).
--
-- Fonte dos dados: CADASTRO MANUAL POR ADMIN (decidido com o cliente).
-- Hierarquia: Matéria → Tópico (2 níveis).
--
-- Como usar:
--   1. Rode primeiro o init_new_project.sql (cria profiles, user_roles, has_role…).
--   2. SQL Editor → cole este arquivo inteiro → Run.  Pode rodar mais de uma vez.
--   3. Para ser admin: INSERT em user_roles com role 'admin' ou 'owner' (ver fim).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Helper: is_admin (owner OU admin). Usado nas policies de escrita.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'owner') OR public.has_role(_user_id, 'admin')
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------
-- 1. TABELAS
-- ---------------------------------------------------------------------

-- 1.1 concursos — catálogo mantido pelo admin
CREATE TABLE IF NOT EXISTS public.concursos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  banca TEXT,
  orgao TEXT,
  cargo TEXT,
  area TEXT,            -- militar | policial | tribunal | saude | fiscal | neutro
  ano INT,
  status TEXT NOT NULL DEFAULT 'pre_edital',  -- pre_edital | edital_publicado | encerrado
  ativo BOOLEAN NOT NULL DEFAULT true,        -- visível no catálogo do aluno
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 editais — versões do edital de um concurso (v1, v2 = retificações)
CREATE TABLE IF NOT EXISTS public.editais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  concurso_id UUID NOT NULL REFERENCES public.concursos(id) ON DELETE CASCADE,
  versao INT NOT NULL DEFAULT 1,
  tipo TEXT NOT NULL DEFAULT 'original',   -- original | retificacao
  titulo TEXT,
  data_publicacao DATE,
  data_prova DATE,                          -- data oficial da prova (NULL = pré-edital)
  vigente BOOLEAN NOT NULL DEFAULT true,    -- só 1 vigente por concurso (garantido por trigger)
  resumo_mudancas TEXT,                     -- preenchido pelo admin numa retificação
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (concurso_id, versao)
);

-- 1.3 edital_materias — disciplinas de um edital
CREATE TABLE IF NOT EXISTS public.edital_materias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edital_id UUID NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  peso NUMERIC,        -- nº de questões / peso da matéria (opcional)
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 edital_topicos — tópicos de cada matéria (a base do progresso/cronograma)
CREATE TABLE IF NOT EXISTS public.edital_topicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  materia_id UUID NOT NULL REFERENCES public.edital_materias(id) ON DELETE CASCADE,
  edital_id UUID NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,  -- denormalizado p/ queries
  titulo TEXT NOT NULL,
  codigo TEXT,         -- ex.: "1.1" (opcional)
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.5 user_concursos — vínculo aluno ↔ concurso (qual ele segue)
CREATE TABLE IF NOT EXISTS public.user_concursos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concurso_id UUID NOT NULL REFERENCES public.concursos(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,                         -- concurso atualmente selecionado
  last_seen_edital_id UUID REFERENCES public.editais(id) ON DELETE SET NULL,  -- p/ pop-up de mudança
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, concurso_id)
);

-- 1.6 user_topico_progresso — tópico concluído pelo aluno (alimenta Dashboard)
CREATE TABLE IF NOT EXISTS public.user_topico_progresso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topico_id UUID NOT NULL REFERENCES public.edital_topicos(id) ON DELETE CASCADE,
  concluido BOOLEAN NOT NULL DEFAULT true,
  concluido_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topico_id)
);

-- ---------------------------------------------------------------------
-- 2. TRIGGERS — updated_at + garantir 1 edital vigente por concurso
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS concursos_set_updated_at ON public.concursos;
CREATE TRIGGER concursos_set_updated_at
  BEFORE UPDATE ON public.concursos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS editais_set_updated_at ON public.editais;
CREATE TRIGGER editais_set_updated_at
  BEFORE UPDATE ON public.editais
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_concursos_set_updated_at ON public.user_concursos;
CREATE TRIGGER user_concursos_set_updated_at
  BEFORE UPDATE ON public.user_concursos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ao marcar um edital como vigente, desmarca os outros do mesmo concurso.
CREATE OR REPLACE FUNCTION public.editais_single_vigente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.vigente THEN
    UPDATE public.editais
       SET vigente = false
     WHERE concurso_id = NEW.concurso_id
       AND id <> NEW.id
       AND vigente = true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS editais_single_vigente_trg ON public.editais;
CREATE TRIGGER editais_single_vigente_trg
  AFTER INSERT OR UPDATE OF vigente ON public.editais
  FOR EACH ROW WHEN (NEW.vigente)
  EXECUTE FUNCTION public.editais_single_vigente();

-- Garante 1 concurso ativo por usuário: ao ativar um, desativa os demais.
CREATE OR REPLACE FUNCTION public.user_concursos_single_ativo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ativo THEN
    UPDATE public.user_concursos
       SET ativo = false
     WHERE user_id = NEW.user_id
       AND id <> NEW.id
       AND ativo = true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS user_concursos_single_ativo_trg ON public.user_concursos;
CREATE TRIGGER user_concursos_single_ativo_trg
  AFTER INSERT OR UPDATE OF ativo ON public.user_concursos
  FOR EACH ROW WHEN (NEW.ativo)
  EXECUTE FUNCTION public.user_concursos_single_ativo();

-- ---------------------------------------------------------------------
-- 3. ÍNDICES
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_concursos_ativo            ON public.concursos (ativo);
CREATE INDEX IF NOT EXISTS idx_editais_concurso           ON public.editais (concurso_id);
CREATE INDEX IF NOT EXISTS idx_editais_vigente            ON public.editais (concurso_id, vigente);
CREATE INDEX IF NOT EXISTS idx_materias_edital            ON public.edital_materias (edital_id);
CREATE INDEX IF NOT EXISTS idx_topicos_materia            ON public.edital_topicos (materia_id);
CREATE INDEX IF NOT EXISTS idx_topicos_edital             ON public.edital_topicos (edital_id);
CREATE INDEX IF NOT EXISTS idx_user_concursos_user        ON public.user_concursos (user_id);
CREATE INDEX IF NOT EXISTS idx_user_concursos_user_ativo  ON public.user_concursos (user_id, ativo);
CREATE INDEX IF NOT EXISTS idx_progresso_user             ON public.user_topico_progresso (user_id);
CREATE INDEX IF NOT EXISTS idx_progresso_user_topico      ON public.user_topico_progresso (user_id, topico_id);

-- ---------------------------------------------------------------------
-- 4. RLS — habilitar
-- ---------------------------------------------------------------------
ALTER TABLE public.concursos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editais                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edital_materias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edital_topicos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_concursos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topico_progresso  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 5. POLÍTICAS
--   Catálogo (concursos/editais/materias/topicos): leitura p/ autenticados,
--   escrita só admin/owner. Tabelas user_*: cada um cuida do que é seu.
-- ---------------------------------------------------------------------

-- 5.1 concursos
DROP POLICY IF EXISTS "concursos_select" ON public.concursos;
DROP POLICY IF EXISTS "concursos_admin"  ON public.concursos;
CREATE POLICY "concursos_select" ON public.concursos
  FOR SELECT TO authenticated USING (ativo OR public.is_admin(auth.uid()));
CREATE POLICY "concursos_admin" ON public.concursos
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 5.2 editais
DROP POLICY IF EXISTS "editais_select" ON public.editais;
DROP POLICY IF EXISTS "editais_admin"  ON public.editais;
CREATE POLICY "editais_select" ON public.editais
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "editais_admin" ON public.editais
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 5.3 edital_materias
DROP POLICY IF EXISTS "materias_select" ON public.edital_materias;
DROP POLICY IF EXISTS "materias_admin"  ON public.edital_materias;
CREATE POLICY "materias_select" ON public.edital_materias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "materias_admin" ON public.edital_materias
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 5.4 edital_topicos
DROP POLICY IF EXISTS "topicos_select" ON public.edital_topicos;
DROP POLICY IF EXISTS "topicos_admin"  ON public.edital_topicos;
CREATE POLICY "topicos_select" ON public.edital_topicos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "topicos_admin" ON public.edital_topicos
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 5.5 user_concursos
DROP POLICY IF EXISTS "user_concursos_select" ON public.user_concursos;
DROP POLICY IF EXISTS "user_concursos_insert" ON public.user_concursos;
DROP POLICY IF EXISTS "user_concursos_update" ON public.user_concursos;
DROP POLICY IF EXISTS "user_concursos_delete" ON public.user_concursos;
CREATE POLICY "user_concursos_select" ON public.user_concursos
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "user_concursos_insert" ON public.user_concursos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_concursos_update" ON public.user_concursos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_concursos_delete" ON public.user_concursos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5.6 user_topico_progresso
DROP POLICY IF EXISTS "progresso_select" ON public.user_topico_progresso;
DROP POLICY IF EXISTS "progresso_insert" ON public.user_topico_progresso;
DROP POLICY IF EXISTS "progresso_update" ON public.user_topico_progresso;
DROP POLICY IF EXISTS "progresso_delete" ON public.user_topico_progresso;
CREATE POLICY "progresso_select" ON public.user_topico_progresso
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "progresso_insert" ON public.user_topico_progresso
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progresso_update" ON public.user_topico_progresso
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progresso_delete" ON public.user_topico_progresso
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 6. GRANTS
-- ---------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.concursos             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editais               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.edital_materias       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.edital_topicos        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_concursos        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_topico_progresso TO authenticated;

GRANT ALL ON public.concursos             TO service_role;
GRANT ALL ON public.editais               TO service_role;
GRANT ALL ON public.edital_materias       TO service_role;
GRANT ALL ON public.edital_topicos        TO service_role;
GRANT ALL ON public.user_concursos        TO service_role;
GRANT ALL ON public.user_topico_progresso TO service_role;

-- ---------------------------------------------------------------------
-- 7. SEED de exemplo (idempotente) — 1 concurso p/ testar a interface.
--    Remova depois de cadastrar os concursos reais, se quiser.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_concurso UUID;
  v_edital   UUID;
  v_mat1     UUID;
  v_mat2     UUID;
BEGIN
  SELECT id INTO v_concurso FROM public.concursos WHERE nome = 'Polícia Federal — Agente (exemplo)' LIMIT 1;
  IF v_concurso IS NULL THEN
    INSERT INTO public.concursos (nome, banca, orgao, cargo, area, ano, status, ativo)
    VALUES ('Polícia Federal — Agente (exemplo)', 'Cebraspe', 'Polícia Federal', 'Agente', 'policial', 2026, 'pre_edital', true)
    RETURNING id INTO v_concurso;

    INSERT INTO public.editais (concurso_id, versao, tipo, titulo, data_publicacao, data_prova, vigente, resumo_mudancas)
    VALUES (v_concurso, 1, 'original', 'Edital de abertura (exemplo)', NULL, NULL, true, NULL)
    RETURNING id INTO v_edital;

    INSERT INTO public.edital_materias (edital_id, nome, peso, ordem)
    VALUES (v_edital, 'Direito Constitucional', 10, 0) RETURNING id INTO v_mat1;
    INSERT INTO public.edital_materias (edital_id, nome, peso, ordem)
    VALUES (v_edital, 'Direito Administrativo', 8, 1) RETURNING id INTO v_mat2;

    INSERT INTO public.edital_topicos (materia_id, edital_id, titulo, codigo, ordem) VALUES
      (v_mat1, v_edital, 'Princípios fundamentais', '1', 0),
      (v_mat1, v_edital, 'Direitos e garantias fundamentais', '2', 1),
      (v_mat1, v_edital, 'Controle de constitucionalidade', '3', 2),
      (v_mat2, v_edital, 'Atos administrativos', '1', 0),
      (v_mat2, v_edital, 'Licitações e contratos', '2', 1);
  END IF;
END $$;

-- =====================================================================
-- 8. Tornar-se ADMIN (para cadastrar concursos/editais)
-- =====================================================================
-- Descubra seu id em Authentication → Users e rode (trocando o UUID):
--
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('SEU-UUID-AQUI', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
-- =====================================================================
