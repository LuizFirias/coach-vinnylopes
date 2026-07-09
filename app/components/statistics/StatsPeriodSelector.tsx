"use client";

import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

export interface StatsPeriodOption {
  value: string;
  label: string;
}

interface StatsPeriodSelectorProps {
  value: string;
  options: StatsPeriodOption[];
  onChange: (value: string) => void;
  className?: string;
}

export function StatsPeriodSelector({
  value,
  options,
  onChange,
  className,
}: StatsPeriodSelectorProps) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none rounded-lg bg-[#1a2d4a] pl-2.5 pr-7 py-1.5",
          "text-xs font-medium text-brand cursor-pointer",
          "[@media(hover:hover)]:hover:bg-[#1e3a6a] transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        )}
        aria-label="Selecionar período"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface-1 text-text-primary">
            {opt.label}
          </option>
        ))}
      </select>
      <CaretDown
        size={12}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-brand"
        aria-hidden
      />
    </div>
  );
}
