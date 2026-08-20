"use client";

import { cn } from "@/lib/utils/cn";
import { getMonthGridDays, isSameDay, WEEKDAY_LABELS_SHORT } from "@/lib/agenda/dateHelpers";
import type { AulaAgenda } from "@/lib/agenda/queries";

interface MonthCalendarProps {
  anchor: Date;
  items: AulaAgenda[];
  onDayClick: (date: Date) => void;
}

export function MonthCalendar({ anchor, items, onDayClick }: MonthCalendarProps) {
  const days = getMonthGridDays(anchor);
  const today = new Date();
  const currentMonth = anchor.getMonth();

  const countByDay = (day: Date) =>
    items.filter((it) => isSameDay(new Date(it.data_hora), day)).length;

  return (
    <div className="overflow-hidden rounded-xl border border-[#E4E7ED]">
      <div className="grid grid-cols-7 border-b border-[#E4E7ED] bg-surface-2/40">
        {WEEKDAY_LABELS_SHORT.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-text-tertiary"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const count = countByDay(day);
          const isCurrentMonth = day.getMonth() === currentMonth;
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick(day)}
              className={cn(
                "flex h-20 flex-col items-center gap-1 border-b border-r border-[#E4E7ED] p-1.5 text-left transition-colors hover:bg-brand/5 last:border-r-0",
                !isCurrentMonth && "opacity-40",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  isSameDay(day, today) ? "bg-brand text-white" : "text-text-primary",
                )}
              >
                {day.getDate()}
              </span>
              {count > 0 && (
                <span className="rounded-full bg-brand-subtle px-1.5 text-[9px] font-bold text-brand">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
