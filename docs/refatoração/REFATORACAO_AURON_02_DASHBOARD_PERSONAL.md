# REFATORAÇÃO AURON — FASE 02
## Dashboard do Personal / Coach

> Projeto: **AURONFIT / AURON**
> Stack: **Next.js + React + TypeScript + Tailwind + Supabase + Vercel**
> Objetivo desta fase: redesenhar a **Dashboard principal do personal/coach**, mantendo a lógica de dados existente, mas transformando a tela em uma central de operação profissional da AURON.

---

# 1. Contexto da fase

A fase 01 já aplicou a base visual AURON: tokens, cores, tipografia e limpeza da identidade antiga.

Agora vamos atacar a tela mais importante para vender o produto para personais:

## Dashboard do Personal

Essa tela precisa deixar de parecer um painel genérico e passar a parecer uma plataforma SaaS fitness premium.

A dashboard precisa responder rapidamente:

1. Quanto entrou de dinheiro?
2. Quanto ainda falta receber?
3. Quais alunos precisam de atenção?
4. Quem está treinando bem?
5. Quem está em risco?
6. O que o coach precisa fazer agora?

A AURON não é só um app de treino. Ela é o elo entre:

**prescrição → execução → evolução**

Essa lógica deve aparecer na dashboard.

---

# 2. Escopo desta fase

## Fazer

- Refatorar a tela principal do admin/coach.
- Melhorar hierarquia visual da dashboard.
- Criar ou refatorar componentes específicos de dashboard.
- Aplicar a identidade AURON com azul, dark SaaS e linguagem de produto.
- Reorganizar cards, gráficos, alertas e ações prioritárias.
- Preservar dados reais vindos do Supabase.
- Melhorar estados vazios, loading e erro.
- Melhorar responsividade desktop/tablet/mobile.
- Remover qualquer resquício visual do dourado antigo.
- Remover qualquer referência visual ao “Coach Vinny” como marca principal.

## Não fazer nesta fase

- Não alterar schema do Supabase.
- Não criar migrations.
- Não mexer em autenticação.
- Não alterar regras de negócio de cobrança.
- Não alterar cálculo financeiro sem necessidade.
- Não refatorar ainda a tela de alunos.
- Não refatorar ainda a ficha digital.
- Não criar nova funcionalidade pesada.
- Não quebrar rotas existentes.

---

# 3. Arquivos prováveis

Procure a dashboard do admin/coach nestas possíveis pastas:

```txt
app/admin
app/admin/dashboard
app/(authenticated)/admin
app/(authenticated)/admin/dashboard
components/dashboard
components/layout
components/ui
```

Se a dashboard estiver em outro caminho, identifique a rota correta e aplique a refatoração nela.

A rota provável deve ser algo como:

```txt
/admin
/admin/dashboard
```

Preserve a rota atual.

---

# 4. Direção visual da nova dashboard

A nova dashboard deve seguir esta direção:

## Visual

- Fundo escuro profundo.
- Superfícies com contraste sutil.
- Azul AURON como cor principal.
- Cards mais limpos, menos “inflados”.
- Menos radius exagerado.
- Sem gradiente decorativo em excesso.
- Sem bordas brancas fortes.
- Sem dourado.
- Sem aparência de template IA.
- Sem cards vazios gigantes.
- Mais densidade útil.
- Mais leitura de SaaS profissional.

## Sensação desejada

A tela deve parecer:

- produto profissional
- plataforma B2B
- central de comando do coach
- sistema confiável para gestão
- ferramenta para ganhar dinheiro e acompanhar alunos

Evite parecer:

- app fitness genérico
- dashboard decorativa
- painel administrativo vazio
- layout de Lovable/IA
- landing page
- peça publicitária

---

# 5. Layout recomendado

A dashboard deve ser estruturada em blocos.

## Header da página

No topo da dashboard:

```txt
Dashboard
Visão geral da sua consultoria
```

À direita, colocar ações rápidas:

```txt
+ Adicionar aluno
Criar treino
Nova cobrança
```

Se alguma ação ainda não existir, manter apenas as ações existentes ou usar botão que aponta para rota existente.

Não inventar rotas que quebram o app.

### Exemplo visual

```txt
[Dashboard]
Visão geral da sua consultoria

[+ Adicionar aluno] [Criar treino] [Nova cobrança]
```

Em mobile, os botões podem virar menu/stack vertical.

---

# 6. Bloco 1 — Métricas financeiras

Primeira linha da dashboard.

Criar 4 cards menores e bem objetivos:

1. **Receita do mês**
2. **MRR ativo**
3. **Pendências**
4. **Previsão do mês**

## Conteúdo sugerido

### Receita do mês

```txt
Receita do mês
R$ 7.459,97
+12% vs mês anterior
```

### MRR ativo

```txt
MRR ativo
R$ 7.769,97
Receita recorrente vigente
```

### Pendências

```txt
Pendências
R$ 2.840,00
5 alunos pendentes
```

### Previsão do mês

```txt
Previsão do mês
R$ 9.120,00
Baseado em planos ativos
```

Use os dados existentes. Se algum dado ainda não existir, mostre estado controlado, não valor inventado.

Exemplo:

```txt
Ainda sem dados
```

ou

```txt
Não calculado
```

---

# 7. Bloco 2 — Saúde da operação

Segunda linha da dashboard.

Criar 4 cards voltados à operação dos alunos:

1. **Alunos ativos**
2. **Adesão média**
3. **Alunos em risco**
4. **Check-ins pendentes**

## Conteúdo sugerido

### Alunos ativos

```txt
Alunos ativos
44
Pagantes e vigentes
```

### Adesão média

```txt
Adesão média
72%
Treinos concluídos na semana
```

### Alunos em risco

```txt
Alunos em risco
6
Sem treino há mais de 7 dias
```

### Check-ins pendentes

```txt
Check-ins pendentes
12
Fotos, medidas ou feedbacks
```

Se hoje o app só tiver parte desses dados, preserve o que existir e use fallback limpo para o resto.

---

# 8. Bloco 3 — Ações prioritárias

Este é um dos blocos mais importantes da nova dashboard.

Criar uma seção chamada:

```txt
Ações prioritárias
```

Ela deve listar eventos que exigem ação do coach.

## Tipos de ações possíveis

- Aluno com plano vencendo.
- Aluno inadimplente.
- Aluno sem treinar há mais de 7 dias.
- Aluno sem ficha ativa.
- Aluno enviou feedback.
- Aluno enviou fotos.
- Aluno registrou medida.
- Aluno bateu recorde.
- Plano alimentar pendente.

Use apenas dados existentes. Se não houver dados suficientes, criar estado vazio profissional:

```txt
Tudo em ordem por agora
Nenhuma pendência crítica encontrada na sua consultoria.
```

## Card de ação

Cada item deve mostrar:

```txt
[ícone/status] Nome do aluno
Descrição curta do problema
Tempo ou prazo
Ação principal
```

Exemplo:

```txt
Luiz Irias
Plano vence em 3 dias
Ver aluno
```

Outro exemplo:

```txt
João Vitor
Sem treino registrado há 8 dias
Abrir histórico
```

## Hierarquia de severidade

Usar cores sem exagero:

- `danger` para vencido/inadimplente/risco alto
- `warning` para vencendo ou atenção
- `info` para novo feedback/foto/medida
- `success` para recorde/evolução positiva

Não usar vermelho em excesso.

---

# 9. Bloco 4 — Saúde dos alunos

Criar uma seção ao lado ou abaixo de ações prioritárias:

```txt
Saúde dos alunos
```

Essa seção deve mostrar um resumo dos alunos em formato de lista ou cards compactos.

## Métricas por aluno

Quando possível, cada aluno deve mostrar:

- Nome
- Status
- Adesão semanal
- Última atividade
- Evolução recente
- Risco

Exemplo:

```txt
Luiz Irias
Adesão 80%
Último treino há 2 dias
+5kg no supino
```

Se não houver dados de evolução, mostrar:

```txt
Sem evolução registrada ainda
```

O objetivo é fazer o coach bater o olho e entender quem precisa de atenção.

---

# 10. Bloco 5 — Gráficos

Os gráficos devem ser úteis, não decorativos.

Manter ou refatorar o gráfico de faturamento, mas com melhor leitura.

## Gráfico 1 — Receita por mês

Título:

```txt
Receita por mês
```

Subtítulo:

```txt
Realizado e projeção dos próximos meses
```

Regras:

- Usar azul AURON para realizado.
- Usar azul com opacidade/borda tracejada para projeção.
- Evitar barras douradas.
- Evitar gráfico gigante com pouca informação.
- Garantir que os labels sejam legíveis.
- Garantir que empty state seja bonito quando não houver dados.

## Gráfico 2 — Distribuição por plano

Se já existir dados de planos, manter em card separado:

```txt
Distribuição por plano
```

Exemplo:

```txt
Mensal: 28 alunos
Trimestral: 12 alunos
Semestral: 4 alunos
```

Pode ser lista com barras horizontais. Não precisa ser donut se isso complicar.

---

# 11. Bloco 6 — Eventos recentes

Renomear “Monitoramento em Tempo Real” para algo mais maduro:

```txt
Atividade recente
```

ou

```txt
Eventos recentes
```

Essa seção deve mostrar:

- tipo
- aluno
- evento
- data
- ação

Exemplo:

```txt
Feedback · Luiz Irias · Enviou feedback pós-treino · Hoje 14:30
Medida · João Vitor · Registrou nova medida · Ontem
Treino · Maria Souza · Concluiu Lower A · Ontem
```

Se não houver eventos:

```txt
Nenhuma atividade recente
Quando seus alunos treinarem, enviarem feedbacks ou registrarem medidas, os eventos aparecerão aqui.
```

---

# 12. Componentes recomendados

Criar ou refatorar componentes, se fizer sentido:

```txt
components/dashboard/CoachDashboard.tsx
components/dashboard/DashboardMetricCard.tsx
components/dashboard/PriorityActions.tsx
components/dashboard/PriorityActionItem.tsx
components/dashboard/StudentHealthPanel.tsx
components/dashboard/RevenueChartCard.tsx
components/dashboard/PlanDistributionCard.tsx
components/dashboard/RecentActivityTable.tsx
```

Se o projeto já tiver componentes parecidos, refatore os existentes ao invés de duplicar sem necessidade.

## Regra importante

Não criar componente gigante com 800 linhas.

Separar visual e lógica sempre que possível.

---

# 13. Classes e estilo

Usar tokens AURON criados na fase 01.

Evitar classes com cores fixas antigas.

Proibido manter:

```txt
yellow
amber
gold
dourado
#d4af37
#D4AF37
#facc15
```

Exceto se for um estado de `warning` real, mas mesmo assim usar token semântico.

## Usar semântica

Em vez de:

```tsx
className="text-yellow-500"
```

Preferir:

```tsx
className="text-warning"
```

ou:

```tsx
className="text-[var(--auron-warning)]"
```

Se o Tailwind já foi configurado com tokens, usar:

```tsx
className="text-primary"
className="bg-primary"
className="border-border"
className="bg-surface"
```

---

# 14. Responsividade

## Desktop

- Sidebar fixa à esquerda.
- Conteúdo com max-width confortável.
- Cards em grid de 4 colunas quando houver espaço.
- Bloco de ações + saúde dos alunos em 2 colunas.
- Gráficos em 2 colunas ou 1 coluna ampla conforme necessidade.

## Tablet

- Cards em 2 colunas.
- Ações prioritárias e saúde dos alunos em 1 coluna.

## Mobile

- Cards em 1 coluna.
- Header com ações empilhadas ou menu.
- Gráficos simplificados.
- Tabelas devem virar lista/card quando necessário.
- Não deixar overflow horizontal feio.

---

# 15. Copy da tela

Usar linguagem clara, direta e profissional.

## Títulos

Usar:

```txt
Dashboard
Visão geral da sua consultoria
```

Não usar:

```txt
Visão geral e saúde do negócio
```

É aceitável, mas fica um pouco genérico. Preferir uma linguagem mais clara para personal.

## Cards

Preferir:

```txt
Receita do mês
MRR ativo
Pendências
Previsão do mês
Alunos ativos
Adesão média
Alunos em risco
Check-ins pendentes
```

## Seções

Preferir:

```txt
Ações prioritárias
Saúde dos alunos
Receita por mês
Distribuição por plano
Atividade recente
```

Evitar termos muito genéricos ou com cara de template:

```txt
Monitoramento em Tempo Real
Saúde do negócio
Overview
Insights
```

---

# 16. Estados vazios

A dashboard não pode parecer quebrada quando tiver poucos dados.

Criar empty states profissionais.

## Sem receita

```txt
Ainda sem receita registrada
Quando seus alunos tiverem planos ativos ou cobranças pagas, os valores aparecerão aqui.
```

## Sem alunos

```txt
Nenhum aluno cadastrado ainda
Adicione seu primeiro aluno para começar a prescrever treinos e acompanhar evolução.
```

## Sem ações prioritárias

```txt
Tudo em ordem por agora
Nenhuma pendência crítica encontrada na sua consultoria.
```

## Sem eventos recentes

```txt
Nenhuma atividade recente
Treinos concluídos, feedbacks e medidas aparecerão aqui.
```

---

# 17. Estados de loading

Não usar tela inteira vazia.

Usar skeletons simples:

- skeleton para cards de métricas
- skeleton para lista de ações
- skeleton para gráfico
- skeleton para tabela de eventos

Evitar spinners gigantes no centro.

---

# 18. Estados de erro

Se algum bloco falhar, não quebrar a dashboard inteira.

Exemplo:

```txt
Não foi possível carregar os dados financeiros.
Tentar novamente
```

Se possível, isolar erros por seção.

---

# 19. Acessibilidade e usabilidade

- Botões devem ter texto claro.
- Ícones não devem ser a única forma de comunicação.
- Cores não devem ser a única forma de indicar status.
- Garantir contraste suficiente em textos secundários.
- Não usar texto pequeno demais em tabelas.
- Inputs e botões devem ter focus visível.
- Cards clicáveis devem ter cursor e aria-label quando necessário.

---

# 20. Regras de preservação

Durante a refatoração:

- Não remover imports necessários.
- Não quebrar hooks existentes.
- Não alterar nomes de tabelas do Supabase.
- Não alterar autenticação.
- Não trocar lógica de permissões.
- Não alterar redirect.
- Não modificar dados de produção.
- Não criar dados fake fixos se já houver dados reais.
- Dados mockados só podem existir como fallback visual controlado e devem estar claramente isolados.

---

# 21. Checklist técnico antes de finalizar

Rodar:

```bash
npm run lint
npm run build
```

Se o projeto não tiver algum comando, rodar o equivalente disponível.

Verificar:

- Dashboard abre sem erro.
- Sidebar continua funcionando.
- Dados reais continuam aparecendo.
- Sem dourado antigo.
- Sem “Coach Vinny” como marca principal.
- Responsivo em desktop e mobile.
- Não há overflow horizontal.
- Estados vazios estão bons.
- Build passa.
- Lint passa ou erros existentes são documentados.

---

# 22. Critérios de aceitação

A fase 02 só está concluída quando:

- A dashboard do personal estiver visualmente alinhada à AURON.
- A tela parecer uma central de comando de SaaS fitness.
- Métricas financeiras estiverem no topo.
- Ações prioritárias existirem ou tiverem empty state.
- Saúde dos alunos existir ou tiver fallback limpo.
- Gráficos estiverem azuis e mais úteis.
- Eventos recentes estiverem mais organizados.
- Dourado antigo tiver sido removido.
- Dados e rotas atuais continuarem funcionando.
- Build não quebrar.

---

# 23. Prompt de execução para IA no VSCode

Use este comando como orientação principal para executar a fase:

```txt
Refatore a dashboard principal do admin/coach seguindo o documento REFATORACAO_AURON_02_DASHBOARD_PERSONAL.md.

Aplique a identidade visual AURON criada na fase 01, usando azul como cor principal, dark SaaS profissional, menos radius, menos cards decorativos e mais densidade útil.

Preserve a lógica atual de dados, autenticação, rotas e Supabase. Não altere schema, migrations ou regras de negócio.

Reorganize a dashboard em: header com ações rápidas, métricas financeiras, saúde da operação, ações prioritárias, saúde dos alunos, gráficos úteis e atividade recente.

Crie ou refatore componentes de dashboard quando necessário, evitando componentes gigantes.

Remova resquícios visuais do dourado antigo e qualquer referência visual ao Coach Vinny como marca principal.

Garanta responsividade, estados vazios, loading states e erro por seção.

Ao final, rode lint/build e corrija erros causados pela refatoração.
```

---

# 24. Observação final

Esta fase é sobre percepção de produto.

A dashboard precisa vender a promessa da AURON para o personal:

```txt
organizar alunos, acompanhar evolução e controlar dinheiro em um só lugar.
```

Se a tela continuar parecendo apenas um painel com cards e gráficos, a refatoração não foi longe o bastante.
