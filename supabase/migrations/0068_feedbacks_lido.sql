-- Feedbacks: controle de leitura pelo coach (badge + marcar como lido)
ALTER TABLE public.feedbacks_treinos
  ADD COLUMN IF NOT EXISTS lido_em timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_feedbacks_treinos_coach_nao_lidos
  ON public.feedbacks_treinos (coach_id)
  WHERE lido_em IS NULL;

COMMENT ON COLUMN public.feedbacks_treinos.lido_em IS
  'Quando o coach marcou o feedback como lido. NULL = não lido (mostra badge).';
