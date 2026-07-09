"use client";

import { X } from "@phosphor-icons/react";
import { TechniqueSelectWithTooltip } from "./TechniqueSelectWithTooltip";
import type { SerieDefinicao } from "./types";

interface SetDetailSheetProps {
  serie: SerieDefinicao;
  onChange: (patch: Partial<SerieDefinicao>) => void;
  onClose: () => void;
}

export function SetDetailSheet({ serie, onChange, onClose }: SetDetailSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-1 border border-border-subtle rounded-t-2xl w-full max-w-lg p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-elev-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Detalhes da série</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-2 text-text-secondary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              Técnica
            </label>
            <TechniqueSelectWithTooltip
              type="technique"
              value={serie.tecnica ?? ""}
              onChange={(v) => onChange({ tecnica: v })}
              className="w-full h-10 px-3 bg-surface-2 border border-border-subtle rounded-lg text-xs text-text-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              Extra
            </label>
            <TechniqueSelectWithTooltip
              type="extra"
              value={serie.tecnica_extra ?? ""}
              onChange={(v) => onChange({ tecnica_extra: v })}
              className="w-full h-10 px-3 bg-surface-2 border border-border-subtle rounded-lg text-xs text-text-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
