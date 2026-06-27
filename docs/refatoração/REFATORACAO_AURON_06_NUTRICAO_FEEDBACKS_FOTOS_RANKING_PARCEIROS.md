# REFATORAÇÃO AURON — FASE 06
## Nutrição, Feedbacks, Fotos, Ranking e Parceiros

> Objetivo desta fase: transformar módulos secundários em áreas úteis, organizadas e com percepção de produto. Essas telas não devem parecer “extras soltos”; elas precisam reforçar acompanhamento, retenção e profissionalismo da AURON.

---

## 1. Contexto

Após a Fase 05, o fluxo principal Coach → Aluno deve estar mais forte.

Agora vamos refinar os módulos que aumentam valor percebido:

- Nutrição
- Feedbacks
- Fotos/check-ins
- Ranking
- Parceiros

Esses módulos precisam ser reposicionados. Nem todos têm a mesma prioridade.

### Prioridade real
1. Nutrição
2. Feedbacks / Check-ins
3. Fotos de evolução
4. Ranking
5. Parceiros

Ranking e Parceiros não devem roubar protagonismo de alunos, treinos, evolução e cobrança.

---

# 2. GESTÃO DE NUTRIÇÃO — COACH

## Problema atual
A nutrição ainda parece uma tela de upload de PDF.

## Objetivo
Transformar em um hub de planos alimentares.

## Estrutura recomendada

### Header
- título: `Gestão de Nutrição`
- subtítulo: `Envie, organize e acompanhe planos alimentares dos seus alunos`
- ações:
  - `Enviar PDF`
  - `Criar plano digital` (pode ficar preparado/desabilitado se ainda não existir)
  - `Templates`

### Métricas rápidas
Cards:
- alunos com plano ativo
- alunos sem plano
- planos enviados no mês
- planos pendentes de atualização

### Área principal
Dividir em:

#### Coluna esquerda
- enviar plano alimentar
- selecionar aluno
- descrição
- upload PDF
- botão enviar

#### Coluna direita
- planos enviados recentemente
- busca por aluno
- filtros por status
- lista/tabela

### Lista de planos
Campos:
- aluno
- descrição
- tipo: PDF / Digital
- enviado em
- status
- ações: abrir, substituir, remover

### Estado vazio
Título:
`Nenhum plano alimentar enviado ainda`

Texto:
`Envie um plano em PDF ou crie um plano digital para acompanhar a nutrição dos seus alunos dentro da AURON.`

Ações:
- `Enviar primeiro plano`
- `Criar plano digital`

---

# 3. NUTRIÇÃO — ALUNO

## Objetivo
A tela do aluno precisa parecer acompanhamento, não espera.

## Cenários

### Sem plano
- mostrar status: `Plano em preparação`
- explicar que o coach ainda não liberou
- mostrar orientações básicas
- mostrar data do último envio, se existir

### Com plano
Mostrar:
- plano atual
- descrição
- data de envio
- botão abrir PDF
- botão baixar
- observações
- histórico de planos anteriores, se existir

### Futuro plano digital
Preparar estrutura visual para:
- café da manhã
- almoço
- jantar
- lanches
- substituições
- hidratação
- observações

---

# 4. FEEDBACKS / CHECK-INS — COACH

## Problema atual
A tela parece uma lista de comentários.

## Objetivo
Transformar em uma caixa de entrada do coach.

## Estrutura recomendada

### Header
- título: `Feedbacks`
- subtítulo: `Acompanhe retornos, check-ins e sinais de atenção dos alunos`

### Métricas rápidas
- novos feedbacks
- não respondidos
- pós-treino
- check-ins da semana

### Filtros
- Todos
- Não respondidos
- Pós-treino
- Dashboard
- Dor/desconforto
- Respondidos

### Cards de feedback
Cada card deve mostrar:
- aluno
- tipo de feedback
- treino relacionado, se houver
- mensagem
- data
- status
- ação: responder
- ação: abrir aluno

### Prioridade visual
Feedbacks com dor, ausência ou queda de performance devem ter maior destaque.

### Empty state
Título:
`Nenhum feedback recebido`

Texto:
`Quando seus alunos enviarem check-ins, comentários pós-treino ou observações, eles aparecerão aqui.`

CTA:
`Ver alunos ativos`

---

# 5. FEEDBACKS / CHECK-INS — ALUNO

## Objetivo
O aluno deve conseguir enviar retorno fácil.

Locais possíveis:
- após finalizar treino;
- na home;
- no perfil;
- em check-in semanal.

## Formulário simples
Campos:
- Como foi o treino?
- Nível de esforço: 1 a 5
- Sentiu dor/desconforto?
- Observações
- botão enviar

Não criar formulário longo demais.

---

# 6. FOTOS / CHECK-IN VISUAL

## Área do aluno

Tela:
- upload frente
- upload lado
- upload costas
- orientações:
  - mesma luz
  - mesma roupa
  - mesmo horário
  - distância parecida
- histórico de sessões
- privacidade clara

## Área do coach

No perfil do aluno, aba Fotos:
- sessões por data
- frente/lado/costas
- comparação básica
- observações internas
- botão solicitar novas fotos

Empty state:
`Nenhuma foto enviada ainda`
`Solicite fotos de evolução para acompanhar o progresso visual do aluno.`

---

# 7. RANKING

## Direção estratégica
Ranking deve ser opcional, não núcleo do produto.

## Objetivo
Melhorar ranking sem parecer infantil.

## Reposicionamento
No menu, considerar mover para:
- `Engajamento`
- ou seção secundária
- ou recurso ativável por coach

## Tipos de ranking
Permitir estruturar visualmente:
- total
- mês atual
- mês anterior
- consistência
- treinos concluídos
- evolução

## Tela do coach
Mostrar:
- período
- atletas
- pontos
- critério de pontuação
- status visível/oculto no ranking

## Tela do aluno
Mostrar:
- posição
- pontos
- como pontuar
- evitar excesso de gamificação

## Copy
Trocar linguagem infantil por performance:
- `Consistência`
- `Treinos concluídos`
- `Recordes batidos`
- `Check-ins enviados`
- `Medidas registradas`

---

# 8. PARCEIROS

## Direção estratégica
Parceiros deve ser módulo secundário.

## Objetivo
Deixar organizado sem parecer prioridade indevida.

## Tela do coach
Header:
`Parceiros`

Subtítulo:
`Cadastre benefícios e cupons para seus alunos`

Cards:
- logo/imagem
- nome
- descrição
- cupom
- link
- status
- ações editar/excluir

Empty state:
`Nenhum parceiro ativo`
`Cadastre marcas parceiras para oferecer benefícios aos seus alunos.`

## Tela do aluno
Se houver parceiros:
- exibir benefícios disponíveis
- cupom
- link para loja
- regras de uso

Se não houver:
- ocultar a área ou mostrar empty state bem discreto.

---

# 9. Componentes a criar/refatorar

- `NutritionCoachHub`
- `NutritionUploadCard`
- `NutritionPlanTable`
- `StudentNutritionView`
- `FeedbackInbox`
- `FeedbackCard`
- `FeedbackFilters`
- `CheckinForm`
- `ProgressPhotoSession`
- `PhotoComparisonCard`
- `RankingTable`
- `RankingScoreRules`
- `PartnerCard`
- `PartnerEmptyState`

---

# 10. Regras técnicas

## Manter
- Supabase Storage;
- permissões;
- vínculo coach/aluno;
- design system AURON;
- rotas existentes se possível.

## Evitar
- ranking muito chamativo;
- parceiros no mesmo peso de treinos/alunos;
- nutrição parecer só upload;
- feedback parecer mural sem ação;
- empty states frios.

---

# 11. Critérios de aceitação

A fase estará correta se:

1. Nutrição do coach parecer um módulo real.
2. Nutrição do aluno funcionar bem com PDF e estado sem plano.
3. Feedbacks virarem uma caixa de entrada útil.
4. Fotos tiverem fluxo claro para aluno e coach.
5. Ranking estiver mais maduro e opcional.
6. Parceiros estiverem organizados sem roubar foco.
7. Todos os empty states guiarem a próxima ação.

---

# 12. QA obrigatório

Testar com aluno real:

- coach envia plano alimentar;
- aluno visualiza;
- aluno envia feedback;
- coach recebe;
- aluno envia fotos;
- coach visualiza;
- ranking atualiza após treino;
- parceiro aparece somente quando cadastrado.
