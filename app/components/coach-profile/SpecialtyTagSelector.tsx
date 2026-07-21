"use client";

import { cn } from "@/lib/utils/cn";
import { COACH_SPECIALTIES } from "@/lib/coach/publicProfile";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  /** Mobile: abre lista em sheet; desktop: chips inline */
  compact?: boolean;
};

export function SpecialtyTagSelector({ value, onChange }: Props) {
  const toggle = (tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {COACH_SPECIALTIES.map((tag) => {
        const active = value.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={cn(
              "min-h-11 px-3 rounded text-[11px] font-medium tracking-wide transition-colors touch-manipulation",
              active
                ? "bg-brand/15 text-brand border border-brand/40"
                : "bg-surface-2 text-text-secondary border border-border-subtle hover:border-border-default",
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
