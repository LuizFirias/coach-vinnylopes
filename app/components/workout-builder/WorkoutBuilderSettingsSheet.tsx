"use client";

import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

interface AlunoOption {
  id: string;
  coaching_reference: string;
}

interface WorkoutBuilderSettingsSheetProps {
  alunos: AlunoOption[];
  alunoSelecionado: string;
  nomeRotina: string;
  onAlunoChange: (id: string) => void;
  onRotinaChange: (nome: string) => void;
  onClose: () => void;
}

const fieldCls =
  "w-full h-10 px-3 bg-surface-2 border border-input rounded-lg text-xs text-text-primary focus:outline-none focus:border-brand/40";

export function WorkoutBuilderSettingsSheet({
  alunos,
  alunoSelecionado,
  nomeRotina,
  onAlunoChange,
  onRotinaChange,
  onClose,
}: WorkoutBuilderSettingsSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-1 border-0 rounded-t-2xl w-full max-w-lg p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Aluno e rotina</h3>
          <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-2">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Aluno</label>
            <select
              value={alunoSelecionado}
              onChange={(e) => onAlunoChange(e.target.value)}
              className={fieldCls}
            >
              <option value="">Selecione o aluno...</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>{a.coaching_reference}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Rotina</label>
            <input
              type="text"
              value={nomeRotina}
              onChange={(e) => onRotinaChange(e.target.value)}
              placeholder="Ex: Lower A"
              className={fieldCls}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn("w-full h-10 bg-brand text-text-on-brand rounded-lg text-xs font-semibold mt-2")}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
