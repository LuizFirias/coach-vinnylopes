-- Últimos 4 dígitos do cartão (payment.card.last_four_digits do MP)

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS card_last_four text;

COMMENT ON COLUMN public.subscriptions.card_last_four IS
  'Últimos 4 dígitos do cartão usado no último pagamento aprovado. Vem de payment.card.last_four_digits do MP.';
