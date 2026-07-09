"use client";

import Link from "next/link";
import { Barbell, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { getRoutineMuscleSummary } from "@/lib/utils/routineDisplay";

interface RoutineExercise {
  nome?: string;
  grupo_muscular?: string;
}

export interface RoutineCardData {
  id: string;
  nome_rotina: string;
  criado_em: string;
  exercicios: RoutineExercise[];
}

interface RoutineCardProps {
  routine: RoutineCardData;
  isDesktop?: boolean;
}

export function RoutineCard({ routine, isDesktop = false }: RoutineCardProps) {
  const count = routine.exercicios.length;
  const muscleSummary = getRoutineMuscleSummary(routine.exercicios);
  const dateLabel = new Date(routine.criado_em).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });

  return (
    <Link
      href={`/aluno/treinos/${routine.id}/executar`}
      className={cn(
        "routine-card group flex items-center gap-3 min-h-16",
        "bg-surface-1 border border-border-subtle rounded-xl",
        "px-4 py-3.5 lg:px-5 lg:py-[18px]",
        "transition-colors active:bg-surface-2",
        "[@media(hover:hover)]:hover:bg-[#1a1a1a] [@media(hover:hover)]:hover:border-[#333333]"
      )}
    >
      <div className="w-10 h-10 rounded-[10px] bg-[#1a2d4a] flex items-center justify-center shrink-0">
        <Barbell size={18} className="text-brand" weight="bold" />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-semibold text-text-primary truncate",
            isDesktop ? "text-base" : "text-[15px]"
          )}
        >
          {routine.nome_rotina}
        </p>
        <p className="text-[11px] text-text-muted mt-0.5">
          {count > 0
            ? `${count} exercício${count !== 1 ? "s" : ""}`
            : "Sem exercícios"}
          {" · "}
          {dateLabel}
        </p>
        {muscleSummary && (
          <p className="text-[11px] text-text-muted mt-0.5 truncate">{muscleSummary}</p>
        )}
      </div>

      <CaretRight
        size={16}
        className="text-text-muted shrink-0 transition-colors [@media(hover:hover)]:group-hover:text-brand"
      />
    </Link>
  );
}
