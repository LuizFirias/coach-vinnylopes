# CLAUDE.md — AURON

> Arquivo de instruções para o Claude Code / Cursor AI.
> Leia este arquivo inteiro antes de qualquer ação no projeto.

---

## 1. Identidade do projeto

**AURON** (branded como **AURONFIT**) é um SaaS de consultoria esportiva para personal trainers (coaches) e seus alunos.

- **Coach** gerencia alunos, fichas de treino, nutrição, medidas corporais, financeiro e relatórios
- **Aluno** executa treinos, registra cargas, acompanha medidas e segue plano alimentar
- **Stack**: Next.js App Router · Supabase (Postgres + Auth + Edge Functions) · Tailwind CSS · Phosphor Icons
- **Cor primária**: `#9333ea` (roxo — `--brand-primary`)
- **Design reference**: `SKILL.md` no projeto — fonte de verdade para tokens, componentes e regras

---

## 2. Antes de qualquer ação — checklist obrigatório

Inspirado no princípio do Superpowers: **verificar antes de agir**.

```
[ ] Leia o arquivo relevante antes de editá-lo
[ ] Verifique se o componente já existe em @/components/ui/ antes de criar um novo
[ ] Verifique se a função/helper já existe em /lib/ ou /utils/ antes de recriar
[ ] Se for alterar lógica de banco: confirme a migration number mais recente (última foi 0063)
[ ] Se for tocar em tela "quase pronta": pergunte ao usuário antes de modificar
[ ] Se houver dúvida sobre escopo: pergunte. Não assuma.
```

**Regra do Superpowers aplicada aqui:**
Se a tarefa parece simples mas envolve tocar em múltiplos arquivos interligados — pare, mapeie o que vai mudar e confirme antes de executar.

---

## 3. Como comunicar (princípio Caveman adaptado)

O dono do projeto **não tem background técnico**. Aplique estas regras de comunicação:

**Antes de codar:**
- Explique em 2–3 linhas o que vai fazer e por quê
- Liste os arquivos que serão tocados
- Aponte qualquer risco de regressão

**Durante:**
- Progresso conciso — sem monólogos técnicos
- Se encontrar algo inesperado: pare, descreva, pergunte

**Depois:**
- O que foi feito (não como foi feito)
- O que testar para confirmar que funcionou
- Se alguma coisa ficou fora do escopo, mencione

**Nunca:**
- Jargão sem explicação
- Assumir que o usuário sabe o que é um hook, middleware, SSR, etc.
- Entregar código sem dizer o que mudou

---

## 4. Regras de segurança (princípio fail-safe do RTK)

```
NÃO alterar sem permissão explícita:
  - fichas_treino.configuracao (JSONB) — estrutura da ficha, nunca modificar durante execução
  - Fluxo de execução de treino do aluno (ExecucaoTreinoPage)
  - CompletionShareScreen
  - Módulo financeiro (migration 0063 já implementada)
  - Telas marcadas como "quase prontas" (nutrição, medidas, fotos)

SEMPRE fazer antes de deletar qualquer arquivo:
  - Confirmar com o usuário
  - Verificar se há outros arquivos importando o que será deletado

SEMPRE ao criar migration SQL:
  - Usar ADD COLUMN IF NOT EXISTS
  - Nunca DROP sem confirmar
  - Testar com SELECT antes de INSERT/UPDATE em massa
```

**Princípio fail-safe:** se uma refatoração falhar no meio, o app deve continuar funcionando no estado anterior. Prefira mudanças incrementais a big-bang rewrites.

---

## 5. Design system — regras críticas

O design system completo está em `SKILL.md`. Abaixo as regras mais frequentemente violadas:

### Cores
```
--brand-primary: #9333ea   ← roxo, para ação/destaque/CTA
--surface-0:     #080c14   ← page background (NÃO #000 puro)
--surface-1:     #111827   ← card background (ÚNICO fundo válido para cards)
--surface-2:     #1e1e1e   ← inputs e elevação interna (NUNCA como fundo de card)
--success:       #39c75a
--warning:       #f59e0b
--danger:        #e05555
--text-primary:  #D8DCE6   (NÃO #fff puro)
--text-secondary:#A1A1AA
--text-tertiary: #71717A
--text-disabled: #52525B
```

### Componentes — reutilizar, nunca recriar
```
Button     → @/components/ui/Button     (variants: primary, secondary, ghost, danger, success)
Input      → @/components/ui/Input      (nunca <input> nativo estilizado)
Select     → @/components/ui/Select     (nunca <select> nativo estilizado)
Card       → @/components/ui/Card       (variants: default, primary, interactive)
GlassPanel → @/components/ui/GlassPanel (só em tooltips, sheets e modais — nunca em listas)
```

### Anti-padrões — NUNCA fazer
```
❌ bg-surface-2 como fundo de card
❌ <select> nativo com CSS customizado
❌ Botão primário com bg-brand sólido (usar gradiente + glow)
❌ Delta de métrica em pill colorido (usar número colorido inline)
❌ Empty state com ícone grande + texto longo
❌ Gráfico com mínimo de pontos (sempre renderizar)
❌ Delete sem modal de confirmação
❌ Hex hardcoded (sempre usar tokens CSS)
❌ GlassPanel em card estático de lista
```

### Tipografia e números
```
KPIs e valores hero: font-size ≥ 36px, font-weight 900, tabular-nums lining-nums
Unidade de KPI: text-base, font-weight bold, color: var(--brand-primary)
Todos os valores numéricos: font-variant-numeric: tabular-nums lining-nums
```

---

## 6. Arquitetura do banco (Supabase)

```
Tabela de exercícios:  exercicios_biblioteca (não 'exercises', não 'exercicios')
Séries de treino:      fichas_treino.configuracao (JSONB) — NÃO tabela normalizada
Volume:                em kg (não toneladas)
Formatação:            toLocaleString('pt-BR') → "5.900 kg"

Migration mais recente: 0063
  - Tabela: pagamentos_alunos
  - View:   vw_financeiro_mensal
  - Regime: caixa (data_pagamento como âncora, não data de vencimento)
  - pg_cron: recalcular_status_alunos (diário, 06:00 BRT)

Módulo financeiro — NÃO tocar:
  - pagamentos_alunos
  - vw_financeiro_mensal
  - RenovarPlanoModal (acessível via "..." e ?renovar=1)
```

---

## 7. Rotas e navegação

```
Coach (admin):
  /admin/dashboard
  /admin/alunos/[id]          ← usar slug amigável, não UUID exposto
  /admin/treinos/nova-ficha   ← rota canônica de criação de ficha
  /admin/boost                ← seção de tutoriais (em desenvolvimento)

Aluno:
  /aluno/treinos              ← sem ID na URL (contexto por sessão)
  /aluno/treino/[fichaSlug]   ← slug amigável
  /aluno/nutricao
  /aluno/medidas
  /aluno/fotos
```

**Regra importante:** o botão "Nova ficha" em qualquer tela de aluno deve apontar para `/admin/treinos/nova-ficha?aluno=[id]`. Nunca criar rotas duplicadas de criação de ficha.

---

## 8. Componentes existentes — não recriar

```typescript
// Utilitários
formatVolume()     → /utils/workout.ts
formatRestTime()   → /lib/utils/restTime.ts    (60 → "1min", 90 → "1:30")
formatDuration()   → /lib/utils/format.ts
cn()               → /lib/utils/cn.ts          (classnames helper)
haptic()           → /lib/utils/haptics.ts

// Hooks
useBreakpoint('mobile')  → true quando < 768px

// Componentes de treino
RestBadge          → /app/components/workout-builder/RestBadge.tsx
StudentTechniqueCard
BiSetGroupPreviewCard
ExercicioCard
SetRow

// Componentes de UI
MuscleBody         → @/components/ui/MuscleBody
  Props: activeMuscles[], activeColor, inactiveColor, strokeColor, size, showBothViews

// Sharing cards (pós-treino)
ShareCardShell     → @/app/components/workout/share/ShareCardShell
BrandFooter        → @/app/components/workout/share/BrandFooter
WorkoutMuscleListCard → padrão de referência para novos cards

// Financeiro
lib/financeiro/types.ts   → tipos de pagamento e status
```

---

## 9. Integridade da ficha de treino

**Regra absoluta:** `fichas_treino.configuracao` é imutável durante a execução do treino.

```
reps (prescrito pelo coach) → NUNCA modificar durante execução
reps_executadas             → campo separado no estado local e em dados_sessao
peso_atual                  → estado local durante execução, salvo em historico_treinos
```

Ao salvar em `historico_treinos.dados_sessao`:
```typescript
{
  reps_prescritas: s.reps,                    // imutável
  reps_executadas: s.reps_executadas ?? s.reps, // o que o aluno fez
  reps: s.reps_executadas ?? s.reps,           // retrocompatibilidade
  peso_atual: s.peso_atual,
  completado: s.completado,
}
```

---

## 10. Mobile — regras universais

```
Tap targets mínimos: 44×44pt em TODOS os elementos interativos
font-size em inputs: ≥ 16px (previne zoom iOS)
safe-area-inset-bottom: sempre respeitar em bottom bars
touch-action: manipulation em botões e links
Sem scroll horizontal em nenhuma configuração
Tabelas → viram lista de cards em < 768px
4 KPIs → grid 2×2 (nunca 4 em linha no mobile)
```

---

## 11. Técnicas de treino — constantes

```
Arquivo: /lib/constants/workout-techniques.ts

Técnicas de série: WS (Warm Set), FS (Feeder Set), TS (Top Set), BS (Back Set), PR
Métodos extra: Cluster Set, Drop Set, Rest Pause, Giant Set, Myo Reps,
               Bi-Set, Super Set, Repetições Parciais, Isometria
```

---

## 12. Checklist final antes de entregar qualquer código

```
[ ] Não há hex hardcoded — todos os valores usam tokens CSS
[ ] Não há <select> ou <input> nativo estilizado
[ ] Não há novo componente que duplica algo de @/components/ui/
[ ] Cards usam bg-surface-1 (#111827) — nunca surface-2
[ ] Botão primário usa gradiente + glow (não bg-brand sólido)
[ ] Todos os valores numéricos têm tabular-nums lining-nums
[ ] Tap targets ≥ 44×44pt no mobile
[ ] Delete tem confirmação modal
[ ] Tabela tem versão card para mobile se < 768px
[ ] fichas_treino.configuracao não foi modificado
[ ] Se criou migration: usa IF NOT EXISTS, sem DROP sem confirmação
[ ] Explicou ao usuário o que foi feito em linguagem não técnica
```

---

## 13. Quando parar e perguntar

Pare e pergunte ao usuário antes de:

1. Tocar em qualquer tela descrita como "quase pronta" (nutrição, medidas, fotos, histórico)
2. Criar uma nova tabela no banco
3. Deletar qualquer arquivo ou componente
4. Refatorar algo que não foi explicitamente pedido
5. Adicionar qualquer dependência npm nova
6. Alterar a estrutura de rotas existente
7. Modificar qualquer hook, middleware ou configuração de auth

**Princípio:** é melhor perguntar e parecer cauteloso do que refatorar algo que estava funcionando e causar regressão em produção.

---

## 14. Economia de tokens — engenharia de prompt

Todo token gasto à toa é custo real (tempo e dinheiro). Antes de qualquer ação, aplicar:

```
[ ] Já li esse arquivo nesta conversa? → Não reler. Usar o que já está no contexto.
[ ] Preciso do arquivo inteiro ou só de um trecho? → Ler só o trecho (offset/limit) quando o arquivo for grande.
[ ] Sei onde procurar? → Grep/Glob primeiro, nunca abrir arquivos "no escuro" tentando achar algo.
[ ] A mudança é pontual? → Edit (cirúrgico), nunca Write (reescrever o arquivo inteiro) quando só uma parte muda.
[ ] Preciso validar agora? → Rodar typecheck/build UMA vez ao fim de um bloco de mudanças relacionadas,
    não a cada edição isolada.
[ ] Isso precisa de um sub-agente? → Só para exploração ampla e incerta. Tarefa simples e direta = eu mesmo
    resolvo com Read/Grep. Um sub-agente custa uma sessão de contexto inteira.
[ ] Posso paralelizar? → Leituras/greps independentes vão juntos na mesma mensagem, não em sequência.
```

**Nas respostas ao usuário:**
- Direto ao ponto — sem recapitular o que ele já sabe ou o que já foi dito na conversa.
- Resumo do que mudou não deve ser mais longo que a mudança em si.
- Sem re-explicar uma decisão já justificada antes.
- Sem despejar diffs ou trechos de código inteiros quando uma frase explica o suficiente.

**Princípio geral:** contexto já carregado na conversa é gratuito — reler ou re-explorar o que já se sabe é o desperdício mais comum. Preferir reaproveitar a re-verificar.