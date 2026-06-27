# REFATORAÇÃO AURON — FASE 03
## Base de Atletas + Perfil Completo do Aluno para o Coach

> Objetivo desta fase: transformar a área de atletas em uma verdadeira central de acompanhamento. Hoje a tela está funcional, mas ainda parece uma listagem vazia e pouco estratégica. Nesta fase, o coach precisa conseguir **ver, localizar, entender e agir** sobre seus alunos com muito mais clareza.

---

## CONTEXTO

A identidade AURON já começou a ser aplicada nas fases anteriores. Agora o foco é sair de telas “bonitas porém vazias” e criar áreas com mais valor de produto.

A tela **Base de Atletas** precisa virar uma das principais telas do sistema, porque:
- é uma área usada diariamente pelo coach;
- é onde o coach localiza alunos, status, planos e riscos;
- é a porta de entrada para o perfil completo do aluno;
- comunica imediatamente a robustez do SaaS.

A refatoração deve manter a identidade visual AURON já criada:
- dark premium;
- azul como primária;
- tipografia consistente;
- cards limpos;
- bordas suaves;
- layout mais profissional e menos “app gerado por IA”.

---

## DIRETRIZ GLOBAL DE LAYOUT

Aplicar esta regra em todas as páginas desta fase:

- usar um container principal com largura confortável para desktop;
- **max-width entre 1280px e 1440px**;
- conteúdo alinhado à esquerda com respiro consistente;
- evitar blocos estreitos perdidos em telas largas;
- evitar concentrar tudo no centro da página com muito vazio lateral;
- manter espaçamentos verticais consistentes.

Se necessário, criar um wrapper reutilizável como:
- `PageContainer`
- `PageHeader`
- `SectionHeader`

---

## ESCOPO DA FASE 03

### 1. Refatorar a tela “Base de Atletas”
### 2. Criar estados úteis de busca/filtro/vazio
### 3. Criar cards e tabela/lista de alunos mais robustos
### 4. Criar “Perfil Completo do Aluno” acessado pelo coach
### 5. Estruturar a navegação interna do perfil do aluno por abas/seções

---

# 1) NOVA TELA: BASE DE ATLETAS

## Objetivo
A tela deve deixar de ser apenas um campo de busca com card vazio.
Ela precisa funcionar como um painel de gestão dos alunos.

## Estrutura desejada

### Header da página
Exibir:
- título: `Base de Atletas`
- subtítulo: `Gestão de performance, vínculo e acompanhamento dos seus alunos`
- ação primária: `Adicionar Aluno`
- ação secundária opcional: `Exportar lista` (se já existir lógica ou se puder ficar desabilitada visualmente)

### Linha de métricas rápidas
Criar uma linha de cards de resumo com:
- Alunos ativos
- Alunos pendentes
- Alunos inativos
- Planos vencendo em breve

Esses cards devem:
- usar o design system AURON;
- ter leitura rápida;
- número grande e label clara;
- poder funcionar mesmo com zero dados.

### Linha de filtros e busca
Criar uma barra com:
- input de busca por nome/email;
- filtro por status: `Todos / Ativos / Pendentes / Inativos`;
- filtro por plano: `Mensal / Trimestral / Semestral / Anual` (apenas se os dados permitirem);
- opção de ordenação: `Mais recentes`, `Última atividade`, `Vencimento`, `Nome`.

Se alguns filtros ainda não estiverem ligados à lógica, estruturar visualmente e implementar pelo menos:
- busca por nome/email;
- filtro por status;
- ordenação simples.

### Lista principal de alunos
Exibir os alunos em formato desktop profissional.
Preferência:
- tabela moderna com linhas clicáveis;
- ou lista de cards horizontais responsivos.

Campos recomendados:
- avatar/iniciais
- nome
- e-mail
- plano
- status
- renovação / vencimento
- última atividade
- adesão ou progresso rápido (se já existir dado)
- ação: `Ver perfil`

#### Estados visuais de status
- Ativo = badge positiva
- Pendente = badge de atenção
- Inativo = badge neutra ou de risco
- Vence em breve = destaque sutil

### Estado vazio da tela
Se não existir aluno cadastrado, substituir o vazio atual por um estado mais útil:

Título:
`Nenhum aluno cadastrado ainda`

Texto:
`Adicione seu primeiro aluno para começar a prescrever treinos, acompanhar evolução e gerenciar a sua consultoria.`

Botões:
- `Cadastrar primeiro aluno`
- opcional: `Ver como funciona`

---

# 2) COMPORTAMENTO DA BUSCA E FILTROS

## Regras
- a busca não deve quebrar a listagem quando vazia;
- ao buscar, exibir resultados em tempo real ou ao confirmar;
- ao não encontrar resultado, mostrar estado de “nenhum atleta localizado” com CTA para limpar filtros;
- manter performance boa;
- não quebrar integrações existentes.

## Estado “sem resultado”
Título:
`Nenhum atleta encontrado`

Texto:
`Tente buscar por outro nome, e-mail ou remova os filtros aplicados.`

Ações:
- `Limpar filtros`
- `Adicionar novo atleta`

---

# 3) PERFIL COMPLETO DO ALUNO (VISÃO DO COACH)

## Objetivo
Ao clicar em um aluno, o coach deve abrir uma tela ou rota dedicada com visão 360º do aluno.

Pode ser:
- rota dedicada, ex.: `/admin/atletas/[id]`
- ou um layout de detalhe muito bem resolvido.

**Preferência: rota dedicada.**

## Estrutura desejada da página do aluno

### Topo do perfil
Exibir:
- avatar / foto do aluno
- nome completo
- status
- plano atual
- data de entrada
- última atividade
- ações rápidas:
  - `Nova ficha`
  - `Enviar plano`
  - `Registrar cobrança`
  - `Ver fotos`

### Cards rápidos do aluno
Logo abaixo do topo, exibir cards com informações rápidas:
- Treino ativo
- Adesão da semana
- Última medida registrada
- Próximo vencimento
- Volume recente / total
- Risco de churn (se houver lógica simples)

Esses cards podem usar mock inteligente quando não houver dado.

---

## Abas do perfil do aluno
Criar navegação por abas, com layout consistente.

### Abas mínimas recomendadas
1. `Visão Geral`
2. `Treinos`
3. `Nutrição`
4. `Evolução`
5. `Financeiro`
6. `Fotos`
7. `Observações`

Se o sistema ainda não tiver todos os dados totalmente prontos, montar a estrutura visual e conectar o que já existir.

---

## 3.1 Aba: Visão Geral
Exibir um resumo geral do aluno:
- status atual
- rotina principal
- objetivo
- última atividade
- adesão semanal
- próximos passos sugeridos

Adicionar um bloco “Ações prioritárias do aluno”, por exemplo:
- atualizar ficha
- revisar carga
- pedir novas fotos
- renovar plano

---

## 3.2 Aba: Treinos
Exibir:
- fichas ativas;
- fichas anteriores;
- data de criação;
- frequência estimada;
- última execução;
- acesso rápido para editar ficha.

Se possível:
- mostrar uma mini métrica de volume ou sessões concluídas.

Se não houver ficha:
- estado vazio com CTA `Criar ficha digital`
- CTA secundária `Enviar PDF`

---

## 3.3 Aba: Nutrição
Exibir:
- plano nutricional ativo;
- data de envio;
- tipo do plano (`PDF` ou `Digital`, se existir);
- observações rápidas;
- histórico de envios.

Se não houver plano:
- estado vazio com CTA `Enviar plano alimentar`

---

## 3.4 Aba: Evolução
Exibir um panorama da evolução do aluno com dados já existentes no sistema.

Prioridade:
- peso
- medidas
- frequência de registro
- progresso recente
- últimos treinos

Se já houver componentes de medidas ou histórico, reutilizar.

Ideal:
- cards resumo no topo;
- tabela/lista das últimas medidas;
- bloco de histórico recente;
- espaço para gráfico futuro, se já existir.

---

## 3.5 Aba: Financeiro
Exibir:
- plano contratado
- valor atual
- status do pagamento
- próxima renovação
- histórico de cobranças ou pagamentos (se existir)
- aviso de vencimento próximo

Se ainda não existir histórico detalhado:
- manter layout com campos básicos e estado preparado.

---

## 3.6 Aba: Fotos
Exibir:
- fotos frente / lado / costas
- data de envio
- última sessão de fotos
- botão para ampliar / comparar

Se não houver fotos:
- estado vazio explicando a utilidade
- CTA: `Solicitar envio de fotos` (visual, se não houver ação real)

---

## 3.7 Aba: Observações
Exibir:
- notas do coach
- observações internas
- talvez feedbacks recebidos do aluno

Se não houver estrutura salva ainda:
- criar bloco preparado com área de texto ou lista vazia.

---

# 4) COMPONENTES A CRIAR OU REFATORAR

Criar componentes reutilizáveis, se necessário:

- `StudentSummaryCard`
- `StudentStatusBadge`
- `StudentTable`
- `StudentRow`
- `StudentProfileHeader`
- `StudentQuickStats`
- `StudentTabs`
- `StudentEmptyState`
- `RenewalBadge`
- `MetricMiniCard`

Todos devem respeitar o design system AURON já criado.

---

# 5) REGRAS IMPORTANTES

## Manter
- stack atual;
- rotas e lógica existentes quando possível;
- integrações com Supabase;
- identidade visual AURON já aplicada.

## Evitar
- criar visual “decorativo demais”;
- usar muito gradiente;
- deixar cards estreitos e vazios;
- exagerar em bordas ou sombras;
- quebrar SSR/CSR do Next.

## Não fazer nesta fase
- reescrever banco;
- mudar schema sem necessidade;
- reestruturar autenticação;
- refatorar todo o módulo financeiro profundo.

---

# 6) CRITÉRIOS DE ACEITAÇÃO

A fase estará bem executada quando:

1. A tela `Base de Atletas` parecer uma área de gestão real, e não apenas uma busca com card vazio.
2. O coach conseguir localizar e abrir um aluno com clareza.
3. O perfil do aluno estiver organizado em seções/abas úteis.
4. O layout desktop estiver mais bem aproveitado, sem excesso de vazio.
5. Os estados vazios tiverem mais valor e CTA.
6. A experiência estiver claramente mais premium, profissional e SaaS.

---

# 7) ENTREGA ESPERADA

Implementar a fase completa com código funcional e consistente.

Ao final:
- revisar imports quebrados;
- validar responsividade desktop;
- revisar componentes reutilizados;
- manter sem erros de lint críticos;
- preservar identidade AURON.

Se necessário, criar arquivos novos e reorganizar componentes relacionados a atletas e perfil do aluno.

