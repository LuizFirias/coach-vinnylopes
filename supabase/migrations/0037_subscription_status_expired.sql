-- Adiciona status 'expired' ao CHECK de subscriptions.status
-- (constraint inline do CREATE TABLE costuma se chamar subscriptions_status_check)

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_subscription_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN (
    'pending',
    'authorized',
    'paused',
    'cancelled',
    'past_due',
    'expired'
  ));
