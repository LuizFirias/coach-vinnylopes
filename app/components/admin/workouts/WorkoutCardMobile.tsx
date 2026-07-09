"use client";

import { cn } from "@/lib/utils/cn";
import type { WorkoutPlan } from "./types";
import { formatLastExecution } from "./workoutFormat";
import { WorkoutStatusBadge } from "./WorkoutCells";

interface WorkoutCardMobileProps {
  plan: WorkoutPlan;
  showStudent?: boolean;
  onView: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}

export function WorkoutCardMobile({
  plan,
  showStudent = true,
  onView,
  onEdit,
  onDelete,
}: WorkoutCardMobileProps) {
  return (
    <div className="bg-surface-2/40 border border-border-subtle rounded-xl p-3.5">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-primary truncate">{plan.nome_rotina}</p>
          {showStudent && (
            <p className="text-[11px] text-text-secondary truncate mt-0.5">{plan.aluno_nome}</p>
          )}
        </div>
        <WorkoutStatusBadge ativo={plan.ativo} />
      </div>
      <div className="h-px bg-border-subtle mb-2.5" />
      <div className="flex gap-4 mb-3">
        <div>
          <p className="text-[10px] text-text-muted mb-0.5">Exercícios</p>
          <p className="text-xs font-medium text-text-primary">
            {plan.tipo === "digital" ? plan.exercicios_count : "PDF"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted mb-0.5">Última execução</p>
          <p className="text-xs font-medium text-text-primary">
            {formatLastExecution(plan.ultima_execucao)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted mb-0.5">Criado em</p>
          <p className="text-xs font-medium text-text-primary">
            {new Date(plan.criado_em).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {plan.tipo === "digital" ? (
          <>
            <button type="button" onClick={() => onView(plan)} className="text-xs font-medium text-brand">
              Ver ficha
            </button>
            <button type="button" onClick={() => onEdit(plan)} className="text-xs font-medium text-brand">
              Editar
            </button>
          </>
        ) : (
          <a href={plan.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand">
            Ver PDF
          </a>
        )}
        <button type="button" onClick={() => onDelete(plan)} className="text-xs font-medium text-danger">
          Excluir
        </button>
      </div>
    </div>
  );
}
