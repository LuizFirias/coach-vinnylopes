"use client";

import { cn } from "@/lib/utils/cn";

interface StatsInlineKpisProps {
  workouts: number;
  durationLabel: string;
  isDesktop?: boolean;
  className?: string;
}

export function StatsInlineKpis({
  workouts,
  durationLabel,
  isDesktop = false,
  className,
}: StatsInlineKpisProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 py-4",
        isDesktop ? "gap-10" : "gap-0",
        className
      )}
    >
      <div className="pr-4 border-r border-[#222222]">
        <p className="text-[9px] lg:text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-1">
          Treinos
        </p>
        <p
          className={cn(
            "font-bold text-text-primary tabular-nums",
            isDesktop ? "text-[28px]" : "text-2xl"
          )}
        >
          {workouts}
        </p>
      </div>
      <div className="pl-4">
        <p className="text-[9px] lg:text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-1">
          Duração total
        </p>
        <p
          className={cn(
            "font-bold tabular-nums",
            durationLabel === "—" ? "text-text-muted" : "text-text-primary",
            isDesktop ? "text-[28px]" : "text-2xl"
          )}
        >
          {durationLabel}
        </p>
      </div>
    </div>
  );
}
