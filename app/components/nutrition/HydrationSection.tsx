"use client";

import { Drop } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

interface HydrationSectionProps {
  mlCurrent: number;
  mlTarget: number;
  cupsCurrent: number;
  cupsTarget: number;
  saving?: boolean;
  isDesktop?: boolean;
  onToggleCup: (index: number) => void;
}

export function HydrationSection({
  mlCurrent,
  mlTarget,
  cupsCurrent,
  cupsTarget,
  saving = false,
  isDesktop = false,
  onToggleCup,
}: HydrationSectionProps) {
  const dropSize = isDesktop ? 28 : 18;

  return (
    <section className="bg-surface-1 border border-border-subtle rounded-xl p-4 overflow-hidden">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <Drop size={12} weight="fill" className="text-brand shrink-0" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
            Hidratação
          </p>
        </div>
        <p className="text-xs text-text-secondary tabular-nums shrink-0">
          {mlCurrent}ml / {mlTarget}ml
        </p>
      </div>

      <div className={cn("grid grid-cols-8 w-full", isDesktop ? "gap-2.5" : "gap-0.5")}>
        {Array.from({ length: cupsTarget }).map((_, index) => {
          const filled = index < cupsCurrent;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onToggleCup(index)}
              disabled={saving}
              id={`btn-copo-${index}`}
              aria-label={`${index + 1} copo${index === 0 ? "" : "s"}`}
              className="min-h-[44px] w-full flex items-center justify-center rounded-lg transition-opacity disabled:opacity-50"
            >
              <Drop
                size={dropSize}
                weight={filled ? "fill" : "regular"}
                className={cn(filled ? "text-brand" : "text-surface-2")}
                style={!filled ? { color: "var(--border-input, #282828)" } : undefined}
              />
            </button>
          );
        })}
      </div>

      {cupsCurrent >= cupsTarget && (
        <p className="mt-3 text-xs font-semibold text-brand text-center">
          Meta atingida! Excelente hidratação hoje.
        </p>
      )}
    </section>
  );
}
