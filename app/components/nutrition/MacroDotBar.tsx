"use client";

import { cn } from "@/lib/utils/cn";

interface MacroDotBarProps {
  current: number;
  target: number;
  isDesktop?: boolean;
  className?: string;
}

export function MacroDotBar({ current, target, isDesktop = false, className }: MacroDotBarProps) {
  const totalDots = isDesktop ? 32 : 28;
  const dotSize = isDesktop ? "w-1.5 h-1.5" : "w-[5px] h-[5px]";
  const ratio = target > 0 ? Math.min(current / target, 1) : 0;
  const filledDots = Math.round(ratio * totalDots);

  return (
    <div
      className={cn("flex flex-wrap", isDesktop ? "gap-[3px]" : "gap-0.5", className)}
      aria-hidden
    >
      {Array.from({ length: totalDots }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "rounded-[2px] shrink-0",
            dotSize,
            i < filledDots ? "bg-brand" : "bg-surface-2"
          )}
        />
      ))}
    </div>
  );
}
