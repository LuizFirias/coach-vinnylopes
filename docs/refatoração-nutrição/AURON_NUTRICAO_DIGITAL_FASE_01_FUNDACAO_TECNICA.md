# AURON NUTRIÇÃO DIGITAL — FASE 01
## Fundação Técnica: Banco, Tipos, Cálculo de Macros e Base Global de Alimentos

> Objetivo desta fase: criar a base técnica para a Nutrição Digital Interativa da AURON, sem mexer pesado em UI/UX ainda e sem quebrar o fluxo atual de plano alimentar por PDF.

---

## 1. Contexto

Hoje a nutrição da AURON funciona principalmente por envio de PDF.

Agora vamos preparar o app para ter também um plano alimentar digital interativo, parecido em lógica com apps profissionais de nutrição, mas sem virar um rastreador poluído tipo contador de calorias aberto.

A direção da AURON deve ser:

```txt
Coach prescreve.
Aluno entende.
Aluno marca adesão.
App calcula macros.
Coach acompanha.
```

Não transformar a AURON, neste momento, em um app onde o aluno cadastra qualquer alimento livremente como diário alimentar completo.

---

## 2. Escopo da Fase 01

Esta fase deve criar a fundação técnica:

1. Criar tabelas de alimentos globais AURON.
2. Criar tabelas de porções caseiras.
3. Criar tabelas de planos alimentares digitais.
4. Criar refeições e itens do plano.
5. Criar substituições alimentares.
6. Criar check-ins de refeições do aluno.
7. Criar helpers para cálculo de macros.
8. Preparar seeds/importação de alimentos.
9. Manter o PDF atual funcionando normalmente.
10. Não alterar a UI principal ainda, exceto se for necessário para não quebrar telas atuais.

---

## 3. Decisão de produto

AURON Nutrição Digital deve começar como:

```txt
Plano alimentar prescrito + check de adesão
```

E não como:

```txt
Diário alimentar livre com milhares de alimentos e marcas
```

### O que entra agora

- alimentos genéricos e médios;
- sem marcas;
- macros por 100g;
- porções caseiras;
- refeições por horário;
- substituições;
- marcação de refeição feita/não feita;
- cálculo de macros prescritos.

### O que NÃO entra agora

- leitor de código de barras;
- alimentos por marca;
- supermercado;
- milhares de variações;
- micronutrientes complexos;
- foto da refeição com IA;
- diário alimentar livre;
- cálculo automático de dieta sem validação do coach.

---

## 4. Regra para base de alimentos

A base deve seguir o padrão:

```txt
alimentos simples, genéricos e de uso comum
```

Exemplos corretos:

```txt
Arroz branco cozido
Arroz integral cozido
Feijão carioca cozido
Peito de frango grelhado
Ovo inteiro
Banana prata
Aveia em flocos
Batata doce cozida
Patinho moído cozido
Azeite de oliva
```

Exemplos proibidos:

```txt
Arroz Tio João
Iogurte marca X
Whey marca Y
Pão marca Z
Produto industrial específico de supermercado
```

---

## 5. Categorias iniciais de alimentos

Criar uma enumeração ou tabela para categorias.

Categorias recomendadas:

```txt
carboidrato
proteina
gordura
fruta
vegetal
leguminosa
laticinio
bebida
suplemento
oleaginosa
tempero
outro
```

Observação: o alimento não deve ficar preso a café da manhã, almoço ou jantar. A refeição define onde o alimento será usado.

---

## 6. Tipos de refeição

Criar enumeração ou tabela com tipos de refeição:

```txt
cafe_da_manha
lanche_manha
almoco
pre_treino
pos_treino
lanche_tarde
jantar
ceia
refeicao_livre
```

Labels para interface:

```txt
Café da manhã
Lanche da manhã
Almoço
Pré-treino
Pós-treino
Lanche da tarde
Jantar
Ceia
Refeição livre
```

---

# 7. Estrutura de banco recomendada

Ajustar nomes conforme o padrão real do projeto/Supabase.

## 7.1 Tabela: nutrition_foods

Base global de alimentos.

```sql
create table if not exists nutrition_foods (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  slug text unique,
  category text not null,

  default_state text,
  description text,

  base_unit text not null default 'g',
  base_quantity numeric not null default 100,

  calories_per_100g numeric not null default 0,
  protein_per_100g numeric not null default 0,
  carbs_per_100g numeric not null default 0,
  fat_per_100g numeric not null default 0,
  fiber_per_100g numeric default 0,

  source_name text,
  source_reference text,

  origin text not null default 'auron_global',
  coach_id uuid null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Regras

- `origin = auron_global` para alimentos oficiais da AURON.
- `coach_id = null` para alimentos globais.
- `origin = custom` para alimentos criados por um coach.
- `coach_id` preenchido apenas em alimentos personalizados.
- Não inserir marcas comerciais.

---

## 7.2 Tabela: nutrition_food_portions

Porções caseiras equivalentes.

```sql
create table if not exists nutrition_food_portions (
  id uuid primary key default gen_random_uuid(),

  food_id uuid not null references nutrition_foods(id) on delete cascade,

  label text not null,
  grams numeric not null,
  is_default boolean not null default false,

  created_at timestamptz not null default now()
);
```

Exemplos:

```txt
Arroz branco cozido:
- 1 colher de sopa cheia = 25g
- 4 colheres de sopa = 100g

Ovo inteiro:
- 1 unidade média = 50g

Banana prata:
- 1 unidade média = 65g
```

---

## 7.3 Tabela: nutrition_plans

Plano alimentar digital do aluno.

```sql
create table if not exists nutrition_plans (
  id uuid primary key default gen_random_uuid(),

  coach_id uuid not null,
  student_id uuid not null,

  name text not null,
  goal text,
  notes text,

  calories_target numeric,
  protein_target numeric,
  carbs_target numeric,
  fat_target numeric,

  status text not null default 'draft',

  start_date date,
  end_date date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
```

### Status possíveis

```txt
draft
active
archived
paused
```

---

## 7.4 Tabela: nutrition_plan_days

Permite plano de 1 dia, 3 dias, 7 dias ou ciclo.

```sql
create table if not exists nutrition_plan_days (
  id uuid primary key default gen_random_uuid(),

  plan_id uuid not null references nutrition_plans(id) on delete cascade,

  day_index integer not null default 1,
  label text not null default 'Dia 1',
  notes text,

  created_at timestamptz not null default now()
);
```

### MVP

Para começar, criar apenas `Dia 1`.

Depois expandir para:
- Segunda
- Terça
- Quarta
- Quinta
- Sexta
- Sábado
- Domingo

---

## 7.5 Tabela: nutrition_meals

Refeições dentro do dia.

```sql
create table if not exists nutrition_meals (
  id uuid primary key default gen_random_uuid(),

  plan_day_id uuid not null references nutrition_plan_days(id) on delete cascade,

  meal_type text not null,
  title text not null,
  time_suggestion time,
  notes text,
  sort_order integer not null default 0,

  created_at timestamptz not null default now()
);
```

Exemplo:

```txt
Café da manhã — 08:00
Almoço — 12:30
Lanche da tarde — 16:00
Jantar — 20:00
```

---

## 7.6 Tabela: nutrition_meal_items

Alimentos prescritos dentro de cada refeição.

```sql
create table if not exists nutrition_meal_items (
  id uuid primary key default gen_random_uuid(),

  meal_id uuid not null references nutrition_meals(id) on delete cascade,
  food_id uuid not null references nutrition_foods(id),

  quantity_grams numeric not null,
  portion_label text,
  notes text,
  sort_order integer not null default 0,

  created_at timestamptz not null default now()
);
```

Exemplo:

```txt
Almoço:
- Arroz branco cozido — 120g
- Feijão carioca cozido — 100g
- Peito de frango grelhado — 150g
```

---

## 7.7 Tabela: nutrition_substitutions

Substituições alimentares por item.

```sql
create table if not exists nutrition_substitutions (
  id uuid primary key default gen_random_uuid(),

  meal_item_id uuid not null references nutrition_meal_items(id) on delete cascade,
  substitute_food_id uuid not null references nutrition_foods(id),

  quantity_grams numeric not null,
  portion_label text,
  notes text,

  created_at timestamptz not null default now()
);
```

Exemplo:

```txt
Peito de frango 150g pode trocar por:
- Tilápia 180g
- Patinho moído 130g
- Ovos inteiros 3 unidades
```

---

## 7.8 Tabela: nutrition_meal_checkins

Aluno marca adesão da refeição.

```sql
create table if not exists nutrition_meal_checkins (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null,
  plan_id uuid not null references nutrition_plans(id) on delete cascade,
  meal_id uuid not null references nutrition_meals(id) on delete cascade,

  checkin_date date not null default current_date,

  status text not null default 'done',
  notes text,

  created_at timestamptz not null default now()
);
```

### Status possíveis

```txt
done
skipped
partial
substituted
```

---

# 8. Índices recomendados

Criar índices para performance:

```sql
create index if not exists idx_nutrition_foods_name on nutrition_foods(name);
create index if not exists idx_nutrition_foods_category on nutrition_foods(category);
create index if not exists idx_nutrition_foods_origin on nutrition_foods(origin);

create index if not exists idx_nutrition_plans_coach_id on nutrition_plans(coach_id);
create index if not exists idx_nutrition_plans_student_id on nutrition_plans(student_id);
create index if not exists idx_nutrition_plans_status on nutrition_plans(status);

create index if not exists idx_nutrition_meals_plan_day_id on nutrition_meals(plan_day_id);
create index if not exists idx_nutrition_meal_items_meal_id on nutrition_meal_items(meal_id);
create index if not exists idx_nutrition_checkins_student_date on nutrition_meal_checkins(student_id, checkin_date);
```

---

# 9. RLS / Permissões

Ajustar conforme a arquitetura real do app.

## Regras esperadas

### Alimentos globais

Todos os coaches podem ler alimentos globais ativos:

```txt
nutrition_foods.origin = auron_global
nutrition_foods.is_active = true
```

### Alimentos personalizados

Coach só vê:
- alimentos globais AURON;
- alimentos customizados dele.

Aluno não precisa gerenciar alimentos.

### Planos

Coach só vê planos dos seus próprios alunos.

Aluno só vê plano vinculado a ele.

### Check-ins

Aluno cria/atualiza check-in apenas das próprias refeições.

Coach lê check-ins dos alunos vinculados a ele.

---

# 10. Helpers de cálculo

Criar helpers TypeScript para cálculo de macros.

Sugestão de arquivo:

```txt
lib/nutrition/calculateMacros.ts
```

## Função: calcular macro de item

```ts
export type FoodMacro = {
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  fiber_per_100g?: number | null
}

export type CalculatedMacro = {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export function calculateItemMacros(food: FoodMacro, grams: number): CalculatedMacro {
  const factor = grams / 100

  return {
    calories: roundMacro(food.calories_per_100g * factor),
    protein: roundMacro(food.protein_per_100g * factor),
    carbs: roundMacro(food.carbs_per_100g * factor),
    fat: roundMacro(food.fat_per_100g * factor),
    fiber: roundMacro((food.fiber_per_100g || 0) * factor),
  }
}

export function roundMacro(value: number): number {
  return Math.round(value * 10) / 10
}
```

## Função: somar macros

```ts
export function sumMacros(items: CalculatedMacro[]): CalculatedMacro {
  return items.reduce(
    (acc, item) => ({
      calories: roundMacro(acc.calories + item.calories),
      protein: roundMacro(acc.protein + item.protein),
      carbs: roundMacro(acc.carbs + item.carbs),
      fat: roundMacro(acc.fat + item.fat),
      fiber: roundMacro(acc.fiber + item.fiber),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  )
}
```

---

# 11. Tipos TypeScript

Criar tipos básicos.

Sugestão de arquivo:

```txt
lib/nutrition/types.ts
```

Tipos recomendados:

```ts
export type NutritionFoodOrigin = 'auron_global' | 'custom'

export type NutritionFoodCategory =
  | 'carboidrato'
  | 'proteina'
  | 'gordura'
  | 'fruta'
  | 'vegetal'
  | 'leguminosa'
  | 'laticinio'
  | 'bebida'
  | 'suplemento'
  | 'oleaginosa'
  | 'tempero'
  | 'outro'

export type NutritionPlanStatus = 'draft' | 'active' | 'archived' | 'paused'

export type NutritionMealType =
  | 'cafe_da_manha'
  | 'lanche_manha'
  | 'almoco'
  | 'pre_treino'
  | 'pos_treino'
  | 'lanche_tarde'
  | 'jantar'
  | 'ceia'
  | 'refeicao_livre'

export type NutritionMealCheckinStatus =
  | 'done'
  | 'skipped'
  | 'partial'
  | 'substituted'
```

---

# 12. Seed/importação de alimentos

Nesta fase, preparar estrutura de seed/importação, mas não inventar macros sem referência.

Criar um arquivo de seed inicial com poucos alimentos apenas para teste de fluxo, se necessário.

Sugestão:

```txt
scripts/seeds/nutrition-foods.seed.ts
```

## Regras do seed

Cada alimento deve ter:

```txt
name
category
default_state
base_unit
base_quantity
calories_per_100g
protein_per_100g
carbs_per_100g
fat_per_100g
fiber_per_100g
source_name
source_reference
origin
is_active
```

### Fonte

Prever campos para fontes como:
- TACO
- TBCA
- USDA FoodData Central
- Base AURON revisada manualmente

### Importante

Nesta fase, se inserir alimentos de teste, marcar no comentário do seed:

```txt
Seed inicial para validação técnica. Revisar macros antes de produção.
```

A base final completa de alimentos deve ser construída na próxima fase.

---

# 13. Compatibilidade com PDF atual

Não quebrar fluxo atual de nutrição por PDF.

A tela de Nutrição deve continuar aceitando:
- upload de PDF;
- histórico de PDF;
- visualização do PDF pelo aluno.

A nova estrutura digital deve coexistir com o PDF.

Futuramente, a tela poderá mostrar:

```txt
Planos em PDF
Planos digitais
```

Mas nesta fase o foco é banco e lógica.

---

# 14. Serviços/funções de acesso

Criar camada de acesso para não espalhar query pelo app.

Sugestão:

```txt
lib/nutrition/foods.ts
lib/nutrition/plans.ts
lib/nutrition/checkins.ts
```

Funções iniciais:

```ts
getGlobalFoods()
searchFoods(query, category)
getFoodById(id)
createNutritionPlan(data)
getNutritionPlanByStudent(studentId)
getNutritionPlanByCoach(coachId)
calculateMealMacros(mealId)
calculatePlanMacros(planId)
```

Se o projeto já tiver padrão próprio de services/actions, seguir o padrão existente.

---

# 15. Rotas/API/actions

Se o app usar Server Actions, manter o padrão.

Caso use rotas API, preparar endpoints internos para:

```txt
GET foods
GET foods/search
POST nutrition-plans
GET nutrition-plans/:id
POST meal-checkins
```

Não criar endpoints públicos sem autenticação.

---

# 16. Dados mínimos para testar a fase

Ao final da fase, deve ser possível tecnicamente:

1. Ter alimentos globais cadastrados.
2. Buscar alimentos.
3. Criar plano alimentar digital em rascunho via função/seed/manual.
4. Criar dia do plano.
5. Criar refeição.
6. Adicionar alimentos à refeição.
7. Calcular macros da refeição.
8. Calcular macros do dia.
9. Criar check-in de refeição.
10. Ler plano do aluno.

Mesmo que ainda não exista UI completa.

---

# 17. Não fazer nesta fase

Não fazer ainda:

- tela final do construtor visual de plano;
- dashboard visual de nutrição;
- tela refinada do aluno;
- templates avançados;
- diário alimentar livre;
- scanner;
- foto de refeição;
- IA de dieta;
- migração completa de PDFs antigos;
- mudança pesada no schema de alunos.

---

# 18. Critérios de aceitação

A fase estará correta quando:

1. As tabelas de nutrição digital existirem.
2. As permissões básicas estiverem preparadas.
3. O fluxo PDF atual continuar funcionando.
4. Existirem tipos TypeScript de nutrição.
5. Existirem helpers de cálculo de macros.
6. O app conseguir somar macros por item, refeição e plano.
7. A base global de alimentos estiver pronta para receber seed.
8. Não houver erros de TypeScript.
9. `npm run build` continuar passando.
10. Nenhuma rota atual de nutrição quebrar.

---

# 19. Próxima fase prevista

Depois desta fase, criar:

```txt
AURON NUTRIÇÃO DIGITAL — FASE 02
Base Global de Alimentos + Porções Caseiras
```

Essa próxima fase deve inserir a curadoria inicial de alimentos principais com macros médios e porções práticas.

Somente depois disso ir para:

```txt
FASE 03 — Construtor de Plano Alimentar Digital para Coach
FASE 04 — Visualização Interativa para Aluno
FASE 05 — Adesão, Check-ins e Métricas na Dashboard
```
