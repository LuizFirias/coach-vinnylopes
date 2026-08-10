-- Trava de checkout para impedir assinaturas Asaas duplicadas em requests paralelos.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS checkout_lock_until timestamptz;

COMMENT ON COLUMN public.profiles.checkout_lock_until IS
  'Até quando o checkout está em andamento. Impede criar 2ª assinatura Asaas no mesmo coach.';
