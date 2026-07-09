"use client";

import { Lightbulb, X } from "@phosphor-icons/react";
import { getExtraByValue, getTechniqueByValue } from "@/lib/constants/workout-techniques";
import { cn } from "@/lib/utils/cn";

interface TechniqueTooltipProps {
  type: "technique" | "extra";
  value: string | null;
  visible: boolean;
  onClose: () => void;
  className?: string;
}

export function TechniqueTooltip({
  type,
  value,
  visible,
  onClose,
  className,
}: TechniqueTooltipProps) {
  if (!visible || !value) return null;

  const item = type === "technique" ? getTechniqueByValue(value) : getExtraByValue(value);
  if (!item?.description) return null;

  return (
    <div className={cn("absolute top-full left-0 z-50 mt-1.5 w-[min(280px,calc(100vw-2rem))]", className)}>
      <div className="rounded-xl border border-border-subtle bg-surface-1 p-3 shadow-elev-2">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-[13px] font-semibold text-text-primary leading-snug flex-1">
            {item.name}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-0.5 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed mb-2">{item.description}</p>

        {item.coachTip && (
          <div className="flex gap-1.5 items-start rounded-md bg-brand-subtle border border-brand-border px-2 py-1.5 mb-2">
            <Lightbulb size={13} className="text-brand shrink-0 mt-0.5" aria-hidden />
            <p className="text-[11px] text-brand leading-relaxed flex-1">{item.coachTip}</p>
          </div>
        )}

        {item.example && (
          <p className="text-[11px] text-text-tertiary italic leading-snug">
            <span className="font-semibold not-italic text-text-secondary">Ex: </span>
            {item.example}
          </p>
        )}
      </div>
    </div>
  );
}
