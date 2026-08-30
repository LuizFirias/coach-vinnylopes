"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import {
  selectListboxClassName,
  selectTriggerClassName,
  type SelectOption,
} from "@/components/ui/Select";

interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  error?: string;
  className?: string;
  id?: string;
  size?: "default" | "sm";
}

/**
 * Igual ao Select (mesmo visual/painel ancorado), mas permite marcar mais de
 * uma opção — usado onde `Select` (single) não serve, ex.: modalidades
 * esportivas do aluno. Não usar `<select multiple>` nativo (regra do design system).
 */
export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = "Selecionar…",
  disabled = false,
  label,
  helperText,
  error,
  className,
  id,
  size = "default",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const triggerId = id || autoId;
  const listId = `${triggerId}-listbox`;
  const compact = size === "sm";

  const selectedLabels = options
    .filter((o) => value.includes(o.value))
    .map((o) => o.label);
  const display = selectedLabels.length > 0 ? selectedLabels.join(" · ") : null;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
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

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div className={cn("flex flex-col", compact ? "gap-0" : "gap-1.5", open && "relative z-50", className)}>
      {label && (
        <label
          htmlFor={triggerId}
          className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary dark:text-[#4a5568]"
        >
          {label}
        </label>
      )}

      <div ref={containerRef} className={cn("relative", open && "z-50")}>
        <button
          id={triggerId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={!!error}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={cn("relative", selectTriggerClassName({ open, error: !!error, disabled, size }))}
        >
          <span
            className={cn(
              "flex-1 min-w-0 truncate",
              compact ? "text-[12px] font-medium" : "text-[16px] font-normal text-text-primary",
              !display && "text-text-disabled font-normal",
              !display && !compact && "text-[12px]",
            )}
          >
            {display ?? placeholder}
          </span>
          <CaretDown
            size={compact ? 12 : 14}
            className={cn("shrink-0 text-text-tertiary transition-transform", open && "rotate-180")}
          />
        </button>

        {open && (
          <div id={listId} role="listbox" aria-multiselectable="true" aria-labelledby={triggerId} className={cn(selectListboxClassName, compact && "min-w-44")}>
            {options.length === 0 ? (
              <div className="px-3 py-2.5 text-[12px] text-text-disabled">Nenhuma opção disponível</div>
            ) : (
              options.map((opt) => {
                const active = value.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => toggle(opt.value)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors touch-manipulation",
                      active ? "font-semibold text-brand bg-brand/10" : "font-medium text-text-primary hover:bg-surface-1",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded",
                        active ? "bg-brand text-text-on-brand" : "bg-surface-1 border border-border-subtle",
                      )}
                    >
                      {active && <Check size={10} weight="bold" />}
                    </span>
                    <span className="flex-1 min-w-0 truncate">{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-[12px] text-danger leading-tight" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && <p className="text-[12px] text-text-tertiary leading-tight">{helperText}</p>}
    </div>
  );
}
