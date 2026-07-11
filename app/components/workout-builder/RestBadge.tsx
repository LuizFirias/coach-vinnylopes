"use client";

import { useState, useRef, useEffect } from "react";
import { Clock } from "@phosphor-icons/react";
import { REST_PRESETS_SECONDS } from "@/lib/constants/workout";
import {
  descansoToSeconds,
  formatRestTime,
  secondsToDescanso,
} from "@/lib/utils/restTime";
import { cn } from "@/lib/utils/cn";

interface RestBadgeProps {
  descanso: string;
  onChange: (descanso: string) => void;
  compact?: boolean;
  label?: string;
}

export function RestBadge({ descanso, onChange, compact = false, label = "Descanso" }: RestBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const seconds = descansoToSeconds(descanso);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 bg-brand-subtle border border-brand-border rounded-md min-h-[32px]",
          compact ? "px-1.5 py-1" : "px-2 py-1"
        )}
        title={label}
      >
        <Clock size={11} className="text-brand shrink-0" />
        <span className={cn("font-medium text-brand", compact ? "text-[10px]" : "text-[11px]")}>
          {compact ? formatRestTime(seconds) : `${label}: ${formatRestTime(seconds)}`}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-surface-1 border border-border-subtle rounded-lg shadow-elev-2 p-2 min-w-[140px]">
          <p className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary px-1 mb-1.5">
            {label}
          </p>
          <div className="flex flex-wrap gap-1">
            {REST_PRESETS_SECONDS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onChange(secondsToDescanso(preset));
                  setOpen(false);
                }}
                className={cn(
                  "px-2 py-1 rounded text-[10px] font-medium transition-colors",
                  seconds === preset
                    ? "bg-brand text-text-on-brand"
                    : "bg-surface-2 text-text-secondary hover:bg-surface-3"
                )}
              >
                {formatRestTime(preset)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
