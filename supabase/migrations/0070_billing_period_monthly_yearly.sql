-- Precificação AURON (ago/2026): checkout só mensal | anual.
-- Semestral fica permitido no CHECK enquanto houver assinaturas legadas ativas
-- (mantêm o ciclo até o vencimento; na renovação migram para monthly/yearly).
--
-- Quando não restar nenhum billing_period = 'semester', aplicar:
--   ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_billing_period_check;
--   ALTER TABLE profiles ADD CONSTRAINT profiles_billing_period_check
--     CHECK (billing_period IS NULL OR billing_period IN ('monthly', 'yearly'));
--   (idem em subscriptions)

COMMENT ON COLUMN public.profiles.billing_period IS
  'Ciclo SaaS do coach: monthly | yearly nas novas vendas. semester = legado até renovação.';

COMMENT ON COLUMN public.subscriptions.billing_period IS
  'Ciclo SaaS do coach: monthly | yearly nas novas vendas. semester = legado até renovação.';

-- ELITE = ilimitado na UI; teto técnico anti-abuso = 1000.
UPDATE public.profiles
SET student_limit = 1000
WHERE role = 'coach'
  AND plan_tier = 'elite'
  AND (student_limit IS NULL OR student_limit <> 1000);

UPDATE public.subscriptions
SET student_limit = 1000
WHERE plan_tier = 'elite'
  AND (student_limit IS NULL OR student_limit <> 1000);
