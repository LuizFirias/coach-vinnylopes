"use client";

import { Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

interface StudentsEmptyStateProps {
  variant: "no-students" | "grow";
  onAddStudent: () => void;
  className?: string;
}

export function StudentsEmptyState({ variant, onAddStudent, className }: StudentsEmptyStateProps) {
  if (variant === "no-students") {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 px-6 text-center", className)}>
        <h3 className="text-base font-semibold text-text-primary mb-2">Nenhum aluno ainda</h3>
        <p className="text-xs text-text-secondary leading-relaxed mb-5 max-w-sm">
          Adicione seu primeiro aluno para começar a acompanhar o progresso e prescrever treinos.
        </p>
        <button
          type="button"
          onClick={onAddStudent}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand hover:bg-brand/90 text-text-on-brand text-xs font-semibold rounded-lg transition-all active:scale-95"
        >
          <Plus size={14} weight="bold" />
          Adicionar primeiro aluno
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 px-1",
        className,
      )}
    >
      <p className="text-xs text-text-tertiary leading-relaxed flex-1">
        Adicione mais alunos para ver análises comparativas de engajamento e performance.
      </p>
      <button
        type="button"
        onClick={onAddStudent}
        className="text-xs font-medium text-brand whitespace-nowrap shrink-0 hover:underline"
      >
        + Adicionar aluno →
      </button>
    </div>
  );
}
