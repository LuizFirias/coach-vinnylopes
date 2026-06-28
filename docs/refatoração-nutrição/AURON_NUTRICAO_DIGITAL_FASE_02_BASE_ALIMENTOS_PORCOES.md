# AURON NUTRIÇÃO DIGITAL — FASE 02
## Base Global de Alimentos + Porções Caseiras

> Objetivo desta fase: popular e organizar a base global de alimentos da AURON com alimentos genéricos, sem marcas, com macros médios por 100g e porções caseiras práticas para prescrição. Esta fase não deve criar o construtor visual completo ainda; ela prepara a biblioteca alimentar para ser usada na Fase 03.

---

## 1. Contexto

A Fase 01 criou a fundação técnica:

- `nutrition_foods`
- `nutrition_food_portions`
- `nutrition_plans`
- `nutrition_plan_days`
- `nutrition_meals`
- `nutrition_meal_items`
- `nutrition_substitutions`
- `nutrition_meal_checkins`
- helpers de cálculo de macros
- services
- APIs iniciais
- seed inicial

Agora a AURON precisa de uma base alimentar útil para o coach montar planos digitais.

A base deve seguir a filosofia:

```txt
Poucos alimentos bem escolhidos.
Sem marcas.
Com média nutricional confiável.
Fácil para o coach prescrever.
Fácil para o aluno entender.
```

AURON não deve virar uma base infinita de supermercado.

---

## 2. Escopo da Fase 02

Implementar:

1. Seed robusto de alimentos globais AURON.
2. Porções caseiras para os alimentos principais.
3. Normalização de nomes, categorias, estados e slugs.
4. Script idempotente para inserir/atualizar alimentos.
5. Validação de duplicidade.
6. Busca funcional por nome e categoria.
7. Preparação para uso no construtor de plano alimentar.
8. Pequena área técnica/admin, se necessário, para conferir alimentos cadastrados.
9. Não quebrar a nutrição por PDF.
10. Não criar ainda o construtor completo do plano digital.

---

## 3. Regra de ouro da base alimentar

### Permitido

Usar alimentos genéricos:

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

### Proibido

Não inserir alimentos por marca:

```txt
Arroz Tio João
Iogurte X
Whey Y
Pão Z
Produto industrial com marca específica
```

### Evitar

Evitar variações exageradas:

```txt
Arroz branco tipo 1 marca A
Arroz branco tipo 1 marca B
Arroz branco premium
Arroz branco parboilizado marca X
```

AURON deve trabalhar com uma média prática.

---

## 4. Fontes e referências

Usar fontes confiáveis para montar os macros médios:

- TACO
- TBCA
- USDA FoodData Central, quando necessário
- Base AURON revisada manualmente

### Regra importante

Não inventar macro.

Quando não houver confiança no valor:
- não inserir o alimento;
- ou marcar como `requires_review = true`, caso exista ou seja criado campo futuro;
- ou manter no seed com comentário interno avisando que precisa de revisão antes de produção.

Se o schema atual não tem `requires_review`, não alterar a tabela agora apenas por isso. Pode registrar em comentário no arquivo de seed.

---

## 5. Categorias oficiais

Usar as categorias já previstas na Fase 01:

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

### Regra de categoria

Cada alimento deve ter uma categoria principal.

Exemplo:

```txt
Arroz branco cozido -> carboidrato
Feijão carioca cozido -> leguminosa
Peito de frango grelhado -> proteina
Abacate -> gordura ou fruta
Azeite de oliva -> gordura
Castanha de caju -> oleaginosa
```

---

## 6. Estados dos alimentos

Padronizar `default_state`.

Valores sugeridos:

```txt
cru
cozido
grelhado
assado
frito
natural
em_flocos
em_po
liquido
```

Exemplos:

```txt
Arroz branco cozido -> cozido
Batata doce cozida -> cozido
Peito de frango grelhado -> grelhado
Ovo inteiro cozido -> cozido
Banana prata -> natural
Aveia em flocos -> em_flocos
Whey protein genérico -> em_po
Leite integral -> liquido
```

---

## 7. Grupos iniciais de alimentos

Criar um seed inicial robusto, mas não absurdo.

Meta recomendada:

```txt
150 a 250 alimentos na primeira versão
```

Não precisa chegar em milhares.

---

# 8. Lista inicial recomendada

## 8.1 Carboidratos

Inserir alimentos como:

```txt
Arroz branco cozido
Arroz integral cozido
Arroz parboilizado cozido
Macarrão cozido
Macarrão integral cozido
Batata inglesa cozida
Batata doce cozida
Mandioca cozida
Mandioquinha cozida
Inhame cozido
Cará cozido
Cuscuz de milho cozido
Tapioca preparada
Aveia em flocos
Pão francês
Pão de forma integral
Pão de forma branco
Torrada integral
Granola tradicional
Farinha de mandioca
Farofa simples
Milho cozido
Pipoca sem óleo
Quinoa cozida
```

---

## 8.2 Leguminosas

```txt
Feijão carioca cozido
Feijão preto cozido
Feijão branco cozido
Lentilha cozida
Grão-de-bico cozido
Ervilha cozida
Soja cozida
```

---

## 8.3 Proteínas

```txt
Peito de frango grelhado
Frango desfiado cozido
Sobrecoxa de frango sem pele assada
Patinho moído cozido
Carne bovina magra cozida
Alcatra grelhada
Coxão mole cozido
Carne moída magra
Tilápia grelhada
Salmão grelhado
Atum em água
Sardinha em água
Ovo inteiro cozido
Clara de ovo cozida
Gema de ovo cozida
Omelete simples
Tofu
Lombo suíno assado
Whey protein genérico
```

Observação:
`Whey protein genérico` pode entrar como suplemento, com macros médios. Não usar marcas.

---

## 8.4 Laticínios

```txt
Leite integral
Leite semidesnatado
Leite desnatado
Iogurte natural integral
Iogurte natural desnatado
Queijo minas frescal
Queijo cottage
Ricota
Requeijão light
```

---

## 8.5 Gorduras e oleaginosas

```txt
Azeite de oliva
Abacate
Pasta de amendoim integral
Amendoim torrado
Castanha de caju
Castanha-do-pará
Nozes
Amêndoas
Semente de chia
Semente de linhaça
Semente de girassol
Manteiga
```

---

## 8.6 Frutas

```txt
Banana prata
Banana nanica
Maçã
Mamão papaia
Laranja
Tangerina
Manga
Melancia
Melão
Abacaxi
Morango
Uva
Pera
Kiwi
Goiaba
Açaí puro sem xarope
Limão
```

---

## 8.7 Vegetais e legumes

```txt
Alface
Tomate
Cenoura crua
Cenoura cozida
Brócolis cozido
Couve refogada
Espinafre cozido
Abobrinha cozida
Berinjela cozida
Pepino
Beterraba cozida
Chuchu cozido
Repolho
Couve-flor cozida
Vagem cozida
Abóbora cozida
Pimentão
Cebola
Alho
```

---

## 8.8 Bebidas

```txt
Água
Café sem açúcar
Chá sem açúcar
Suco de laranja natural
Suco de limão sem açúcar
Água de coco
```

---

## 8.9 Temperos e complementos

```txt
Sal
Vinagre
Molho de tomate simples
Mel
Açúcar
Cacau em pó
Canela
```

Observação:
Alguns temperos têm impacto calórico quase nulo em pequenas quantidades, mas podem existir para organização.

---

# 9. Porções caseiras

Criar porções práticas em `nutrition_food_portions`.

## Regras

Cada alimento deve ter pelo menos:
- `100g` como porção padrão, quando fizer sentido;
- uma porção caseira comum, quando aplicável.

Exemplos:

### Arroz branco cozido

```txt
100g
1 colher de sopa cheia = 25g
4 colheres de sopa = 100g
1 escumadeira pequena = 80g
```

### Feijão carioca cozido

```txt
100g
1 concha pequena = 80g
1 concha média = 120g
```

### Peito de frango grelhado

```txt
100g
1 filé pequeno = 100g
1 filé médio = 150g
```

### Ovo inteiro cozido

```txt
1 unidade média = 50g
2 unidades médias = 100g
```

### Banana prata

```txt
1 unidade pequena = 50g
1 unidade média = 65g
1 unidade grande = 90g
```

### Aveia

```txt
1 colher de sopa = 10g
2 colheres de sopa = 20g
4 colheres de sopa = 40g
```

### Azeite

```txt
1 colher de chá = 5g
1 colher de sopa = 13g
```

### Whey protein genérico

```txt
1 scoop = 30g
1/2 scoop = 15g
```

---

# 10. Estrutura do arquivo de seed

Criar/ajustar:

```txt
scripts/seeds/auron-nutrition-foods.seed.ts
```

ou manter JS se o projeto já usa JS:

```txt
scripts/seed-auron-foods.js
```

## Formato recomendado

Cada item:

```ts
{
  name: 'Arroz branco cozido',
  slug: 'arroz-branco-cozido',
  category: 'carboidrato',
  default_state: 'cozido',
  base_unit: 'g',
  base_quantity: 100,
  calories_per_100g: 128,
  protein_per_100g: 2.5,
  carbs_per_100g: 28.1,
  fat_per_100g: 0.2,
  fiber_per_100g: 1.6,
  source_name: 'TACO/TBCA',
  source_reference: 'valor médio revisado',
  origin: 'auron_global',
  is_active: true,
  portions: [
    { label: '100g', grams: 100, is_default: true },
    { label: '4 colheres de sopa', grams: 100 },
    { label: '1 colher de sopa cheia', grams: 25 }
  ]
}
```

Os valores acima são exemplo de formato. Usar valores revisados no seed real.

---

# 11. Script idempotente

O script deve poder rodar mais de uma vez sem duplicar alimentos.

Regra:

1. Buscar por `slug`.
2. Se existir, atualizar dados.
3. Se não existir, inserir.
4. Para porções:
   - buscar por `food_id + label`;
   - atualizar se existir;
   - inserir se não existir.

Não criar duplicatas.

---

# 12. Busca de alimentos

Garantir que a API criada na Fase 01 funcione bem.

Endpoint esperado:

```txt
GET /api/admin/nutricao/foods?q=arroz
GET /api/admin/nutricao/foods?category=carboidrato
GET /api/admin/nutricao/foods?q=frango&category=proteina
```

Retorno deve incluir:

```txt
id
name
category
default_state
calories_per_100g
protein_per_100g
carbs_per_100g
fat_per_100g
fiber_per_100g
portions
origin
```

---

# 13. Página técnica simples para conferência

Se for rápido e não quebrar nada, criar uma visualização simples dentro do admin para conferir a base.

Pode ser dentro de Nutrição ou Biblioteca alimentar:

```txt
/admin/nutricao/alimentos
```

Ou uma aba em Nutrição:

```txt
Alimentos
```

Essa tela deve permitir:
- buscar alimento;
- filtrar por categoria;
- visualizar macros;
- visualizar porções.

Não precisa permitir edição completa nesta fase.

Se isso atrasar, deixar para fase futura.

---

# 14. Compatibilidade com alimentos customizados

A seed deve inserir apenas:

```txt
origin = auron_global
coach_id = null
```

Mas a busca deve estar preparada para retornar:

```txt
alimentos globais + alimentos customizados do coach logado
```

Não exibir alimentos customizados de outro coach.

---

# 15. Validação de macros

Criar função simples para validar seed antes de inserir:

- nome obrigatório;
- categoria obrigatória;
- calorias >= 0;
- proteína >= 0;
- carboidrato >= 0;
- gordura >= 0;
- slug único;
- porções com gramas > 0.

Se houver alimento inválido:
- logar erro;
- não inserir aquele alimento;
- continuar ou parar dependendo da gravidade.

---

# 16. Não fazer nesta fase

Não fazer ainda:

- construtor completo do plano;
- visualização interativa do aluno;
- templates de dieta;
- diário alimentar livre;
- scanner;
- upload de foto de comida;
- IA nutricional;
- cálculo automático de dieta;
- alteração grande na tela atual de PDF.

---

# 17. QA obrigatório

Após executar a fase:

1. Rodar migrações já existentes.
2. Rodar seed.
3. Verificar quantidade de alimentos inseridos.
4. Rodar seed novamente e confirmar que não duplicou.
5. Buscar `arroz`.
6. Buscar `frango`.
7. Buscar por categoria `carboidrato`.
8. Buscar por categoria `proteina`.
9. Conferir porções de pelo menos 10 alimentos.
10. Garantir que build passa.
11. Garantir que nutrição por PDF continua funcionando.

---

# 18. Critérios de aceitação

A fase estará pronta quando:

1. Existir uma base global AURON com alimentos suficientes para montar plano real.
2. Cada alimento tiver macros por 100g.
3. Os principais alimentos tiverem porções caseiras.
4. O seed for idempotente.
5. A busca por alimento funcionar.
6. Alimentos não tiverem marcas comerciais.
7. Coach consiga acessar alimentos globais.
8. RLS não vaze alimentos customizados entre coaches.
9. PDF atual continuar funcionando.
10. TypeScript e build passarem.

---

# 19. Próxima fase

Depois desta fase, executar:

```txt
AURON NUTRIÇÃO DIGITAL — FASE 03
Construtor de Plano Alimentar Digital para Coach
```

A Fase 03 usará a base alimentar para montar planos com refeições, itens, porções, substituições e macros em tempo real.
