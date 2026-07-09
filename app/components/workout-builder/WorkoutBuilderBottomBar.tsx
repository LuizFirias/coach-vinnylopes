"use client";

import { Plus, CircleNotch, FloppyDisk } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

interface WorkoutBuilderBottomBarProps {
  saving: boolean;
  canSave: boolean;
  isDirty: boolean;
  onSave: () => void;
  onAddExercise: () => void;
}

export function WorkoutBuilderBottomBar({
  saving,
  canSave,
  isDirty,
  onSave,
  onAddExercise,
}: WorkoutBuilderBottomBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 lg:pl-28",
        "flex gap-2.5 p-3 border-t border-border-subtle bg-surface-0",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      )}
    >
      <button
        type="button"
        onClick={onAddExercise}
        className="inline-flex items-center justify-center gap-1.5 px-4 h-11 border border-brand/40 rounded-lg text-brand text-xs font-medium min-w-[44px]"
      >
        <Plus size={16} weight="bold" />
        Exercício
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !canSave || !isDirty}
        className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 bg-brand text-text-on-brand rounded-lg text-xs font-semibold disabled:opacity-40"
      >
        {saving ? <CircleNotch size={16} className="animate-spin" /> : <FloppyDisk size={16} />}
        {saving ? "Salvando..." : "Salvar ficha"}
      </button>
    </div>
  );
}
