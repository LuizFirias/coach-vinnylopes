"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface StatsWeekCalendarProps {
  weekDays: Date[];
  workoutDates: Set<string>;
  weekOffset: number;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  toISODate: (date: Date) => string;
  className?: string;
  variant?: "plain" | "card";
}

export function StatsWeekCalendar({
  weekDays,
  workoutDates,
  weekOffset,
  onPrevWeek,
  onNextWeek,
  toISODate,
  className,
  variant = "plain",
}: StatsWeekCalendarProps) {
  const todayISO = toISODate(new Date());
  const monthShort = weekDays[0].toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");

  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onPrevWeek}
          className="w-11 h-11 flex items-center justify-center text-brand"
          aria-label="Semana anterior"
        >
          <CaretLeft size={20} />
        </button>
        <span className="text-[13px] font-semibold text-text-primary tabular-nums text-center">
          {weekDays[0].getDate()}–{weekDays[6].getDate()} {monthShort}
          {weekOffset === 0 && (
            <span className="text-[11px] font-normal text-text-muted"> · esta semana</span>
          )}
        </span>
        <button
          type="button"
          onClick={onNextWeek}
          disabled={weekOffset >= 0}
          className="w-11 h-11 flex items-center justify-center text-brand disabled:opacity-30"
          aria-label="Próxima semana"
        >
          <CaretRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, i) => {
          const iso = toISODate(day);
          const hasWorkout = workoutDates.has(iso);
          const isToday = iso === todayISO;

          return (
            <div key={iso} className="flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                {DAY_LABELS[i]}
              </span>
              <div
                className={cn(
                  "w-[34px] h-[34px] rounded-full flex items-center justify-center text-[13px] font-semibold tabular-nums transition-colors",
                  hasWorkout
                    ? "bg-brand text-white"
                    : isToday
                      ? "border-[1.5px] border-brand text-brand"
                      : "text-text-secondary"
                )}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  if (variant === "card") {
    return (
      <div className={cn("rounded-xl border mobile-stat-nav-card px-4 py-3.5", className)}>
        {content}
      </div>
    );
  }

  return <div className={className}>{content}</div>;
}
