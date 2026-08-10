-- Token do cartão (Checkout Transparente) — nunca o PAN completo.
-- Reutilizado em troca de plano e reativação sem pedir o cartão de novo.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS asaas_card_token text;

COMMENT ON COLUMN public.profiles.asaas_card_token IS
  'Token Asaas do cartão (tokenização). Nunca armazenar número completo do cartão.';
