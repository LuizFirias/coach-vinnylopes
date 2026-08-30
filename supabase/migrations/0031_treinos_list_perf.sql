-- Performance da listagem /admin/treinos:
-- índices nas queries quentes + contagem sem enviar configuracao JSONB.

CREATE INDEX IF NOT EXISTS idx_fichas_treino_coach_criado
  ON public.fichas_treino (coach_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_treinos_alunos_coach_upload
  ON public.treinos_alunos (coach_id, data_upload DESC);

CREATE INDEX IF NOT EXISTS idx_historico_treinos_ficha_conclusao
  ON public.historico_treinos (ficha_id, data_conclusao DESC);

CREATE INDEX IF NOT EXISTS idx_historico_treinos_aluno_conclusao
  ON public.historico_treinos (aluno_id, data_conclusao DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fichas_treino'
      AND column_name = 'exercicios_count'
  ) THEN
    ALTER TABLE public.fichas_treino
      ADD COLUMN exercicios_count integer
      GENERATED ALWAYS AS (
        COALESCE(jsonb_array_length(configuracao->'exercicios'), 0)
      ) STORED;
  END IF;
END $$;
