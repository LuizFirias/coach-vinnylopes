-- Regime de caixa no histórico de planos: data_pagamento + forma_pagamento
-- Soft-cancel via status_pagamento = 'cancelado'

-- Ampliar check de status para incluir cancelado
ALTER TABLE public.aluno_planos_historico
  DROP CONSTRAINT IF EXISTS aluno_planos_historico_status_pagamento_check;

ALTER TABLE public.aluno_planos_historico
  ADD CONSTRAINT aluno_planos_historico_status_pagamento_check
  CHECK (status_pagamento IN ('pago', 'pendente', 'atrasado', 'cancelado'));

ALTER TABLE public.aluno_planos_historico
  ADD COLUMN IF NOT EXISTS data_pagamento date;

ALTER TABLE public.aluno_planos_historico
  ADD COLUMN IF NOT EXISTS forma_pagamento text;

ALTER TABLE public.aluno_planos_historico
  DROP CONSTRAINT IF EXISTS aluno_planos_historico_forma_pagamento_check;

ALTER TABLE public.aluno_planos_historico
  ADD CONSTRAINT aluno_planos_historico_forma_pagamento_check
  CHECK (
    forma_pagamento IS NULL
    OR forma_pagamento IN (
      'pix',
      'dinheiro',
      'cartao_credito',
      'cartao_debito',
      'transferencia',
      'outro'
    )
  );

COMMENT ON COLUMN public.aluno_planos_historico.data_pagamento IS
  'Regime de caixa: data em que o dinheiro entrou (independente da vigência).';

COMMENT ON COLUMN public.aluno_planos_historico.forma_pagamento IS
  'Forma de pagamento registrada pelo coach (pix, dinheiro, cartão, etc.).';

-- Backfill: usa a data do registro quando data_pagamento ainda é nula
UPDATE public.aluno_planos_historico
SET data_pagamento = (registrado_em AT TIME ZONE 'America/Sao_Paulo')::date
WHERE data_pagamento IS NULL;

CREATE INDEX IF NOT EXISTS idx_aluno_planos_historico_coach_pagamento
  ON public.aluno_planos_historico (coach_id, data_pagamento DESC);

-- Coach pode atualizar (soft-cancel) apenas os próprios registros
DROP POLICY IF EXISTS coach_update_own_plan_history ON public.aluno_planos_historico;
CREATE POLICY coach_update_own_plan_history
  ON public.aluno_planos_historico
  FOR UPDATE
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS super_admin_update_plan_history ON public.aluno_planos_historico;
CREATE POLICY super_admin_update_plan_history
  ON public.aluno_planos_historico
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );
