-- Histórico financeiro por aluno (vendas e renovações de mentoria)
-- Fonte para métricas de faturamento sem estimativas por vigência.

CREATE TABLE IF NOT EXISTS public.aluno_planos_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status_pagamento text NOT NULL
    CHECK (status_pagamento IN ('pago', 'pendente', 'atrasado')),
  tipo_plano text NOT NULL
    CHECK (tipo_plano IN ('mensal', 'trimestral', 'semestral', 'anual')),
  valor_plano numeric(12,2) NOT NULL CHECK (valor_plano >= 0),
  data_inicio date NOT NULL,
  data_expiracao date NOT NULL,
  origem text NOT NULL DEFAULT 'manual_coach',
  observacao text,
  registrado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aluno_planos_historico_aluno_data
  ON public.aluno_planos_historico (aluno_id, registrado_em DESC);

CREATE INDEX IF NOT EXISTS idx_aluno_planos_historico_coach_data
  ON public.aluno_planos_historico (coach_id, registrado_em DESC);

-- Backfill inicial: cria 1 registro por plano atual pago, evitando card zerado
-- para alunos já ativos antes desta migração.
INSERT INTO public.aluno_planos_historico (
  aluno_id,
  coach_id,
  status_pagamento,
  tipo_plano,
  valor_plano,
  data_inicio,
  data_expiracao,
  origem,
  observacao
)
SELECT
  p.id AS aluno_id,
  p.coach_id,
  p.status_pagamento,
  p.tipo_plano,
  p.valor_plano,
  p.data_inicio::date,
  p.data_expiracao::date,
  'migration_backfill',
  'Backfill inicial do plano vigente pago'
FROM public.profiles p
WHERE p.role = 'aluno'
  AND p.coach_id IS NOT NULL
  AND p.status_pagamento = 'pago'
  AND p.valor_plano IS NOT NULL
  AND p.tipo_plano IN ('mensal', 'trimestral', 'semestral', 'anual')
  AND p.data_inicio IS NOT NULL
  AND p.data_expiracao IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.aluno_planos_historico h
    WHERE h.aluno_id = p.id
      AND h.tipo_plano = p.tipo_plano
      AND h.valor_plano = p.valor_plano
      AND h.data_inicio = p.data_inicio::date
      AND h.data_expiracao = p.data_expiracao::date
  );

ALTER TABLE public.aluno_planos_historico ENABLE ROW LEVEL SECURITY;

-- Coach lê somente os próprios registros
DROP POLICY IF EXISTS coach_select_own_plan_history ON public.aluno_planos_historico;
CREATE POLICY coach_select_own_plan_history
  ON public.aluno_planos_historico
  FOR SELECT
  USING (coach_id = auth.uid());

-- Super admin lê tudo
DROP POLICY IF EXISTS super_admin_select_all_plan_history ON public.aluno_planos_historico;
CREATE POLICY super_admin_select_all_plan_history
  ON public.aluno_planos_historico
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- Coach insere apenas para alunos vinculados
DROP POLICY IF EXISTS coach_insert_own_plan_history ON public.aluno_planos_historico;
CREATE POLICY coach_insert_own_plan_history
  ON public.aluno_planos_historico
  FOR INSERT
  WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid()
        AND ca.aluno_id = aluno_id
    )
  );

-- Super admin pode inserir histórico para qualquer aluno
DROP POLICY IF EXISTS super_admin_insert_plan_history ON public.aluno_planos_historico;
CREATE POLICY super_admin_insert_plan_history
  ON public.aluno_planos_historico
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );
