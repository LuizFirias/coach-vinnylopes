"use client";

import type { AlunoSemFicha } from "./types";

interface StudentsWithoutWorkoutAlertProps {
  students: AlunoSemFicha[];
  onAssignWorkout: (studentId: string) => void;
}

export function StudentsWithoutWorkoutAlert({
  students,
  onAssignWorkout,
}: StudentsWithoutWorkoutAlertProps) {
  if (students.length === 0) return null;

  return (
    <div className="bg-warning-subtle border border-warning-border rounded-xl p-3.5 shadow-sm">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
        <h3 className="text-xs font-semibold text-text-primary">
          {students.length} {students.length === 1 ? "aluno sem" : "alunos sem"} ficha ativa
        </h3>
      </div>
      <div className="flex flex-col">
        {students.map((aluno) => (
          <div
            key={aluno.id}
            className="flex items-center justify-between gap-3 py-2 border-t border-divider first:border-t-0"
          >
            <p className="text-xs text-text-primary truncate">
              {aluno.coaching_reference || aluno.full_name || "Atleta"}
            </p>
            <button
              type="button"
              onClick={() => onAssignWorkout(aluno.id)}
              className="text-xs font-medium text-brand shrink-0 hover:underline"
            >
              Atribuir ficha →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
