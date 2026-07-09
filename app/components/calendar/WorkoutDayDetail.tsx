"use client";

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
      {workouts.map((workout, idx) => (
        <div
          key={`${workout.data_conclusao}-${idx}`}
          className="bg-surface-1 rounded-xl px-4 py-3.5"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px] font-semibold text-text-primary leading-snug">
              {workout.nome_rotina}
            </p>
            <p className="text-[13px] text-text-secondary shrink-0 tabular-nums">
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
                <p className="text-[13px] text-text-secondary shrink-0 tabular-nums">
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
            <p className="text-[13px] font-semibold text-text-primary tabular-nums">
              {workout.volumeTotal > 0
                ? `${workout.volumeTotal.toLocaleString("pt-BR")} kg`
                : "0 kg"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
