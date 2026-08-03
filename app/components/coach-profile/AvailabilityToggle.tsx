"use client";

import { cn } from "@/lib/utils/cn";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  emphasized?: boolean;
  className?: string;
};

export function AvailabilityToggle({
  checked,
  onChange,
  label,
  description,
  emphasized,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl p-4",
        emphasized ? "bg-brand/5" : "bg-surface-2",
        className,
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        {description && (
          <p className="mt-1 text-xs text-text-secondary leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative shrink-0 w-11 h-7 rounded-full transition-colors touch-manipulation",
          checked ? "bg-brand" : "bg-surface-3 border-0",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
