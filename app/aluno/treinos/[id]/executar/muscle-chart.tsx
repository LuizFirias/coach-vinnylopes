'use client';

import { useMemo } from 'react';
import Body from 'react-muscle-highlighter';

interface ExerciseWithMuscles {
  nome: string;
  grupo_muscular?: string;
  series: Array<{ completado: boolean }>;
}

interface MuscleChartProps {
  exercicios: ExerciseWithMuscles[];
}

const HIGHLIGHTER_MAP: Record<string, string[]> = {
  'chest': ['Peito Superior', 'Peito Médio', 'Peito Inferior'],
  'upper-back': ['Dorsais'],
  'trapezius': ['Trapézio'],
  'lower-back': ['Lombar'],
  'deltoids': ['Ombro Anterior', 'Ombro Lateral', 'Ombro Posterior'],
  'biceps': ['Bíceps'],
  'triceps': ['Tríceps'],
  'forearm': ['Antebraço'],
  'quadriceps': ['Quadríceps'],
  'hamstring': ['Posterior (Isquiotibiais)'],
  'calves': ['Panturrilha'],
  'gluteal': ['Glúteos'],
  'abs': ['Abdômen'],
  'obliques': ['Oblíquos'],
};

function calculateMuscleIntensity(exercicios: ExerciseWithMuscles[]): Record<string, number> {
  const muscleCount: Record<string, number> = {};

  for (const exercicio of exercicios) {
    if (!exercicio.grupo_muscular) continue;

    const seriesCompletas = exercicio.series.filter(s => s.completado).length;
    if (seriesCompletas === 0) continue;

    const grupo = exercicio.grupo_muscular.trim();
    muscleCount[grupo] = (muscleCount[grupo] || 0) + seriesCompletas;
  }

  const maxCount = Math.max(...Object.values(muscleCount), 1);

  const normalized: Record<string, number> = {};
  for (const [muscle, count] of Object.entries(muscleCount)) {
    normalized[muscle] = Math.round((count / maxCount) * 10);
  }

  return normalized;
}

export default function MuscleChart({ exercicios }: MuscleChartProps) {
  const data = useMemo(() => {
    const muscleIntensity = calculateMuscleIntensity(exercicios);
    const list: any[] = [];
    Object.entries(HIGHLIGHTER_MAP).forEach(([slug, muscleGroups]) => {
      const intensities = muscleGroups.map(g => muscleIntensity[g] || 0);
      const maxIntensity = Math.max(...intensities, 0);

      if (maxIntensity > 0) {
        const opacity = 0.2 + (maxIntensity / 10) * 0.75;
        list.push({
          slug: slug,
          color: `rgba(37, 99, 235, ${opacity.toFixed(2)})`
        });
      }
    });
    return list;
  }, [exercicios]);

  return (
    <div className="flex justify-around items-center bg-transparent py-4 px-2 rounded-2xl w-full h-[320px] md:h-[400px]">
      <div className="w-[46%] h-full flex items-center justify-center overflow-hidden">
        <Body
          data={data}
          side="front"
          gender="male"
          scale={1.3}
          defaultFill="#27272a"
          defaultStroke="#3f3f46"
          defaultStrokeWidth={1}
        />
      </div>
      <div className="w-[46%] h-full flex items-center justify-center overflow-hidden">
        <Body
          data={data}
          side="back"
          gender="male"
          scale={1.3}
          defaultFill="#27272a"
          defaultStroke="#3f3f46"
          defaultStrokeWidth={1}
        />
      </div>
    </div>
  );
}
