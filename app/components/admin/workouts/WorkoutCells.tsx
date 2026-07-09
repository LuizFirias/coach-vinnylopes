"use client";

import { Eye, PencilSimple, Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import type { WorkoutPlan } from "./types";
import { formatLastExecution } from "./workoutFormat";

interface WorkoutActionsProps {
  plan: WorkoutPlan;
  onView: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}

export function WorkoutActions({ plan, onView, onEdit, onDelete }: WorkoutActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {plan.tipo === "digital" ? (
        <>
          <button
            type="button"
            onClick={() => onView(plan)}
            className="w-7 h-7 rounded-md bg-surface-2 border border-border-subtle text-text-secondary hover:text-brand flex items-center justify-center transition-colors cursor-pointer"
            title="Ver ficha"
          >
            <Eye size={13} />
          </button>
          <button
            type="button"
            onClick={() => onEdit(plan)}
            className="w-7 h-7 rounded-md bg-surface-2 border border-border-subtle text-text-secondary hover:text-brand flex items-center justify-center transition-colors cursor-pointer"
            title="Editar Ficha"
          >
            <PencilSimple size={13} />
          </button>
        </>
      ) : (
        <a
          href={plan.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-7 h-7 rounded-md bg-surface-2 border border-border-subtle text-text-secondary hover:text-brand flex items-center justify-center transition-colors cursor-pointer"
          title="Visualizar PDF"
        >
          <Eye size={13} />
        </a>
      )}
      <button
        type="button"
        onClick={() => onDelete(plan)}
        className="w-7 h-7 rounded-md bg-surface-2 border border-border-subtle text-text-secondary hover:text-danger flex items-center justify-center transition-colors cursor-pointer"
        title="Excluir Planejamento"
      >
        <Trash size={13} />
      </button>
    </div>
  );
}

export function WorkoutStatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase",
        ativo
          ? "bg-success-subtle text-success border border-success/15"
          : "bg-surface-3 text-text-disabled border border-border-subtle"
      )}
    >
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

export function WorkoutExercisesCell({ plan }: { plan: WorkoutPlan }) {
  return (
    <span className="text-text-secondary">
      {plan.tipo === "digital" ? `${plan.exercicios_count} exercícios` : "PDF"}
    </span>
  );
}

export function WorkoutLastExecutionCell({ plan }: { plan: WorkoutPlan }) {
  return (
    <span className="text-text-secondary">{formatLastExecution(plan.ultima_execucao)}</span>
  );
}

export function WorkoutCreatedAtCell({ plan }: { plan: WorkoutPlan }) {
  return (
    <span className="text-text-secondary">
      {new Date(plan.criado_em).toLocaleDateString("pt-BR")}
    </span>
  );
}
