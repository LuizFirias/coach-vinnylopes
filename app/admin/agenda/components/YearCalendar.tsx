"use client";

import { cn } from "@/lib/utils/cn";
import { getMonthGridDays, isSameDay } from "@/lib/agenda/dateHelpers";
import type { AulaAgenda } from "@/lib/agenda/queries";

interface YearCalendarProps {
  year: number;
  items: AulaAgenda[];
  onMonthClick: (monthIndex: number) => void;
}

export function YearCalendar({ year, items, onMonthClick }: YearCalendarProps) {
  const today = new Date();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {Array.from({ length: 12 }, (_, month) => {
        const anchor = new Date(year, month, 1);
        const days = getMonthGridDays(anchor);
        const hasItem = (day: Date) =>
          items.some((it) => isSameDay(new Date(it.data_hora), day));

        return (
          <button
            key={month}
            type="button"
            onClick={() => onMonthClick(month)}
            className="rounded-xl border border-[#E4E7ED] p-3 text-left transition-colors hover:border-brand/40 hover:bg-brand/5"
          >
            <p className="mb-2 text-xs font-bold capitalize text-text-primary">
              {anchor.toLocaleDateString("pt-BR", { month: "long" })}
            </p>
            <div className="grid grid-cols-7 gap-y-0.5">
              {days.map((day) => (
                <span
                  key={day.toISOString()}
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full text-[8px]",
                    day.getMonth() !== month && "opacity-25",
                    isSameDay(day, today) && "bg-brand text-white",
                    day.getMonth() === month && hasItem(day) && !isSameDay(day, today) &&
                      "font-bold text-brand",
                  )}
                >
                  {day.getDate()}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
