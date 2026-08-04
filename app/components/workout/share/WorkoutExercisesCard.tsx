import { BrandFooter } from '@/app/components/workout/share/BrandFooter';
import { ShareCardShell } from '@/app/components/workout/share/ShareCardShell';
import { StatItem } from '@/app/components/workout/share/StatItem';
import {
  formatShareVolume,
  type ShareTheme,
  getShareThemeTokens,
  toShareTitleCase,
} from '@/lib/utils/workoutShare';

export interface WorkoutExerciseItem {
  name: string;
  sets: number;
}

export interface WorkoutExercisesCardProps {
  workoutName: string;
  durationFormatted: string;
  volumeKg: number;
  totalSets: number;
  exercises: WorkoutExerciseItem[];
  maxExercisesVisible?: number;
  coachHandle: string;
  theme?: ShareTheme;
}

export function WorkoutExercisesCard({
  workoutName,
  durationFormatted,
  volumeKg,
  totalSets,
  exercises,
  maxExercisesVisible = 5,
  coachHandle,
  theme = 'escuro',
}: WorkoutExercisesCardProps) {
  const tokens = getShareThemeTokens(theme);
  const visibleExercises = exercises.slice(0, maxExercisesVisible);
  const remaining = exercises.length - maxExercisesVisible;

  return (
    <ShareCardShell theme={theme}>
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: '64px 52px 110px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            fontSize: 73,
            fontWeight: 900,
            color: tokens.text,
            margin: 0,
            marginBottom: 24,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            lineHeight: 1.05,
          }}
        >
          {workoutName}
        </p>

        <div style={{ display: 'flex', flexDirection: 'row', gap: 40, marginBottom: 36 }}>
          <StatItem label="Duração" value={durationFormatted} theme={theme} labelSize={29} valueSize={55} />
          <StatItem label="Volume" value={formatShareVolume(volumeKg)} accent theme={theme} labelSize={29} valueSize={55} />
          <StatItem label="Séries" value={String(totalSets)} theme={theme} labelSize={29} valueSize={55} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
          {visibleExercises.map((ex) => (
            <div
              key={`${ex.name}-${ex.sets}`}
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 16 }}
            >
              <span
                style={{
                  fontSize: 47,
                  fontWeight: 800,
                  color: tokens.accent,
                  minWidth: 72,
                }}
              >
                {ex.sets}x
              </span>
              <span
                style={{
                  fontSize: 44,
                  color: tokens.textExercise,
                  fontWeight: 500,
                  flex: 1,
                  lineHeight: 1.2,
                }}
              >
                {toShareTitleCase(ex.name)}
              </span>
            </div>
          ))}

          {remaining > 0 && (
            <p style={{ fontSize: 34, color: tokens.textSecondary, marginTop: 12, marginBottom: 0 }}>
              +{remaining} exercício{remaining > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      <BrandFooter coachHandle={coachHandle} theme={theme} />
    </ShareCardShell>
  );
}

