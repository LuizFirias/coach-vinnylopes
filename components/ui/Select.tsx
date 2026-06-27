"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Selecionar...",
  disabled = false,
  label,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <span className="text-2xs uppercase tracking-caps text-text-tertiary ml-1">
          {label}
        </span>
      )}
      <div ref={containerRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={cn(
            "w-full h-14 px-5 flex items-center justify-between gap-3",
            "bg-surface-2 border border-border-default rounded-xl text-sm transition-all",
            "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
            open
              ? "border-brand/40 text-text-primary"
              : "border-border-default text-text-primary hover:border-border-default"
          )}
        >
          <span className={cn(!selected && "text-text-disabled")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "shrink-0 text-text-disabled transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-surface-2 border border-border-default rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="max-h-60 overflow-y-auto bg-surface-2">
              {options.length === 0 ? (
                <div className="px-5 py-3 text-sm text-text-disabled">
                  Nenhuma opção disponível
                </div>
              ) : (
                options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full px-5 py-3 text-left text-sm transition-colors",
                      opt.value === value
                        ? "bg-brand-subtle text-brand font-medium"
                        : "text-text-primary bg-surface-2 hover:bg-surface-3"
                    )}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
