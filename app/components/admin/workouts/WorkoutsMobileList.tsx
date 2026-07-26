"use client";

import { useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { groupWorkoutsByStudent } from "@/lib/utils/workoutGrouping";
import type { WorkoutGroup, WorkoutPlan } from "./types";
import { WorkoutCardMobile } from "./WorkoutCardMobile";

interface WorkoutsMobileListProps {
  plans: WorkoutPlan[];
  onView: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}

function MobileWorkoutGroup({
  group,
  onView,
  onEdit,
  onDelete,
}: {
  group: WorkoutGroup;
  onView: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasMultiple = group.plans.length > 1;
  const initial = group.studentName.charAt(0).toUpperCase();

  if (!hasMultiple) {
    return (
      <WorkoutCardMobile
        plan={group.plans[0]}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div className="border border-card rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-3 bg-surface-2/60 text-left"
      >
        <div
          className={cn(
            "w-7 h-7 rounded-md bg-gradient-to-br flex items-center justify-center font-bold text-[10px] text-white shrink-0",
            group.avatarColor
          )}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{group.studentName}</p>
          <p className="text-[10px] text-text-tertiary">{group.plans.length} fichas</p>
        </div>
        {expanded ? (
          <CaretUp size={14} className="text-text-tertiary shrink-0" />
        ) : (
          <CaretDown size={14} className="text-text-tertiary shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="p-2 flex flex-col gap-2 bg-surface-1">
          {group.plans.map((plan) => (
            <WorkoutCardMobile
              key={plan.id}
              plan={plan}
              showStudent={false}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkoutsMobileList({ plans, onView, onEdit, onDelete }: WorkoutsMobileListProps) {
  const groups = groupWorkoutsByStudent(plans);

  return (
    <div className="p-3 flex flex-col gap-2">
      {groups.map((group) => (
        <MobileWorkoutGroup
          key={group.studentId}
          group={group}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
