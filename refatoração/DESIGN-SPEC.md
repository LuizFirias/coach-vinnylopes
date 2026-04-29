# DESIGN SPEC · SaaS Fitness Personal — Refatoração Completa

> **Documento técnico de especificação de design para implementação.**
> Destinatário: Claude Code (VSCode) + desenvolvedor humano.
> Última revisão: abril 2026.
> Status: refatoração estrutural — não é tweak cosmético.

---

## 0. Como usar este documento

Este arquivo é a **fonte única de verdade** do redesign. Cada seção foi escrita para ser executável: tokens de design vêm como variáveis CSS prontas, componentes vêm com estrutura semântica explícita, copy vem em formato final para colar.

**Ordem sugerida de leitura/implementação:**
1. Princípios (§1) — não pular, define o "por quê" de cada decisão.
2. Sistema de Design (§2) — implementar tokens primeiro. Sem isso, nada funciona.
3. Componentes Base (§3) — construir antes das telas.
4. Telas (§4) — implementar na ordem do roadmap (§9).
5. UX Writing, microinterações, acessibilidade, LGPD (§5–§8) — aplicar transversalmente.

**Convenções:**
- `código` = identificador técnico (variável, classe, componente).
- *itálico* = nome de tela, seção ou conceito.
- **negrito** = ênfase de decisão crítica.
- 🚫 = remover do produto.
- ✅ = adicionar ao produto.
- 🔧 = refatorar item existente.

---

## 1. Princípios Fundamentais (Research-Backed)

Cada princípio abaixo vem de evidência observada em apps que dominam retenção no nicho fitness adulto (Hevy, Strong, Fitbod, Caliber, Future, Whoop, Apple Fitness, Nike Training Club).

### 1.1 — Onboarding e primeira ação em ≤ 60 segundos
Apps que conseguem o usuário fazendo a primeira ação em menos de 1 minuto têm **+50% de retenção em D30**. Tradução para este produto: ao abrir o app pela primeira vez, o usuário precisa estar a **1 toque** de iniciar o treino do dia.

### 1.2 — Logging frictionless: ≤ 3 toques por série, ≤ 15s por exercício
Hevy, Strong e Setgraph convergiram em uma métrica: **logar uma série deve levar 10–15 segundos**. Acima disso, o usuário desiste. Cada toque extra entre "terminei a série" e "registrei a série" é abandono potencial.

### 1.3 — Peso anterior é dado sagrado
O número mais importante numa série de musculação não é o peso de hoje — é o peso da última vez. Sem esse contexto, a sessão vira chute. **Toda tela de execução exibe o peso/reps anteriores em destaque, mesmo quando vazios** (com mensagem clara: "Primeira vez · sugestão: comece leve").

### 1.4 — Distraction-free workout mode
Durante o treino, não há nav bar, não há banners, não há cards laterais. **Tela cheia, foco total no exercício atual.** Apple Fitness, Strong e Reps & Sets seguem esse padrão. Voltar à navegação geral exige um gesto deliberado (X ou swipe down).

### 1.5 — Progresso visível em todo lugar
Número solto não conta história. **Todo KPI é apresentado com delta temporal** (vs. 7d, 30d ou meta). "82 kg" sem contexto é dado morto; "82 kg · −1.2 kg em 30 dias" é storytelling.

### 1.6 — Empty states são oportunidades de educação, não desculpas
Estados vazios apresentam um caminho ("envie sua primeira foto agora") + dica útil ("mesma roupa, mesma luz, mesmo horário, semanalmente"). Nunca prometer conteúdo futuro ("aguarde novidades") — isso comunica produto incompleto.

### 1.7 — Tom adulto, calmo, direto
O público-alvo é adulto que trabalha e treina. **Não chamar de "atleta de elite", "alta performance" ou "guerreiro".** Chamar pelo nome. Falar como um coach humano falaria por WhatsApp: claro, breve, respeitoso.

### 1.8 — Microinterações com haptic feedback
Tocar para concluir uma série dispara: **vibração curta + cor da tela pulsando + som suave (opcional)**. Apps com esse loop fechado têm +30% de engajamento. Sem feedback, o cérebro não registra a recompensa.

### 1.9 — Offline-first
A pessoa treina em academias com WiFi ruim. Toda função crítica (logar série, ver ficha, ver peso anterior) **funciona offline e sincroniza depois**. Apps que dependem de conexão constante são impraticáveis em ambiente real de treino.

### 1.10 — Comparação social é tóxica num público adulto 1-on-1
Substitua ranking público por **competição contra si mesmo**: streak, PR pessoal, consistência, anéis fechando. Whoop, Apple Fitness e Strava (em modo individual) provam que esse modelo retém mais que leaderboards entre estranhos.

---

## 2. Sistema de Design

### 2.1 Paleta de Cores

**Filosofia:** dark mode com surface elevation (Material Design 3 aplicado ao contexto fitness). Nada de preto puro `#000000` — cria flat look e amplifica contraste com elementos cinza, gerando fadiga ocular. Usamos um neutro frio quase preto como base e construímos elevações progressivas.

O dourado atual está saturado demais e ubíquo. **Reduzir para um dourado mais sóbrio, usado apenas em CTAs primários e em métricas-chave** (≤10% da superfície). Adicionar paleta semântica completa (sucesso/atenção/erro/info) — sem isso o app não consegue comunicar estados.

```css
:root {
  /* === Surfaces (do mais escuro pro mais claro) === */
  --surface-0:        #0A0A0B;   /* background base do app */
  --surface-1:        #121214;   /* cards primários */
  --surface-2:        #1A1A1D;   /* cards aninhados / hover */
  --surface-3:        #232327;   /* inputs, divisores ativos */
  --surface-4:        #2D2D32;   /* skeleton loaders */

  /* === Texto === */
  --text-primary:     #F5F5F7;   /* títulos, dado principal */
  --text-secondary:   #B8B8BD;   /* labels, body padrão */
  --text-tertiary:    #7A7A82;   /* metadata, hints */
  --text-disabled:    #4A4A50;   /* estados desabilitados */

  /* === Bordas === */
  --border-subtle:    rgba(255, 255, 255, 0.06);  /* divisores leves */
  --border-default:   rgba(255, 255, 255, 0.10);  /* bordas de card */
  --border-strong:    rgba(255, 255, 255, 0.18);  /* inputs focados */

  /* === Brand (dourado refinado) === */
  --brand-primary:    #D4A437;   /* CTA principal, métrica-chave */
  --brand-hover:      #E1B548;
  --brand-pressed:    #B88B25;
  --brand-subtle:     rgba(212, 164, 55, 0.12);  /* fundos suaves */
  --brand-border:     rgba(212, 164, 55, 0.32);

  /* === Semânticas === */
  --success:          #2EB872;   /* PR, série concluída, streak ativo */
  --success-subtle:   rgba(46, 184, 114, 0.12);
  --warning:          #E8A33B;   /* deload, atenção */
  --warning-subtle:   rgba(232, 163, 59, 0.12);
  --danger:           #E5484D;   /* erro, exclusão */
  --danger-subtle:    rgba(229, 72, 77, 0.12);
  --info:             #3B82F6;   /* info, recovery, sync */
  --info-subtle:      rgba(59, 130, 246, 0.12);

  /* === Special === */
  --pr-glow:          0 0 20px rgba(46, 184, 114, 0.4);  /* halo de PR */
  --focus-ring:       0 0 0 2px rgba(212, 164, 55, 0.5);
}
```

**Regras de uso de cor:**
- Branco puro `#FFFFFF` é proibido em texto. Sempre `--text-primary` (`#F5F5F7`).
- Dourado é usado em **no máximo 1 CTA primário por tela**. Botões secundários usam `--surface-3` com texto `--text-primary`.
- Cores semânticas comunicam estado, nunca decoração. Verde só aparece em PR, série feita, streak. Vermelho só em erro ou exclusão. Não pintar coisas verdes só "porque ficou bonito".
- Contraste mínimo: **4.5:1 para corpo de texto, 3:1 para texto grande (≥18pt) e elementos não-textuais** (WCAG AA).

### 2.2 Tipografia

**Decisão crítica:** trocar a serif decorativa atual + sans em CAPS por **uma única família sans humanizada**. A serif comunica "perfumaria/imobiliária", não performance. CAPS com letter-spacing alto destrói velocidade de leitura.

**Família escolhida: Inter** (variable, gratuita, otimizada para UI).
**Alternativas válidas:** Söhne (paga), Geist (gratuita), General Sans (gratuita).

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Menlo, monospace;  /* só para números de cronômetro/peso */

  /* === Escala (mobile-first, base 16px) === */
  --text-2xs:    11px;   /* tag mínima, microlabel */
  --text-xs:     12px;   /* metadata, captions */
  --text-sm:     14px;   /* body secundário, labels */
  --text-base:   16px;   /* body padrão */
  --text-lg:     18px;   /* body destacado */
  --text-xl:     20px;   /* subtítulos */
  --text-2xl:    24px;   /* títulos de seção */
  --text-3xl:    30px;   /* títulos de tela */
  --text-4xl:    36px;   /* hero numbers (peso, contador) */
  --text-5xl:    48px;   /* timer de execução */

  /* === Pesos === */
  --weight-regular:  400;
  --weight-medium:   500;
  --weight-semibold: 600;
  --weight-bold:     700;

  /* === Line height === */
  --leading-tight:    1.15;   /* títulos, números grandes */
  --leading-snug:     1.35;   /* subtítulos */
  --leading-normal:   1.5;    /* body */
  --leading-relaxed:  1.65;   /* parágrafos longos */

  /* === Letter spacing === */
  --tracking-tight:  -0.02em;  /* títulos grandes */
  --tracking-normal:  0;        /* body */
  --tracking-wide:    0.02em;   /* labels secundárias */
  --tracking-caps:    0.08em;   /* labels em ALL CAPS — uso restrito */
}
```

**Regras de tipografia:**
- **Sentence case por padrão.** Títulos de tela em sentence case ("Início", "Treinos", "Medidas"). Não mais "DASHBOARD EXECUTIVO".
- **CAPS é proibido em frases**. Usar apenas em micro-labels de até 2 palavras, em `--text-2xs` ou `--text-xs`, com `--tracking-caps`. Exemplo: "PESO ATUAL" como label acima do número.
- **Hierarquia tipográfica máxima por tela: 3 níveis.** Acima disso, hierarquia se perde.
- Números de KPI (peso, volume, timer) usam `--font-mono` em pesos 500/600 — números monospaced são essenciais para que dígitos não "pulem" ao mudar de valor.
- Line-height nunca abaixo de 1.35 em texto legível.

### 2.3 Espaçamento (8pt grid)

```css
:root {
  --space-1:  4px;    /* gap entre ícone e label */
  --space-2:  8px;    /* gap interno mínimo */
  --space-3:  12px;   /* padding de chip, gap em listas */
  --space-4:  16px;   /* padding padrão de card, gap entre cards */
  --space-5:  20px;
  --space-6:  24px;   /* padding de seção */
  --space-8:  32px;   /* margin vertical entre blocos grandes */
  --space-10: 40px;
  --space-12: 48px;   /* hero spacing */
  --space-16: 64px;
}
```

**Regras de espaçamento:**
- Padding lateral global do app: `--space-4` (16px). Não usar valores quebrados (15px, 17px).
- Gap entre cards na mesma seção: `--space-3` (12px).
- Gap entre seções diferentes: `--space-8` (32px).
- Touch target mínimo: **44×44px** (Apple HIG) / **48×48px** (Material). Use 48px como baseline.

### 2.4 Border Radius

```css
:root {
  --radius-sm:    6px;    /* tags, chips */
  --radius-md:   10px;    /* inputs, botões pequenos */
  --radius-lg:   14px;    /* cards, botões grandes */
  --radius-xl:   20px;    /* hero cards, modais */
  --radius-full: 9999px;  /* pills, avatars */
}
```

**Decisão:** padronizar em radius médio-grande (14px para cards). Os cards atuais variam entre arredondado demais e pouco arredondado — falta sistema.

### 2.5 Sombras e Elevação

Em dark mode, **sombras não funcionam para criar profundidade** (sombra preta sobre fundo escuro = nada). Use **elevação por surface mais clara + glow sutil** quando necessário.

```css
:root {
  --elev-0: none;                                                /* surface-0 */
  --elev-1: 0 1px 2px rgba(0, 0, 0, 0.3);                        /* sutil, p/ cards over surface-0 */
  --elev-2: 0 4px 12px rgba(0, 0, 0, 0.45);                      /* modais, dropdowns */
  --elev-3: 0 12px 32px rgba(0, 0, 0, 0.55);                     /* sheets, top */
  --glow-brand:   0 0 24px rgba(212, 164, 55, 0.25);             /* halo dourado em CTA hover */
  --glow-success: 0 0 24px rgba(46, 184, 114, 0.30);             /* halo verde em PR */
}
```

### 2.6 Iconografia

Trocar set atual (heterogêneo) por **uma única biblioteca**:
- **Lucide Icons** (gratuito, 1500+ ícones, stroke-based, pesos consistentes).
- Tamanho padrão: 20×20 ou 24×24.
- Stroke width: 1.75 (consistente em todos).
- Ícones de bottom nav: 24×24 outline + label.
- Ícones de ação inline: 16×16 ou 20×20.

**Mapeamento sugerido (lucide):**
- Início → `home`
- Treinos → `dumbbell`
- Nutrição → `apple` ou `utensils`
- Progresso → `trending-up`
- Perfil → `user`
- Iniciar treino (CTA) → `play`
- PR/recorde → `award` ou `trophy`
- Streak → `flame`
- Timer → `timer`
- Foto → `camera`

### 2.7 Animações

```css
:root {
  --ease-out:        cubic-bezier(0.16, 1, 0.3, 1);     /* padrão p/ entrada */
  --ease-in-out:     cubic-bezier(0.65, 0, 0.35, 1);    /* transições reversíveis */
  --ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1); /* feedback tátil, microinteração */

  --duration-instant: 100ms;   /* hover, focus */
  --duration-fast:    180ms;   /* maioria das transições */
  --duration-normal:  240ms;   /* sheets, modais */
  --duration-slow:    400ms;   /* hero entrances */
}
```

**Regras:**
- Toda transição usa `--ease-out` por padrão.
- Skeleton loaders pulsam em 1.5s loop.
- Confirmações (série feita) usam `--ease-spring` para parecer "tátil".
- Reduzir todas durações se `prefers-reduced-motion: reduce` estiver ativo.


---

## 3. Componentes Base

### 3.1 Botões

**Hierarquia clara, três níveis máximo por tela:**

#### Botão Primário (`<Button variant="primary">`)
- Fundo: `--brand-primary` (`#D4A437`)
- Texto: `#1A1A1D` (escuro sobre dourado, alto contraste)
- Peso: `--weight-semibold` (600)
- Padding: `14px 20px`
- Radius: `--radius-lg`
- Touch target: ≥48px altura
- Hover: `--brand-hover` + `--glow-brand`
- Pressed: `--brand-pressed` + scale(0.98)
- Disabled: opacity 0.4, cursor not-allowed
- **Uso:** ação principal de cada tela (1 por tela: "Iniciar treino", "Salvar série", "Enviar").

#### Botão Secundário (`<Button variant="secondary">`)
- Fundo: `--surface-3`
- Texto: `--text-primary`
- Border: 1px `--border-default`
- Demais especs iguais ao primário.
- **Uso:** ações secundárias ("Cancelar", "Pular", "Editar").

#### Botão Terciário / Ghost (`<Button variant="ghost">`)
- Fundo: transparente
- Texto: `--text-secondary` (hover → `--text-primary`)
- Sem border
- **Uso:** ações de baixa prioridade ("Voltar", "Ver mais", links inline).

#### Botão Destrutivo (`<Button variant="danger">`)
- Fundo: `--danger-subtle`
- Texto: `--danger`
- Border: 1px `--danger` opacity 0.5
- **Uso:** "Excluir", "Encerrar sessão" (raro).

**Regra absoluta: nunca dois botões primários (dourados) na mesma tela.** Se houver 2 ações fortes, uma vira primário e a outra secundária.

### 3.2 Inputs

```
Estado padrão:
- Background: --surface-2
- Border: 1px --border-default
- Texto: --text-primary
- Placeholder: --text-tertiary
- Padding: 14px 16px
- Radius: --radius-md
- Font-size: --text-base (16px — evita zoom no iOS)

Estado focused:
- Border: 1px --brand-primary
- Box-shadow: --focus-ring

Estado error:
- Border: 1px --danger
- Helper text abaixo: --danger, --text-xs

Label:
- Acima do input
- --text-xs, --weight-medium, --text-secondary
- Sentence case, sem CAPS
```

**Inputs numéricos (peso, reps):**
- Teclado numérico (`inputmode="decimal"` para peso, `inputmode="numeric"` para reps).
- Stepper +/− grandes (48×48) ao lado, opcional.
- Para peso: incremento padrão 2.5kg ou 1.25kg (configurável no perfil).

### 3.3 Cards

#### Card padrão
```
- Background: --surface-1
- Border: 1px --border-default
- Border-radius: --radius-lg (14px)
- Padding: --space-4 (16px)
- Margin-bottom: --space-3 (12px) entre cards
- Sem sombra (dark mode)
```

#### Card primário/destacado (1 por tela máx.)
```
- Background: --surface-2
- Border: 1px --brand-border
- Resto igual
- Halo opcional: --glow-brand sutil
```

#### Card interativo (clicável)
```
- Cursor: pointer
- Transition: background 180ms --ease-out
- Hover: background --surface-2
- Active: scale(0.99)
- Indicador de "vai pra outra tela": ícone chevron-right à direita, --text-tertiary
```

### 3.4 Bottom Navigation (Refatoração)

**Problema atual:** 6 itens visíveis (Início, Treinos, Nutrição, Medidas, Fotos, Ranking) + Perfil = 7 destinos. Apple HIG e Material recomendam 5 itens, mas até 6 é tolerável **se as labels não truncarem e os ícones forem distintos**. O problema atual não é só quantidade — é que "Medidas" e "Fotos" são ambas categorias de evolução e poderiam se unificar.

**Decisão:** **6 itens fixos**, unificando Medidas + Fotos em "Progresso" e mantendo Ranking conforme requisito de produto.

```
┌────────────────────────────────────────────────────────────┐
│  Início  Treinos  Nutrição  Progresso  Ranking  Perfil     │
│   home   dumbbell  utensils trending-up  trophy   user     │
└────────────────────────────────────────────────────────────┘
```

🔧 **"Progresso"** unifica *Medidas* + *Fotos* (ambas evolução visual/numérica). Tela de Progresso terá 2 sub-abas: "Medidas" e "Fotos".
✅ **"Ranking"** mantido como item próprio (decisão de produto). Redesenho da tela na §4.7 garante que funcione bem mesmo com 1 atleta ativo.

**Especificações visuais:**
- Altura: 64px + safe area inset bottom.
- Background: `--surface-0` com `border-top: 1px --border-subtle`.
- Item ativo: ícone preenchido (`fill`) + label `--brand-primary` + `--weight-semibold`.
- Item inativo: ícone outline + label `--text-tertiary`.
- Label: `--text-2xs`, sentence case, peso medium, **uma palavra curta** (Início, Treinos, Nutrição, Progresso, Ranking, Perfil — todas cabem sem truncar em 360px+).
- Touch target: 48×48 mínimo por item.
- Distribuição: `flex` com `justify-content: space-around`, cada item com `flex: 1`.
- **Sem badge numérico.** Notificações vão para um sino no header, não no bottom nav.

**Implementação Next.js (App Router):** o bottom nav vive em `app/(authenticated)/layout.tsx` como Server Component, com o item ativo derivado de `usePathname()` em um Client Component aninhado.

### 3.5 Empty States (padronizado)

Todo empty state segue esta estrutura:

```
┌─────────────────────────┐
│                         │
│      [Ícone 48×48]      │
│                         │
│   Título sentence case  │
│   --text-lg, weight 600 │
│                         │
│  Descrição curta (1-2   │
│  linhas), --text-sm,    │
│  --text-secondary       │
│                         │
│   [CTA Primário]        │
│                         │
│   💡 Dica útil opcional │
│   --text-xs, tertiary   │
└─────────────────────────┘
```

**Regra de ouro:** todo empty state tem **(a) próximo passo claro** + **(b) educação contextual**. Nunca prometer conteúdo futuro ("aguarde novidades") — esconder a seção até ter conteúdo real.

### 3.6 Toasts e Feedback

#### Toast de sucesso
- Position: top, slide down
- Background: `--success-subtle` com border `--success` opacity 0.4
- Ícone: `check-circle` em `--success`
- Texto: `--text-primary`, `--text-sm`
- Auto-dismiss: 3s
- Haptic: `notificationOccurred(.success)` em iOS

#### Toast de erro
- Mesma estrutura, mas `--danger-subtle` + ícone `alert-circle`
- Auto-dismiss: 5s
- Haptic: `notificationOccurred(.error)`

#### Confirmação inline (série concluída)
- Não usa toast. Usa **animação no próprio card da série**:
  - Fundo pulsa para `--success-subtle` por 600ms
  - Checkbox vira `check` em `--success`
  - Vibração curta
  - Card fica em estado "concluído" (opacity 0.65, riscar peso/reps).

### 3.7 Skeleton Loaders

Toda tela que faz fetch de dados mostra skeleton em vez de spinner. Mais rápido percebido, mais profissional.

```
- Background base: --surface-1
- Shimmer: gradient linear de --surface-2 para --surface-3 e volta
- Animation: 1.5s ease-in-out infinite
- Mesma forma do conteúdo final (não retângulo genérico)
```

---

## 4. Refatoração Tela a Tela

### 4.1 Tela: Início (substitui "Dashboard Executivo")

#### Problemas atuais
- Saudação genérica "Bem-vindo, Luiz" ocupa hero space sem entregar valor.
- "Agenda Semanal" com siglas incompreensíveis (OFF/PERN/+/SEX PERN).
- Card "Fazer Check-in" sem contexto: check-in de quê?
- 4 KPIs sem delta temporal.
- Card "Feedback do Treino de Hoje" no meio — fora de contexto (deveria aparecer pós-treino).
- "Parceiros · Aguarde Novidades" — produto incompleto à vista.
- Cards "Iniciar Treino" e "Registro de Evolução" visualmente idênticos.

#### Estrutura nova

```
┌──────────────────────────────────────┐
│ [Header]                              │
│ Olá, Luiz · Terça, 28 abr             │
│ "Hoje é dia de Upper"                 │
├──────────────────────────────────────┤
│ [HERO CARD — Treino de hoje]          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ UPPER · 8 exercícios · ~58min        │
│ Última sessão: vol. 12.450 kg         │
│ [▶ COMEÇAR TREINO]    (CTA dourado)   │
├──────────────────────────────────────┤
│ [Streak semanal]                      │
│ ● ● ● ● ○ ○ ○                         │
│ S T Q Q S S D                         │
│ "Você está em 12 dias 🔥"            │
├──────────────────────────────────────┤
│ [Grid 2x2 de KPIs com delta]          │
│ ┌──────────┐  ┌──────────┐           │
│ │ Volume   │  │ Peso     │           │
│ │ semana   │  │ atual    │           │
│ │ 18.2 ton │  │ 82.0 kg  │           │
│ │ ↑ +8% vs │  │ ↓ −1.2kg │           │
│ │ sem.pas. │  │ em 30d   │           │
│ └──────────┘  └──────────┘           │
│ ┌──────────┐  ┌──────────┐           │
│ │ Treinos  │  │ Aderência│           │
│ │ no mês   │  │ 30 dias  │           │
│ │ 14       │  │ 87%      │           │
│ │ ↑ +3 vs  │  │ ↑ +12pp  │           │
│ └──────────┘  └──────────┘           │
├──────────────────────────────────────┤
│ [Atalho secundário — só se aplicável] │
│ "Suas medidas estão há 14 dias sem   │
│ atualização. Atualizar agora ›"      │
└──────────────────────────────────────┘
```

#### Mudanças específicas

🔧 **Header redesenhado:**
- Linha 1: "Olá, Luiz" em `--text-base`, `--text-secondary`. Data por extenso, sem CAPS.
- Linha 2: "Hoje é dia de [tipo]" em `--text-2xl`, `--weight-bold`, `--text-primary`. Se for descanso: "Hoje é dia de descanso". Se não houver treino agendado: "Sem treino programado".

🔧 **Hero card de treino:**
- Único card primário da tela, com `--brand-border` e halo sutil.
- Mostra: nome do treino, número de exercícios, duração estimada, volume da última sessão (peer-pressure positivo: "supere isso").
- CTA dourado grande "Começar treino" abre modo execução (§4.3).
- Se já estiver concluído hoje: muda para "✓ Concluído · 56 min · vol. 13.100 kg" em verde.

✅ **Streak semanal visual:**
- 7 bolinhas representando os dias da semana.
- Cheia `--success` = treino feito.
- Outline `--brand-primary` = treino programado.
- Vazia `--text-tertiary` = descanso.
- Texto motivacional dinâmico: "12 dias seguidos 🔥" ou "Comece sua sequência".

🔧 **KPIs com delta:**
- Cada card mostra: label (CAPS micro), valor grande (mono), delta com seta colorida.
- Delta verde se favorável (peso baixou se objetivo é cutting; subiu se bulking — config no perfil).
- Sem delta = primeira medição: mostrar "registrar primeira" como CTA inline.

🚫 **Remover:**
- "Dashboard Executivo" (label do topo).
- "Fazer Check-in" (função obscura — definir o que é antes de mostrar).
- Cards "Iniciar Treino" e "Registro de Evolução" duplicados.
- "Feedback do Treino de Hoje" (movido para fim do treino, §4.3).
- Seção "Parceiros · Aguarde Novidades" inteira.

✅ **Atalho contextual inteligente:**
- Aparece apenas se: medidas há ≥7 dias sem atualizar, OU foto há ≥14 dias, OU peso não atualizado há ≥7 dias.
- Tom amigável, não cobrança: "Que tal atualizar suas medidas? Já faz 14 dias."

### 4.2 Tela: Treinos

#### Problemas atuais
- Coexistência de "Rotinas Interativas" e "Fichas PDF" — fragmentação de experiência.
- Cards "6X NA SEMANA" repetidos em datas diferentes sem versionamento claro.
- "Cronograma técnico de treinamento" — copy clínica.
- Sem indicador de qual rotina está ativa.
- Sem progresso de bloco/semana.

#### Estrutura nova

```
┌──────────────────────────────────────┐
│ [Header]                              │
│ Treinos                               │
│ Sua rotina e histórico                │
├──────────────────────────────────────┤
│ [PLANO ATIVO]                         │
│ ┌──────────────────────────────────┐ │
│ │ 🟢 ATIVO                          │ │
│ │ Hipertrofia 6x/semana             │ │
│ │ Semana 3 de 8 · 18 treinos feitos │ │
│ │ ────────● ○ ○ ○ ○                 │ │
│ │                                    │ │
│ │ Próximo: Upper · hoje 18:00       │ │
│ │ [Ver plano completo ›]            │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ [DIVISÃO DA SEMANA]                   │
│ ┌─────┬─────┬─────┬─────┬─────┬─────┐│
│ │ SEG │ TER │ QUA │ QUI │ SEX │ SÁB ││
│ │Push │Pull │Legs │Push │Pull │Legs ││
│ │ ✓   │hoje │ ·   │ ·   │ ·   │ ·   ││
│ └─────┴─────┴─────┴─────┴─────┴─────┘│
├──────────────────────────────────────┤
│ [HISTÓRICO]                           │
│ Hoje · Upper                          │
│   8 exercícios · 58 min · 12.450 kg  │
│   1 PR 🟢                              │
│ Ontem · Pull                          │
│   7 exercícios · 51 min · 10.200 kg  │
│ ...                                   │
├──────────────────────────────────────┤
│ [ARQUIVO DE FICHAS]                   │
│ Fichas anteriores em PDF (3) ›        │
└──────────────────────────────────────┘
```

#### Mudanças específicas

🔧 **Unificar Rotinas Interativas + Fichas PDF:**
- Existe **uma única rotina ativa** por vez. Versões anteriores vão para "Arquivo".
- PDF deixa de ser uma seção paralela e vira **botão dentro da rotina** ("Baixar PDF") para quem quer levar ao gym sem celular.

✅ **Plano Ativo com progresso:**
- Indicador visual de bloco (semana X de Y) com barra preenchida.
- "Próximo treino" resolve a dúvida principal do usuário.

✅ **Divisão da semana visual:**
- 6-7 chips horizontais com nome real ("Push", "Pull", "Legs"), não siglas como "PERN".
- Estado: ✓ feito (verde), "hoje" destacado, · futuro neutro, − descanso.

✅ **Histórico recente:**
- Lista cronológica decrescente dos últimos 7-14 treinos.
- Cada item: data, nome, duração, volume, badge de PR se houver.
- Tap → abre detalhe do treino (séries feitas, comparação com sessão anterior).

🚫 **Remover:**
- "Rotinas Interativas" como label (todas são interativas por padrão).
- "Estruturada Interativa" (jargão).
- "Protocolos" (substituir por "Treinos").
- "Cronograma técnico" (copy).

### 4.3 Tela: Treino em Execução (REDESIGN COMPLETO)

**Esta é a tela mais importante do app. O redesign aqui é não-negociável.**

#### Problemas atuais
- Três estados misturados em uma tela (preview, instrução, execução).
- "Anterior: --" sempre vazio (dado mais valioso da musculação).
- "Técnica: FS" sem explicação (jargão).
- "Descanso: 1:30" estático, não vira timer ativo.
- Sem progresso (1/8, série 1/4).
- Layout vertical força scroll constante.
- Sem haptic feedback.
- Botão "Baixar PDF" no meio do treino (redundante).

#### Arquitetura em 3 modos distintos

```
MODO 1 — PREVIEW (antes de iniciar)
MODO 2 — EXECUÇÃO (durante)
MODO 3 — RESUMO (ao terminar)
```

#### MODO 1 — Preview do treino

```
┌──────────────────────────────────────┐
│ ← Voltar                              │
│                                       │
│ Upper                                 │
│ 8 exercícios · ~58 min · vol. estim. │
│ 12.500 kg                              │
│                                       │
│ ┌──────────────────────────────────┐ │
│ │ Última sessão · seg 23 abr        │ │
│ │ Vol. 12.450 kg · 56 min · 1 PR    │ │
│ │ [Ver detalhes ›]                  │ │
│ └──────────────────────────────────┘ │
│                                       │
│ EXERCÍCIOS                            │
│ 1. Supino declinado · 4×8-10 · 1:30  │
│ 2. Supino inclinado · 4×8-10 · 1:30  │
│ 3. Crossover · 3×12 · 1:00            │
│ ...                                   │
│                                       │
│ [Baixar PDF] (botão secundário)       │
│                                       │
│ ┌──────────────────────────────────┐ │
│ │ ▶  COMEÇAR TREINO                 │ │  ← CTA dourado, sticky bottom
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

#### MODO 2 — Execução (FOCO TOTAL)

**Princípios:** sem bottom nav, sem header navegável, sem distrações. Uma série por vez, swipe para próxima. Tudo o que o usuário precisa para a série atual está visível sem scroll.

```
┌──────────────────────────────────────┐
│ ✕                          22:14 ⏱️   │  ← X = sair (com confirmação) / tempo decorrido
│ ━━━━━━━━━━○○○○○○○○                  │  ← progresso geral (3 de 8 exercícios)
├──────────────────────────────────────┤
│                                       │
│ Exercício 3 de 8                      │
│ Crossover                             │  ← --text-3xl, weight 700
│                                       │
│ ┌──────────────────────────────────┐ │
│ │ 📺 Ver demonstração (vídeo 12s)   │ │  ← opcional, lateral expansível
│ └──────────────────────────────────┘ │
│                                       │
│ SÉRIE 2 de 3                          │  ← --text-xs, caps, micro
│                                       │
│ ┌─────────────┬──────────────────┐   │
│ │ ANTERIOR    │ AGORA            │   │
│ │ 30 kg × 12  │ ┌──────┐ ┌─────┐ │   │
│ │ ──────────  │ │ 32.5 │ │ 12  │ │   │
│ │             │ │  kg  │ │ rep │ │   │
│ │             │ └──────┘ └─────┘ │   │
│ └─────────────┴──────────────────┘   │
│                                       │
│ Técnica: ⓘ Falha simples              │  ← tooltip ao tocar no ⓘ
│                                       │
│ ┌──────────────────────────────────┐ │
│ │ ✓ CONCLUIR SÉRIE                  │ │  ← CTA gigante dourado
│ └──────────────────────────────────┘ │
│                                       │
│ Próximo: Tríceps na corda · 3×12      │
└──────────────────────────────────────┘
```

#### Sub-modo: Descanso ativo (após concluir série)

```
┌──────────────────────────────────────┐
│ ✕                          22:14 ⏱️   │
├──────────────────────────────────────┤
│                                       │
│ Descansando…                          │
│                                       │
│         ┌─────────┐                   │
│         │  01:23  │  ← --text-5xl mono│
│         └─────────┘                   │
│         de 1:30                       │
│                                       │
│   ●●●●●●●●●●○○○○○                   │  ← barra circular preenchendo
│                                       │
│ [+15s]      [Pular]      [+30s]       │
│                                       │
│ Próxima série:                        │
│ Crossover · 3 de 3 · sugestão 32.5 kg│
└──────────────────────────────────────┘
```

Ao zerar: vibração longa + som opcional + tela transiciona automaticamente para próxima série, com peso e reps pré-preenchidos com a série anterior.

#### MODO 3 — Resumo do treino

```
┌──────────────────────────────────────┐
│                                       │
│        🎉                             │
│   Treino concluído                    │
│                                       │
│ 58 min · 8 exercícios · 24 séries     │
│                                       │
│ ┌──────────────────────────────────┐ │
│ │ VOLUME TOTAL                       │ │
│ │ 12.890 kg                          │ │
│ │ ↑ +3.5% vs última sessão          │ │
│ └──────────────────────────────────┘ │
│                                       │
│ 🏆 NOVOS RECORDES (1)                 │
│ • Supino declinado · 35 kg × 10       │
│   (anterior: 32.5 × 10)               │
│                                       │
│ ┌──────────────────────────────────┐ │
│ │ Como foi o treino de hoje?        │ │
│ │ 😩  😐  🙂  💪  🔥                │ │
│ │                                    │ │
│ │ [Adicionar nota ao coach]         │ │
│ └──────────────────────────────────┘ │
│                                       │
│ [SALVAR TREINO]   ← CTA primário      │
│ [Voltar pro Início] (ghost)           │
└──────────────────────────────────────┘
```

#### Mudanças específicas (críticas)

✅ **Card "Anterior" sempre presente, lado a lado com "Agora".** Se primeira vez: "Primeira vez · sugestão: comece leve, foque em técnica." Nunca "--".

✅ **Inputs de peso/reps com stepper grande** (botões +/− de 48×48) ao lado dos números. Mão suada não acerta teclado pequeno.

✅ **Timer de descanso automático.** Concluir série → timer dispara sozinho → som + vibração ao zerar → próxima série pré-preenchida.

✅ **Glossário de técnicas via tooltip.** "FS" → ícone "ⓘ" → toca → "Falha Simples: leve a série até não conseguir mais repetir com boa forma." Lista completa configurável pelo coach.

✅ **Vídeo curto de demonstração** (12-30s) opcional por exercício, expansível inline. Útil para iniciantes; ignorável para avançados.

✅ **Progresso visual no header** (barra fina + contador "3 de 8").

✅ **Saída protegida.** Tocar X durante execução → "Tem certeza? Seu progresso será salvo." Não perder dado por engano.

🚫 **Remover:**
- Botão "Baixar PDF" durante execução (movido para preview).
- Card "Visualização da Ficha" (substituído pelo modo Preview separado).
- Lista vertical de todos os exercícios visível durante execução (vai para drawer lateral expansível).

#### Notificação push do timer (avançado)
Quando descanso terminar e app estiver em segundo plano, push notification com botões de ação:
- "Próxima série feita ✓" (loga direto da notificação)
- "Mais 30s"
Apple Watch / Wear OS: replicação completa do modo descanso (estilo Reps & Sets).

### 4.4 Tela: Nutrição

#### Problemas atuais
- Único card "MINHA FICHA DE TRE..." (truncado).
- Tela praticamente vazia.
- PDF como única forma de plano alimentar.
- Texto truncado é bug visual.

#### Estrutura nova (MVP)

A versão completa de tracking de macros é roadmap futuro. O **MVP defensável** que já elimina a tela vazia atual:

```
┌──────────────────────────────────────┐
│ Nutrição                              │
│ Seu plano e tracking                  │
├──────────────────────────────────────┤
│ [PLANO ATIVO]                         │
│ ┌──────────────────────────────────┐ │
│ │ 🎯 Ganho de massa · 3.200 kcal    │ │
│ │ P 200g · C 400g · G 90g           │ │
│ │ Atualizado em 29/03/2026          │ │
│ │ [Ver plano completo ›]            │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ [REFEIÇÕES DE HOJE]   3 de 6 feitas   │
│ ┌──────────────────────────────────┐ │
│ │ ✓ 07:00 Café da manhã             │ │
│ │ ✓ 10:00 Lanche 1                  │ │
│ │ ✓ 13:00 Almoço                    │ │
│ │ ○ 16:00 Lanche 2                  │ │
│ │ ○ 19:30 Jantar                    │ │
│ │ ○ 22:00 Ceia                      │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ [ÁGUA]      💧💧💧💧○○○○ 4/8 copos    │
│ [+ Registrar copo]                    │
├──────────────────────────────────────┤
│ [LISTA DE COMPRAS] (gerada do plano)  │
│ Esta semana ›                         │
└──────────────────────────────────────┘
```

#### Mudanças específicas

✅ **Plano alimentar como card resumido** (calorias, macros) + link para detalhe.

✅ **Refeições do dia com check-off** simples. Cada refeição tem ingredientes, gramas, horário.

✅ **Tracking de água** (visual de copos preenchendo). Função simples, alta retenção.

✅ **Lista de compras gerada do plano.** Diferencial sobre concorrentes amadores.

🔧 **Tela detalhe de refeição:**
- Lista de ingredientes com gramas.
- Sugestões de substituição ("Sem frango? Tente carne magra 150g").
- Botão "Marcar como feita" + "Tirar foto" (opcional, vai pro coach revisar).

🚫 **Remover:**
- Texto truncado "MINHA FICHA DE TRE..." — limite de string sempre com ellipsis ou wrap.
- Tela vazia preta.

**Roadmap futuro (não MVP):**
- Tracking de macros via foto (AI scanner como Foodvisor).
- Integração com MyFitnessPal/Cronometer.
- Receitas com vídeo curto.

### 4.5 Tela: Medidas

#### Problemas atuais
- **Dados absurdos exibidos** (Tórax 10cm, Cintura 12cm, Panturrilha 7cm). Confirmado: são dados de teste inseridos pelo próprio usuário no Supabase, não bug de unidade. **A solução não é corrigir backend — é adicionar validação de input com warnings de outlier amigáveis** para evitar que dados claramente irreais cheguem ao banco no futuro.
- Formulário burocrático com 9 campos, todos obrigatórios visualmente.
- Sem gráficos de evolução.
- Sem comparação histórica.
- "Peso atual 82 kg" duplicado com Dashboard.

#### Estrutura nova

```
┌──────────────────────────────────────┐
│ Medidas                               │
│ Sua evolução em números               │
├──────────────────────────────────────┤
│ [TENDÊNCIA — gráfico principal]       │
│ Peso · últimos 90 dias                │
│   ───╱╲___╱╲╲                         │
│  84 ─────────────                     │
│  82 ─────────────  ← linha tracejada  │
│     meta                              │
│ [ 7d | 30d | 90d | 1ano ]            │
│                                       │
│ Atual: 82.0 kg · −1.2 kg em 30 dias  │
├──────────────────────────────────────┤
│ [SUAS MEDIDAS · última atualização    │
│  29/03/2026 · 30 dias atrás]          │
│                                       │
│ Peso         82 kg     ↓ −1.2 (30d)  │
│ Tórax        108 cm    ↑ +2 (60d)    │
│ Cintura      84 cm     ↓ −2 (60d)    │
│ Braço E/D    36/37     ↑ +1/+1 (60d) │
│ Coxa E/D     58/57     = (60d)        │
│ Panturrilha  39 cm     = (60d)        │
│                                       │
│ [REGISTRAR NOVA MEDIDA]               │
├──────────────────────────────────────┤
│ [HISTÓRICO COMPLETO ›]                │
└──────────────────────────────────────┘
```

#### Mudanças específicas

🛡️ **PRIORIDADE MÁXIMA — Validação de input no formulário.** Como os dados vêm do próprio usuário, implementar três camadas:
1. **Hard limits** que bloqueiam submit: peso entre 30–300kg, medidas corporais entre 10–250cm. Fora disso, o botão "Salvar" fica desabilitado e o input mostra erro vermelho.
2. **Soft warnings (outlier)** que pedem confirmação: se o valor digitado é >25% diferente da última medida da mesma categoria, mostrar diálogo "Você digitou 184 cm de cintura. Sua última medida era 84 cm. Quer revisar?". Mantém a flexibilidade mas evita erros de digitação.
3. **Realista por categoria:** definir ranges plausíveis para adultos. Ex.: tórax 70–150cm, panturrilha 25–55cm. Valores fora avisam mas não bloqueiam.
4. **Limpeza retroativa opcional:** script SQL no Supabase que sinaliza (não deleta) registros de medidas com valores fora dos hard limits, para o coach revisar manualmente.

✅ **Gráfico hero** de tendência de peso. Toggle 7d/30d/90d/1ano.

✅ **Tabela de medidas com delta** (vs última medição em mesma janela).

🔧 **Formulário "Registrar nova medida":**
- **Todos os campos opcionais.** Salvar parcial é permitido.
- Pré-preencher com última medida (smart default), usuário ajusta só o que mudou.
- Validação: peso entre 30-300kg, medidas corporais entre 10-200cm. Avisar se valor parece outlier ("Tem certeza? Sua última medida era 84cm").
- Após salvar: animação de confirmação + comparação imediata ("Você perdeu 1.2 cm na cintura desde a última medição 🎉").

✅ **Lembrete inteligente** (push opcional): "Ei, faz 14 dias desde sua última medição. Que tal hoje?"

🔮 **Roadmap:** integração com balança bluetooth (Renpho, Xiaomi, Withings).

### 4.6 Tela: Fotos de Evolução

#### Problemas atuais
- Ícone "C" no card "Lado" parece glyph quebrado (bug renderização).
- Empty state gigante e pouco útil.
- Sem comparação before/after.
- Sem guia de pose, luz, horário.
- Sem privacidade adicional.

#### Estrutura nova

```
┌──────────────────────────────────────┐
│ Fotos                                 │
│ Acompanhe sua transformação           │
├──────────────────────────────────────┤
│ [COMPARADOR — se ≥2 sessões]          │
│ ┌─────────┐  ┌─────────┐             │
│ │  ANTES  │  │  AGORA  │             │
│ │   📸    │  │   📸    │             │
│ │ 30 dias │  │  hoje   │             │
│ └─────────┘  └─────────┘             │
│ ━━━━━━━━●━━━━━━━━━━━━━━              │
│ ← deslizar para sobrepor              │
├──────────────────────────────────────┤
│ [TIMELINE]                            │
│ 28 abr · 25 mar · 28 fev · 30 jan     │
│ [📸][📸][📸][📸]                       │
├──────────────────────────────────────┤
│ [REGISTRAR NOVA SESSÃO]               │
│ ┌──────────────────────────────────┐ │
│ │ Tire 3 fotos: frente, lado, costas│ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ 💡 Mesma roupa, mesma luz,        │ │
│ │    mesmo horário. Manhã em jejum  │ │
│ │    é o ideal.                     │ │
│ │                                    │ │
│ │ [Frente] [Lado] [Costas]          │ │
│ │   📸       📸      📸             │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ 🔒 Suas fotos são privadas e          │
│ visíveis apenas pelo seu coach.       │
│ [Ativar trava biométrica ›]           │
└──────────────────────────────────────┘
```

#### Mudanças específicas

🔧 **Corrigir glyph "C" quebrado** no card "Lado" — verificar fallback de ícone.

✅ **Comparador slider before/after** (drag para sobrepor uma foto sobre outra). Esse é o **único feedback que move pessoas no longo prazo**.

✅ **Timeline horizontal scrollable** com thumbnails — fácil identificar evolução visual.

✅ **Empty state educativo:**
- Diagrama simples de pose recomendada (silhueta).
- Dica de luz, horário, roupa.
- CTA para tirar primeira foto.

✅ **Lock biométrico** (FaceID/TouchID) opcional na seção de fotos. Ganha confiança imediata em adultos que valorizam privacidade.

✅ **Marca d'água invisível** no metadata + cripto end-to-end (roadmap segurança).

🚫 **Remover:**
- Tela vazia gigante atual.
- Cards de upload separados sem contexto educativo.

### 4.7 Tela: Ranking (mantido — redesign para funcionar com poucos atletas)

#### Problemas atuais
- "1 atletas ativos" com o próprio usuário em #1 é constrangedor — o produto se autodenuncia vazio.
- Card central com avatar vazio e nome "Luiz · 60 pontos" sem contexto sobre como esses pontos foram ganhos.
- "Pontos" sem regra explícita: quem ganha 60 pts? Como? Sem essa transparência, números parecem arbitrários.
- Texto "Os atletas mais dedicados da consultoria" promete competição que ainda não existe.
- Pluralização errada: "1 atletas ativos" deveria ser "1 atleta ativo".

#### Estratégia de redesign

Já que ranking permanece como item de produto, **a tela precisa funcionar bem em três estados distintos**, sem nunca parecer vazia:

1. **Solo (1 atleta — o próprio usuário)** — foco total em métricas pessoais e progresso individual. Não mostrar leaderboard.
2. **Pequeno grupo (2–9 atletas)** — mostrar tabela compacta, mas com ênfase em "evolução pessoal" no topo.
3. **Grupo grande (≥10 atletas)** — mostrar leaderboard completo + posição relativa.

#### Estrutura nova — Estado SOLO (1 atleta)

```
┌──────────────────────────────────────┐
│ Ranking                               │
│ Sua jornada esta semana               │
├──────────────────────────────────────┤
│ [SEUS PONTOS — hero]                  │
│ ┌──────────────────────────────────┐ │
│ │            60 pts                  │ │
│ │   ↑ +15 pts esta semana            │ │
│ │                                    │ │
│ │ Próxima meta: 100 pts (Bronze)    │ │
│ │ ━━━━━━━━━━━━○────────              │ │
│ │ 60 / 100                           │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ [COMO GANHAR PONTOS]                  │
│ ✓ Treino concluído         +5 pts    │
│ ✓ Streak diário (por dia)  +1 pt     │
│ ✓ PR batido                +10 pts   │
│ ✓ Medida atualizada        +3 pts    │
│ ✓ Foto de evolução         +5 pts    │
├──────────────────────────────────────┤
│ [SUAS CONQUISTAS]                     │
│ 🏆 Bronze · 100 pts        ━━━━○──   │
│ 🥈 Prata · 250 pts          ────     │
│ 🥇 Ouro · 500 pts           ────     │
│ 💎 Diamante · 1000 pts      ────     │
├──────────────────────────────────────┤
│ [CONVIDE AMIGOS — discreto]           │
│ "Treina sozinho? Quando outros        │
│ atletas se juntarem à consultoria,    │
│ vocês vão se ver aqui."               │
└──────────────────────────────────────┘
```

#### Estrutura nova — Estado COMUNIDADE (≥2 atletas)

```
┌──────────────────────────────────────┐
│ Ranking                               │
│ 8 atletas ativos esta semana          │
├──────────────────────────────────────┤
│ [SUA POSIÇÃO]                         │
│ ┌──────────────────────────────────┐ │
│ │ #3 de 8                            │ │
│ │ 60 pts · ↑ subiu 1 posição         │ │
│ │ Faltam 12 pts para o #2            │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ [LEADERBOARD]                         │
│ #1 🥇 João S.       142 pts           │
│ #2 🥈 Maria F.       72 pts           │
│ #3 🥉 Você          60 pts  ← (highlight) │
│ #4    Pedro M.       55 pts           │
│ #5    Ana L.         48 pts           │
│ ...                                   │
├──────────────────────────────────────┤
│ [COMO GANHAR PONTOS]                  │
│ (mesmo bloco do estado solo)          │
└──────────────────────────────────────┘
```

#### Mudanças específicas

🔧 **Lógica condicional de exibição** baseada em `count(active_athletes_this_week)`:
- `count == 1` → Estado SOLO (foco em métricas pessoais).
- `count >= 2` → Estado COMUNIDADE (com leaderboard).
- Sem mudança de bottom nav (Ranking continua como tab).

✅ **Regra de pontuação explícita visível na tela.** Sem isso, pontos parecem arbitrários. A lista "Como ganhar pontos" educa e motiva ações concretas.

✅ **Sistema de tier (Bronze/Prata/Ouro/Diamante)** dá objetivo concreto mesmo sem competição com outros. Funciona estilo Whoop strain ou Apple Fitness rings.

✅ **Métrica "atletas ativos esta semana"** em vez de "ativos total". Garante que o número exibido nunca é constrangedoramente baixo (todos os ativos da semana, não cadastrados há anos).

✅ **Pluralização correta:** "1 atleta ativo" / "8 atletas ativos".

✅ **Privacidade:** opção no perfil para "atleta oculto no ranking" — quem não quer aparecer, fica fora.

🔧 **Avatar com fallback:** se sem foto, iniciais coloridas sobre `--brand-subtle`. Nunca círculo vazio.

🚫 **Remover:**
- "Os atletas mais dedicados da consultoria" (copy promete o que ainda não existe).
- "Elite Athlete" como subtítulo do usuário.
- Avatar quadrado vazio.
- Card central ocioso quando sozinho.

#### Implementação no Supabase

> O DDL completo (com nomes reais em português, RLS, triggers e backfill) está em `MIGRATION-PLAN.md` §10 — Sprint 6.
>
> Resumo do que será criado:
>
> - **View `v_atletas_ativos_semana`** — `COUNT(DISTINCT aluno_id)` em `historico_treinos` da semana corrente. Alimenta o badge da tela de Ranking.
> - **View `v_leaderboard`** — ranking de alunos com `pontuacao_alunos.total_pontos`, `streak_atual`, e `posicao` via `ROW_NUMBER()`, filtrando `arquivado = false` e `oculto_no_ranking = false`.
> - **Função `calcular_pontos_aluno(p_aluno_id UUID)`** — soma 5pt/treino (de `historico_treinos`) + 10pt/PR (de `recordes_pessoais`) + 3pt/medida (de `medidas_aluno`) + 5pt/foto (de `fotos_evolucao`) + 1pt/dia de streak (da view `v_streak_aluno`), e faz `UPSERT` em `pontuacao_alunos`.
> - **Triggers** em `historico_treinos`, `recordes_pessoais`, `medidas_aluno`, `fotos_evolucao` que chamam `calcular_pontos_aluno()` automaticamente após INSERT/DELETE.
> - **Backfill** que recalcula pontos de todos os alunos uma vez (depois disso, triggers cuidam).
>
> A tabela `pontuacao_alunos` já existe no schema atual — só será populada/recalculada pela nova função.

### 4.8 Tela: Perfil

#### Problemas atuais
- "PERFIL DO ATLETA · Configurações de Identidade & Acesso" — copy inflada.
- "ALTA PERFORMANCE" como subtítulo — autoatribuição vazia.
- Avatar quadrado vazio (placeholder feio).
- "Trocar Senha", "Suporte Técnico" — copy técnica.
- Faltam configurações importantes (notificações, unidade, tema, idioma, integrações, exportar dados, **excluir conta**).
- **Ausência de "excluir conta" é não-conformidade com LGPD.**

#### Estrutura nova

```
┌──────────────────────────────────────┐
│ Perfil                          [✕]   │
├──────────────────────────────────────┤
│         ┌───────────┐                 │
│         │    LI     │  ← avatar c/    │
│         │ (iniciais)│     iniciais ou │
│         └───────────┘     foto        │
│         📸 trocar foto                 │
│                                       │
│         Luiz Irias                    │
│         Cliente desde mar/26          │
│                                       │
├──────────────────────────────────────┤
│ DADOS PESSOAIS                        │
│   Nome · Luiz Irias              ›    │
│   E-mail · iriasn...@gmail.com   ›    │
│   Data de nascimento             ›    │
│   Altura, sexo, objetivo         ›    │
├──────────────────────────────────────┤
│ TREINO                                │
│   Unidade de medida · kg / cm    ›    │
│   Incremento padrão · 2.5 kg     ›    │
│   Sons e vibração · ativados     ›    │
├──────────────────────────────────────┤
│ NOTIFICAÇÕES                          │
│   Lembrete de treino             ›    │
│   Lembrete de medidas            ›    │
│   Mensagens do coach             ›    │
├──────────────────────────────────────┤
│ INTEGRAÇÕES                           │
│   Apple Health           [conectar]   │
│   Google Fit             [conectar]   │
│   Balança bluetooth      [conectar]   │
├──────────────────────────────────────┤
│ APARÊNCIA                             │
│   Tema · escuro                  ›    │
│   Idioma · português             ›    │
├──────────────────────────────────────┤
│ SEGURANÇA                             │
│   Trocar senha                   ›    │
│   Trava biométrica               ›    │
├──────────────────────────────────────┤
│ AJUDA                                 │
│   Falar com a equipe             ›    │
│   Termos de uso                  ›    │
│   Política de privacidade        ›    │
│   Exportar meus dados            ›    │
├──────────────────────────────────────┤
│ [Sair]                                │
│ [Excluir minha conta]   ← --danger    │
└──────────────────────────────────────┘
```

#### Mudanças específicas

🔧 **Header simplificado:** "Perfil" e fim. Sem "Configurações de Identidade & Acesso".

🔧 **Avatar:** se sem foto, mostrar **iniciais coloridas** (ex: "LI" sobre `--brand-subtle`). Nunca quadrado vazio.

🚫 **Remover "Alta Performance"** como tagline. Substituir por dado factual ("Cliente desde mar/26").

🔧 **Reescrever copy** em todo lugar:
- "Credenciais de Atleta" → "Dados pessoais"
- "Encerrar sessão" → "Sair"
- "Suporte Técnico" → "Falar com a equipe"
- "Acionar equipe de desenvolvimento" → remover essa frase

✅ **Adicionar configurações essenciais:**
- Unidade de medida (kg/lb, cm/in).
- Tema (escuro/claro/sistema).
- Idioma.
- Integrações (Apple Health, Google Fit, balança BT).
- Notificações granulares.
- Sons e vibração on/off.
- Trava biométrica.

✅ **Conformidade LGPD (obrigatório):**
- "Exportar meus dados" — gera CSV ou JSON com todos os dados do usuário.
- "Excluir minha conta" — fluxo de confirmação (3 passos, com explicação do que será apagado).
- Links para Termos e Privacidade.


---

## 5. UX Writing — Guia de Tom

### Princípios

1. **Adulto, calmo, direto.** Falar como um coach experiente falaria por WhatsApp: sem grandiloquência, sem condescendência.
2. **Frases curtas.** Máximo 14 palavras por frase em microcopy. Ler é fricção; ler menos é melhor.
3. **Português brasileiro natural.** Sem traduções literais do inglês ("Vamos lá!" sim; "Vamos chutar!" não).
4. **Verbos no imperativo direto** em CTAs. "Começar treino", não "Clique aqui para começar".
5. **Números antes de adjetivos.** "12 dias seguidos 🔥" é mais forte que "Sequência incrível!".
6. **Sem emojis em interfaces sérias.** Reservar emojis para celebração (🎉 fim de treino, 🏆 PR, 🔥 streak). Em headers e copy padrão: zero emoji.

### Tabela de substituições

| ❌ Atual                           | ✅ Substituir por                    |
|------------------------------------|--------------------------------------|
| Dashboard Executivo                 | Início                               |
| Bem-vindo, Luiz                    | Olá, Luiz                            |
| Organize sua rotina de elite       | (remover, redundante)                |
| Fazer Check-in                     | (definir o que é antes de mostrar)   |
| Iniciar Treino                     | Começar treino                       |
| Registro de Evolução               | Registrar progresso                  |
| Treinos Concluídos                 | Treinos no mês                       |
| Rotinas Ativas                     | Plano ativo                          |
| Feedback do Treino de Hoje         | Como foi o treino?                   |
| Apenas seu coach poderá ver        | Visível só para o seu coach          |
| Aguarde Novidades                  | (remover seção até ter conteúdo)     |
| Em breve seu coach...              | (remover)                            |
| Cronograma técnico de treinamento  | Sua rotina de treinos                |
| 6 Protocolos                       | 6 treinos                            |
| Rotinas Interativas                | (remover label, todas são interativas)|
| Estruturada Interativa             | (remover label)                      |
| Fichas PDF (Protocolos)            | Arquivo de fichas                    |
| Plano Alimentar                    | Nutrição                             |
| Sua nutrição estratégica para resultados máximos | Seu plano alimentar e tracking |
| MINHA FICHA DE TRE...              | (corrigir truncagem)                 |
| Painel de Controle                 | (remover)                            |
| Meu Progresso                      | Medidas                              |
| Seus números não mentem            | (remover, copy clichê)               |
| Salvar Resultados                  | Salvar medidas                       |
| Última Atualização                 | Atualizado em                        |
| Fotos de Evolução · Seu Progresso  | Fotos de evolução                    |
| Acompanhe sua transformação visual através do tempo | Acompanhe sua evolução |
| Pose Recomendada                   | (mostrar diagrama, não label)        |
| Enviar Foto                        | Tirar foto                           |
| Sem Registros Visuais              | Comece sua linha do tempo            |
| Sua jornada começa com o primeiro clique | (remover, pretensioso)         |
| Ranking de Desempenho              | Comunidade (se mantiver) ou remover  |
| Os atletas mais dedicados da consultoria | (remover)                       |
| Seus Pontos                        | Pontos                               |
| Sua Posição                        | Posição                              |
| Classificação Geral                | Atletas                              |
| 1 Atletas Ativos                   | (não mostrar até ter 10+)            |
| Elite Athlete                      | (remover)                            |
| Pontuação Total                    | Pontos                               |
| Perfil do Atleta                   | Perfil                               |
| Configurações de Identidade & Acesso | (remover)                          |
| Alta Performance                   | Cliente desde [data]                 |
| Encerrar Sessão                    | Sair                                 |
| Credenciais de Atleta              | Dados pessoais                       |
| E-mail de Acesso                   | E-mail                               |
| Trocar Senha                       | Alterar senha                        |
| Atualizar Perfil                   | Editar dados                         |
| Sua data de nascimento e informações pessoais | Nascimento, altura, objetivo |
| Suporte Técnico                    | Falar com a equipe                   |
| Acionar equipe de desenvolvimento  | (remover)                            |
| Visualização da Ficha              | Pré-visualização do treino           |
| Clique em "Iniciar Treino" para entrar no modo de execução | (não mostrar instrução in-line, fluxo deve ser óbvio) |
| Anterior: --                       | Primeira vez · comece leve           |
| TÉCNICA: FS                        | Falha simples ⓘ                      |
| BAIXAR PDF                         | Baixar PDF                           |
| INICIAR TREINO                     | Começar treino                       |

### Microcopy de Empty States

**Sem treino hoje:**
> Hoje é dia de descanso.
> Aproveite — recuperação é treino também.

**Primeira vez na tela de medidas:**
> Suas medidas vão contar a história do seu trabalho.
> Comece registrando seu peso e tórax — o resto pode vir depois.
> [Registrar primeira medida]

**Primeira vez em fotos:**
> Comece sua linha do tempo.
> 3 fotos a cada 4 semanas: frente, lado, costas.
> Mesma roupa, mesma luz, mesmo horário — assim a comparação é justa.
> [Tirar primeira foto]

**Sem PRs ainda:**
> Nenhum recorde batido… ainda.
> Seus PRs aparecem aqui automaticamente conforme você treina.

### Microcopy de Confirmação

**Série concluída:**
> ✓ (com vibração + flash de cor)

**Treino salvo:**
> Treino salvo. Bom trabalho.

**Medida registrada com mudança favorável:**
> Registrado. Cintura −1.2 cm em 30 dias.

**Medida registrada sem mudança:**
> Registrado.

**PR batido:**
> 🏆 Novo recorde no supino: 35 kg × 10.
> Anterior: 32.5 × 10.

### Microcopy de Erro

**Falha de rede:**
> Sem conexão agora.
> Seu treino segue salvo no aparelho — sincroniza assim que voltar a internet.

**Valor fora do esperado em medida:**
> Você digitou 184 cm de cintura.
> Sua última medida era 84 cm. Quer revisar?
> [Manter] [Editar]

**Tentativa de excluir conta:**
> Excluir sua conta é permanente.
> Você vai perder: seus treinos, medidas, fotos, histórico de PRs.
> Para confirmar, digite EXCLUIR.
> [______]
> [Cancelar] [Excluir definitivamente]

---

## 6. Microinterações

Microinterações são as pequenas animações e feedbacks que fazem o app sentir vivo. Elas são **a diferença entre um produto de sucesso e um clone de planilha**.

### 6.1 Concluir série

Sequência ao tocar "✓ Concluir série":
1. **0ms** — Botão diminui para scale(0.96).
2. **80ms** — Vibração curta (`UIImpactFeedbackGenerator.medium` em iOS).
3. **120ms** — Botão expande para scale(1.02), fundo flash para `--success`.
4. **300ms** — Card da série transiciona para estado "concluído" (opacity 0.65, ícone check).
5. **400ms** — Tela transiciona para modo descanso (slide up).
6. **600ms** — Timer de descanso começa contagem regressiva.

### 6.2 Bater PR

Sequência quando série bate recorde:
1. Vibração longa (`notificationOccurred(.success)`).
2. Tela escurece levemente, modal aparece com fundo `--success-subtle` e halo `--glow-success`.
3. Texto "🏆 NOVO RECORDE" entra com slide-up + fade.
4. Som opcional (toggleável).
5. Auto-dismiss em 2.5s ou tap para fechar.

### 6.3 Streak crescendo

Quando o usuário completa um treino que estende o streak:
- Ícone de chama 🔥 cresce de scale(1) para scale(1.4) e volta, em `--ease-spring`.
- Número incrementa com transição numérica (libs: `react-spring`, `framer-motion`).

### 6.4 Pull-to-refresh

- Em qualquer tela com lista (Treinos, Histórico, Nutrição).
- Indicador customizado: ícone de halter girando.
- Haptic light ao acionar refresh.

### 6.5 Skeleton loaders

- Toda fetch de dados que demora >300ms.
- Forma do skeleton imita exatamente o componente final.
- Shimmer suave (1.5s loop, gradient diagonal).
- Substituição por conteúdo real com fade 200ms.

### 6.6 Transições entre telas

- iOS: usar transição nativa (slide horizontal).
- Android: usar transição `Material shared element` quando aplicável.
- Modais: slide up + scrim fade (`backdrop-filter: blur(8px)` opcional).

### 6.7 Estados de hover/press

Toda área tocável tem estado pressed visualmente:
- Botões: scale(0.98) + opacidade 0.9.
- Cards interativos: background um nível mais claro.
- Links: underline + cor mais clara.

### 6.8 Reduced motion

Respeitar `prefers-reduced-motion: reduce`:
- Eliminar animações de scale/spring.
- Manter feedback de cor (instantâneo).
- Manter haptic.
- Cross-fade simples para transições.

---

## 7. Acessibilidade (WCAG AA)

Acessibilidade não é caridade. **15-25% dos seus usuários adultos têm alguma necessidade** (vista cansada, daltonismo, motricidade reduzida, idade avançada). Atender essas pessoas é também atender o público que está envelhecendo bem e treinando aos 50+.

### 7.1 Contraste

- **Texto corpo:** mínimo 4.5:1.
- **Texto grande (≥18pt) e elementos não-textuais:** mínimo 3:1.
- Validar com Stark, Contrast app, ou DevTools nativo do navegador.
- A paleta proposta foi calibrada para passar AA. `--text-primary` (#F5F5F7) sobre `--surface-0` (#0A0A0B) tem contraste de 17.8:1 (passa AAA).

### 7.2 Tamanho de fonte e zoom

- Suportar dynamic type (iOS) e font scaling (Android).
- **Nada de texto abaixo de 12px**, exceto labels que dobram com ícones.
- Layout não pode quebrar com zoom até 200%.

### 7.3 Touch targets

- **Mínimo 44×44 pt (iOS) / 48×48 dp (Android).** Nunca menor.
- Espaçamento mínimo entre alvos clicáveis: 8px.

### 7.4 Daltonismo

- Cores semânticas SEMPRE acompanhadas de **ícone ou texto**, nunca cor sozinha.
- Verde + vermelho proibidos como única forma de distinguir estados (deuteranopia).
- Verificar com simulador de daltonismo (Color Oracle, Sim Daltonism).

### 7.5 Screen readers

- Toda imagem com `alt` significativo (ou `alt=""` se decorativa).
- Botões com `aria-label` quando ícone-only.
- Estados (selecionado, expandido) anunciados via `aria-`.
- Ordem de foco lógica (tab order).
- Skip-to-content em telas longas.

### 7.6 Sem dependência de gestos complexos

- Toda função acionável por gesto complexo (swipe, long-press) deve ter alternativa de toque simples.
- Exemplo: deletar item por swipe → também tem botão "..." para abrir menu com "Excluir".

### 7.7 Modo "Coach" para iniciantes

Bandeira opcional no perfil: "Sou novo na musculação". Quando ativada:
- Vídeos de demonstração se expandem por padrão em vez de colapsados.
- Tooltips explicativos ficam visíveis em vez de em hover.
- Glossário de técnicas sempre acessível na tela de execução.

---

## 8. LGPD e Privacidade

### 8.1 Conformidade obrigatória

Por força da **Lei Geral de Proteção de Dados (Lei 13.709/2018)**, o app deve oferecer:

✅ **Consentimento granular** no onboarding:
- Aceite explícito de coleta de dados (não pode ser pré-marcado).
- Separar consentimentos: dados básicos, fotos corporais, integrações com wearables, marketing.

✅ **Acesso aos dados** (Art. 18, I):
- Tela "Meus dados" no perfil.
- Botão "Baixar meus dados" — gera ZIP com CSV/JSON de tudo (treinos, medidas, fotos em URL temporária).

✅ **Exclusão de conta** (Art. 18, VI):
- Botão "Excluir minha conta" no perfil.
- Fluxo de 2-3 passos com confirmação.
- Após exclusão: dados anonimizados ou deletados em ≤30 dias.
- E-mail de confirmação automático.

✅ **Política de Privacidade** clara, em português, ≤ 2.000 palavras, escaneável com headers.
✅ **Termos de Uso** linkáveis.
✅ **Encarregado de Dados (DPO)** identificável: e-mail de contato no footer e na política.

### 8.2 Privacidade de fotos corporais (sensível)

- **Criptografia em repouso e em trânsito.** Nada em S3 público.
- **Lock biométrico** opcional na seção de fotos.
- **Não compartilhar com terceiros** (analytics, ads). Marcar como dado "sensível" no DPA.
- Permitir excluir fotos individuais a qualquer momento.

### 8.3 Cookies e analytics

- Banner de consentimento de cookies se for web.
- Em mobile: apresentar opções no onboarding (analytics on/off, crash reports on/off).
- Não usar pixel do Facebook/TikTok sem consentimento explícito.

---

## 9. Roadmap de Implementação (priorizado)

### Sprint 0 — Higiene crítica (3-5 dias)

**Objetivo:** parar a sangria. Coisas que estão ativas e destruindo confiança.

- [ ] 🛡️ Implementar validação de input nas medidas (hard limits + soft warnings de outlier).
- [ ] Limpar/sinalizar registros do Supabase com valores absurdos (script SQL).
- [ ] Corrigir truncagem "MINHA FICHA DE TRE..." (text-overflow).
- [ ] Corrigir glyph "C" quebrado em Fotos > Lado.
- [ ] Remover seção "Parceiros · Aguarde Novidades" inteira.
- [ ] Corrigir pluralização: "1 atletas ativos" → "1 atleta ativo".
- [ ] Adicionar "Excluir conta" no perfil (LGPD).

### Sprint 1 — Sistema de design (1 semana)

**Objetivo:** fundamento para tudo depois.

- [ ] Implementar tokens CSS (paleta, tipografia, espaçamento, radius).
- [ ] Substituir fontes (Inter como única família).
- [ ] Reescrever todos os botões/cards/inputs com novos tokens.
- [ ] Substituir set de ícones por Lucide.
- [ ] Criar componentes base (Button, Card, Input, EmptyState, Toast, Skeleton).
- [ ] Reduzir bottom nav para 5 itens (unificar Medidas+Fotos em "Progresso").

### Sprint 2 — Tela de execução (2 semanas)

**Objetivo:** redesign do coração do produto.

- [ ] Modo Preview separado de Execução.
- [ ] Modo Execução: tela cheia, sem nav, foco em uma série.
- [ ] Card "Anterior" com peso/reps da última sessão.
- [ ] Inputs com stepper +/− grandes.
- [ ] Timer de descanso ativo, automático ao concluir série.
- [ ] Vibração + som ao terminar timer.
- [ ] Tooltip de glossário de técnicas.
- [ ] Modo Resumo com volume total, PRs e feedback.
- [ ] Auto-save offline (não perder progresso).

### Sprint 3 — Dashboard útil (1 semana)

**Objetivo:** primeira tela vira motor de retenção.

- [ ] Hero card "Treino de hoje" com volume da última sessão e CTA.
- [ ] Streak semanal visual (7 bolinhas).
- [ ] KPIs com delta temporal (vs 30d).
- [ ] Atalho contextual inteligente (medidas/fotos vencidas).
- [ ] Reescrever copy do header.
- [ ] Remover "Check-in" obscuro.

### Sprint 4 — Treinos & Nutrição básica (1-2 semanas)

- [ ] Tela Treinos: plano ativo destacado, divisão da semana visual.
- [ ] Histórico de treinos com volume e PRs.
- [ ] Unificar Rotinas + PDF (PDF vira download dentro da rotina).
- [ ] Tela Nutrição: plano ativo + lista de refeições com check + tracking de água.
- [ ] Lista de compras (gerada do plano).

### Sprint 5 — Medidas, Fotos, Perfil (1-2 semanas)

- [ ] Gráfico de tendência de peso na tela de medidas.
- [ ] Tabela com delta vs janela temporal.
- [ ] Formulário com campos opcionais e smart defaults.
- [ ] Slider before/after em fotos.
- [ ] Timeline de fotos.
- [ ] Lock biométrico em fotos.
- [ ] Perfil reescrito com todas configurações novas.
- [ ] Exportar dados (LGPD).

### Sprint 6 — Microinterações & Polimento (1 semana)

- [ ] Haptic feedback em todas ações importantes.
- [ ] Animações de PR e streak.
- [ ] Skeleton loaders.
- [ ] Pull-to-refresh.
- [ ] Pré-cache de dados (offline-first real).
- [ ] Transições entre telas.

### Backlog (médio prazo)

- Integração Apple Health / Google Fit / Whoop.
- Tracking de macros via foto (AI scanner).
- Apple Watch / Wear OS app.
- Modo coach com vídeo-call (à la Future).
- Notificações push inteligentes (timer, lembretes contextuais).
- Voz para logar série ("135 por 8") — modelo Vora.
- Plate calculator visual.
- Vídeo curto de demonstração por exercício.
- Exportar treinos em CSV.

---

## 10. Checklist Final — Antes de Lançar

### Design
- [ ] Tokens CSS implementados em variáveis CSS ou ThemeProvider.
- [ ] Inter (ou alternativa escolhida) carregada com `font-display: swap`.
- [ ] Lucide Icons substituiu set anterior.
- [ ] Bottom nav com 5 itens fixos.
- [ ] Nenhum CAPS em frases (só em microlabels ≤2 palavras).
- [ ] Dourado em ≤10% da tela.
- [ ] Cores semânticas implementadas (sucesso, atenção, erro, info).

### Conteúdo
- [ ] Toda copy passou pela tabela de substituições (§5).
- [ ] Empty states com CTA + dica útil.
- [ ] Nenhuma seção "Aguarde novidades" visível.
- [ ] Termos e Privacidade acessíveis no perfil.
- [ ] Tom uniforme (adulto, calmo, direto) em todas as telas.

### Funcional
- [ ] Tela de execução com peso anterior visível.
- [ ] Timer de descanso automático com som/vibração.
- [ ] Logar série em ≤15 segundos.
- [ ] Funciona offline (mock testar avião).
- [ ] Pull-to-refresh em todas as listas.

### Acessibilidade
- [ ] Contraste 4.5:1 validado em todas as telas.
- [ ] Touch targets ≥44px.
- [ ] Suporte a screen readers (VoiceOver/TalkBack).
- [ ] `prefers-reduced-motion` respeitado.

### LGPD
- [ ] "Excluir conta" funcional.
- [ ] "Exportar dados" gera arquivo válido.
- [ ] Política de Privacidade publicada.
- [ ] Consentimento granular no onboarding.
- [ ] DPO identificado.

### Performance
- [ ] Tela de execução abre em <500ms (P75).
- [ ] App inicia em <2s em dispositivo médio (Android meio-baixo).
- [ ] Sem janks visíveis em scroll.
- [ ] Imagens otimizadas (WebP, lazy load).

### QA crítico
- [ ] Validação de input nas medidas (hard + soft warnings) implementada.
- [ ] Registros antigos absurdos limpos/sinalizados no Supabase.
- [ ] Truncagens corrigidas.
- [ ] Glyphs quebrados corrigidos.
- [ ] Pluralização correta em todas as contagens dinâmicas.
- [ ] Sem texto sobreposto em qualquer viewport (320px–428px).
- [ ] Funciona em iPhone SE 1ª geração e Android 8+.

---

## 11. Referências (apps que servem de modelo)

- **Hevy** — logging clean, social opcional, peso anterior em destaque.
- **Strong** — workout execution mode, plate calculator, simplicidade.
- **Fitbod** — adaptive AI, recovery awareness, 900+ exercícios com vídeo.
- **Caliber** — coaching híbrido (humano + AI), programas estruturados.
- **Future** — relação 1-on-1 coach-cliente, 90% retenção em 90 dias graças a UX de logging.
- **Whoop** — recovery score, dashboard hero focado em estado atual.
- **Apple Fitness+** — anéis de fechamento diário, simplicidade, motivação interna.
- **Nike Training Club** — bold typography para uso em movimento.
- **Reps & Sets** — modo execução tela-cheia, integração Apple Watch.
- **MyFitnessPal** — tracking nutricional como modelo (referência futura).

---

## 12. Notas Finais para o Implementador

Este documento é **prescritivo, não sugestivo**. Cada decisão tem rationale baseado em research e em padrões de retenção comprovados.

Se houver dúvida durante implementação:
1. Releia o **princípio fundamental** (§1) que governa a tela.
2. Cheque a **tabela de substituições de copy** (§5).
3. Aplique o **componente base padrão** (§3) antes de criar variação custom.
4. Em caso de conflito: **simplicidade vence**, **clareza vence**, **distração morre**.

A meta deste redesign não é fazer o app mais bonito. É fazer o aluno **abrir o app, treinar, sair satisfeito, e querer renovar a mensalidade**. Toda decisão visual e estrutural serve esse objetivo.

> "Design isn't decoration — it's strategy.
> A fitness app with great UX doesn't just look good — it motivates, guides, and adapts."

— Fim do documento —

---

## 13. Stack Specifics — Next.js + React + Supabase

> Esta seção foi adicionada após confirmação de stack: **Next.js (App Router) + React + Supabase**.
>
> **IMPORTANTE:** o schema real do banco usa nomes em português (`medidas_aluno`, `fichas_treino`, `historico_treinos`, etc.). Os exemplos abaixo usam esses nomes reais. O mapeamento completo telas ↔ tabelas está no README. O plano de migração para alinhar o banco com o estado-alvo está em `MIGRATION-PLAN.md`.

### 13.1 Estrutura de pastas sugerida

```
.
├── app/                              # App Router
│   ├── (auth)/                       # rotas públicas
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── recover/page.tsx
│   ├── (authenticated)/              # rotas protegidas
│   │   ├── layout.tsx                # bottom nav + auth guard
│   │   ├── inicio/page.tsx           # dashboard
│   │   ├── treinos/
│   │   │   ├── page.tsx              # lista de treinos
│   │   │   ├── [id]/page.tsx         # preview do treino
│   │   │   └── [id]/executar/page.tsx # modo execução (sem nav)
│   │   ├── nutricao/page.tsx
│   │   ├── progresso/
│   │   │   ├── layout.tsx            # tabs Medidas/Fotos
│   │   │   ├── medidas/page.tsx
│   │   │   └── fotos/page.tsx
│   │   ├── ranking/page.tsx
│   │   └── perfil/
│   │       ├── page.tsx
│   │       ├── editar/page.tsx
│   │       └── excluir/page.tsx
│   ├── api/                          # route handlers se necessário
│   ├── layout.tsx                    # root, importa globals.css
│   ├── globals.css                   # importa design-tokens.css
│   ├── error.tsx
│   ├── not-found.tsx
│   └── loading.tsx
├── components/
│   ├── ui/                           # primitives (Button, Card, Input...)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Skeleton.tsx
│   │   └── Toast.tsx
│   ├── layout/
│   │   ├── BottomNav.tsx             # client component
│   │   └── ScreenHeader.tsx
│   ├── treinos/
│   │   ├── ExerciseCard.tsx
│   │   ├── SetRow.tsx
│   │   ├── RestTimer.tsx
│   │   ├── PreviousSetIndicator.tsx
│   │   └── WorkoutProgressBar.tsx
│   ├── medidas/
│   │   ├── FormularioMedidas.tsx     # com validação de outlier
│   │   ├── GraficoPeso.tsx
│   │   ├── TabelaMedidas.tsx
│   │   └── OutlierWarningDialog.tsx
│   └── ranking/
│       ├── PointsHero.tsx
│       ├── TierProgress.tsx
│       └── Leaderboard.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # browser client
│   │   ├── server.ts                 # server client
│   │   ├── middleware.ts             # session refresh
│   │   └── types.ts                  # tipos gerados
│   ├── validation/
│   │   ├── medidas.ts                # ranges + detecção de outlier
│   │   ├── treinos.ts                # validação de séries/sessões
│   │   └── perfil.ts
│   ├── utils/
│   │   ├── cn.ts                     # clsx + tailwind-merge
│   │   ├── format.ts                 # peso, data, duração
│   │   └── haptics.ts                # vibration API wrapper
│   └── hooks/
│       ├── useHaptic.ts
│       ├── useRestTimer.ts
│       └── useStreak.ts
├── public/
│   ├── icons/                        # PWA icons
│   └── manifest.json                 # se for PWA
├── design-tokens.css
├── tailwind.config.js
└── middleware.ts                     # auth + protected routes
```

### 13.2 Padrão de Server Components vs Client Components

**Regra geral:** Server Components por padrão. Client Components apenas quando:
- Há interatividade (`useState`, `onClick`, etc.).
- Precisa de browser APIs (vibração, geolocalização, localStorage).
- Usa hooks como `usePathname`, `useRouter`.

```tsx
// ✅ Server Component (padrão) — busca direto do Supabase no servidor
// app/(authenticated)/inicio/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function InicioPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Schema real: tabelas em português
  const [
    { data: agendaHoje },
    { data: kpis },
  ] = await Promise.all([
    supabase
      .from('agenda_semanal')
      .select('*, ficha:fichas_treino(*)')
      .eq('aluno_id', user!.id)
      .eq('dia_semana', new Date().getDay())
      .maybeSingle(),
    supabase
      .rpc('get_kpis_aluno', { p_aluno_id: user!.id })  // função criada no Sprint 3
      .single(),
  ]);

  return (
    <main>
      <ScreenHeader user={user} />
      <TodayWorkoutCard agenda={agendaHoje} />
      <KpiGrid kpis={kpis} />
    </main>
  );
}

// ✅ Client Component — só onde precisa
// components/workout/RestTimer.tsx
'use client';
import { useState, useEffect } from 'react';

export function RestTimer({ duration, onComplete }: Props) {
  const [remaining, setRemaining] = useState(duration);
  // ...
}
```

### 13.3 Cliente Supabase (server + browser)

```typescript
// lib/supabase/client.ts — para Client Components
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// lib/supabase/server.ts — para Server Components, Route Handlers, Server Actions
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Server Component pode não conseguir setar cookies — middleware cuida disso
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {}
        },
      },
    }
  );
}
```

```typescript
// middleware.ts — refresh de sessão e proteção de rotas
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### 13.4 Padrão de validação de medidas (Zod)

```typescript
// lib/validation/medidas.ts
// Espelha os CHECK constraints do banco (MIGRATION-PLAN §5.1)
import { z } from 'zod';

export const MedidaSchema = z.object({
  peso:                z.number().min(30).max(300).nullable().optional(),
  altura:              z.number().min(100).max(250).nullable().optional(),
  gordura_corporal:    z.number().min(3).max(60).nullable().optional(),
  pescoco:             z.number().min(25).max(60).nullable().optional(),
  ombros:              z.number().min(60).max(200).nullable().optional(),
  peitoral:            z.number().min(40).max(200).nullable().optional(),
  cintura:             z.number().min(40).max(200).nullable().optional(),
  abdomen:             z.number().min(40).max(200).nullable().optional(),
  quadril:             z.number().min(40).max(200).nullable().optional(),
  braco_direito:       z.number().min(15).max(80).nullable().optional(),
  braco_esquerdo:      z.number().min(15).max(80).nullable().optional(),
  antebraco_direito:   z.number().min(15).max(60).nullable().optional(),
  antebraco_esquerdo:  z.number().min(15).max(60).nullable().optional(),
  coxa_direita:        z.number().min(25).max(100).nullable().optional(),
  coxa_esquerda:       z.number().min(25).max(100).nullable().optional(),
  panturrilha_direita: z.number().min(20).max(70).nullable().optional(),
  panturrilha_esquerda:z.number().min(20).max(70).nullable().optional(),
  observacoes:         z.string().nullable().optional(),
});

export type MedidaInput = z.infer<typeof MedidaSchema>;

// Soft warning — variação >25% vs última medida da mesma categoria
export function detectarOutlier(
  campo: keyof MedidaInput,
  novoValor: number,
  ultimoValor: number | null
): { ehOutlier: boolean; mensagem?: string } {
  if (ultimoValor == null) return { ehOutlier: false };

  const variacao = Math.abs(novoValor - ultimoValor) / ultimoValor;
  if (variacao > 0.25) {
    return {
      ehOutlier: true,
      mensagem: `Você digitou ${novoValor}. Sua última medida era ${ultimoValor}. Quer revisar?`,
    };
  }
  return { ehOutlier: false };
}
```

### 13.5 Server Action para salvar medida

```typescript
// app/(authenticated)/progresso/medidas/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { MedidaSchema } from '@/lib/validation/medidas';
import { revalidatePath } from 'next/cache';

export async function salvarMedida(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  // Converter FormData para objeto numérico (campos vazios viram null)
  const raw = Object.fromEntries(formData.entries());
  const toNum = (v: FormDataEntryValue | undefined) =>
    v === '' || v == null ? null : Number(v);

  const parsed = MedidaSchema.safeParse({
    peso:                toNum(raw.peso),
    altura:              toNum(raw.altura),
    peitoral:            toNum(raw.peitoral),
    cintura:             toNum(raw.cintura),
    quadril:             toNum(raw.quadril),
    braco_direito:       toNum(raw.braco_direito),
    braco_esquerdo:      toNum(raw.braco_esquerdo),
    coxa_direita:        toNum(raw.coxa_direita),
    coxa_esquerda:       toNum(raw.coxa_esquerda),
    panturrilha_direita: toNum(raw.panturrilha_direita),
    panturrilha_esquerda:toNum(raw.panturrilha_esquerda),
    // ...demais campos
    observacoes:         (raw.observacoes as string) || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const { error } = await supabase
    .from('medidas_aluno')
    .insert({ ...parsed.data, aluno_id: user.id });

  if (error) return { error: error.message };

  revalidatePath('/progresso/medidas');
  revalidatePath('/inicio');  // KPI do dashboard atualiza
  return { success: true };
}
```

### 13.6 Realtime para coach atualizando ficha

Quando o coach manda nova ficha, o aluno deve ver imediatamente sem refresh:

```typescript
// components/treinos/ListaFichasComRealtime.tsx
'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function ListaFichasComRealtime({ alunoId }: { alunoId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('fichas-updates')
      .on(
        'postgres_changes',
        {
          event: '*',  // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'fichas_treino',
          filter: `aluno_id=eq.${alunoId}`,
        },
        () => router.refresh()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [alunoId, router]);

  // ...
}
```

### 13.7 Auth guard no layout

```typescript
// app/(authenticated)/layout.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/layout/BottomNav';

export default async function AuthenticatedLayout({
  children,
}: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-surface-0 max-w-mobile mx-auto">
      <main className="pb-[calc(64px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
```

### 13.8 Modo execução de treino — fora do layout autenticado padrão

A tela `/treinos/[id]/executar` precisa de **tela cheia, sem bottom nav, sem header navegável**. Para isso, criar uma rota fora do grupo `(authenticated)`:

```
app/
├── (authenticated)/
│   ├── layout.tsx               # com bottom nav
│   └── treinos/[id]/page.tsx    # preview com bottom nav
└── treinos/[id]/executar/
    ├── layout.tsx               # SEM bottom nav, ainda com auth guard
    └── page.tsx                 # tela cheia de execução
```

```typescript
// app/treinos/[id]/executar/layout.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ExecuteLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      {/* sem bottom nav, sem header navegável — só X de saída inline */}
      {children}
    </div>
  );
}
```

### 13.9 PWA (recomendação)

O app sendo Next.js, **considere transformá-lo em PWA**. Vantagens:
- Funciona offline (essencial para treino em academia com WiFi ruim — Princípio §1.9).
- Adicionar à home screen sem app store.
- Push notifications (lembretes de treino).
- Carrega instantâneo após primeiro acesso.

Bibliotecas: `next-pwa` ou `@serwist/next` (mais moderna, usa Workbox).

### 13.10 Bibliotecas recomendadas

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "@supabase/supabase-js": "^2",
    "@supabase/ssr": "^0.5",
    "lucide-react": "^0.400",
    "zod": "^3",
    "react-hook-form": "^7",
    "@hookform/resolvers": "^3",
    "recharts": "^2",
    "framer-motion": "^11",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "date-fns": "^3",
    "sonner": "^1"
  },
  "devDependencies": {
    "tailwindcss": "^3",
    "typescript": "^5",
    "@types/react": "^19",
    "@types/node": "^20"
  }
}
```

**Por que cada uma:**
- `lucide-react` — set único de ícones (§2.6).
- `zod + react-hook-form` — validação tipada para formulários (medidas, perfil).
- `recharts` — gráficos do dashboard e medidas.
- `framer-motion` — microinterações (§6).
- `sonner` — toasts de confirmação/erro (§3.6).
- `date-fns` — formatação de datas em pt-BR (`format(date, "EEEE, d 'de' MMMM", { locale: ptBR })`).

### 13.11 Variáveis de ambiente

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...           # apenas server-side, nunca exposto
NEXT_PUBLIC_APP_URL=https://...
```

### 13.12 RLS (Row Level Security) — obrigatório

Todas as tabelas do Supabase **devem** ter RLS habilitada. Sem isso, qualquer usuário consegue ler dados de outros via API anon.

**No projeto atual, RLS está parcialmente habilitada.** O plano de aplicação cuidadosa (com policies criadas no mesmo `BEGIN/COMMIT` do `ENABLE`) está em **`MIGRATION-PLAN.md` §11**. Não habilitar RLS em nenhuma tabela sem antes criar todas as policies necessárias — fazer isso derruba o app no instante em que roda.

Política mínima para `medidas_aluno` (exemplo):

```sql
ALTER TABLE medidas_aluno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alunos_crud_proprias_medidas" ON medidas_aluno
  FOR ALL USING (auth.uid() = aluno_id) WITH CHECK (auth.uid() = aluno_id);

CREATE POLICY "coaches_leem_medidas_atletas" ON medidas_aluno
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_id = auth.uid() AND aluno_id = medidas_aluno.aluno_id
    )
  );
```

Padrões equivalentes para todas as outras tabelas estão em `MIGRATION-PLAN.md` §11.2.

— Fim da §13 —
