# AURON — Refatoração UI/UX · Painel do Aluno (Telas de Treino)

> **Escopo:** Telas de treino do painel mobile do aluno — Minhas Rotinas, Ficha Aberta, Modal de Execução de Série, Treino em Andamento, Treino Concluído e Exportação de Imagem.
>
> **Prioridade de acesso:** Mobile-first. Todas as decisões de layout, área de toque e tipografia são orientadas para telas de 375–430px de largura.
>
> **Referência de mercado:** Hevy, mFit, Strong App — com diferencial do AURON de mostrar a ficha aberta com histórico da última sessão visível sem precisar expandir.

---

## 1. Tokens Específicos do Painel do Aluno

Os tokens globais do coach panel se aplicam. Os seguintes são adicionais ou sobrescritos para o contexto mobile de treino:

```css
/* Área de toque mínima mobile */
--touch-target-min: 44px;

/* Estados de série */
--color-set-pending:    transparent;
--color-set-active:     var(--color-accent);           /* azul — série atual */
--color-set-done:       rgba(34, 197, 94, 0.12);       /* fundo verde sutil — concluída */
--color-set-done-text:  #22C55E;
--color-set-done-border: rgba(34, 197, 94, 0.20);

/* Botão CTA de treino (maior que o padrão desktop) */
--btn-training-height:  52px;
--btn-training-radius:  8px;   /* não pill */
--btn-training-font:    15px;
--btn-training-weight:  600;

/* Grid de colunas da tabela de séries (fixo) */
--col-set:   28px;
--col-ant:   76px;
--col-peso:  52px;
--col-reps:  44px;
--col-tec1:  36px;
--col-tec2:  36px;
--col-check: 32px;
```

---

## 2. Tela: Minhas Rotinas (lista de fichas)

**Arquivo:** tela de listagem de rotinas do aluno (equivalente a `app/aluno/treinos/page.tsx` ou similar)

### 2.1 Problemas identificados

- Ícone de haltere em container azul arredondado — mesmo anti-padrão já eliminado no coach panel
- Chips de nome de exercício truncados ("Supino incl...", "Remada apoi...") são ruído visual — ilegíveis
- Eyebrow "ROTINAS INTERATIVAS" em caps — ok, mas tamanho e letter-spacing precisam de ajuste
- Card com border-radius excessivo

### 2.2 Refatoração

```tsx
{/* Card de rotina — substituir estrutura atual */}
<div className="
  flex items-center gap-3
  px-4 py-3.5
  bg-surface-1
  border border-border-subtle
  rounded-lg                    /* 8px — não rounded-2xl */
  active:bg-surface-2
  transition-colors duration-100
  cursor-pointer
">
  {/* Ícone: remover container azul, usar ícone direto */}
  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
    <DumbbellIcon className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
  </div>

  {/* Conteúdo */}
  <div className="flex-1 min-w-0">
    {/* Nome da rotina */}
    <p className="text-sm font-semibold text-text-primary tracking-wide uppercase">
      {rotina.nome}
    </p>

    {/* Meta: quantidade + data — REMOVER chips de exercício truncados */}
    <p className="text-xs text-text-muted mt-0.5">
      {rotina.totalExercicios} exercícios · {formatDate(rotina.criadoEm)}
    </p>
  </div>

  {/* Seta de navegação */}
  <ChevronRightIcon className="w-4 h-4 text-text-muted flex-shrink-0" />
</div>
```

**Eyebrow da seção:**
```tsx
<p className="
  text-[10px] font-semibold uppercase tracking-[0.08em]
  text-text-muted
  mb-2 px-1
">
  Rotinas Interativas
</p>
```

**Estado vazio (quando não há fichas):**
```tsx
<div className="flex flex-col items-center justify-center py-16 gap-3">
  <DumbbellIcon className="w-8 h-8 text-text-muted" strokeWidth={1} />
  <p className="text-sm font-medium text-text-primary">Nenhuma ficha ativa</p>
  <p className="text-xs text-text-muted text-center max-w-[220px]">
    Seu coach ainda não prescreveu um treino. Aguarde ou entre em contato.
  </p>
</div>
```

---

## 3. Tela: Ficha Aberta (visão geral dos exercícios)

**Arquivo:** tela de detalhe da rotina (`app/aluno/treinos/[id]/page.tsx` ou similar)

### 3.1 Botão "INICIAR TREINO"

```tsx
{/* ANTES: pill com ALL CAPS */}
{/* DEPOIS: */}
<button className="
  w-full
  h-[52px]
  bg-accent hover:bg-accent-hover
  text-white
  text-[15px] font-semibold
  rounded-lg                    /* 8px — não pill/rounded-full */
  transition-colors duration-120
  flex items-center justify-center gap-2
">
  <PlayIcon className="w-4 h-4" />
  Iniciar treino
</button>
```

### 3.2 Card "Progresso de Volume"

Ocultar quando histórico < 4 sessões registradas:

```tsx
{totalSessoes >= 4 && (
  <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 mb-4">
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-1">
      Progresso de Volume
    </p>
    <p className="text-xl font-bold font-mono tabular-nums text-text-primary">
      {volumeTotal} <span className="text-sm font-normal text-text-muted">ton</span>
      <span className="text-sm font-normal text-text-muted ml-2">{dataUltimaSessao}</span>
    </p>
    {/* gráfico */}
  </div>
)}
```

Quando `totalSessoes < 4`, exibir mensagem contextual no lugar:

```tsx
{totalSessoes < 4 && (
  <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 mb-4">
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-1">
      Progresso de Volume
    </p>
    <p className="text-xs text-text-muted">
      Complete mais {4 - totalSessoes} sessão{4 - totalSessoes !== 1 ? 'ões' : ''} para visualizar o gráfico de evolução.
    </p>
  </div>
)}
```

### 3.3 Tabela de séries — alinhamento de colunas (CRÍTICO)

**Problema raiz:** colunas com `flex` livre permitem que o conteúdo desalinhe com o header.

**Solução: `grid-template-columns` com larguras fixas.**

```tsx
{/* Constante de grid — definir uma vez, usar em header E em cada linha */}
const GRID_COLS = "28px 76px 1fr 44px 36px 36px 32px"
// SET  | ANT   | PESO (flex) | REPS | T1  | T2  | ✓

{/* Header da tabela */}
<div
  className="grid items-center px-0 pb-2 border-b border-border-subtle"
  style={{ gridTemplateColumns: GRID_COLS }}
>
  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">
    Set
  </span>
  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
    Ant.
  </span>
  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-right">
    Peso
  </span>
  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">
    Reps
  </span>
  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">
    T1
  </span>
  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">
    T2
  </span>
  <span className="text-[10px] text-text-muted text-center">✓</span>
</div>

{/* Linha de série */}
<div
  className="grid items-center py-2.5 border-b border-border-subtle/50 last:border-0"
  style={{ gridTemplateColumns: GRID_COLS }}
>
  {/* SET — número da série */}
  <div className="flex justify-center">
    <span className="
      w-6 h-6 rounded-md
      flex items-center justify-center
      text-[11px] font-semibold font-mono
      bg-surface-2 text-text-muted
    ">
      {serie.numero}
    </span>
  </div>

  {/* ANT. — histórico anterior */}
  <span className="text-[11px] text-text-muted truncate pr-1">
    {serie.anterior ?? "—"}
  </span>

  {/* PESO — valor principal, alinhado à direita */}
  <span className="text-[15px] font-bold font-mono tabular-nums text-text-primary text-right pr-2">
    {serie.peso}
  </span>

  {/* REPS */}
  <span className="text-[13px] font-semibold font-mono tabular-nums text-accent text-center">
    {serie.reps}
  </span>

  {/* T1 — Técnica 1 */}
  <span className="text-[11px] font-medium text-text-secondary text-center">
    {serie.tecnica1 ?? "—"}
  </span>

  {/* T2 — Técnica 2 */}
  <span className="text-[11px] font-medium text-accent text-center">
    {serie.tecnica2 ?? "—"}
  </span>

  {/* CHECK */}
  <div className="flex justify-center">
    <CheckIcon className="w-4 h-4 text-text-muted" />
  </div>
</div>
```

### 3.4 Renomeação TÉ1/TÉ2 → T1/T2

**Por que não manter TÉ1/TÉ2:** em 36px de largura de coluna, "TÉ1" ocupa mais espaço que o conteúdo (2 letras como "FS", "CS"). "T1" e "T2" são compactos e suficientes — o aluno aprende o significado no contexto de execução.

**Atualizar em todos os lugares onde aparece:**
- Header da tabela na ficha aberta
- Header da tabela no histórico do modal de execução
- Header da tabela na tela de treino em andamento
- Qualquer tooltip ou legenda

### 3.5 Título do exercício — ALL CAPS → Title Case

```tsx
{/* ANTES: */}
<h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
  SUPINO INCLINADO COM HALTERES
</h3>

{/* DEPOIS: */}
<h3 className="text-sm font-semibold text-text-primary">
  Supino Inclinado com Halteres
</h3>

{/* Descanso abaixo do título */}
<div className="flex items-center gap-1 mt-0.5">
  <ClockIcon className="w-3 h-3 text-accent" />
  <span className="text-xs text-accent">Descanso: {formatTime(descanso)}</span>
</div>
```

---

## 4. Modal: Execução de Série

**Arquivo:** modal/tela de execução de série durante o treino

### 4.1 Header do modal

```tsx
{/* ANTES: "EXERCÍCIO 1/3" em azul caps + nome em branco caps */}
{/* DEPOIS: */}
<div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border-subtle">
  {/* Botão fechar */}
  <button className="
    w-8 h-8 rounded-md
    flex items-center justify-center
    bg-surface-2 text-text-secondary
    active:bg-surface-3
  ">
    <XIcon className="w-4 h-4" />
  </button>

  <div className="flex-1">
    {/* Eyebrow com progresso */}
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">
      Exercício {exercicioAtual}/{totalExercicios}
    </p>
    {/* Nome do exercício — Title Case, não ALL CAPS */}
    <p className="text-sm font-semibold text-text-primary leading-tight">
      {nomeExercicio}
    </p>
  </div>
</div>
```

### 4.2 Indicador de série e progress bar

```tsx
<div className="px-4 pt-4">
  <div className="flex items-baseline justify-between mb-2">
    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
      Série
    </span>
    <span className="text-xl font-bold font-mono tabular-nums text-text-primary">
      {serieAtual}<span className="text-sm text-text-muted font-normal">/{totalSeries}</span>
    </span>
  </div>

  {/* Progress bar — não usar azul sólido cheio, usar sutil */}
  <div className="w-full h-1 bg-surface-2 rounded-full overflow-hidden">
    <div
      className="h-full bg-accent rounded-full transition-all duration-300"
      style={{ width: `${(serieAtual / totalSeries) * 100}%` }}
    />
  </div>
</div>
```

### 4.3 Cards de contexto: REPETIÇÕES / ÚLTIMA VEZ / TÉCNICA

**Problema atual:** três cards com peso visual igual mas importância diferente.

**Hierarquia correta:** REPETIÇÕES é o mais importante (o que fazer agora), ÚLTIMA VEZ é referência, TÉCNICA é contexto clicável.

```tsx
<div className="grid grid-cols-3 gap-2 px-4 pt-4">

  {/* REPETIÇÕES — mais destaque */}
  <div className="
    bg-surface-1 border border-border-subtle rounded-lg
    p-3 flex flex-col items-center
  ">
    <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted mb-1">
      Repetições
    </span>
    <span className="text-2xl font-bold font-mono tabular-nums text-text-primary">
      {repsPrescritas}
    </span>
  </div>

  {/* ÚLTIMA VEZ — secundário */}
  <div className="
    bg-surface-1 border border-border-subtle rounded-lg
    p-3 flex flex-col items-center
  ">
    <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted mb-1">
      Última vez
    </span>
    <span className="text-sm font-medium font-mono text-text-secondary text-center leading-tight">
      {ultimaVez ?? "—"}
    </span>
  </div>

  {/* TÉCNICA — clicável, abre modal de instrução */}
  <button
    onClick={() => setModalTecnicaAberto(true)}
    className="
      bg-accent/10 border border-accent/25 rounded-lg
      p-3 flex flex-col items-center
      active:bg-accent/20 transition-colors duration-100
      relative
    "
  >
    <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted mb-1">
      Técnica
    </span>
    <span className="text-xs font-semibold text-accent text-center leading-tight">
      {nomeTecnica}
    </span>
    {/* Indicador de clicável */}
    <span className="
      absolute top-1.5 right-1.5
      w-3.5 h-3.5 rounded-full
      bg-accent/20 text-accent
      flex items-center justify-center
      text-[8px] font-bold
    ">
      i
    </span>
  </button>

</div>
```

### 4.4 Modal de instrução da técnica

Criar componente `ModalInstrucaoTecnica`:

```tsx
{modalTecnicaAberto && (
  <div className="
    fixed inset-0 z-50
    flex items-end
    bg-black/60 backdrop-blur-sm
  ">
    <div className="
      w-full
      bg-surface-1 border-t border-border-subtle
      rounded-t-xl
      p-6
      animate-slide-up
    ">
      {/* Header do modal */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-0.5">
            Técnica de execução
          </p>
          <h3 className="text-base font-bold text-text-primary">
            {nomeTecnica}
          </h3>
        </div>
        <button
          onClick={() => setModalTecnicaAberto(false)}
          className="w-8 h-8 rounded-md bg-surface-2 flex items-center justify-center"
        >
          <XIcon className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* Instrução — vinda do banco de dados, campo "instrucao_tecnica" */}
      <p className="text-sm text-text-secondary leading-relaxed">
        {instrucaoTecnica}
      </p>

      {/* Botão fechar */}
      <button
        onClick={() => setModalTecnicaAberto(false)}
        className="
          w-full mt-6 h-11
          bg-surface-2 border border-border-subtle
          rounded-lg text-sm font-medium text-text-primary
        "
      >
        Entendido
      </button>
    </div>
  </div>
)}
```

**Animação de entrada:**
```css
@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.animate-slide-up {
  animation: slide-up 220ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
}
```

**Banco de dados — campo necessário:**
A tabela de técnicas (ou onde elas são cadastradas) precisa de um campo `instrucao` ou `descricao` preenchível pelo coach. Se não existir, criar e expor no formulário de criação de exercício no coach panel.

### 4.5 Input de Carga

Está bem resolvido — manter estrutura atual. Apenas ajustes cosméticos:

```tsx
{/* Container de carga */}
<div className="mx-4 mt-4 bg-surface-1 border border-border-subtle rounded-lg p-4">
  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-3">
    Carga (kg)
  </p>

  {/* Linha principal: menos − | valor | mais + */}
  <div className="flex items-center gap-2">
    <button className="
      w-11 h-11 rounded-md
      bg-surface-2 border border-border-subtle
      flex items-center justify-center
      text-lg font-medium text-text-primary
      active:bg-surface-3
    ">
      −
    </button>

    <div className="flex-1 h-11 bg-surface-2 border border-border-subtle rounded-md
                    flex items-center justify-center">
      <span className="text-2xl font-bold font-mono tabular-nums text-text-primary">
        {carga}
      </span>
    </div>

    <button className="
      w-11 h-11 rounded-md
      bg-accent
      flex items-center justify-center
      text-lg font-medium text-white
      active:bg-accent-hover
    ">
      +
    </button>
  </div>

  {/* Incrementos rápidos — manter estrutura, ajustar espaçamento */}
  <div className="grid grid-cols-4 gap-2 mt-2">
    {['-5', '-2.5', '+2.5', '+5'].map((inc) => (
      <button key={inc} className="
        h-8 rounded-md
        bg-surface-2 border border-border-subtle
        text-xs font-medium font-mono text-text-secondary
        active:bg-surface-3
      ">
        {inc}
      </button>
    ))}
  </div>
</div>
```

### 4.6 Histórico de Séries (colapsável)

Mesmo grid fixo da ficha aberta:

```tsx
const GRID_COLS_HISTORICO = "28px 72px 1fr 40px 32px 32px"
// SET | ANT | PESO | REPS | T1 | T2

{/* Header do histórico */}
<div
  className="grid items-center pb-2 border-b border-border-subtle"
  style={{ gridTemplateColumns: GRID_COLS_HISTORICO }}
>
  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">Set</span>
  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Ant.</span>
  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-right">Peso</span>
  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">Reps</span>
  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">T1</span>
  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">T2</span>
</div>

{/* Linhas do histórico */}
{historico.map((item, i) => (
  <div
    key={i}
    className={`
      grid items-center py-2.5
      border-b border-border-subtle/40 last:border-0
      ${item.isAtual ? 'bg-accent/5 -mx-4 px-4' : ''}
    `}
    style={{ gridTemplateColumns: GRID_COLS_HISTORICO }}
  >
    {/* Número da série — círculo preenchido se atual */}
    <div className="flex justify-center">
      <span className={`
        w-6 h-6 rounded-full flex items-center justify-center
        text-[11px] font-bold font-mono
        ${item.isAtual
          ? 'bg-accent text-white'
          : 'bg-surface-2 text-text-muted'
        }
      `}>
        {item.numero}
      </span>
    </div>

    <span className="text-[11px] text-text-muted truncate">{item.anterior ?? "—"}</span>
    <span className="text-[13px] font-bold font-mono tabular-nums text-text-primary text-right pr-2">{item.peso}</span>
    <span className={`text-[12px] font-semibold font-mono text-center ${item.isAtual ? 'text-accent' : 'text-text-secondary'}`}>{item.reps}</span>
    <span className="text-[11px] text-text-secondary text-center">{item.t1 ?? "—"}</span>
    <span className={`text-[11px] text-center ${item.t2 ? 'text-accent' : 'text-text-muted'}`}>{item.t2 ?? "—"}</span>
  </div>
))}
```

**Toggle Mostrar/Ocultar:**
```tsx
<button
  onClick={() => setHistoricoAberto(!historicoAberto)}
  className="
    w-full flex items-center justify-between
    px-4 py-3
    bg-surface-1 border border-border-subtle rounded-lg
    mx-4
    text-xs font-semibold text-text-secondary
    active:bg-surface-2
  "
  style={{ width: 'calc(100% - 32px)' }}
>
  <span className="uppercase tracking-wider text-[10px]">Histórico de Séries</span>
  <span className="text-accent font-semibold">
    {historicoAberto ? 'Ocultar' : 'Mostrar'}
  </span>
</button>
```

### 4.7 Botão "CONCLUIR SÉRIE"

```tsx
{/* ANTES: pill ALL CAPS */}
{/* DEPOIS: */}
<button className="
  fixed bottom-0 left-0 right-0
  h-[52px] mx-4 mb-6
  bg-accent hover:bg-accent-hover active:bg-accent-hover
  text-white text-[15px] font-semibold
  rounded-lg                    /* 8px — não pill */
  flex items-center justify-center gap-2
  transition-colors duration-120
  shadow-lg
">
  <CheckIcon className="w-4 h-4" />
  Concluir série {serieAtual}/{totalSeries}
</button>
```

---

## 5. Tela: Treino em Andamento (visão geral)

**Arquivo:** tela de visão geral durante treino ativo

### 5.1 Header do treino ativo

Está bem resolvido — manter estrutura. Ajustes pontuais:

```tsx
{/* Header: UPPER | 11/11 sets | timer | volume | FINISH */}
<div className="
  flex items-center gap-2 px-4 py-3
  bg-surface-1 border-b border-border-subtle
  sticky top-0 z-10
">
  <button className="w-8 h-8 rounded-md bg-surface-2 flex items-center justify-center">
    <ArrowLeftIcon className="w-4 h-4 text-text-secondary" />
  </button>

  <div className="flex-1">
    <p className="text-sm font-semibold text-text-primary">{nomeRotina}</p>
    <p className="text-xs text-text-muted">{setsCompletos}/{totalSets} sets</p>
  </div>

  {/* Timer e volume — font-mono */}
  <div className="flex items-center gap-3">
    <div className="text-right">
      <p className="text-sm font-bold font-mono tabular-nums text-accent">{timer}</p>
      <p className="text-xs font-mono tabular-nums text-text-muted">{volume} ton</p>
    </div>

    {/* Botão FINISH */}
    <button className="
      h-8 px-3 rounded-md
      bg-accent text-white
      text-xs font-semibold
      active:bg-accent-hover
    ">
      Finish
    </button>
  </div>
</div>
```

### 5.2 Banner "Treino em andamento"

```tsx
{/* ANTES: rounded-full/2xl — parece notificação de app */}
{/* DEPOIS: */}
<div className="
  mx-4 mt-3 mb-2
  flex items-center justify-between
  px-4 py-2.5
  bg-success/8 border border-success/20
  rounded-lg                    /* 8px */
">
  <div className="flex items-center gap-2">
    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
    <span className="text-xs font-medium text-success">Treino em andamento</span>
  </div>
  <button className="text-xs font-semibold text-accent">
    Retomar →
  </button>
</div>
```

### 5.3 Títulos de exercício — Title Case

```tsx
{/* ANTES: ALL CAPS */}
{/* DEPOIS: */}
<h3 className="text-sm font-bold text-text-primary">
  {toTitleCase(nomeExercicio)}
  {/* Ex: "Supino Inclinado com Halteres" */}
</h3>
```

**Função utilitária:**
```typescript
export function toTitleCase(str: string): string {
  const minusculas = ['com', 'de', 'do', 'da', 'no', 'na', 'em', 'e', 'a', 'o']
  return str
    .toLowerCase()
    .split(' ')
    .map((word, i) =>
      i === 0 || !minusculas.includes(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word
    )
    .join(' ')
}
```

### 5.4 Linhas de série concluída

Estado visual de série concluída está correto — manter fundo verde sutil e check verde. Apenas garantir que usa o grid fixo da seção 3.3.

---

## 6. Tela: Treino Concluído

**Arquivo:** tela de conclusão do treino

### 6.1 Ícone de celebração

```tsx
{/* ANTES: troféu em círculo verde com borda — parece emoji reestilizado */}
{/* DEPOIS: ícone SVG direto, sem container circular */}
<div className="flex flex-col items-center pt-12 pb-8">
  <TrophyIcon className="w-12 h-12 text-success mb-4" strokeWidth={1.5} />
  <h1 className="text-2xl font-bold text-text-primary">Treino concluído!</h1>
  <p className="text-sm text-text-muted mt-1 font-mono tabular-nums">
    {volume} ton · {duracao} · {totalSets} sets
  </p>
</div>
```

### 6.2 Cards de tema de exportação

**Problema:** thumbnails muito pequenos para mostrar diferença entre temas.

```tsx
<div className="px-4">
  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-3">
    Exportar para redes sociais
  </p>

  {temas.map((tema) => (
    <div key={tema.id} className="
      flex items-center gap-3
      px-4 py-3
      bg-surface-1 border border-border-subtle rounded-lg
      mb-2
    ">
      {/* Preview do tema — maior que antes, 48x48 */}
      <div className={`
        w-12 h-12 rounded-md flex-shrink-0
        flex items-center justify-center
        ${tema.preview}
      `}>
        <span className="text-[8px] font-bold">Aa</span>
      </div>

      <div className="flex-1">
        <p className="text-sm font-semibold text-text-primary">{tema.nome}</p>
        <p className="text-xs text-text-muted">{tema.descricao}</p>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1.5">
        <button className="w-8 h-8 rounded-md bg-surface-2 flex items-center justify-center">
          <ShareIcon className="w-3.5 h-3.5 text-text-secondary" />
        </button>
        <button className="w-8 h-8 rounded-md bg-surface-2 flex items-center justify-center">
          <DownloadIcon className="w-3.5 h-3.5 text-text-secondary" />
        </button>
      </div>
    </div>
  ))}
</div>
```

**Preview CSS por tema:**
```typescript
const temas = [
  {
    id: 'escuro',
    nome: 'Tema Escuro',
    descricao: 'Fundo preto, letras brancas',
    preview: 'bg-black text-white border border-border-subtle',
  },
  {
    id: 'claro',
    nome: 'Tema Claro',
    descricao: 'Fundo branco, letras pretas',
    preview: 'bg-white text-black',
  },
  {
    id: 'transparente',
    nome: 'Tema Transparente',
    descricao: 'Fundo transparente, letras brancas',
    preview: 'bg-gradient-to-br from-surface-2 to-surface-3 text-white border border-border-subtle',
  },
]
```

### 6.3 Botões de ação

```tsx
{/* ANTES: emoji 👁 em "Ver previews" */}
{/* DEPOIS: */}
<div className="px-4 mt-4 flex flex-col gap-2">
  {/* Ver previews — secundário */}
  <button className="
    w-full h-11
    bg-surface-1 border border-border-subtle rounded-lg
    flex items-center justify-center gap-2
    text-sm font-medium text-text-primary
  ">
    <EyeIcon className="w-4 h-4 text-text-secondary" />
    Ver previews
  </button>

  {/* Baixar — primário */}
  <button className="
    w-full h-[52px]
    bg-accent hover:bg-accent-hover rounded-lg
    flex items-center justify-center gap-2
    text-[15px] font-semibold text-white
  ">
    <DownloadIcon className="w-4 h-4" />
    Baixar os 3 estilos
  </button>

  {/* Ir para treinos — terciário/ghost */}
  <button className="
    w-full h-11
    bg-transparent rounded-lg
    text-sm font-medium text-text-secondary
  ">
    Ir para treinos
  </button>
</div>
```

---

## 7. Tela: Preview dos Estilos de Exportação

**Arquivo:** modal/tela de preview dos cards de exportação

### 7.1 Labels em inglês → português

**Buscar no projeto os textos:**
```
"Duration"      → "Duração"
"Total Volume"  → "Volume Total"
"Sets Completed" → "Séries"
"@coach"        → deve ser substituído pelo handle real do coach
                  ex: coach.handle ?? coach.nome
```

### 7.2 Handle do coach

O card de exportação mostra `AURONFIT · @coach` como placeholder. Isso precisa buscar o handle real do coach do aluno:

```typescript
// No componente de exportação, buscar:
const { data: coach } = useCoach(aluno.coachId)
const handleCoach = coach?.handle ?? coach?.nome ?? 'auronfit'

// No template do card:
// AURONFIT · @{handleCoach}
```

### 7.3 Proporção do card de exportação

Os cards de story (9:16) estão corretos para Instagram Stories. Verificar que o card de post (1:1) também está disponível como opção — é o formato mais compartilhado no feed.

---

## 8. Checklist de Implementação

### Fase 1 — Alinhamento de colunas (impacto visual imediato) 🔴

- [ ] Definir constante `GRID_COLS` com `grid-template-columns` fixo
- [ ] Aplicar na ficha aberta (header + cada linha de série)
- [ ] Aplicar no histórico do modal de execução (header + cada linha)
- [ ] Aplicar na tela de treino em andamento (header + cada linha)
- [ ] Renomear TÉ1/TÉ2 → T1/T2 em todos os lugares

### Fase 2 — Interatividade e UX (impacto funcional) 🔴

- [ ] Card de TÉCNICA clicável no modal de execução
- [ ] Criar componente `ModalInstrucaoTecnica` com bottom sheet
- [ ] Adicionar campo `instrucao` na tabela de técnicas (banco)
- [ ] Expor campo no coach panel (formulário de exercício/técnica)
- [ ] Animação `slide-up` no bottom sheet

### Fase 3 — Tipografia e botões 🟡

- [ ] ALL CAPS removido: botão "INICIAR TREINO" → "Iniciar treino"
- [ ] ALL CAPS removido: botão "CONCLUIR SÉRIE" → "Concluir série X/Y"
- [ ] Títulos de exercício: ALL CAPS → Title Case (função `toTitleCase`)
- [ ] `font-mono tabular-nums` em todos os valores numéricos (peso, reps, timer, volume)

### Fase 4 — Componentes visuais 🟡

- [ ] Ícone de haltere: remover container azul na lista de rotinas
- [ ] Chips de exercício truncados: remover da lista de rotinas
- [ ] Card "Progresso de Volume": ocultar quando < 4 sessões
- [ ] Banner "Treino em andamento": border-radius 8px
- [ ] Ícone de troféu: remover container circular verde
- [ ] Emoji 👁 → ícone SVG `EyeIcon`

### Fase 5 — Card de exportação 🟢

- [ ] Labels em português ("Duration" → "Duração" etc.)
- [ ] Handle real do coach no rodapé do card
- [ ] Preview de tema maior (48px) nos cards de seleção
- [ ] Avaliar adição de formato 1:1 (feed) além do 9:16 (story)

---

## 9. Busca Global — Remanescentes a Verificar

```bash
# ALL CAPS em botões e títulos de exercício
grep -r "uppercase" app/aluno/ --include="*.tsx" | grep -v "tracking\|label\|eyebrow\|badge"

# Textos em inglês no card de exportação
grep -rn "Duration\|Total Volume\|Sets Completed\|@coach" app/ --include="*.tsx" --include="*.ts"

# Emoji remanescente
grep -rn "👁\|🏆\|🔥\|⚡\|🎉" app/aluno/ --include="*.tsx"

# rounded-full em botões (pill)
grep -rn "rounded-full" app/aluno/ --include="*.tsx" | grep -v "avatar\|circle\|dot\|indicator\|pulse"

# grid sem template-columns fixo em tabelas de série
grep -rn "grid.*col" app/aluno/ --include="*.tsx" | grep -v "template-columns"
```

