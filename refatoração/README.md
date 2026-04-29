# Pacote de Redesign · SaaS Fitness Personal

> **Stack confirmada:** Next.js (App Router) + React + Supabase
> **Schema atual:** mapeado e auditado. RLS já habilitada. Funções existentes identificadas.
> **Pacote de 7 arquivos** para Claude Code consumir no VSCode.

---

## ⚠️ Leia primeiro

1. **`INSTRUCOES-CLAUDE-CODE.md`** é o guia operacional. Cada sprint tem um prompt pronto para colar no Claude Code.
2. **`MIGRATION-PLAN.md`** é a referência técnica do banco — tem TODO o DDL, com rollback, em ordem.
3. **`DESIGN-SPEC.md`** é o documento mestre de UI/UX (princípios, tokens, refatoração tela a tela, copy).

**Não rode nenhum SQL fora da ordem do MIGRATION-PLAN. Não pule a Branch do Supabase.**

---

## 📁 Arquivos do pacote

| Arquivo | O que é | Quando usar |
|---|---|---|
| **`README.md`** | Este arquivo. Visão geral. | Sempre primeiro. |
| **`INSTRUCOES-CLAUDE-CODE.md`** | Prompts prontos para colar no Claude Code dentro do VSCode, sprint por sprint, com checkpoints e validações. | Operacional, dia a dia. |
| **`DESIGN-SPEC.md`** | Documento mestre de UI/UX (2.150+ linhas). Princípios, tokens, componentes, refatoração tela a tela, copy, microinterações, acessibilidade, LGPD, roadmap, Stack Next.js. | Referência de design. |
| **`MIGRATION-PLAN.md`** | Plano cirúrgico de migração para o seu banco real. DDL pronto sprint por sprint, com rollback e janelas de manutenção. **Findings de segurança no §0.1.** | Toda vez que mexer no Supabase. |
| **`design-tokens.css`** | Variáveis CSS prontas. | Importar em `app/globals.css`. |
| **`tailwind.config.js`** | Config Tailwind com tokens mapeados. | Substituir o config do projeto. |
| **`COMPONENTS-STARTER.tsx`** | 13 componentes React/TS prontos: Button, Card, Input, EmptyState, Skeleton, BottomNav, KpiCard, WeekStreakDots, TodayWorkoutCard, **PreviousSetIndicator**, **RestTimer**, **OutlierWarningDialog**. | Quebrar em arquivos individuais (ver `INSTRUCOES`). |

---

## 🔍 Estado atual do banco (descoberto)

### O que JÁ está OK

- ✅ **RLS habilitada** em todas as 18 tabelas
- ✅ **`handle_new_user()`** trigger criando profiles automaticamente
- ✅ **Funções de pontuação** já existem (`atualizar_pontos_treino`, `calcular_pontos_treino`, `consolidar_pontos_aluno`)
- ✅ **`get_ultimo_treino_exercicio()`** já existe (peso anterior)
- ✅ **`realizar_checkin()`** já existe
- ✅ **5 buckets de Storage:** `parceiros-logos`, `evolucao-fotos`, `plano alimentar`, `treinos-pdf`, `avatars`

### O que precisa atenção (findings de segurança)

| Tabela | Problema | Status |
|---|---|---|
| `fichas_treino` | Policy permissiva — qualquer coach edita ficha de qualquer aluno | 🔴 **OBRIGATÓRIO no Sprint 0** (2-5 coaches confirmados) |
| `medidas_aluno` | Idem — coaches leem medidas de todos | 🔴 **OBRIGATÓRIO no Sprint 0** (2-5 coaches confirmados) |
| `profiles` | `USING true` — qualquer autenticado lê perfil completo de outros | 🔴 Tratamento no Sprint 6 (depois do leaderboard usar v_leaderboard) |
| `plano_alimentar_audit` | Sem nenhuma policy — RLS bloqueia tudo | 🟡 Bug silencioso, tratar quando precisar dessa feature |

→ Tratamento em `MIGRATION-PLAN.md` §11.

### O que precisa ser criado

```
🆕 recordes_pessoais          → tabela de PRs (Sprint 2)
🆕 detectar_prs_da_sessao()   → função + trigger automática (Sprint 2)
🆕 v_streak_aluno             → view de streak (Sprint 3)
🆕 get_kpis_aluno()           → função de KPIs do dashboard (Sprint 3)
🆕 refeicoes_plano            → tabela de refeições (Sprint 4)
🆕 consumos_refeicao          → check-off diário (Sprint 4)
🆕 registros_agua             → tracking água (Sprint 4)
🆕 colunas em profiles        → preferências (Sprint 5)
🆕 v_leaderboard              → view de ranking (Sprint 6)
🆕 v_atletas_ativos_semana    → para tela de Ranking (Sprint 6)
🆕 export_user_data()         → LGPD (Sprint 0)
🆕 delete_user_account()      → LGPD (Sprint 0)
🆕 CHECK constraints          → em medidas_aluno (Sprint 0)
```

---

## 🗺️ Mapeamento: telas ↔ tabelas

| Tela | Tabelas usadas | Sprint |
|---|---|---|
| Dashboard | `historico_treinos`, `medidas_aluno`, `pontuacao_alunos`, `agenda_semanal` | 3 |
| Treinos (lista) | `fichas_treino`, `agenda_semanal`, `historico_treinos`, `treinos_alunos` | — (já existe) |
| Treino em Execução | `historico_treinos` (insert), `recordes_pessoais` (gerada) | 2 |
| Nutrição | `plano_alimentar_pdf`, `refeicoes_plano`, `consumos_refeicao`, `registros_agua` | 4 |
| Medidas | `medidas_aluno` | 0 (CHECK) + 5 (UI) |
| Fotos | `fotos_evolucao` + bucket `evolucao-fotos` | 5 |
| Ranking | `pontuacao_alunos`, `v_leaderboard`, `v_atletas_ativos_semana` | 6 |
| Perfil | `profiles` | 0 (LGPD) + 5 (preferências) |

---

## 🚀 Como começar

### Caminho rápido (você está com pressa)

1. Abre o projeto no VSCode com Claude Code instalado.
2. Coloca todos os arquivos deste pacote na raiz (ou em `docs/`).
3. Cria branch git: `git checkout -b sprint-0-higiene`
4. Cria Branch do Supabase: `supabase branches create staging-redesign`
5. Aponta `.env.local` pra Branch (NUNCA commit `.env.local`).
6. Faz `pg_dump` do banco de produção.
7. Abre o `INSTRUCOES-CLAUDE-CODE.md` e cola o prompt do **Sprint 0**.
8. **Para no checkpoint** que o prompt manda parar.
9. Você cola os SQLs gerados pelo Claude Code no SQL Editor da Branch e roda.
10. Testa no app local. Se OK, roda em produção (manutenção).
11. `git commit` e segue pro Sprint 1.

### Antes do Sprint 2 e do Sprint 6 (não é hoje)

Roda mais 2 queries para inspecionar funções existentes (a query 0.3 do `MIGRATION-PLAN.md`). Cola o resultado no chat do Claude Code antes do prompt — isso evita duplicar funções que já fazem o trabalho.

---

## 🎯 Decisões de produto registradas

| Decisão | Status |
|---|---|
| Stack: Next.js App Router + React + Supabase | ✅ Confirmado |
| Manter nomes em português (medidas_aluno, fichas_treino, etc.) | ✅ Confirmado |
| `historico_treinos` é fonte da verdade · `logs_treino` e `registros_treino` órfãs | ✅ Confirmado |
| `fichas_treino.configuracao` mantido como JSONB | ✅ Confirmado |
| RLS já habilitada — sprint lateral vira auditoria pontual | ✅ Confirmado pelo discovery |
| Medidas absurdas = dados de teste · solução = CHECK + Zod | ✅ Confirmado |
| Bottom nav com 6 itens: Início, Treinos, Nutrição, Progresso, Ranking, Perfil | ✅ Decisão de design |
| Tela de Ranking com 2 estados (SOLO / COMUNIDADE) | ✅ Decisão de design |
| **Reutilizar `get_ultimo_treino_exercicio()`** em vez de criar `get_serie_anterior` | ✅ Confirmado |
| **REESCREVER `consolidar_pontos_aluno()`** para somar de todas as fontes | ✅ Confirmado |
| **`v_historico_validos`** filtra sessões válidas (≥1 série completada com peso>0) | ✅ Defesa contra templates |
| **`realizar_checkin`** marcada como deprecated (tabela checkins não existe) | ✅ Confirmado |
| 2-5 coaches → fixes A e B de RLS são obrigatórios no Sprint 0 | ✅ Confirmado |

---

## 📋 Princípios não-negociáveis

1. **Logar uma série em ≤ 15 segundos.** Acima disso, refatorar.
2. **Peso anterior sempre visível** durante execução (`PreviousSetIndicator` consumindo `get_ultimo_treino_exercicio`).
3. **Nada de CAPS em frases.** Apenas em microlabels ≤2 palavras.
4. **Dourado em ≤ 10% da tela.** CTA primário + métricas-chave.
5. **Empty states educam, nunca prometem futuro.**
6. **Tom adulto, calmo, direto.** Sem "guerreiro", "atleta de elite", "alta performance".
7. **Offline-first** (academia com WiFi ruim).
8. **LGPD obrigatório** (Sprint 0).
9. **Toda DDL passa pela Branch antes da produção.** Sem exceção.
10. **Validação em 2 camadas:** CHECK no Postgres (hard, NOT VALID) + Zod no client (soft warning de outlier).

---

## 🗓️ Roadmap

```
Sprint 0 — Higiene crítica            (3-5 dias)   ← MIGRATION §5
Sprint 1 — Sistema de design           (1 semana)   ← front puro
Sprint 2 — Tela de execução de treino  (2 semanas)  ← MIGRATION §6 (depende de discovery 0.3)
Sprint 3 — Dashboard útil              (1 semana)   ← MIGRATION §7
Sprint 4 — Nutrição estruturada        (1-2 sem.)   ← MIGRATION §8
Sprint 5 — Medidas/Fotos/Perfil        (1-2 sem.)   ← MIGRATION §9
Sprint 6 — Pontuação + Ranking         (1 semana)   ← MIGRATION §10 (depende de discovery 0.3)
Sprint lateral — Auditoria de RLS      (paralelo)   ← MIGRATION §11
                                       ─────────────
                            Total:     ~9 semanas
```

---

## 🆘 O que NÃO fazer

- ❌ Rodar SQL direto em produção sem branch.
- ❌ Criar trigger duplicada de `handle_new_user`.
- ❌ Criar função `calcular_pontos_aluno` por cima das existentes sem inspecionar.
- ❌ Criar função `get_serie_anterior` se `get_ultimo_treino_exercicio` já faz o trabalho.
- ❌ Habilitar RLS em qualquer tabela (já está habilitada — só auditar policies).
- ❌ Adicionar `CHECK` em tabela com dados sem `NOT VALID`.
- ❌ `DROP` em qualquer tabela antes de 90 dias sem uso comprovado.
- ❌ Criar componentes do zero ignorando `COMPONENTS-STARTER.tsx`.
- ❌ Renomear tabelas para inglês.
- ❌ Confundir bucket `evolucao-fotos` com `fotos-evolucao`.

---

## 🎯 Meta final

> O aluno abre o app, treina, sai satisfeito, e quer renovar a mensalidade.
