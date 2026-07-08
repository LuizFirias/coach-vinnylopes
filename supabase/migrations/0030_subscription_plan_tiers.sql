-- Planos multi-tier: tier, periodicidade e limite de alunos

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_tier text
    CHECK (plan_tier IS NULL OR plan_tier IN ('start', 'pro', 'elite')),
  ADD COLUMN IF NOT EXISTS billing_period text
    CHECK (billing_period IS NULL OR billing_period IN ('monthly', 'semester', 'yearly')),
  ADD COLUMN IF NOT EXISTS student_limit integer
    CHECK (student_limit IS NULL OR student_limit > 0);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan_tier text
    CHECK (plan_tier IS NULL OR plan_tier IN ('start', 'pro', 'elite')),
  ADD COLUMN IF NOT EXISTS billing_period text
    CHECK (billing_period IS NULL OR billing_period IN ('monthly', 'semester', 'yearly')),
  ADD COLUMN IF NOT EXISTS student_limit integer
    CHECK (student_limit IS NULL OR student_limit > 0);

CREATE INDEX IF NOT EXISTS idx_profiles_coach_active_students
  ON profiles (coach_id)
  WHERE role = 'aluno' AND (arquivado IS NULL OR arquivado = false);
