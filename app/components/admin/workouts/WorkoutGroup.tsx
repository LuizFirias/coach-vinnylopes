"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { getPublicStorageUrl } from "@/lib/storageUrls";
import type { WorkoutGroup, WorkoutPlan } from "./types";
import {
  StudentCreateFichaButton,
  StudentWorkoutsEyeButton,
  StudentWorkoutsModal,
  WORKOUT_ACTION_GAP,
} from "./StudentWorkoutsModal";

interface WorkoutGroupBlockProps {
  group: WorkoutGroup;
  onView: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}

const slot = "w-16 shrink-0 flex items-center justify-center";

export function WorkoutGroupBlock({ group, onView, onEdit, onDelete }: WorkoutGroupBlockProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const initial = group.studentName.charAt(0).toUpperCase();
  const avatarSrc = group.avatarUrl
    ? getPublicStorageUrl("avatars", group.avatarUrl)
    : null;
  const fichaLabel =
    group.plans.length === 1 ? "1 ficha" : `${group.plans.length} fichas`;

  return (
    <>
      <tr className="hover:bg-surface-2/40 transition-colors">
        <td className="p-3">
          <div className="flex items-center gap-2.5 min-w-0">
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
            <span className="text-xs font-semibold text-text-primary truncate">
              {group.studentName}
            </span>
          </div>
        </td>
        <td className="py-3 pl-3" style={{ paddingRight: WORKOUT_ACTION_GAP }}>
          <div
            className="flex items-center justify-end"
            style={{ gap: WORKOUT_ACTION_GAP }}
          >
            <span className={cn(slot, "text-[11px] text-text-tertiary whitespace-nowrap")}>
              {fichaLabel}
            </span>
            <span className={slot}>
              <StudentWorkoutsEyeButton onClick={() => setModalOpen(true)} />
            </span>
            <span className={slot}>
              <StudentCreateFichaButton studentId={group.studentId} />
            </span>
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
