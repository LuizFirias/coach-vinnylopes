-- Assinatura do coach via Asaas — convive com os campos mp_* existentes.
-- Não substitui nem dropa nada do fluxo Mercado Pago (fail-safe).

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'mercadopago',
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS asaas_customer_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_provider_check'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_provider_check CHECK (provider IN ('mercadopago', 'asaas'));
  END IF;
END $$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS cpf_cnpj text; -- obrigatório pro Asaas criar o customer; coletado 1x no checkout

COMMENT ON COLUMN subscriptions.provider IS
  'Gateway de pagamento da assinatura — mercadopago (legado) ou asaas.';
COMMENT ON COLUMN subscriptions.asaas_subscription_id IS
  'ID da assinatura recorrente no Asaas (equivalente a mp_preapproval_id).';
COMMENT ON COLUMN profiles.asaas_customer_id IS
  'ID do customer no Asaas — criado no primeiro checkout do coach, reaproveitado entre assinaturas.';
COMMENT ON COLUMN profiles.cpf_cnpj IS
  'CPF ou CNPJ do coach — exigido pelo Asaas pra criar o customer; coletado no primeiro checkout.';

CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_subscription_id
  ON subscriptions(asaas_subscription_id);

-- Histórico de cobranças da assinatura do coach — não existia nem para o MP.
CREATE TABLE IF NOT EXISTS subscription_payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider              text NOT NULL CHECK (provider IN ('mercadopago', 'asaas')),
  provider_payment_id   text NOT NULL,
  plan_tier             text,
  billing_period        text,
  valor                 numeric(10,2) NOT NULL,
  metodo_pagamento      text CHECK (metodo_pagamento IN ('pix', 'cartao_credito', 'boleto')),
  status                text NOT NULL CHECK (status IN ('pendente', 'confirmado', 'atrasado', 'estornado')),
  competencia           date NOT NULL,
  criado_em             timestamptz NOT NULL DEFAULT now(),
  confirmado_em         timestamptz,
  UNIQUE (provider, provider_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_competencia
  ON subscription_payments(user_id, competencia);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach vê próprio histórico" ON subscription_payments;
CREATE POLICY "coach vê próprio histórico"
  ON subscription_payments FOR SELECT
  USING (user_id = auth.uid());
