"use client";

import type { WorkoutPlan } from "./types";
import { WorkoutRoutineCard } from "./WorkoutRoutineCard";

interface WorkoutCardMobileProps {
  plan: WorkoutPlan;
  showStudent?: boolean;
  onView: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}

/** Card mobile — mesmo padrão Hevy do modal de treinos do aluno. */
export function WorkoutCardMobile({
  plan,
  showStudent = true,
  onView,
  onEdit,
  onDelete,
}: WorkoutCardMobileProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {showStudent && (
        <p className="px-1 text-[11px] font-medium text-text-tertiary truncate">
          {plan.aluno_nome}
        </p>
      )}
      <WorkoutRoutineCard
        plan={plan}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
