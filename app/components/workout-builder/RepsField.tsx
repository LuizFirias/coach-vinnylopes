"use client";

import { Plus, X } from "@phosphor-icons/react";
import { isClusterSet, isMyoReps, formatClusterReps, formatMyoReps } from "@/lib/constants/workout-techniques";
import type { SerieDefinicao } from "./types";

interface RepsFieldProps {
  serie: SerieDefinicao;
  placeholder?: string;
  onChange: (field: string, value: unknown) => void;
}

/** Quantos blocos de cluster/mini-séries um personal costuma usar na prática — raramente passa disso. */
export const MAX_CLUSTER_BLOCOS = 6;
export const MAX_MYO_BLOCOS = 6;

const cellInputCls =
  "serie-metric-input w-full max-w-14 mx-auto h-8 bg-surface-2 border border-border-subtle rounded-md text-center text-sm font-medium text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:text-brand tabular-nums lining-nums shadow-none";

// Um pouco mais estreito que o campo de reps normal — com vários blocos lado
// a lado, cada um não precisa da largura toda do campo único. Exportado pra
// o campo de "descanso entre clusters" (ExerciseCard) usar o mesmo tamanho.
export const clusterInputCls =
  "serie-metric-input w-full max-w-11 h-8 bg-surface-2 border border-border-subtle rounded-md text-center text-sm font-medium text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:text-brand tabular-nums lining-nums shadow-none";

/**
 * Campo de reps da grade de série — simples (input único, mesma largura do
 * campo de kg) por padrão. Quando a série é Cluster Set, cada bloco vira o
 * MESMO campo de reps repetido lado a lado (não dois campos menores dentro
 * de um só) — cada bloco pode ter uma reps diferente (ex.: 6×4×2). O "+"
 * adiciona mais um bloco, até `MAX_CLUSTER_BLOCOS`.
 */
export function RepsField({ serie, placeholder, onChange }: RepsFieldProps) {
  if (!isClusterSet(serie)) {
    return (
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={String(serie.reps_sugerido ?? "")}
        onChange={(e) => onChange("reps_sugerido", e.target.value)}
        className={cellInputCls}
      />
    );
  }

  if (isMyoReps(serie)) {
    return <MyoRepsField serie={serie} onChange={onChange} />;
  }

  // Mínimo 2 blocos (é isso que faz ser um "cluster") — migra dado antigo
  // (cluster_qtd/cluster_reps) se ainda não tiver a lista nova.
  const blocos =
    serie.cluster_reps_list && serie.cluster_reps_list.length > 0
      ? serie.cluster_reps_list
      : Array.from({ length: Math.max(2, serie.cluster_qtd ?? 2) }, () => serie.cluster_reps ?? 0);

  const aplicar = (novosBlocos: number[]) => {
    onChange("cluster_reps_list", novosBlocos);
    onChange("cluster_qtd", novosBlocos.length);
    onChange("reps_sugerido", formatClusterReps(novosBlocos));
  };

  const atualizarBloco = (idx: number, valor: number) => {
    const novosBlocos = [...blocos];
    novosBlocos[idx] = valor;
    aplicar(novosBlocos);
  };

  const adicionarBloco = () => {
    if (blocos.length >= MAX_CLUSTER_BLOCOS) return;
    aplicar([...blocos, blocos[blocos.length - 1] ?? 0]);
  };

  // Mínimo 2 blocos (senão deixa de ser "cluster") — só dá pra excluir a
  // partir do 3º em diante.
  const removerBloco = (idx: number) => {
    if (blocos.length <= 2) return;
    aplicar(blocos.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex items-center justify-center gap-1">
      {blocos.map((valor, idx) => (
        <div key={idx} className="flex items-center gap-1">
          {idx > 0 && <span className="text-xs font-bold text-brand shrink-0">×</span>}
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={valor || ""}
              onChange={(e) => atualizarBloco(idx, parseInt(e.target.value, 10) || 0)}
              placeholder="4"
              className={clusterInputCls}
              aria-label={`Reps do bloco ${idx + 1} do cluster`}
            />
            {blocos.length > 2 && (
              <button
                type="button"
                onClick={() => removerBloco(idx)}
                title="Remover este bloco"
                aria-label={`Remover bloco ${idx + 1} do cluster`}
                className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface-3 text-text-tertiary transition-colors hover:bg-danger hover:text-white"
              >
                <X size={8} weight="bold" />
              </button>
            )}
          </div>
        </div>
      ))}
      {blocos.length < MAX_CLUSTER_BLOCOS && (
        <button
          type="button"
          onClick={adicionarBloco}
          title="Adicionar mais um bloco de cluster"
          aria-label="Adicionar bloco de cluster"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-dashed border-brand/40 text-brand transition-colors hover:border-brand hover:bg-brand/5"
        >
          <Plus size={12} weight="bold" />
        </button>
      )}
    </div>
  );
}

/**
 * Myo Reps: 1 campo de ativação (quase até a falha) + N mini-séries curtas
 * logo depois, com descanso mínimo entre elas. Mesmo padrão visual do
 * Cluster Set (blocos lado a lado, "+" adiciona, "x" remove), só que o 1º
 * campo (ativação) é a largura normal de reps — as mini-séries são o campo
 * estreito, com uma seta separando ativação das mini-séries.
 */
function MyoRepsField({
  serie,
  onChange,
}: {
  serie: SerieDefinicao;
  onChange: (field: string, value: unknown) => void;
}) {
  const ativacao = serie.myo_ativacao_reps ?? 0;
  const miniSeries =
    serie.myo_reps_list && serie.myo_reps_list.length > 0
      ? serie.myo_reps_list
      : [5, 5, 5, 5];

  const aplicar = (novaAtivacao: number, novasMinis: number[]) => {
    onChange("myo_ativacao_reps", novaAtivacao);
    onChange("myo_reps_list", novasMinis);
    onChange("reps_sugerido", formatMyoReps(novaAtivacao, novasMinis));
  };

  const atualizarAtivacao = (valor: number) => aplicar(valor, miniSeries);

  const atualizarMini = (idx: number, valor: number) => {
    const novasMinis = [...miniSeries];
    novasMinis[idx] = valor;
    aplicar(ativacao, novasMinis);
  };

  const adicionarMini = () => {
    if (miniSeries.length >= MAX_MYO_BLOCOS) return;
    aplicar(ativacao, [...miniSeries, miniSeries[miniSeries.length - 1] ?? 0]);
  };

  // Mínimo 1 mini-série — sem nenhuma deixa de ser "Myo Reps".
  const removerMini = (idx: number) => {
    if (miniSeries.length <= 1) return;
    aplicar(ativacao, miniSeries.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <input
        type="number"
        inputMode="numeric"
        value={ativacao || ""}
        onChange={(e) => atualizarAtivacao(parseInt(e.target.value, 10) || 0)}
        placeholder="15"
        className={cellInputCls}
        aria-label="Reps da série de ativação (Myo Reps)"
        title="Série de ativação — quase até a falha"
      />
      <span className="text-xs font-bold text-brand shrink-0">→</span>
      {miniSeries.map((valor, idx) => (
        <div key={idx} className="flex items-center gap-1">
          {idx > 0 && <span className="text-xs font-bold text-brand shrink-0">×</span>}
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={valor || ""}
              onChange={(e) => atualizarMini(idx, parseInt(e.target.value, 10) || 0)}
              placeholder="5"
              className={clusterInputCls}
              aria-label={`Reps da mini-série ${idx + 1} do Myo Reps`}
            />
            {miniSeries.length > 1 && (
              <button
                type="button"
                onClick={() => removerMini(idx)}
                title="Remover esta mini-série"
                aria-label={`Remover mini-série ${idx + 1} do Myo Reps`}
                className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface-3 text-text-tertiary transition-colors hover:bg-danger hover:text-white"
              >
                <X size={8} weight="bold" />
              </button>
            )}
          </div>
        </div>
      ))}
      {miniSeries.length < MAX_MYO_BLOCOS && (
        <button
          type="button"
          onClick={adicionarMini}
          title="Adicionar mais uma mini-série"
          aria-label="Adicionar mini-série de Myo Reps"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-dashed border-brand/40 text-brand transition-colors hover:border-brand hover:bg-brand/5"
        >
          <Plus size={12} weight="bold" />
        </button>
      )}
    </div>
  );
}
