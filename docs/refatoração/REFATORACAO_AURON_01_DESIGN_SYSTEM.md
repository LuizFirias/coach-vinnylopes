# REFATORAÇÃO AURON — FASE 01: DESIGN SYSTEM, IDENTIDADE VISUAL E LIMPEZA DA MARCA ANTIGA

## Contexto do projeto

Projeto: **AURONFIT / AURON**  
Stack: **Next.js + React + TypeScript/JavaScript**, Supabase e deploy na Vercel.  
Objetivo do produto: plataforma para personais/coaches gerenciarem alunos, treinos, nutrição, métricas, cobranças, relatórios e evolução.

A marca antiga estava ligada ao **Coach Vinny** e usava preto + dourado. A nova marca é **AURON**, com símbolo principal em formato de **elo/conexão**. A logo já foi atualizada no projeto.

Esta fase NÃO deve refatorar regra de negócio, banco, autenticação, Supabase, APIs ou fluxos complexos. O foco aqui é criar a nova fundação visual da AURON para que as próximas fases consigam redesenhar dashboard, alunos, treinos e ficha digital sem bagunça.

---

## Objetivo desta fase

Transformar a base visual do app de “app dark dourado de um coach individual” para uma interface AURON com cara de **SaaS fitness profissional**, tecnológica, limpa, precisa e escalável para vários personais.

A nova interface deve transmitir:

- conexão entre coach e aluno;
- confiança;
- disciplina;
- precisão;
- performance;
- evolução;
- plataforma profissional, não app genérico feito por IA.

---

## Regras obrigatórias antes de alterar código

1. Criar uma branch ou checkpoint antes das alterações.
2. Não alterar schema do Supabase.
3. Não alterar queries, mutations, auth, permissões ou lógica de negócio.
4. Não remover funcionalidades existentes.
5. Não criar telas novas nesta fase, exceto se for necessário para ajuste de layout global.
6. Não adicionar bibliotecas grandes sem necessidade.
7. Manter compatibilidade com Next.js App Router.
8. Fazer mudanças de design usando tokens/classes reutilizáveis, nunca cores fixas espalhadas.
9. Depois de cada bloco alterado, rodar build/lint/typecheck se os scripts existirem.

---

## Arquivos que devem ser inspecionados primeiro

Inspecionar obrigatoriamente:

```txt
app/design-tokens.css
app/globals.css
app/layout.tsx
tailwind.config.ts
components/ui/*
components/layout/*
components/dashboard/*
components/treinos/*
components/medidas/*
app/admin/*
app/aluno/*
app/(authenticated)/*
```

Também procurar por tokens antigos, cores fixas e referências ao Coach Vinny.

Usar buscas como:

```bash
rg "D4A437|E1B548|B88B25|E8A33B|gold|yellow|amber|Coach Vinny|COACH VINNY|Vinny" .
rg "bg-brand|text-brand|border-brand|from-brand|to-brand|shadow-glow-brand" .
```

Atenção: `warning`/`amber` pode ser usado para alertas reais. Só remover quando estiver funcionando como cor da marca antiga.

---

## Direção visual oficial AURON

A marca AURON deve ser baseada no símbolo do **elo**, não no “A” triangular.

O conceito visual deve ser:

```txt
Personal → AURON → Aluno
Prescrição → Execução → Evolução
```

A interface precisa parecer uma plataforma que conecta dados, treino, nutrição, cobrança e acompanhamento.

Evitar:

- excesso de gradientes;
- excesso de glow;
- cards muito redondos;
- botões enormes sem necessidade;
- visual neon exagerado;
- cara de template Lovable/IA;
- dourado como cor primária.

Usar:

- azul como cor primária;
- dark tecnológico;
- superfícies bem separadas;
- bordas discretas;
- tabelas limpas;
- cards mais densos;
- hierarquia visual clara;
- microinterações discretas.

---

## Paleta AURON oficial para o app

Usar esta paleta como base do produto:

```css
/* Backgrounds */
--auron-bg: #070B14;
--auron-bg-soft: #0B1020;
--auron-surface-1: #111827;
--auron-surface-2: #141B2D;
--auron-surface-3: #182033;

/* Borders */
--auron-border-soft: rgba(255, 255, 255, 0.06);
--auron-border: rgba(255, 255, 255, 0.10);
--auron-border-strong: rgba(255, 255, 255, 0.18);

/* Brand */
--auron-primary: #2563EB;
--auron-primary-hover: #1D4ED8;
--auron-primary-pressed: #1E40AF;
--auron-primary-soft: rgba(37, 99, 235, 0.12);
--auron-primary-border: rgba(37, 99, 235, 0.36);

/* Text */
--auron-text-primary: #F5F7FA;
--auron-text-secondary: #9CA3AF;
--auron-text-tertiary: #6B7280;
--auron-text-disabled: #4B5563;
--auron-text-on-brand: #FFFFFF;

/* Semantic */
--auron-success: #22C55E;
--auron-success-soft: rgba(34, 197, 94, 0.12);
--auron-success-border: rgba(34, 197, 94, 0.36);

--auron-warning: #F59E0B;
--auron-warning-soft: rgba(245, 158, 11, 0.12);
--auron-warning-border: rgba(245, 158, 11, 0.36);

--auron-danger: #EF4444;
--auron-danger-soft: rgba(239, 68, 68, 0.12);
--auron-danger-border: rgba(239, 68, 68, 0.36);

--auron-info: #38BDF8;
--auron-info-soft: rgba(56, 189, 248, 0.12);
--auron-info-border: rgba(56, 189, 248, 0.36);
```

---

## Atualização obrigatória do `tailwind.config.ts`

O arquivo atual ainda usa a marca antiga em `brand`:

```ts
brand: {
  DEFAULT: '#D4A437',
  primary: '#D4A437',
  hover: '#E1B548',
  pressed: '#B88B25',
  subtle: 'rgba(212, 164, 55, 0.12)',
  border: 'rgba(212, 164, 55, 0.32)',
}
```

Substituir por AURON:

```ts
brand: {
  DEFAULT: '#2563EB',
  primary: '#2563EB',
  hover: '#1D4ED8',
  pressed: '#1E40AF',
  subtle: 'rgba(37, 99, 235, 0.12)',
  border: 'rgba(37, 99, 235, 0.36)',
},
```

Atualizar também as superfícies:

```ts
surface: {
  0: '#070B14',
  1: '#0B1020',
  2: '#111827',
  3: '#141B2D',
  4: '#182033',
},
```

Atualizar textos:

```ts
text: {
  primary: '#F5F7FA',
  secondary: '#9CA3AF',
  tertiary: '#6B7280',
  disabled: '#4B5563',
  'on-brand': '#FFFFFF',
},
```

Atualizar semânticos:

```ts
success: {
  DEFAULT: '#22C55E',
  subtle: 'rgba(34, 197, 94, 0.12)',
  border: 'rgba(34, 197, 94, 0.36)',
},
warning: {
  DEFAULT: '#F59E0B',
  subtle: 'rgba(245, 158, 11, 0.12)',
  border: 'rgba(245, 158, 11, 0.36)',
},
danger: {
  DEFAULT: '#EF4444',
  subtle: 'rgba(239, 68, 68, 0.12)',
  border: 'rgba(239, 68, 68, 0.36)',
},
info: {
  DEFAULT: '#38BDF8',
  subtle: 'rgba(56, 189, 248, 0.12)',
  border: 'rgba(56, 189, 248, 0.36)',
},
```

Atualizar sombras antigas:

```ts
boxShadow: {
  'elev-1': '0 1px 2px rgba(0, 0, 0, 0.30)',
  'elev-2': '0 4px 12px rgba(0, 0, 0, 0.45)',
  'elev-3': '0 12px 32px rgba(0, 0, 0, 0.55)',
  'glow-brand': '0 0 24px rgba(37, 99, 235, 0.22)',
  'glow-success': '0 0 24px rgba(34, 197, 94, 0.24)',
  'pr-glow': '0 0 20px rgba(34, 197, 94, 0.32)',
  'focus-ring': '0 0 0 2px rgba(37, 99, 235, 0.50)',
},
```

Adicionar fonte display:

```ts
fontFamily: {
  sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  display: ['Exo 2', 'Inter', 'sans-serif'],
  mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
},
```

---

## Tipografia AURON

A identidade visual sugere:

- títulos: **Exo 2 Bold**;
- textos: **Inter Regular**.

Aplicação correta:

- Exo 2 apenas em títulos, grandes números, headings de dashboard e marca.
- Inter no restante: menu, labels, botões, inputs, tabelas, cards, descrições.

Se o projeto ainda não usa `next/font/google`, configurar em `app/layout.tsx`:

```tsx
import { Inter, Exo_2 } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const exo2 = Exo_2({
  subsets: ['latin'],
  variable: '--font-exo-2',
  display: 'swap',
});
```

Aplicar no `<body>`:

```tsx
<body className={`${inter.variable} ${exo2.variable} font-sans`}>
```

No CSS global:

```css
:root {
  --font-sans: var(--font-inter);
  --font-display: var(--font-exo-2);
}

.font-display {
  font-family: var(--font-display), var(--font-sans), sans-serif;
}
```

---

## Atualizar `app/design-tokens.css`

Se o arquivo já existir, substituir/adaptar para conter os tokens AURON. Usar algo próximo disso:

```css
:root {
  --auron-bg: #070B14;
  --auron-bg-soft: #0B1020;
  --auron-surface-1: #111827;
  --auron-surface-2: #141B2D;
  --auron-surface-3: #182033;

  --auron-border-soft: rgba(255, 255, 255, 0.06);
  --auron-border: rgba(255, 255, 255, 0.10);
  --auron-border-strong: rgba(255, 255, 255, 0.18);

  --auron-primary: #2563EB;
  --auron-primary-hover: #1D4ED8;
  --auron-primary-pressed: #1E40AF;
  --auron-primary-soft: rgba(37, 99, 235, 0.12);
  --auron-primary-border: rgba(37, 99, 235, 0.36);

  --auron-text-primary: #F5F7FA;
  --auron-text-secondary: #9CA3AF;
  --auron-text-tertiary: #6B7280;
  --auron-text-disabled: #4B5563;
  --auron-text-on-brand: #FFFFFF;

  --auron-success: #22C55E;
  --auron-warning: #F59E0B;
  --auron-danger: #EF4444;
  --auron-info: #38BDF8;

  --auron-radius-sm: 6px;
  --auron-radius-md: 10px;
  --auron-radius-lg: 14px;
  --auron-radius-xl: 18px;
  --auron-radius-2xl: 22px;

  --auron-shadow-1: 0 1px 2px rgba(0, 0, 0, 0.30);
  --auron-shadow-2: 0 4px 12px rgba(0, 0, 0, 0.45);
  --auron-shadow-3: 0 12px 32px rgba(0, 0, 0, 0.55);
}
```

---

## Atualizar `app/globals.css`

Garantir base global:

```css
html,
body {
  min-height: 100%;
  background: var(--auron-bg);
  color: var(--auron-text-primary);
}

body {
  font-family: var(--font-inter), Inter, system-ui, sans-serif;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::selection {
  background: rgba(37, 99, 235, 0.35);
  color: #FFFFFF;
}

* {
  border-color: var(--auron-border);
}
```

Evitar aplicar gradiente global forte no body. Se quiser profundidade, usar background muito sutil:

```css
body {
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.08), transparent 32rem),
    var(--auron-bg);
}
```

Não usar neon exagerado.

---

## Raio de borda recomendado

Reduzir o arredondamento geral para tirar cara de IA.

Padrão:

```txt
Cards normais: 14px a 16px
Cards mobile importantes: 18px
Botões: 10px a 12px
Inputs: 10px a 12px
Badges/chips: 999px
Modais/drawers: 20px a 22px
```

Evitar cards com radius muito grande em dashboards/tabelas.

---

## Componentes globais a refatorar nesta fase

Procurar os componentes existentes dentro de `components/ui` e adaptar. Se algum não existir, criar apenas se for necessário para substituir padrões repetidos.

### 1. Button

Variantes mínimas:

```txt
primary   → azul sólido
secondary → superfície escura com borda
ghost     → transparente, hover azul sutil
danger    → vermelho discreto
```

Regras:

- botão primário azul `brand`;
- texto branco;
- hover em `brand-hover`;
- foco com ring azul;
- não usar dourado;
- não usar gradiente em todo botão;
- gradiente só permitido em login/onboarding/hero, não em tabela/dashboard.

### 2. Card

Padrão:

```txt
background: surface-2
border: border-subtle
radius: lg/xl
shadow: leve ou nenhuma
```

Evitar:

- glow em cards normais;
- card com borda azul em tudo;
- card decorativo com pouca informação.

### 3. Badge / StatusBadge

Criar ou ajustar variantes:

```txt
active    → success
pending   → warning
inactive  → muted
danger    → danger
info      → info
brand     → primary blue
```

Não usar azul para todos os estados. Azul é marca/ação. Estados precisam ser semânticos.

### 4. Input / SearchInput / Textarea / Select

Padrão:

```txt
background: surface-2 ou surface-3
border: border
focus: primary
placeholder: text-tertiary
text: text-primary
radius: md/lg
```

### 5. Tabs / SegmentedControl

Ativo em azul. Inativo em superfície escura. Menos altura, menos peso visual.

### 6. Sidebar

Refatorar visual:

- fundo: `surface-0` ou `surface-1`;
- item ativo: `brand.subtle` + borda esquerda azul ou background azul sutil;
- texto ativo: branco ou azul claro;
- ícone ativo: azul;
- itens inativos: `text-secondary`;
- hover: azul sutil;
- remover dourado;
- remover “Coach Vinny” como marca principal;
- manter nome/foto do coach apenas como usuário logado.

A sidebar deve comunicar AURON como produto, não como app de um coach.

---

## Textos e marca antiga

Procurar e substituir:

```txt
COACH VINNY
Coach Vinny
Vinny quando usado como marca fixa
```

Regras:

- Se for nome do usuário logado vindo do banco, manter dinâmico.
- Se for texto hardcoded de marca, substituir por AURON.
- Não transformar todos os usuários em “AURON”; apenas a marca do app.

Exemplos:

```txt
Antes: COACH VINNY
Depois: AURON

Antes: Visão geral e saúde do negócio
Depois: Visão geral da sua operação
```

---

## Linguagem visual por área

### Área do personal/admin

Deve parecer SaaS profissional.

Priorizar:

- tabelas limpas;
- métricas objetivas;
- ações rápidas;
- cards menores;
- informação densa, mas legível;
- status claros;
- alertas acionáveis.

Evitar:

- dashboard com cards enormes para pouco dado;
- gráficos decorativos;
- muitos ícones grandes;
- muita borda azul.

### Área do aluno

Deve parecer app fitness premium e objetivo.

Priorizar:

- ação do dia;
- iniciar treino;
- evolução;
- carga;
- cronômetro;
- foto/medida;
- ficha digital interativa.

Evitar:

- home decorativa demais;
- excesso de gamificação;
- ranking muito infantil;
- botões e cards enormes em todas as seções.

---

## Busca e substituição segura de cores antigas

Remover/reduzir estes usos quando forem marca antiga:

```txt
#D4A437
#E1B548
#B88B25
rgba(212, 164, 55
bg-yellow-*
text-yellow-*
border-yellow-*
bg-amber-*
text-amber-*
border-amber-*
```

Substituições comuns:

```txt
Marca principal → brand / #2563EB
Hover da marca → brand-hover / #1D4ED8
Marca pressionada → brand-pressed / #1E40AF
Background suave → brand-subtle
Borda suave → brand-border
Alerta real → warning / #F59E0B
Erro → danger / #EF4444
Sucesso → success / #22C55E
```

Cuidado: se `amber` estiver indicando alerta real, trocar para `warning`, não para azul.

---

## O que NÃO fazer nesta fase

Não redesenhar ainda:

- dashboard completo do personal;
- base de atletas inteira;
- criador de ficha digital;
- tela de execução do treino;
- perfil completo do aluno;
- relatórios financeiros;
- nutrição digital;
- fluxo de cobrança.

Essas mudanças são fases seguintes.

Nesta fase, fazer apenas:

1. nova base visual;
2. remoção da marca antiga;
3. tokens AURON;
4. componentes globais;
5. ajustes superficiais necessários para o app não quebrar visualmente.

---

## Critérios de aceite

A fase está concluída quando:

- [ ] `tailwind.config.ts` não possui mais dourado como `brand`.
- [ ] `app/design-tokens.css` contém tokens AURON.
- [ ] `app/globals.css` usa a base dark AURON.
- [ ] Exo 2 e Inter estão configuradas corretamente, se possível.
- [ ] Botões primários são azuis.
- [ ] Sidebar usa AURON como marca principal.
- [ ] Coach Vinny não aparece como marca hardcoded.
- [ ] Dourado antigo não aparece mais como cor principal.
- [ ] Cards, inputs, badges e tabs usam tokens, não cores fixas.
- [ ] Estados de sucesso, alerta e erro têm cores semânticas próprias.
- [ ] O app continua autenticando normalmente.
- [ ] As rotas admin e aluno continuam abrindo.
- [ ] O build não quebra.
- [ ] Não houve alteração em schema Supabase, APIs ou regras de negócio.

---

## Comandos sugeridos de validação

Executar conforme os scripts disponíveis no projeto:

```bash
npm run lint
npm run build
npm run typecheck
```

Se algum script não existir, não criar apenas para esta fase. Usar o equivalente disponível.

Também rodar busca final:

```bash
rg "D4A437|E1B548|B88B25|rgba\(212, 164, 55|COACH VINNY|Coach Vinny" .
```

Se ainda aparecer, revisar se é dado dinâmico, histórico ou marca hardcoded.

---

## Entrega esperada desta fase

Ao finalizar, responder com:

1. arquivos alterados;
2. tokens criados/alterados;
3. componentes globais ajustados;
4. cores antigas removidas;
5. problemas encontrados;
6. próximos passos recomendados.

---

## Próxima fase depois desta

Depois que esta fase estiver estável, iniciar:

**FASE 02 — Dashboard do Personal AURON**

Objetivo da próxima fase: transformar a dashboard do coach em central de operação com dinheiro, alunos em risco, pendências, evolução e ações prioritárias.
