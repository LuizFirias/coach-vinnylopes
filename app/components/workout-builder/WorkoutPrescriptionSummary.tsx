"use client";

import { useMemo } from "react";
import { Barbell } from "@phosphor-icons/react";
import type { ExercicioFichaItem } from "@/lib/utils/biset";
import { isBiSetFichaItem } from "@/lib/utils/biset";
import { cn } from "@/lib/utils/cn";

interface WorkoutPrescriptionSummaryProps {
  items: ExercicioFichaItem[];
  isMobile?: boolean;
  className?: string;
}

export function WorkoutPrescriptionSummary({
  items,
  isMobile = false,
  className,
}: WorkoutPrescriptionSummaryProps) {
  const stats = useMemo(() => {
    let exerciseCount = 0;
    let totalSets = 0;
    for (const item of items) {
      if (isBiSetFichaItem(item)) {
        if (item.exercicioB) {
          exerciseCount += 2;
          totalSets += item.exercicioA.series.length;
        } else {
          exerciseCount += 1;
          totalSets += item.exercicioA.series.length;
        }
      } else {
        exerciseCount += 1;
        totalSets += item.series.length;
      }
    }
    return { exerciseCount, totalSets };
  }, [items]);

  if (stats.exerciseCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border-0 bg-surface-1 px-3.5 py-2.5",
        isMobile ? "text-[11px]" : "text-xs",
        className
      )}
    >
      <div className="w-8 h-8 shrink-0 rounded-lg bg-brand-subtle border border-brand-border flex items-center justify-center">
        <Barbell size={16} className="text-brand" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-text-primary leading-tight">
          {stats.exerciseCount} {stats.exerciseCount === 1 ? "exercício" : "exercícios"}
          <span className="text-text-tertiary font-normal"> · </span>
          {stats.totalSets} {stats.totalSets === 1 ? "série" : "séries"} prescritas
        </p>
        <p className="text-text-tertiary mt-0.5 leading-snug">
          A carga é registrada pelo aluno durante a execução do treino.
        </p>
      </div>
    </div>
  );
}
