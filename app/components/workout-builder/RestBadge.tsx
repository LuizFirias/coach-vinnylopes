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
}

export function RestBadge({ descanso, onChange }: RestBadgeProps) {
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
        className="inline-flex items-center gap-1 bg-brand-subtle border border-brand-border rounded-md px-2 py-1 min-h-[28px]"
        title="Descanso entre séries"
      >
        <Clock size={11} className="text-brand shrink-0" />
        <span className="text-[11px] font-medium text-brand">{formatRestTime(seconds)}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-surface-1 border border-border-subtle rounded-lg shadow-elev-2 p-2 min-w-[140px]">
          <p className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary px-1 mb-1.5">
            Descanso
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
