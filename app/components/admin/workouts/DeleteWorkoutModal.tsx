"use client";

import { useEffect } from "react";
import type { WorkoutPlan } from "./types";
import { BodyPortal, useLockBodyScroll } from "@/app/components/ui/BodyPortal";

interface DeleteWorkoutModalProps {
  plan: WorkoutPlan;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteWorkoutModal({ plan, loading, onConfirm, onCancel }: DeleteWorkoutModalProps) {
  useLockBodyScroll(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || loading) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      onCancel();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [loading, onCancel]);

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Excluir ficha"
      >
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
    </BodyPortal>
  );
}
