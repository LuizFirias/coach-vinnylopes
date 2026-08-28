"use client";

import type { WorkoutPlan } from "./types";
import {
  WorkoutActions,
  WorkoutCreatedAtCell,
  WorkoutExercisesCell,
  WorkoutLastExecutionCell,
  WorkoutStatusBadge,
} from "./WorkoutCells";

interface WorkoutRowCompactProps {
  plan: WorkoutPlan;
  onView: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}

/** Linha filha sem coluna Aluno — usada quando o aluno tem múltiplas fichas agrupadas. */
export function WorkoutRowCompact({ plan, onView, onEdit, onDelete }: WorkoutRowCompactProps) {
  return (
    <tr className="hover:bg-surface-2/40 transition-colors bg-surface-2/10">
      <td className="p-3" />
      <td className="p-3 pl-2">
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
      <td className="p-3 text-right">
        <WorkoutActions plan={plan} onView={onView} onEdit={onEdit} onDelete={onDelete} />
      </td>
    </tr>
  );
}
