"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { groupWorkoutsByStudent } from "@/lib/utils/workoutGrouping";
import type { WorkoutGroup, WorkoutPlan } from "./types";
import { WorkoutGroupBlock } from "./WorkoutGroup";
import { WORKOUT_ACTION_GAP } from "./StudentWorkoutsModal";

interface WorkoutsTableProps {
  plans: WorkoutPlan[];
  onView: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}

const slotHeader =
  "w-16 shrink-0 text-center text-[10px] font-bold tracking-wider text-text-tertiary uppercase";

export function WorkoutsTable({ plans, onView, onEdit, onDelete }: WorkoutsTableProps) {
  const groups = groupWorkoutsByStudent(plans);

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="coach-data-table-head border-b border-border-divider bg-surface-2">
            <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">
              Aluno
            </th>
            <th className="py-3 pl-3" style={{ paddingRight: WORKOUT_ACTION_GAP }}>
              <div
                className="flex items-center justify-end"
                style={{ gap: WORKOUT_ACTION_GAP }}
              >
                <span className={slotHeader}>Fichas</span>
                <span className={slotHeader}>Ações</span>
                <span className={slotHeader}>Nova</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group: WorkoutGroup) => (
            <WorkoutGroupBlock
              key={group.studentId}
              group={group}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WorkoutsEmptyState() {
  return (
    <div className="p-10 text-center">
      <WarningCircle size={28} className="text-text-disabled mx-auto mb-2" />
      <p className="text-xs text-text-secondary font-medium">Nenhum treino localizado</p>
      <p className="text-[10px] text-text-tertiary mt-0.5">Limpe os filtros ou crie um novo treino.</p>
    </div>
  );
}
