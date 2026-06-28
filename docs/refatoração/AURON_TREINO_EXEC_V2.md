# AURON — Refatoração Telas de Treino · V2

> **Escopo:** Ajustes cirúrgicos nas telas de ficha aberta, modal de execução de série, e tela de compartilhamento. Inclui especificação para inserção de GIF de demonstração.
> **Base:** Documento anterior `AURON_ALUNO_TREINO_REFACTOR.md` — este complementa, não substitui.

---

## 1. Ficha Aberta — Espaçamentos e Grid

### 1.1 Padding lateral global da tela

O problema de SET e checkbox colados nas bordas é falta de padding consistente no container da tabela.

```tsx
{/* Container do exercício */}
<div className="bg-surface-1 border border-border-subtle rounded-lg mx-4 mb-3 overflow-hidden">

  {/* Header do exercício */}
  <div className="px-4 pt-4 pb-3 border-b border-border-subtle/50">
    <h3 className="text-sm font-semibold text-text-primary">
      {toTitleCase(exercicio.nome)}
    </h3>
    {/* Descanso — margin-top 6px mínimo do nome */}
    <div className="flex items-center gap-1 mt-1.5">
      <ClockIcon className="w-3 h-3 text-accent flex-shrink-0" />
      <span className="text-xs text-accent">Descanso: {formatTime(exercicio.descanso)}</span>
    </div>
  </div>

  {/* Tabela de séries */}
  <div className="px-4 pt-2 pb-3">
    {/* Header */}
    <TableHeader />
    {/* Linhas */}
    {exercicio.series.map((s, i) => <TableRow key={i} serie={s} index={i} />)}
  </div>
</div>
```

### 1.2 Grid com larguras fixas — atualizado com padding correto

```typescript
// Definir como constante — usar em header E rows
const COLS = "28px 1fr 52px 44px 34px 34px 36px"
//           SET  ANT  PESO  REPS T1   T2   CHECK
```

```tsx
{/* Header da tabela */}
<div
  className="grid items-center py-2 mb-1"
  style={{ gridTemplateColumns: COLS }}
>
  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">
    Set
  </span>
  {/* ANT com padding-left para separar visualmente do SET */}
  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted pl-2">
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

{/* Row de série */}
<div
  className="grid items-center py-2.5 border-t border-border-subtle/30"
  style={{ gridTemplateColumns: COLS }}
>
  {/* SET */}
  <div className="flex justify-center">
    <span className="w-6 h-6 rounded-md bg-surface-2 flex items-center justify-center
                     text-[11px] font-semibold font-mono text-text-muted">
      {serie.numero}
    </span>
  </div>

  {/* ANT — com padding-left igual ao header */}
  <span className="text-[11px] text-text-muted truncate pl-2">
    {serie.anterior ?? "—"}
  </span>

  {/* PESO */}
  <span className="text-[15px] font-bold font-mono tabular-nums text-text-primary text-right">
    {serie.peso}
  </span>

  {/* REPS */}
  <span className="text-[13px] font-semibold font-mono tabular-nums text-accent text-center">
    {serie.reps}
  </span>

  {/* T1 */}
  <span className="text-[11px] font-medium text-text-secondary text-center">
    {serie.t1 ?? "—"}
  </span>

  {/* T2 */}
  <span className="text-[11px] font-medium text-accent text-center">
    {serie.t2 ?? "—"}
  </span>

  {/* CHECK — área de toque mínima 44px, mas visualmente contida */}
  <div className="flex justify-center">
    <button className="w-7 h-7 rounded-md border border-border-subtle
                       flex items-center justify-center
                       active:bg-success/10 active:border-success/30
                       transition-colors duration-100">
      {serie.concluida
        ? <CheckIcon className="w-3.5 h-3.5 text-success" />
        : <span className="w-3.5 h-3.5" />
      }
    </button>
  </div>
</div>
```

---

## 2. Modal de Execução — Refatoração Completa

### 2.1 Correções pendentes identificadas nas prints

- TÉ1/TÉ2 no histórico ainda não renomeados → T1/T2
- Dot azul no canto da série ativa → remover, manter apenas linha de progresso
- "CONCLUIR SÉRIE 1/4" em ALL CAPS → remover caps
- Card de TÉCNICA → tornar clicável com ícone `i`
- Campo de CARGA → aumentar

### 2.2 Dot azul de série ativa — remover

```tsx
{/* REMOVER este padrão: */}
{/* <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent" /> */}

{/* Manter apenas: a linha de progresso no topo do modal */}
<div className="w-full h-0.5 bg-surface-2">
  <div
    className="h-full bg-accent transition-all duration-300"
    style={{ width: `${(serieAtual / totalSeries) * 100}%` }}
  />
</div>
```

### 2.3 Campo de CARGA — aumentado

```tsx
<div className="mx-4 mt-4 bg-surface-1 border border-border-subtle rounded-lg p-4">
  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-3">
    Carga (kg)
  </p>

  {/* Linha principal — altura aumentada de h-11 para h-14 */}
  <div className="flex items-center gap-2">
    <button className="
      w-14 h-14 rounded-lg          /* maior: era w-11 h-11 */
      bg-surface-2 border border-border-subtle
      flex items-center justify-center
      text-2xl font-medium text-text-primary
      active:bg-surface-3
    ">
      −
    </button>

    <div className="flex-1 h-14 bg-surface-0 border border-border-default rounded-lg
                    flex items-center justify-center">
      <span className="text-4xl font-bold font-mono tabular-nums text-text-primary">
        {carga}
      </span>
    </div>

    <button className="
      w-14 h-14 rounded-lg          /* maior: era w-11 h-11 */
      bg-accent
      flex items-center justify-center
      text-2xl font-medium text-white
      active:bg-accent-hover
    ">
      +
    </button>
  </div>

  {/* Incrementos rápidos */}
  <div className="grid grid-cols-4 gap-2 mt-2.5">
    {['-5', '-2.5', '+2.5', '+5'].map((inc) => (
      <button key={inc} className="
        h-9 rounded-md             /* era h-8 */
        bg-surface-2 border border-border-subtle
        text-sm font-medium font-mono text-text-secondary
        active:bg-surface-3
      ">
        {inc}
      </button>
    ))}
  </div>
</div>
```

### 2.4 Área de demonstração do exercício (GIF)

**Decisão técnica — GIF vs Boneco 3D:**

GIF de execução é a escolha correta para este contexto por três razões:
1. Mostra o movimento real — o aluno entende imediatamente o que fazer
2. Loop automático sem interação — funciona passivamente enquanto o aluno se prepara
3. Upload simples pelo coach no painel — sem necessidade de renderização 3D

O boneco 3D anatomico (estilo Hevy) faz sentido para o card de exportação instagramável (mapa muscular pós-treino), mas não durante a execução.

**Especificação técnica do GIF:**
- Formato: GIF ou WebP animado (WebP tem ~30% menos tamanho)
- Tamanho máximo: 2MB por exercício
- Dimensões: 480×480px mínimo (exibido em proporção 1:1 na tela)
- Loop: infinito, sem controles
- Upload: campo no coach panel na tela de biblioteca de exercícios

**Layout com GIF no modal:**

```tsx
{/* Estrutura do modal refatorada para acomodar GIF */}
<div className="flex flex-col h-screen bg-surface-0">

  {/* Header fixo */}
  <div className="flex-shrink-0">
    {/* barra de progresso */}
    <div className="w-full h-0.5 bg-surface-2">
      <div className="h-full bg-accent" style={{ width: `${progresso}%` }} />
    </div>

    <div className="flex items-center gap-3 px-4 pt-3 pb-2">
      <button className="w-8 h-8 rounded-md bg-surface-1 flex items-center justify-center">
        <XIcon className="w-4 h-4 text-text-secondary" />
      </button>
      <div className="flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">
          Exercício {exercicioAtual}/{totalExercicios}
        </p>
        <p className="text-sm font-semibold text-text-primary">
          {toTitleCase(nomeExercicio)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[10px] text-text-muted">Série</p>
        <p className="text-base font-bold font-mono text-text-primary">
          {serieAtual}<span className="text-text-muted font-normal">/{totalSeries}</span>
        </p>
      </div>
    </div>
  </div>

  {/* Conteúdo scrollável */}
  <div className="flex-1 overflow-y-auto pb-24">

    {/* GIF de demonstração — quando disponível */}
    {exercicio.gifUrl ? (
      <div className="mx-4 mt-2 mb-4 rounded-lg overflow-hidden bg-surface-1
                      border border-border-subtle aspect-square">
        <img
          src={exercicio.gifUrl}
          alt={`Demonstração: ${exercicio.nome}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    ) : (
      {/* Placeholder quando não há GIF */}
      <div className="mx-4 mt-2 mb-4 rounded-lg bg-surface-1 border border-border-subtle
                      aspect-square flex flex-col items-center justify-center gap-2">
        <DumbbellIcon className="w-8 h-8 text-text-muted" strokeWidth={1} />
        <p className="text-xs text-text-muted">Sem demonstração</p>
      </div>
    )}

    {/* 3 cards de contexto: REPETIÇÕES / ÚLTIMA VEZ / TÉCNICA */}
    <div className="grid grid-cols-3 gap-2 px-4 mb-4">

      <div className="bg-surface-1 border border-border-subtle rounded-lg p-3 flex flex-col items-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted mb-1">
          Repetições
        </span>
        <span className="text-2xl font-bold font-mono tabular-nums text-text-primary">
          {repsPrescritas}
        </span>
      </div>

      <div className="bg-surface-1 border border-border-subtle rounded-lg p-3 flex flex-col items-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted mb-1">
          Última vez
        </span>
        <span className="text-sm font-medium font-mono text-text-secondary text-center leading-tight">
          {ultimaVez ?? "—"}
        </span>
      </div>

      {/* TÉCNICA — clicável */}
      <button
        onClick={() => setModalTecnicaAberto(true)}
        className="
          bg-accent/10 border border-accent/25 rounded-lg
          p-3 flex flex-col items-center relative
          active:bg-accent/20 transition-colors duration-100
        "
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted mb-1">
          Técnica
        </span>
        <span className="text-xs font-semibold text-accent text-center leading-tight">
          {nomeTecnica ?? "—"}
        </span>
        {nomeTecnica && (
          <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full
                           bg-accent/20 text-accent text-[8px] font-bold
                           flex items-center justify-center">
            i
          </span>
        )}
      </button>
    </div>

    {/* Campo de CARGA — aumentado (seção 2.3) */}
    {/* ... */}

    {/* Histórico de séries */}
    {/* ... com T1/T2 (não TÉ1/TÉ2) e sem dot azul */}
  </div>

  {/* Botão fixo no rodapé */}
  <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3
                  bg-gradient-to-t from-surface-0 via-surface-0/95 to-transparent">
    <button className="
      w-full h-[52px]
      bg-accent rounded-lg
      flex items-center justify-center gap-2
      text-[15px] font-semibold text-white
      active:bg-accent-hover
    ">
      <CheckIcon className="w-4 h-4" />
      Concluir série {serieAtual}/{totalSeries}
    </button>
  </div>

</div>
```

### 2.5 Histórico de Séries — T1/T2 e sem dot

```typescript
// Renomear TÉ1 → T1 e TÉ2 → T2 no histórico do modal
// Remover o dot azul (●) que aparecia no canto direito da linha ativa
// A linha ativa já é identificada pelo círculo azul preenchido no número da série

const COLS_HISTORICO = "28px 1fr 52px 44px 32px 32px"
//                     SET  ANT  PESO  REPS T1   T2
// Removida coluna de CHECK/dot — não necessária no histórico
```

---

## 3. Tela de Compartilhamento — Ajustes

### 3.1 Remover botões desnecessários

```tsx
{/* REMOVER: */}
{/* <button>Baixar todos os cards (5)</button> */}
{/* <button>Copiar link</button>              */}

{/* MANTER e ajustar hierarquia: */}
<div className="px-4 mt-4 flex flex-col gap-2">

  {/* Compartilhar — primário */}
  <button className="
    w-full h-[52px] bg-accent rounded-lg
    flex items-center justify-center gap-2
    text-[15px] font-semibold text-white
  ">
    <ShareIcon className="w-4 h-4" />
    Compartilhar este card
  </button>

  {/* Download — secundário */}
  <button
    onClick={() => downloadCard(cardAtivo, temaAtivo)}
    className="
      w-full h-11
      bg-surface-1 border border-border-subtle rounded-lg
      flex items-center justify-center gap-2
      text-sm font-medium text-text-primary
    "
  >
    <DownloadIcon className="w-4 h-4 text-text-secondary" />
    Salvar imagem
  </button>

  {/* Pular */}
  <button
    onClick={() => router.push('/aluno/treinos')}
    className="w-full h-10 text-sm text-text-muted"
  >
    Pular
  </button>
</div>
```

### 3.2 Correção do card cortado — problema de layout

**Causa:** O card preview na tela usa proporção relativa (width: 85vw) mas o conteúdo interno usa `fontSize` em percentual relativo ao container — quando o container é pequeno, os valores percentuais ficam minúsculos e o layout quebra.

**Solução:** Usar `scale()` CSS para reduzir um card de tamanho fixo, não redimensionar os valores internos:

```tsx
{/* Card preview no carrossel — escala o card de 1080px para caber na tela */}
<div className="flex-shrink-0 snap-center" style={{ width: '85vw' }}>
  {/* Container que faz o scale */}
  <div style={{
    width: '85vw',
    aspectRatio: '1/1',
    overflow: 'hidden',
    borderRadius: 12,
    position: 'relative',
  }}>
    {/* Card interno em 1080px sendo escalado para caber */}
    <div style={{
      width: 1080,
      height: 1080,
      transform: `scale(${(window.innerWidth * 0.85) / 1080})`,
      transformOrigin: 'top left',
      position: 'absolute',
      top: 0,
      left: 0,
    }}>
      <CardComponent dados={dadosTreino} tema={temaAtivo} />
    </div>
  </div>
</div>
```

**Por que funciona:** O card é renderizado em 1080×1080 e reduzido via `transform: scale()` — preserva todas as proporções, fontes e layout exatamente como serão exportados. O que você vê no preview é exatamente o que será baixado.

**Hook para calcular o scale:**
```typescript
const [cardScale, setCardScale] = useState(1)

useEffect(() => {
  const calcScale = () => {
    const previewWidth = window.innerWidth * 0.85
    setCardScale(previewWidth / 1080)
  }
  calcScale()
  window.addEventListener('resize', calcScale)
  return () => window.removeEventListener('resize', calcScale)
}, [])
```

### 3.3 Exportação — função de download do card atual

```typescript
const downloadCard = async (index: number, tema: Tema) => {
  const el = cardRefs.current[index]
  if (!el) return

  try {
    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(el, {
      width: 1080,
      height: 1080,
      pixelRatio: 1,
      cacheBust: true,
    })

    const link = document.createElement('a')
    link.download = `auron-treino-${cards[index].id}-${tema}-${Date.now()}.png`
    link.href = dataUrl
    link.click()
  } catch (err) {
    console.error('Erro ao gerar imagem:', err)
    // toast de erro
  }
}
```

---

## 4. Coach Panel — Campo de GIF no Exercício

Para o sistema de GIF funcionar, o coach panel precisa de um campo de upload na biblioteca de exercícios.

**Arquivo:** `app/admin/biblioteca-exercicios/[id]/page.tsx` ou no modal de edição do exercício

```tsx
{/* Adicionar na seção de edição do exercício, após nome e grupo muscular */}
<div className="mt-4">
  <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted block mb-1.5">
    GIF / Vídeo de demonstração
  </label>

  {exercicio.gifUrl ? (
    <div className="relative rounded-lg overflow-hidden border border-border-subtle aspect-video bg-surface-2">
      <img src={exercicio.gifUrl} className="w-full h-full object-cover" />
      <button
        onClick={() => removerGif()}
        className="absolute top-2 right-2 w-7 h-7 rounded-md bg-surface-0/80
                   flex items-center justify-center"
      >
        <XIcon className="w-3.5 h-3.5 text-text-primary" />
      </button>
    </div>
  ) : (
    <div
      onClick={() => inputGifRef.current?.click()}
      className="
        border border-dashed border-border-default rounded-lg
        p-6 flex flex-col items-center gap-2
        cursor-pointer hover:border-accent hover:bg-accent/5
        transition-colors duration-120
      "
    >
      <UploadIcon className="w-5 h-5 text-text-muted" />
      <p className="text-xs text-text-muted text-center">
        Clique para enviar GIF ou WebP animado<br/>
        <span className="text-[11px]">Máximo 2MB · 480×480px mínimo</span>
      </p>
    </div>
  )}

  <input
    ref={inputGifRef}
    type="file"
    accept="image/gif,image/webp"
    className="hidden"
    onChange={handleGifUpload}
  />
</div>
```

**Banco de dados — campo a adicionar:**
```sql
ALTER TABLE exercicios ADD COLUMN gif_url TEXT;
-- ou se usar storage do Supabase:
-- gif_url armazena o path relativo, URL pública gerada via getPublicUrl()
```

---

## 5. Checklist

### Crítico 🔴
- [ ] Padding lateral `px-4` no container da tabela de séries (ficha aberta)
- [ ] `pl-2` na coluna ANT para separar do SET — aplicar em header e rows
- [ ] `mt-1.5` no descanso abaixo do nome do exercício
- [ ] Dot azul removido do modal de execução
- [ ] TÉ1/TÉ2 → T1/T2 no histórico do modal
- [ ] "CONCLUIR SÉRIE" → "Concluir série X/Y" (sem caps)
- [ ] Técnica clicável com ícone `i`
- [ ] Campo de CARGA maior (botões w-14 h-14, valor text-4xl)
- [ ] Carrossel usando `transform: scale()` — preview fiel ao exportado
- [ ] Remover "Baixar todos os cards" e "Copiar link"
- [ ] Adicionar botão "Salvar imagem" (download do card atual)

### Alto 🟡
- [ ] Layout do modal refatorado para acomodar GIF
- [ ] Placeholder quando exercício não tem GIF
- [ ] Campo de upload de GIF no coach panel (biblioteca de exercícios)
- [ ] Campo `gif_url` no banco de dados
- [ ] Função `downloadCard()` com `html-to-image`

### Normal 🟢
- [ ] Modal de instrução da técnica (bottom sheet com animação slide-up)
- [ ] Gradiente no rodapé do modal para o botão de concluir
- [ ] Suporte a WebP animado além de GIF

