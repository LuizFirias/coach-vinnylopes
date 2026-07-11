import { type ShareTheme, getShareThemeTokens } from '@/lib/utils/workoutShare';

interface BrandFooterProps {
  coachHandle: string;
  theme?: ShareTheme;
}

export function BrandFooter({ coachHandle, theme = 'escuro' }: BrandFooterProps) {
  const tokens = getShareThemeTokens(theme);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 36,
        left: 44,
        right: 44,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <p
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: tokens.text,
          letterSpacing: 2.5,
          margin: 0,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        AURONFIT
      </p>
      <p
        style={{
          fontSize: 26,
          color: tokens.textSecondary,
          margin: 0,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {coachHandle.trim() || '@auronfit'}
      </p>
    </div>
  );
}

