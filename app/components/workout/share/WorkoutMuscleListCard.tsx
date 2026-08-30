import { BrandFooter } from '@/app/components/workout/share/BrandFooter';
import { ShareCardShell } from '@/app/components/workout/share/ShareCardShell';
import { WorkoutPosterMuscleStack } from '@/app/components/workout/share/WorkoutPosterMuscleStack';
import type { BodyGender } from '@/lib/utils/bodyGender';
import {
  type ShareExerciseInput,
  type ShareTheme,
  getShareThemeTokens,
  toShareTitleCase,
} from '@/lib/utils/workoutShare';
import type { WorkoutExerciseItem } from '@/app/components/workout/share/WorkoutExercisesCard';

export interface WorkoutMuscleListCardProps {
  workoutName: string;
  exercises: WorkoutExerciseItem[];
  exercicios: ShareExerciseInput[];
  coachHandle: string;
  theme?: ShareTheme;
  gender?: BodyGender;
  maxExercisesVisible?: number;
}

/** Card estilo Hevy: nome + lista à esquerda, anatomia empilhada à direita. */
export function WorkoutMuscleListCard({
  workoutName,
  exercises,
  exercicios,
  coachHandle,
  theme = 'escuro',
  gender = 'male',
  maxExercisesVisible = 8,
}: WorkoutMuscleListCardProps) {
  const tokens = getShareThemeTokens(theme);
  const visibleExercises = exercises.slice(0, maxExercisesVisible);
  const remaining = exercises.length - maxExercisesVisible;

  return (
    <ShareCardShell theme={theme}>
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: '52px 36px 110px 48px',
          display: 'flex',
          flexDirection: 'row',
          gap: 20,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            flex: '1 1 58%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <p
            style={{
              fontSize: 70,
              fontWeight: 900,
              color: tokens.text,
              margin: 0,
              marginBottom: 32,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              lineHeight: 1.02,
            }}
          >
            {workoutName}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
            {visibleExercises.map((ex) => (
              <div
                key={`${ex.name}-${ex.sets}`}
                style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 14 }}
              >
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color: tokens.accent,
                    minWidth: 56,
                    flexShrink: 0,
                  }}
                >
                  {ex.sets}x
                </span>
                <span
                  style={{
                    fontSize: 34,
                    color: tokens.textExercise,
                    fontWeight: 500,
                    flex: 1,
                    lineHeight: 1.15,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {toShareTitleCase(ex.name)}
                </span>
              </div>
            ))}

            {remaining > 0 && (
              <p style={{ fontSize: 26, color: tokens.textSecondary, marginTop: 4, marginBottom: 0 }}>
                +{remaining} exercício{remaining > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        <div
          style={{
            flex: '0 0 46%',
            maxWidth: 460,
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <WorkoutPosterMuscleStack exercicios={exercicios} theme={theme} gender={gender} />
        </div>
      </div>

      <BrandFooter coachHandle={coachHandle} theme={theme} />
    </ShareCardShell>
  );
}
