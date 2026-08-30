# AURON NUTRIÇÃO DIGITAL — FASE 06
## Templates, Duplicação e Produtividade do Coach

> Objetivo desta fase: acelerar a criação de planos alimentares digitais para o coach, criando recursos de produtividade como templates, duplicação de refeições, duplicação de dias, duplicação de planos e favoritos. A meta é fazer o coach montar um plano bom em poucos minutos, sem transformar a tela em um sistema pesado ou poluído.

---

## 1. Contexto

As fases anteriores já entregaram:

- base técnica da nutrição digital;
- alimentos globais AURON;
- porções caseiras;
- construtor de plano alimentar digital;
- publicação de plano;
- visualização interativa para o aluno;
- check-ins de adesão;
- métricas para o coach;
- indicadores no dashboard, nutrição, perfil do aluno e relatórios.

Agora o módulo precisa ganhar velocidade operacional.

O coach não pode montar todo plano do zero sempre.

A experiência ideal é:

```txt
Selecionar aluno
Escolher base/template
Ajustar porções
Publicar
Acompanhar adesão
```

---

## 2. Escopo da Fase 06

Implementar:

1. Duplicar refeição.
2. Duplicar dia do plano.
3. Duplicar plano alimentar inteiro.
4. Criar plano a partir de plano existente.
5. Criar templates de planos do coach.
6. Criar refeições favoritas do coach.
7. Criar grupos de substituição reutilizáveis.
8. Melhorar fluxo de edição sem quebrar planos ativos.
9. Preparar base para biblioteca de modelos nutricionais.
10. Manter tudo compatível com PDF.

---

# 3. Decisão de produto

AURON não deve oferecer “dietas prontas universais” sem contexto.

O correto é:

```txt
Templates editáveis do coach
```

e não:

```txt
Dietas automáticas para qualquer pessoa
```

O app pode acelerar o trabalho, mas a responsabilidade da prescrição continua com o profissional.

---

# 4. Duplicar refeição

## Objetivo

Permitir que o coach duplique rapidamente uma refeição.

Exemplo:

```txt
Duplicar Almoço para Jantar
```

ou:

```txt
Duplicar refeição
```

## O que deve duplicar

- nome da refeição;
- horário, opcionalmente;
- observações;
- itens alimentares;
- quantidades;
- porções;
- substituições.

## O que deve mudar automaticamente

Ao duplicar, o novo nome pode virar:

```txt
Almoço — cópia
```

ou abrir modal perguntando:

```txt
Nome da nova refeição
Tipo da refeição
Horário sugerido
```

## Recomendação MVP

Implementar botão:

```txt
Duplicar
```

No card da refeição.

Ao clicar:
- cria cópia logo abaixo;
- adiciona “cópia” no título;
- permite editar depois.

---

# 5. Criar refeições padrão

O construtor já tem botão de refeições padrão. Refinar.

## Opções rápidas

Criar presets:

```txt
4 refeições
Café da manhã, Almoço, Lanche da tarde, Jantar

5 refeições
Café da manhã, Lanche da manhã, Almoço, Lanche da tarde, Jantar

6 refeições
Café da manhã, Lanche da manhã, Almoço, Pré/Pós-treino, Jantar, Ceia
```

Se for complexo, manter uma opção simples:

```txt
Adicionar refeições padrão
```

Mas estruturar o código para suportar presets.

---

# 6. Duplicar dia

## Objetivo

Permitir que o coach crie variações de dias.

Exemplos:

```txt
Dia de treino
Dia de descanso
Segunda
Terça
Quarta
```

## MVP

Se a interface ainda trabalha com `Dia 1`, implementar:

```txt
Duplicar dia
```

Isso cria:

```txt
Dia 2
```

com as mesmas refeições e alimentos.

## O que duplicar

- refeições;
- alimentos;
- porções;
- substituições;
- observações.

## O que não duplicar

- check-ins do aluno;
- status de adesão;
- dados históricos.

---

# 7. Duplicar plano inteiro

## Objetivo

Permitir que o coach use um plano já montado como base para outro aluno.

Exemplo:

```txt
Duplicar plano para outro aluno
```

Fluxo:

1. Coach abre um plano.
2. Clica em `Duplicar`.
3. Seleciona aluno de destino.
4. Define novo nome.
5. Plano abre como rascunho.
6. Coach ajusta quantidades.
7. Publica.

## Regras

O plano duplicado deve nascer como:

```txt
status = draft
published_at = null
```

Não publicar automaticamente.

## O que duplicar

- metas;
- dias;
- refeições;
- itens;
- substituições;
- notas.

## O que não duplicar

- check-ins;
- histórico;
- published_at;
- status active;
- vínculos antigos.

---

# 8. Templates de planos do coach

## Objetivo

Criar uma biblioteca de modelos do próprio coach.

Exemplos:

```txt
Hipertrofia 2500 kcal
Emagrecimento 1800 kcal
Manutenção 2200 kcal
Plano simples iniciante
Plano low carb moderado
```

## Opção técnica A — tabela própria

Criar tabela:

```sql
nutrition_plan_templates
```

Campos sugeridos:

```txt
id
coach_id
name
goal
description
calories_target
protein_target
carbs_target
fat_target
created_from_plan_id
is_active
created_at
updated_at
```

E tabelas relacionadas:

```txt
nutrition_template_days
nutrition_template_meals
nutrition_template_meal_items
nutrition_template_substitutions
```

## Opção técnica B — reaproveitar nutrition_plans

Mais simples para MVP:

Adicionar status/tipo:

```txt
status = template
```

ou campo:

```txt
is_template = true
```

Mas isso exige migração.

## Recomendação

Para evitar bagunçar planos reais, preferir tabela própria se o código ficar limpo.

Se for muita coisa agora, implementar primeiro:

```txt
Salvar plano como template
```

criando uma cópia em `nutrition_plans` com status `draft` e um campo visual interno, mas registrar dívida técnica.

---

# 9. Refeições favoritas

## Objetivo

O coach deve conseguir salvar uma refeição comum para reutilizar.

Exemplos:

```txt
Café da manhã proteico
Almoço arroz, feijão e frango
Lanche pré-treino simples
Ceia leve
```

## Tabela recomendada

```sql
nutrition_favorite_meals
```

Campos:

```txt
id
coach_id
name
meal_type
notes
created_at
updated_at
```

Itens:

```sql
nutrition_favorite_meal_items
```

Campos:

```txt
id
favorite_meal_id
food_id
quantity_grams
portion_label
notes
sort_order
```

Substituições, se necessário:

```sql
nutrition_favorite_meal_substitutions
```

## MVP

Se criar tabelas atrasar, implementar apenas duplicação de refeição e plano. Favoritos podem ficar para subfase 06.2.

---

# 10. Grupos de substituição reutilizáveis

## Objetivo

O coach não deve cadastrar as mesmas substituições toda hora.

Exemplo:

```txt
Carboidratos básicos
- Arroz branco cozido 120g
- Batata doce 180g
- Macarrão cozido 130g
- Mandioca cozida 120g
```

Outro:

```txt
Proteínas magras
- Frango grelhado 150g
- Tilápia 180g
- Patinho 130g
- Ovos 3 unidades
```

## Tabelas sugeridas

```txt
nutrition_substitution_groups
nutrition_substitution_group_items
```

Campos:

```txt
coach_id
name
category
description
```

Itens:

```txt
food_id
quantity_grams
portion_label
```

## Recomendação

Não implementar grupos complexos se isso atrasar o MVP.  
Prioridade maior:

1. duplicar plano;
2. duplicar refeição;
3. salvar template.

---

# 11. Melhorias no construtor

## 11.1 Botões de produtividade

Adicionar no construtor:

No plano:

```txt
Duplicar plano
Salvar como template
Criar a partir de template
```

Na refeição:

```txt
Duplicar
Salvar como favorita
Remover
```

No dia:

```txt
Duplicar dia
Renomear
```

## 11.2 Confirmar ações destrutivas

Remover refeição, dia ou plano deve pedir confirmação.

Mensagem:

```txt
Remover esta refeição?
Os alimentos e substituições desta refeição serão removidos do plano.
```

## 11.3 Salvamento

Evitar perda de dados.

Se possível:
- mostrar indicador de rascunho salvo;
- bloquear navegação com alterações não salvas;
- ou exibir alerta simples.

---

# 12. Tela de templates

Criar rota, se fizer sentido:

```txt
/admin/nutricao/templates
```

Ou incluir como aba dentro de Nutrição:

```txt
Planos
PDFs
Templates
Alimentos
```

## Lista de templates

Campos:

- nome;
- objetivo;
- calorias;
- macros;
- refeições;
- criado em;
- ações.

Ações:

- usar template;
- editar;
- duplicar;
- excluir.

---

# 13. Criar plano a partir de template

Fluxo:

1. Coach clica em `Usar template`.
2. Seleciona aluno.
3. Define nome do plano.
4. Plano abre no construtor como rascunho.
5. Coach ajusta quantidades/metas.
6. Publica.

Nunca publicar template direto sem revisão.

---

# 14. Validação de segurança

Templates são do coach.

Regras:

- coach só vê templates dele;
- aluno nunca vê template;
- aluno só vê plano publicado;
- duplicação nunca copia check-ins.

---

# 15. Performance

Duplicação pode envolver muitos registros.

Cuidado com:

- criar plano;
- criar dias;
- criar refeições;
- criar itens;
- criar substituições.

Se possível, centralizar no endpoint transactional já criado.

Para produção final, considerar RPC/Postgres function para duplicação atômica.

---

# 16. Ordem de implementação sugerida

Implementar nesta ordem:

## Etapa 1

- duplicar refeição dentro do construtor;
- duplicar dia;
- melhorar refeições padrão.

## Etapa 2

- duplicar plano inteiro para rascunho;
- criar plano a partir de plano existente.

## Etapa 3

- salvar plano como template;
- listar templates;
- usar template para novo aluno.

## Etapa 4

- refeições favoritas, se ainda houver tempo;
- grupos de substituição, se ainda houver tempo.

---

# 17. Não fazer nesta fase

Não implementar ainda:

- IA para criar plano;
- cálculo automático de dieta;
- templates globais AURON prontos;
- marketplace de dietas;
- scanner;
- diário alimentar livre;
- app de micronutrientes;
- notificações push.

---

# 18. QA obrigatório

Testar:

## Duplicar refeição

1. Criar refeição com 3 alimentos.
2. Adicionar substituição.
3. Duplicar refeição.
4. Confirmar que itens e substituições foram copiados.
5. Alterar a cópia sem alterar a original.

## Duplicar dia

1. Criar Dia 1 com refeições.
2. Duplicar para Dia 2.
3. Confirmar estrutura copiada.
4. Alterar Dia 2 sem alterar Dia 1.

## Duplicar plano

1. Criar plano ativo para aluno A.
2. Duplicar para aluno B.
3. Confirmar que nasce como rascunho.
4. Confirmar que check-ins não foram copiados.
5. Publicar para aluno B.

## Templates

1. Salvar plano como template.
2. Abrir lista de templates.
3. Usar template em outro aluno.
4. Confirmar que plano nasce como rascunho.
5. Editar e publicar.

## Segurança

1. Coach não vê templates de outro coach.
2. Aluno não acessa templates.
3. Aluno só vê plano ativo publicado.

## Build

1. `npx tsc --noEmit`
2. `npm run build`

---

# 19. Critérios de aceitação

A fase estará pronta quando:

1. Coach conseguir duplicar refeição.
2. Coach conseguir duplicar dia.
3. Coach conseguir duplicar plano para outro aluno.
4. Plano duplicado nascer como rascunho.
5. Check-ins não forem duplicados.
6. Coach conseguir salvar plano como template.
7. Coach conseguir criar plano a partir de template.
8. Templates respeitarem permissões por coach.
9. Construtor ficar mais rápido de usar.
10. PDF continuar funcionando.
11. Build e TypeScript passarem.

---

# 20. Próxima fase

Depois desta fase, criar:

```txt
AURON NUTRIÇÃO DIGITAL — FASE 07
Refinamento de UI/UX, Mobile do Aluno e Polimento Comercial
```

Essa fase deve focar em:
- deixar a experiência do aluno mais bonita no mobile;
- deixar o construtor mais premium no desktop;
- reduzir poluição visual;
- melhorar empty states;
- preparar demo comercial da nutrição digital.
