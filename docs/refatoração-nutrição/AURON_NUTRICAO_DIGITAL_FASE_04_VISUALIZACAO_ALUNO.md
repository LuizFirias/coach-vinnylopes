# AURON NUTRIÇÃO DIGITAL — FASE 04
## Visualização Interativa do Plano Alimentar para o Aluno

> Objetivo desta fase: transformar o plano alimentar digital criado pelo coach em uma experiência simples, limpa e prática para o aluno. O aluno deve entender o que comer, em qual refeição, qual porção usar, quais substituições existem e conseguir marcar adesão sem poluição visual.

---

## 1. Contexto

As fases anteriores criaram:

- banco de dados da Nutrição Digital;
- base global de alimentos;
- porções caseiras;
- construtor de plano digital para o coach;
- publicação de plano ativo;
- busca de alimentos;
- macros em tempo real;
- substituições;
- histórico misto entre PDF e digital.

Agora o foco é o aluno.

A regra principal da experiência do aluno:

```txt
O aluno não precisa ver uma planilha nutricional.
Ele precisa ver o que fazer hoje.
```

---

## 2. Escopo da Fase 04

Implementar/refatorar:

1. Tela de Nutrição do aluno com suporte a plano digital.
2. Exibição do plano alimentar ativo.
3. Refeições do dia em cards limpos.
4. Alimentos, porções e observações.
5. Substituições por alimento.
6. Macros de forma discreta.
7. Check-in de refeição.
8. Histórico simples de adesão do dia.
9. Resumo na dashboard do aluno.
10. Coexistência com plano em PDF.

---

## 3. Rotas envolvidas

Ajustar conforme estrutura real:

```txt
/aluno/nutricao
/aluno/dashboard
/api/aluno/plano-alimentar/digital
/api/aluno/plano-alimentar/checkin
```

Se já existir rota de nutrição do aluno, refatorar sem duplicar.

---

# 4. Regra de prioridade entre PDF e Digital

A aba Nutrição do aluno deve aceitar os dois formatos:

```txt
Plano Digital
Plano em PDF
```

## Se houver plano digital ativo

Mostrar plano digital como destaque principal.

Abaixo, se houver PDFs antigos:
- mostrar como histórico ou documentos adicionais.

## Se houver apenas PDF

Manter experiência atual de PDF.

## Se não houver nenhum plano

Mostrar empty state útil:

```txt
Plano alimentar em preparação
Seu coach ainda não liberou um plano alimentar para você.
Enquanto isso, mantenha hidratação, rotina de refeições e siga as orientações combinadas.
```

---

# 5. Tela principal do aluno: Nutrição

## Header

Título:

```txt
Nutrição
```

Subtítulo:

```txt
Seu plano alimentar e refeições do dia
```

Evitar textos longos.

---

## 5.1 Card de resumo do dia

Exibir no topo:

```txt
Plano ativo
Hipertrofia inicial
3 de 5 refeições feitas hoje
```

Se houver metas:

```txt
2.380 kcal planejadas
165g proteína · 280g carbo · 62g gordura
```

Usar macros de forma discreta, sem transformar a tela em tabela.

---

## 5.2 Progresso diário

Mostrar uma barra simples ou mini cards:

```txt
Refeições: 3/5
Kcal planejadas: 2.380
Proteína: 165g
```

Atenção: esses macros são planejados/prescritos. Não chamar de “consumidos” se o aluno apenas marcou refeição como feita.

Texto recomendado:

```txt
Macros previstos do plano
```

ou:

```txt
Planejado para hoje
```

---

# 6. Cards de refeição

Cada refeição deve ser um card compacto e claro.

## Exemplo visual lógico

```txt
Café da manhã
08:00

2 ovos inteiros
40g de aveia
1 banana prata

430 kcal · 24P · 55C · 14G

[Marcar como feita]
```

## Cada card deve exibir

- nome da refeição;
- horário sugerido;
- status do check-in;
- lista de alimentos;
- porções;
- macros da refeição;
- observações do coach;
- botão de marcar adesão;
- substituições, quando existirem.

---

## 6.1 Estados da refeição

Status possíveis:

```txt
done
skipped
partial
substituted
```

Labels para aluno:

```txt
Feita
Não fiz
Parcial
Troquei substituição
```

Botões ou menu:

```txt
Marcar como feita
Não fiz
Fiz parcialmente
Usei substituição
```

Para MVP, pode começar apenas com:

```txt
Marcar como feita
Desmarcar
```

Mas se o endpoint já suporta status, deixar a interface preparada.

---

# 7. Substituições

Substituições devem ficar recolhidas por padrão.

Exibir na linha do alimento:

```txt
Ver substituições
```

Ao abrir:

```txt
Pode trocar por:
Tilápia grelhada — 180g
Patinho moído — 130g
Ovos inteiros — 3 unidades
```

Atenção:
- substituições não somam nos macros principais do plano;
- elas são alternativas;
- ao marcar “usei substituição”, registrar status `substituted` e nota simples se possível.

---

# 8. Visual dos alimentos

Cada alimento dentro da refeição deve mostrar:

```txt
Arroz branco cozido
120g · 4 colheres de sopa
```

Ou, quando só houver gramas:

```txt
Peito de frango grelhado
150g
```

Macros por alimento devem ficar ocultos por padrão ou em texto pequeno.

Não poluir a tela com números demais.

---

# 9. Macros no aluno

## Mostrar por padrão

- kcal da refeição;
- proteína/carbo/gordura de forma resumida;
- total do dia.

## Não mostrar por padrão

- fibras detalhadas;
- macro por item em destaque;
- tabelas densas;
- diferença matemática grande demais.

O aluno deve conseguir seguir o plano sem se sentir dentro de uma planilha.

---

# 10. Dashboard do aluno

Adicionar ou ajustar card na Home do aluno.

## Card: Nutrição de hoje

Se houver plano digital ativo:

```txt
Nutrição de hoje
3 de 5 refeições feitas
Próxima: Lanche da tarde às 16:00
```

Botão:

```txt
Ver plano
```

Se não houver plano:

```txt
Plano alimentar em preparação
Seu coach ainda não liberou seu plano.
```

Se houver apenas PDF:

```txt
Plano alimentar em PDF disponível
Abrir plano
```

---

# 11. Check-in de refeição

Usar endpoint já criado:

```txt
POST /api/aluno/plano-alimentar/checkin
```

## Payload sugerido

```json
{
  "plan_id": "...",
  "meal_id": "...",
  "status": "done",
  "checkin_date": "YYYY-MM-DD",
  "notes": ""
}
```

## Comportamento esperado

- se já existe check-in do mesmo aluno/refeição/data, atualizar;
- se não existe, criar;
- atualizar UI imediatamente;
- tratar loading por refeição, não a tela inteira.

---

# 12. Estado offline/erro simples

Se check-in falhar:

Mensagem:

```txt
Não foi possível registrar agora. Tente novamente.
```

Não apagar estado anterior.

---

# 13. Histórico simples

Nesta fase, não precisa criar calendário completo.

Mas pode mostrar:

```txt
Hoje
3/5 refeições feitas
```

E futuramente:

```txt
Semana
24/35 refeições feitas
```

Se for rápido, criar uma seção compacta:

```txt
Adesão da semana
```

Se isso atrasar, deixar para Fase 05.

---

# 14. Compatibilidade com PDF

Não remover o PDF.

Na tela de Nutrição do aluno, criar seções:

```txt
Plano digital
Documentos em PDF
```

Se o plano digital estiver ativo, ele vem primeiro.

PDFs antigos ficam abaixo como documentos.

---

# 15. Componentes recomendados

Criar/refatorar:

```txt
StudentNutritionPage
StudentNutritionSummaryCard
StudentMealCard
StudentMealItemRow
StudentSubstitutionList
MealCheckinButton
NutritionDailyProgress
StudentNutritionDashboardCard
PdfNutritionDocuments
```

---

# 16. Regras visuais

Seguir AURON:

- mobile-first para aluno;
- cards compactos;
- sem excesso de radius;
- botões grandes o suficiente para toque;
- macros discretos;
- nada de tabela poluída;
- leitura rápida.

## Mobile

A tela precisa funcionar muito bem em celular.

O aluno provavelmente vai abrir isso no celular.

---

# 17. Não fazer nesta fase

Não implementar ainda:

- diário alimentar livre;
- scanner;
- foto de comida;
- IA de dieta;
- edição do plano pelo aluno;
- micronutrientes completos;
- gráfico avançado de adesão;
- calendário mensal de dieta.

---

# 18. QA obrigatório

Testar:

1. Coach publica plano digital.
2. Aluno acessa Nutrição.
3. Plano digital aparece.
4. Refeições aparecem na ordem correta.
5. Alimentos e porções aparecem corretamente.
6. Macros da refeição aparecem.
7. Substituições abrem/fecham.
8. Aluno marca refeição como feita.
9. Check-in persiste após refresh.
10. Dashboard do aluno mostra resumo de nutrição.
11. PDF antigo continua aparecendo.
12. Sem plano digital, PDF continua funcionando.
13. Sem nenhum plano, empty state aparece.
14. TypeScript passa.
15. Build passa.

---

# 19. Critérios de aceitação

A fase estará pronta quando:

1. Aluno conseguir visualizar plano digital ativo.
2. Aluno entender as refeições do dia sem confusão.
3. Aluno conseguir marcar refeição como feita.
4. Substituições aparecerem de forma limpa.
5. Macros aparecerem sem poluir.
6. Dashboard do aluno mostrar resumo de nutrição.
7. PDF continuar funcionando.
8. Mobile estiver confortável.
9. Build e TypeScript passarem.

---

# 20. Próxima fase

Depois desta fase, criar:

```txt
AURON NUTRIÇÃO DIGITAL — FASE 05
Adesão, Métricas e Dashboard do Coach
```

Essa fase vai transformar check-ins em informação útil para o coach:
- alunos sem seguir plano;
- refeições mais puladas;
- adesão semanal;
- alertas na dashboard;
- resumo no perfil do aluno.
