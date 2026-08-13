"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
  /** Texto auxiliar à direita (ex.: UF na lista de cidades) */
  hint?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  error?: string;
  className?: string;
  /** id do botão trigger */
  id?: string;
  /** Lista sem opções selecionáveis vazias — use value "" + placeholder */
  emptyLabel?: string;
  /** `underline` = só linha inferior, sem caixa preenchida */
  variant?: "default" | "underline";
  /** `sm` = altura compacta (listas / linhas densas) */
  size?: "default" | "sm";
}

/** Classes compartilhadas do painel de lista (Select, autocomplete, multi-select). */
export const selectListboxClassName =
  "absolute z-50 mt-1.5 w-full max-h-56 overflow-y-auto overscroll-contain rounded-xl bg-surface-2 py-1 shadow-[0_8px_28px_rgba(0,0,0,0.28)]";

export const selectOptionClassName = (active: boolean) =>
  cn(
    "w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors touch-manipulation",
    active
      ? "font-semibold text-brand bg-brand/10"
      : "font-medium text-text-primary hover:bg-surface-1",
  );

export const selectTriggerClassName = (opts?: {
  open?: boolean;
  error?: boolean;
  disabled?: boolean;
  variant?: "default" | "underline";
  size?: "default" | "sm";
}) =>
  cn(
    "w-full flex items-center text-left touch-manipulation transition-colors",
    "focus:outline-none",
    opts?.disabled && "opacity-50 cursor-not-allowed",
    opts?.size === "sm" ? "h-7 gap-1" : "h-11 gap-2",
    opts?.variant === "underline"
      ? cn(
          "px-0 rounded-none bg-transparent text-text-primary",
          "border-0 border-b border-[color-mix(in_srgb,var(--text-primary)_12%,transparent)]",
          opts?.open && "border-brand",
          opts?.error && "border-danger",
          !opts?.open && !opts?.error && "focus-visible:border-brand",
        )
      : cn(
          opts?.size === "sm" ? "px-2.5 rounded-lg" : "px-3.5 rounded-[10px]",
          "bg-surface-2 text-text-primary border-0",
          "focus-visible:ring-1 focus-visible:ring-brand/30",
          opts?.open && "ring-1 ring-brand/30",
          opts?.error && "ring-1 ring-danger/40",
        ),
  );

export function Select({
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
  emptyLabel,
  variant = "default",
  size = "default",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const triggerId = id || autoId;
  const listId = `${triggerId}-listbox`;
  const compact = size === "sm";

  const selected = options.find((o) => o.value === value);
  const display =
    selected?.label ??
    (value === "" && emptyLabel ? emptyLabel : null) ??
    null;

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

  return (
    <div className={cn("flex flex-col", compact ? "gap-0" : "gap-1.5", open && "relative z-50", className)}>
      {label && (
        <label
          htmlFor={triggerId}
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary"
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
          className={selectTriggerClassName({ open, error: !!error, disabled, variant, size })}
        >
          <span
            className={cn(
              "flex-1 min-w-0 truncate font-medium",
              compact ? "text-[12px]" : "text-[13px]",
              !display && "text-text-disabled font-normal",
              !display && !compact && "text-[12px]",
            )}
          >
            {display ?? placeholder}
          </span>
          <CaretDown
            size={compact ? 12 : 14}
            className={cn(
              "shrink-0 text-text-tertiary transition-transform",
              open && "rotate-180",
            )}
          />
        </button>

        {open && (
          <div
            id={listId}
            role="listbox"
            aria-labelledby={triggerId}
            className={cn(selectListboxClassName, compact && "min-w-44")}
          >
            {options.length === 0 ? (
              <div className="px-3 py-2.5 text-[12px] text-text-disabled">
                Nenhuma opção disponível
              </div>
            ) : (
              options.map((opt) => {
                const active = opt.value === value;
                return (
                  <button
                    key={opt.value === "" ? "__empty" : opt.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
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
                    <span className="flex-1 min-w-0 truncate">{opt.label}</span>
                    {opt.hint && (
                      <span className="shrink-0 text-[11px] text-text-tertiary">
                        {opt.hint}
                      </span>
                    )}
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
      {!error && helperText && (
        <p className="text-[12px] text-text-tertiary leading-tight">{helperText}</p>
      )}
    </div>
  );
}
