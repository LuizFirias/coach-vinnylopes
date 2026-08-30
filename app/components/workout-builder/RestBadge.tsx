"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock } from "@phosphor-icons/react";
import {
  descansoToSeconds,
  formatRestTime,
  secondsToDescanso,
} from "@/lib/utils/restTime";
import { cn } from "@/lib/utils/cn";

const REST_STEP_SEC = 15;
const REST_MAX_SEC = 600;

function buildRestOptions(): number[] {
  const opts: number[] = [];
  for (let s = 0; s <= REST_MAX_SEC; s += REST_STEP_SEC) opts.push(s);
  return opts;
}

const OPTIONS = buildRestOptions();

interface RestBadgeProps {
  descanso: string;
  onChange: (descanso: string) => void;
  compact?: boolean;
  label?: string;
}

export function RestBadge({
  descanso,
  onChange,
  compact = false,
  label = "Descanso",
}: RestBadgeProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const seconds = descansoToSeconds(descanso);

  const activeSec = useMemo(() => {
    const clamped = Math.max(0, Math.min(REST_MAX_SEC, seconds));
    return Math.round(clamped / REST_STEP_SEC) * REST_STEP_SEC;
  }, [seconds]);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuW = 148;
    const left = Math.min(
      Math.max(8, rect.right - menuW),
      window.innerWidth - menuW - 8,
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 220;
    setPos({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointer = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onOutsideScroll = (e: Event) => {
      const target = e.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onOutsideScroll);
    window.addEventListener("scroll", onOutsideScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onOutsideScroll);
      window.removeEventListener("scroll", onOutsideScroll, true);
    };
  }, [open]);

  const menu =
    open &&
    pos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        role="listbox"
        aria-label={label}
        className="fixed z-[120] max-h-56 w-[148px] overflow-y-auto overscroll-contain rounded-xl bg-surface-1 py-1 shadow-[0_8px_28px_rgba(0,0,0,0.28)]"
        style={{
          top: pos.top,
          left: pos.left,
          transform:
            pos.top < (btnRef.current?.getBoundingClientRect().top ?? 0)
              ? "translateY(-100%)"
              : undefined,
        }}
      >
        {OPTIONS.map((sec) => {
          const active = sec === activeSec;
          return (
            <button
              key={sec}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => {
                onChange(secondsToDescanso(sec));
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-[12px] transition-colors",
                active
                  ? "font-semibold text-brand bg-brand/10"
                  : "font-medium text-text-primary hover:bg-surface-2",
              )}
            >
              {sec === 0 ? "Sem descanso" : formatRestTime(sec)}
            </button>
          );
        })}
      </div>,
      document.body,
    );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 bg-transparent border-0 rounded-md min-h-[32px]",
          compact ? "px-1.5 py-1" : "px-2 py-1",
        )}
        title={label}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Clock size={11} className="text-brand shrink-0" />
        <span
          className={cn(
            "font-medium text-brand",
            compact ? "text-[10px]" : "text-[11px]",
          )}
        >
          {compact
            ? formatRestTime(seconds)
            : `${label}: ${formatRestTime(seconds)}`}
        </span>
      </button>
      {menu}
    </>
  );
}
