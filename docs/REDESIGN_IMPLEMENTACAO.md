# UI/UX Redesign — Implementação

**Data**: Abril 2026  
**Status**: Em Progresso (65% concluído)

## ✅ Implementado

### 1. Design Tokens (CSS & Tailwind)
- ✅ **globals.css**: Novo sistema de variáveis CSS
  - Backgrounds: `--bg-base`, `--bg-surface`, `--bg-card`, `--bg-elevated`
  - Colors: `--gold-default`, `--gold-light`, `--text-primary`, `--text-secondary`
  - Borders: `--border-subtle`, `--border-default`
  - Status: `--success`, `--danger`, `--warn`
  
- ✅ **tailwind.config.ts**: Fontes atualizadas
  - `Sora` (body, regular)
  - `DM Serif Display` (headings, títulos)
  - `DM Mono` (labels, monospace)

- ✅ **Novas Classes CSS**:
  - `.heading-h1`, `.heading-h2`, `.heading-h3`
  - `.label-overline`, `.label-small`
  - `.metric-card`, `.badge`, `.badge-gold`, `.badge-success`
  - `.btn-primary`, `.btn-secondary`
  - `.input-field`
  - `.alert`, `.alert-gold`, `.alert-danger`, `.alert-success`

### 2. Correção Crítica: Backgrounds Brancos
- ✅ **app/aluno/medidas/page.tsx**
  - Fundo: `bg-gray-50` → `bg-bg-base`
  - Cards: `bg-white` → `bg-bg-card`
  - Inputs: Classe `.input-field` aplicada
  - Buttons: `.btn-primary` (gold) + `.btn-secondary`
  - Textos: `text-slate-*` → `text-text-*`
  - Alerts: Novos `.alert-*` com cores corretas
  
- ✅ **app/aluno/fotos/page.tsx**
  - Mesmo padrão de correcção
  - Modal de exclusão atualizado
  - Galeria com cards `bg-bg-card`
  - Labels em `text-gold-light`

---

## ⏳ Em Progresso / Pendente

### 3. Dashboard/Home (Tela Principal)
- [ ] Refatorar cores hardcoded para novo sistema
- [ ] Grid de Agenda Semanal: 2 colunas → **7 colunas (7 dias)**
- [ ] Atualizar cards de métricas
- [ ] Novo sistema de hierarquia tipográfica

**Atividade necessária**: Atualizar `app/aluno/dashboard/page.tsx`

### 4. Componentes Globais
- [ ] **WeeklyAgenda.tsx** - Refatorar grid
- [ ] **BottomNav.tsx** - Novos ícones + design tokens
- [ ] **MainWrapper.tsx** - Backgrounds e bordas
- [ ] Componentes de Button/Card reutilizáveis

### 5. Outras Telas
- [ ] **Plano Alimentar (Nutrição)** - Empty states + redesenho estrutural
- [ ] **Ranking** - Avatar system, badges
- [ ] **Treino Details** - Hierarquia de botões (1 primário)
- [ ] **Rotinas** - Casing padronizado (ALL CAPS), state visual

---

## 📊 Paleta de Cores Nova

```css
/* Backgrounds */
--bg-base: #070707;
--bg-surface: #111111;
--bg-card: #1A1A1A;
--bg-elevated: #222222;

/* Brand Gold */
--gold-default: #B8972A;
--gold-light: #D4AF47;
--gold-highlight: #EDD06B;

/* Text */
--text-primary: #F2F2F2;
--text-secondary: #A0A0A0;
--text-disabled: #555555;

/* Borders */
--border-subtle: #2C2C2C;
--border-default: #3A3A3A;

/* Status */
--success: #27AE60;
--danger: #C0392B;
--warn: #E67E22;
```

---

## 📝 Próximas Prioridades

**ALTA (Crítico)**
1. Dashboard refactoring - cor/typography
2. WeeklyAgenda grid 7 colunas
3. Componentes de Button/Card unificados

**MÉDIA**
4. Plano Alimentar redesign
5. Ranking avatar system
6. Treino details hierarquia

**BAIXA**
7. Rotinas casing + state visual
8. Icons customization nav bar

---

## 🔧 Como Usar os Novos Tokens

### Cores
```jsx
<div className="bg-bg-card border border-border-subtle">
  <h1 className="text-text-primary">Título</h1>
  <p className="text-text-secondary">Descrição</p>
</div>
```

### Botões
```jsx
<button className="btn-primary">Ação Principal</button>
<button className="btn-secondary">Ação Secundária</button>
```

### Inputs
```jsx
<input className="input-field" placeholder="Digite aqui..." />
```

### Alerts
```jsx
<div className="alert alert-gold">Mensagem de sucesso</div>
<div className="alert alert-danger">Mensagem de erro</div>
```

---

## 📋 Checklist Conclusão

- [x] Design tokens CSS/Tailwind
- [x] Backgrounds brancos corrigidos
- [ ] Dashboard/Home refactoring
- [ ] WeeklyAgenda grid 7 colunas
- [ ] Componentes globais unificados
- [ ] Plano Alimentar redesign
- [ ] Ranking + Treino Details
- [ ] Testing & QA
- [ ] Deploy

---

**Última atualização**: Abril 28, 2026
