# Checklist — Assinaturas Mercado Pago em DEV (AuronFit)

Guia prático para validar o fluxo de assinatura recorrente de coaches (Preapproval + webhooks + limite de alunos) em ambiente local.

> **Escopo:** credenciais de **teste** do Mercado Pago, Supabase de desenvolvimento, `npm run dev`.

---

## 1. Pré-requisitos (env + Supabase)

### 1.1 Migrations no Supabase

Aplicar na ordem (SQL Editor ou CLI):

- [ ] `supabase/migrations/0029_coach_subscriptions_mercadopago.sql`
  - Cria `subscriptions` e `webhook_events`
  - Adiciona `profiles.subscription_active`
  - RLS em `subscriptions` (coach lê só a própria linha)
- [ ] `supabase/migrations/0030_subscription_plan_tiers.sql`
  - Adiciona `plan_tier`, `billing_period`, `student_limit` em `subscriptions` e `profiles`

**Verificação rápida:**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'subscriptions' AND column_name IN ('plan_tier', 'student_limit');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('subscription_active', 'plan_tier', 'student_limit');
```

### 1.2 Variáveis de ambiente (`.env.local`)

> Não existe `.env.example` no repositório; use a lista abaixo como referência.

#### Obrigatórias para o fluxo completo

| Variável | Uso |
|----------|-----|
| `NEXT_PUBLIC_SITE_URL` | URL base (ex.: `http://localhost:3000`). Usada em `back_url`, e-mails e links. |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente e auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Rotas server (`checkout`, `status`, webhook, invite) |
| `MP_ACCESS_TOKEN_TEST` | Token **test** MP (dev usa este antes de `MP_ACCESS_TOKEN`) |
| `NEXT_PUBLIC_MP_PUBLIC_KEY_TEST` | Public key **test** para o Card Payment Brick |
| `MP_WEBHOOK_SECRET` | Valida assinatura HMAC dos webhooks (`x-signature`) |
| `RESEND_API_KEY` | Envio de e-mail no convite de aluno (opcional para assinatura, necessário para invite) |

#### Opcionais (recomendadas)

| Variável | Uso |
|----------|-----|
| `MP_PLAN_START_MONTHLY_ID` … `MP_PLAN_ELITE_YEARLY_ID` | IDs de `preapproval_plan` pré-criados no MP. Sem eles, o checkout usa `auto_recurring` dinâmico. |
| `MP_ACCESS_TOKEN` / `NEXT_PUBLIC_MP_PUBLIC_KEY` | Fallback se as vars `_TEST` não existirem |

**Criar planos no MP (opcional):**

```bash
npm run mp:create-plans
```

Cole a saída no `.env.local` (8 linhas `MP_PLAN_*_ID=...`).

### 1.3 Conta e credenciais Mercado Pago

- [ ] Aplicação criada em [Suas integrações](https://www.mercadopago.com.br/developers/panel/app)
- [ ] Credenciais de **teste** copiadas (Public Key + Access Token)
- [ ] Usuário de teste comprador/vendedor criado no painel MP (se necessário para assinaturas)

### 1.4 Reiniciar o dev server

- [ ] Após alterar `.env.local`, parar e subir de novo:

```bash
npm run dev
```

- [ ] Confirmar que a app responde em `http://localhost:3000`

---

## 2. Teste funcional em dev

Use um usuário com `role = coach` ( **não** `super_admin` — super admin ignora assinatura).

### 2.1 Preparação

- [ ] Coach logado no AuronFit
- [ ] Perfil **sem** assinatura ativa (`profiles.subscription_active = false` ou sem linha em `subscriptions` com status `authorized`)
- [ ] DevTools aberto (aba **Network** + **Console**)

### 2.2 Perfil → Assinatura

- [ ] Acessar `/admin/perfil`
- [ ] Badge exibe plano/status (ex.: “Sem assinatura” ou “Pendente”)
- [ ] Botão **Gerenciar assinatura** leva a `/admin/assinatura`

### 2.3 Escolher plano e periodicidade

- [ ] Página `/admin/assinatura` carrega catálogo (START / PRO / ELITE)
- [ ] Selecionar tier (ex.: **START** — limite 30 alunos)
- [ ] Selecionar periodicidade disponível (mensal, semestral ou anual conforme o tier)
- [ ] Preço e limite de alunos batem com `lib/subscriptions/plans.ts`

### 2.4 Pagamento com cartão teste MP

- [ ] Card Payment Brick aparece (requer `NEXT_PUBLIC_MP_PUBLIC_KEY_TEST`)
- [ ] Preencher cartão de teste (seção 3)
- [ ] Submeter — requisição `POST /api/subscriptions/checkout` com:
  - Header `Authorization: Bearer <access_token>`
  - Body contendo **`cardTokenId`** (token), `planTier`, `billingPeriod`, `payerEmail`
  - **Sem** número de cartão, CVV ou validade no payload
- [ ] Resposta `200` com `success: true` e `status` (`authorized` ou `pending`)
- [ ] Mensagem de sucesso na UI

### 2.5 Verificar badge e acesso

- [ ] Badge em `/admin/assinatura` e `/admin/perfil` mostra plano + **Ativa** (quando `authorized`)
- [ ] Card “Assinatura ativa” visível
- [ ] Contador de alunos exibido (ex.: `0/30 alunos`)
- [ ] `GET /api/subscriptions/status` retorna `isActive: true`, `planTier`, `studentLimit`, `activeStudentCount`

### 2.6 Convidar aluno (pós-assinatura)

- [ ] Ir a `/admin/alunos/novo`
- [ ] Convidar aluno com e-mail novo
- [ ] `POST /api/admin/invite` retorna `200`
- [ ] Contador sobe (ex.: `1/30 alunos`)

### 2.7 Testar limite de alunos

- [ ] Com plano START (30 alunos), simular limite:
  - **Opção A:** convidar alunos até `count >= limit` (lento)
  - **Opção B:** no Supabase, reduzir temporariamente `profiles.student_limit` para um número baixo (ex.: 1) e tentar o 2º convite
- [ ] Segundo convite retorna **403** com mensagem do tipo: *“Limite do plano START (N alunos) atingido…”*
- [ ] Restaurar `student_limit` correto após o teste

### 2.8 Casos negativos rápidos

- [ ] Coach **sem** token → `401` em `/api/subscriptions/checkout` e `/api/subscriptions/status`
- [ ] Aluno ou role inválida → `403`
- [ ] Segunda assinatura com status `authorized` → `409` *“Você já possui uma assinatura ativa”*
- [ ] `planTier` / `billingPeriod` inválidos → `400`

---

## 3. Cartões de teste Mercado Pago

Documentação oficial: [Cartões de teste](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/test/cards)

### 3.1 Dados do cartão (qualquer bandeira abaixo)

| Bandeira | Número | CVV | Validade |
|----------|--------|-----|----------|
| Mastercard (crédito) | `5031 4332 1540 6351` | `123` | `11/30` |
| Visa (crédito) | `4235 6477 2802 5682` | `123` | `11/30` |
| American Express | `3753 651535 56885` | `1234` | `11/30` |
| Elo (débito) | `5067 7667 8388 8311` | `123` | `11/30` |

### 3.2 Titular do cartão (define o resultado)

| Cenário | Nome no cartão | Documento |
|---------|----------------|-----------|
| **Pagamento aprovado** | `APRO` | CPF `12345678909` |
| Saldo insuficiente | `FUND` | — |
| Erro genérico | `OTHE` | CPF `12345678909` |
| Pendente | `CONT` | — |

### 3.3 E-mail do pagador

- Use o e-mail do coach logado ou um e-mail **diferente** da conta Mercado Pago do desenvolvedor.
- O Brick envia `payer.email` no checkout; o backend usa `payerEmail || auth.email`.

### 3.4 Checklist do cartão

- [ ] Cenário **APRO** → assinatura `authorized` e acesso liberado
- [ ] (Opcional) Cenário **FUND** → erro exibido no Brick / mensagem MP no checkout
- [ ] Credenciais **test** no `.env.local` (não misturar public key de prod com token de test)

---

## 4. Webhook em dev

O endpoint está em:

```
POST /api/webhooks/mercadopago
```

Implementação: valida `MP_WEBHOOK_SECRET`, persiste em `webhook_events`, processa preapproval/payment.

### 4.1 Expor localhost (ngrok ou alternativa)

**ngrok:**

```bash
ngrok http 3000
```

**Alternativas:** Cloudflare Tunnel, localtunnel, VS Code port forwarding com URL pública.

- [ ] URL pública apontando para `localhost:3000`
- [ ] Testar: `curl -I https://<seu-tunnel>/api/webhooks/mercadopago` (POST exige body/headers MP)

### 4.2 Configurar no painel Mercado Pago

Em **Suas integrações → Webhooks**:

| Campo | Valor |
|-------|-------|
| URL | `https://<tunnel>/api/webhooks/mercadopago` |
| Secret | Mesmo valor de `MP_WEBHOOK_SECRET` no `.env.local` |

**Tópicos / eventos relevantes:**

- [ ] `subscription_preapproval` (ou eventos que contenham `preapproval`)
- [ ] `payment`
- [ ] `subscription_authorized_payment` (cobranças recorrentes)

### 4.3 Validar recebimento

Após checkout ou simulação no painel MP:

- [ ] Log do servidor sem `[MP-WEBHOOK] MP_WEBHOOK_SECRET não configurado`
- [ ] Resposta **200** `{ "ok": true }` para evento válido
- [ ] Resposta **401** `{ "error": "invalid signature" }` se secret/headers incorretos (teste proposital)
- [ ] Nova linha em `webhook_events` (seção 6)
- [ ] `subscriptions.status` / `profiles.subscription_active` atualizados após processamento

### 4.4 Idempotência

- [ ] Reenviar o mesmo evento → resposta `200` com `{ "ok": true, "duplicate": true }` (insert duplicado ignorado pela constraint UNIQUE)

### 4.5 Simulação manual (debug)

Com secret e headers corretos, o MP envia:

- Header `x-signature`: `ts=...,v1=<hmac>`
- Header `x-request-id`
- Query `data.id` ou `id` com ID do recurso

Para testes manuais avançados, use o simulador de webhooks do painel MP em vez de montar HMAC à mão.

---

## 5. Checklist de segurança

### 5.1 O que **NÃO** deve aparecer

- [ ] **PAN** (número completo do cartão) em requests para `/api/subscriptions/checkout`
- [ ] **CVV** ou data de validade no body enviado ao backend AuronFit
- [ ] `MP_ACCESS_TOKEN` ou `MP_ACCESS_TOKEN_TEST` no bundle JS ou em respostas de API
- [ ] `SUPABASE_SERVICE_ROLE_KEY` no frontend ou em `NEXT_PUBLIC_*`
- [ ] `MP_WEBHOOK_SECRET` em logs, respostas HTTP ou repositório

### 5.2 Token only (PCI)

- [ ] Apenas `cardTokenId` (gerado pelo SDK MP no browser) vai para `/api/subscriptions/checkout`
- [ ] Backend repassa `card_token_id` ao MP server-side via `mpFetch` (`lib/mercadopago/client.ts`)

### 5.3 HTTPS e exposição

- [ ] Em dev local, HTTP para a app é aceitável; **webhook público** deve usar HTTPS (ngrok/tunnel)
- [ ] `NEXT_PUBLIC_SITE_URL` coerente com a URL usada no `back_url` do preapproval

### 5.3 Autenticação nas rotas

- [ ] `POST /api/subscriptions/checkout` exige Bearer token + role `coach` ou `super_admin` (`getAuthenticatedCoach`)
- [ ] `GET /api/subscriptions/status` idem
- [ ] Webhook **não** usa auth de usuário — usa **assinatura HMAC** (`verifyMpSignature`)

### 5.4 Webhook signature

- [ ] Request sem `x-signature` → **401**
- [ ] Secret errado → **401**
- [ ] Secret ausente no env → **500** `webhook not configured`

### 5.5 RLS e acesso a dados

- [ ] Cliente browser (anon key): coach só lê **própria** linha em `subscriptions` (policy `user reads own subscription`)
- [ ] `webhook_events`: RLS habilitado — cliente **não** deve conseguir SELECT/INSERT (sem policy para usuário)
- [ ] Escritas em `subscriptions` / `profiles` feitas via **service role** no servidor

### 5.6 DevTools — inspeção rápida

- [ ] Filtrar Network por `checkout` → payload JSON só com token + metadados do plano
- [ ] Resposta de `status` expõe `publicKey` (esperado) mas **não** access token
- [ ] Console sem dump acidental de credenciais

---

## 6. O que verificar no Supabase

### 6.1 Tabela `subscriptions`

Após checkout bem-sucedido:

```sql
SELECT
  user_id,
  mp_preapproval_id,
  mp_plan_id,
  status,
  plan_tier,
  billing_period,
  student_limit,
  current_period_end,
  last_payment_status,
  created_at,
  updated_at
FROM subscriptions
WHERE user_id = '<coach_uuid>'
ORDER BY created_at DESC
LIMIT 1;
```

- [ ] `mp_preapproval_id` preenchido (ID do MP)
- [ ] `status` coerente (`authorized`, `pending`, etc.)
- [ ] `plan_tier`, `billing_period`, `student_limit` alinhados ao plano escolhido
- [ ] `user_id` = UUID do coach (`external_reference` no MP)

### 6.2 Tabela `profiles`

```sql
SELECT
  id,
  subscription_active,
  plan_tier,
  billing_period,
  student_limit,
  status_pagamento,
  data_expiracao
FROM profiles
WHERE id = '<coach_uuid>';
```

- [ ] `subscription_active = true` quando assinatura autorizada
- [ ] `plan_tier`, `billing_period`, `student_limit` espelham a assinatura
- [ ] `status_pagamento = 'pago'` com assinatura ativa
- [ ] `data_expiracao` ≈ fim do período (`current_period_end`)

### 6.3 Tabela `webhook_events` (idempotência)

```sql
SELECT
  event_type,
  provider_event_id,
  processed_at,
  created_at,
  payload->>'action' AS action
FROM webhook_events
ORDER BY created_at DESC
LIMIT 10;
```

- [ ] Evento criado após webhook
- [ ] `processed_at` preenchido após handler OK
- [ ] Reenvio do mesmo `(provider, event_type, provider_event_id)` **não** cria linha duplicada
- [ ] `payload` contém metadados MP (não deve conter dados sensíveis de cartão)

### 6.4 Contagem de alunos ativos

Alinhado a `getActiveStudentCount`:

- [ ] Conta vínculos em `coach_alunos` para o coach
- [ ] Exclui alunos com `profiles.arquivado = true`

```sql
-- Conferência manual simplificada
SELECT COUNT(*) FROM coach_alunos ca
JOIN profiles p ON p.id = ca.aluno_id
WHERE ca.coach_id = '<coach_uuid>'
  AND (p.arquivado IS NULL OR p.arquivado = false);
```

---

## 7. Troubleshooting — erros comuns

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| “Mercado Pago não configurado” na UI | Falta `NEXT_PUBLIC_MP_PUBLIC_KEY_TEST` | Definir key de teste e reiniciar `npm run dev` |
| Brick não carrega / script MP falha | Bloqueio de rede, adblock, CSP | Testar rede; ver Console; script `sdk.mercadopago.com/js/v2` |
| `Mercado Pago access token não configurado` | Falta `MP_ACCESS_TOKEN_TEST` | Copiar token test do painel MP |
| `401 Não autorizado` no checkout | Sessão expirada ou sem Bearer | Relogar; verificar header Authorization |
| `403 Acesso negado` | Usuário não é coach | Usar conta `role = coach` |
| `409 Você já possui uma assinatura ativa` | Linha existente com status `authorized` | Cancelar no MP ou limpar registro de teste no Supabase |
| `400 Plano ou periodicidade inválidos` | Combo tier+period inexistente (ex.: PRO semestral) | Escolher opção válida em `plans.ts` |
| Erro MP no checkout (card_token, payer, etc.) | Cartão teste / titular / credenciais erradas | Usar APRO + credenciais test; ver seção 3 |
| Webhook `500 webhook not configured` | `MP_WEBHOOK_SECRET` ausente | Definir secret igual ao painel MP |
| Webhook `401 invalid signature` | Secret divergente ou headers alterados pelo proxy | Conferir secret; não modificar body/query |
| Webhook `200 duplicate: true` sem atualizar dados | Evento já processado | Normal — verificar `processed_at` na linha original |
| Assinatura `pending` eternamente | Webhook não chega ou falha no handler | Conferir tunnel, tópicos MP, logs `[MP-WEBHOOK]` |
| Badge inativo mas MP mostra autorizado | `setUserAccess` não rodou | Disparar webhook manualmente ou chamar refresh; checar `profiles.subscription_active` |
| Convite bloqueado “Assinatura inativa” | `subscription_active = false` | Concluir checkout ou corrigir profile |
| Convite bloqueado “Limite atingido” | `activeStudentCount >= student_limit` | Upgrade de plano ou arquivar aluno |
| `npm run mp:create-plans` falha | Token inválido ou sem permissão | Verificar `MP_ACCESS_TOKEN_TEST` |
| E-mail de boas-vindas assinatura não chega | Resend / template | Ver logs; assinatura funciona mesmo sem e-mail |

### Logs úteis no terminal

- `[SUBSCRIPTIONS-CHECKOUT]` — erros no checkout
- `[MP-WEBHOOK]` — webhook e processamento
- `[INVITE]` — convite e limite de alunos
- `[MP-BRICK]` — erros do Brick no browser (Console)

### Reset de teste (cuidado — só em dev)

```sql
-- Substituir UUID do coach de teste
DELETE FROM webhook_events WHERE provider = 'mercadopago';
DELETE FROM subscriptions WHERE user_id = '<coach_uuid>';
UPDATE profiles SET
  subscription_active = false,
  plan_tier = NULL,
  billing_period = NULL,
  student_limit = NULL,
  status_pagamento = NULL
WHERE id = '<coach_uuid>';
```

Cancelar também a preapproval no [painel MP](https://www.mercadopago.com.br) se necessário.

---

## Referências no código

| Área | Arquivo |
|------|---------|
| Checkout | `app/api/subscriptions/checkout/route.ts` |
| Status / catálogo | `app/api/subscriptions/status/route.ts` |
| UI assinatura | `app/admin/assinatura/page.tsx` |
| Webhook | `app/api/webhooks/mercadopago/route.ts` |
| Assinatura HMAC | `lib/mercadopago/verifySignature.ts` |
| Cliente MP | `lib/mercadopago/client.ts` |
| Handlers | `lib/mercadopago/handlePreapprovalUpdate.ts`, `handlePaymentUpdate.ts` |
| Limite alunos | `lib/subscriptions/checkStudentLimit.ts` |
| Contagem alunos | `lib/subscriptions/getActiveStudentCount.ts` |
| Planos | `lib/subscriptions/plans.ts` |
| Convite | `app/api/admin/invite/route.ts` |

---

*Última revisão: fluxo Preapproval multi-tier (migrations 0029–0030).*
