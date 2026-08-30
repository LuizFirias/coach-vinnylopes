import { BrandFooter } from '@/app/components/workout/share/BrandFooter';
import { ShareCardShell } from '@/app/components/workout/share/ShareCardShell';
import {
  formatShareVolume,
  getShareThemeTokens,
  toShareTitleCase,
  type ShareTheme,
} from '@/lib/utils/workoutShare';

export interface ReceiptExercicio {
  nome: string;
  series: number;
  cargaMax: number;
  unidade?: string;
}

export interface ReceiptCardProps {
  workoutName: string;
  exercicios: ReceiptExercicio[];
  volumeTotal: number;
  duracaoSegundos: number;
  coachHandle: string;
  theme?: ShareTheme;
  maxVisible?: number;
}

export function ReceiptCard({
  workoutName,
  exercicios,
  volumeTotal,
  duracaoSegundos,
  coachHandle,
  theme = 'escuro',
  maxVisible = 6,
}: ReceiptCardProps) {
  const tokens = getShareThemeTokens(theme);
  const visiveis = exercicios.slice(0, maxVisible);
  const restantes = exercicios.length - maxVisible;
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
            fontSize: 60,
            fontWeight: 900,
            color: tokens.text,
            margin: '0 0 36px 0',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            lineHeight: 1.05,
          }}
        >
          {workoutName}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
          {visiveis.map((ex) => (
            <div
              key={ex.nome}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  fontSize: 44,
                  color: tokens.textExercise,
                  fontWeight: 500,
                  flex: 1,
                  paddingRight: 12,
                  lineHeight: 1.2,
                }}
              >
                {toShareTitleCase(ex.nome)}
              </span>
              <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 32,
                    color: tokens.textTertiary,
                    fontVariantNumeric: 'tabular-nums lining-nums',
                  }}
                >
                  {ex.series}×
                </span>
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: tokens.accent,
                    fontVariantNumeric: 'tabular-nums lining-nums',
                    minWidth: 100,
                    textAlign: 'right',
                  }}
                >
                  {ex.cargaMax > 0 ? `${ex.cargaMax} ${ex.unidade ?? 'kg'}` : '—'}
                </span>
              </div>
            </div>
          ))}

          {restantes > 0 && (
            <p style={{ fontSize: 28, color: tokens.textTertiary, margin: 0 }}>
              +{restantes} exercício{restantes > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginTop: 28,
          }}
        >
          <span
            style={{
              fontSize: 24,
              color: tokens.textTertiary,
              fontVariantNumeric: 'tabular-nums lining-nums',
            }}
          >
            {duracaoLabel}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 24, color: tokens.textSecondary }}>Volume</span>
            <span
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: tokens.text,
                fontVariantNumeric: 'tabular-nums lining-nums',
              }}
            >
              {formatShareVolume(volumeTotal)}
            </span>
          </div>
        </div>
      </div>

      <BrandFooter coachHandle={coachHandle} theme={theme} />
    </ShareCardShell>
  );
}
