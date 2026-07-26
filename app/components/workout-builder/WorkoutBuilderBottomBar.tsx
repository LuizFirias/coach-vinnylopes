"use client";

import { CircleNotch, FloppyDisk, FileArrowDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

interface WorkoutBuilderBottomBarProps {
  saving: boolean;
  exporting?: boolean;
  canSave: boolean;
  isDirty: boolean;
  onSave: () => void;
  onExportPdf?: () => void;
}

const sideBtnCls =
  "w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-lg border border-card text-text-secondary hover:text-brand hover:border-brand/30 transition-colors disabled:opacity-40";

export function WorkoutBuilderBottomBar({
  saving,
  exporting = false,
  canSave,
  isDirty,
  onSave,
  onExportPdf,
}: WorkoutBuilderBottomBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 lg:pl-28",
        "border-t border-divider bg-surface-0/95 backdrop-blur-md",
        "px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      )}
    >
      <div className="flex items-center max-w-4xl mx-auto gap-2">
        <div className="w-11 h-11 shrink-0" aria-hidden />

        <div className="flex-1 flex justify-center min-w-0 px-1">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !canSave || !isDirty}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-5 w-full max-w-[220px] bg-brand text-text-on-brand rounded-lg text-xs font-semibold disabled:opacity-40"
          >
            {saving ? (
              <CircleNotch size={16} className="animate-spin shrink-0" />
            ) : (
              <FloppyDisk size={16} className="shrink-0" />
            )}
            <span className="truncate">{saving ? "Salvando..." : "Salvar ficha"}</span>
          </button>
        </div>

        {onExportPdf ? (
          <button
            type="button"
            onClick={onExportPdf}
            disabled={exporting || !canSave}
            className={sideBtnCls}
            aria-label="Exportar PDF"
          >
            {exporting ? (
              <CircleNotch size={18} className="animate-spin" />
            ) : (
              <FileArrowDown size={18} />
            )}
          </button>
        ) : (
          <div className="w-11 h-11 shrink-0" aria-hidden />
        )}
      </div>
    </div>
  );
}
