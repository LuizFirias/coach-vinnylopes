-- Trial Asaas 30 dias + espelho de asaas_subscription_id em profiles.
-- Reaproveita plan_tier / billing_period (não cria plano_atual / plano_ciclo).
-- Histórico de cobranças já existe em subscription_payments (0069).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text,
  ADD COLUMN IF NOT EXISTS trial_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_fim date;

COMMENT ON COLUMN profiles.asaas_subscription_id IS
  'Espelho da assinatura Asaas ativa — fonte canônica continua em subscriptions.asaas_subscription_id.';
COMMENT ON COLUMN profiles.trial_ativo IS
  'true enquanto o coach está nos 30 dias grátis (cartão cadastrado, 1ª cobrança ainda não confirmada).';
COMMENT ON COLUMN profiles.trial_fim IS
  'Data da 1ª cobrança agendada (nextDueDate). Preenchido no checkout com trial; trial_ativo=false após PAYMENT_CONFIRMED.';

CREATE INDEX IF NOT EXISTS idx_profiles_asaas_subscription_id
  ON profiles (asaas_subscription_id)
  WHERE asaas_subscription_id IS NOT NULL;
