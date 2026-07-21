-- Permite plan_tier 'iniciante' (novo plano de entrada R$24,90)

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_tier_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_tier_check
  CHECK (plan_tier IS NULL OR plan_tier IN ('iniciante', 'start', 'pro', 'elite', 'test'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_tier_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_tier_check
  CHECK (plan_tier IS NULL OR plan_tier IN ('iniciante', 'start', 'pro', 'elite', 'test'));
