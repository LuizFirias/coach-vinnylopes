-- Observações do coach para o aluno (lista com leitura)
-- AURONFIT · agosto 2026

CREATE TABLE IF NOT EXISTS public.aluno_observacoes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conteudo         text NOT NULL CHECK (char_length(conteudo) BETWEEN 1 AND 4000),
  criada_em        timestamptz NOT NULL DEFAULT now(),
  visualizada_em   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_aluno_observacoes_aluno_criada
  ON public.aluno_observacoes (aluno_id, criada_em DESC);

CREATE INDEX IF NOT EXISTS idx_aluno_observacoes_aluno_nao_lidas
  ON public.aluno_observacoes (aluno_id)
  WHERE visualizada_em IS NULL;

ALTER TABLE public.aluno_observacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aluno_observacoes_select" ON public.aluno_observacoes;
CREATE POLICY "aluno_observacoes_select" ON public.aluno_observacoes
  FOR SELECT TO authenticated
  USING (
    auth.uid() = aluno_id
    OR auth.uid() = coach_id
    OR EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = aluno_observacoes.aluno_id
    )
  );

DROP POLICY IF EXISTS "aluno_observacoes_insert" ON public.aluno_observacoes;
CREATE POLICY "aluno_observacoes_insert" ON public.aluno_observacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = coach_id
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = aluno_observacoes.aluno_id
    )
  );

DROP POLICY IF EXISTS "aluno_observacoes_update" ON public.aluno_observacoes;
CREATE POLICY "aluno_observacoes_update" ON public.aluno_observacoes
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = aluno_id
    OR auth.uid() = coach_id
  )
  WITH CHECK (
    auth.uid() = aluno_id
    OR auth.uid() = coach_id
  );

DROP POLICY IF EXISTS "aluno_observacoes_delete" ON public.aluno_observacoes;
CREATE POLICY "aluno_observacoes_delete" ON public.aluno_observacoes
  FOR DELETE TO authenticated
  USING (
    auth.uid() = coach_id
    OR EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = aluno_observacoes.aluno_id
    )
  );
