"use client";

import type { WorkoutPlan } from "./types";
import {
  WorkoutActions,
  WorkoutCreatedAtCell,
  WorkoutExercisesCell,
  WorkoutLastExecutionCell,
  WorkoutStatusBadge,
} from "./WorkoutCells";

interface WorkoutRowProps {
  plan: WorkoutPlan;
  onView: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}

export function WorkoutRow({ plan, onView, onEdit, onDelete }: WorkoutRowProps) {
  return (
    <tr className="border-b border-border-divider/40 last:border-b-0 hover:bg-surface-2/40 transition-colors">
      <td className="p-3 font-bold text-text-primary">{plan.aluno_nome}</td>
      <td className="p-3">
        <span className="font-semibold text-text-secondary">{plan.nome_rotina}</span>
      </td>
      <td className="p-3">
        <WorkoutExercisesCell plan={plan} />
      </td>
      <td className="p-3">
        <WorkoutStatusBadge ativo={plan.ativo} />
      </td>
      <td className="p-3">
        <WorkoutLastExecutionCell plan={plan} />
      </td>
      <td className="p-3">
        <WorkoutCreatedAtCell plan={plan} />
      </td>
      <td className="p-3 pr-10 text-right">
        <WorkoutActions plan={plan} onView={onView} onEdit={onEdit} onDelete={onDelete} />
      </td>
    </tr>
  );
}
