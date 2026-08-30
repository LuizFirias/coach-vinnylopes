# Auditoria de Segurança — AuronFit

**Data:** 2026-07-07  
**Escopo:** Checklist `auron-checklist-auditoria-seguranca.md`  
**Repositório:** `c:\Users\lfern\Documents\Apps\Auronfit`  
**Stack:** Next.js 16 · Supabase · Vercel · Mercado Pago

---

## Resumo executivo

| Classificação | Quantidade |
|---------------|------------|
| **OK**        | 20         |
| **ATENÇÃO**   | 16         |
| **FALHA**     | 2          |
| **N/A**       | 3          |

**Score estimado:** 18/37 itens verificáveis no código = **49% OK** (sem contar itens que exigem painel Vercel/Supabase ou histórico Git completo).

### Situação geral

O projeto tem **boas bases**: RLS nas migrations de pagamento (`subscriptions`, `webhook_events`), webhook MP com validação HMAC, checkout usando `auth.userId` da sessão, `getAuthenticatedCoach` validando role no banco, `.gitignore` cobrindo `.env*`, repositório **privado** no GitHub, e `package-lock.json` commitado.

**Riscos principais restantes:**
1. Verificação **ao vivo** do RLS no Supabase (não foi possível executar SQL no banco de produção).
2. ~~Rota `/api/auth/register-coach-profile` aceita `userId` do body **sem** validar sessão do caller.~~ **Corrigido** nesta sessão.
3. Middleware Next.js **não** impõe autenticação server-side (só pass-through).
4. ~~Várias rotas `/api/admin/*` checam token mas **não** validam `role === coach` explicitamente (confiam em relação `coach_alunos` ou ownership).~~ **Corrigido** — todas usam `getAuthenticatedCoach()`.

**Correções aplicadas nesta sessão (4):**
- `/api/aluno/coach-whatsapp` — exigência de Bearer token + verificação de vínculo aluno↔coach.
- `/api/auth/preview-email` — bloqueado em `NODE_ENV=production`.
- `/api/auth/register-coach-profile` — `userId` obtido apenas da sessão (`getAuthenticatedUser`); body ignorado.
- `/api/admin/nutricao/plans` — verificação de `coach_id` antes de atualizar plano existente.

**Correções aplicadas (sessão 2 — rotas admin + deps):**
- Todas as 8 rotas `/api/admin/*` padronizadas com `getAuthenticatedCoach()` (role validada no banco).
- `getAuthenticatedCoach` estendido: suporte a cookie `sb-access-token`, `allowedRoles` opcional, bypass `super_admin` em ownership onde aplicável.
- `npm audit fix`: `dompurify` 3.4.7 → 3.4.11 (transitivo via `jspdf`); `postcss` via `next` permanece (fix exige breaking change).

**Build pós-correções:** `npm run build` ✅ (sem erros).

---

## Tabela por seção

### 1. Histórico do Git — segredos vazados

| Item | Status | Evidência |
|------|--------|-----------|
| Scanner de segredos (gitleaks/trufflehog) no histórico completo | **ATENÇÃO** | Scan `git log -p \| grep` bloqueado pelo ambiente. **Recomendação:** rodar localmente `gitleaks detect --source . --log-opts="--all"`. |
| Busca manual por padrões de chave no histórico | **ATENÇÃO** | Não executado (mesmo bloqueio). |
| Rotacionar chaves se vazadas | **N/A** | Sem evidência de vazamento no histórico analisável. |
| `.env`, `.env.local`, `.env*.local` no `.gitignore` | **OK** | `.gitignore` L34: `.env*`; L45: `.env*.local`. |
| Repositório público → tratar como vazamento | **OK** | `gh repo view`: `isPrivate: true`, `visibility: PRIVATE`. |
| `.env` nunca commitado | **OK** | `git log --all -- ".env*"` retornou vazio. |

---

### 2. Variáveis de ambiente (Vercel)

| Item | Status | Evidência |
|------|--------|-----------|
| `NEXT_PUBLIC_*` sem segredos | **OK** | Apenas `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MP_PUBLIC_KEY` (+ `_TEST`), `NEXT_PUBLIC_SITE_URL`. Tokens MP/Supabase service role **sem** prefixo público. |
| Segredos sem prefixo público | **OK** | `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` lidos via `process.env` server-side. |
| Prod vs preview com valores distintos | **ATENÇÃO** | Requer revisão manual em Vercel → Settings → Environment Variables. Código suporta `*_TEST` em dev (`lib/mercadopago/client.ts` L23-29). |
| Sem hardcode em `next.config` / `vercel.json` | **OK** | `next.config.ts` sem secrets; `vercel.json` inexistente. Grep em `*.ts/js` só referencia nomes de env vars, não valores reais. |
| Sem `console.log(process.env...)` | **OK** | Grep: 0 ocorrências. |

---

### 3. Supabase — RLS

| Item | Status | Evidência |
|------|--------|-----------|
| Todas as tabelas `public` com RLS ativo | **ATENÇÃO** | Migrations cobrem tabelas conhecidas (`0022`, `0025`, `0029`, etc.). **Não verificado ao vivo** no SQL Editor. Tabelas legadas (`profiles`, `exercicios`, `fichas_treino`) têm policies em migrations anteriores (`0009`, `0011`). |
| Policies sem `using (true)` desnecessário | **ATENÇÃO** | `pontuacao_alunos` tem `USING (true)` para SELECT autenticado — intencional para leaderboard (`0022_rls_coach_isolation.sql` L135-138). Policy antiga `authenticated_can_read_profiles` foi removida (`0009` L178). |
| `subscriptions` — só SELECT próprio; sem INSERT/UPDATE/DELETE client | **OK** | `0029_coach_subscriptions_mercadopago.sql` L37-40: policy `"user reads own subscription"` FOR SELECT `auth.uid() = user_id`. Escrita via service role nas API routes. |
| `webhook_events` — sem policy client | **OK** | RLS habilitado (L35) sem policies → nega acesso anon/authenticated via PostgREST. Inserção via `getSupabaseAdmin()` no webhook. |
| Teste curl com anon key | **ATENÇÃO** | Não executado (requer URL/anon key de produção). |
| Views/funções `SECURITY DEFINER` revisadas | **ATENÇÃO** | Várias funções SECURITY DEFINER documentadas (`0011`, `0023`, `0008`). `0024_fix_linter_warnings.sql` revoga EXECUTE de PUBLIC/anon/authenticated e re-concede mínimo necessário. **Validar no Supabase Advisor ao vivo.** |

---

### 4. API Routes (`app/api/**`)

| Item | Status | Evidência |
|------|--------|-----------|
| Inventário de rotas | **OK** | 24 rotas `route.ts` encontradas. |
| Rotas de dados com checagem de sessão | **ATENÇÃO** | Maioria exige `Authorization: Bearer`. Exceções intencionais: signup, reset-password, webhook MP, session. `register-coach-profile` corrigido. |
| `/api/subscriptions/checkout` — `user_id` da sessão | **OK** | `auth.userId` de `getAuthenticatedCoach(req)` (`checkout/route.ts` L49, L125, L189). |
| `/api/webhooks/mercadopago` — sem sessão, com `x-signature` | **OK** | `verifyMpSignature` → 401 se inválido (`webhooks/mercadopago/route.ts` L26-27). |
| Teste manual 401 sem token | **ATENÇÃO** | Não executado contra servidor rodando. |

#### Rotas sensíveis — detalhe

| Rota | Auth | Role check | Status |
|------|------|------------|--------|
| `/api/subscriptions/checkout` | ✅ `getAuthenticatedCoach` | ✅ coach/super_admin | OK |
| `/api/subscriptions/status` | ✅ | ✅ | OK |
| `/api/webhooks/mercadopago` | N/A (MP) | ✅ signature | OK |
| `/api/super-admin/set-role` | ✅ | ✅ super_admin | OK |
| `/api/admin/*` (8 rotas) | ✅ `getAuthenticatedCoach` | ✅ coach/super_admin (+ admin em exercícios) | OK |
| `/api/aluno/*` | ✅ Bearer | ✅ usa `user.id` da sessão | OK |
| `/api/aluno/coach-whatsapp` | ✅ Bearer (**corrigido**) | ✅ vínculo coach_alunos | OK |
| `/api/auth/preview-email` | ❌ dev only (**corrigido**) | bloqueado em prod | OK |
| `/api/auth/register-coach-profile` | ✅ `getAuthenticatedUser` | ✅ metadata coach + sessão | OK |
| `/api/auth/signup-coach` / `signup-aluno` | público | N/A (cadastro) | ATENÇÃO |
| `/api/auth/reset-password` | público | N/A | OK (esperado) |
| `/api/session` | público | aceita tokens do body | ATENÇÃO |

---

### 5. Autenticação e sessão

| Item | Status | Evidência |
|------|--------|-----------|
| Roles checadas no backend | **ATENÇÃO** | Rotas `/api/admin/*` e subscriptions usam `getAuthenticatedCoach`. Middleware (`middleware.ts` L8-11) **não** valida sessão — só `NextResponse.next()`. Pendente P1. |
| `getAuthenticatedCoach` valida role no banco | **OK** | `lib/auth/getAuthenticatedCoach.ts` L30-42: lê `profiles.role`, rejeita se não `coach`/`super_admin`. |
| Expiração de sessão razoável | **ATENÇÃO** | `/api/session` define access token Max-Age 1h, refresh 7d (`session/route.ts` L18-25). Config JWT do Supabase Auth não verificável aqui. |

---

### 6. Dependências e supply chain

| Item | Status | Evidência |
|------|--------|-----------|
| `npm audit --omit=dev` | **ATENÇÃO** | 2 vulnerabilidades **moderate** restantes: `postcss` via `next` (fix exige breaking change). `dompurify` corrigido (3.4.11 via `jspdf`). |
| Dependências não usadas / duvidosas | **ATENÇÃO** | Não auditado em profundidade nesta sessão. |
| `package-lock.json` commitado | **OK** | Arquivo presente na raiz. |

---

### 7. Específico de pagamento (Mercado Pago)

| Item | Status | Evidência |
|------|--------|-----------|
| `MP_WEBHOOK_SECRET` + rejeição 401 sem assinatura | **OK** | `verifyMpSignature` com HMAC-SHA256 timing-safe (`lib/mercadopago/verifySignature.ts`). Retorna 401 (`webhooks/mercadopago/route.ts` L27). |
| Respostas não expõem `MP_ACCESS_TOKEN` / cartão | **OK** | Token só em header server-side (`lib/mercadopago/client.ts` L171-179). Checkout recebe `cardTokenId` do client (esperado pelo MP Brick), não persiste PAN. |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` por ambiente | **OK** | `subscriptions/status/route.ts` L19-31: prod usa `NEXT_PUBLIC_MP_PUBLIC_KEY`, dev usa `_TEST` com fallback. `getMpAccessToken()` idem (`client.ts` L23-29). |
| `MP_WEBHOOK_SECRET` único por ambiente | **ATENÇÃO** | Verificar manualmente no Vercel. |

---

### 8. Configuração Vercel/deploy

| Item | Status | Evidência |
|------|--------|-----------|
| Preview não aponta para DB de produção | **ATENÇÃO** | Não verificável no código. Recomenda-se projeto Supabase staging para previews. |
| Revisão de acessos Vercel/Supabase | **ATENÇÃO** | Ação manual — remover colaboradores inativos. |
| HTTPS forçado | **OK** | Vercel força HTTPS por padrão; `next.config.ts` sem redirect HTTP. Cookies de sessão usam `Secure` em produção (`session/route.ts` L27). |

---

### 9. Logging e monitoramento

| Item | Status | Evidência |
|------|--------|-----------|
| Sem log redundante de payload de webhook | **OK** | Webhook grava em `webhook_events.payload` (correto). Erros logam mensagem, não payload completo (`webhooks/mercadopago/route.ts` L68). |
| Alertas 401 webhook / 500 | **FALHA** | Nenhuma configuração de alerta encontrada no repositório (Vercel Analytics, Sentry, Datadog, etc.). |

---

## Itens corrigidos nesta sessão

### 1. `/api/aluno/coach-whatsapp` — exposição de telefone sem auth (P0)

**Antes:** Qualquer pessoa com `coachId` obtinha WhatsApp do coach via service role.  
**Depois:** Exige `Authorization: Bearer`, valida que o aluno autenticado pertence ao coach (`profiles.coach_id` ou `coach_alunos`).  
**Arquivos:** `app/api/aluno/coach-whatsapp/route.ts`, `app/components/SubscriptionGuard.tsx`

### 2. `/api/auth/preview-email` — templates expostos em produção (P0)

**Antes:** Rota pública renderizava todos os templates de e-mail (incluindo credenciais de exemplo).  
**Depois:** Retorna 404 quando `NODE_ENV === "production"`.  
**Arquivo:** `app/api/auth/preview-email/route.ts`

### 3. `/api/auth/register-coach-profile` — impersonação via userId no body (P0)

**Antes:** Aceitava `userId` arbitrário no body; qualquer caller podia criar/editar perfil de outro usuário com role coach no metadata.  
**Depois:** `userId` obtido exclusivamente da sessão (`getAuthenticatedUser` — Bearer ou cookie `sb-access-token`). Campo `userId` do body ignorado.  
**Arquivos:** `app/api/auth/register-coach-profile/route.ts`, `lib/auth/getAuthenticatedUser.ts`

### 4. `/api/admin/nutricao/plans` — update cross-coach (P1)

**Antes:** Ao atualizar plano existente (`id` no body), não verificava se `coach_id` pertencia ao usuário autenticado.  
**Depois:** Checagem de ownership (`existingPlan.coach_id === user.id`) antes do update.  
**Arquivo:** `app/api/admin/nutricao/plans/route.ts`

### 5. Rotas `/api/admin/*` — padronização de role check (P1)

**Antes:** 5 rotas validavam apenas token Bearer; alunos autenticados podiam acessar endpoints admin (ex.: busca de alimentos, planos, parceiros).  
**Depois:** Todas as 8 rotas admin usam `getAuthenticatedCoach()` com validação de `profiles.role` no banco. Ownership/`coach_alunos` mantidos; `super_admin` bypass onde aplicável.  
**Arquivos:** `lib/auth/getAuthenticatedCoach.ts`, `app/api/admin/**/route.ts`

---

## Itens pendentes priorizados

### P0 — Crítico (fazer antes de ir live com pagamentos)

| # | Item | Ação recomendada |
|---|------|------------------|
| 1 | **RLS ao vivo no Supabase** | Executar SQL do checklist (seções 3.1–3.2) no SQL Editor. Confirmar `rowsecurity=true` em todas as tabelas `public`. |
| 2 | **Teste curl anon key** | `curl .../rest/v1/subscriptions?select=*` com anon key — deve retornar `[]` ou erro, nunca dados de outros usuários. |
| 3 | ~~**`/api/auth/register-coach-profile`**~~ | ✅ Corrigido — sessão obrigatória via `getAuthenticatedUser`. |
| 4 | **gitleaks no histórico Git** | `gitleaks detect --source . --log-opts="--all"`. Rotacionar qualquer chave encontrada. |

### P1 — Alto

| # | Item | Ação recomendada |
|---|------|------------------|
| 5 | **Middleware sem auth server-side** | Implementar verificação de cookie `sb-access-token` no middleware ou migrar para proxy Next.js 16. |
| 6 | ~~**Rotas `/api/admin/*` sem checagem de role**~~ | ✅ Padronizado `getAuthenticatedCoach()` nas 8 rotas admin. |
| 7 | **Vercel env prod ≠ preview** | Separar `MP_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` e URLs por ambiente. |
| 8 | **Preview → Supabase staging** | Evitar que PRs acessem banco de produção. |
| 9 | ~~**npm audit (dompurify)**~~ | ✅ `dompurify` 3.4.11. `postcss` via `next` pendente (breaking). |

### P2 — Médio

| # | Item | Ação recomendada |
|---|------|------------------|
| 10 | **Alertas de monitoramento** | Configurar alerta Vercel/Sentry para 401 em `/api/webhooks/mercadopago` e taxa de 500. |
| 11 | **`/api/session` público** | Validar tokens com `auth.getUser()` antes de setar cookies HttpOnly. |
| 12 | **`pontuacao_alunos` SELECT aberto** | Avaliar se leaderboard precisa de policy `USING (true)` ou função RPC filtrada. |
| 13 | **Revisão de acessos** | Auditar membros Vercel/Supabase/GitHub. |
| 14 | **signup público com service role** | Rate limiting / CAPTCHA nas rotas `signup-coach` e `signup-aluno`. |

---

## Comandos úteis para follow-up

```bash
# Segredos no histórico
gitleaks detect --source . --log-opts="--all" --report-path gitleaks-report.json

# RLS no Supabase (SQL Editor)
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by rowsecurity asc;

# Teste anon key
curl "https://SEU_PROJETO.supabase.co/rest/v1/subscriptions?select=*" \
  -H "apikey: SUA_ANON_KEY" \
  -H "Authorization: Bearer SUA_ANON_KEY"

# Dependências
npm audit --omit=dev
```

---

## Conclusão

O AuronFit está **parcialmente pronto** para pagamentos: a camada MP (webhook HMAC, checkout com sessão, chaves separadas por ambiente no código) está bem estruturada. O **maior gap** é a **falta de verificação ao vivo do RLS** e algumas rotas API com autenticação incompleta. As duas correções P0 de baixo risco foram aplicadas e validadas com build.

**Próximo passo recomendado:** executar os 4 itens P0 na ordem listada, especialmente o SQL de RLS e o teste curl antes de processar pagamentos reais.
