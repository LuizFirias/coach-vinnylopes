"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { TimeRollerPicker } from "@/app/components/ui/TimeRollerPicker";

interface TimePickerFieldProps {
  value: string; // HH:mm
  onChange: (value: string) => void;
  minuteStep?: number;
  label?: string;
  labelClassName?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function buildTimeOptions(step: number): string[] {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += step) {
    out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  }
  return out;
}

/**
 * Horário — nunca `<input type="time"> nativo. No mobile usa o roller
 * (arrastar, feito pro toque); no desktop usa uma lista ancorada no campo,
 * já que "arrastar" não é um gesto natural com mouse.
 */
export function TimePickerField({
  value,
  onChange,
  minuteStep = 15,
  label,
  labelClassName,
  required,
  placeholder = "Selecionar",
  disabled,
  className,
}: TimePickerFieldProps) {
  const isMobile = useBreakpoint("mobile");
  const options = useMemo(() => buildTimeOptions(minuteStep), [minuteStep]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Abre já rolado até o horário selecionado (ou perto dele).
    const idx = options.findIndex((o) => o === value) ;
    const el = listRef.current?.children[idx >= 0 ? idx : 0] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "center" });
  }, [open, options, value]);

  if (isMobile) {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        {label && (
          <label className={cn("text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary dark:text-[#4a5568]", labelClassName)}>
            {label}
            {required && <span className="text-danger"> *</span>}
          </label>
        )}
        <div className="flex h-11 w-full items-center rounded-[10px] border border-[#e4e4e7] bg-white px-3.5 dark:border-[#2d3748] dark:bg-[#0d1117]">
          <TimeRollerPicker value={value} onChange={onChange} minuteStep={minuteStep} className="w-full justify-between" placeholder={placeholder} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className={cn("text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary dark:text-[#4a5568]", labelClassName)}>
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}

      <div ref={containerRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-11 w-full items-center gap-2 rounded-[10px] border border-[#e4e4e7] bg-white px-3.5 text-left transition-all",
            "dark:border-[#2d3748] dark:bg-[#0d1117]",
            "focus:outline-none focus-visible:border-brand focus-visible:shadow-[0_0_0_3px_rgba(147,51,234,0.15)]",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <Clock size={16} className="shrink-0 text-text-disabled" />
          <span className={cn("flex-1 truncate text-[16px]", value ? "font-normal text-text-primary" : "text-[12px] text-text-disabled")}>
            {value || placeholder}
          </span>
        </button>

        {open && (
          <div
            ref={listRef}
            role="listbox"
            aria-label={label || "Horário"}
            className="absolute left-0 top-[calc(100%+6px)] z-50 max-h-56 w-full overflow-y-auto overscroll-contain rounded-xl bg-surface-2 py-1 shadow-[0_8px_28px_rgba(0,0,0,0.28)]"
          >
            {options.map((o) => {
              const active = o === value;
              return (
                <button
                  key={o}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-[13px] tabular-nums transition-colors",
                    active ? "font-semibold text-brand bg-brand/10" : "font-medium text-text-primary hover:bg-surface-1",
                  )}
                >
                  {o}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
