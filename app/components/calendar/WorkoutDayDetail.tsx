"use client";

import { useState } from "react";
import { Barbell, Smiley } from "@phosphor-icons/react";

interface WorkoutExercise {
  nome: string;
  sets: number;
  completedSets: number;
}

export interface WorkoutSession {
  data_conclusao: string;
  nome_rotina: string;
  volumeTotal: number;
  totalSets: number;
  /** Duração real da sessão (dados_sessao.duracao_segundos) — null em sessões antigas sem esse campo */
  duracaoSegundos?: number | null;
  exercises: WorkoutExercise[];
  /** Avaliação do termômetro pós-treino (dados_sessao) */
  satisfacao?: string | null;
  nivelDor?: number | null;
}

interface WorkoutDayDetailProps {
  selectedDayISO: string | null;
  workouts: WorkoutSession[];
  formatWorkoutDate: (iso: string) => string;
  /** Nome do aluno — exibido no cabeçalho do card (sem foto) */
  alunoNome?: string;
  className?: string;
}

const EXERCISES_PREVIEW_LIMIT = 3;

function formatDuration(totalSeconds: number | null | undefined, totalSets: number): string {
  // Sessões antigas não têm duração real salva — mantém a estimativa como fallback
  const seconds = totalSeconds && totalSeconds > 0 ? totalSeconds : Math.max(30, totalSets * 4 + 10) * 60;
  const totalMin = Math.round(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function dorColor(nivel: number): string {
  if (nivel <= 3) return "var(--success)";
  if (nivel <= 6) return "var(--warning)";
  return "var(--danger)";
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-text-muted">{label}</p>
      <p className="text-[15px] font-semibold text-text-primary tabular-nums lining-nums">{value}</p>
    </div>
  );
}

function WorkoutHistoryCard({
  workout,
  formatWorkoutDate,
  alunoNome,
}: {
  workout: WorkoutSession;
  formatWorkoutDate: (iso: string) => string;
  alunoNome?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasFeedback = !!(workout.satisfacao || workout.nivelDor != null);
  const color = workout.nivelDor != null ? dorColor(workout.nivelDor) : undefined;
  const visibleExercises = expanded
    ? workout.exercises
    : workout.exercises.slice(0, EXERCISES_PREVIEW_LIMIT);
  const hiddenCount = workout.exercises.length - visibleExercises.length;

  return (
    <div className="bg-surface-1 rounded-xl px-4 py-3.5">
      {/* Cabeçalho — nome do aluno + data, sem foto */}
      <div className="flex items-baseline justify-between gap-3">
        {alunoNome ? (
          <p className="text-[13px] font-semibold text-text-primary truncate min-w-0">{alunoNome}</p>
        ) : null}
        <p className="text-[11px] text-text-muted shrink-0 ml-auto">
          {formatWorkoutDate(workout.data_conclusao)}
        </p>
      </div>

      <p className="text-[17px] font-bold uppercase tracking-wide text-text-primary leading-snug mt-1">
        {workout.nome_rotina}
      </p>

      {/* Stats — igual ao padrão Time / Volume / Records */}
      <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-surface-2">
        <StatTile label="Tempo" value={formatDuration(workout.duracaoSegundos, workout.totalSets)} />
        <StatTile
          label="Volume"
          value={workout.volumeTotal > 0 ? `${workout.volumeTotal.toLocaleString("pt-BR")} kg` : "0 kg"}
        />
        <StatTile label="Exercícios" value={String(workout.exercises.length)} />
      </div>

      <div className="border-t border-surface-2 mt-3">
        {visibleExercises.map((ex, exIdx) => (
          <div
            key={exIdx}
            className="flex items-center gap-2.5 py-2.5 border-b border-surface-2 last:border-0"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-tertiary">
              <Barbell size={14} weight="bold" />
            </span>
            <p className="text-[13px] text-text-primary leading-snug min-w-0 flex-1">
              <span className="font-semibold tabular-nums lining-nums">
                {ex.completedSets || ex.sets}{" "}
                {(ex.completedSets || ex.sets) === 1 ? "série" : "séries"}
              </span>{" "}
              {ex.nome}
            </p>
          </div>
        ))}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full text-center text-[12px] text-text-tertiary py-2 hover:text-text-secondary transition-colors"
        >
          Ver mais {hiddenCount} exercício{hiddenCount === 1 ? "" : "s"}
        </button>
      )}

      {hasFeedback && (
        <div className="mt-3 pt-3 border-t border-surface-2 flex flex-wrap items-center gap-2">
          {workout.satisfacao ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand/10 border border-brand/20 px-2 py-1 text-[11px] font-semibold text-brand">
              <Smiley size={13} weight="fill" aria-hidden />
              {workout.satisfacao}
            </span>
          ) : null}
          {workout.nivelDor != null ? (
            <span
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold border"
              style={{
                color,
                borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
                background: `color-mix(in srgb, ${color} 12%, transparent)`,
              }}
            >
              Dor {workout.nivelDor}/10
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function WorkoutDayDetail({
  selectedDayISO,
  workouts,
  formatWorkoutDate,
  alunoNome,
  className,
}: WorkoutDayDetailProps) {
  if (!selectedDayISO) {
    return (
      <div
        className={`flex items-center justify-center min-h-[120px] lg:min-h-[280px] ${className ?? ""}`}
      >
        <p className="text-xs text-text-muted text-center px-4">
          Selecione um dia para ver o treino realizado
        </p>
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div
        className={`flex items-center justify-center min-h-[80px] lg:min-h-[200px] ${className ?? ""}`}
      >
        <p className="text-xs text-text-muted text-center px-4">
          Sem treino registrado neste dia
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${className ?? ""}`}>
      {workouts.map((workout, idx) => (
        <WorkoutHistoryCard
          key={`${workout.data_conclusao}-${idx}`}
          workout={workout}
          formatWorkoutDate={formatWorkoutDate}
          alunoNome={alunoNome}
        />
      ))}
    </div>
  );
}
