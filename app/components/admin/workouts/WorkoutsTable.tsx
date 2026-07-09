"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { groupWorkoutsByStudent } from "@/lib/utils/workoutGrouping";
import type { WorkoutGroup, WorkoutPlan } from "./types";
import { WorkoutGroupBlock } from "./WorkoutGroup";

interface WorkoutsTableProps {
  plans: WorkoutPlan[];
  onView: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}

export function WorkoutsTable({ plans, onView, onEdit, onDelete }: WorkoutsTableProps) {
  const groups = groupWorkoutsByStudent(plans);

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border-subtle bg-surface-2/10">
            <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Aluno</th>
            <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Rotina</th>
            <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Exercícios</th>
            <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Status</th>
            <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Última execução</th>
            <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Criado em</th>
            <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle/50">
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
