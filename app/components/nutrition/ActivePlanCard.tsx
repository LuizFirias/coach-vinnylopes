"use client";

import { MacroDotBar } from "./MacroDotBar";

export interface MacroDisplay {
  label: string;
  current: number;
  target: number | null;
  unit: string;
}

interface ActivePlanCardProps {
  planName: string;
  goal: string;
  completedMeals: number;
  totalMeals: number;
  macros: MacroDisplay[];
  isDesktop?: boolean;
}

export function ActivePlanCard({
  planName,
  goal,
  completedMeals,
  totalMeals,
  macros,
  isDesktop = false,
}: ActivePlanCardProps) {
  if (!macros.length) return null;

  return (
    <div className="bg-[#111827] border-0 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
          <span className="text-xs font-medium text-success">Plano ativo</span>
        </div>
        <p className="text-xs text-text-secondary shrink-0">
          {completedMeals} de {totalMeals} refeições
        </p>
      </div>

      <p className="text-base font-bold text-text-primary">{planName}</p>
      <p className="text-xs text-text-muted mt-0.5">Foco: {goal}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-divider">
        {macros.map(({ label, current, target, unit }) => (
          <div key={label} className="min-w-0">
            <p className="text-[9px] lg:text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary mb-1">
              {label}
            </p>
            <p
              className={
                isDesktop
                  ? "text-[22px] font-bold tabular-nums lining-nums text-text-primary leading-none"
                  : "text-lg font-bold tabular-nums lining-nums text-text-primary leading-none"
              }
            >
              {Math.round(current).toLocaleString("pt-BR")}
            </p>
            <p className="text-[11px] lg:text-[13px] text-text-muted tabular-nums lining-nums mt-0.5">
              /{target != null ? Math.round(target).toLocaleString("pt-BR") : "—"}
              {unit}
            </p>
            {target != null && target > 0 && (
              <MacroDotBar
                current={current}
                target={target}
                isDesktop={isDesktop}
                className="mt-2"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
