"use client";

import { ChartBar } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

interface VolumeProgressDotsProps {
  sessionsCompleted: number;
  className?: string;
}

export function VolumeProgressDots({ sessionsCompleted, className }: VolumeProgressDotsProps) {
  const filledDots = Math.min(Math.max(sessionsCompleted, 0), 4);

  return (
    <div className={cn("bg-surface-1 rounded-xl px-4 py-3", className)}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <ChartBar size={11} className="text-text-secondary shrink-0" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
            Volume
          </span>
        </div>
        <span className="text-[11px] text-text-muted shrink-0 tabular-nums lining-nums">
          {sessionsCompleted === 1
            ? "1 sessão completada"
            : `${sessionsCompleted} sessões completadas`}
        </span>
      </div>

      <div className="flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: 4 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "w-2 h-2 rounded shrink-0",
              index < filledDots ? "bg-brand" : "bg-surface-2"
            )}
          />
        ))}
      </div>
    </div>
  );
}
