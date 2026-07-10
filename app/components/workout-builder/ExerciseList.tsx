"use client";

import { useState } from "react";
import { ExerciseCard } from "./ExerciseCard";
import type { ExercicioFicha } from "./types";

interface ExerciseListProps {
  exercises: ExercicioFicha[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onUpdate: (index: number, patch: Partial<ExercicioFicha>) => void;
  onDelete: (index: number) => void;
  onAddSet: (index: number) => void;
  onUpdateSerie: (exIndex: number, serieIndex: number, field: string, value: unknown) => void;
  onDeleteSerie: (exIndex: number, serieIndex: number) => void;
}

export function ExerciseList({
  exercises,
  onReorder,
  onUpdate,
  onDelete,
  onAddSet,
  onUpdateSerie,
  onDeleteSerie,
}: ExerciseListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDrop = (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    onReorder(dragIndex, toIndex);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-2.5">
      {exercises.map((exercicio, exIndex) => (
        <div
          key={exercicio.instanceId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverIndex(exIndex);
          }}
          onDragLeave={() => setDragOverIndex((i) => (i === exIndex ? null : i))}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(exIndex);
          }}
          className={dragOverIndex === exIndex && dragIndex !== exIndex ? "ring-2 ring-brand/30 rounded-xl" : ""}
        >
          <ExerciseCard
            exercicio={exercicio}
            exIndex={exIndex}
            allExercises={exercises}
            isDragging={dragIndex === exIndex}
            dragHandleProps={{
              draggable: true,
              onDragStart: () => setDragIndex(exIndex),
              onDragEnd: () => {
                setDragIndex(null);
                setDragOverIndex(null);
              },
            }}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onAddSet={onAddSet}
            onUpdateSerie={onUpdateSerie}
            onDeleteSerie={onDeleteSerie}
          />
        </div>
      ))}
    </div>
  );
}
