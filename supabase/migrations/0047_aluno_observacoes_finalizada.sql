-- Permite ao aluno "concluir" uma nota do personal, removendo-a do dashboard
-- AURONFIT · agosto 2026

ALTER TABLE public.aluno_observacoes
  ADD COLUMN IF NOT EXISTS finalizada_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_aluno_observacoes_aluno_ativas
  ON public.aluno_observacoes (aluno_id)
  WHERE finalizada_em IS NULL;
