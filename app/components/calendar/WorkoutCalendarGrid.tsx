"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

const WEEK_DAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

interface WorkoutCalendarGridProps {
  cells: (Date | null)[];
  monthLabel: string;
  todayISO: string;
  selectedDayISO: string | null;
  workoutDates: Set<string>;
  isDesktop?: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (iso: string) => void;
  getISOString: (date: Date | null) => string;
}

function getDayState({
  iso,
  hasWorkout,
  isToday,
  isSelected,
}: {
  iso: string;
  hasWorkout: boolean;
  isToday: boolean;
  isSelected: boolean;
}) {
  if (isSelected) return "selected";
  if (isToday && hasWorkout) return "today-workout";
  if (isToday) return "today";
  if (hasWorkout) return "past-workout";
  return "default";
}

export function WorkoutCalendarGrid({
  cells,
  monthLabel,
  todayISO,
  selectedDayISO,
  workoutDates,
  isDesktop = false,
  onPrevMonth,
  onNextMonth,
  onDayClick,
  getISOString,
}: WorkoutCalendarGridProps) {
  const circleSize = isDesktop ? "w-11 h-11 text-sm" : "w-9 h-9 text-xs";

  return (
    <div className="lg:max-w-[360px]">
      <div className="flex items-center justify-between pb-2">
        <h2
          className={cn(
            "font-semibold text-text-primary",
            isDesktop ? "text-base" : "text-sm"
          )}
        >
          {monthLabel}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            className="w-8 h-8 rounded-lg bg-surface-1 border border-card flex items-center justify-center text-text-secondary hover:text-text-primary active:scale-95 transition-all cursor-pointer"
            aria-label="Mês anterior"
          >
            <CaretLeft size={16} />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="w-8 h-8 rounded-lg bg-surface-1 border border-card flex items-center justify-center text-text-secondary hover:text-text-primary active:scale-95 transition-all cursor-pointer"
            aria-label="Próximo mês"
          >
            <CaretRight size={16} />
          </button>
        </div>
      </div>

      <div className="bg-surface-1 border border-card rounded-xl p-3 lg:p-4">
        <div className="grid grid-cols-7 text-center gap-0.5 mb-1">
          {WEEK_DAYS.map((day) => (
            <span
              key={day}
              className="text-[10px] font-semibold uppercase tracking-wider text-text-muted py-1"
            >
              {day}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="min-h-11" aria-hidden />;
            }

            const iso = getISOString(cell);
            const hasWorkout = workoutDates.has(iso);
            const isSelected = selectedDayISO === iso;
            const isToday = todayISO === iso;
            const state = getDayState({ iso, hasWorkout, isToday, isSelected });

            return (
              <button
                key={iso}
                type="button"
                onClick={() => onDayClick(iso)}
                className="calendar-day min-h-11 w-full flex flex-col items-center justify-center cursor-pointer"
              >
                <span
                  className={cn(
                    "rounded-full flex flex-col items-center justify-center font-semibold transition-colors",
                    circleSize,
                    state === "default" &&
                      "text-text-secondary [@media(hover:hover)]:hover:bg-surface-2",
                    state === "today" &&
                      "border-[1.5px] border-brand text-brand",
                    state === "today-workout" && "bg-brand text-text-on-brand",
                    state === "past-workout" &&
                      "bg-[#1a2d4a] text-brand [@media(hover:hover)]:hover:bg-[#1a2d4a]",
                    state === "selected" && "bg-brand text-text-on-brand"
                  )}
                >
                  {cell.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
