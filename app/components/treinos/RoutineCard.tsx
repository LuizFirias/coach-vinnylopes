"use client";

import Link from "next/link";
import { Barbell, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { getRoutineExercisePreview } from "@/lib/utils/routineDisplay";

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
  const exercisePreview = getRoutineExercisePreview(routine.exercicios);

  return (
    <Link
      href={`/aluno/treinos/${routine.id}/executar`}
      prefetch={false}
      className={cn(
        "routine-card group flex min-h-11 items-center gap-3",
        "rounded-[12px] px-4 py-3.5",
        "transition-all active:scale-[0.99]"
      )}
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "none",
      }}
    >
      <div
        className="flex items-center justify-center shrink-0 rounded-full"
        style={{
          width: 36,
          height: 36,
          background: "var(--surface-2)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <Barbell size={18} weight="fill" className="text-brand" />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-bold uppercase tracking-wide truncate text-text-primary",
            isDesktop ? "text-base" : "text-[13px]"
          )}
        >
          {routine.nome_rotina}
        </p>
        {exercisePreview ? (
          <p
            className="mt-0.5 line-clamp-2 text-[11px] font-normal leading-snug truncate text-text-tertiary"
          >
            {exercisePreview}
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] font-normal text-text-tertiary">
            Sem exercícios
          </p>
        )}
      </div>

      <CaretRight size={16} className="shrink-0 text-text-disabled" />
    </Link>
  );
}
