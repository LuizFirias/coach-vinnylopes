"use client";

import { X, Info } from "@phosphor-icons/react";
import { getExtraByValue, getTechniqueByValue } from "@/lib/constants/workout-techniques";

interface TecnicaInfoModalProps {
  tecnica: string | null;
  onClose: () => void;
}

export default function TecnicaInfoModal({ tecnica, onClose }: TecnicaInfoModalProps) {
  if (!tecnica) return null;

  const extra = getExtraByValue(tecnica);
  const technique = getTechniqueByValue(tecnica);
  const item = extra.studentInstruction ? extra : technique.studentInstruction ? technique : null;

  if (!item?.studentInstruction) return null;

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
            <h3 className="text-base font-bold text-text-primary">{item.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed">{item.studentInstruction}</p>

        {item.example && (
          <div className="px-3 py-2.5 bg-surface-2 border border-border-subtle rounded-xl">
            <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-1">
              Exemplo
            </p>
            <p className="text-xs text-text-primary leading-relaxed">{item.example}</p>
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

/** Valores válidos para selects legados (ficha do aluno, etc.) */
export const TECNICAS_EXTRA_OPCOES = [
  "",
  "Cluster Set",
  "Drop Set",
  "Rest Pause",
  "Giant Set",
  "Myo Reps",
  "Bi-Set",
  "Super Set",
  "Repetições Parciais",
  "Isometria",
] as const;
