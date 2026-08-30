"use client";

import Link from "next/link";
import { ShareNetwork } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { formatDurationLong } from "@/lib/utils/format";
import { toShareTitleCase } from "@/lib/utils/workoutShare";
import { StudentAvatar } from "./StudentAvatar";

export interface ProfileWorkoutExerciseItem {
  nome: string;
  sets: number;
}

export interface ProfileWorkoutItem {
  /** data_conclusao bruto — chave da sessão (id de rota, agrupamento). */
  sessionKey: string;
  data_conclusao: string;
  nome_rotina: string;
  totalSets: number;
  volumeTotal: number;
  duracaoSegundos: number | null;
  exercises: ProfileWorkoutExerciseItem[];
}

interface ProfileWorkoutHistoryProps {
  workouts: ProfileWorkoutItem[];
  loading?: boolean;
  isDesktop?: boolean;
  maxVisible?: number;
  userName: string;
  avatarUrl?: string | null;
  sexo?: string | null;
  onShare: (workout: ProfileWorkoutItem) => void;
}

const MAX_EXERCISES_VISIBLE = 3;

/** Weekday completo + mês abreviado + dia + ano — ex. "Quinta-feira, Ago 18, 2026". */
export function formatWorkoutDateFull(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const tz = { timeZone: "America/Sao_Paulo" } as const;
  const weekday = date
    .toLocaleDateString("pt-BR", { weekday: "long", ...tz })
    .replace(/^\w/, (c) => c.toUpperCase());
  const day = date.toLocaleDateString("pt-BR", { day: "numeric", ...tz });
  const month = date
    .toLocaleDateString("pt-BR", { month: "short", ...tz })
    .replace(".", "");
  const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
  const year = date.toLocaleDateString("pt-BR", { year: "numeric", ...tz });
  return `${weekday}, ${monthCap} ${day}, ${year}`;
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums lining-nums text-text-primary">
        {value}
      </p>
    </div>
  );
}

function WorkoutCard({
  workout,
  userName,
  avatarUrl,
  sexo,
  onShare,
}: {
  workout: ProfileWorkoutItem;
  userName: string;
  avatarUrl?: string | null;
  sexo?: string | null;
  onShare: (workout: ProfileWorkoutItem) => void;
}) {
  const visibleExercises = workout.exercises.slice(0, MAX_EXERCISES_VISIBLE);
  const remaining = workout.exercises.length - MAX_EXERCISES_VISIBLE;
  const detailHref = `/aluno/treinos/historico/${encodeURIComponent(workout.sessionKey)}`;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <StudentAvatar name={userName} avatarUrl={avatarUrl} sexo={sexo} sizeClassName="w-8 h-8" />
        <div className="min-w-0">
          <p className="truncate text-sm font-normal text-text-secondary">{userName}</p>
          <p className="text-[11px] text-text-tertiary">
            {formatWorkoutDateFull(workout.data_conclusao)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-base font-bold uppercase tracking-wide text-text-primary">
        {workout.nome_rotina}
      </p>

      <div className="mt-2 flex items-center gap-6">
        <StatBlock label="Duração" value={formatDurationLong(workout.duracaoSegundos)} />
        <StatBlock label="Volume" value={`${workout.volumeTotal.toLocaleString("pt-BR")} kg`} />
      </div>

      <div className="mt-3 border-t border-surface-2" />

      <div className="mt-3 flex flex-col gap-1.5">
        {visibleExercises.map((ex, i) => (
          <p key={`${ex.nome}-${i}`} className="text-[13px] text-text-primary">
            <span className="font-semibold text-brand">{ex.sets}x</span>{" "}
            {toShareTitleCase(ex.nome)}
          </p>
        ))}
        {remaining > 0 && (
          <Link
            href={detailHref}
            className="mt-0.5 text-[12px] font-semibold text-brand hover:underline"
          >
            Ver mais {remaining} exercício{remaining > 1 ? "s" : ""}
          </Link>
        )}
      </div>

      <div className="mt-3 border-t border-surface-2" />

      <div className="mt-2.5 flex items-center justify-between">
        <Link
          href={detailHref}
          className="text-[11px] font-medium text-text-tertiary hover:text-text-secondary"
        >
          Ver detalhes
        </Link>
        <button
          type="button"
          onClick={() => onShare(workout)}
          aria-label={`Compartilhar treino ${workout.nome_rotina}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:text-brand touch-manipulation"
        >
          <ShareNetwork size={16} />
        </button>
      </div>
    </div>
  );
}

export function ProfileWorkoutHistory({
  workouts,
  loading = false,
  isDesktop = false,
  userName,
  avatarUrl,
  sexo,
  onShare,
}: ProfileWorkoutHistoryProps) {
  const limit = isDesktop ? 5 : 3;
  const visible = workouts.slice(0, limit);

  if (loading) {
    return (
      <section className="animate-pulse flex flex-col gap-3">
        <div className="flex justify-between">
          <div className="h-3 w-28 bg-surface-2 rounded" />
          <div className="h-3 w-16 bg-surface-2 rounded" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-surface-2" />
        ))}
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
      <div className="flex items-center justify-between gap-3 mb-3">
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

      <div className={cn("flex flex-col gap-3")}>
        {visible.map((workout) => (
          <WorkoutCard
            key={workout.sessionKey}
            workout={workout}
            userName={userName}
            avatarUrl={avatarUrl}
            sexo={sexo}
            onShare={onShare}
          />
        ))}
      </div>
    </section>
  );
}
