-- Trial: aguardando validação de cartão (não liberar plan pago antes da confirmação).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_pendente_cartao boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.trial_pendente_cartao IS
  'true enquanto o cartão do trial ainda não foi validado. subscription_active/trial_ativo só após confirmação.';

CREATE INDEX IF NOT EXISTS idx_profiles_trial_pendente_cartao
  ON public.profiles (id)
  WHERE trial_pendente_cartao = true;
