# IMPLEMENTAÇÃO: Refatoração Desktop-First do Painel do Coach

## CONTEXTO

O painel do coach (`/admin/*`) hoje usa o MESMO padrão de layout do app mobile do aluno: sidebar estreita, conteúdo confinado a uma coluna de ~700px, mesmo em monitores largos. Isso é o problema central a resolver — coaches usam o painel principalmente em desktop para prescrever treinos e acompanhar dados financeiros, então a interface precisa aproveitar a largura real da tela.

**Diagnóstico confirmado em 11 telas do painel:** em quase todas, 40–70% da viewport fica vazia (preta), porque o container de conteúdo tem `max-width` baixo demais e a sidebar não tem labels de texto, só ícones.

**Importante:** a paleta de cores (preto + dourado) e a tipografia já estão corretas e alinhadas com o app do aluno — NÃO mudar isso. O trabalho aqui é estrutural/arquitetura de layout, não re-estilização visual.

---

## 1. SIDEBAR — Adicionar labels e tornar responsiva

### Estado atual
Sidebar fixa de ~64px de largura, só com ícones, sem texto. Usuário precisa decorar o que cada ícone faz.

### Mudança necessária

```tsx
// Pseudo-estrutura esperada
<Sidebar>
  <SidebarHeader>
    {/* Logo + nome do negócio, já existe — manter */}
  </SidebarHeader>

  <SidebarNav>
    <SidebarItem icon={<Users />} label="Atletas" href="/admin/alunos" active={...} />
    <SidebarItem icon={<BookOpen />} label="Biblioteca" href="/admin/biblioteca" active={...} />
    <SidebarItem icon={<Barbell />} label="Treinos" href="/admin/treinos" active={...} />
    <SidebarItem icon={<AppleLogo />} label="Nutrição" href="/admin/nutricao" active={...} />
    <SidebarItem icon={<ChatCircle />} label="Feedbacks" href="/admin/feedbacks" active={...} />
    <SidebarItem icon={<Tag />} label="Parceiros" href="/admin/parceiros" active={...} />
    <SidebarItem icon={<Trophy />} label="Ranking" href="/admin/ranking" active={...} />
    <SidebarItem icon={<ChartBar />} label="Relatórios" href="/admin/relatorios" active={...} />
    <SidebarItem icon={<User />} label="Perfil" href="/admin/perfil" active={...} />
  </SidebarNav>

  <SidebarFooter>
    {/* NOVO: avatar do coach + nome + botão logout — hoje só tem ícone de saída solto */}
    <CoachMiniProfile name={coachName} avatarUrl={coachAvatar} onLogout={handleLogout} />
  </SidebarFooter>
</Sidebar>
```

### Comportamento responsivo (breakpoints)

| Largura da tela | Comportamento |
|---|---|
| `≥ 1280px` | Sidebar expandida, 240px, ícone + label sempre visíveis |
| `1024px – 1279px` | Sidebar colapsada, 64px, só ícone, com `title`/tooltip no hover mostrando o label |
| `< 1024px` | Sidebar vira drawer off-canvas (escondida por padrão, abre com botão hambúrguer) |

### Especificação visual de cada item
- Altura: 44px
- Padding: 12px vertical, 16px horizontal
- Ícone: 20px
- Label: 14px, peso 500, ao lado do ícone com gap de 12px
- Estado ativo: fundo `bg-brand-subtle` (já existe no projeto), texto e ícone em cor accent (dourado), barra de 3px à esquerda (manter padrão já existente, só estender pro layout expandido)
- Transição de expandir/colapsar: `width` com `transition: width 200ms ease`, e o texto faz fade-out/fade-in (não deixar o texto quebrar linha durante a transição — usar `white-space: nowrap` + `overflow: hidden`)

---

## 2. CONTAINER DE CONTEÚDO — Aumentar largura útil

### Estado atual
Praticamente todas as páginas usam algo como `max-w-2xl` (672px) ou similar, resultando em conteúdo confinado numa coluna estreita à esquerda da tela.

### Mudança necessária
Trocar o `max-width` do container principal de cada página de `/admin/*` para um valor adequado a desktop:

```css
/* Antes (exemplo do padrão que provavelmente está em uso) */
.admin-content-container {
  max-width: 672px; /* max-w-2xl do Tailwind */
}

/* Depois */
.admin-content-container {
  max-width: 1440px;
  padding-left: 40px;
  padding-right: 40px;
  margin: 0 auto;
}
```

Se o projeto usa Tailwind, trocar classes como `max-w-2xl` por `max-w-[1440px]` (ou criar um valor customizado `max-w-content` no `tailwind.config`) em TODOS os arquivos de página dentro de `/app/admin/`.

**Atenção:** essa mudança sozinha, sem reestruturar o conteúdo interno, vai deixar as páginas com conteúdo "boiando" à esquerda de uma área maior — por isso as seções 3 e 4 abaixo (componentes de Data Table e grid) são necessárias em conjunto, não a mudança de max-width isolada.

---

## 3. NOVO COMPONENTE: `DataTable` genérico

Construir um componente de tabela reutilizável para substituir as listas verticais de cards em várias telas. Usar como referência o padrão que JÁ EXISTE e funciona bem na tela de Ranking (que já é uma tabela) — generalizar esse padrão.

```tsx
interface DataTableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode; // célula customizada (avatar, badge, etc)
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyState?: React.ReactNode;
  rowActions?: (row: T) => React.ReactNode; // menu de ações, aparece no hover
  pagination?: { pageSize: number };
}
```

**Especificações visuais:**
- Altura de linha: 56px
- Header da tabela: fundo `bg-surface-2` (ou equivalente já usado no projeto), labels em caption uppercase, 12px, cor secundária
- Linha: fundo transparente por padrão, hover com `background: rgba(212,168,67,0.04)` (leve tom dourado)
- Coluna de ações (`rowActions`): só aparece visualmente no hover da linha — usar `opacity-0 group-hover:opacity-100 transition-opacity`
- Bordas: usar separador 1px sutil entre linhas, igual ao padrão de separadores já definido para o app do aluno (`--border-subtle`)
- Avatar + nome (quando aplicável): avatar 32px circular + nome em uma única célula

**Onde aplicar este componente:**
1. **Base de Atletas** — colunas: Avatar+Nome | Plano | Status | Renovação | Última Atividade | Pontos | Ações
2. **Ranking** — expandir a tabela existente para usar este componente, largura total, adicionando colunas de Sequência e Treinos no período
3. **Gestão de Treinos (hub)** — nova seção "Fichas Recentes": Aluno | Nome da Rotina | Data de Criação | Status
4. **Gestão de Nutrição** — nova seção "Planos Enviados": Aluno | Descrição | Data de Envio | Ação (reenviar)

---

## 4. NOVO COMPONENTE: `SlideOverPanel`

Painel lateral deslizante para visualização rápida de detalhe sem navegação de página inteira.

```tsx
interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number; // default 480
  children: React.ReactNode;
}
```

**Comportamento:**
- Desliza da direita para a esquerda, `transform: translateX(100%) → translateX(0)`, transição 250ms ease-out
- Backdrop semi-transparente atrás (`rgba(0,0,0,0.5)`), clique no backdrop fecha o painel
- Largura padrão: 480px (ajustável via prop)
- Fundo: `--bg-card-elevated`
- Header do painel: título + botão de fechar (X) + opcionalmente botão "Expandir" (navega para a página completa do item)

**Onde aplicar:**
- Ao clicar numa linha da tabela de **Base de Atletas**, abre o detalhe resumido do aluno neste painel lateral (dados principais, KPIs, link rápido para ficha ativa), em vez de navegar imediatamente para a página completa de detalhe. Um botão "Ver perfil completo" dentro do painel navega para a página cheia quando o coach realmente precisar de tudo.

---

## 5. PÁGINA: Detalhe do Aluno — converter para sistema de abas

### Estado atual
Tudo empilhado verticalmente em sequência: header → fichas digitais → plano alimentar → protocolo de treino → histórico de medidas → notas → dinâmica de carga → linha do tempo de fotos. Um scroll muito longo.

### Mudança necessária

Manter o header como está (já funciona bem: avatar, nome, badges de status/plano/ticket/renovação, botões Gerir Plano/Desativar).

Abaixo do header, adicionar navegação em abas:

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
    <TabsTrigger value="treinos">Treinos</TabsTrigger>
    <TabsTrigger value="nutricao">Nutrição</TabsTrigger>
    <TabsTrigger value="medidas">Medidas & Evolução</TabsTrigger>
    <TabsTrigger value="notas">Notas</TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    {/* KPIs resumidos + últimas 3 atividades + gráfico de dinâmica de carga compacto */}
  </TabsContent>

  <TabsContent value="treinos">
    {/* Seção "Fichas digitais" que já existe, movida pra cá */}
  </TabsContent>

  <TabsContent value="nutricao">
    {/* Seção "Plano alimentar" que já existe, movida pra cá */}
  </TabsContent>

  <TabsContent value="medidas">
    {/* Tabela de "Histórico de medidas" (já existe e está correta) + Linha do tempo de fotos, lado a lado em telas largas usando grid de 2 colunas */}
  </TabsContent>

  <TabsContent value="notas">
    {/* "Notas do especialista" isolado */}
  </TabsContent>
</Tabs>
```

Se o projeto já usa shadcn/ui (mencionado como disponível no stack), usar o componente `Tabs` nativo dele.

---

## 6. PÁGINA: Gestão de Treinos (hub) — preencher o espaço vazio

### Estado atual
Só 2 cards de atalho ("Nova Ficha Digital" e "Upload de PDF") no canto superior esquerdo, resto da tela vazio.

### Mudança necessária

```tsx
<PageHeader title="Gestão de Treinos" subtitle="Expedição de treinos técnicos para atletas" />

<div className="grid grid-cols-12 gap-6">
  <div className="col-span-4">
    {/* Os 2 cards de atalho existentes, empilhados verticalmente */}
  </div>
  <div className="col-span-8">
    <KPIRow>
      {/* Total de fichas ativas / Criadas este mês / Taxa média de conclusão */}
    </KPIRow>
    <DataTable
      columns={[...]} // Aluno | Nome da Rotina | Criada em | Status
      data={fichasRecentes}
      onRowClick={(ficha) => router.push(`/admin/alunos/${ficha.alunoId}?tab=treinos`)}
    />
  </div>
</div>
```

---

## 7. PÁGINA: Relatórios Financeiros — corrigir paleta e adicionar comparativos

### Mudanças pontuais:

1. **Gráfico "Receita por Mês":** trocar a cor das barras de azul (`#4A9FFF` ou similar) para o accent dourado do projeto (`#D4A843` ou a variável já em uso). Se usar `recharts` (já está nas dependências do projeto), trocar a prop `fill` do componente `Bar`.

2. **KPIs do topo (Total Alunos Ativos / Pagos / Pendentes):** adicionar abaixo de cada número uma linha pequena de comparação: `+X% vs. mês anterior` em verde (se positivo) ou vermelho (se negativo). Requer calcular o KPI do período anterior e comparar.

3. **Adicionar seletor de período** no header da página: chips ou dropdown com opções "Este mês / Trimestre / Ano / Personalizado" — o gráfico de receita hoje mostra um range fixo de 12 meses passados + 6 futuros sem possibilidade de ajuste.

4. **Adicionar botão "Exportar Relatório"** no header da página, gerando PDF ou CSV do resumo financeiro do período selecionado.

---

## 8. PÁGINA: Biblioteca de Exercícios — ajustes de densidade

1. **Filtro de grupo muscular:** remover o scroll horizontal forçado. Em telas ≥1280px, permitir que os chips quebrem em múltiplas linhas (`flex-wrap`) em vez de ficarem comprimidos numa única linha rolável.

2. **Cards de exercício:** substituir os 2 botões grandes (Editar/Deletar) por um único ícone de menu (•••) no canto superior direito do card, que abre um dropdown com as ações (Editar / Duplicar / Deletar). Isso libera espaço vertical no card para eventualmente mostrar mais informação (ex: badge do tipo de exercício, equipamento).

3. **Grid responsivo:** em telas ≥1600px, expandir de 3 para 4 colunas.

---

## 9. PÁGINA: Feedbacks — corrigir bug de dados + compactar layout

### BUG CRÍTICO a corrigir primeiro
Cada card mostra o nome do aluno duas vezes em sequência (ex: "Luiz Irias" em negrito, depois "Luiz Irias" em cinza embaixo). Investigar o componente — provavelmente há dois campos sendo renderizados (`nome` e `username`/`display_name`) que estão retornando o mesmo valor. Corrigir para mostrar o nome uma única vez, e só mostrar um segundo campo (ex: username) se ele for diferente do nome principal.

### Layout
Compactar cada item: avatar pequeno (28px) + nome + tag de origem (Dashboard/Pós-Treino) na mesma linha horizontal; texto do feedback abaixo, ocupando largura total; data no rodapé em caption pequena. Isso deve reduzir a altura de cada card em ~30%, permitindo ver mais feedbacks por scroll.

---

## 10. PÁGINA: Gestão de Parceiros — grid + melhoria de card

1. Trocar o layout de card único solto para um `grid grid-cols-3 gap-6` (ou 4 colunas em telas muito largas), preparando para múltiplos parceiros.
2. No card existente, há um bug visual: o campo de cupom mostra "coloquea" cortado/ilegível ao lado do texto "CUPOM" — verificar se é um placeholder de texto sendo truncado incorretamente ou dado real mal formatado.
3. Empty state (sem parceiros cadastrados): ilustração outline central + texto + botão CTA grande, em vez de tela vazia.

---

## 11. PÁGINA: Gestão de Nutrição — layout em 2 colunas

```tsx
<div className="grid grid-cols-12 gap-6">
  <div className="col-span-5">
    {/* Formulário de upload existente, mantém como está */}
  </div>
  <div className="col-span-7">
    <h3>Planos Enviados Recentemente</h3>
    <DataTable
      columns={[...]} // Aluno | Descrição | Enviado em | Ações
      data={planosEnviados}
    />
  </div>
</div>
```

---

## 12. COMPONENTE: `PageHeader` — padronizar

Criar (ou formalizar, se já existir parcialmente) um componente único usado em todas as páginas `/admin/*`:

```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode; // botão(ões) alinhados à direita
  breadcrumbs?: { label: string; href?: string }[];
}
```

Aplicar consistentemente — hoje o padrão título+subtítulo+ação já existe em algumas telas (ex: Gestão de Parceiros tem "ADICIONAR PARCEIRO" alinhado à direita corretamente), generalizar para todas.

---

## 12B. CORREÇÃO DE TOM VISUAL — Border-radius, sombras e dashboard de receita

Esta seção foi adicionada após revisão crítica: o painel hoje usa estética de app de consumo (raios muito arredondados, sombra dourada/glow em botões, uppercase em excesso) em vez de ferramenta B2B séria. Aplicar ANTES ou JUNTO da seção 1 (sidebar), porque toca o design system global.

### 12B.1 Substituir o sistema de border-radius

Localizar onde o projeto define os valores de radius (provavelmente `tailwind.config.js`/`.ts` em `borderRadius`, ou CSS custom properties em `globals.css`). Substituir pela escala abaixo — note que é BEM menor que o padrão atual em todos os níveis:

```css
:root {
  --radius-none: 0px;   /* tabelas, linhas de tabela, separadores — NUNCA arredondar dado tabular */
  --radius-xs: 4px;     /* badges, tags, chips de status */
  --radius-sm: 6px;     /* inputs, selects, textareas */
  --radius-md: 8px;     /* botões (incluindo CTA), dropdowns */
  --radius-lg: 10px;    /* cards de conteúdo, modais */
  --radius-xl: 12px;    /* painéis grandes — TETO da escala, nunca passar disso */
}
```

**Regra crítica:** nenhum elemento retangular do projeto (botão, input, card) deve ultrapassar 12px de radius. Se encontrar `rounded-full`, `rounded-3xl`, `border-radius: 9999px` ou valores equivalentes aplicados a um botão/input/card retangular (não circular), trocar pelo nível apropriado acima. `rounded-full`/`50%` continua correto SOMENTE para avatares.

**Ação específica:** revisar todo botão CTA do tipo pill totalmente arredondada (ex: o botão "Protocolar Plano Agora" na tela de Nutrição, "Publicar protocolo PDF", "Salvar notas") e trocar para retângulo com `--radius-md` (8px).

### 12B.2 Remover sombra colorida (glow) de elementos funcionais

Buscar no código por `shadow-gold-glow`, `box-shadow` com cor de brand/accent, ou `var(--shadow-gold-glow)` (mencionado em CSS já existente no projeto). Substituir por sombra neutra em todos os usos EXCETO talvez 1 elemento de destaque pontual por tela, se houver justificativa de produto:

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
--shadow-md: 0 2px 8px rgba(0,0,0,0.35);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.4);
```

### 12B.3 Reduzir uso de uppercase

Manter uppercase + letter-spacing apenas em: labels curtos de KPI (ex: "ATIVOS", "PENDENTES") e badges de status. Remover uppercase de títulos de seção de card (ex: "Histórico de Medidas", "Notas do Especialista", "Dinâmica de Carga") — esses devem usar capitalização normal de frase (sentence case), sem letter-spacing.

### 12B.4 Corrigir truncamento sem indicação visual

Na tela de Gestão de Parceiros, o campo de cupom mostra texto cortado de forma ilegível (ex: "coloquea"). Localizar o componente do card de parceiro e garantir que texto longo demais para o espaço disponível use `text-overflow: ellipsis` com `title` attribute (tooltip nativo) mostrando o valor completo, ou aumentar a largura do campo.

### 12B.5 Nova tela: Dashboard / Home do coach com receita em destaque

Hoje não existe uma tela de abertura consolidada — o painel aparentemente abre direto em "Base de Atletas". Criar (ou promover, se já existir e não foi capturada nos prints) uma rota `/admin` ou `/admin/dashboard` como home, estruturada em ordem de prioridade visual (padrão de leitura em F: canto superior esquerdo = informação mais crítica):

```tsx
<PageHeader title="Dashboard" subtitle="Visão geral do negócio" />

{/* Linha 1 — Receita, prioridade máxima */}
<div className="grid grid-cols-12 gap-6">
  <KPICard className="col-span-4" label="Receita do mês" value={receitaMes} comparison="+12% vs. mês anterior" size="large" />
  <KPICard className="col-span-4" label="MRR" value={mrr} subtitle="Receita recorrente mensal" />
  <KPICard className="col-span-4" label="Pendências" value={formatCurrency(valorPendente)} subtitle={`${alunosPendentes} aluno(s) em atraso`} variant="warning" />
</div>

{/* Linha 2 — Operação */}
<div className="grid grid-cols-12 gap-6">
  <KPICard className="col-span-4" label="Alunos ativos" value={alunosAtivos} />
  <KPICard className="col-span-4" label="Adesão aos treinos" value={`${taxaAdesao}%`} subtitle="Treinos prescritos vs. realizados" />
  <KPICard className="col-span-4" label="Risco de churn" value={alunosInativos7d} subtitle="Sem atividade há 7+ dias" variant="warning" />
</div>

{/* Linha 3 — Gráfico de receita, largura total */}
<RevenueChart data={receitaPorMes} color="var(--accent)" /> {/* NÃO usar azul */}

{/* Linha 4 — Atividade recente */}
<RecentActivityFeed items={[...ultimosPagamentos, ...ultimosTreinos, ...ultimosFeedbacks]} />
```

**Importante:** o KPI de "Pendências" deve mostrar o VALOR EM R$ em risco (ex: "R$ 449,70 pendentes"), não apenas a contagem de alunos — esse é o dado que importa para decisão de fluxo de caixa. Se o dado de valor não estiver disponível na query atual, calcular a partir do plano de cada aluno com status pendente.

A tela de "Relatórios" existente permanece como versão analítica/aprofundada (filtros de período, exportação, comparativos longos) — o Dashboard novo é o resumo do agora, Relatórios é para investigação detalhada.

---

## 13. ORDEM DE EXECUÇÃO RECOMENDADA

Não implementar tudo de uma vez. Seguir esta ordem, com commit e revisão visual entre cada etapa:

1. **Correção de border-radius e sombras** (seção 12B.1, 12B.2) — toca o design system global, é a base de tudo que vem depois, e é puramente CSS/tokens, baixíssimo risco de quebrar lógica
2. **Sidebar com labels** (seção 1) — mudança isolada, baixo risco, impacto visual imediato
3. **Max-width do container** (seção 2) — sozinho vai parecer "quebrado" até o próximo passo, mas é pré-requisito
4. **Componente DataTable** (seção 3) + aplicar em **Base de Atletas** e **Ranking** — maior ganho de usabilidade
5. **PageHeader padronizado** (seção 12) — rápido, consistência visual
6. **Nova tela Dashboard com receita** (seção 12B.5) — resolve lacuna funcional real, não só visual
7. **SlideOverPanel** (seção 4) + integração com Base de Atletas
8. **Abas no Detalhe do Aluno** (seção 5)
9. **Preencher Gestão de Treinos hub** (seção 6) e **Gestão de Nutrição** (seção 11) com DataTable de itens recentes
10. **Correções pontuais:** bug de nome duplicado em Feedbacks (seção 9), paleta do gráfico financeiro (seção 7), filtro da Biblioteca (seção 8), grid de Parceiros (seção 10), truncamento de cupom (seção 12B.4), redução de uppercase (seção 12B.3)

---

## 14. ARQUIVOS PROVAVELMENTE AFETADOS

Como não tenho a estrutura exata de pastas do projeto admin, oriente o agent a localizar e listar antes de editar:

```bash
# Comando sugerido para o agent rodar primeiro, antes de qualquer edição:
find app/admin -name "*.tsx" -o -name "*.ts" | head -50
```

Arquivos esperados (nomenclatura pode variar):
- `app/admin/layout.tsx` ou componente de Sidebar compartilhado
- `app/admin/alunos/page.tsx` (Base de Atletas)
- `app/admin/alunos/[id]/page.tsx` (Detalhe do Aluno)
- `app/admin/treinos/page.tsx` (Gestão de Treinos hub)
- `app/admin/biblioteca/page.tsx`
- `app/admin/relatorios/page.tsx`
- `app/admin/ranking/page.tsx`
- `app/admin/parceiros/page.tsx`
- `app/admin/feedbacks/page.tsx`
- `app/admin/nutricao/page.tsx`
- Possível pasta `components/ui/` ou `components/admin/` para os novos componentes compartilhados (DataTable, SlideOverPanel, PageHeader)
