"use client";

import { MacroProgressBar } from "./MacroDotBar";

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

const CARD_STYLE = {
  background: "var(--mobile-card-bg)",
  border: "1px solid var(--mobile-card-border)",
  boxShadow: "var(--mobile-card-shadow)",
} as const;

const COR_MACRO: Record<string, string> = {
  kcal: "#e05555",
  proteina: "#751BB4",
  proteína: "#751BB4",
  carbo: "#f59e0b",
  gordura: "#39c75a",
};

function corDoMacro(label: string): string {
  const key = label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
  return COR_MACRO[key] ?? "#751BB4";
}

export function ActivePlanCard({
  planName,
  goal,
  completedMeals,
  totalMeals,
  macros,
  isDesktop: _isDesktop = false,
}: ActivePlanCardProps) {
  if (!macros.length) return null;

  return (
    <div className="rounded-[16px] p-4" style={CARD_STYLE}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: "#39c75a" }}
          />
          <span className="text-[12px] font-semibold text-text-primary">
            Plano ativo
          </span>
        </div>
        <p className="shrink-0 text-[11px] text-text-tertiary">
          {completedMeals} de {totalMeals} refeições
        </p>
      </div>

      <p className="text-[16px] font-bold text-text-primary">{planName}</p>
      <p className="mt-0.5 text-[11px] text-text-tertiary">Foco: {goal}</p>

      <div
        className="mt-4 grid grid-cols-2 gap-3 pt-3 sm:grid-cols-4"
        style={{ borderTop: "1px solid var(--mobile-card-border)" }}
      >
        {macros.map(({ label, current, target, unit }) => {
          const cor = corDoMacro(label);
          return (
            <div key={label} className="min-w-0">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                {label}
              </p>
              <p className="text-[22px] font-black leading-none tracking-display text-text-primary tabular-nums lining-nums">
                {Math.round(current).toLocaleString("pt-BR")}
                {unit ? (
                  <span
                    className="ml-0.5 text-[11px] font-semibold"
                    style={{ color: cor }}
                  >
                    {unit}
                  </span>
                ) : label.toLowerCase() === "kcal" ? (
                  <span
                    className="ml-0.5 text-[11px] font-semibold"
                    style={{ color: cor }}
                  >
                    kcal
                  </span>
                ) : null}
              </p>
              {target != null && target > 0 && (
                <MacroProgressBar
                  current={current}
                  target={target}
                  unit={unit || (label.toLowerCase() === "kcal" ? "kcal" : "")}
                  color={cor}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
