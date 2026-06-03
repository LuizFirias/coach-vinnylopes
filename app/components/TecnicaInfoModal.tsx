"use client";

import { X, Info } from "@phosphor-icons/react";

export const TECNICAS_EXTRA_OPCOES = [
  "",
  "Cluster Set",
  "Drop Set",
  "Bi-Set",
  "Super Set",
  "Repetições Parciais",
  "Isometria",
] as const;

const TECNICA_DESCRICOES: Record<string, { titulo: string; descricao: string; exemplo?: string; objetivo?: string }> = {
  "WS": {
    titulo: "Warm-up Set",
    descricao: "Warm-up Set — Série de aquecimento com carga reduzida para preparar o músculo e as articulações antes das séries principais.",
    exemplo: "Ex: 40% da carga de trabalho × 10-15 reps leves antes das séries principais",
    objetivo: "Aumentar temperatura muscular e reduzir risco de lesão",
  },
  "FS": {
    titulo: "Feeder Set",
    descricao: "Feeder Set — Série de alimentação progressiva para aquecer gradualmente, subindo a carga até o peso de trabalho.",
    exemplo: "50% → 70% → 90% da carga máxima, com reps decrescentes",
    objetivo: "Preparar neurologia e músculo para a carga total de trabalho",
  },
  "Cluster Set": {
    titulo: "Cluster Set",
    descricao: "Execute 8 repetições normais, descanse 10 segundos e faça 3 mini-séries de 4 repetições com 10s de descanso entre elas.",
    exemplo: "8 reps → 10s → 4 reps → 10s → 4 reps → 10s → 4 reps",
    objetivo: "Aumentar volume total sem perder a técnica de execução",
  },
  "Drop Set": {
    titulo: "Drop Set",
    descricao: "Ao atingir a falha muscular, reduza a carga imediatamente e continue no MESMO exercício, sem descanso entre as reduções.",
    exemplo: "20kg × 10 reps (falha) → 15kg × 8 reps (falha) → 10kg × 6 reps",
    objetivo: "Maximizar fadiga muscular e recrutamento de fibras",
  },
  "Bi-Set": {
    titulo: "Bi-Set",
    descricao: "Dois exercícios para o mesmo grupo muscular realizados em sequência, sem descanso entre eles.",
    exemplo: "Supino reto → Crossover | Rosca direta → Rosca concentrada",
    objetivo: "Aumentar volume e intensidade para o mesmo grupo",
  },
  "Super Set": {
    titulo: "Super Set",
    descricao: "Dois exercícios realizados em sequência para músculos antagonistas (opostos), sem descanso entre eles.",
    exemplo: "Rosca direta (bíceps) + Tríceps polia | Supino (peito) + Remada (costas)",
    objetivo: "Economizar tempo e aumentar fluxo sanguíneo",
  },
  "Repetições Parciais": {
    titulo: "Repetições Parciais",
    descricao: "Após atingir a falha no movimento completo, continue executando repetições com amplitude parcial do movimento, sem parar.",
    objetivo: "Aumentar o tempo sob tensão e a intensidade além da falha",
  },
  "Isometria": {
    titulo: "Isometria",
    descricao: "Mantenha o músculo contraído e estático em uma posição por um tempo determinado, sem mover a articulação.",
    exemplo: "Segurar a elevação lateral no topo por 10 segundos antes de descer",
    objetivo: "Aumentar resistência muscular e conexão mente-músculo",
  },
};

interface TecnicaInfoModalProps {
  tecnica: string | null;
  onClose: () => void;
}

export default function TecnicaInfoModal({ tecnica, onClose }: TecnicaInfoModalProps) {
  if (!tecnica) return null;
  const info = TECNICA_DESCRICOES[tecnica];
  if (!info) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface-1 border border-brand/30 shadow-elev-2 rounded-2xl p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-brand" />
            </div>
            <h3 className="text-base font-bold text-text-primary">{info.titulo}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed">{info.descricao}</p>

        {info.exemplo && (
          <div className="px-3 py-2.5 bg-surface-2 border border-border-subtle rounded-xl">
            <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-1">Exemplo</p>
            <p className="text-xs text-text-primary font-mono leading-relaxed">{info.exemplo}</p>
          </div>
        )}

        {info.objetivo && (
          <div className="flex items-start gap-2">
            <span className="text-2xs font-semibold uppercase tracking-caps text-brand mt-0.5 flex-shrink-0">Para:</span>
            <p className="text-xs text-text-secondary">{info.objetivo}</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full h-10 bg-brand text-text-on-brand rounded-xl text-xs font-semibold shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
