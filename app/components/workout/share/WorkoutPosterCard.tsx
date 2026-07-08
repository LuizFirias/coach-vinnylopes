import { BrandFooter } from '@/app/components/workout/share/BrandFooter';
import { ShareCardShell } from '@/app/components/workout/share/ShareCardShell';
import { StatItem } from '@/app/components/workout/share/StatItem';
import { WorkoutPosterMuscleBody } from '@/app/components/workout/share/WorkoutPosterMuscleBody';
import type { BodyGender } from '@/lib/utils/bodyGender';
import {
  formatShareVolume,
  type ShareExerciseInput,
  type ShareTheme,
  getShareThemeTokens,
} from '@/lib/utils/workoutShare';

export interface WorkoutPosterCardProps {
  workoutName: string;
  durationFormatted: string;
  volumeKg: number;
  totalSets: number;
  exercicios: ShareExerciseInput[];
  coachHandle: string;
  theme?: ShareTheme;
  gender?: BodyGender;
}

export function WorkoutPosterCard({
  workoutName,
  durationFormatted,
  volumeKg,
  totalSets,
  exercicios,
  coachHandle,
  theme = 'escuro',
  gender = 'male',
}: WorkoutPosterCardProps) {
  const tokens = getShareThemeTokens(theme);

  return (
    <ShareCardShell theme={theme}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 110,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ alignItems: 'center', paddingTop: 52, marginBottom: 20, textAlign: 'center' }}>
          <p
            style={{
              fontSize: 24,
              color: tokens.textSecondary,
              letterSpacing: 4,
              textTransform: 'uppercase',
              margin: 0,
              fontWeight: 600,
            }}
          >
            Treino concluído
          </p>
          <p
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: tokens.text,
              letterSpacing: 1,
              margin: '12px 0 0',
              textTransform: 'uppercase',
              lineHeight: 1.05,
            }}
          >
            {workoutName}
          </p>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
          <WorkoutPosterMuscleBody exercicios={exercicios} theme={theme} gender={gender} />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-around',
            borderTop: `2px solid ${tokens.divider}`,
            padding: '28px 36px 0',
          }}
        >
          <StatItem label="DURAÇÃO" value={durationFormatted} labelSize={18} valueSize={44} theme={theme} />
          <StatItem label="VOLUME" value={formatShareVolume(volumeKg)} labelSize={18} valueSize={44} theme={theme} />
          <StatItem label="SÉRIES" value={String(totalSets)} labelSize={18} valueSize={44} theme={theme} />
        </div>
      </div>

      <BrandFooter coachHandle={coachHandle} theme={theme} />
    </ShareCardShell>
  );
}
