"use client";

import { cn } from "@/lib/utils/cn";

const GROUP_COLORS: Record<string, string> = {
  Core: "#2b7fff",
  Costas: "#39c75a",
  Pernas: "#f59e0b",
  Ombros: "#7a8aab",
  Braços: "#e05555",
  Peito: "#a78bfa",
};

export interface MuscleGroupRow {
  name: string;
  sets: number;
}

interface MuscleGroupSetsTableProps {
  rows: MuscleGroupRow[];
  total: number;
  isDesktop?: boolean;
  className?: string;
}

export function MuscleGroupSetsTable({
  rows,
  total,
  isDesktop = false,
  className,
}: MuscleGroupSetsTableProps) {
  const hasData = rows.length > 0;

  return (
    <div className={cn("rounded-xl border mobile-stat-nav-card overflow-hidden", className)}>
      <div
        className={cn(
          "flex items-center justify-between border-b border-[var(--mobile-card-border-soft)]",
          isDesktop ? "px-5 py-3" : "px-4 py-2.5"
        )}
      >
        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
          Músculo
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
          Séries
        </span>
      </div>

      {hasData ? (
        rows.map((row) => (
          <div
            key={row.name}
            className={cn(
              "flex items-center justify-between border-b border-[var(--mobile-card-border-subtle)]",
              "transition-colors [@media(hover:hover)]:hover:bg-[var(--mobile-secondary-bg)]",
              isDesktop ? "px-5 py-3.5" : "px-4 py-3"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-1.5 h-1.5 rounded-[3px] shrink-0"
                style={{ backgroundColor: GROUP_COLORS[row.name] ?? "#2b7fff" }}
                aria-hidden
              />
              <span className={cn("font-medium text-text-primary", isDesktop ? "text-sm" : "text-[13px]")}>
                {row.name}
              </span>
            </div>
            <span className={cn("font-semibold text-text-primary tabular-nums lining-nums", isDesktop ? "text-sm" : "text-[13px]")}>
              {row.sets}
            </span>
          </div>
        ))
      ) : (
        <p
          className={cn(
            "text-center text-text-muted",
            isDesktop ? "px-5 py-6 text-sm" : "px-4 py-5 text-xs"
          )}
        >
          Nenhum treino registrado neste período
        </p>
      )}

      <div
        className={cn(
          "flex items-center justify-between border-t border-[var(--mobile-card-border-soft)] bg-[var(--mobile-secondary-bg)]",
          isDesktop ? "px-5 py-3.5" : "px-4 py-3"
        )}
      >
        <span className={cn("font-semibold text-text-primary", isDesktop ? "text-sm" : "text-xs")}>
          Total
        </span>
        <span className={cn("font-bold text-text-primary tabular-nums lining-nums", isDesktop ? "text-sm" : "text-xs")}>
          {total}
        </span>
      </div>
    </div>
  );
}
