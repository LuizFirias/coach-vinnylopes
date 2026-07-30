"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Eye, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { getPublicStorageUrl } from "@/lib/storageUrls";
import type { WorkoutGroup, WorkoutPlan } from "./types";
import { WorkoutCardMobile } from "./WorkoutCardMobile";

interface StudentWorkoutsModalProps {
  group: WorkoutGroup;
  onClose: () => void;
  onView: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}

export function StudentWorkoutsModal({
  group,
  onClose,
  onView,
  onEdit,
  onDelete,
}: StudentWorkoutsModalProps) {
  const initial = group.studentName.charAt(0).toUpperCase();
  const avatarSrc = group.avatarUrl
    ? getPublicStorageUrl("avatars", group.avatarUrl)
    : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Fichas de ${group.studentName}`}
    >
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md max-h-[min(80vh,640px)] flex flex-col rounded-2xl border border-white/10 bg-surface-1 shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden animate-sheet-up">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-divider shrink-0">
          <div
            className={cn(
              "w-8 h-8 rounded-md bg-gradient-to-br flex items-center justify-center font-bold text-[11px] text-white shrink-0 overflow-hidden",
              group.avatarColor,
            )}
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary truncate">{group.studentName}</p>
            <p className="text-[10px] text-text-tertiary">
              {group.plans.length} {group.plans.length === 1 ? "ficha" : "fichas"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-3 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-3 flex flex-col gap-2">
          {group.plans.map((plan) => (
            <WorkoutCardMobile
              key={plan.id}
              plan={plan}
              showStudent={false}
              onView={(p) => {
                onClose();
                onView(p);
              }}
              onEdit={(p) => {
                onClose();
                onEdit(p);
              }}
              onDelete={(p) => {
                onClose();
                onDelete(p);
              }}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Botão olho que abre o modal das fichas do aluno. */
export function StudentWorkoutsEyeButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "w-7 h-7 rounded-md bg-surface-2 border-0 text-text-secondary hover:text-brand flex items-center justify-center transition-colors shrink-0",
        className,
      )}
      title="Ver fichas"
      aria-label="Ver fichas do aluno"
    >
      <Eye size={14} />
    </button>
  );
}
