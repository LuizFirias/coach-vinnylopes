"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { COACH_SPECIALTIES } from "@/lib/coach/publicProfile";
import {
  selectListboxClassName,
  selectOptionClassName,
  selectTriggerClassName,
} from "@/components/ui/Select";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

export function SpecialtyTagSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  const summary =
    value.length === 0
      ? "Selecionar especialidades"
      : value.length <= 2
        ? value.join(", ")
        : `${value.slice(0, 2).join(", ")} +${value.length - 2}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(selectTriggerClassName({ open }), "perfil-field-surface")}
      >
        <span
          className={cn(
            "flex-1 min-w-0 truncate text-[13px] font-medium",
            value.length === 0 && "text-text-disabled font-normal text-[12px]",
          )}
        >
          {summary}
        </span>
        {value.length > 0 && (
          <span className="shrink-0 rounded-md bg-brand-subtle px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-brand">
            {value.length}
          </span>
        )}
        <CaretDown
          size={14}
          className={cn(
            "shrink-0 text-text-tertiary transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable
          className={cn(selectListboxClassName, "perfil-field-surface")}
        >
          {COACH_SPECIALTIES.map((tag) => {
            const active = value.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => toggle(tag)}
                className={selectOptionClassName(active)}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded",
                    active ? "bg-brand text-text-on-brand" : "bg-surface-1",
                  )}
                >
                  {active && <Check size={10} weight="bold" />}
                </span>
                {tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
