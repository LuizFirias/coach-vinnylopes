# IMPLEMENTAÇÃO: Bi-Set na Ficha de Treino (Coach + Aluno)

## CONTEXTO DO PROJETO

App de coaching fitness (Next.js + Supabase). Existem dois fluxos relevantes:

1. **Coach monta a ficha** em `NovaFichaCoachPage` (arquivo `nova-ficha/page.tsx`) — adiciona exercícios da biblioteca, define séries/reps/descanso por exercício.
2. **Aluno executa a ficha** em `page.tsx` (rota `aluno/treinos/ficha/executar`) — abre um **modal único** que mostra 1 exercício + 1 série por vez, controlado pelos states `modalExIdx` (índice do exercício) e `modalSerieIdx` (índice da série).

Hoje, `configuracao.exercicios[]` é um **array linear simples** — cada exercício é independente, sem nenhuma relação estrutural com os outros. Existe um campo de texto livre `tecnica_extra` com a opção `"Bi-Set"`, mas é só um rótulo cosmético dentro da série — não vincula exercício A ao exercício B de forma alguma.

**Objetivo:** permitir que o coach agrupe 2 exercícios como bi-set (ex: rosca direta + tríceps corda), e que o aluno, ao executar, alterne automaticamente entre os dois exercícios série a série, sem descanso entre eles — descanso só acontece depois do PAR completo.

---

## 1. MODELO DE DADOS — Mudança estrutural

### 1.1 Schema atual (`configuracao.exercicios[]`)
```ts
interface ExercicioFicha {
  id: string;
  nome: string;
  tipo_exercicio: string;
  descanso: string;
  video_url: string;
  observacoes: string;
  series: SerieDefinicao[];
}
```

### 1.2 Nova abordagem proposta — agrupamento por `grupo_biset_id`

**NÃO criar uma estrutura aninhada nova** (array de arrays). Em vez disso, adicionar um campo opcional em cada `ExercicioFicha` que vincula os dois exercícios do par. Isso preserva compatibilidade retroativa total — fichas antigas sem bi-set continuam funcionando sem nenhuma migração.

```ts
interface ExercicioFicha {
  id: string;
  nome: string;
  tipo_exercicio: string;
  descanso: string;          // descanso passa a significar "descanso DEPOIS do par completo" quando faz parte de bi-set
  video_url: string;
  observacoes: string;
  series: SerieDefinicao[];

  // NOVOS CAMPOS:
  grupo_biset_id?: string;   // UUID gerado no momento do agrupamento. Os 2 exercícios do par compartilham o mesmo valor. undefined = exercício normal.
  biset_ordem?: 1 | 2;       // Posição dentro do par: 1 = primeiro a executar, 2 = segundo. Necessário pois o array principal mantém ordem linear de exibição na ficha.
}
```

**Regras de validação obrigatórias:**
- Um `grupo_biset_id` só pode existir em exatamente 2 exercícios na ficha inteira.
- Os 2 exercícios de um par DEVEM ter o mesmo número de séries (`series.length` igual) — força simetria no momento de criar o par. Se o coach tentar agrupar 2 exercícios com números de série diferentes, truncar o maior para igualar ao menor, com confirmação visual antes de aplicar.
- `descanso` do exercício com `biset_ordem === 1` é ignorado na execução (zero descanso entre A e B). Apenas o `descanso` do exercício com `biset_ordem === 2` é usado — representa o descanso após completar o par.

---

## 2. LADO DO COACH — `nova-ficha/page.tsx`

### 2.1 Fluxo de agrupamento (conforme decisão do usuário)

1. Cada card de exercício na lista da ficha ganha um **checkbox de seleção** no canto superior esquerdo (oculto por padrão, aparece em "modo seleção").
2. Adicionar um botão/ícone na toolbar da ficha: **"Agrupar exercícios"** (ícone sugerido: `Link` ou `ArrowsLeftRight` do phosphor-icons, já usado no projeto).
3. Ao tocar nesse botão, entra em "modo seleção": cada card de exercício mostra um checkbox. O coach marca exatamente 2 exercícios.
4. Aparece uma barra fixa no rodapé (ou bottom sheet) com botão **"Agrupar como Bi-Set"**, habilitado somente quando exatamente 2 estão marcados.
5. Ao confirmar:
   - Gera um `grupo_biset_id` (uuid v4) e atribui aos 2 exercícios selecionados.
   - Define `biset_ordem: 1` para o que está mais acima na lista (ordem de exibição atual), `biset_ordem: 2` para o outro.
   - Se `series.length` diferir entre os dois, mostrar confirmação: *"Os exercícios têm números de série diferentes (4 e 3). Para o bi-set funcionar, vamos igualar para 3 séries em ambos. Continuar?"* — ao confirmar, truncar o exercício com mais séries.
   - Sai do modo seleção automaticamente.

### 2.2 Visual do par agrupado na lista de montagem

- Os 2 cards do par devem aparecer **visualmente conectados**, não soltos como hoje:
  - Envolver os 2 cards em um wrapper com borda externa sutil compartilhada (ex: `border border-brand/20 rounded-2xl p-1`), os cards internos perdem a borda própria.
  - Pequeno conector visual entre os dois cards: ícone de "elo" (`Link` icon) centralizado na linha divisória entre eles, com label `BI-SET` em caption uppercase ao lado.
  - O campo de "descanso" só aparece no card do segundo exercício (`biset_ordem: 2`), com label alterada para **"Descanso após o par"**. O card do primeiro exercício mostra, no lugar do campo de descanso, um texto fixo: *"Sem descanso → direto para [nome do exercício 2]"*.

### 2.3 Desagrupar

- Cada par agrupado ganha um botão pequeno **"Desagrupar"** (ícone `X` ou `LinkBreak`) no conector central.
- Ao tocar: remove `grupo_biset_id` e `biset_ordem` de ambos os exercícios, volta ao estado normal (2 cards soltos).

### 2.4 Restrições de UX a implementar

- Um exercício que já está em um bi-set não pode ser selecionado para entrar em outro grupo — desabilitar o checkbox dele durante "modo seleção" se ele já tiver `grupo_biset_id`.
- Reordenar exercícios (se houver drag-and-drop) deve mover o par inteiro como bloco único, nunca separar os dois.
- Remover um exercício de um par (botão de lixeira existente) deve desfazer o agrupamento do exercício remanescente automaticamente (limpar `grupo_biset_id`/`biset_ordem` dele).

---

## 3. LADO DO ALUNO — Execução (`page.tsx` da rota `executar`)

### 3.1 Mudança na máquina de estados do modal

A lógica atual em `concluirSerieModal()` (linhas ~741-785) navega assim:
```
última série do exercício? 
  → sim: descansa, abre PRÓXIMO ÍNDICE (modalExIdx + 1)
  → não: descansa, avança modalSerieIdx
```

**Nova lógica necessária — detectar se o exercício atual pertence a um bi-set:**

```ts
function concluirSerieModal() {
  if (modalExIdx === null) return;
  const ex = exercicios[modalExIdx];
  const serie = ex.series[modalSerieIdx];

  // ... (mantém a parte de salvar peso_atual/completado, igual hoje)

  const isUltimaSerie = modalSerieIdx >= ex.series.length - 1;
  const pertenceABiset = !!ex.grupo_biset_id;
  const parceiro = pertenceABiset
    ? exercicios.find(e => e.grupo_biset_id === ex.grupo_biset_id && e.id !== ex.id)
    : null;

  if (pertenceABiset && parceiro) {
    const ehPrimeiroDoPar = ex.biset_ordem === 1;

    if (ehPrimeiroDoPar) {
      // Concluiu a série do exercício 1 do par → vai DIRETO pro exercício 2,
      // MESMA série (mesmo índice), SEM rest timer.
      const parceiroIdx = exercicios.findIndex(e => e.id === parceiro.id);
      setModalExIdx(parceiroIdx);
      setModalSerieIdx(modalSerieIdx); // mesma posição de série
      const cargaParceiro = parceiro.series[modalSerieIdx]?.peso_atual || 0;
      setModalCarga(cargaParceiro);
      setModalCargaStr(cargaParceiro > 0 ? String(cargaParceiro) : '');
      // SEM iniciarRest() aqui — transição imediata
      return;
    } else {
      // Concluiu a série do exercício 2 do par → PAR completo nesta rodada.
      const primeiroIdx = exercicios.findIndex(e => e.id === parceiro.id);

      if (isUltimaSerie) {
        // Última rodada do par concluída → segue fluxo normal (próximo exercício da ficha ou fim)
        const isUltimoExercicio = modalExIdx >= exercicios.length - 1;
        if (isUltimoExercicio) {
          setModalExIdx(null);
          return;
        }
        const proxExIdx = modalExIdx + 1;
        iniciarRest(ex.descanso, () => abrirModalExercicio(proxExIdx));
      } else {
        // Ainda há mais rodadas do par → descansa (descanso do par) e volta pro exercício 1, próxima série
        const proxSerieIdx = modalSerieIdx + 1;
        iniciarRest(ex.descanso, () => {
          setModalExIdx(primeiroIdx);
          setModalSerieIdx(proxSerieIdx);
          const nextCarga = exercicios[primeiroIdx].series[proxSerieIdx]?.peso_atual || 0;
          setModalCarga(nextCarga);
          setModalCargaStr(nextCarga > 0 ? String(nextCarga) : '');
        });
      }
      return;
    }
  }

  // ... fluxo normal existente para exercícios sem bi-set (mantém código atual aqui)
}
```

**Pontos críticos de implementação:**
- A transição exercício 1 → exercício 2 dentro do mesmo bi-set **nunca** chama `iniciarRest()` — é instantânea.
- O `abrirModalExercicio(exIdx)` atual sempre busca `ex.series.findIndex(s => !s.completado)` para decidir a série inicial — isso continua funcionando normalmente quando o modal abre o par pela primeira vez (vai abrir no exercício com `biset_ordem: 1`, série 0).
- Ao concluir o PAR inteiro (não só uma rodada), o avanço para o próximo exercício da ficha deve pular os 2 exercícios do par já visitados, nunca abrir o segundo exercício do par isoladamente depois.

### 3.2 UI da tela de execução — como comunicar "isso é um bi-set"

Sem poluir: usar elementos que já existem na ficha (badge de técnica, header) em vez de criar componentes novos.

1. **Header do modal:** ao lado do nome do exercício, adicionar um badge pequeno: `BI-SET 1/2` ou `BI-SET 2/2` (ex: pill com fundo `bg-brand-subtle text-brand`, texto 10px uppercase) — indica ao aluno que ele está dentro de um par e em qual posição.

2. **Indicador de progresso da série:** o contador atual mostra `SÉRIE 1/4`. Quando for bi-set, manter esse contador relativo ao PAR (rodada), não ao exercício individual — ou seja, se o par tem 3 séries cada, mostra `RODADA 1/3` em vez de `SÉRIE 1/3`, comunicando que aquele número se refere ao ciclo completo do bi-set.

3. **Transição visual exercício 1 → exercício 2:** como não há rest timer aqui, usar uma transição rápida de UI (200-300ms) — fade/slide do conteúdo do modal — para sinalizar a troca de exercício sem que pareça um bug ou tela travada. Mostrar brevemente (1s) um toast pequeno no topo do modal: *"Agora: [nome do exercício 2]"* antes de revelar os controles de carga.

4. **Card "ÚLTIMA VEZ":** ao trocar para o exercício 2 do par, esse card já deve mostrar o histórico daquele exercício específico (não herdar do exercício 1) — usar o campo `anterior` que já existe por exercício no estado atual.

5. **Botão de concluir série:** no exercício 1 do par, trocar o texto do CTA de "Concluir Série" para **"Concluir e ir para [nome curto do exercício 2]"** — comunica a ação sem exigir leitura adicional. No exercício 2, mantém "Concluir Série" normal (ou "Concluir Rodada" se preferir reforçar o conceito de par).

6. **Rest timer (sheet já existente):** quando aparecer após completar o PAR, o texto pode reforçar: *"Descanso — próxima rodada do bi-set"* em vez do texto genérico atual, só quando aplicável.

### 3.3 Tela de ficha (não-execução) — `executar/page.tsx` antes de iniciar o treino

Antes de abrir o modal de execução, a ficha provavelmente lista os exercícios em cards (visualização "preview" da ficha, semelhante ao que aparece nas imagens 3 do app). Aplicar o mesmo padrão visual do coach (seção 2.2): os 2 cards do bi-set devem aparecer conectados visualmente com o ícone de elo e label "BI-SET" entre eles, e a tabela de séries do segundo exercício não deve mostrar coluna de descanso individual — mostra "Sem descanso" entre os dois.

---

## 4. PERSISTÊNCIA / HISTÓRICO (`historico_treinos`)

A gravação em `finalizarConfirmado()` já trata cada exercício como registro independente (`exercicio_id` separado por linha). **Não é necessário mudar a estrutura de gravação** — apenas garantir que `grupo_biset_id` seja incluído no campo `dados_sessao` de cada registro, para que relatórios futuros (volume por bi-set, etc.) consigam reconstruir o agrupamento histórico:

```ts
dados_sessao: {
  nome_rotina: nomeRotina,
  nome_exercicio: ex.nome,
  grupo_biset_id: ex.grupo_biset_id ?? null,  // ADICIONAR
  biset_ordem: ex.biset_ordem ?? null,         // ADICIONAR
  series: ex.series.map(s => ({ ... })), // mantém igual
  data_sessao: agora,
}
```

---

## 5. RESUMO DE ARQUIVOS A MODIFICAR

| Arquivo | Mudança |
|---|---|
| `nova-ficha/page.tsx` (coach) | Adicionar `grupo_biset_id`/`biset_ordem` à interface `ExercicioFicha`; modo de seleção múltipla; botão "Agrupar como Bi-Set"; validação de simetria de séries; UI de cards conectados; botão desagrupar |
| `executar/page.tsx` (aluno) | Adicionar campos à `ExercicioState`; reescrever `concluirSerieModal()` com a lógica de bifurcação bi-set descrita na seção 3.1; badge `BI-SET 1/2`/`2/2` no header do modal; texto dinâmico do CTA; ajustar label de "SÉRIE X/Y" para "RODADA X/Y" quando aplicável; incluir campos no payload de `historico_treinos` |
| Tipos compartilhados (se houver `types.ts` central) | Propagar `grupo_biset_id?: string` e `biset_ordem?: 1 \| 2` nas interfaces `ExercicioFicha`/`ExercicioConfig`/`ExercicioState` |

---

## 6. CASOS DE BORDA A TRATAR

- Aluno abandona o treino no meio de um bi-set (fecha o app entre exercício 1 e 2 do par): o `localStorage` já salva o estado completo a cada `concluirSerieModal()` — ao restaurar, `abrirModalExercicio` deve respeitar que o exercício 1 da rodada já está `completado: true` e abrir diretamente no exercício 2 daquela rodada (a lógica de "primeira série não completada" já cobre isso naturalmente, não precisa de tratamento especial).
- Ficha com bi-set onde um dos dois exercícios foi removido da biblioteca depois de criada: tratar `parceiro` undefined como fallback — se não encontrar o par, seguir o fluxo normal (não-bi-set) sem travar a execução.
- Não permitir bi-set com o mesmo exercício duas vezes (ex: 2 variações de rosca) tecnicamente é possível e válido — não bloquear, é um caso de uso legítimo (bi-set do mesmo grupo muscular).
