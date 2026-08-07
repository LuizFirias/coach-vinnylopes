"use client";

import { isClusterSet, formatClusterReps } from "@/lib/constants/workout-techniques";
import type { SerieDefinicao } from "./types";

interface RepsFieldProps {
  serie: SerieDefinicao;
  placeholder?: string;
  onChange: (field: string, value: unknown) => void;
}

const cellInputCls =
  "serie-metric-input w-full h-8 bg-transparent border-0 text-center text-sm font-medium text-text-primary placeholder:text-text-disabled focus:outline-none focus:text-brand tabular-nums lining-nums shadow-none";

/**
 * Campo de reps da grade de série — simples (input único) por padrão.
 * Quando a série é Cluster Set (T1 ou T2), vira composto: qtd × reps por cluster.
 * Sempre popula `reps_sugerido` com a notação formatada ("4×5") para retrocompat
 * de qualquer tela que só leia esse campo (histórico, ReceiptCard, execução).
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

  return (
    <div
      className="flex items-center justify-center gap-0.5 h-8 rounded-md border border-brand/30 bg-surface-2 px-1"
      title="Cluster Set — clusters × reps por cluster"
    >
      <input
        type="number"
        inputMode="numeric"
        value={serie.cluster_qtd ?? ""}
        onChange={(e) => {
          const qtd = parseInt(e.target.value, 10) || 0;
          onChange("cluster_qtd", qtd);
          onChange("reps_sugerido", formatClusterReps(qtd, serie.cluster_reps ?? 0));
        }}
        placeholder="4"
        className="serie-metric-input w-5 min-w-0 text-center"
        aria-label="Número de clusters"
      />
      <span className="text-xs font-bold text-brand shrink-0">×</span>
      <input
        type="number"
        inputMode="numeric"
        value={serie.cluster_reps ?? ""}
        onChange={(e) => {
          const reps = parseInt(e.target.value, 10) || 0;
          onChange("cluster_reps", reps);
          onChange("reps_sugerido", formatClusterReps(serie.cluster_qtd ?? 0, reps));
        }}
        placeholder="5"
        className="serie-metric-input w-5 min-w-0 text-center"
        aria-label="Reps por cluster"
      />
    </div>
  );
}
