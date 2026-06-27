# ADENDO — REFATORAÇÃO AURON FASE 04
## Biblioteca de Exercícios: ajuste de interpretação

Este adendo corrige a leitura anterior sobre a Biblioteca de Exercícios.

A ausência de exercícios na nova interface **não deve ser tratada automaticamente como bug**, porque os exercícios existentes pertenciam ao banco antigo, vinculados ao coach anterior, com IDs próprios e links de execução em vídeo do YouTube.

Nesta fase, a Biblioteca deve ser preparada para funcionar como uma base oficial da AURON, com suporte a exercícios fixos do app e, futuramente, exercícios personalizados por coach.

---

## Nova regra para a Biblioteca

A Biblioteca de Exercícios deve aceitar dois tipos de exercício:

### 1. Exercícios oficiais da AURON
Exercícios padrão do aplicativo, disponíveis para todos os coaches.

Campos recomendados:
- nome
- grupo muscular
- músculos secundários
- equipamento
- tipo de métrica
- descrição curta
- link do vídeo/GIF
- origem: `auron`
- ativo: `true`

### 2. Exercícios personalizados do coach
Exercícios criados por um coach específico.

Campos recomendados:
- nome
- grupo muscular
- equipamento
- link do vídeo/GIF
- coach_id
- origem: `custom`
- ativo: `true`

---

## Comportamento esperado agora

Como ainda não existem exercícios oficiais da AURON cadastrados no banco atual, a tela pode aparecer vazia.

Mas o estado vazio precisa ser profissional e estratégico, não parecer erro.

### Empty state correto

Título:
`Sua biblioteca AURON ainda está vazia`

Texto:
`Cadastre exercícios oficiais ou adicione exercícios personalizados para começar a montar fichas digitais com vídeos de execução.`

Ações:
- `Cadastrar exercício`
- `Importar exercícios`
- `Adicionar vídeo do YouTube`

---

## Ajuste no Passo 04

Onde o documento da Fase 04 fala para “corrigir a biblioteca vazia”, interpretar agora como:

1. Não tratar a ausência de exercícios como bug se o banco atual realmente estiver vazio.
2. Verificar apenas se a query está funcionando corretamente.
3. Manter o estado vazio quando não houver exercícios cadastrados.
4. Preparar a arquitetura visual para exercícios oficiais da AURON.
5. Permitir que exercícios personalizados de coaches sejam adicionados depois.
6. Não tentar buscar exercícios no banco antigo sem instrução explícita.
7. Não migrar dados antigos automaticamente nesta fase.

---

## Recomendação técnica

Se ainda não existir uma coluna de origem no banco, considerar futuramente algo como:

```ts
type ExerciseOrigin = 'auron' | 'custom'
```

Ou campos equivalentes:

```txt
origin: auron | custom
coach_id: null para exercícios oficiais
coach_id: id do coach para exercícios personalizados
```

Essa mudança de banco não precisa ser feita agora se for atrasar a refatoração visual.

---

## Critério de aceitação atualizado

A Biblioteca estará correta nesta etapa se:

- não quebrar quando estiver vazia;
- exibir um empty state bonito, útil e alinhado à AURON;
- permitir cadastrar novo exercício;
- estiver preparada visualmente para exercícios oficiais e personalizados;
- não parecer que houve erro no carregamento.
