'use client';

import { useMemo } from 'react';
import { MuscleBodyPair } from '@/app/components/MuscleBodyFigure';
import { useAlunoBodyGender } from '@/app/contexts/AlunoBodyGenderContext';
import { buildMuscleHighlightData } from '@/lib/utils/workoutShare';

interface ExerciseWithMuscles {
  nome: string;
  grupo_muscular?: string;
  series: Array<{ completado: boolean }>;
}

interface MuscleChartProps {
  exercicios: ExerciseWithMuscles[];
}

export default function MuscleChart({ exercicios }: MuscleChartProps) {
  const bodyGender = useAlunoBodyGender();

  const muscleData = useMemo(
    () => buildMuscleHighlightData(exercicios),
    [exercicios],
  );

  return (
    <div className="flex h-[320px] w-full items-center justify-center rounded-2xl bg-transparent px-2 py-4 md:h-[400px]">
      <MuscleBodyPair
        data={muscleData}
        gender={bodyGender}
        scale={1.3}
        defaultFill="#27272a"
        defaultStroke="#3f3f46"
        defaultStrokeWidth={1}
        minHeight={280}
        maxHeight={380}
      />
    </div>
  );
}
