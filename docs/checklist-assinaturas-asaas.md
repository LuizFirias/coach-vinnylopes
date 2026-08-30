# Checklist — Assinaturas Asaas em DEV (AuronFit)

Guia prático para validar o fluxo de assinatura recorrente de coaches
(customer + subscription + webhooks) em sandbox. Substitui o Mercado Pago
como motor de pagamento — o código MP continua no repo (`lib/mercadopago/*`),
mas dormente; não é mais chamado pelo checkout.

> **Escopo:** credenciais **sandbox** do Asaas, Supabase de desenvolvimento, `npm run dev`.

---

## 1. Pré-requisitos

### 1.1 Migration

- [ ] `supabase/migrations/0069_asaas_subscriptions.sql`
  - Adiciona `provider`, `asaas_subscription_id`, `asaas_customer_id` em `subscriptions`
  - Adiciona `asaas_customer_id`, `cpf_cnpj` em `profiles`
  - Cria `subscription_payments` (histórico de cobranças, RLS: coach vê só a própria)

**Verificação rápida:**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'subscriptions' AND column_name LIKE 'asaas%';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('asaas_customer_id', 'cpf_cnpj');
```

### 1.2 Variáveis de ambiente (`.env.local`)

| Variável | Uso |
|----------|-----|
| `ASAAS_API_KEY` | Chave da conta Asaas (sandbox) — header `access_token` em toda chamada |
| `ASAAS_WEBHOOK_TOKEN` | Token estático configurado no painel Asaas → comparado no header `asaas-access-token` |
| `ASAAS_ENV` | `sandbox` (padrão) ou `production` |

Reaproveitadas do fluxo MP: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.

### 1.3 Conta e webhook Asaas

- [ ] Conta criada em [sandbox.asaas.com](https://sandbox.asaas.com/onboarding/createAccount)
- [ ] API key copiada (Configurações → Integrações)
- [ ] Webhook configurado apontando para `{SITE_URL}/api/webhooks/asaas`, com o
  mesmo token usado em `ASAAS_WEBHOOK_TOKEN`, eventos: `PAYMENT_CONFIRMED`,
  `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`

### 1.4 Reiniciar o dev server

```bash
npm run dev
```

---

## 2. Fluxo de teste ponta a ponta

1. Login como coach sem assinatura ativa → `/admin/assinatura`
2. Escolher plano + período → "Assinar"
3. Preencher CPF/CNPJ + escolher forma de pagamento (Pix/Boleto/Cartão) → "Ir para pagamento"
4. Fatura abre em nova aba (`invoiceUrl` do Asaas) — pagar no sandbox (Asaas
   sandbox simula confirmação; para Pix/Boleto tem botão de "simular pagamento")
5. Voltar pra aba do AuronFit — o polling em `/admin/assinatura` deve detectar
   o webhook e mostrar "Assinatura confirmada" em até ~10s
6. Conferir no Supabase:
   - `subscriptions`: `provider='asaas'`, `status='authorized'`, `current_period_end` preenchido
   - `subscription_payments`: 1 linha `status='confirmado'`
   - `profiles`: `subscription_active=true`, `plan_tier`/`billing_period` corretos

## 3. Testes de regressão

- [ ] **Atraso:** simular `PAYMENT_OVERDUE` no sandbox → `subscriptions.status='past_due'`,
  `grace_period_end` = +3 dias, `hasActiveAccess()` continua `true` até lá
- [ ] **Cancelamento:** botão cancelar em `/admin/assinatura` → `DELETE` no Asaas +
  `status='canceling'` local → acesso mantido até `current_period_end`
- [ ] **Idempotência:** reenviar o mesmo webhook (mesmo `payment.id`) → não duplica
  linha em `subscription_payments` nem em `webhook_events` (unique constraint)
- [ ] **hasActiveAccess():** conferir em `/aluno/dashboard` do lado do aluno que o
  acesso do coach reflete corretamente após cada mudança de status acima

## 4. Notas

- O checkout não coleta dados de cartão no nosso backend — o Asaas hospeda a
  fatura de pagamento (`invoiceUrl`), reduzindo o escopo de PCI da aplicação.
- `card_last_four` não é populado para assinaturas Asaas (não crítico —
  campo usado só para exibição de "cartão final ****" em `MeuPlanoView`).
- Split aluno→coach e subcontas Asaas ficam fora deste escopo — feature futura.
