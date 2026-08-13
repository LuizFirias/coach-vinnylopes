"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { BodyPortal, useLockBodyScroll } from "@/app/components/ui/BodyPortal";

const ITEM_H = 44;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function buildMinutes(step: number) {
  const out: number[] = [];
  for (let m = 0; m < 60; m += step) out.push(m);
  return out;
}

function parseTime(value: string, minuteStep: number): { h: number; m: number } {
  const match = /^(\d{1,2}):(\d{2})/.exec((value || "").trim());
  let h = match ? Number(match[1]) : 8;
  let m = match ? Number(match[2]) : 0;
  if (!Number.isFinite(h)) h = 8;
  if (!Number.isFinite(m)) m = 0;
  h = Math.min(23, Math.max(0, Math.round(h)));
  m = Math.min(59, Math.max(0, Math.round(m)));
  m = Math.round(m / minuteStep) * minuteStep;
  if (m >= 60) {
    m = 0;
    h = (h + 1) % 24;
  }
  return { h, m };
}

const CARD_STYLE = {
  background: "var(--mobile-card-bg, var(--surface-1))",
  border: "1px solid var(--mobile-card-border, rgba(0,0,0,0.08))",
  boxShadow: "var(--mobile-card-shadow, 0 8px 24px rgba(0,0,0,0.12))",
} as const;

function WheelColumn({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: number[];
  value: number;
  onChange: (n: number) => void;
  ariaLabel: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const idx = Math.max(0, options.indexOf(value));
    el.scrollTo({ top: idx * ITEM_H, behavior: "auto" });
    // montagem apenas — scroll do usuário atualiza o valor sem resetar a roda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const next = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(next, options.length - 1));
    if (options[clamped] !== value) onChange(options[clamped]);
  };

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      role="listbox"
      aria-label={ariaLabel}
      className="scrollbar-none h-full flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain"
      style={{
        scrollSnapType: "y mandatory",
        paddingTop: ITEM_H,
        paddingBottom: ITEM_H,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {options.map((n, i) => {
        const active = n === value;
        return (
          <button
            key={n}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => {
              onChange(n);
              listRef.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
            }}
            className={cn(
              "flex w-full snap-center items-center justify-center tabular-nums lining-nums transition-all",
              active
                ? "text-[18px] font-bold text-text-primary"
                : "text-[14px] font-normal text-text-tertiary",
            )}
            style={{ height: ITEM_H, touchAction: "manipulation" }}
          >
            {pad(n)}
          </button>
        );
      })}
    </div>
  );
}

interface TimeRollerPickerProps {
  value: string;
  onChange: (value: string) => void;
  minuteStep?: number;
  className?: string;
  placeholder?: string;
}

export function TimeRollerPicker({
  value,
  onChange,
  minuteStep = 5,
  className,
  placeholder = "horário",
}: TimeRollerPickerProps) {
  const minutes = useMemo(() => buildMinutes(minuteStep), [minuteStep]);
  const [open, setOpen] = useState(false);
  const parsed = parseTime(value, minuteStep);
  const [draftH, setDraftH] = useState(parsed.h);
  const [draftM, setDraftM] = useState(parsed.m);

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const p = parseTime(value, minuteStep);
    setDraftH(p.h);
    setDraftM(p.m);
  }, [open, value, minuteStep]);

  const display = value?.trim() ? `${pad(parsed.h)}:${pad(parsed.m)}` : "";

  const confirm = () => {
    onChange(`${pad(draftH)}:${pad(draftM)}`);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center justify-end gap-1 bg-transparent border-0 p-0 cursor-pointer shrink-0",
          display ? "text-text-secondary" : "text-text-disabled",
          className,
        )}
        aria-label="Selecionar horário"
      >
        <span className="text-[11px] font-medium tabular-nums lining-nums font-mono">
          {display || placeholder}
        </span>
        <Clock size={12} weight="bold" className="text-brand shrink-0" />
      </button>

      <BodyPortal open={open}>
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="time-roller-title"
            className="w-full max-w-[280px] overflow-hidden rounded-[16px]"
            style={CARD_STYLE}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 px-4 pb-2 pt-4">
              <p
                id="time-roller-title"
                className="text-[14px] font-semibold text-text-primary"
              >
                Horário
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary"
                style={{
                  background: "var(--filter-bg, #ebebf0)",
                  border: "none",
                  touchAction: "manipulation",
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div
              className="relative mx-3 my-2 h-[132px] overflow-hidden rounded-[12px]"
              style={{ background: "var(--filter-bg, #ebebf0)" }}
            >
              <div
                className="pointer-events-none absolute inset-x-3 top-1/2 z-10 h-[44px] -translate-y-1/2 rounded-[10px] border border-brand/40 bg-brand/10"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-20 h-8"
                style={{
                  background:
                    "linear-gradient(to bottom, var(--filter-bg, #ebebf0), transparent)",
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-8"
                style={{
                  background:
                    "linear-gradient(to top, var(--filter-bg, #ebebf0), transparent)",
                }}
                aria-hidden
              />

              <div className="relative z-0 flex h-full items-stretch">
                <WheelColumn
                  key={`h-${open}-${parsed.h}`}
                  options={HOURS}
                  value={draftH}
                  onChange={setDraftH}
                  ariaLabel="Hora"
                />
                <div className="flex w-4 shrink-0 items-center justify-center text-[16px] font-bold text-text-tertiary">
                  :
                </div>
                <WheelColumn
                  key={`m-${open}-${parsed.m}`}
                  options={minutes}
                  value={draftM}
                  onChange={setDraftM}
                  ariaLabel="Minuto"
                />
              </div>
            </div>

            <div className="flex gap-2 px-3 pb-3 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 flex-1 rounded-[10px] text-[13px] font-semibold text-text-tertiary"
                style={{
                  background: "var(--filter-bg, #ebebf0)",
                  border: "none",
                  touchAction: "manipulation",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirm}
                className="h-10 flex-1 rounded-[10px] text-[13px] font-semibold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #c084fc 0%, #751BB4 55%, #7e22ce 100%)",
                  boxShadow: "0 3px 10px rgba(117, 27, 180,0.30)",
                  border: "none",
                  touchAction: "manipulation",
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </BodyPortal>
    </>
  );
}
