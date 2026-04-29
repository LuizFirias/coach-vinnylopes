# MIGRATION PLAN — Schema atual → Schema-alvo

> **Plano cirúrgico de migração para banco em produção.**
> Stack: Supabase (PostgreSQL 15+) com app Next.js já em uso.
> Este documento substitui o `SUPABASE-SCHEMA.md` genérico anterior.

---

## 0. Contexto

### O que você JÁ tem (schema atual)

```
✅ profiles                  → usuários (alunos, coaches, super_admin)
✅ coach_alunos              → relação coach ↔ aluno
✅ exercicios_biblioteca     → biblioteca de exercícios
✅ fichas_treino             → fichas (configuracao em JSONB)
✅ agenda_semanal            → planejamento da semana
✅ historico_treinos         → ⭐ FONTE DE VERDADE (sessões + séries em JSONB)
✅ medidas_aluno             → medidas corporais (sem CHECK)
✅ fotos_evolucao            → 3 ângulos de foto
✅ treinos_alunos            → PDFs anexados pelo coach
✅ treinos_manuais           → registros manuais de musculação/cardio
✅ feedbacks_treinos         → feedback aluno → coach
✅ plano_alimentar_pdf       → PDFs de dieta
✅ plano_alimentar_audit     → auditoria de acesso
✅ parceiros                 → marcas parceiras (com flag ativo)
✅ pontuacao_alunos          → total de pontos por aluno
⚠️  logs_treino              → órfã (não usada, mantida)
⚠️  registros_treino         → órfã (não usada, mantida)
🗑️ temp_id_mapping           → leftover de migração antiga
```

### Decisões registradas

1. **Manter nomes em português** — refactor para inglês não traz benefício prático.
2. **`historico_treinos` é a fonte da verdade** de séries feitas. `logs_treino` e `registros_treino` ficam como estão (mortas no código, sem drop).
3. **`fichas_treino.configuracao` continua JSONB**. Definir formato canônico (§8 deste doc).
4. **RLS já habilitada em TODAS as 18 tabelas** — discovery confirmou. Trabalho vira auditoria pontual de policies (§11).
5. **Nada de `DROP TABLE`** nos sprints 0–6. Tabelas órfãs ficam até comprovar 12 meses sem uso.
6. **Toda CHECK constraint adicionada com `NOT VALID`** — só vale para INSERTs/UPDATEs novos.
7. **Não duplicar funções existentes.** Banco já tem várias (lista em §0.2).

### 0.1 Findings do discovery (estado real do banco)

**RLS:**
- ✅ Habilitada em todas as 18 tabelas

**Triggers em auth.users:**
- ✅ `on_auth_user_created` → `handle_new_user()` (cria profile automaticamente — **NÃO duplicar**)

**Buckets de Storage existentes:**
- `parceiros-logos`
- `evolucao-fotos` ← **atenção: NÃO é "fotos-evolucao"**
- `plano alimentar` ← **atenção: tem espaço no nome**
- `treinos-pdf`
- `avatars`

**Findings de segurança detectados:**

| Tabela | Policy | Risco | Ação |
|---|---|---|---|
| `fichas_treino` | `"Coach gere as fichas"` usa `role='coach'` sem checar `coach_alunos` | Qualquer coach edita ficha de qualquer aluno | Reforçar com `coach_alunos` se >1 coach |
| `medidas_aluno` | `"Coaches veem todas as medidas"` usa `role='coach'` | Qualquer coach lê medidas de qualquer aluno | Reforçar com `coach_alunos` se >1 coach |
| `profiles` | `"authenticated_can_read_profiles"` com `USING true` | Qualquer aluno lê perfil completo de outros | Substituir por view limitada ao leaderboard |
| `plano_alimentar_audit` | **RLS sem nenhuma policy** | App não consegue ler/escrever | Criar policies (§11.4) |
| `temp_id_mapping` | RLS sem policies | Tabela leftover, OK ignorar | Drop futuro (§14) |

### 0.2 Funções existentes (não duplicar)

```
✅ handle_new_user()              → cria profile automático (trigger em auth.users)
✅ get_ultimo_treino_exercicio()  → ⭐ provavelmente equivale ao "peso anterior"
✅ atualizar_pontos_treino()      → função de pontuação por treino
✅ calcular_pontos_treino()       → cálculo de pontos
✅ consolidar_pontos_aluno()      → consolidação de pontos do aluno
✅ realizar_checkin()             → check-in diário (atualiza profiles.ultimo_checkin)
✅ rls_auto_enable()              → helper interno
✅ update_feedbacks_updated_at()  → trigger genérica de updated_at
✅ update_updated_at_column()     → trigger genérica de updated_at
```

**Implicações (decisões fechadas após discovery completo):**

- **Sprint 2 (peso anterior + PRs)** — ✅ confirmado que `get_ultimo_treino_exercicio()` cobre o caso de uso. **NÃO criar competidora.** Reutilizar via Server Components + helper TS `getSerieAnterior()`.
- **Sprint 6 (pontuação)** — ✅ confirmado: as 3 funções existentes só consideram `treinos_manuais`. Decisão: REESCREVER `consolidar_pontos_aluno()` mantendo a interface, mas agora soma de todas as fontes (treinos_manuais + historico_treinos válidos + PRs + medidas + fotos). Detalhes em §10.

### 0.3 Discovery adicional (✅ JÁ FEITO — referência)

> ✅ **Estas queries já foram rodadas e seus resultados estão refletidos neste documento.** Mantidas aqui apenas como referência caso precisem ser rerodadas no futuro.

```sql
-- Ver definição completa das funções existentes
SELECT
  p.proname AS nome,
  pg_get_functiondef(p.oid) AS definicao
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_ultimo_treino_exercicio',
    'atualizar_pontos_treino',
    'calcular_pontos_treino',
    'consolidar_pontos_aluno',
    'realizar_checkin',
    'handle_new_user'
  );

-- Ver formato real de dados_sessao
SELECT
  id,
  exercicio_id,
  data_conclusao,
  jsonb_pretty(dados_sessao) AS dados
FROM historico_treinos
WHERE dados_sessao IS NOT NULL
ORDER BY data_conclusao DESC
LIMIT 5;
```

### O que vamos adicionar

```
🆕 recordes_pessoais         → PRs por (aluno, exercício, reps)
🆕 refeicoes_plano           → refeições estruturadas dentro do plano
🆕 consumos_refeicao         → check-off diário de refeições
🆕 registros_agua            → tracking de copos d'água
🆕 v_historico_validos       → view base que filtra sessões reais
🆕 v_streak_aluno            → view de streak (usa v_historico_validos)
🆕 v_leaderboard             → view de ranking
🆕 v_atletas_ativos_semana   → view para tela de Ranking
🆕 recalcular_pontos_aluno() → wrapper público
🔄 consolidar_pontos_aluno() → REESCREVER somando de todas as fontes
🆕 detectar_prs_da_sessao()  → função + trigger automática
🆕 get_kpis_aluno()          → função para KPIs do dashboard
🆕 delete_user_account()     → LGPD
🆕 export_user_data()        → LGPD
🆕 colunas em profiles       → preferências do usuário
🆕 CHECK constraints         → em medidas_aluno
🚫 realizar_checkin()        → marcar deprecated (tabela checkins não existe)
```

---

## 1. Workflow obrigatório

```
┌──────────────────────────────────────────────────────────┐
│  1. Discovery — rodar queries da §2 e salvar resultado    │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  2. Backup — pg_dump completo + cópia do bucket Storage   │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  3. Branch do Supabase — criar staging-redesign           │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  4. Aplicar Sprint 0 NA BRANCH                            │
│     → testar app local apontado pra branch                │
│     → validar que nada quebrou                            │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  5. Aplicar Sprint 0 EM PRODUÇÃO                          │
│     → janela de manutenção (idealmente baixa demanda)     │
└──────────────────────────────────────────────────────────┘
                         ↓
                   Repetir 4 e 5 para
                   cada Sprint seguinte
```

---

## 2. Discovery — ANTES de qualquer coisa

Cole no SQL Editor do Supabase, rode todas, salve resultados em `discovery-output.txt`:

### 2.1 RLS habilitada por tabela

```sql
SELECT
  tablename,
  rowsecurity AS rls_habilitada
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

→ **Salvar resultado.** É a base para decidir quais tabelas precisam de `ENABLE` no Sprint lateral.

### 2.2 Policies já existentes

```sql
SELECT
  tablename,
  policyname,
  cmd AS comando,    -- SELECT/INSERT/UPDATE/DELETE/ALL
  qual AS condicao_using,
  with_check AS condicao_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

→ **Salvar resultado.** Não vamos sobrescrever policies existentes — só somar.

### 2.3 Triggers em auth.users

```sql
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND event_object_table = 'users';
```

→ **Salvar resultado.** Se já houver trigger criando `profiles` automaticamente, **não criar de novo**.

### 2.4 Functions customizadas existentes

```sql
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

→ Garantir que não vamos sobrescrever função existente sem querer.

### 2.5 Inspecionar formato real de `dados_sessao`

```sql
SELECT
  id,
  exercicio_id,
  data_conclusao,
  jsonb_pretty(dados_sessao) AS dados
FROM historico_treinos
ORDER BY data_conclusao DESC
LIMIT 5;
```

→ **Crítico.** Confirma o formato JSON real. Se não bater com o formato canônico (§8), preciso ajustar as funções de PR e peso anterior.

### 2.6 Buckets de Storage

No Dashboard → Storage → listar buckets e suas policies. Discovery confirmou os buckets: `parceiros-logos`, `evolucao-fotos`, `plano alimentar`, `treinos-pdf`, `avatars`.

---

## 3. Backup obrigatório

```bash
# Variáveis (Dashboard → Settings → Database → Connection string)
export PGHOST="db.<project-ref>.supabase.co"
export PGPORT="5432"
export PGUSER="postgres"
export PGPASSWORD="<senha>"
export PGDATABASE="postgres"

# Backup completo
pg_dump --no-owner --no-privileges -Fc \
  -f backup-$(date +%Y%m%d-%H%M).dump

# Storage (fotos)
supabase login
supabase storage cp --recursive ss:///evolucao-fotos ./backup-fotos/
# (ajustar para outros buckets conforme necessidade: 'plano alimentar', 'treinos-pdf', 'avatars')
```

**Guardar fora do Supabase.** Esse arquivo é seu rollback de última instância.

---

## 4. Branch do Supabase (ambiente de teste)

```bash
supabase login
supabase link --project-ref <production-ref>
supabase branches create staging-redesign
```

A branch tem URL e anon key próprias. Apontar app local pra ela:

```bash
# .env.local (DEV apenas, NUNCA commit)
NEXT_PUBLIC_SUPABASE_URL=https://<branch-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<branch-anon-key>
```

> **Sem plano Pro?** Crie um segundo projeto Supabase (free tier) chamado "staging-redesign". Não vai ter os dados de produção, mas serve para validar que o SQL roda sem erro de sintaxe e que policies fazem sentido.

---

## 5. SPRINT 0 — Higiene crítica (3-5 dias)

**Objetivo:** parar a sangria. Bugs ativos e gaps de LGPD. Nenhuma mudança quebra app existente.

### 5.1 Bloco A — Validação de medidas

**A.1 — Identificar dados absurdos** (read-only, não muda nada)

```sql
SELECT id, aluno_id, data_medicao,
  peso, altura, gordura_corporal,
  pescoco, ombros, peitoral,
  braco_direito, braco_esquerdo,
  antebraco_direito, antebraco_esquerdo,
  cintura, abdomen, quadril,
  coxa_direita, coxa_esquerda,
  panturrilha_direita, panturrilha_esquerda
FROM medidas_aluno
WHERE
  (peso IS NOT NULL AND (peso < 30 OR peso > 300))
  OR (altura IS NOT NULL AND (altura < 100 OR altura > 250))
  OR (gordura_corporal IS NOT NULL AND (gordura_corporal < 3 OR gordura_corporal > 60))
  OR (pescoco IS NOT NULL AND (pescoco < 25 OR pescoco > 60))
  OR (ombros IS NOT NULL AND (ombros < 60 OR ombros > 200))
  OR (peitoral IS NOT NULL AND (peitoral < 40 OR peitoral > 200))
  OR (braco_direito IS NOT NULL AND (braco_direito < 15 OR braco_direito > 80))
  OR (braco_esquerdo IS NOT NULL AND (braco_esquerdo < 15 OR braco_esquerdo > 80))
  OR (antebraco_direito IS NOT NULL AND (antebraco_direito < 15 OR antebraco_direito > 60))
  OR (antebraco_esquerdo IS NOT NULL AND (antebraco_esquerdo < 15 OR antebraco_esquerdo > 60))
  OR (cintura IS NOT NULL AND (cintura < 40 OR cintura > 200))
  OR (abdomen IS NOT NULL AND (abdomen < 40 OR abdomen > 200))
  OR (quadril IS NOT NULL AND (quadril < 40 OR quadril > 200))
  OR (coxa_direita IS NOT NULL AND (coxa_direita < 25 OR coxa_direita > 100))
  OR (coxa_esquerda IS NOT NULL AND (coxa_esquerda < 25 OR coxa_esquerda > 100))
  OR (panturrilha_direita IS NOT NULL AND (panturrilha_direita < 20 OR panturrilha_direita > 70))
  OR (panturrilha_esquerda IS NOT NULL AND (panturrilha_esquerda < 20 OR panturrilha_esquerda > 70));
```

**A.2 — Limpar campos absurdos** (set NULL, mantém o registro)

```sql
BEGIN;

UPDATE medidas_aluno SET peso = NULL                  WHERE peso IS NOT NULL                  AND (peso < 30 OR peso > 300);
UPDATE medidas_aluno SET altura = NULL                WHERE altura IS NOT NULL                AND (altura < 100 OR altura > 250);
UPDATE medidas_aluno SET gordura_corporal = NULL      WHERE gordura_corporal IS NOT NULL      AND (gordura_corporal < 3 OR gordura_corporal > 60);
UPDATE medidas_aluno SET pescoco = NULL               WHERE pescoco IS NOT NULL               AND (pescoco < 25 OR pescoco > 60);
UPDATE medidas_aluno SET ombros = NULL                WHERE ombros IS NOT NULL                AND (ombros < 60 OR ombros > 200);
UPDATE medidas_aluno SET peitoral = NULL              WHERE peitoral IS NOT NULL              AND (peitoral < 40 OR peitoral > 200);
UPDATE medidas_aluno SET braco_direito = NULL         WHERE braco_direito IS NOT NULL         AND (braco_direito < 15 OR braco_direito > 80);
UPDATE medidas_aluno SET braco_esquerdo = NULL        WHERE braco_esquerdo IS NOT NULL        AND (braco_esquerdo < 15 OR braco_esquerdo > 80);
UPDATE medidas_aluno SET antebraco_direito = NULL     WHERE antebraco_direito IS NOT NULL     AND (antebraco_direito < 15 OR antebraco_direito > 60);
UPDATE medidas_aluno SET antebraco_esquerdo = NULL    WHERE antebraco_esquerdo IS NOT NULL    AND (antebraco_esquerdo < 15 OR antebraco_esquerdo > 60);
UPDATE medidas_aluno SET cintura = NULL               WHERE cintura IS NOT NULL               AND (cintura < 40 OR cintura > 200);
UPDATE medidas_aluno SET abdomen = NULL               WHERE abdomen IS NOT NULL               AND (abdomen < 40 OR abdomen > 200);
UPDATE medidas_aluno SET quadril = NULL               WHERE quadril IS NOT NULL               AND (quadril < 40 OR quadril > 200);
UPDATE medidas_aluno SET coxa_direita = NULL          WHERE coxa_direita IS NOT NULL          AND (coxa_direita < 25 OR coxa_direita > 100);
UPDATE medidas_aluno SET coxa_esquerda = NULL         WHERE coxa_esquerda IS NOT NULL         AND (coxa_esquerda < 25 OR coxa_esquerda > 100);
UPDATE medidas_aluno SET panturrilha_direita = NULL   WHERE panturrilha_direita IS NOT NULL   AND (panturrilha_direita < 20 OR panturrilha_direita > 70);
UPDATE medidas_aluno SET panturrilha_esquerda = NULL  WHERE panturrilha_esquerda IS NOT NULL  AND (panturrilha_esquerda < 20 OR panturrilha_esquerda > 70);

COMMIT;
-- ROLLBACK; se algo der errado antes do COMMIT
```

**A.3 — Adicionar CHECK constraints (NOT VALID)**

```sql
BEGIN;

ALTER TABLE medidas_aluno
  ADD CONSTRAINT chk_med_peso              CHECK (peso IS NULL OR peso BETWEEN 30 AND 300) NOT VALID,
  ADD CONSTRAINT chk_med_altura            CHECK (altura IS NULL OR altura BETWEEN 100 AND 250) NOT VALID,
  ADD CONSTRAINT chk_med_gordura           CHECK (gordura_corporal IS NULL OR gordura_corporal BETWEEN 3 AND 60) NOT VALID,
  ADD CONSTRAINT chk_med_massa_magra       CHECK (massa_magra IS NULL OR massa_magra BETWEEN 20 AND 200) NOT VALID,
  ADD CONSTRAINT chk_med_pescoco           CHECK (pescoco IS NULL OR pescoco BETWEEN 25 AND 60) NOT VALID,
  ADD CONSTRAINT chk_med_ombros            CHECK (ombros IS NULL OR ombros BETWEEN 60 AND 200) NOT VALID,
  ADD CONSTRAINT chk_med_peitoral          CHECK (peitoral IS NULL OR peitoral BETWEEN 40 AND 200) NOT VALID,
  ADD CONSTRAINT chk_med_braco_dir         CHECK (braco_direito IS NULL OR braco_direito BETWEEN 15 AND 80) NOT VALID,
  ADD CONSTRAINT chk_med_braco_esq         CHECK (braco_esquerdo IS NULL OR braco_esquerdo BETWEEN 15 AND 80) NOT VALID,
  ADD CONSTRAINT chk_med_antebraco_dir     CHECK (antebraco_direito IS NULL OR antebraco_direito BETWEEN 15 AND 60) NOT VALID,
  ADD CONSTRAINT chk_med_antebraco_esq     CHECK (antebraco_esquerdo IS NULL OR antebraco_esquerdo BETWEEN 15 AND 60) NOT VALID,
  ADD CONSTRAINT chk_med_cintura           CHECK (cintura IS NULL OR cintura BETWEEN 40 AND 200) NOT VALID,
  ADD CONSTRAINT chk_med_abdomen           CHECK (abdomen IS NULL OR abdomen BETWEEN 40 AND 200) NOT VALID,
  ADD CONSTRAINT chk_med_quadril           CHECK (quadril IS NULL OR quadril BETWEEN 40 AND 200) NOT VALID,
  ADD CONSTRAINT chk_med_coxa_dir          CHECK (coxa_direita IS NULL OR coxa_direita BETWEEN 25 AND 100) NOT VALID,
  ADD CONSTRAINT chk_med_coxa_esq          CHECK (coxa_esquerda IS NULL OR coxa_esquerda BETWEEN 25 AND 100) NOT VALID,
  ADD CONSTRAINT chk_med_pant_dir          CHECK (panturrilha_direita IS NULL OR panturrilha_direita BETWEEN 20 AND 70) NOT VALID,
  ADD CONSTRAINT chk_med_pant_esq          CHECK (panturrilha_esquerda IS NULL OR panturrilha_esquerda BETWEEN 20 AND 70) NOT VALID;

COMMIT;
```

**Rollback do bloco A.3:**
```sql
ALTER TABLE medidas_aluno
  DROP CONSTRAINT IF EXISTS chk_med_peso,
  DROP CONSTRAINT IF EXISTS chk_med_altura,
  -- ... e assim por diante
  DROP CONSTRAINT IF EXISTS chk_med_pant_esq;
```

### 5.2 Bloco B — LGPD: excluir conta + exportar dados

```sql
-- Função: exportar todos os dados do usuário (LGPD Art. 18, I)
CREATE OR REPLACE FUNCTION public.export_user_data()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  result JSONB;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT jsonb_build_object(
    'profile',           (SELECT row_to_json(p) FROM profiles p WHERE p.id = uid),
    'medidas',           (SELECT jsonb_agg(row_to_json(m)) FROM medidas_aluno m WHERE m.aluno_id = uid),
    'historico_treinos', (SELECT jsonb_agg(row_to_json(h)) FROM historico_treinos h WHERE h.aluno_id = uid),
    'fotos',             (SELECT jsonb_agg(row_to_json(f)) FROM fotos_evolucao f WHERE f.aluno_id = uid),
    'feedbacks',         (SELECT jsonb_agg(row_to_json(fb)) FROM feedbacks_treinos fb WHERE fb.aluno_id = uid),
    'pontuacao',         (SELECT row_to_json(pa) FROM pontuacao_alunos pa WHERE pa.aluno_id = uid),
    'fichas_treino',     (SELECT jsonb_agg(row_to_json(ft)) FROM fichas_treino ft WHERE ft.aluno_id = uid),
    'agenda_semanal',    (SELECT jsonb_agg(row_to_json(a)) FROM agenda_semanal a WHERE a.aluno_id = uid),
    'treinos_manuais',   (SELECT jsonb_agg(row_to_json(tm)) FROM treinos_manuais tm WHERE tm.aluno_id = uid),
    'planos_alimentares',(SELECT jsonb_agg(row_to_json(pl)) FROM plano_alimentar_pdf pl WHERE pl.aluno_id = uid),
    'exportado_em',      NOW()
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_user_data() TO authenticated;
```

```sql
-- Função: excluir conta (LGPD Art. 18, VI)
-- IMPORTANTE: como suas FKs não têm ON DELETE CASCADE, deletamos
-- manualmente em ordem (filhos primeiro, depois auth.users).
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Deletar manualmente em ordem (filhos primeiro)
  DELETE FROM plano_alimentar_audit  WHERE acessado_por = uid;
  DELETE FROM plano_alimentar_pdf    WHERE aluno_id = uid OR coach_id = uid;
  DELETE FROM treinos_manuais        WHERE aluno_id = uid OR coach_id = uid;
  DELETE FROM feedbacks_treinos      WHERE aluno_id = uid OR coach_id = uid;
  DELETE FROM historico_treinos      WHERE aluno_id = uid;
  DELETE FROM logs_treino            WHERE aluno_id = uid;
  DELETE FROM registros_treino       WHERE aluno_id = uid;
  DELETE FROM agenda_semanal         WHERE aluno_id = uid;
  DELETE FROM treinos_alunos         WHERE aluno_id = uid OR coach_id = uid;
  DELETE FROM fichas_treino          WHERE aluno_id = uid OR coach_id = uid;
  DELETE FROM medidas_aluno          WHERE aluno_id = uid;
  DELETE FROM fotos_evolucao         WHERE aluno_id = uid;
  DELETE FROM pontuacao_alunos       WHERE aluno_id = uid;
  DELETE FROM coach_alunos           WHERE aluno_id = uid OR coach_id = uid;
  DELETE FROM parceiros              WHERE coach_id = uid;
  DELETE FROM profiles               WHERE id = uid;

  -- Por último: auth.users
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
```

**Rollback do bloco B:**
```sql
DROP FUNCTION IF EXISTS public.export_user_data();
DROP FUNCTION IF EXISTS public.delete_user_account();
```

### 5.3 Bloco C — Esconder Parceiros

Apenas front (DESIGN-SPEC §4.1) — esconder `<section>` quando `parceiros WHERE ativo = true` retornar 0 linhas. Sem mudança no banco.

Opcional: garantir que tudo está oculto:
```sql
UPDATE parceiros SET ativo = false WHERE ativo = true;
-- Rollback: UPDATE parceiros SET ativo = true WHERE id IN (...);
```

### 5.4 Checklist Sprint 0

- [ ] Discovery rodada (§2)
- [ ] Backup feito (§3)
- [ ] Branch criada (§4)
- [ ] Bloco A.1 rodado em produção (read-only)
- [ ] Bloco A.2 rodado em branch e validado
- [ ] Bloco A.3 rodado em branch e validado
- [ ] Bloco B rodado em branch e validado
- [ ] App apontado pra branch — testar inserção de medida válida
- [ ] App apontado pra branch — testar inserção de medida absurda (deve falhar)
- [ ] App apontado pra branch — testar fluxo de excluir conta
- [ ] **Apply em produção** (janela de manutenção)
- [ ] Validação Zod implementada no front (`lib/validation/medidas.ts`)
- [ ] `OutlierWarningDialog` integrado no formulário
- [ ] Front: esconder seção `Parceiros` quando vazio
- [ ] Front: corrigir truncagem "MINHA FICHA DE TRE..."
- [ ] Front: corrigir glyph "C" quebrado em Fotos > Lado
- [ ] Front: corrigir pluralização "1 atletas" → "1 atleta"
- [ ] Front: tela "Excluir conta" no perfil (chama `delete_user_account()`)
- [ ] Front: botão "Exportar meus dados" no perfil (chama `export_user_data()`)

---

## 6. SPRINT 2 — Tela de execução (CRÍTICO)

> Sprint 1 (sistema de design) é puro front, sem mudança no banco.

> ✅ **Discovery completo. Decisões fechadas:** a função `get_ultimo_treino_exercicio()` já existe e cobre o caso de "peso anterior". **NÃO criar `get_serie_anterior` competidora.** Reutilizar via Server Components — detalhes na §6.3.

**Objetivo:** suporte de banco para a tela de execução do treino — peso anterior, PRs automáticos.

### 6.1 Bloco D — Tabela de PRs

```sql
BEGIN;

CREATE TABLE public.recordes_pessoais (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES profiles(id),
  exercicio_id    UUID NOT NULL REFERENCES exercicios_biblioteca(id),
  peso            NUMERIC(6,2) NOT NULL CHECK (peso >= 0 AND peso <= 1000),
  reps            INTEGER NOT NULL CHECK (reps BETWEEN 1 AND 100),
  historico_id    UUID REFERENCES historico_treinos(id) ON DELETE SET NULL,
  conquistado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aluno_id, exercicio_id, reps)
);

CREATE INDEX idx_recordes_aluno ON recordes_pessoais(aluno_id, conquistado_em DESC);

ALTER TABLE recordes_pessoais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alunos_leem_proprios_prs"
  ON recordes_pessoais FOR SELECT
  USING (auth.uid() = aluno_id);

CREATE POLICY "coaches_leem_prs_dos_alunos"
  ON recordes_pessoais FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_id = auth.uid()
        AND aluno_id = recordes_pessoais.aluno_id
    )
  );

-- Inserts só via função (trigger), nunca direto
CREATE POLICY "ninguem_insere_pr_diretamente"
  ON recordes_pessoais FOR INSERT
  WITH CHECK (false);

COMMIT;
```

**Rollback:**
```sql
DROP TABLE IF EXISTS public.recordes_pessoais;
```

### 6.2 Bloco E — Função `detectar_prs_da_sessao` + trigger

> ⚠️ Adaptada ao formato real do `dados_sessao` (descoberto via Query B). Usa `peso_atual`, `ordem`, `completado` — não `peso`, `numero`, `completada_em`.
>
> Filtro crítico: só considera séries com `completado = true` E `peso_atual > 0`.

```sql
CREATE OR REPLACE FUNCTION public.detectar_prs_da_sessao(p_historico_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aluno_id     UUID;
  v_exercicio_id UUID;
  v_dados        JSONB;
  v_serie        JSONB;
  v_peso         NUMERIC;
  v_reps         INTEGER;
  v_completado   BOOLEAN;
  v_pr_atual     NUMERIC;
  v_count        INTEGER := 0;
BEGIN
  SELECT aluno_id, exercicio_id, dados_sessao
    INTO v_aluno_id, v_exercicio_id, v_dados
  FROM historico_treinos
  WHERE id = p_historico_id;

  IF v_dados IS NULL OR NOT (v_dados ? 'series') THEN
    RETURN 0;
  END IF;

  FOR v_serie IN SELECT * FROM jsonb_array_elements(v_dados->'series')
  LOOP
    -- Cast com tolerância: peso_atual pode ser número ou string
    v_peso       := NULLIF(v_serie->>'peso_atual', '')::NUMERIC;
    -- reps pode vir como string "12" ou int 12
    v_reps       := NULLIF(v_serie->>'reps', '')::INTEGER;
    v_completado := COALESCE((v_serie->>'completado')::BOOLEAN, false);

    -- Pular séries não completadas, sem peso ou sem reps
    IF NOT v_completado OR v_peso IS NULL OR v_peso <= 0
       OR v_reps IS NULL OR v_reps < 1 THEN
      CONTINUE;
    END IF;

    SELECT peso INTO v_pr_atual
    FROM recordes_pessoais
    WHERE aluno_id = v_aluno_id
      AND exercicio_id = v_exercicio_id
      AND reps = v_reps;

    IF v_pr_atual IS NULL OR v_peso > v_pr_atual THEN
      INSERT INTO recordes_pessoais (aluno_id, exercicio_id, peso, reps, historico_id)
      VALUES (v_aluno_id, v_exercicio_id, v_peso, v_reps, p_historico_id)
      ON CONFLICT (aluno_id, exercicio_id, reps)
      DO UPDATE SET
        peso = EXCLUDED.peso,
        historico_id = EXCLUDED.historico_id,
        conquistado_em = NOW();

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.detectar_prs_da_sessao(UUID) TO authenticated;

-- Trigger automática (dispara em INSERT E UPDATE — porque o app pode
-- atualizar dados_sessao depois do insert inicial conforme aluno completa)
CREATE OR REPLACE FUNCTION public.trg_detectar_prs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só rodar se dados_sessao mudou (otimização)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.dados_sessao IS DISTINCT FROM OLD.dados_sessao) THEN
    PERFORM detectar_prs_da_sessao(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_historico_treino_modificado ON historico_treinos;
CREATE TRIGGER on_historico_treino_modificado
  AFTER INSERT OR UPDATE OF dados_sessao ON historico_treinos
  FOR EACH ROW EXECUTE FUNCTION trg_detectar_prs();
```

**Backfill de PRs históricos** (rodar UMA VEZ após criar a função):

```sql
SELECT id, detectar_prs_da_sessao(id) AS prs_detectados
FROM historico_treinos
ORDER BY data_conclusao ASC;
```

> Como o discovery mostrou que TODOS os 5 registros atuais têm `completado: false` e `peso_atual: 0`, esse backfill provavelmente vai retornar 0 PRs. Isso é correto — significa que ninguém completou treino com peso real ainda (ou os pesos vão pra outra tabela; verificar com Query A).

**Rollback do bloco E:**
```sql
DROP TRIGGER IF EXISTS on_historico_treino_modificado ON historico_treinos;
DROP FUNCTION IF EXISTS public.trg_detectar_prs();
DROP FUNCTION IF EXISTS public.detectar_prs_da_sessao(UUID);
```

### 6.3 Bloco F — Peso anterior (REUTILIZAR `get_ultimo_treino_exercicio` existente)

> ✅ **Discovery confirmou:** a função `get_ultimo_treino_exercicio(p_aluno_id, p_exercicio_id)` já existe no banco e retorna o `dados_sessao` completo da última execução. **NÃO criar `get_serie_anterior` competidora.**

**Como usar no front (Server Component):**

```typescript
// Para um exercício específico, buscar a última sessão completa
const { data: ultimaSessao } = await supabase
  .rpc('get_ultimo_treino_exercicio', {
    p_aluno_id: user.id,
    p_exercicio_id: exerciseId,
  });

// data é o JSONB inteiro (ou {} se nunca treinou esse exercício)
// Estrutura: { series: [{ ordem, peso_atual, reps, completado, ... }], ... }

// Para mostrar a "série anterior N" (peso da série de mesma ordem na última sessão):
function getSerieAnterior(ultimaSessao: DadosSessao | null, ordemSerie: number) {
  if (!ultimaSessao?.series) return null;
  const serie = ultimaSessao.series.find(
    s => s.ordem === ordemSerie && s.completado && s.peso_atual > 0
  );
  if (!serie) return null;
  return {
    peso: serie.peso_atual,
    reps: Number(serie.reps),
  };
}
```

**Componente `PreviousSetIndicator` consome assim:**

```tsx
// components/treinos/PreviousSetIndicator.tsx (já no COMPONENTS-STARTER)
// Recebe { peso, reps } | null e renderiza "—" ou "80kg × 12"
const anterior = getSerieAnterior(ultimaSessao, ordem);
return <PreviousSetIndicator anterior={anterior} />;
```

**Por que NÃO criar uma função SQL específica para "série N anterior":**

1. Performance: `get_ultimo_treino_exercicio` já carrega o JSONB inteiro em uma query. Filtrar a série N no SQL exigiria nova chamada se a próxima série for da mesma sessão.
2. Cache: o front pode reutilizar o JSONB para todas as séries do exercício (4 séries → 1 fetch).
3. Reuso: o mesmo JSONB serve para outros casos (ex: mostrar última técnica usada, peso médio da última sessão).

---

## 7. SPRINT 3 — Dashboard

### 7.1 Bloco G0 — View base `v_historico_validos`

> View defensiva que filtra `historico_treinos` para sessões com pelo menos 1 série `completado=true` E `peso_atual > 0`. Resolve o problema dos templates com tudo zerado descobertos no discovery.
>
> **Esta view é dependência de:**
> - `v_streak_aluno` (Sprint 3)
> - `get_kpis_aluno` (Sprint 3)
> - `v_atletas_ativos_semana` (Sprint 6)
> - `recalcular_pontos_aluno` (Sprint 6)
>
> Por isso ela é criada PRIMEIRO no Sprint 3.

```sql
CREATE OR REPLACE VIEW public.v_historico_validos AS
SELECT h.*
FROM historico_treinos h
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(COALESCE(h.dados_sessao->'series', '[]'::jsonb)) AS s
  WHERE COALESCE((s->>'completado')::BOOLEAN, false) = true
    AND COALESCE(NULLIF(s->>'peso_atual','')::NUMERIC, 0) > 0
);

GRANT SELECT ON v_historico_validos TO authenticated;
```

> **Performance:** se a tabela crescer muito (>50k linhas), considerar índice expression em `dados_sessao` ou materializar via coluna gerada. Por ora, a view literal é suficiente.

### 7.2 Bloco G — View de streak

```sql
CREATE OR REPLACE VIEW public.v_streak_aluno AS
WITH dias_treino AS (
  SELECT DISTINCT
    aluno_id,
    DATE(data_conclusao) AS dia
  FROM v_historico_validos  -- só sessões com pelo menos 1 série válida
),
gaps AS (
  SELECT
    aluno_id,
    dia,
    dia - INTERVAL '1 day' * (
      ROW_NUMBER() OVER (PARTITION BY aluno_id ORDER BY dia DESC)
    ) AS grupo
  FROM dias_treino
)
SELECT
  aluno_id,
  COUNT(*)::INTEGER AS streak_atual
FROM gaps
WHERE grupo = (
  SELECT MAX(grupo) FROM gaps g2
  WHERE g2.aluno_id = gaps.aluno_id
    AND g2.dia >= CURRENT_DATE - INTERVAL '2 days'
)
GROUP BY aluno_id;

GRANT SELECT ON v_streak_aluno TO authenticated;
```

### 7.3 Bloco H — KPIs do dashboard

```sql
CREATE OR REPLACE FUNCTION public.get_kpis_aluno(p_aluno_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_volume_semana          NUMERIC := 0;
  v_volume_semana_anterior NUMERIC := 0;
  v_peso_atual             NUMERIC;
  v_peso_30d               NUMERIC;
  v_treinos_mes            INTEGER;
  v_treinos_mes_anterior   INTEGER;
  v_streak                 INTEGER;
BEGIN
  -- Volume da semana atual (só séries completadas com peso > 0)
  SELECT COALESCE(SUM(
    (SELECT COALESCE(SUM(
      NULLIF(serie->>'peso_atual','')::NUMERIC
      * (CASE
           WHEN jsonb_typeof(serie->'reps') = 'number'
             THEN (serie->>'reps')::NUMERIC
           ELSE NULLIF(serie->>'reps','')::NUMERIC
         END)
    ), 0)
    FROM jsonb_array_elements(COALESCE(h.dados_sessao->'series','[]'::jsonb)) AS serie
    WHERE COALESCE((serie->>'completado')::BOOLEAN, false) = true
      AND COALESCE(NULLIF(serie->>'peso_atual','')::NUMERIC, 0) > 0)
  ), 0) INTO v_volume_semana
  FROM historico_treinos h
  WHERE h.aluno_id = p_aluno_id
    AND h.data_conclusao >= date_trunc('week', NOW());

  -- Volume da semana anterior (mesmo filtro)
  SELECT COALESCE(SUM(
    (SELECT COALESCE(SUM(
      NULLIF(serie->>'peso_atual','')::NUMERIC
      * (CASE
           WHEN jsonb_typeof(serie->'reps') = 'number'
             THEN (serie->>'reps')::NUMERIC
           ELSE NULLIF(serie->>'reps','')::NUMERIC
         END)
    ), 0)
    FROM jsonb_array_elements(COALESCE(h.dados_sessao->'series','[]'::jsonb)) AS serie
    WHERE COALESCE((serie->>'completado')::BOOLEAN, false) = true
      AND COALESCE(NULLIF(serie->>'peso_atual','')::NUMERIC, 0) > 0)
  ), 0) INTO v_volume_semana_anterior
  FROM historico_treinos h
  WHERE h.aluno_id = p_aluno_id
    AND h.data_conclusao >= date_trunc('week', NOW() - INTERVAL '1 week')
    AND h.data_conclusao <  date_trunc('week', NOW());

  -- Peso atual (última medida com peso preenchido)
  SELECT peso INTO v_peso_atual
  FROM medidas_aluno
  WHERE aluno_id = p_aluno_id AND peso IS NOT NULL
  ORDER BY data_medicao DESC LIMIT 1;

  -- Peso há ~30 dias
  SELECT peso INTO v_peso_30d
  FROM medidas_aluno
  WHERE aluno_id = p_aluno_id
    AND peso IS NOT NULL
    AND data_medicao <= NOW() - INTERVAL '30 days'
  ORDER BY data_medicao DESC LIMIT 1;

  -- Treinos no mês atual / anterior — só sessões válidas (v_historico_validos)
  SELECT COUNT(*)::INTEGER INTO v_treinos_mes
  FROM v_historico_validos
  WHERE aluno_id = p_aluno_id
    AND data_conclusao >= date_trunc('month', NOW());

  SELECT COUNT(*)::INTEGER INTO v_treinos_mes_anterior
  FROM v_historico_validos
  WHERE aluno_id = p_aluno_id
    AND data_conclusao >= date_trunc('month', NOW() - INTERVAL '1 month')
    AND data_conclusao <  date_trunc('month', NOW());

  -- Streak
  SELECT streak_atual INTO v_streak
  FROM v_streak_aluno
  WHERE aluno_id = p_aluno_id;

  RETURN jsonb_build_object(
    'volume_semana_kg',  ROUND(v_volume_semana::NUMERIC, 1),
    'volume_delta_pct',  CASE
      WHEN v_volume_semana_anterior > 0
      THEN ROUND(((v_volume_semana - v_volume_semana_anterior) / v_volume_semana_anterior * 100)::NUMERIC, 1)
      ELSE NULL
    END,
    'peso_atual_kg',     v_peso_atual,
    'peso_delta_kg',     CASE
      WHEN v_peso_30d IS NOT NULL AND v_peso_atual IS NOT NULL
      THEN ROUND((v_peso_atual - v_peso_30d)::NUMERIC, 1)
      ELSE NULL
    END,
    'treinos_mes',       v_treinos_mes,
    'treinos_delta',     v_treinos_mes - v_treinos_mes_anterior,
    'streak_atual',      COALESCE(v_streak, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_kpis_aluno(UUID) TO authenticated;
```

**Rollback:**
```sql
DROP FUNCTION IF EXISTS public.get_kpis_aluno(UUID);
DROP VIEW IF EXISTS public.v_streak_aluno;
```

---

## 8. SPRINT 4 — Nutrição estruturada

### 8.1 Bloco I — Tabelas novas

```sql
BEGIN;

CREATE TABLE public.refeicoes_plano (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id          UUID NOT NULL REFERENCES plano_alimentar_pdf(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  horario_sugerido  TIME,
  ordem             INTEGER NOT NULL DEFAULT 0,
  ingredientes      JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes       TEXT,
  criado_em         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refeicoes_plano ON refeicoes_plano(plano_id, ordem);

CREATE TABLE public.consumos_refeicao (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id      UUID NOT NULL REFERENCES profiles(id),
  refeicao_id   UUID NOT NULL REFERENCES refeicoes_plano(id) ON DELETE CASCADE,
  data_consumo  DATE NOT NULL DEFAULT CURRENT_DATE,
  consumido_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  foto_url      TEXT,
  observacoes   TEXT,
  UNIQUE (aluno_id, refeicao_id, data_consumo)
);

CREATE INDEX idx_consumos_aluno_data ON consumos_refeicao(aluno_id, data_consumo DESC);

CREATE TABLE public.registros_agua (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES profiles(id),
  data_registro   DATE NOT NULL DEFAULT CURRENT_DATE,
  copos           INTEGER NOT NULL DEFAULT 0 CHECK (copos BETWEEN 0 AND 20),
  ml_por_copo     INTEGER NOT NULL DEFAULT 250,
  atualizado_em   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (aluno_id, data_registro)
);

CREATE INDEX idx_agua_aluno_data ON registros_agua(aluno_id, data_registro DESC);

-- RLS
ALTER TABLE refeicoes_plano   ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumos_refeicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_agua    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alunos_leem_refeicoes_proprio_plano"
  ON refeicoes_plano FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plano_alimentar_pdf p
      WHERE p.id = refeicoes_plano.plano_id
        AND (p.aluno_id = auth.uid() OR p.coach_id = auth.uid())
    )
  );

CREATE POLICY "coaches_gerenciam_refeicoes"
  ON refeicoes_plano FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM plano_alimentar_pdf p
      WHERE p.id = refeicoes_plano.plano_id AND p.coach_id = auth.uid()
    )
  );

CREATE POLICY "alunos_gerenciam_proprios_consumos"
  ON consumos_refeicao FOR ALL
  USING (auth.uid() = aluno_id)
  WITH CHECK (auth.uid() = aluno_id);

CREATE POLICY "alunos_gerenciam_proprios_agua"
  ON registros_agua FOR ALL
  USING (auth.uid() = aluno_id)
  WITH CHECK (auth.uid() = aluno_id);

COMMIT;
```

**Rollback:**
```sql
DROP TABLE IF EXISTS public.consumos_refeicao;
DROP TABLE IF EXISTS public.registros_agua;
DROP TABLE IF EXISTS public.refeicoes_plano;
```

---

## 9. SPRINT 5 — Preferências do usuário

### 9.1 Bloco J — Adicionar colunas em profiles

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS height_cm                SMALLINT
    CHECK (height_cm IS NULL OR height_cm BETWEEN 100 AND 250),
  ADD COLUMN IF NOT EXISTS sexo                     TEXT
    CHECK (sexo IS NULL OR sexo IN ('masculino','feminino','outro')),
  ADD COLUMN IF NOT EXISTS objetivo                 TEXT
    CHECK (objetivo IS NULL OR objetivo IN ('cutting','bulking','manutencao','recomposicao')),
  ADD COLUMN IF NOT EXISTS unidade_peso             TEXT NOT NULL DEFAULT 'kg'
    CHECK (unidade_peso IN ('kg','lb')),
  ADD COLUMN IF NOT EXISTS unidade_medida           TEXT NOT NULL DEFAULT 'cm'
    CHECK (unidade_medida IN ('cm','in')),
  ADD COLUMN IF NOT EXISTS incremento_peso_padrao   NUMERIC(4,2) NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS oculto_no_ranking        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notificacoes_ativas      BOOLEAN NOT NULL DEFAULT TRUE;
```

**Rollback:**
```sql
ALTER TABLE profiles
  DROP COLUMN IF EXISTS height_cm,
  DROP COLUMN IF EXISTS sexo,
  DROP COLUMN IF EXISTS objetivo,
  DROP COLUMN IF EXISTS unidade_peso,
  DROP COLUMN IF EXISTS unidade_medida,
  DROP COLUMN IF EXISTS incremento_peso_padrao,
  DROP COLUMN IF EXISTS oculto_no_ranking,
  DROP COLUMN IF EXISTS notificacoes_ativas;
```

---

## 10. SPRINT 6 — Pontuação e Ranking

> ✅ **Discovery confirmou:** o banco tem 3 funções de pontuação que só consideram `treinos_manuais`:
> - `atualizar_pontos_treino` — trigger BEFORE em `treinos_manuais`, calcula `pontos_earn` da row
> - `calcular_pontos_treino(p_tipo, p_duracao_minutos)` — função pura, regras: musculação=20, cardio=10/20/30 por duração
> - `consolidar_pontos_aluno()` — trigger em `treinos_manuais`, faz UPSERT em `pontuacao_alunos` somando `pontos_earn` de treinos_manuais concluídos
>
> **Decisão arquitetural:** REESCREVER `consolidar_pontos_aluno()` mantendo a interface (continua sendo trigger em `treinos_manuais`), mas agora soma de TODAS as fontes. Triggers idênticas em outras tabelas chamam a mesma função.
>
> **Não tocar** em `atualizar_pontos_treino` e `calcular_pontos_treino` — continuam preenchendo `pontos_earn` em `treinos_manuais` como sempre fizeram.

### 10.1 Sistema de pontuação (decisão fechada)

| Fonte | Pontos por evento |
|---|---|
| Treino manual (musculação) | 20 (vem de `calcular_pontos_treino`) |
| Treino manual (cardio 10-19min) | 10 (idem) |
| Treino manual (cardio 20-49min) | 20 (idem) |
| Treino manual (cardio 50+min) | 30 (idem) |
| Treino real concluído (`v_historico_validos`) | 20 |
| PR (recordes_pessoais) | 10 |
| Medida registrada (medidas_aluno) | 3 |
| Foto de evolução (fotos_evolucao) | 5 |

### 10.2 Bloco K — View base `v_historico_validos` (REUTILIZAR)

> ✅ Esta view já foi criada no Sprint 3 (§7.1). Sprint 6 só **depende** dela. Não recriar.
>
> Se você está aplicando o Sprint 6 SEM ter aplicado o Sprint 3 ainda, copie e rode primeiro o bloco G0 da §7.1 antes de prosseguir.

### 10.3 Bloco L — Função pública `recalcular_pontos_aluno`

> Wrapper chamável manualmente (para backfill e debugging). A trigger reescrita chama essa.

```sql
CREATE OR REPLACE FUNCTION public.recalcular_pontos_aluno(p_aluno_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  IF p_aluno_id IS NULL THEN RETURN 0; END IF;

  SELECT
    -- 1. Treinos manuais concluídos (mantém scoring pre-existente: 10/20/30)
    COALESCE((SELECT SUM(pontos_earn) FROM treinos_manuais
              WHERE aluno_id = p_aluno_id AND concluido = true), 0)
    -- 2. Treinos pela tela de execução (20 pts cada — só sessões válidas)
    + COALESCE((SELECT COUNT(*) * 20 FROM v_historico_validos
                WHERE aluno_id = p_aluno_id), 0)
    -- 3. Recordes pessoais (10 pts cada)
    + COALESCE((SELECT COUNT(*) * 10 FROM recordes_pessoais
                WHERE aluno_id = p_aluno_id), 0)
    -- 4. Medidas registradas (3 pts cada)
    + COALESCE((SELECT COUNT(*) * 3 FROM medidas_aluno
                WHERE aluno_id = p_aluno_id), 0)
    -- 5. Fotos de evolução (5 pts cada)
    + COALESCE((SELECT COUNT(*) * 5 FROM fotos_evolucao
                WHERE aluno_id = p_aluno_id), 0)
  INTO v_total;

  INSERT INTO pontuacao_alunos (aluno_id, total_pontos, atualizado_em)
  VALUES (p_aluno_id, v_total, NOW())
  ON CONFLICT (aluno_id) DO UPDATE SET
    total_pontos = EXCLUDED.total_pontos,
    atualizado_em = NOW();

  RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalcular_pontos_aluno(UUID) TO authenticated;
```

### 10.4 Bloco M — Reescrever `consolidar_pontos_aluno()` (trigger function)

> Mantém a INTERFACE (continua sendo trigger function), mas agora chama `recalcular_pontos_aluno()` que soma de todas as fontes. A trigger existente em `treinos_manuais` continua disparando — sem mudança no código do app.

```sql
CREATE OR REPLACE FUNCTION public.consolidar_pontos_aluno()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aluno_id UUID := COALESCE(NEW.aluno_id, OLD.aluno_id);
BEGIN
  IF v_aluno_id IS NOT NULL THEN
    PERFORM recalcular_pontos_aluno(v_aluno_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

### 10.5 Bloco N — Triggers em outras fontes de pontos

```sql
-- Treinos da tela de execução
DROP TRIGGER IF EXISTS trg_pontos_historico ON historico_treinos;
CREATE TRIGGER trg_pontos_historico
  AFTER INSERT OR UPDATE OF dados_sessao OR DELETE ON historico_treinos
  FOR EACH ROW EXECUTE FUNCTION consolidar_pontos_aluno();

-- Recordes pessoais
DROP TRIGGER IF EXISTS trg_pontos_recordes ON recordes_pessoais;
CREATE TRIGGER trg_pontos_recordes
  AFTER INSERT OR DELETE ON recordes_pessoais
  FOR EACH ROW EXECUTE FUNCTION consolidar_pontos_aluno();

-- Medidas
DROP TRIGGER IF EXISTS trg_pontos_medidas ON medidas_aluno;
CREATE TRIGGER trg_pontos_medidas
  AFTER INSERT OR DELETE ON medidas_aluno
  FOR EACH ROW EXECUTE FUNCTION consolidar_pontos_aluno();

-- Fotos de evolução
DROP TRIGGER IF EXISTS trg_pontos_fotos ON fotos_evolucao;
CREATE TRIGGER trg_pontos_fotos
  AFTER INSERT OR DELETE ON fotos_evolucao
  FOR EACH ROW EXECUTE FUNCTION consolidar_pontos_aluno();
```

### 10.6 Bloco O — Views de leaderboard

```sql
CREATE OR REPLACE VIEW public.v_leaderboard AS
SELECT
  p.id AS aluno_id,
  p.full_name,
  p.avatar_url,
  COALESCE(pa.total_pontos, 0) AS pontos,
  COALESCE(s.streak_atual, 0) AS streak,
  ROW_NUMBER() OVER (ORDER BY COALESCE(pa.total_pontos, 0) DESC) AS posicao
FROM profiles p
LEFT JOIN pontuacao_alunos pa ON pa.aluno_id = p.id
LEFT JOIN v_streak_aluno   s  ON s.aluno_id  = p.id
WHERE p.role = 'aluno'
  AND COALESCE(p.arquivado, false) = false
  AND COALESCE(p.oculto_no_ranking, false) = false;

GRANT SELECT ON v_leaderboard TO authenticated;

-- Conta aluno se ele teve PELO MENOS UMA sessão válida na semana
CREATE OR REPLACE VIEW public.v_atletas_ativos_semana AS
SELECT COUNT(DISTINCT aluno_id)::INTEGER AS quantidade
FROM v_historico_validos
WHERE data_conclusao >= date_trunc('week', NOW());

GRANT SELECT ON v_atletas_ativos_semana TO authenticated;
```

### 10.7 Backfill inicial

```sql
-- Recalcular pontos de todos os alunos uma vez (depois disso, triggers cuidam)
DO $$
DECLARE
  v_id UUID;
BEGIN
  FOR v_id IN SELECT id FROM profiles WHERE role = 'aluno' LOOP
    PERFORM recalcular_pontos_aluno(v_id);
  END LOOP;
END;
$$;
```

### 10.8 `realizar_checkin` — função órfã

> ⚠️ Discovery descobriu que `realizar_checkin()` referencia uma tabela `checkins` que NÃO existe no banco. Qualquer chamada à função atualmente DÁ ERRO silencioso (`relation "checkins" does not exist`).
>
> **AÇÃO ANTES DO SPRINT 6:**
> 1. Faça `grep -r "realizar_checkin" .` no código do app (front + qualquer backend).
> 2. Se NÃO houver chamadas → função é código morto, deixar como está e marcar deprecated em comentário.
> 3. Se HOUVER chamadas → o app está quebrado nesse fluxo agora. Decidir:
>    - Criar tabela `checkins` (manter feature) e dropar a chamada do `INSERT INTO pontuacao_alunos` da função (deixar a trigger consolidar pegar)
>    - OU remover chamada do app e marcar função como deprecated
>
> **NÃO** modificar a função sem antes confirmar onde é chamada.

### 10.9 Rollback Sprint 6

```sql
-- Desfaz triggers novas (mantém a original em treinos_manuais — vinha do banco)
DROP TRIGGER IF EXISTS trg_pontos_historico ON historico_treinos;
DROP TRIGGER IF EXISTS trg_pontos_recordes ON recordes_pessoais;
DROP TRIGGER IF EXISTS trg_pontos_medidas ON medidas_aluno;
DROP TRIGGER IF EXISTS trg_pontos_fotos ON fotos_evolucao;

-- Restaurar consolidar_pontos_aluno antiga (do discovery)
CREATE OR REPLACE FUNCTION public.consolidar_pontos_aluno()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO pontuacao_alunos (aluno_id, total_pontos, atualizado_em)
  SELECT NEW.aluno_id, COALESCE(SUM(pontos_earn), 0), NOW()
  FROM treinos_manuais
  WHERE aluno_id = NEW.aluno_id AND concluido = true
  ON CONFLICT (aluno_id) DO UPDATE SET
    total_pontos = EXCLUDED.total_pontos,
    atualizado_em = NOW();
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.recalcular_pontos_aluno(UUID);
DROP VIEW IF EXISTS public.v_leaderboard;
DROP VIEW IF EXISTS public.v_atletas_ativos_semana;
DROP VIEW IF EXISTS public.v_historico_validos;
```

---

## 11. SPRINT lateral — Auditoria de RLS (RLS já está habilitada)

> **Discovery confirmou: RLS habilitada em TODAS as 18 tabelas.**
> Este sprint deixa de ser "ativar RLS" e vira "corrigir 4 findings de segurança específicos".

### 11.1 Princípio

Para cada finding em §0.1, criar a policy nova **antes** de remover ou alterar a policy antiga, no mesmo `BEGIN/COMMIT`. Sempre testar com SELECT na branch antes de comitar.

### 11.2 Finding A — `fichas_treino` permissiva (🔴 OBRIGATÓRIO — 2-5 coaches confirmados)

A policy `"Coach gere as fichas"` usa `role='coach'` sem checar `coach_alunos`. **Como existem 2-5 coaches, qualquer um deles pode editar ficha de aluno de outro coach.** Aplicar este fix junto do Sprint 0.

```sql
BEGIN;

-- 1) Confirmar que policy correta "ficha_coach_all" já existe e usa coach_alunos
SELECT policyname, qual FROM pg_policies
WHERE tablename = 'fichas_treino' AND policyname = 'ficha_coach_all';
-- Se a query acima não retornar, NÃO PROSSEGUIR — criar primeiro:
-- (a policy via coach_alunos já está no resultado do discovery)

-- 2) Dropar a permissiva
DROP POLICY IF EXISTS "Coach gere as fichas" ON fichas_treino;

-- 3) Validar com SELECT antes de comitar
-- Logado como coach: deve ler apenas fichas dos próprios alunos
-- SET ROLE authenticated; SELECT auth.uid(); SELECT count(*) FROM fichas_treino;

COMMIT;
-- ROLLBACK; em caso de erro
```

**Rollback se quebrar:**
```sql
CREATE POLICY "Coach gere as fichas" ON fichas_treino FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'coach'));
```

### 11.3 Finding B — `medidas_aluno` permissiva (🔴 OBRIGATÓRIO — 2-5 coaches confirmados)

Mesma lógica do Finding A. Existem DUAS policies redundantes que liberam acesso a todas as medidas para qualquer coach.

```sql
BEGIN;

-- 1) Criar policy correta via coach_alunos
CREATE POLICY "medidas_coach_apenas_proprios_alunos"
  ON medidas_aluno FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
        AND coach_alunos.aluno_id = medidas_aluno.aluno_id
    )
  );

-- 2) Dropar AS DUAS permissivas redundantes
DROP POLICY IF EXISTS "Coaches podem ver as medidas de todos os alunos" ON medidas_aluno;
DROP POLICY IF EXISTS "Coaches veem todas as medidas" ON medidas_aluno;

-- 3) Verificar policies restantes (todas devem ser específicas por aluno)
SELECT policyname, cmd, qual FROM pg_policies
WHERE tablename = 'medidas_aluno' ORDER BY policyname;

COMMIT;
```

**Rollback se quebrar:**
```sql
CREATE POLICY "Coaches veem todas as medidas" ON medidas_aluno FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role = ANY (ARRAY['coach'::text, 'super_admin'::text])));
DROP POLICY IF EXISTS "medidas_coach_apenas_proprios_alunos" ON medidas_aluno;
```

### 11.4 Finding C — `plano_alimentar_audit` SEM policies

```sql
BEGIN;

-- Coach insere registro de auditoria ao acessar PDF de seu aluno
CREATE POLICY "audit_coach_insere"
  ON plano_alimentar_audit FOR INSERT
  WITH CHECK (
    acessado_por = auth.uid()
    AND EXISTS (
      SELECT 1 FROM plano_alimentar_pdf p
      WHERE p.id = plano_alimentar_audit.plano_id
        AND p.coach_id = auth.uid()
    )
  );

-- Coach lê auditoria dos PDFs que ele subiu
CREATE POLICY "audit_coach_le_proprios"
  ON plano_alimentar_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plano_alimentar_pdf p
      WHERE p.id = plano_alimentar_audit.plano_id
        AND p.coach_id = auth.uid()
    )
  );

-- Aluno lê auditoria dos próprios planos
CREATE POLICY "audit_aluno_le_proprio"
  ON plano_alimentar_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plano_alimentar_pdf p
      WHERE p.id = plano_alimentar_audit.plano_id
        AND p.aluno_id = auth.uid()
    )
  );

-- Super admin vê tudo
CREATE POLICY "audit_super_admin"
  ON plano_alimentar_audit FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

COMMIT;
```

### 11.5 Finding D — `profiles` com `USING true` (CRÍTICO)

A policy `"authenticated_can_read_profiles"` deixa qualquer autenticado ler perfil completo de qualquer outro (email, status_pagamento, valor_plano, etc.). Provavelmente foi adicionada para o ranking funcionar, mas é exagerada.

**Solução:** o ranking deve consumir **apenas** a view `v_leaderboard` (criada no Sprint 6), que expõe só `aluno_id`, `full_name`, `avatar_url`, `pontos`, `streak`, `posicao`. Aí podemos remover a policy permissiva.

> **NÃO RODAR ESTE BLOCO** sem antes validar que o app não depende da policy `"authenticated_can_read_profiles"` para outros casos além do ranking.

```sql
-- 1) PRIMEIRO: criar v_leaderboard (Sprint 6) e migrar o front para usar ela
-- 2) SÓ DEPOIS: rodar o bloco abaixo

BEGIN;

-- Garantir que aluno consegue ler PRÓPRIO perfil completo
-- (já existe "profiles_select_own", confirmar antes)
-- SELECT * FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_select_own';

-- Remover a permissiva
DROP POLICY IF EXISTS "authenticated_can_read_profiles" ON profiles;

-- Garantir SELECT específico para coach (já existe "Coaches veem perfis dos alunos")

COMMIT;
```

> Se app local quebra após esse drop, rollback imediato e identificar onde tem leitura cruzada de perfil.

### 11.6 Limpeza opcional de policies redundantes

O discovery mostrou várias policies duplicadas (3 SELECTs em `agenda_semanal`, 2 INSERTs em `medidas_aluno`, 9 policies em `fichas_treino`, etc.). Não é bug — é dívida técnica. Não precisa limpar agora; deixar como tarefa de manutenção futura.

---

## 12. Schema JSON canônico para `dados_sessao` e `configuracao`

Toda função e front que toca esses JSONBs assume os formatos abaixo.

### 12.1 `historico_treinos.dados_sessao` — formato REAL (descoberto via discovery)

> ⚠️ Este é o formato real usado pelo app hoje (Query B do discovery). Funções devem usar **estes nomes** de campo, não os do MIGRATION-PLAN original.

```json
{
  "series": [
    {
      "ordem": 1,
      "reps": "12",
      "tecnica": "FS",
      "peso_atual": 80.0,
      "completado": true,
      "anterior": "—"
    },
    {
      "ordem": 2,
      "reps": "10",
      "tecnica": "WS",
      "peso_atual": 82.5,
      "completado": true,
      "anterior": "—"
    }
  ],
  "data_sessao": "2026-04-28T22:59:05.294Z",
  "nome_rotina": "Upper",
  "nome_exercicio": "Rosca scott maquina"
}
```

**Características importantes:**

- **`reps` vem como STRING ou INTEGER** (inconsistente). Sempre fazer cast: `NULLIF(serie->>'reps','')::INTEGER`.
- **`peso_atual: 0`** significa "não preenchido" (não "exercício de peso corporal"). Filtrar por `peso_atual > 0` ao calcular volume.
- **`completado: false`** = série não foi feita. Funções de PR e KPI devem ignorar séries com `completado = false`.
- **`anterior: "—"`** é placeholder visual gerado pelo front. **NÃO USAR** para calcular peso anterior — buscar no banco com a função `get_ultimo_treino_exercicio()` ou equivalente.
- **`nome_rotina` e `nome_exercicio` denormalizados** dentro do JSONB. `exercicio_id` real está na coluna da tabela. Não duplicar em queries.
- **Não existem campos** para `tempo_descanso_segundos`, `tempo_total_segundos`, `humor_pos_treino`, `observacoes`. Se quiser adicionar no futuro, é extensão — nunca forçar leitura desses campos sem `COALESCE`.

**Técnicas (campo `tecnica`):**

> A documentar conforme confirmação do coach. Valores observados no banco: `"FS"`, `"WS"`, `"TS"`.

### 12.2 Validação no client (Zod) — formato REAL

```typescript
// lib/validation/historico-treino.ts
import { z } from 'zod';

export const SerieSchema = z.object({
  ordem: z.number().int().min(1).max(20),
  // reps pode vir como string ou number do banco — preprocess para number
  reps: z.preprocess(
    (v) => (typeof v === 'string' ? parseInt(v, 10) || 0 : v),
    z.number().int().min(0).max(100)
  ),
  tecnica: z.string().nullable().optional(),  // "FS" | "WS" | "TS" | null
  peso_atual: z.number().min(0).max(1000),
  completado: z.boolean().default(false),
  anterior: z.string().optional(),  // placeholder visual, ignorar
});

export const DadosSessaoSchema = z.object({
  series: z.array(SerieSchema),
  data_sessao: z.string().datetime(),
  nome_rotina: z.string(),
  nome_exercicio: z.string(),
});

export type Serie = z.infer<typeof SerieSchema>;
export type DadosSessao = z.infer<typeof DadosSessaoSchema>;
```

### 12.3 `fichas_treino.configuracao`

```json
{
  "tipo": "A/B/C",
  "treinos": [
    {
      "letra": "A",
      "nome": "Upper",
      "exercicios": [
        {
          "exercicio_id": "uuid-do-exercicio",
          "ordem": 1,
          "series_alvo": 4,
          "reps_min": 8,
          "reps_max": 10,
          "descanso_segundos": 90,
          "tecnica": "FS",
          "observacoes": ""
        }
      ]
    }
  ]
}
```

> **Importante:** se as fichas atuais não seguem esses formatos, validar com a query 2.5 do discovery e adaptar gradualmente (ex: criar função utilitária no front para normalizar fichas antigas no momento da leitura).

---

## 13. Storage policies (fotos sensíveis)

Buckets reais identificados no discovery:
- `parceiros-logos`
- **`evolucao-fotos`** ← bucket de fotos de evolução
- `plano alimentar` (com espaço — atenção)
- `treinos-pdf`
- `avatars`

```sql
-- 1) Confirmar status público/privado dos buckets
SELECT id, name, public FROM storage.buckets;

-- 2) Tornar privado o bucket de fotos de evolução (sensível)
UPDATE storage.buckets SET public = false WHERE id = 'evolucao-fotos';

-- 3) Mesmo para plano alimentar e treinos-pdf
UPDATE storage.buckets SET public = false WHERE id = 'plano alimentar';
UPDATE storage.buckets SET public = false WHERE id = 'treinos-pdf';
```

Antes de criar policies, **verificar a convenção de path real** dos arquivos:

```sql
SELECT bucket_id, name FROM storage.objects
WHERE bucket_id = 'evolucao-fotos'
ORDER BY created_at DESC
LIMIT 5;
```

Se o path for `{aluno_id}/...`, as policies abaixo funcionam. Se for outro formato, ajustar a expressão:

```sql
-- Convenção esperada: evolucao-fotos/{aluno_id}/{angulo}-{timestamp}.jpg

CREATE POLICY "evolucao_fotos_aluno_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'evolucao-fotos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "evolucao_fotos_aluno_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'evolucao-fotos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "evolucao_fotos_coach_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'evolucao-fotos'
    AND EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_id = auth.uid()
        AND aluno_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "evolucao_fotos_aluno_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'evolucao-fotos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

Replicar o padrão para `plano alimentar` (atenção ao espaço — usar aspas duplas se necessário) e `treinos-pdf`. Para `avatars`, normalmente public = true é OK (são imagens de perfil). Para `parceiros-logos`, também pode ser public.

> Se a convenção atual de path NÃO for `{aluno_id}/...`, **não rode estas policies** — elas vão bloquear acesso a fotos existentes. Migre os paths primeiro (script de rename) ou ajuste a expressão da policy ao formato real.

---

## 14. Limpeza posterior (depois de ≥3 meses sem incidente)

Só fazer **depois** de comprovar que nada usa essas tabelas:

```sql
-- Confirmar zero linhas inseridas há ≥90 dias:
SELECT 'logs_treino' AS tab, MAX(data_conclusao) AS ultima_inserção FROM logs_treino
UNION ALL
SELECT 'registros_treino', MAX(data_registro) FROM registros_treino;

-- Se vazias ou há muito tempo sem inserção, drop:
DROP TABLE IF EXISTS public.logs_treino;
DROP TABLE IF EXISTS public.registros_treino;
DROP TABLE IF EXISTS public.temp_id_mapping;  -- esse pode dropar agora, é leftover
```

---

## 15. Ordem operacional resumida

```
SEMANA 1
├─ Dia 1: Discovery (§2) + Backup (§3) + Branch (§4)
├─ Dia 2: Sprint 0 na branch — testar app local
└─ Dia 3-4: Sprint 0 em produção (manutenção) + validação

SEMANA 2
└─ Sprint 1 — front puro, sem mudança no banco

SEMANA 3-4
├─ Sprint 2 — DDL + front da tela de execução
└─ RLS de tabelas críticas (medidas, historico, fotos)

SEMANA 5
└─ Sprint 3 — views/funções de KPI + dashboard

SEMANA 6-7
└─ Sprint 4 — nutrição estruturada

SEMANA 8
└─ Sprint 5 — colunas de preferência + perfil

SEMANA 9
└─ Sprint 6 — pontuação + ranking

QUARTER seguinte
└─ RLS das tabelas restantes + drop de tabelas órfãs (§14)
```

---

## 16. Princípios de execução

1. **Toda DDL roda em branch primeiro.** Sem exceção.
2. **Todo ALTER TABLE em produção é precedido de SELECT de validação.** Ex: antes de `ALTER TABLE ... DROP COLUMN x`, rodar `SELECT COUNT(*) FROM ... WHERE x IS NOT NULL`.
3. **Toda função/trigger nova usa `SET search_path = public`.** Sem isso, vulnerabilidade de search_path injection.
4. **Toda RLS é aplicada com policies prontas no mesmo BEGIN/COMMIT.** Ver §11.1.
5. **Backup antes de cada Sprint.** Mesmo pequeno. Tempo barato, perda de dado é caro.
6. **Janela de manutenção** para sprints 0, 2, 6 (mudanças que afetam queries em uso).
7. **Comunicar usuários ativos** antes de manutenção: "App em manutenção das 03:00 às 04:00 — sem perda de dados".

---

## 17. O que NÃO fazer

- ❌ Rodar tudo de uma vez.
- ❌ Habilitar RLS sem criar policies no mesmo transaction.
- ❌ `DROP TABLE` antes de 90 dias sem inserção comprovados.
- ❌ Adicionar `CHECK` constraint sem `NOT VALID` em tabela com dados.
- ❌ `ALTER COLUMN ... TYPE` em coluna com dados sem testar tamanho.
- ❌ Criar trigger sem testar com `INSERT` de exemplo na branch.
- ❌ Confiar que "deve dar certo" sem rodar na branch antes.
