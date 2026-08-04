'use client';

import { MuscleBodyFigure } from '@/app/components/MuscleBodyFigure';
import type { BodyGender } from '@/lib/utils/bodyGender';
import {
  buildMuscleHighlightData,
  type ShareExerciseInput,
  type ShareTheme,
  getShareThemeTokens,
} from '@/lib/utils/workoutShare';

interface WorkoutPosterMuscleStackProps {
  exercicios: ShareExerciseInput[];
  theme?: ShareTheme;
  gender?: BodyGender;
}

/** Frente e costas empilhados verticalmente (estilo Hevy). */
export function WorkoutPosterMuscleStack({
  exercicios,
  theme = 'escuro',
  gender = 'male',
}: WorkoutPosterMuscleStackProps) {
  const tokens = getShareThemeTokens(theme);
  const muscleData = buildMuscleHighlightData(exercicios, tokens.accent);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        gap: 4,
      }}
    >
      <div style={{ flex: 1, width: '100%', minHeight: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <MuscleBodyFigure
          data={muscleData}
          side="front"
          gender={gender}
          scale={1.26}
          defaultFill={tokens.muscleInactive}
          defaultStroke={tokens.muscleStroke}
          defaultStrokeWidth={1}
          style={{ height: '100%', maxHeight: 504 }}
        />
      </div>
      <div style={{ flex: 1, width: '100%', minHeight: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <MuscleBodyFigure
          data={muscleData}
          side="back"
          gender={gender}
          scale={1.26}
          defaultFill={tokens.muscleInactive}
          defaultStroke={tokens.muscleStroke}
          defaultStrokeWidth={1}
          style={{ height: '100%', maxHeight: 504 }}
        />
      </div>
    </div>
  );
}
