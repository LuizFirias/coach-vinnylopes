# AURON NUTRIÇÃO DIGITAL — FASE 05
## Adesão, Métricas e Dashboard do Coach

> Objetivo desta fase: transformar os check-ins alimentares do aluno em informação útil para o coach. A Nutrição Digital não deve ser apenas um plano bonito; ela precisa gerar acompanhamento, alertas e decisões.

---

## 1. Contexto

Até aqui:

- alimentos globais existem;
- coach cria plano digital;
- aluno visualiza plano;
- aluno marca refeições como feitas/não feitas;
- check-ins são salvos.

Agora a AURON precisa dar inteligência operacional para o coach:

```txt
Quem está seguindo o plano?
Quem não abriu?
Quem pulou refeições?
Quem precisa de ajuste?
```

Essa fase cria a camada de acompanhamento.

---

## 2. Escopo da Fase 05

Implementar:

1. Métricas de adesão alimentar por aluno.
2. Resumo de nutrição no dashboard do coach.
3. Indicadores no perfil do aluno.
4. Lista de alunos com baixa adesão.
5. Histórico simples de check-ins.
6. Alertas operacionais.
7. Cards compactos na tela de Nutrição do coach.
8. Manter PDF funcionando.

---

# 3. Conceito de adesão alimentar

A adesão deve ser calculada com base em refeições marcadas.

## Fórmula simples

```txt
adesão = refeições feitas / refeições planejadas
```

Exemplo:

```txt
Plano com 5 refeições por dia
Aluno marcou 4 como feitas

Adesão diária = 80%
```

## Status que contam como adesão

Definir:

```txt
done = conta como feita
substituted = conta como feita
partial = conta como parcial
skipped = não conta
```

Para `partial`, usar peso 0.5 se quiser.

Exemplo:

```txt
done = 1
substituted = 1
partial = 0.5
skipped = 0
```

---

# 4. Helpers de cálculo

Criar helper:

```txt
lib/nutrition/adherence.ts
```

Funções recomendadas:

```ts
calculateMealAdherence(checkins, plannedMeals)
calculateDailyAdherence(plan, checkins, date)
calculateWeeklyAdherence(plan, checkins, weekStart)
getMissedMeals(checkins, plannedMeals)
getNextMeal(plan, checkins, date)
```

Retornos úteis:

```ts
{
  plannedMeals: 5,
  completedMeals: 4,
  partialMeals: 0,
  skippedMeals: 1,
  adherencePercent: 80
}
```

---

# 5. Dashboard do coach

Adicionar bloco compacto na dashboard do coach.

## Card ou seção: Nutrição

Mostrar:

```txt
Adesão alimentar média
Alunos sem plano
Baixa adesão
Check-ins hoje
```

Exemplo:

```txt
Nutrição
Adesão média: 76%
3 alunos sem plano
2 alunos abaixo de 60%
18 check-ins hoje
```

Não deixar card gigante.

---

# 6. Ações prioritárias

Adicionar alertas de nutrição nas ações prioritárias do coach.

Exemplos:

```txt
Fernando não marcou refeições há 3 dias
Maria pulou o jantar 3 vezes na semana
Luiz está sem plano alimentar ativo
Ana tem plano desatualizado há 35 dias
```

Cada alerta deve ter ação:

```txt
Ver plano
Abrir aluno
Criar plano
```

---

# 7. Tela Gestão de Nutrição do coach

A tela deve ganhar métricas reais.

## Cards superiores

```txt
Planos digitais ativos
Adesão média
Alunos sem plano
Baixa adesão
```

## Tabela/lista de alunos

Criar bloco:

```txt
Acompanhamento alimentar
```

Campos:

- Aluno
- Plano ativo
- Refeições hoje
- Adesão 7 dias
- Último check-in
- Status
- Ação

Exemplo:

```txt
Fernando
Hipertrofia inicial
3/5 hoje
82% na semana
Hoje 12:40
Em dia
[Ver plano]
```

Status:

```txt
Em dia
Atenção
Sem check-in
Sem plano
```

---

# 8. Perfil do aluno — aba Nutrição

No perfil completo do aluno para o coach, adicionar/ajustar aba Nutrição.

Mostrar:

## Resumo

- plano ativo;
- meta calórica;
- refeições por dia;
- adesão hoje;
- adesão 7 dias;
- último check-in.

## Refeições recentes

Lista:

```txt
Hoje
Café da manhã — Feita
Almoço — Feita
Lanche — Pendente
Jantar — Pendente
```

## Ações

- Ver plano
- Editar plano
- Criar novo plano
- Enviar PDF
- Solicitar check-in

---

# 9. Relatórios simples

Na tela Relatórios, se for rápido:

Adicionar seção:

```txt
Nutrição
```

Com:

- adesão alimentar média;
- planos digitais ativos;
- alunos sem plano;
- check-ins no período.

Não criar gráfico complexo agora.

---

# 10. API/services

Criar endpoints ou services para métricas.

Sugestões:

```txt
GET /api/admin/nutricao/adherence
GET /api/admin/nutricao/adherence?studentId=...
GET /api/admin/nutricao/alerts
```

Ou Server Actions equivalentes.

Retorno esperado:

```json
{
  "averageAdherence": 76,
  "studentsWithoutPlan": 3,
  "lowAdherenceStudents": 2,
  "todayCheckins": 18
}
```

---

# 11. Performance

Cuidado para não fazer N+1 queries.

Preferir:

- buscar planos ativos dos alunos do coach;
- buscar refeições dos planos;
- buscar check-ins do período;
- calcular em memória;
- ou criar view/RPC depois, se necessário.

Para MVP, cálculo em service é aceitável.

Futuro:
- materialized view;
- RPC Supabase;
- agregados por dia.

---

# 12. Estados vazios

Se nenhum aluno tem plano digital:

```txt
Nenhum plano digital ativo
Crie planos digitais para acompanhar a adesão alimentar dos seus alunos.
```

CTA:

```txt
Criar plano digital
```

Se há plano, mas nenhum check-in:

```txt
Nenhum check-in alimentar registrado ainda
Quando seus alunos marcarem refeições, os dados aparecerão aqui.
```

---

# 13. Semântica importante

Usar termos corretos:

```txt
Adesão alimentar
Refeições feitas
Refeições pendentes
Plano ativo
Check-ins
```

Evitar:

```txt
Calorias consumidas
Macros consumidos
```

A menos que o aluno registre exatamente o que comeu.

Como no MVP ele marca adesão ao plano, o correto é:

```txt
Planejado
Prescrito
Feito
Aderência
```

---

# 14. Não fazer nesta fase

Não implementar ainda:

- diário alimentar livre;
- gráficos complexos;
- calorias consumidas reais;
- scanner;
- IA;
- notificações push;
- automações avançadas;
- ranking nutricional.

---

# 15. QA obrigatório

Testar:

1. Criar plano digital para aluno.
2. Aluno marcar 2 refeições feitas.
3. Coach abrir dashboard.
4. Card de nutrição atualizar.
5. Gestão de Nutrição mostrar check-ins.
6. Perfil do aluno mostrar adesão.
7. Marcar refeição como skipped.
8. Adesão recalcular.
9. Plano sem check-in gerar atenção.
10. Aluno sem plano aparecer em lista.
11. PDF continuar funcionando.
12. Build passar.
13. TypeScript passar.

---

# 16. Critérios de aceitação

A fase estará pronta quando:

1. Coach conseguir ver adesão alimentar dos alunos.
2. Dashboard mostrar resumo de nutrição.
3. Gestão de Nutrição mostrar alunos com plano e check-ins.
4. Perfil do aluno mostrar nutrição de forma útil.
5. Alertas de baixa adesão funcionarem.
6. Termos estiverem corretos: planejado/prescrito/feito.
7. PDF continuar funcionando.
8. Build e TypeScript passarem.

---

# 17. Próxima fase

Depois desta fase, criar:

```txt
AURON NUTRIÇÃO DIGITAL — FASE 06
Templates, Duplicação e Otimização do Fluxo do Coach
```

Essa fase melhora produtividade:
- templates;
- duplicar refeição;
- duplicar dia;
- duplicar plano;
- modelos por objetivo;
- favoritos do coach.
