# REFATORAÇÃO AURON — FASE 05
## Área do Aluno: Home, Treinos, Execução, Evolução e Nutrição

> Objetivo desta fase: transformar a experiência do aluno em uma jornada clara, bonita e funcional. O aluno precisa abrir o app e entender rapidamente: o que tenho para fazer hoje, qual treino executar, como registrar carga, como ver minha evolução e como acompanhar o plano alimentar.

---

## 1. Contexto da fase

As fases anteriores focaram na identidade AURON, painel do coach, base de alunos, biblioteca e sistema de treinos.

Agora a prioridade é o lado do aluno, porque o fluxo principal do produto só fica completo quando:

1. Coach cadastra aluno.
2. Coach cria ficha digital.
3. Aluno recebe a ficha.
4. Aluno executa treino.
5. Sistema salva carga, reps, volume e histórico.
6. Coach acompanha evolução.

Esta fase deve manter:
- identidade visual AURON;
- dark premium;
- azul como cor primária;
- interface mobile-first;
- foco absoluto em clareza e usabilidade.

---

## 2. Diretriz principal da área do aluno

A área do aluno deve ser guiada por esta frase:

> AURON conecta o que foi prescrito, o que foi executado e o que evoluiu.

Toda tela do aluno precisa responder pelo menos uma destas perguntas:

- O que eu tenho que fazer hoje?
- Qual treino devo executar?
- Como registro minha carga?
- Como vejo minha evolução?
- O que meu coach enviou para mim?

---

## 3. Escopo da Fase 05

Refatorar as principais telas do aluno:

1. Home / Início do aluno
2. Meus Treinos
3. Detalhe da ficha digital
4. Execução do treino
5. Timer de descanso
6. Histórico de séries/carga
7. Evolução / Medidas
8. Fotos de progresso
9. Nutrição do aluno
10. Perfil do aluno

---

# 4. HOME DO ALUNO

## Objetivo
A Home deve virar a tela “Hoje”. Não deve ser só dashboard decorativo.

## Estrutura recomendada

### Header
Exibir:
- saudação: `Olá, [Nome]`
- data atual
- avatar/atalho de perfil
- status da semana ou sequência, se existir

### Card principal: Hoje
Deve ser o bloco mais importante da tela.

Cenários possíveis:

#### Se houver treino programado
Título:
`Treino de hoje`

Mostrar:
- nome da ficha/rotina
- quantidade de exercícios
- duração estimada, se existir
- último volume, se existir
- botão primário: `Iniciar treino`
- botão secundário: `Ver ficha`

#### Se for descanso
Título:
`Dia de recuperação`

Mostrar:
- mensagem curta sobre descanso
- botão: `Ver próximos treinos`
- opcional: `Registrar medida` ou `Ver evolução`

#### Se não houver treino ativo
Título:
`Nenhum treino ativo`

Texto:
`Seu coach ainda não liberou uma ficha para você.`

Botão:
`Atualizar`

---

## Bloco: Jornada semanal

Manter a ideia atual, mas melhorar:
- cada dia deve ter status claro: feito, pendente, descanso, hoje;
- não usar ícones confusos;
- adicionar legenda simples se necessário.

Estados:
- concluído
- hoje
- pendente
- descanso
- falhou

---

## Bloco: Evolução rápida

Mostrar no máximo 2 ou 3 métricas:
- volume semanal
- treinos concluídos na semana
- última carga evoluída
- última medida registrada

Evitar cards grandes demais com pouco conteúdo.

---

## Bloco: Pendências

Mostrar ações úteis:
- enviar foto de progresso;
- registrar medida;
- ver plano alimentar;
- responder feedback/check-in;
- finalizar treino pendente.

---

# 5. MEUS TREINOS

## Objetivo
A tela de treinos deve ser uma agenda de execução, não apenas lista de fichas.

## Estrutura

### Header
- título: `Meus Treinos`
- subtítulo: `Fichas liberadas pelo seu coach`

### Destaque
Se houver treino recomendado para hoje, mostrar um card grande:
- nome da ficha
- exercícios
- status
- botão `Iniciar agora`

### Lista de fichas
Cada ficha deve mostrar:
- nome da rotina
- status: ativa, inativa, PDF
- quantidade de exercícios
- data de criação/liberação
- frequência semanal, se houver
- progresso recente, se houver
- botão `Abrir ficha`

### Filtros
Manter simples:
- Todos
- Ativos
- PDF
- Concluídos / Histórico, se existir

---

# 6. DETALHE DA FICHA DIGITAL

## Objetivo
A ficha digital é um dos principais diferenciais da AURON. Ela deve parecer melhor que PDF.

## Estrutura

### Topo
- nome da rotina
- quantidade de exercícios
- status
- botão principal: `Iniciar treino`
- botão secundário: `Exportar PDF`, se existir
- observação do coach, se houver

### Resumo da ficha
Mostrar:
- exercícios
- séries totais
- grupos musculares
- descanso médio
- última execução, se houver

### Lista de exercícios
Cada exercício deve mostrar:
- nome
- grupo muscular
- séries x reps
- descanso
- técnica extra, se houver
- vídeo/GIF
- última carga usada, se houver
- botão `Executar`

## Bi-set / Super-set
Não comprimir visualmente.

Usar bloco próprio:
- título: `Bi-set`
- exercício 1
- exercício 2
- descanso após o par
- botão `Executar bi-set`

---

# 7. EXECUÇÃO DO TREINO

## Objetivo
A tela de execução precisa ser simples, grande, rápida e sem distração.

O aluno está na academia. Ele não pode pensar demais.

## Estrutura recomendada

### Header
- botão fechar/sair
- exercício atual
- posição: `1º exercício de 5`
- botão vídeo

### Progresso de séries
Mostrar bolinhas ou steps:
- série atual
- séries concluídas
- séries restantes

### Cards principais
- Repetições alvo
- Carga registrada
- Técnica
- Descanso

### Ajuste de carga
Melhorar o controle atual:
- botão `-`
- valor central grande
- botão `+`
- chips rápidos: `-2.5`, `+2.5`, `+5`, se fizer sentido

### Histórico útil
Mostrar algo como:
`Última vez: 35kg x 12`
`Hoje: 40kg x 12`
`Evolução: +5kg`

Isso é mais valioso que uma tabela grande demais.

### Botão fixo
O botão principal deve ficar fixo no rodapé da tela:
`Concluir série 1/4`

Deve ser grande, confortável e sem risco de toque errado.

---

# 8. TIMER DE DESCANSO

## Objetivo
O timer deve ser claro e útil.

Mostrar:
- tempo restante grande
- exercício atual
- próxima série
- botão `Pular descanso`
- botão `+30s`, se quiser
- aviso sonoro/vibração, se já existir suporte

Não deixar o timer parecer um overlay pesado demais.

---

# 9. FINALIZAÇÃO DO TREINO

Criar uma tela ou modal de conclusão com:
- treino concluído
- duração
- volume total
- exercícios realizados
- melhor evolução, se houver
- botão `Ver resumo`
- botão `Compartilhar evolução`, se existir imagem exportável

Essa tela é importante para retenção e percepção de progresso.

---

# 10. EVOLUÇÃO / MEDIDAS

## Objetivo
A tela de evolução deve contar uma história, não apenas mostrar uma tabela.

## Estrutura

### Resumo
- peso atual
- variação no período
- última medida
- próxima sugestão de registro

### Abas
- Peso
- Volume
- Medidas
- Treinos
- Fotos

### Medidas
Mostrar tabela limpa:
- medida
- valor atual
- variação
- data

### Registro de nova medida
Melhorar formulário:
- campos opcionais
- unidades claras
- botão fixo `Salvar medidas`
- validação de números decimais

---

# 11. FOTOS DE PROGRESSO

## Objetivo
Deixar claro que fotos são privadas e úteis para comparação.

## Estrutura
- upload de frente
- upload de lado
- upload de costas
- orientação de luz/roupa/horário
- histórico de sessões
- privacidade clara

Empty state:
`Nenhuma foto enviada ainda`
`Envie fotos de frente, lado e costas para seu coach acompanhar sua evolução com mais precisão.`

---

# 12. NUTRIÇÃO DO ALUNO

## Objetivo
A tela não pode parecer placeholder.

## Cenários

### Sem plano
Título:
`Plano alimentar em preparação`

Texto:
`Seu coach ainda não liberou um plano alimentar para você.`

Mostrar orientações úteis:
- hidratação
- proteína
- horários
- alimentos naturais

### Com plano PDF
Mostrar:
- nome/descrição do plano
- data de envio
- botão `Abrir plano`
- botão `Baixar PDF`
- observações do coach

### Futuro plano digital
Deixar estrutura preparada para:
- refeições
- horários
- alimentos
- substituições
- macros

---

# 13. PERFIL DO ALUNO

## Objetivo
Perfil não deve ser só configuração. Deve mostrar jornada.

Mostrar:
- nome
- coach responsável
- objetivo
- plano ativo
- dados pessoais
- configurações
- notificações
- unidade de peso/medida
- privacidade

Mover configurações avançadas para seções inferiores.

---

# 14. Componentes a criar/refatorar

- `StudentHomeTodayCard`
- `WeeklyJourney`
- `StudentProgressMiniCard`
- `StudentPendingActions`
- `StudentWorkoutCard`
- `WorkoutDetailHeader`
- `ExercisePrescriptionCard`
- `WorkoutExecutionScreen`
- `SetProgressIndicator`
- `LoadStepper`
- `RestTimer`
- `WorkoutCompletionSummary`
- `BodyMetricsSummary`
- `MeasureForm`
- `ProgressPhotoUpload`
- `StudentNutritionCard`

---

# 15. Regras técnicas

## Manter
- integração atual com Supabase;
- lógica existente de treino;
- registros de carga/série;
- autenticação;
- design system AURON.

## Evitar
- quebrar execução de treino;
- alterar schema sem necessidade;
- criar tela bonita sem dado real;
- deixar botões pequenos na execução;
- usar componentes desktop no mobile do aluno.

---

# 16. Critérios de aceitação

A fase estará correta se:

1. O aluno consegue ver o treino do dia claramente.
2. O aluno consegue abrir ficha digital sem confusão.
3. O aluno consegue iniciar e concluir treino completo.
4. Carga, reps, séries e descanso funcionam.
5. O treino concluído aparece no histórico.
6. A tela de evolução está mais clara.
7. Nutrição não parece mais tela incompleta.
8. A experiência mobile parece app real, não protótipo.

---

# 17. Teste obrigatório após a fase

Usar aluno teste e validar:

- login do aluno;
- ficha aparece;
- treino inicia;
- série conclui;
- descanso funciona;
- treino finaliza;
- histórico salva;
- coach enxerga atividade no painel.
