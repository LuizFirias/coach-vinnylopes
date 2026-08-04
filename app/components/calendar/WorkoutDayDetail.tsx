"use client";

import { Smiley } from "@phosphor-icons/react";

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
  exercises: WorkoutExercise[];
  /** Avaliação do termômetro pós-treino (dados_sessao) */
  satisfacao?: string | null;
  nivelDor?: number | null;
}

interface WorkoutDayDetailProps {
  selectedDayISO: string | null;
  workouts: WorkoutSession[];
  formatWorkoutDate: (iso: string) => string;
  className?: string;
}

function estimateDuration(totalSets: number): string {
  const totalMin = Math.max(30, totalSets * 4 + 10);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function dorColor(nivel: number): string {
  if (nivel <= 3) return "var(--success)";
  if (nivel <= 6) return "var(--warning)";
  return "var(--danger)";
}

export function WorkoutDayDetail({
  selectedDayISO,
  workouts,
  formatWorkoutDate,
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
      {workouts.map((workout, idx) => {
        const hasFeedback = !!(workout.satisfacao || workout.nivelDor != null);
        const color =
          workout.nivelDor != null ? dorColor(workout.nivelDor) : undefined;

        return (
          <div
            key={`${workout.data_conclusao}-${idx}`}
            className="bg-surface-1 rounded-xl px-4 py-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[15px] font-semibold uppercase tracking-wide text-text-primary leading-snug">
                {workout.nome_rotina}
              </p>
              <p className="text-[13px] text-text-secondary shrink-0 tabular-nums lining-nums">
                {estimateDuration(workout.totalSets)}
              </p>
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              {formatWorkoutDate(workout.data_conclusao)}
            </p>

            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted mt-4 mb-2">
              Exercícios
            </p>

            <div className="border-t border-surface-2">
              {workout.exercises.map((ex, exIdx) => (
                <div
                  key={exIdx}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-surface-2 last:border-0"
                >
                  <p className="text-[13px] font-medium text-text-primary leading-snug min-w-0">
                    {ex.nome}
                  </p>
                  <p className="text-[13px] text-text-secondary shrink-0 tabular-nums lining-nums">
                    {ex.completedSets || ex.sets}{" "}
                    {(ex.completedSets || ex.sets) === 1 ? "série" : "séries"}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-surface-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                Volume total
              </p>
              <p className="text-[13px] font-semibold text-text-primary tabular-nums lining-nums">
                {workout.volumeTotal > 0
                  ? `${workout.volumeTotal.toLocaleString("pt-BR")} kg`
                  : "0 kg"}
              </p>
            </div>

            <div className="mt-3 pt-3 border-t border-surface-2 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                Feedback do aluno
              </p>
              {hasFeedback ? (
                <div className="flex flex-wrap items-center gap-2">
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
              ) : (
                <p className="text-[11px] text-text-tertiary">
                  Sem avaliação de satisfação/dor nesta sessão.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
