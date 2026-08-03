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
  alunoLocked?: boolean;
  onAlunoChange: (id: string) => void;
  onRotinaChange: (nome: string) => void;
  onClose: () => void;
}

export function WorkoutBuilderSettingsSheet({
  alunos,
  alunoSelecionado,
  nomeRotina,
  alunoLocked = false,
  onAlunoChange,
  onRotinaChange,
  onClose,
}: WorkoutBuilderSettingsSheetProps) {
  const alunoLabel =
    alunos.find((a) => a.id === alunoSelecionado)?.coaching_reference || "Sem aluno";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-1 border-0 rounded-t-2xl w-full max-w-lg p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Aluno e rotina</h3>
          <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-2">
            <X size={18} />
          </button>
        </div>

        <div className="field-flat-input rounded-2xl border-0 bg-surface-2/50 overflow-hidden mb-3">
          <div className="px-4 py-3.5 border-b border-border-divider">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-1">
              Aluno
            </label>
            {alunoLocked ? (
              <p className="text-sm text-text-primary truncate">{alunoLabel}</p>
            ) : (
              <select
                value={alunoSelecionado}
                onChange={(e) => onAlunoChange(e.target.value)}
                className="w-full bg-transparent border-0 outline-none shadow-none text-sm text-text-primary appearance-none cursor-pointer p-0"
              >
                <option value="">Selecione o aluno...</option>
                {alunos.map((a) => (
                  <option key={a.id} value={a.id}>{a.coaching_reference}</option>
                ))}
              </select>
            )}
          </div>
          <div className="px-4 py-3.5">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-1">
              Nome da rotina
            </label>
            <input
              type="text"
              value={nomeRotina}
              onChange={(e) => onRotinaChange(e.target.value)}
              placeholder="Ex: Lower A"
              className="w-full bg-transparent border-0 outline-none shadow-none text-sm text-text-primary placeholder:text-text-disabled p-0"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={cn("btn-primary w-full h-10 rounded-lg text-xs font-semibold")}
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
