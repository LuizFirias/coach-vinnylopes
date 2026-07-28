---
name: auron-design
description: >-
  Design system e diretrizes visuais do AURON — app de gestão de treinos para coaches e alunos.
  Use este skill sempre que for criar, refatorar ou avaliar qualquer componente visual do AURON:
  telas do coach (dashboard, alunos, treinos, ficha digital), telas do aluno (execução, medidas,
  histórico), e-mails transacionais, cards de compartilhamento Instagram, e qualquer outro
  elemento de UI do produto. Contém: paleta de cores, tipografia, tokens de espaçamento,
  padrões de componentes, regras anti-template, comportamento mobile e exemplos reais de
  decisões de design tomadas no projeto.
---

# AURON Design Skill

Skill destilada de três fontes — Anthropic frontend-design, Vercel web-interface-guidelines,
nextlevelbuilder ui-ux-pro-max — enriquecida com todas as decisões de design tomadas nas
sessões de refatoração do AURON (julho 2026).

---

## 1. Identidade visual AURON

### Paleta
```
Background page:     #080c14   (navy azulado — dashboard; NÃO preto puro #000)
Background card:     #111827
Background input:    #1e1e1e
Borda input:         #282828   (1px)

Azul primário:       #2b7fff   (ação, destaque, accent)
Azul hover:          #5a9fff

Verde (sucesso/ativo):#39c75a
Vermelho (risco):    #e05555
Amarelo (atenção):   #f59e0b

Texto primário:      #D8DCE6   (off-white suave — NÃO #fff puro)
Texto secundário:    #7a8aab
Texto muted:         #444444   (labels, datas, meta)
Divisor:             #1a2540   (cards dark) / #222222 (cards neutros)
```

### Tipografia
```
Família:         Inter (400, 500, 600, 700, 800, 900)
Fallback:        -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Família mono:    JetBrains Mono (var: --font-mono)
Uso mono:        Pesos de carga, KPIs numéricos, valores de série, código
Pesos mono:      400 (leitura), 700 (destaque)
Onde aparece:    tela de execução, tabelas de séries, KPIs de dashboard

Valor principal (KPI/métrica):   48–96px / weight 900 / letter-spacing -2px
Título de tela:                  20–28px / weight 800
Nome de exercício/card:          14–16px / weight 600
Label de seção (uppercase):      9–11px  / weight 500–600 / letter-spacing 1–2px / uppercase
Texto de tabela:                 12–14px / weight 400–500
Texto secundário/sublinha:       10–12px / weight 400 / color text-secondary
```

### Numerais (dados numéricos)
Regra global em todo valor numérico exibido:
  font-variant-numeric: tabular-nums lining-nums
  font-feature-settings: "tnum" 1, "lnum" 1
  Token: --numeric-features
  Classes: tabular-nums lining-nums | .num | [data-numeric]

Aplicar em: KPIs, tabelas de séries, peso, cargas, histórico, medidas,
            calendário (números dos dias), cardio (kcal, FC, distância).
NÃO aplicar em: texto de corpo, labels, datas por extenso.

letter-spacing em display:
  ≥ 36px: -0.03em (--tracking-display)
  20–28px: -0.02em (--tracking-headline)
  < 18px: 0 (não ajustar)

### Tokens de forma
```
Border radius card:    12–14px
Border radius botão:   10px (NÃO pill genérico)
Border radius input:   8–10px
Border radius badge:   4–6px
Border radius pill:    9999px (APENAS status pills e tabs selecionadas)
```

### Bordas (dark mode)
--border-card:       transparent               ← cards de conteúdo (sem linha branca)
--border-card-hover: rgba(255,255,255,0.06)    ← hover em cards interativos
--border-input:      #282828                 ← inputs (manter sólido)
--border-divider:    #1a1a1a                 ← linhas internas de card
--border-accent:     rgba(43,127,255,0.40)   ← destaque/foco

Regra: inputs mantêm borda sólida para feedback de toque.
       Cards NÃO usam outline branco — separação só por diferença de surface.
       NUNCA usar border-white/5, /8, /10 direto — sempre o token border-card.
       Em grids de cards a borda deve ser invisível; o contraste vem do fundo.

### Tokens de espaçamento
```
Gap entre cards:      10–12px
Padding card:         14–16px
Padding tela:         16–24px (mobile: 16px, desktop: 24px)
Padding header fixo:  12px vertical
```

---

## 2. Semântica de cor (NUNCA violar)

Cada cor tem significado fixo — usar fora do contexto quebra a comunicação:

| Cor | Uso correto | Nunca usar para |
|-----|-------------|-----------------|
| `#2b7fff` azul | Ação primária, CTA, valores em destaque, accent | Status neutro, informação passiva |
| `#39c75a` verde | Ativo, sucesso, delta negativo de peso (queda = bom) | Alerta, risco |
| `#e05555` vermelho | Risco, erro, delta positivo de peso (ganho), deletar | Destaque genérico |
| `#f59e0b` amarelo | Atenção, pendente, vencendo em breve | Erro, sucesso |
| `#7a8aab` cinza | Texto secundário, labels, timestamps | Ação, status |

---

## 3. Regras anti-template (o que NUNCA fazer)

Estes padrões são gerados automaticamente por Lovable, v0, Base44 e outros geradores.
Identificar e eliminar qualquer um deles:

### ❌ Empty states com ícone + texto longo
```
❌ [ícone de gráfico]
   "Registre pelo menos 2 medidas para visualizar o gráfico de tendência."

✅ Gráfico renderizado com dados parciais (opacidade baixa)
   Hint discreto abaixo: "Adicione mais registros para ver a tendência"
```

### ❌ Mini-cards side-by-side decorativos
```
❌ [Última: 83kg] [Variação: —]  ← dois cards com fundo diferente

✅ ↔ sem variação no período     ← texto inline colorido, sem container
```

### ❌ Delta badge em pill colorido
```
❌ [🟢 −0.5 kg]  ← pill com background, border-radius, ícone

✅ −0.5          ← número colorido direto (#39c75a), sem container
```

### ❌ Painel "Rotas Rápidas" / quick links lateral
```
❌ Card lateral com lista de links + setas que duplicam botões do header

✅ Remover — os botões no header já existem
```

### ❌ Botão de ação primária com fundo escuro
```
❌ background: #1e3a7a (escuro, pouco contraste)

✅ background: linear-gradient(135deg, #60a5fa 0%, #2b7fff 55%, #1a6fee 100%)
   + box-shadow azul semântico (repouso/hover)
```

### ❌ Accordion "Adicionar mais detalhes" escondendo fluxo principal
```
❌ [Adicionar mais detalhes ∨]  ← esconde data, notas, campos importantes

✅ Data visível inline abaixo do input, sem necessidade de expandir
```

### ❌ Valor principal pequeno demais
```
❌ 83.0 kg em 22px/700

✅ 83.0 kg em 44–96px/900 com unidade em azul menor
```

### ❌ Label "EXERCÍCIO" repetida em cada card de ficha
```
❌ Card: "EXERCÍCIO / Abdominal infra / OBSERVAÇÕES PARA O ALUNO [→]"

✅ Header compacto: "⠿ Abdominal infra [⏱ 1min] [✎] [🗑]"
```

### ❌ Fonte genérica
```
❌ Inter como escolha default sem intenção (paradoxalmente, Inter É a fonte do AURON,
   mas com pesos 800–900 e hierarquia explícita — não Inter flat 400 em tudo)
```

---

## 4. Padrões de componentes AURON

### KPI Card (dashboard, listagens)
```
- Background: --surface-1 (#111827)
- Label: 9–11px uppercase / letter-spacing 1px / color --text-secondary
- Dot colorido semântico (6px, border-radius 3px) antes do label
- Valor: 28–48px / weight 700–900 / color --text-primary
- Subtítulo: 11–12px / color --text-secondary
- Alert state: border-color --border-danger quando valor > 0 e é negativo
- 4 KPIs por tela máximo — acima disso agrupar ou mover para tela dedicada
```

### Botão primário
```
background: linear-gradient(135deg, #60a5fa 0%, #2b7fff 55%, #1a6fee 100%)
box-shadow: 0 4px 20px rgba(43,127,255,0.45)          ← repouso
box-shadow: 0 6px 28px rgba(43,127,255,0.60)          ← hover
opacity: 0.90 hover / 0.80 active / scale(0.98) active

NÃO usar bg-brand sólido (#2b7fff) no variant primary —
usar bg-btn-primary (gradiente) + shadow-btn-glow.
bg-brand sólido é permitido apenas em badges, dots e accents pontuais.
```

### Tabela de dados
```
- Fundo: transparente sobre --bg-card
- Header: 9–11px uppercase / weight 500 / --text-muted
- Linhas: 12–14px / --text-primary com sublinha --text-secondary
- Divisor: 1px / --border-subtle
- Ação por linha: texto colorido (#2b7fff / weight 500) — NÃO botão cheio
- Avatar: inicial colorida (gerada por hash do id) / 28–32px / border-radius 50%
- Status pill: border-radius 4–6px / background semântico / texto 10–11px weight 500
- Mobile: tabela vira lista de cards — 1 card por linha
```

### Card de exercício (ficha digital)
```
Header:
  - ⠿ drag handle (--text-muted) + nome (14px/600) + [⏱ badge] [✎] [🗑]
  - Background levemente diferente do body (--bg-page vs --bg-card)
  - Border-bottom 1px --border-subtle

Body (séries):
  - Grid: # | Reps | Peso | Téc | Extra | del
  - Coluna Peso: border-color --border-accent / text-color --color-accent
  - Peso aceita decimais; placeholder "—" quando null

Footer:
  - Observação: TextInput inline (sem card separado)
  - "+ adicionar série": lowercase, --color-accent, alinhado à esquerda
```

### Badge de descanso (RestBadge)
```
- NÃO usar <input type="time"> solto
- Badge clicável: background --bg-accent / text --text-accent
- Ícone clock + valor (ex: "1min", "1:30")
- Ao clicar: picker com presets (30s, 45s, 1min, 1:30, 2min, 3min, personalizado)
```

### Empty state
```
- Variante "no-students/no-data": título + descrição + CTA centralizado
- Variante "grow" (poucos itens): linha discreta abaixo da lista
  "Adicione mais X para ver análises comparativas" + link accent
- NUNCA: ícone grande + texto longo + caixa escura ocupando metade da tela
- NUNCA: mostrar o bloco quando está preenchido (renderização condicional)
```

### Gráfico de linha (métricas de progresso)
```
- Background: #0f0f0f (dentro de card #111827)
- Linha: #2b7fff / opacity 0.35–0.5 / stroke-width 1.5px
- Ponto final: circle r=3 / #2b7fff / opacity 0.7
- Linha base: 1px / #1e1e1e
- Labels de data: 7–8px / #333333
- COM 0 pontos: linha horizontal muda em #1e1e1e (SEM empty state)
- COM 1 ponto: ponto isolado visível
- COM 2+ pontos: polyline
```

### Header fixo de tela construtora
```
- position: sticky / top: 0 / z-index: 10
- background: --bg-page com border-bottom 1px --border-subtle
- Conteúdo: ← voltar + título + campos principais + botão salvar
- Botão salvar: disabled (opacity 0.4) quando isDirty === false
- Mobile: header compacto (título + ícone ⚙) — campos abrem em bottom sheet
```

### Email transacional
```
Estrutura:  logo → eyebrow → título → corpo (2 linhas) → credenciais → CTA → footer
Container:  480px max / background #111827 / border-radius 16px
CTA:        background #2b7fff / border-radius 10px / padding 14px / branco / weight 700
Credenciais: tabela 2 colunas (label | valor) com dividers 1px #222
Footer:     border-top 1px #222 / texto 11px / #444
NÃO incluir: mockup de iPhone, seção de features, accordion "mais detalhes"
NÃO incluir: botão branco (CTA sempre em azul)
```

### Card de compartilhamento Instagram (1080×1080px)
```
Background:  #0a0f1e
Valor principal: 80–96px / weight 900 / letter-spacing -2px
Unidade:     em azul #2b7fff, tamanho menor que o valor
Label:       16–22px / #7a8aab / weight 400
Divisor:     1px / #1a2540 / 48px de largura / centrado
Rodapé:      position absolute / bottom 32px / AURONFIT (esquerda) + @handle (direita)
NÃO incluir: empty state, placeholder de mockup, borda tracejada
```

---

## 5. Layout e hierarquia por contexto

### Dashboard do coach
```
Ordem desktop:  KPIs (4) → Gráfico MRR + Distribuição → Ações prioritárias + Atividade → Tabela
Ordem mobile:   Ações prioritárias → KPIs (2×2) → Gráfico MRR → Atividade → Cards de alunos

Máximo 4 KPIs — sem seções de métricas secundárias no dashboard
MRR: valor hero (fontSize 22–28px) acima do gráfico — NÃO só no eixo Y
Atividade: agrupar eventos do mesmo aluno no mesmo dia
  "Luiz — 3 treinos concluídos" NÃO "Luiz — Lower A / Luiz — Lower A / Luiz — Lower A"
```

### Telas de listagem (alunos, treinos)
```
- Filtros + busca + ordenação sempre na mesma linha
- Tabela full width — sem painéis laterais que duplicam o header
- Delete sempre com confirmação modal (título + descrição + botão danger)
- Agrupamento quando mesmo aluno tem múltiplos itens (header colapsável)
```

### Tela de métricas do aluno
```
- Número principal ≥ 44px / weight 900
- Unidade em --color-accent menor que o número
- Gráfico sempre renderizado (sem mínimo de pontos)
- Delta: texto inline colorido — verde para queda, vermelho para alta, sem container
- Período (7d/30d/90d/1a): seletor compacto alinhado à direita do valor
```

---

## 6. Comportamento mobile

### Breakpoints
```
Mobile:   < 768px   → layout coluna única, tabelas viram cards
Tablet:   768–1024px → 2 colunas
Desktop:  > 1024px  → layout completo
```

### Regras mobile universais
```
- Tap targets mínimos: 44×44pt em TODOS os elementos interativos
- font-size em inputs: ≥ 16px (previne zoom iOS)
- safe-area-inset-bottom: sempre respeitar em bottom bars
- Sem scroll horizontal em nenhuma configuração
- touch-action: manipulation em botões e links
```

### Adaptações por componente
```
Tabelas:     → lista de cards com todas as colunas empilhadas
4 KPIs:      → grid 2×2 (NÃO 4 colunas em linha)
Header CTA:  → apenas botão primário (+) no header, resto em bottom sheet
Gráfico MRR: → full width (NÃO lado a lado com distribuição de planos)
Drag & drop: → long press ativa modo de reordenação
Salvar:      → bottom bar fixa (NÃO no header)
Série (ficha): → colunas # / Reps / Peso / chip(Téc) → SetDetailSheet para Téc+Extra
```

---

## 7. Acessibilidade e performance (regras Vercel)

### Obrigatório
```
- Todos os botões com aria-label descritivo quando icon-only
- Elementos decorativos com aria-hidden="true"
- Focus rings visíveis (:focus-visible) — NUNCA outline: none sem substituto
- Contraste mínimo APCA — preferir sobre WCAG 2
- Redundância em status: NÃO usar só cor (adicionar ícone ou texto)
- font-variant-numeric: tabular-nums em colunas de números
- Animate apenas transform e opacity (NÃO top/left/width/height)
- prefers-reduced-motion: sempre ter variante reduzida
- Listas grandes (>50 itens): virtualizar
- Imagens above-fold: preload; resto: lazy-load
- Confirmar ações destrutivas com modal antes de executar
```

### Formulários
```
- warn on unsaved changes antes de navegar (isDirty guard)
- Loading button: spinner + label original (NÃO só spinner)
- Erros inline next to field; focar no primeiro erro ao submeter
- autocomplete + name corretos em todos os inputs
- NUNCA bloquear paste em inputs
- Trim valores para remover espaços extras
```

---

## 8. Decisões específicas do projeto (registradas nas sessões)

### Banco de dados / Supabase
```
- Tabela de exercícios: exercicios_biblioteca (NÃO exercises, NÃO exercicios)
- Séries ficam em fichas_treino.configuracao (JSONB) — NÃO em tabela normalizada
- Peso prescrito: campo peso / peso_sugerido no JSON de configuração
- Volume em kg — NÃO em toneladas (5.9 ton = 5.900 kg)
- Formatação: toLocaleString('pt-BR') → "5.900 kg"
```

### Técnicas e métodos
```
- Técnicas de série: WS (Warm Set), FS (Feeder Set), TS (Top Set), BS (Back Set), PR
- Métodos extra: Cluster Set, Drop Set, Rest Pause, Giant Set, Myo Reps, Bi-Set, Super Set,
  Repetições Parciais, Isometria
- Cada técnica tem: description (técnico), coachTip (prescrição), studentInstruction (aluno),
  example (caso concreto)
- Arquivo de constantes: /lib/constants/workout-techniques.ts
```

### Stack técnica
```
Framework:  Next.js (App Router) — NÃO React Native (coach web)
Styling:    Tailwind + CSS vars (--color-accent, --bg-card, etc.)
Backend:    Supabase (Postgres + Auth)
State:      Zustand ou Context
Drag & drop web: HTML5 nativo (NÃO react-beautiful-dnd — sem dependência extra)
Drag & drop mobile: react-native-draggable-flatlist (se houver versão nativa)
Hook de breakpoint: useBreakpoint('mobile') → true quando < 768px
```

### Componentes existentes (NÃO recriar)
```
- MuscleBody: importar de @/components/ui/MuscleBody
  Props: activeMuscles[], activeColor, inactiveColor, strokeColor, size, showBothViews
- StudentCard mobile: reutilizar do dashboard (seção 13.6 do doc dashboard)
- useBreakpoint: reutilizar do hook criado no dashboard
- RestBadge: /app/components/workout-builder/RestBadge.tsx
- formatVolume(): /utils/workout.ts → kg.toLocaleString('pt-BR') + " kg"
- formatRestTime(): /lib/utils/restTime.ts → 60 → "1min", 90 → "1:30"
```

### Identidade de marca
```
- Nome no app: AURONFIT (caixa alta, sem espaço)
- Handle do coach: @{coachHandle} — dinâmico, não hardcoded
- Cor de marca: #2b7fff (azul) — NÃO amarelo (que é do HEVY/referência)
- Logo: componente existente no projeto
- E-mail: remetente AuronFit, footer "© 2026 AuronFit"
```

---

## 9. Fluxo de trabalho de design

### Antes de implementar qualquer componente
```
1. Verificar se já existe componente similar no projeto — NÃO recriar
2. Checar variáveis CSS existentes — NÃO hardcodar hex
3. Se tabela: verificar se mobile precisa de versão card
4. Se formulário: verificar isDirty guard e warn on unsaved changes
5. Se delete: adicionar modal de confirmação
6. Se KPI/métrica: verificar se fontSize ≥ 44px e weight ≥ 700
```

### Checklist anti-template (rodar antes de entregar)
```
[ ] Não há empty state com ícone grande + texto longo
[ ] Não há mini-cards side-by-side decorativos
[ ] Não há delta badge em pill colorido
[ ] Não há painel lateral que duplica botões do header
[ ] Botão de ação primária usa #2b7fff (NÃO fundo escuro)
[ ] Valor principal ≥ 44px quando é métrica central
[ ] Gráfico sempre renderizado (sem mínimo de pontos)
[ ] Delete tem confirmação modal
[ ] Tabela tem versão card para mobile
[ ] Tap targets ≥ 44×44pt no mobile
[ ] isDirty guard em formulários com dados importantes
[ ] Atividade agrupada por aluno + dia (NÃO evento repetido)
```

---

## 10. Referências de mercado (benchmarks AURON)

```
HEVY app:        cards de compartilhamento, hierarquia tipográfica, gráficos de treino
Strong app:      listas de exercícios, séries, timer de descanso
Stripe:          dashboard financeiro, número hero acima do gráfico
Linear:          hierarquia de tabelas, status pills, ações inline
Baremetrics:     MRR hero value + gráfico
Supabase:        dark mode com superfícies navy (não preto puro)
Apple Fitness:   tela de métricas, gráfico de linha, seletor de período
Notion:          e-mails transacionais (minimalismo, uma ação, zero decoração)
Vercel:          e-mails transacionais, layout de credenciais em tabela simples
```
