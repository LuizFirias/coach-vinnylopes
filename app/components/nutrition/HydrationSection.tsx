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

const CARD_STYLE = {
  background: "var(--mobile-card-bg)",
  border: "1px solid var(--mobile-card-border)",
  boxShadow: "var(--mobile-card-shadow)",
} as const;

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
    <section className="overflow-hidden rounded-[16px] p-4" style={CARD_STYLE}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Drop size={12} weight="fill" className="shrink-0 text-brand" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
            Hidratação
          </p>
        </div>
        <p className="shrink-0 text-xs tabular-nums lining-nums text-text-tertiary">
          {mlCurrent}ml / {mlTarget}ml
        </p>
      </div>

      <div className={cn("grid w-full grid-cols-8", isDesktop ? "gap-2.5" : "gap-0.5")}>
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
              className="flex min-h-[44px] w-full items-center justify-center rounded-lg transition-opacity disabled:opacity-50"
            >
              <Drop
                size={dropSize}
                weight={filled ? "fill" : "regular"}
                className={cn(filled ? "text-brand" : undefined)}
                style={
                  !filled
                    ? { color: "var(--filter-placeholder, #b0b0b8)" }
                    : undefined
                }
              />
            </button>
          );
        })}
      </div>

      {cupsCurrent >= cupsTarget && (
        <p className="mt-3 text-center text-xs font-semibold text-brand">
          Meta atingida! Excelente hidratação hoje.
        </p>
      )}
    </section>
  );
}
