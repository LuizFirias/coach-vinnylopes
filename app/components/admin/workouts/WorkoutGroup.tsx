"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { getPublicStorageUrl } from "@/lib/storageUrls";
import type { WorkoutGroup } from "./types";
import { WorkoutRow } from "./WorkoutRow";
import type { WorkoutPlan } from "./types";
import {
  StudentWorkoutsEyeButton,
  StudentWorkoutsModal,
} from "./StudentWorkoutsModal";

interface WorkoutGroupBlockProps {
  group: WorkoutGroup;
  onView: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}

export function WorkoutGroupBlock({ group, onView, onEdit, onDelete }: WorkoutGroupBlockProps) {
  const [modalOpen, setModalOpen] = useState(false);
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
  const avatarSrc = group.avatarUrl
    ? getPublicStorageUrl("avatars", group.avatarUrl)
    : null;

  return (
    <>
      <tr className="bg-surface-0">
        <td colSpan={7} className="p-0 border-b border-divider">
          <div className="w-full flex items-center gap-2.5 px-3 py-2.5">
            <div
              className={cn(
                "w-7 h-7 rounded-md bg-gradient-to-br flex items-center justify-center font-bold text-[10px] text-white shrink-0 overflow-hidden",
                group.avatarColor,
              )}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt={group.studentName} className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <span className="flex-1 text-xs font-semibold text-text-primary truncate">
              {group.studentName}
            </span>
            <span className="text-[11px] text-text-tertiary shrink-0">
              {group.plans.length} fichas
            </span>
            <StudentWorkoutsEyeButton onClick={() => setModalOpen(true)} />
          </div>
        </td>
      </tr>
      {modalOpen && (
        <StudentWorkoutsModal
          group={group}
          onClose={() => setModalOpen(false)}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </>
  );
}
