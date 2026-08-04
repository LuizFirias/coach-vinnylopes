import { BrandFooter } from '@/app/components/workout/share/BrandFooter';
import { ShareCardShell } from '@/app/components/workout/share/ShareCardShell';
import { formatShareVolume, type ShareTheme, getShareThemeTokens } from '@/lib/utils/workoutShare';

export interface WorkoutSummaryCardProps {
  workoutName: string;
  durationFormatted: string;
  volumeKg: number;
  totalSets: number;
  coachHandle: string;
  theme?: ShareTheme;
}

export function WorkoutSummaryCard({
  durationFormatted,
  volumeKg,
  totalSets,
  coachHandle,
  theme = 'escuro',
}: WorkoutSummaryCardProps) {
  const tokens = getShareThemeTokens(theme);

  const metricBlock = (value: string, label: string, accent = false) => (
    <div style={{ alignItems: 'center', margin: '36px 0', textAlign: 'center' }}>
      <p
        style={{
          fontSize: 128,
          fontWeight: 900,
          color: accent ? tokens.accent : tokens.text,
          lineHeight: '120px',
          letterSpacing: -3,
          margin: 0,
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontSize: 32,
          fontWeight: 500,
          color: tokens.textSecondary,
          marginTop: 10,
          marginBottom: 0,
        }}
      >
        {label}
      </p>
    </div>
  );

  return (
    <ShareCardShell theme={theme}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {metricBlock(durationFormatted, 'Duração')}
        {metricBlock(formatShareVolume(volumeKg), 'Volume Total', true)}
        {metricBlock(String(totalSets), 'Séries')}
      </div>

      <BrandFooter coachHandle={coachHandle} theme={theme} />
    </ShareCardShell>
  );
}
