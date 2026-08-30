"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { BodyPortal, useLockBodyScroll } from "@/app/components/ui/BodyPortal";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";

interface DatePickerFieldProps {
  /** yyyy-mm-dd (mesmo formato de <input type="date">) — "" = sem data. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  labelClassName?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** `bare` = sem fundo/borda, só o texto+ícone direto no fundo da tela (ex.: campo "Data" solto num card). */
  variant?: "default" | "bare";
}

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseISO(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || "").trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Grade de 6 semanas (42 dias), começando no domingo da semana do 1º dia do mês. */
function buildMonthGrid(viewDate: Date): Date[] {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** Corpo do calendário — reaproveitado tanto no popover ancorado (desktop) quanto no modal (mobile). */
function CalendarBody({
  viewDate,
  onViewDateChange,
  selected,
  onPick,
  onClear,
  onToday,
}: {
  viewDate: Date;
  onViewDateChange: (d: Date) => void;
  selected: Date | null;
  onPick: (d: Date) => void;
  onClear: () => void;
  onToday: () => void;
}) {
  const days = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const today = new Date();
  const monthLabel = viewDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <>
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <button
          type="button"
          onClick={() => onViewDateChange(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-surface-2"
          aria-label="Mês anterior"
        >
          <CaretLeft size={14} weight="bold" />
        </button>
        <p className="text-[13px] font-semibold text-text-primary">{monthLabelCap}</p>
        <button
          type="button"
          onClick={() => onViewDateChange(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-surface-2"
          aria-label="Próximo mês"
        >
          <CaretRight size={14} weight="bold" />
        </button>
      </div>

      <div className="grid grid-cols-7 px-3 pb-1 text-center">
        {WEEKDAY_LABELS.map((w, i) => (
          <span key={i} className="text-[10px] font-bold uppercase text-text-tertiary">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 px-3 pb-2">
        {days.map((d) => {
          const inMonth = d.getMonth() === viewDate.getMonth();
          const isToday = isSameDay(d, today);
          const isSelected = selected && isSameDay(d, selected);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onPick(d)}
              className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-medium tabular-nums transition-colors",
                isSelected
                  ? "bg-brand font-bold text-white"
                  : isToday
                    ? "font-bold text-brand ring-1 ring-brand/40"
                    : inMonth
                      ? "text-text-primary hover:bg-surface-2"
                      : "text-text-disabled hover:bg-surface-2",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 border-t border-divider px-3 pb-3 pt-2">
        <button
          type="button"
          onClick={onClear}
          className="h-9 flex-1 rounded-[10px] text-[12px] font-semibold text-text-tertiary hover:bg-surface-2"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={onToday}
          className="h-9 flex-1 rounded-[10px] text-[12px] font-semibold text-brand hover:bg-brand/5"
        >
          Hoje
        </button>
      </div>
    </>
  );
}

/**
 * Calendário próprio (nunca `<input type="date">` nativo — regra do design
 * system). No mobile abre em modal centralizado; no desktop abre ancorado
 * embaixo do campo, na mesma tela (sem cobrir a tela toda).
 */
export function DatePickerField({
  value,
  onChange,
  label,
  labelClassName,
  required,
  placeholder = "dd/mm/aaaa",
  disabled,
  className,
  variant = "default",
}: DatePickerFieldProps) {
  const isMobile = useBreakpoint("mobile");
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const [viewDate, setViewDate] = useState(() => selected ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  useLockBodyScroll(isMobile && open);

  useEffect(() => {
    if (open) setViewDate(selected ?? new Date());
    // Só precisa resincronizar quando abre — não a cada tecla/mudança externa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Desktop: fecha ao clicar fora ou Esc (o popover não tem backdrop próprio).
  useEffect(() => {
    if (!open || isMobile) return;
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
  }, [open, isMobile]);

  const display = selected
    ? selected.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  const pick = (d: Date) => {
    onChange(toISO(d));
    setOpen(false);
  };
  const clear = () => {
    onChange("");
    setOpen(false);
  };
  const goToday = () => {
    onChange(toISO(today));
    setOpen(false);
  };

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
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "flex items-center gap-2 text-left transition-all",
            variant === "bare"
              ? "h-9 w-auto bg-transparent border-0 px-0"
              : cn(
                  "h-11 w-full rounded-[10px] border border-[#e4e4e7] bg-white px-3.5",
                  "dark:border-[#2d3748] dark:bg-[#0d1117]",
                ),
            "focus:outline-none focus-visible:border-brand focus-visible:shadow-[0_0_0_3px_rgba(147,51,234,0.15)]",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <CalendarBlank size={16} className="shrink-0 text-text-disabled" />
          <span className={cn("flex-1 truncate text-[16px]", display ? "text-text-primary font-normal" : "text-[12px] text-text-disabled")}>
            {display || placeholder}
          </span>
        </button>

        {/* Desktop: ancorado no próprio campo, sem modal cobrindo a tela. */}
        {!isMobile && open && (
          <div
            role="dialog"
            aria-modal="false"
            aria-label="Selecionar data"
            className="absolute left-0 top-[calc(100%+6px)] z-50 w-[280px] overflow-hidden rounded-2xl bg-surface-1 shadow-elev-3"
          >
            <CalendarBody
              viewDate={viewDate}
              onViewDateChange={setViewDate}
              selected={selected}
              onPick={pick}
              onClear={clear}
              onToday={goToday}
            />
          </div>
        )}
      </div>

      {/* Mobile: modal centralizado (mais fácil de tocar do que um popover pequeno). */}
      {isMobile && (
        <BodyPortal open={open}>
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Selecionar data"
              className="w-full max-w-[300px] overflow-hidden rounded-[16px] bg-surface-1 shadow-elev-3"
              onClick={(e) => e.stopPropagation()}
            >
              <CalendarBody
                viewDate={viewDate}
                onViewDateChange={setViewDate}
                selected={selected}
                onPick={pick}
                onClear={clear}
                onToday={goToday}
              />
            </div>
          </div>
        </BodyPortal>
      )}
    </div>
  );
}
