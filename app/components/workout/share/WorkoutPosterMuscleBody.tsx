'use client';

import { MuscleBodyFigure } from '@/app/components/MuscleBodyFigure';
import type { BodyGender } from '@/lib/utils/bodyGender';
import {
  buildMuscleHighlightData,
  type ShareExerciseInput,
  type ShareTheme,
  getShareThemeTokens,
} from '@/lib/utils/workoutShare';

interface WorkoutPosterMuscleBodyProps {
  exercicios: ShareExerciseInput[];
  theme?: ShareTheme;
  gender?: BodyGender;
}

export function WorkoutPosterMuscleBody({
  exercicios,
  theme = 'escuro',
  gender = 'male',
}: WorkoutPosterMuscleBodyProps) {
  const tokens = getShareThemeTokens(theme);
  const muscleData = buildMuscleHighlightData(exercicios, tokens.accent);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        width: '100%',
        height: '100%',
      }}
    >
      <MuscleBodyFigure
        data={muscleData}
        side="front"
        gender={gender}
        scale={1.55}
        defaultFill={tokens.muscleInactive}
        defaultStroke={tokens.muscleStroke}
        defaultStrokeWidth={1}
      />
      <MuscleBodyFigure
        data={muscleData}
        side="back"
        gender={gender}
        scale={1.55}
        defaultFill={tokens.muscleInactive}
        defaultStroke={tokens.muscleStroke}
        defaultStrokeWidth={1}
      />
    </div>
  );
}
