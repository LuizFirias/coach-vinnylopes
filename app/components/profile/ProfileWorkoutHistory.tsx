"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface ProfileWorkoutItem {
  data_conclusao: string;
  nome_rotina: string;
  totalSets: number;
}

interface ProfileWorkoutHistoryProps {
  workouts: ProfileWorkoutItem[];
  loading?: boolean;
  isDesktop?: boolean;
  maxVisible?: number;
}

function formatWorkoutDateShort(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const weekday = date
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "")
    .replace(/^\w/, (c) => c.toUpperCase());
  const day = date.getDate();
  const month = date
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
  return `${weekday}, ${day} ${month}`;
}

function estimateDuration(totalSets: number): string {
  const totalMin = Math.max(30, totalSets * 4 + 10);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export function ProfileWorkoutHistory({
  workouts,
  loading = false,
  isDesktop = false,
}: ProfileWorkoutHistoryProps) {
  const limit = isDesktop ? 5 : 3;
  const visible = workouts.slice(0, limit);

  if (loading) {
    return (
      <section className="animate-pulse">
        <div className="flex justify-between mb-3">
          <div className="h-3 w-28 bg-surface-2 rounded" />
          <div className="h-3 w-16 bg-surface-2 rounded" />
        </div>
        <div className="border-t border-surface-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between py-3 border-b border-surface-2">
              <div className="h-4 w-24 bg-surface-2 rounded" />
              <div className="h-4 w-20 bg-surface-2 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (workouts.length === 0) {
    return (
      <p className="text-xs text-text-muted text-center py-2">
        Nenhum treino concluído ainda ·{" "}
        <Link href="/aluno/treinos" className="text-brand font-medium hover:underline">
          Comece agora →
        </Link>
      </p>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">
          Treinos realizados
        </p>
        <Link
          href="/aluno/calendario"
          className="text-xs text-brand font-medium hover:underline shrink-0"
        >
          ver todos →
        </Link>
      </div>

      <div className="border-t border-surface-2">
        {visible.map((workout, idx) => (
          <div
            key={`${workout.data_conclusao}-${idx}`}
            className={cn(
              "flex items-center justify-between gap-3 py-2.5",
              idx < visible.length - 1 && "border-b border-surface-2"
            )}
          >
            <p className="text-sm font-medium text-text-primary truncate min-w-0">
              {workout.nome_rotina}
            </p>
            <p className="text-xs text-text-secondary shrink-0 tabular-nums">
              {formatWorkoutDateShort(workout.data_conclusao)} · {estimateDuration(workout.totalSets)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
