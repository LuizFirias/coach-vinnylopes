"use client";

import type { WorkoutPlan } from "./types";

interface DeleteWorkoutModalProps {
  plan: WorkoutPlan;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteWorkoutModal({ plan, loading, onConfirm, onCancel }: DeleteWorkoutModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
      <div className="bg-surface-1 border-0 rounded-2xl w-full max-w-md overflow-hidden shadow-elev-3 p-5">
        <h3 className="text-sm font-bold text-text-primary mb-2">Excluir ficha</h3>
        <p className="text-xs text-text-secondary leading-relaxed mb-5">
          Tem certeza que deseja excluir a ficha &quot;{plan.nome_rotina}&quot; de {plan.aluno_nome}?
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-surface-3 hover:bg-surface-4 text-text-primary rounded-lg text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
