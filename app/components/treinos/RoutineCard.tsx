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
      prefetch={false}
      className={cn(
        "routine-card group flex min-h-11 items-center gap-3",
        "rounded-[12px] px-4 py-3.5",
        "transition-all active:scale-[0.99]"
      )}
      style={{
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <AuronLinkIcon size={20} active className="shrink-0" />

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-bold uppercase tracking-wide truncate",
            isDesktop ? "text-base" : "text-[13px]"
          )}
          style={{ color: "#1a1a1a" }}
        >
          {routine.nome_rotina}
        </p>
        {exercisePreview ? (
          <p
            className="mt-0.5 line-clamp-2 text-[11px] font-normal leading-snug truncate"
            style={{ color: "#888" }}
          >
            {exercisePreview}
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] font-normal" style={{ color: "#888" }}>
            Sem exercícios
          </p>
        )}
      </div>

      <CaretRight size={16} className="shrink-0" style={{ color: "#bbb" }} />
    </Link>
  );
}
