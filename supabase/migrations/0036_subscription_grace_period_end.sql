-- Grace period: current_period_end + 3 dias (gravado ao entrar em past_due/paused)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS grace_period_end timestamptz;

COMMENT ON COLUMN public.subscriptions.grace_period_end IS
  'Limite do grace (current_period_end + 3d). Null quando authorized/active.';
