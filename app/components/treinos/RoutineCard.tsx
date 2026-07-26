"use client";

import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { getRoutineExercisePreview } from "@/lib/utils/routineDisplay";
import { AuronLinkIcon } from "@/app/components/ui/Auronlinkicon";

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
      className={cn(
        "routine-card group flex min-h-11 items-center gap-2.5",
        "border-0 rounded-xl bg-[var(--dash-card,#111827)]",
        "px-3 py-2 lg:px-4 lg:py-2.5",
        "transition-colors active:bg-[#1a2332]",
        "[@media(hover:hover)]:hover:bg-[#1a2332]"
      )}
    >
      <AuronLinkIcon size={22} className="shrink-0 text-brand" />

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-semibold uppercase tracking-wide text-text-primary truncate",
            isDesktop ? "text-base" : "text-[15px]"
          )}
        >
          {routine.nome_rotina}
        </p>
        {exercisePreview ? (
          <p className="mt-0.5 line-clamp-2 text-[11px] font-normal leading-snug text-text-disabled opacity-70">
            {exercisePreview}
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] font-normal text-text-disabled opacity-70">Sem exercícios</p>
        )}
      </div>

      <CaretRight
        size={16}
        className="text-text-muted shrink-0 transition-colors [@media(hover:hover)]:group-hover:text-brand"
      />
    </Link>
  );
}
