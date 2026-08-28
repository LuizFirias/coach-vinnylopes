-- Perfil do aluno (redesign estilo Everfit, desktop) — agosto 2026
-- 1) separa Notes de Limitations/Injuries dentro de aluno_observacoes (coluna tipo)
-- 2) tabela nova aluno_objetivos para o card Goal & Countdown

-- ── 1. aluno_observacoes.tipo ──────────────────────────────────────────────
ALTER TABLE public.aluno_observacoes
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'nota';

ALTER TABLE public.aluno_observacoes
  DROP CONSTRAINT IF EXISTS aluno_observacoes_tipo_check;

ALTER TABLE public.aluno_observacoes
  ADD CONSTRAINT aluno_observacoes_tipo_check CHECK (tipo IN ('nota', 'lesao'));

CREATE INDEX IF NOT EXISTS idx_aluno_observacoes_aluno_tipo
  ON public.aluno_observacoes (aluno_id, tipo, criada_em DESC);

-- ── 2. aluno_objetivos ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aluno_objetivos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo       text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 200),
  descricao    text,
  data_alvo    date,
  criado_em    timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aluno_objetivos_aluno
  ON public.aluno_objetivos (aluno_id, criado_em DESC);

ALTER TABLE public.aluno_objetivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aluno_objetivos_select" ON public.aluno_objetivos;
CREATE POLICY "aluno_objetivos_select" ON public.aluno_objetivos
  FOR SELECT TO authenticated
  USING (
    auth.uid() = aluno_id
    OR auth.uid() = coach_id
    OR EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = aluno_objetivos.aluno_id
    )
  );

DROP POLICY IF EXISTS "aluno_objetivos_insert" ON public.aluno_objetivos;
CREATE POLICY "aluno_objetivos_insert" ON public.aluno_objetivos
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = coach_id
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = aluno_objetivos.aluno_id
    )
  );

DROP POLICY IF EXISTS "aluno_objetivos_update" ON public.aluno_objetivos;
CREATE POLICY "aluno_objetivos_update" ON public.aluno_objetivos
  FOR UPDATE TO authenticated
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS "aluno_objetivos_delete" ON public.aluno_objetivos;
CREATE POLICY "aluno_objetivos_delete" ON public.aluno_objetivos
  FOR DELETE TO authenticated
  USING (auth.uid() = coach_id);
