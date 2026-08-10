-- Plano gratuito: coaches novos (e existentes sem assinatura paga) com até 3 alunos.
-- subscription_active = true libera Guard + RLS coach_has_write_access().
-- plan_tier permanece null até o primeiro checkout pago/trial Asaas.

UPDATE public.profiles p
SET
  subscription_active = true,
  student_limit = 3,
  status_pagamento = COALESCE(p.status_pagamento, 'pago')
WHERE p.role = 'coach'
  AND COALESCE(p.account_type, 'padrao') = 'padrao'
  AND p.plan_tier IS NULL
  AND (
    p.subscription_active IS DISTINCT FROM true
    OR p.student_limit IS NULL
    OR p.student_limit <= 0
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = p.id
      AND s.status IN ('authorized', 'canceling', 'past_due')
  );

COMMENT ON COLUMN public.profiles.student_limit IS
  'Teto de alunos ativos. Freemium = 3 (plan_tier null). Planos pagos sobrescrevem no checkout.';
