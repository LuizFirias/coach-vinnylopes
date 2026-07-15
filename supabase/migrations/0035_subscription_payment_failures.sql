-- Contador de falhas de cobrança para grace / past_due
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_failure_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.subscriptions.payment_failure_count IS
  'Incrementa em payment rejected; zera em approved / authorized';
