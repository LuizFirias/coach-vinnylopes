-- 0077: catálogo comercial START + PRO (ELITE vira PRO; PRO fica ilimitado).
-- Não há tabela `plans` neste projeto — limites ficam em profiles/subscriptions.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_tier_check;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_tier_check;

UPDATE public.profiles
SET plan_tier = 'pro'
WHERE plan_tier = 'elite';

UPDATE public.subscriptions
SET plan_tier = 'pro'
WHERE plan_tier = 'elite';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_tier_check
  CHECK (
    plan_tier IS NULL
    OR plan_tier IN ('start', 'pro', 'free', 'trial', 'iniciante', 'test')
  );

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_tier_check
  CHECK (
    plan_tier IS NULL
    OR plan_tier IN ('start', 'pro', 'free', 'trial', 'iniciante', 'test')
  );

UPDATE public.profiles
SET student_limit = 30
WHERE plan_tier = 'start';

UPDATE public.subscriptions
SET student_limit = 30
WHERE plan_tier = 'start';

UPDATE public.profiles
SET student_limit = NULL
WHERE plan_tier = 'pro';

UPDATE public.subscriptions
SET student_limit = NULL
WHERE plan_tier = 'pro';

COMMENT ON COLUMN public.profiles.student_limit IS
  'Teto de alunos ativos. NULL = ilimitado (PRO). Freemium = 3 (plan_tier null). START = 30.';

DO $$
BEGIN
  IF to_regclass('public.plans') IS NOT NULL THEN
    ALTER TABLE public.plans
      ADD COLUMN IF NOT EXISTS has_ai_diet boolean NOT NULL DEFAULT false;

    UPDATE public.plans SET
      name = 'START',
      price_month = 3990,
      price_year = 39900,
      student_limit = 30,
      has_ai_diet = false
    WHERE slug = 'start';

    UPDATE public.plans SET
      name = 'PRO',
      price_month = 5990,
      price_year = 59900,
      student_limit = NULL,
      has_ai_diet = true
    WHERE slug = 'pro';

    DELETE FROM public.plans WHERE slug = 'elite';
  END IF;
END $$;
