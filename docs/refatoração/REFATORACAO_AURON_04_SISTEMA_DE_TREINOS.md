# REFATORAÇÃO AURON — FASE 04
## Sistema de Treinos: Biblioteca + Gestão de Treinos + Estrutura de Ficha Digital

> Objetivo desta fase: transformar o módulo de treinos no principal diferencial da AURON. Hoje as telas estão mais bonitas, mas ainda vazias e pouco estratégicas. O coach precisa sentir que a AURON é uma plataforma forte para **criar, organizar, distribuir e acompanhar fichas digitais**.

---

## CONTEXTO

A AURON se posiciona como o elo entre quem prescreve e quem executa.
No produto, isso fica muito evidente no módulo de treinos.

Este módulo precisa entregar três coisas:
1. **biblioteca de exercícios confiável**;
2. **gestão clara das fichas**;
3. **estrutura preparada para a ficha digital interativa**.

Nesta fase, o foco é no lado do coach/admin, sem reescrever toda a lógica da execução do aluno ainda.

---

## DIRETRIZES VISUAIS E DE LAYOUT

Seguir o design system AURON já implantado:
- fundo dark limpo;
- azul como primária;
- superfícies bem definidas;
- componentes menos “soltos” e mais densos;
- largura confortável para desktop;
- evitar deixar blocos pequenos perdidos em tela gigante.

Aplicar container principal com **max-width entre 1280px e 1440px**.

---

## ESCOPO DA FASE 04

### 1. Corrigir a Biblioteca de Exercícios
### 2. Refatorar a tela Gestão de Treinos
### 3. Melhorar a listagem de fichas
### 4. Criar estrutura visual do construtor de ficha digital
### 5. Preparar base de componentes reutilizáveis para treinos

---

# 1) BIBLIOTECA DE EXERCÍCIOS

## Problema atual
A tela ficou mais bonita, mas está em estado vazio e aparentemente perdeu dados ou está filtrando errado.

## Obrigatório
Antes de qualquer melhoria visual, **verificar por que a biblioteca está retornando vazia**.

### Instrução técnica
Conferir:
- query/fetch dos exercícios;
- filtro padrão aplicado ao carregar a página;
- categoria inicial selecionada;
- search default;
- nomes de campos após refatoração;
- map/transform de dados;
- possíveis condicionais que escondem resultados;
- integração com Supabase.

### Objetivo
A biblioteca deve voltar a exibir exercícios quando houver dados cadastrados.

---

## Novo layout da Biblioteca

### Header
Exibir:
- título `Biblioteca`
- subtítulo `Gerencie exercícios e demonstrações para montagem das fichas`
- ação primária: `Novo exercício`
- ação secundária opcional: `Importar`

### Barra de busca
Manter e melhorar:
- busca por nome do exercício;
- busca por grupo muscular;
- placeholder claro.

### Filtros por grupo muscular
Melhorar a barra de categorias:
- visual mais limpo;
- rolagem horizontal elegante;
- sem barra branca feia/aparente;
- chips com estado ativo muito claro.

Grupos sugeridos:
- Todos
- Peito
- Costas
- Ombros
- Bíceps
- Tríceps
- Quadríceps
- Posterior
- Glúteos
- Panturrilha
- Abdômen
- Cardio

### Grid de exercícios
Exibir cards de exercício com informações úteis:
- nome do exercício
- grupo muscular
- tipo de progressão ou métrica
- se tem vídeo/gif
- breve descrição, se existir
- ações rápidas: editar, visualizar, usar na ficha

### Estado vazio da biblioteca
Se realmente não houver exercícios:

Título:
`Nenhum exercício cadastrado`

Texto:
`Monte sua biblioteca para criar fichas digitais mais rápidas e profissionais.`

Ações:
- `Criar primeiro exercício`
- `Importar exercícios`

---

# 2) GESTÃO DE TREINOS

## Problema atual
A tela está limpa, mas ainda é basicamente uma tela com dois cartões soltos. Isso é pouco para um produto cujo treino é o coração do sistema.

## Novo objetivo
Transformar a tela em um hub do módulo de treinos.

## Estrutura desejada

### Header
Exibir:
- título `Gestão de Treinos`
- subtítulo `Crie, organize e distribua fichas digitais e PDFs para seus alunos`
- ações rápidas no topo:
  - `Nova ficha digital`
  - `Upload de PDF`
  - opcional: `Ver templates`

### Linha de métricas rápidas
Criar cards com:
- Fichas ativas
- Fichas criadas no mês
- Alunos com ficha ativa
- Adesão média ou Execuções recentes (se houver dado)

### Área principal da página
Dividir em duas grandes áreas:

#### Bloco A — Ações principais
Cards ou painel com:
- Criar ficha digital
- Enviar PDF
- Duplicar ficha existente
- Usar template (se ainda não existir, deixar preparado)

#### Bloco B — Fichas recentes
Tabela ou lista robusta com:
- aluno
- nome da rotina
- status
- criada em
- última atualização
- frequência recomendada
- ação: editar / visualizar

### Bloco adicional
Adicionar seção com pelo menos um destes:
- `Alunos sem ficha ativa`
- `Fichas mais recentes`
- `Rascunhos`
- `Treinos com baixa adesão`

Se não houver dados suficientes, usar estados vazios úteis.

---

# 3) LISTAGEM DE FICHAS

## Requisitos
A listagem não deve parecer uma tabela crua sem vida.
Ela precisa comunicar o produto.

### Campos recomendados
- Nome da ficha
- Aluno
- Quantidade de exercícios
- Frequência semanal
- Status (`Ativa`, `Rascunho`, `Arquivada`)
- Última edição
- Origem (`Digital` ou `PDF`, se aplicável)
- Ações rápidas

### Busca e filtros
Adicionar busca por:
- nome da rotina
- nome do aluno

Adicionar filtros:
- todas
- ativas
- rascunhos
- arquivadas
- digitais
- PDFs

---

# 4) CONSTRUTOR DE FICHA DIGITAL (ESTRUTURA VISUAL)

## Observação importante
Nesta fase não é obrigatório construir toda a lógica complexa da montagem completa se ela ainda for extensa. Mas é obrigatório deixar a base do construtor pronta e com cara de produto sério.

## Objetivo
Criar a estrutura visual da criação/edição de ficha.

Pode ser uma nova rota, por exemplo:
- `/admin/treinos/nova`
- `/admin/treinos/[id]/editar`

## Estrutura desejada da tela de criação de ficha

### Topo da ficha
Campos básicos:
- nome da ficha
- aluno vinculado
- frequência por semana
- observações gerais
- status da ficha

### Bloco de exercícios
Cada exercício deve aparecer como um bloco organizado contendo:
- nome do exercício
- grupo muscular
- botão para vídeo/gif
- descanso
- séries
- reps
- carga (ou método)
- técnica extra
- observações

### Ações por exercício
- reordenar
- duplicar
- remover
- editar

### Inserção de exercícios
Adicionar botão claro:
- `Adicionar exercício`

Idealmente com seleção pela biblioteca.

### Organização por blocos
Permitir visualmente que a ficha tenha:
- exercícios comuns
- bi-set / tri-set / circuito (mesmo que a lógica total ainda venha depois)

Se já existir estrutura para isso, manter.
Se não existir, preparar o componente com UX coerente.

### Rodapé de ações
Botões:
- `Salvar rascunho`
- `Publicar ficha`
- `Cancelar`

---

# 5) ESTADOS VAZIOS E ESTADOS AUXILIARES

## Gestão de Treinos — sem fichas
Título:
`Nenhuma ficha criada ainda`

Texto:
`Comece criando uma ficha digital ou envie um PDF para seu primeiro aluno.`

Botões:
- `Criar ficha digital`
- `Enviar PDF`

## Biblioteca — sem busca
Se a busca não encontrar nada:
- oferecer `Limpar busca`
- oferecer `Criar exercício`

## Aluno sem ficha ativa
Criar card/lista auxiliar com CTA `Criar ficha`.

---

# 6) COMPONENTES A CRIAR OU REFATORAR

Criar ou refatorar os seguintes componentes, se necessário:

- `ExerciseLibraryHeader`
- `ExerciseSearchBar`
- `MuscleGroupTabs`
- `ExerciseCard`
- `ExerciseEmptyState`
- `WorkoutStatsCards`
- `WorkoutListTable`
- `WorkoutRow`
- `WorkoutActionCard`
- `WorkoutBuilderHeader`
- `WorkoutExerciseBlock`
- `WorkoutBlockGroup`
- `WorkoutBuilderFooter`
- `TechniqueBadge`
- `WorkoutStatusBadge`

Todos alinhados ao design system AURON.

---

# 7) REGRAS IMPORTANTES

## Manter
- arquitetura existente do Next/React;
- dados do Supabase;
- rotas existentes sempre que fizer sentido;
- identidade AURON;
- reuso de componentes globais.

## Corrigir
- problema de estado vazio indevido na biblioteca;
- layout estreito e com pouco aproveitamento da tela;
- falta de densidade informacional no módulo de treinos.

## Evitar
- criar telas exageradamente decorativas;
- usar azul em excesso como enfeite;
- deixar cards soltos e pequenos em área vazia;
- construir algo apenas visual sem navegação real.

## Não fazer nesta fase
- refatorar toda a execução do treino do aluno;
- reescrever cronômetros, timers e lógica de séries do app do aluno;
- mexer no banco mais do que o necessário.

---

# 8) CRITÉRIOS DE ACEITAÇÃO

A fase estará bem executada quando:

1. A biblioteca voltar a exibir dados corretamente.
2. A tela Gestão de Treinos parecer um verdadeiro hub do módulo.
3. Fichas recentes e métricas fizerem sentido visualmente.
4. O construtor de ficha existir em estrutura clara e organizada.
5. O módulo de treinos começar a se parecer com o grande diferencial da AURON.
6. O layout desktop estiver profissional e bem distribuído.

---

# 9) ENTREGA ESPERADA

Implementar a fase completa com foco em qualidade visual, organização e valor de produto.

Ao final:
- revisar estados vazios;
- revisar queries e filtros;
- revisar componentes quebrados;
- manter consistência do design system;
- garantir que o módulo de treinos comunique poder, clareza e organização.

