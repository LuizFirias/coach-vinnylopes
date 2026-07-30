"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { getPublicStorageUrl } from "@/lib/storageUrls";
import { groupWorkoutsByStudent } from "@/lib/utils/workoutGrouping";
import type { WorkoutGroup, WorkoutPlan } from "./types";
import { WorkoutCardMobile } from "./WorkoutCardMobile";
import {
  StudentWorkoutsEyeButton,
  StudentWorkoutsModal,
} from "./StudentWorkoutsModal";

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
  const [modalOpen, setModalOpen] = useState(false);
  const hasMultiple = group.plans.length > 1;
  const initial = group.studentName.charAt(0).toUpperCase();
  const avatarSrc = group.avatarUrl
    ? getPublicStorageUrl("avatars", group.avatarUrl)
    : null;

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
    <>
      <div className="border-0 rounded-xl overflow-hidden">
        <div className="w-full flex items-center gap-2.5 px-3.5 py-3 bg-surface-2/60">
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
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{group.studentName}</p>
            <p className="text-[10px] text-text-tertiary">{group.plans.length} fichas</p>
          </div>
          <StudentWorkoutsEyeButton onClick={() => setModalOpen(true)} />
        </div>
      </div>
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
