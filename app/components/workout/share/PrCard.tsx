import { BrandFooter } from '@/app/components/workout/share/BrandFooter';
import { ShareCardShell } from '@/app/components/workout/share/ShareCardShell';
import { getShareThemeTokens, type ShareTheme } from '@/lib/utils/workoutShare';

export interface PrCardProps {
  exercicioNome: string;
  cargaNova: number;
  cargaAnterior: number;
  unidade?: string;
  prsCount?: number;
  coachHandle: string;
  theme?: ShareTheme;
}

export function PrCard({
  exercicioNome,
  cargaNova,
  cargaAnterior,
  unidade = 'kg',
  prsCount = 1,
  coachHandle,
  theme = 'escuro',
}: PrCardProps) {
  const tokens = getShareThemeTokens(theme);
  const delta = Math.round((cargaNova - cargaAnterior) * 10) / 10;
  const extras = Math.max(0, prsCount - 1);

  return (
    <ShareCardShell theme={theme}>
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: '140px 48px 110px 48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/trofeu.png"
          alt=""
          width={200}
          height={200}
          style={{
            width: 200,
            height: 200,
            objectFit: 'contain',
            marginBottom: 36,
            flexShrink: 0,
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <p
            style={{
              fontSize: 44,
              fontWeight: 500,
              color: tokens.textSecondary,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {exercicioNome}
          </p>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 12 }}>
            <span
              style={{
                fontSize: 128,
                fontWeight: 900,
                color: tokens.text,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                fontVariantNumeric: 'tabular-nums lining-nums',
              }}
            >
              {cargaNova}
            </span>
            <span style={{ fontSize: 40, fontWeight: 700, color: tokens.accent }}>
              {unidade}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              marginTop: 8,
            }}
          >
            {cargaAnterior > 0 && (
              <span
                style={{
                  fontSize: 32,
                  color: tokens.textSecondary,
                  textDecoration: 'line-through',
                  fontVariantNumeric: 'tabular-nums lining-nums',
                }}
              >
                {cargaAnterior} {unidade}
              </span>
            )}
            {delta > 0 && (
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: tokens.success,
                  fontVariantNumeric: 'tabular-nums lining-nums',
                }}
              >
                +{delta} {unidade} ↑
              </span>
            )}
          </div>

          {extras > 0 && (
            <p
              style={{
                fontSize: 26,
                color: tokens.textTertiary,
                margin: '8px 0 0',
              }}
            >
              e mais {extras} recorde{extras > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      <BrandFooter coachHandle={coachHandle} theme={theme} />
    </ShareCardShell>
  );
}
