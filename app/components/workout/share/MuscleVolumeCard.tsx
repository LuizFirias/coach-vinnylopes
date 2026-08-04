import { BrandFooter } from '@/app/components/workout/share/BrandFooter';
import { ShareCardShell } from '@/app/components/workout/share/ShareCardShell';
import { getShareThemeTokens, type ShareTheme } from '@/lib/utils/workoutShare';

export interface MuscleVolumeItem {
  musculo: string;
  series: number;
}

export interface MuscleVolumeCardProps {
  workoutName: string;
  grupos: MuscleVolumeItem[];
  totalSeries: number;
  duracaoSegundos: number;
  coachHandle: string;
  theme?: ShareTheme;
}

export function MuscleVolumeCard({
  workoutName,
  grupos,
  totalSeries,
  duracaoSegundos,
  coachHandle,
  theme = 'escuro',
}: MuscleVolumeCardProps) {
  const tokens = getShareThemeTokens(theme);
  const visiveis = grupos.slice(0, 6);
  const maxSeries = Math.max(...visiveis.map((g) => g.series), 1);
  const horas = Math.floor(duracaoSegundos / 3600);
  const minutos = Math.floor((duracaoSegundos % 3600) / 60);
  const duracaoLabel = horas > 0 ? `${horas}h ${minutos}min` : `${minutos}min`;

  return (
    <ShareCardShell theme={theme}>
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: '52px 48px 110px 48px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: tokens.text,
            margin: '0 0 32px 0',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {workoutName}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, flex: 1 }}>
          {visiveis.map((g) => {
            const pct = Math.round((g.series / maxSeries) * 100);
            return (
              <div key={g.musculo} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 26, color: tokens.textSecondary, fontWeight: 500 }}>
                    {g.musculo}
                  </span>
                  <span
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: tokens.accent,
                      fontVariantNumeric: 'tabular-nums lining-nums',
                    }}
                  >
                    {g.series} séries
                  </span>
                </div>
                <div
                  style={{
                    height: 10,
                    background: tokens.divider,
                    borderRadius: 5,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: 10,
                      width: `${pct}%`,
                      background: tokens.accent,
                      borderRadius: 5,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 32,
            marginTop: 28,
            paddingTop: 8,
          }}
        >
          <span
            style={{
              fontSize: 24,
              color: tokens.textTertiary,
              fontVariantNumeric: 'tabular-nums lining-nums',
            }}
          >
            {totalSeries} séries
          </span>
          <span
            style={{
              fontSize: 24,
              color: tokens.textTertiary,
              fontVariantNumeric: 'tabular-nums lining-nums',
            }}
          >
            {duracaoLabel}
          </span>
        </div>
      </div>

      <BrandFooter coachHandle={coachHandle} theme={theme} />
    </ShareCardShell>
  );
}
