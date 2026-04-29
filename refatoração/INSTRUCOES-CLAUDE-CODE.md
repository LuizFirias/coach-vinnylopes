# Instruções para Claude Code (VSCode)

> **Este arquivo é o guia operacional.** Cada seção abaixo é um prompt pronto para colar no Claude Code dentro do VSCode. Os documentos `DESIGN-SPEC.md` e `MIGRATION-PLAN.md` já devem estar na raiz do projeto antes de você começar.

---

## Como usar este documento

1. Abra o projeto no VSCode com Claude Code instalado.
2. Garanta que `README.md`, `DESIGN-SPEC.md`, `MIGRATION-PLAN.md`, `COMPONENTS-STARTER.tsx`, `design-tokens.css` e `tailwind.config.js` estão no projeto (raiz ou pasta `docs/`).
3. **Aponte seu `.env.local` para a Branch do Supabase**, NUNCA produção.
4. Cole o prompt do sprint que você está executando.
5. **Em cada checkpoint, pare e revise antes de prosseguir.**

---

## ✋ Checklist antes de começar QUALQUER sprint

```
[ ] Backup do banco feito (pg_dump) e arquivado fora do Supabase
[ ] Branch staging-redesign criada (ou 2º projeto Supabase free)
[ ] .env.local apontado para a branch
[ ] git checkout -b sprint-N (uma branch git por sprint)
[ ] Documentos do pacote estão acessíveis ao Claude Code
```

---

## SPRINT 0 — Higiene crítica (não depende de discovery extra)

> Aplica os blocos A, B e C de `MIGRATION-PLAN.md` §5 + fixes de segurança §11.2 e §11.3.
> Nenhuma dependência das queries 0.3. Pode rodar HOJE.
>
> ⚠️ **Confirmado: 2-5 coaches ativos.** Os fixes de segurança em `fichas_treino` e `medidas_aluno` viram **obrigatórios neste sprint**, não opcionais.

### Prompt para Claude Code

```
Leia os arquivos DESIGN-SPEC.md, MIGRATION-PLAN.md e COMPONENTS-STARTER.tsx 
na raiz do projeto.

Estamos no Sprint 0 — Higiene crítica. Meu .env.local já aponta para a 
Branch do Supabase staging-redesign. Você NÃO vai rodar SQL diretamente — 
vai criar arquivos de migration que eu copio e colo no SQL Editor do 
Supabase.

CONTEXTO IMPORTANTE:
- Stack: Next.js App Router + React + Supabase
- Tabelas em português: medidas_aluno, fichas_treino, historico_treinos, 
  fotos_evolucao, pontuacao_alunos, etc.
- RLS já habilitada em TODAS as 18 tabelas (não habilitar de novo)
- Bucket de fotos é "evolucao-fotos" (com hífen, na ordem evolucao-fotos)
- Função handle_new_user() já cria profile automaticamente — não duplicar
- Existem 2-5 coaches ativos — fixes de segurança são obrigatórios

TAREFAS:

1. Crie supabase/migrations/0001_sprint0_medidas_check.sql contendo os 
   blocos A.1, A.2 e A.3 do MIGRATION-PLAN §5.1. Use BEGIN/COMMIT 
   explícitos. Adicione comentário no topo explicando o que faz e o 
   rollback no rodapé (comentado).

2. Crie supabase/migrations/0002_sprint0_lgpd.sql contendo as funções 
   export_user_data() e delete_user_account() do MIGRATION-PLAN §5.2.

3. Crie supabase/migrations/0003_sprint0_seguranca.sql contendo os 
   fixes A e B de MIGRATION-PLAN §11.2 e §11.3:
   - Drop da policy "Coach gere as fichas" em fichas_treino
   - Criação da policy correta em medidas_aluno via coach_alunos
   - Drop das 2 policies permissivas em medidas_aluno
   Cada fix em seu próprio BEGIN/COMMIT. Rollback comentado no rodapé.

4. No app, crie:
   - lib/validation/medidas.ts com o Zod schema da DESIGN-SPEC §13.4
   - components/medidas/OutlierWarningDialog.tsx (copiar do 
     COMPONENTS-STARTER.tsx, ajustar imports)
   - app/(authenticated)/perfil/excluir/page.tsx — tela com 3 passos:
     (a) tela de confirmação simples,
     (b) digitar "EXCLUIR" para confirmar,
     (c) chama Server Action que invoca delete_user_account()
   - app/(authenticated)/perfil/exportar/actions.ts — Server Action que 
     chama export_user_data() e devolve um Blob JSON para download
   - Botão "Exportar meus dados" no perfil

5. Corrija no front (sem tocar no banco):
   - Esconder seção "Parceiros" quando query retornar 0 resultados ativos
   - Corrigir truncagem "MINHA FICHA DE TRE..." (ajustar largura ou 
     diminuir tamanho da fonte)
   - Corrigir glyph "C" quebrado em Fotos > Lado (verificar font-display 
     ou caractere acentuado)
   - Corrigir pluralização: "1 atletas ativos" → "1 atleta ativo" 
     (criar utilitário lib/utils/pluralize.ts)

6. PARE AQUI. Me mostre:
   - Lista de arquivos criados/modificados
   - Conteúdo dos 3 arquivos .sql (vou copiar e rodar manualmente no 
     SQL Editor da Branch, na ordem 0001 → 0002 → 0003)
   - Status checklist do que foi feito vs pendente

NÃO faça ainda:
- Nenhuma mudança no schema das outras tabelas
- Sprint 1 (design system) — vou rodar separado
- Sprint 2 (tela de execução)
```

### Após o Claude Code terminar:

1. Você cola `0001_sprint0_medidas_check.sql` no SQL Editor da Branch e roda.
2. Valida: roda a query A.1 de novo — deve retornar 0 linhas.
3. Tenta inserir uma medida absurda manualmente — deve falhar.
4. Roda `0002_sprint0_lgpd.sql`.
5. Roda `0003_sprint0_seguranca.sql` — **muito cuidado**, isso muda RLS.
6. **Validação crítica do 0003:** loga como coach A no app local, tenta ler/editar dados de aluno do coach B — deve falhar. Loga como coach A, lê dados dos próprios alunos — deve funcionar.
7. No app local, testa "Exportar meus dados" e "Excluir conta".
8. **Se tudo OK:** roda os mesmos SQLs em produção (janela de manutenção).
9. **Commit no git:** `git commit -m "sprint 0 — higiene + LGPD + segurança RLS"`

---

## SPRINT 1 — Sistema de design (front puro)

> Zero impacto no banco. Pode ir em paralelo com qualquer outra coisa.

### Prompt para Claude Code

```
Sprint 1 — Sistema de design. Front puro, sem tocar no banco.

CONTEXTO:
- Leia DESIGN-SPEC.md §3 (sistema de design) e §13 (Stack Specifics).
- Use os arquivos design-tokens.css, tailwind.config.js e 
  COMPONENTS-STARTER.tsx como referência.

TAREFAS:

1. Substitua o tailwind.config.js do projeto pelo arquivo 
   tailwind.config.js do pacote (ajustando os paths se necessário).

2. Crie app/design-tokens.css copiando o arquivo do pacote.
3. Em app/globals.css, no topo, adicione:
   @import './design-tokens.css';

4. Em app/layout.tsx, importe Inter e JetBrains Mono via next/font/google 
   conforme DESIGN-SPEC §3.5.

5. Quebre COMPONENTS-STARTER.tsx em arquivos individuais conforme os 
   comentários // FILE: do próprio arquivo:
   - components/ui/Button.tsx
   - components/ui/Card.tsx
   - components/ui/Input.tsx
   - components/ui/EmptyState.tsx
   - components/ui/Skeleton.tsx
   - components/layout/BottomNav.tsx (CLIENT — usePathname)
   - components/layout/ScreenHeader.tsx
   - components/dashboard/KpiCard.tsx
   - components/dashboard/WeekStreakDots.tsx
   - components/dashboard/TodayWorkoutCard.tsx
   - components/treinos/PreviousSetIndicator.tsx
   - components/treinos/RestTimer.tsx (CLIENT — useState/useEffect)
   - components/medidas/OutlierWarningDialog.tsx (já criado no Sprint 0)
   - lib/utils/cn.ts
   - lib/utils/haptics.ts
   - lib/utils/format.ts (com Intl.NumberFormat 'pt-BR')

6. Substitua o BottomNav atual do app pelo novo (6 itens: Início, 
   Treinos, Nutrição, Progresso, Ranking, Perfil — DESIGN-SPEC §4.0).

7. Aplique a paleta nova nas telas existentes (sem refatorar layout 
   ainda — só trocar classes Tailwind para usar surface-1, text-primary, 
   brand-primary, etc.).

8. PARE AQUI. Me mostre:
   - Antes/depois do Dashboard (screenshot ou descrição)
   - Lista de telas que ficaram com paleta nova vs ainda na antiga
   - Quaisquer ajustes necessários no design-tokens.css que você fez

NÃO faça ainda:
- Refatoração de layout das telas (Sprint 2 em diante)
- Tela de execução de treino
```

---

## SPRINT 2 — Tela de execução (CRÍTICO)

> ✅ **Discovery completo.** Decisões fechadas:
> - Reutilizar `get_ultimo_treino_exercicio(p_aluno_id, p_exercicio_id)` que já existe — retorna `dados_sessao` JSONB inteiro da última execução.
> - Formato real do `dados_sessao` confirmado: `series[].ordem`, `series[].peso_atual`, `series[].reps` (string ou number), `series[].completado` (bool), `series[].tecnica`, `series[].anterior` (string visual). Detalhes em `MIGRATION-PLAN.md` §12.1.
> - **Filtro crítico:** PRs e cálculo de volume só consideram séries com `completado: true` E `peso_atual > 0`.

### Discovery extra (já feito — pular)

Os resultados das queries A e B já estão refletidos no `MIGRATION-PLAN.md`. Sprint pode rodar.

### Prompt para Claude Code

```
Sprint 2 — Tela de execução de treino.

CONTEXTO CONFIRMADO PELO DISCOVERY:
- Função get_ultimo_treino_exercicio(p_aluno_id, p_exercicio_id) já 
  existe — usar ela. NÃO criar get_serie_anterior.
- historico_treinos.dados_sessao tem formato:
  {
    "series": [
      { "ordem": 1, "reps": "12" | 12, "peso_atual": 0, "tecnica": "FS",
        "completado": false, "anterior": "—" }
    ],
    "data_sessao": "ISO datetime",
    "nome_rotina": "Upper",
    "nome_exercicio": "Rosca scott maquina"
  }
- reps pode vir como string ou number — usar preprocess do Zod
- peso_atual: 0 = não preenchido (não conta como treino completo)
- completado: false = série não foi feita

TAREFAS:

1. Crie supabase/migrations/0004_sprint2_recordes.sql com:
   - Tabela recordes_pessoais (MIGRATION-PLAN §6.1) com colunas:
     id, aluno_id, exercicio_id, peso, reps, historico_id, conquistado_em
   - RLS policies (alunos leem próprios PRs, coaches via coach_alunos)
   - Função detectar_prs_da_sessao adaptada ao formato REAL 
     (peso_atual, ordem, completado) — copiar exatamente do 
     MIGRATION-PLAN §6.2
   - Trigger AFTER INSERT OR UPDATE OF dados_sessao em historico_treinos
   - Backfill comentado para rodar manualmente

2. Crie lib/validation/historico-treino.ts com SerieSchema e 
   DadosSessaoSchema do MIGRATION-PLAN §12.2 (formato REAL com 
   ordem, peso_atual, etc.)

3. NÃO crie get_serie_anterior. Use get_ultimo_treino_exercicio nos 
   Server Components. Use o helper getSerieAnterior() do 
   COMPONENTS-STARTER.tsx (já adaptado ao formato real).

4. No front, crie a rota /treinos/[id]/executar:
   - Layout SEM bottom nav (tela de foco)
   - Header sticky com nome do treino + timer total + botão fechar
   - Lista de exercícios com SetRow para cada série
   - SetRow mostra:
     * Número da série (extrair de serie.ordem)
     * PreviousSetIndicator consumindo getSerieAnterior(ultimaSessao, ordem)
     * Input de peso (numeric, com .) — 2 vírgula = 2 ponto, normaliza
     * Input de reps (numeric)
     * Botão grande "Concluir série" (60px altura mín)
   - Ao concluir série, marca completado: true e peso_atual no JSONB
   - Após "Concluir série" mostra RestTimer (overlay)
   - Ao concluir todas as séries do exercício, expande próximo
   - Ao concluir todos, mostra resumo: tempo total, PRs detectados, 
     volume total (Σ peso_atual × reps onde completado=true), 
     botão "Salvar e fechar"

5. Server Action salvarSessaoTreino (app/.../executar/actions.ts):
   - Valida dados_sessao com DadosSessaoSchema
   - INSERT em historico_treinos { aluno_id, exercicio_id, ficha_id, 
     dados_sessao }
   - Trigger automaticamente popula recordes_pessoais para séries com 
     completado=true e peso_atual>0
   - Retorna { historico_id, prs_detectados }

6. Princípios não-negociáveis (DESIGN-SPEC §1):
   - Logar 1 série em ≤15 segundos (peso preenchido + tap = série salva)
   - Peso anterior SEMPRE visível
   - Sem CAPS em frases
   - Touch targets ≥44px

7. PARE AQUI. Me mostre:
   - Migration SQL gerada
   - Estrutura de pastas criadas
   - Fluxo de uma série completa (descrição passo a passo)
   - Confirmação que o tempo médio para logar 1 série está ≤15s
```

---

## SPRINT 3 — Dashboard útil

> Pode rodar após Sprint 2.

### Prompt para Claude Code

```
Sprint 3 — Dashboard útil.

Leia DESIGN-SPEC §4.1 e MIGRATION-PLAN §7.

TAREFAS:

1. Crie supabase/migrations/0005_sprint3_dashboard.sql com:
   - View v_streak_aluno (§7.1)
   - Função get_kpis_aluno (§7.2)

2. Substitua app/(authenticated)/inicio/page.tsx por Server Component 
   que usa get_kpis_aluno e busca agenda do dia + último treino.

3. Componha a tela conforme DESIGN-SPEC §4.1:
   - ScreenHeader (saudação contextual por horário)
   - WeekStreakDots (7 bolinhas — 1 preenchida = treino feito)
   - TodayWorkoutCard (se hoje tem ficha)
   - KpiGrid 2x2: Volume semana / Peso atual / Treinos mês / Streak
     * Cada KpiCard com valor + delta colorido (verde positivo, 
       vermelho negativo, neutro pra zero)
   - Sem "Dashboard Executivo", sem ícones de cofrinho

4. Loading state: Skeleton dos KPIs no Suspense boundary
5. Empty state se aluno é novo: card "Comece seu primeiro treino" com CTA

6. PARE. Me mostre antes/depois.
```

---

## SPRINT 4 — Nutrição estruturada

> Pode rodar em paralelo com Sprints 2/3 (é independente).

### Prompt para Claude Code

```
Sprint 4 — Nutrição estruturada.

Leia DESIGN-SPEC §4.2 e MIGRATION-PLAN §8.

TAREFAS:

1. Crie supabase/migrations/0006_sprint4_nutricao.sql com as 3 tabelas:
   refeicoes_plano, consumos_refeicao, registros_agua + RLS policies 
   (§8.1).

2. UI em /nutricao:
   - Mantém o PDF existente (plano_alimentar_pdf) acessível em link/aba
   - Nova aba "Refeições do dia" (tabs)
   - Lista cronológica das refeicoes_plano do plano ativo do aluno
   - Cada refeição: card com nome, horário sugerido, ingredientes, 
     botão "Marcar como consumida" + opcional "Adicionar foto"
   - Tracker de água: 8 copos (default), tap pra incrementar, 
     long-press pra decrementar (haptics.ts)

3. Para o COACH, criar tela /coach/alunos/[id]/plano-alimentar:
   - Lista refeições do plano
   - Modal "Adicionar refeição" com nome, horário, ingredientes (textarea)
   - Botão "Reordenar" (drag-and-drop opcional, MVP só number input ordem)

4. PARE. Me mostre.
```

---

## SPRINT 5 — Medidas/Fotos/Perfil

### Prompt para Claude Code

```
Sprint 5 — Medidas, Fotos e Perfil.

Leia DESIGN-SPEC §4.5, §4.6, §4.8 e MIGRATION-PLAN §9.

TAREFAS:

1. Crie supabase/migrations/0007_sprint5_perfil.sql com ALTER TABLE 
   profiles ADD COLUMN das colunas de preferência (§9).

2. /progresso — landing com 3 cards: Medidas, Fotos, Histórico de Treinos.

3. /progresso/medidas:
   - Lista cronológica desc (medida mais recente em cima)
   - Botão "Nova medida" abre form com sections:
     * Composição: peso, altura, gordura, massa magra
     * Tronco: pescoço, ombros, peitoral, cintura, abdomen, quadril
     * Membros direitos: braço, antebraço, coxa, panturrilha
     * Membros esquerdos: idem
   - Cada input: label + unidade ao lado (kg, cm, %)
   - Soft warning OutlierWarningDialog se variação >25%
   - Server Action salvarMedida (DESIGN-SPEC §13.5)

4. /progresso/fotos:
   - Bucket "evolucao-fotos" (atenção ao nome — não é fotos-evolucao)
   - Sequência: tirar foto frente → lado → costas (3 etapas)
   - Após upload, salva 3 linhas em fotos_evolucao com mesma 
     periodo_referencia
   - Vista: timeline com cards mostrando os 3 ângulos lado a lado

5. /perfil:
   - ScreenHeader com avatar, nome, email
   - Cards: 
     * Editar perfil
     * Preferências (unidade peso, unidade medida, incremento padrão)
     * Privacidade (oculto_no_ranking, notificacoes_ativas)
     * Exportar meus dados (LGPD — Sprint 0)
     * Excluir conta (LGPD — Sprint 0)
     * Sair

6. PARE. Me mostre.
```

---

## SPRINT 6 — Pontuação e Ranking

> ✅ **Discovery e decisões fechadas.** Plano detalhado em `MIGRATION-PLAN.md` §10.

### ⚠️ Antes do Sprint 6 — checagem de uso da função órfã

A função `realizar_checkin()` referencia uma tabela `checkins` que NÃO existe. Antes de tocar em pontuação, faça:

```bash
# Na raiz do projeto:
grep -rn "realizar_checkin" --include="*.ts" --include="*.tsx" --include="*.js"
```

- Se NÃO retornar nada → função é código morto. Marcar como deprecated em comentário do migration. Seguir.
- Se retornar resultados → o app está chamando uma função quebrada (qualquer chamada dá erro silencioso "relation 'checkins' does not exist"). **Pare e me mostre o que encontrou** antes de prosseguir.

### Prompt para Claude Code

```
Sprint 6 — Pontuação e Ranking.

CONTEXTO CONFIRMADO PELO DISCOVERY:
- O banco já tem 3 funções de pontuação que SÓ consideram treinos_manuais:
  * atualizar_pontos_treino (trigger BEFORE em treinos_manuais — calcula pontos_earn)
  * calcular_pontos_treino (função pura — musculação=20, cardio=10/20/30)
  * consolidar_pontos_aluno (trigger AFTER em treinos_manuais — UPSERT em pontuacao_alunos)
- DECISÃO: REESCREVER consolidar_pontos_aluno mantendo a interface (continua 
  trigger em treinos_manuais), mas agora soma de TODAS as fontes.
- realizar_checkin é referência órfã (tabela 'checkins' não existe). Já 
  validamos que não é chamada pelo app (grep retornou vazio) — ou se retornou,
  já tratei manualmente.

SISTEMA DE PONTUAÇÃO (decisão fechada):
- Treino manual: mantém scoring existente (10/20/30 conforme tipo)
- Treino real (v_historico_validos): 20 pts cada
- PR: 10 pts cada
- Medida: 3 pts cada
- Foto: 5 pts cada

Leia DESIGN-SPEC §4.7 e MIGRATION-PLAN §10 (especialmente blocos K, L, M, N, O).

TAREFAS:

1. Crie supabase/migrations/0008_sprint6_ranking.sql com TODOS os blocos 
   K, L, M, N, O do MIGRATION-PLAN §10 nessa ordem:
   
   a) Bloco K (§10.2): nota de que v_historico_validos já foi criada no 
      Sprint 3. Se este sprint rodar antes do 3, incluir o bloco G0 
      (§7.1) primeiro.
   b) Bloco L (§10.3): função public.recalcular_pontos_aluno(p_aluno_id)
   c) Bloco M (§10.4): REESCREVER consolidar_pontos_aluno() para chamar 
      recalcular_pontos_aluno
   d) Bloco N (§10.5): 4 triggers em historico_treinos, recordes_pessoais, 
      medidas_aluno, fotos_evolucao
   e) Bloco O (§10.6): views v_leaderboard e v_atletas_ativos_semana
   f) Backfill (§10.7): DO block que chama recalcular_pontos_aluno para 
      todos os alunos
   
   Cada bloco em seu próprio BEGIN/COMMIT. Rollback comentado no rodapé 
   (§10.9).

2. Tela /ranking — layout com 2 estados conforme DESIGN-SPEC §4.7:
   * SOLO: quando v_atletas_ativos_semana.quantidade <= 1
     - Card grande com pontos, streak, próxima meta personalizada
     - Sem leaderboard, sem comparação
     - CTA "Convide um amigo" (opcional, deixar pra futuro)
   * COMUNIDADE: quando >= 2
     - Header com pódio top 3 (avatar + nome + pontos)
     - Lista do 4º em diante com posição, avatar, nome, pontos, streak
     - Highlight da linha do user atual em surface-3 + dourado sutil
     - Toggle "Esta semana / Geral" (opcional para v1)

3. Componentes a criar em components/ranking/:
   - PontosHero.tsx — Server Component com KPI grande de pontos
   - PodioTop3.tsx — visual diferenciado (1º maior, 2º e 3º menores)
   - Leaderboard.tsx — lista virtualizada se >50 alunos
   - LinhaRanking.tsx — uma linha do leaderboard

4. PARE AQUI. Me mostre:
   - Migration SQL gerada (gigante — vou revisar com calma)
   - Resultado do backfill: quantos alunos foram atualizados, range 
     de pontos resultante
   - Screenshots das 2 estados do ranking (SOLO e COMUNIDADE) com dados 
     reais da branch
```

---

## Após todos os sprints

```
[ ] Rodar lighthouse no app deployado (alvo: Performance ≥85, A11y ≥90)
[ ] Testar offline-first em 1 fluxo crítico (logar série sem WiFi)
[ ] Auditoria final de policies (MIGRATION-PLAN §11)
[ ] Drop de tabelas órfãs (apenas após 90 dias sem uso — §14)
[ ] Comunicar usuários sobre as mudanças (changelog interno)
```

---

## Padrões para Claude Code seguir SEMPRE

1. **Stack: Next.js App Router + React + Supabase**, TypeScript strict.
2. **Server Components por padrão.** Client só quando há `useState`, `onClick`, browser APIs.
3. **Server Actions** para mutations. NUNCA expor service_role_key no client.
4. **Validação Zod** em toda Server Action que recebe input do usuário.
5. **Tabelas em português:** `medidas_aluno`, `fichas_treino`, `historico_treinos`, etc.
6. **Tom de copy:** adulto, calmo, direto. Sem "guerreiro", "elite", "alta performance".
7. **Sem CAPS em frases.** Só em microlabels ≤2 palavras.
8. **Dourado em ≤10% da tela.**
9. **Touch targets ≥44px.**
10. **Sempre comitar git por sprint** com mensagem descritiva.

---

## Quando algo der errado

```
Olhando para [erro/comportamento inesperado], me diga:
1. O que você esperava
2. O que aconteceu
3. Em que arquivo/linha
4. Em que sprint estamos

Não tente "consertar" silenciosamente — pare e me mostre.
```
