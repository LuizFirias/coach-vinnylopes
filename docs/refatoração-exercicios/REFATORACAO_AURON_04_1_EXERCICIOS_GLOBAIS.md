# REFATORAÇÃO AURON — FASE 04.1
## Seed Global de Exercícios AURON

> Objetivo: cadastrar uma base inicial global de exercícios para que o coach consiga criar fichas digitais e o aluno consiga testar o fluxo real do app.

---

## Arquivos desta entrega

Esta fase usa o arquivo:

```txt
AURON_EXERCICIOS_GLOBAIS_SEED.json
```

Também existe uma versão em CSV e uma versão TypeScript para facilitar adaptação:

```txt
AURON_EXERCICIOS_GLOBAIS_SEED.csv
auronGlobalExercises.seed.ts
```

---

## Resumo da base

Total de exercícios preparados: **397**

### Por categoria de equipamento

- `sem_peso`: 132
- `halteres`: 127
- `maquina_cabo`: 138

### Por membro alvo

- Abdômen: 24
- Antebraço: 17
- Bíceps: 23
- Cardio: 31
- Dorsais: 27
- Glúteos: 26
- Lombar: 19
- Oblíquos: 21
- Ombro Anterior: 19
- Ombro Lateral: 16
- Ombro Posterior: 17
- Panturrilha: 17
- Peito Inferior: 14
- Peito Médio: 21
- Peito Superior: 17
- Posterior (Isquiotibiais): 20
- Quadríceps: 30
- Trapézio: 17
- Tríceps: 21

---

## Categorias de membro alvo usadas

A base respeita os grupos que já existem no app:

- Peito Superior
- Peito Médio
- Peito Inferior
- Dorsais
- Trapézio
- Lombar
- Ombro Anterior
- Ombro Lateral
- Ombro Posterior
- Bíceps
- Tríceps
- Antebraço
- Quadríceps
- Posterior (Isquiotibiais)
- Panturrilha
- Glúteos
- Abdômen
- Oblíquos
- Cardio

---

## Categorias de equipamento

A base inicial foi separada em:

```txt
sem_peso
halteres
maquina_cabo
```

Interpretação:

### `sem_peso`
Exercícios com peso corporal, calistenia, core e cardio livre.

### `halteres`
Exercícios com halteres/dumbbells.

### `maquina_cabo`
Exercícios em máquinas, cabos, polias, Smith, cardio machines e equipamentos guiados.

---

## Estrutura dos objetos

Cada exercício contém:

```ts
{
  slug: string
  nome: string
  membro_alvo: string
  membro_alvo_slug: string
  membros_secundarios: string[]
  categoria_equipamento: 'sem_peso' | 'halteres' | 'maquina_cabo'
  equipamento: string
  tipo_metrica: string
  nivel: string
  origem: 'auron_global'
  video_url: string | null
  ativo: boolean
  observacoes: string
}
```

---

## Regras de implementação

### 1. Não criar duplicatas

Antes de inserir, verificar se já existe exercício global com o mesmo `slug`.

Se existir, não duplicar.

### 2. Exercícios globais

Todos os exercícios deste seed devem ser cadastrados como exercícios oficiais da AURON.

Recomendações de campos no banco:

```txt
origem = auron_global
coach_id = null
ativo = true
```

Se a tabela atual não tiver `origem`, `coach_id` ou `ativo`, adaptar para o schema existente sem quebrar o app.

### 3. Links de vídeo

Nesta primeira carga, manter:

```txt
video_url = null
```

Os links de execução do YouTube serão adicionados depois com calma.

O app deve permitir que o exercício exista mesmo sem vídeo.

### 4. Não migrar o banco antigo

Não tentar buscar exercícios antigos do coach anterior.

A base antiga era vinculada a IDs próprios e vídeos específicos. Esta fase cria uma base global nova da AURON.

### 5. Biblioteca deve exibir globais + personalizados

A Biblioteca deve listar:

```txt
exercícios globais AURON
+
exercícios personalizados do coach logado
```

Ou seja:

```sql
origem = 'auron_global'
OR coach_id = coach logado
```

Adaptar essa lógica ao client/query atual do Supabase.

### 6. Filtros

Os filtros de grupo muscular devem usar o campo:

```txt
membro_alvo_slug
```

Se o app usa outro nome, mapear corretamente.

### 7. Busca

A busca deve procurar no mínimo em:

```txt
nome
membro_alvo
equipamento
```

---

## Fluxo esperado após implementação

1. Rodar seed global.
2. Entrar como coach.
3. Abrir Biblioteca.
4. Visualizar exercícios globais da AURON.
5. Criar ficha digital.
6. Selecionar exercícios da biblioteca.
7. Publicar ficha para aluno teste.
8. Aluno abrir treino e executar.

---

## Sugestão técnica de script

Criar um script em:

```txt
scripts/seed-auron-exercises.ts
```

O script deve:

1. importar `AURON_EXERCICIOS_GLOBAIS_SEED.json`;
2. conectar usando Supabase service role/admin;
3. verificar duplicidade por `slug`;
4. inserir apenas o que ainda não existe;
5. exibir no terminal quantos foram inseridos e quantos foram ignorados.

---

## Critérios de aceitação

A fase estará correta quando:

- a Biblioteca exibir exercícios globais;
- filtros por membro alvo funcionarem;
- busca funcionar;
- não houver duplicação ao rodar seed mais de uma vez;
- coach conseguir usar exercícios globais dentro de uma ficha;
- exercícios sem vídeo não quebrarem a ficha;
- aluno conseguir ver os exercícios na ficha publicada.

---

## Observação importante

Esta base é uma primeira carga ampla para teste e evolução do produto.

Depois, a AURON pode refinar:

- nomes;
- descrições técnicas;
- vídeos oficiais;
- gifs;
- músculos secundários;
- níveis;
- equipamentos;
- variações avançadas;
- tags para iniciantes/intermediários/avançados.
