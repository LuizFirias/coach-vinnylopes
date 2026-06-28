# AURON NUTRIÇÃO DIGITAL — FASE 03
## Construtor de Plano Alimentar Digital para Coach

> Objetivo desta fase: criar a primeira versão funcional do construtor de plano alimentar digital para o coach, usando a base de alimentos, porções, refeições, substituições e cálculo de macros criados nas fases anteriores.

---

## 1. Contexto

A Fase 01 criou a fundação técnica.

A Fase 02 criou a base global de alimentos e porções caseiras.

Agora o coach precisa conseguir montar um plano alimentar digital dentro da AURON sem depender apenas de PDF.

A experiência deve ser:

```txt
simples para montar
clara para revisar
rápida para publicar
fácil para o aluno seguir
```

Não criar uma tela poluída, cheia de números e microfunções.  
A primeira versão deve ser prática.

---

## 2. Escopo da Fase 03

Criar o fluxo para o coach:

1. Criar novo plano alimentar digital.
2. Selecionar aluno.
3. Definir nome, objetivo e metas.
4. Criar refeições.
5. Adicionar alimentos às refeições.
6. Escolher porção/gramas.
7. Ver macros em tempo real.
8. Adicionar substituições.
9. Salvar rascunho.
10. Publicar plano para o aluno.
11. Visualizar/editar plano existente.
12. Manter coexistência com planos em PDF.

---

## 3. Rotas recomendadas

Criar ou ajustar rotas:

```txt
/admin/nutricao
/admin/nutricao/novo-plano
/admin/nutricao/planos/[id]
/admin/nutricao/planos/[id]/editar
```

Se a estrutura atual for diferente, adaptar sem duplicar rotas desnecessárias.

---

# 4. Tela principal de Nutrição

A tela atual de Nutrição já tem upload de PDF.

Ajustar para mostrar dois caminhos claros:

```txt
Plano Digital
PDF
```

## Header

Título:

```txt
Gestão de Nutrição
```

Subtítulo:

```txt
Crie planos digitais ou envie PDFs para seus alunos
```

Ações:

```txt
Criar plano digital
Enviar PDF
```

## Métricas

Manter cards compactos:

- Planos digitais ativos
- PDFs enviados
- Alunos sem plano
- Atualizações pendentes

## Histórico

A tabela deve misturar ou separar:

```txt
Planos digitais
Planos em PDF
```

Campo `tipo`:

```txt
Digital
PDF
```

Ações:

- visualizar
- editar, se digital
- substituir, se PDF
- arquivar/remover

---

# 5. Tela: Novo Plano Digital

## Layout desktop

Usar layout de trabalho em 2 colunas:

### Coluna esquerda — Construção do plano

Ocupa maior parte da tela.

- dados do plano
- refeições
- alimentos
- substituições

### Coluna direita — Resumo do plano

Fixa/sticky no desktop, se possível.

- kcal totais
- proteína
- carboidrato
- gordura
- fibras
- meta vs planejado
- status do plano
- botões de salvar/publicar

Proporção sugerida:

```txt
grid-cols-[1fr_340px]
```

ou:

```txt
coluna principal 70%
resumo 30%
```

---

## 5.1 Dados básicos do plano

Campos:

```txt
Aluno
Nome do plano
Objetivo
Data de início
Data de fim
Observações gerais
```

### Objetivos

Select com:

```txt
Hipertrofia
Emagrecimento
Definição
Manutenção
Condicionamento
Saúde
Outro
```

---

## 5.2 Metas nutricionais

Campos opcionais:

```txt
Calorias alvo
Proteína alvo
Carboidrato alvo
Gordura alvo
```

O coach pode criar plano mesmo sem preencher metas.

Se preencher metas, o resumo lateral mostra comparação:

```txt
Planejado: 2.380 kcal
Meta: 2.400 kcal
Diferença: -20 kcal
```

---

# 6. Dias do plano

Para MVP, começar com `Dia 1`.

Mas deixar arquitetura visual preparada para:

```txt
Dia 1
Dia 2
Dia 3
...
Segunda
Terça
...
```

## Controles

- `Adicionar dia`
- `Duplicar dia`
- `Renomear dia`

Se isso for complexo agora, implementar apenas:
- Dia 1
- duplicação preparada visualmente/desabilitada

---

# 7. Refeições

O coach deve adicionar refeições dentro do dia.

## Refeições padrão sugeridas

Botão rápido:

```txt
Criar refeições padrão
```

Isso adiciona:

```txt
Café da manhã
Almoço
Lanche da tarde
Jantar
```

Opcional:

```txt
Lanche da manhã
Pré-treino
Pós-treino
Ceia
```

## Card de refeição

Cada refeição deve mostrar:

- título
- horário sugerido
- observações
- macros da refeição
- lista de alimentos
- botão adicionar alimento
- botão adicionar substituição
- ação duplicar/remover refeição

Visual compacto. Não usar cards enormes.

---

# 8. Adicionar alimento

## Busca

Quando clicar em `Adicionar alimento`, abrir modal, drawer ou combobox.

Busca deve permitir:

- nome do alimento;
- categoria;
- alimentos globais;
- alimentos customizados do coach.

Exemplo:

```txt
arroz
```

Retorna:

```txt
Arroz branco cozido
Arroz integral cozido
Arroz parboilizado cozido
```

Cada resultado mostra:

```txt
Nome
Categoria
Macros por 100g resumidos
```

Exemplo:

```txt
Arroz branco cozido
Carboidrato · 128 kcal · 28C · 2.5P · 0.2G
```

---

## 8.1 Seleção de porção

Após selecionar alimento, o coach define:

```txt
Quantidade em gramas
ou
Porção caseira
```

Exemplo:

```txt
120g
4 colheres de sopa
1 filé médio
2 unidades
```

A interface deve converter porção em gramas.

Se selecionar `4 colheres de sopa`, preencher `100g`.

Se editar gramas manualmente, recalcular macros.

---

## 8.2 Item da refeição

Na lista da refeição, cada item mostra:

```txt
Arroz branco cozido
120g · 154 kcal · 33.7C · 3P · 0.2G
```

Ações:

- editar quantidade
- adicionar substituição
- remover
- arrastar/reordenar, se simples

---

# 9. Substituições

Substituição é essencial para deixar o plano flexível.

## Como deve funcionar

Em cada alimento prescrito, permitir:

```txt
Adicionar substituição
```

Exemplo:

Item principal:

```txt
Peito de frango grelhado — 150g
```

Substituições:

```txt
Tilápia grelhada — 180g
Patinho moído cozido — 130g
Ovos inteiros — 3 unidades
```

## Visual

Substituições devem ficar recolhidas por padrão.

Exibir:

```txt
3 substituições disponíveis
```

Ao expandir, mostrar lista.

---

## 9.1 Cálculo de substituições

As substituições não devem somar nos macros do plano por padrão.

Elas são alternativas.

Macros principais do plano = alimentos principais.

Substituições servem para o aluno trocar mantendo uma lógica próxima.

---

# 10. Resumo lateral de macros

O resumo lateral deve ser simples e útil.

Mostrar:

```txt
Resumo do plano

2.380 kcal
165g proteína
280g carboidratos
62g gorduras
28g fibras
```

Se houver meta:

```txt
Meta: 2.400 kcal
Diferença: -20 kcal
```

## Por refeição

Também mostrar lista resumida:

```txt
Café da manhã — 430 kcal
Almoço — 620 kcal
Lanche — 310 kcal
Jantar — 580 kcal
```

---

# 11. Salvar rascunho e publicar

## Estados

Plano pode ser:

```txt
draft
active
archived
paused
```

## Botões

- `Salvar rascunho`
- `Publicar para aluno`
- `Cancelar`

### Ao publicar

Preencher:

```txt
status = active
published_at = now()
```

Se já existir plano ativo para o aluno, definir comportamento.

## Regra recomendada

Ao publicar um novo plano ativo para o mesmo aluno:
- arquivar plano ativo anterior;
- ou perguntar ao coach.

Para MVP, pode ser:

```txt
Arquivar automaticamente plano ativo anterior do mesmo aluno.
```

Mas registrar isso no código com comentário.

---

# 12. Edição de plano existente

Permitir abrir plano digital e editar:

- nome
- metas
- refeições
- alimentos
- quantidades
- substituições

Ao editar plano ativo:
- salvar alterações mantendo ativo;
- ou criar nova versão, se isso já estiver previsto.

Para MVP:
- editar diretamente.

Futuro:
- versionamento.

---

# 13. Validações

Antes de salvar/publicar:

Obrigatório:
- aluno selecionado;
- nome do plano;
- pelo menos 1 refeição;
- pelo menos 1 alimento.

Recomendado:
- alerta se plano tiver 0 kcal;
- alerta se metas estiverem muito diferentes do planejado;
- alerta se alimento sem macro.

Não bloquear demais.

---

# 14. Integração com API/services

Usar a camada criada na Fase 01.

Se necessário, criar/ajustar endpoints:

```txt
POST /api/admin/nutricao/plans
PUT /api/admin/nutricao/plans/[id]
GET /api/admin/nutricao/plans/[id]
POST /api/admin/nutricao/plans/[id]/publish
GET /api/admin/nutricao/foods
```

Ou Server Actions equivalentes.

---

# 15. Estrutura de componentes

Criar componentes reutilizáveis:

```txt
NutritionPlanBuilder
NutritionPlanBasicInfo
NutritionTargetsForm
NutritionDayTabs
NutritionMealCard
NutritionMealItemRow
FoodSearchCombobox
FoodPortionSelector
NutritionSubstitutionList
NutritionMacroSummary
NutritionPlanActions
```

Se já houver pasta de componentes de nutrição, usar:

```txt
components/nutrition/
```

ou:

```txt
app/components/nutrition/
```

---

# 16. Experiência visual

Mesmo sem refinar UI final, manter o padrão AURON:

- desktop first para coach;
- layout denso;
- cards pouco arredondados;
- botões compactos;
- sem excesso de azul;
- macros visíveis sem poluir;
- evitar tabela gigante complexa.

A tela deve parecer ferramenta profissional, não app de dieta infantil.

---

# 17. Não fazer nesta fase

Não implementar ainda:

- tela final interativa do aluno;
- check-in visual do aluno;
- dashboards avançados de adesão;
- templates complexos;
- diário alimentar livre;
- scanner;
- IA;
- micronutrientes completos;
- cálculo automático de dieta;
- mobile refinado do construtor.

---

# 18. QA obrigatório

Testar:

1. Criar plano digital para aluno.
2. Selecionar aluno.
3. Criar refeições padrão.
4. Buscar arroz.
5. Adicionar arroz com porção.
6. Adicionar frango.
7. Adicionar feijão.
8. Ver macros da refeição.
9. Ver macros totais.
10. Adicionar substituição.
11. Salvar rascunho.
12. Reabrir rascunho.
13. Publicar plano.
14. Conferir se plano aparece no histórico de Nutrição.
15. Conferir se PDF antigo continua funcionando.
16. Conferir se aluno ainda não quebra ao acessar Nutrição.
17. Rodar TypeScript.
18. Rodar build.

---

# 19. Critérios de aceitação

A fase estará pronta quando:

1. Coach conseguir criar plano alimentar digital.
2. Coach conseguir adicionar refeições.
3. Coach conseguir buscar alimentos da base AURON.
4. Coach conseguir definir porções/gramas.
5. Macros forem calculados em tempo real.
6. Coach conseguir adicionar substituições.
7. Plano puder ser salvo como rascunho.
8. Plano puder ser publicado.
9. Plano digital aparecer no histórico.
10. PDF continuar funcionando.
11. Build e TypeScript passarem.

---

# 20. Próxima fase

Depois desta fase, criar:

```txt
AURON NUTRIÇÃO DIGITAL — FASE 04
Visualização Interativa do Plano Alimentar para Aluno
```

Nessa próxima etapa, o aluno verá:
- plano do dia;
- refeições;
- alimentos e porções;
- substituições;
- macros de forma simples;
- botão de marcar refeição como feita;
- resumo na dashboard.
