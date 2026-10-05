-- =====================================================================
-- AprovaIA — Módulo CRONOGRAMA + REVISÕES (Etapa 3)  — idempotente
-- =====================================================================
-- Liga o cronograma e as revisões ao EDITAL (tópicos). O cronograma passa a
-- ser gerado a partir dos tópicos do edital vigente; as revisões são puxadas
-- por desempenho (question_logs) e se integram ao mesmo cronograma.
--
-- Rode depois de init_new_project.sql e edital_module.sql. Pode rodar de novo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. study_sessions — vínculo com tópico/concurso + tipo (novo vs revisão)
-- ---------------------------------------------------------------------
ALTER TABLE public.study_sessions
  ADD COLUMN IF NOT EXISTS topico_id   UUID REFERENCES public.edital_topicos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS concurso_id UUID REFERENCES public.concursos(id)      ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tipo        TEXT NOT NULL DEFAULT 'novo';  -- novo | revisao

CREATE INDEX IF NOT EXISTS idx_study_sessions_topico   ON public.study_sessions (topico_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_concurso ON public.study_sessions (concurso_id);

-- ---------------------------------------------------------------------
-- 2. revisions — origem/desempenho/intervalo + vínculo com tópico
-- ---------------------------------------------------------------------
ALTER TABLE public.revisions
  ADD COLUMN IF NOT EXISTS topico_id     UUID REFERENCES public.edital_topicos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS concurso_id   UUID REFERENCES public.concursos(id)      ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS origem        TEXT NOT NULL DEFAULT 'manual',  -- manual | auto | sugerida
  ADD COLUMN IF NOT EXISTS acerto_pct    NUMERIC,                          -- desempenho que gerou a revisão
  ADD COLUMN IF NOT EXISTS intervalo_dias INTEGER;                         -- intervalo aplicado (2/4/7/15/30)

CREATE INDEX IF NOT EXISTS idx_revisions_topico   ON public.revisions (topico_id);
CREATE INDEX IF NOT EXISTS idx_revisions_concurso ON public.revisions (concurso_id);

-- ---------------------------------------------------------------------
-- 3. profiles — preferências de revisão (3 modos + intervalos)
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS revisao_modo       TEXT NOT NULL DEFAULT 'combinado',  -- manual | auto | combinado
  ADD COLUMN IF NOT EXISTS revisao_intervalos INTEGER[] NOT NULL DEFAULT '{2,4,7,15,30}',
  ADD COLUMN IF NOT EXISTS minutos_por_topico INTEGER NOT NULL DEFAULT 60;        -- duração estimada de 1 tópico

-- =====================================================================
-- Pronto. As policies/grants das tabelas já existem (init + edital_module);
-- novas colunas herdam as mesmas regras de RLS por usuário.
-- =====================================================================
