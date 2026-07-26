"use client";

import { useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import type { WorkoutGroup } from "./types";
import { WorkoutRow } from "./WorkoutRow";
import { WorkoutRowCompact } from "./WorkoutRowCompact";
import type { WorkoutPlan } from "./types";

interface WorkoutGroupBlockProps {
  group: WorkoutGroup;
  onView: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}

export function WorkoutGroupBlock({ group, onView, onEdit, onDelete }: WorkoutGroupBlockProps) {
  const [expanded, setExpanded] = useState(true);
  const hasMultiple = group.plans.length > 1;

  if (!hasMultiple) {
    return (
      <WorkoutRow
        plan={group.plans[0]}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  const initial = group.studentName.charAt(0).toUpperCase();

  return (
    <>
      <tr className="bg-surface-0">
        <td colSpan={7} className="p-0 border-b border-divider">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface-2/30 transition-colors"
          >
            <div
              className={cn(
                "w-7 h-7 rounded-md bg-gradient-to-br flex items-center justify-center font-bold text-[10px] text-white shrink-0",
                group.avatarColor
              )}
            >
              {initial}
            </div>
            <span className="flex-1 text-xs font-semibold text-text-primary truncate">
              {group.studentName}
            </span>
            <span className="text-[11px] text-text-tertiary shrink-0">
              {group.plans.length} fichas
            </span>
            {expanded ? (
              <CaretUp size={14} className="text-text-tertiary shrink-0" />
            ) : (
              <CaretDown size={14} className="text-text-tertiary shrink-0" />
            )}
          </button>
        </td>
      </tr>
      {expanded &&
        group.plans.map((plan) => (
          <WorkoutRowCompact
            key={plan.id}
            plan={plan}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </>
  );
}
