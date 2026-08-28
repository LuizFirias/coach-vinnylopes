import { type ShareTheme, getShareThemeTokens } from '@/lib/utils/workoutShare';

interface StatItemProps {
  label: string;
  value: string;
  accent?: boolean;
  labelSize?: number;
  valueSize?: number;
  theme?: ShareTheme;
}

export function StatItem({
  label,
  value,
  accent = false,
  labelSize = 24,
  valueSize = 38,
  theme = 'escuro',
}: StatItemProps) {
  const tokens = getShareThemeTokens(theme);

  return (
    <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
      <p
        style={{
          fontSize: labelSize,
          color: tokens.textSecondary,
          margin: 0,
          marginBottom: 6,
          fontFamily: 'Inter, sans-serif',
          textTransform: labelSize <= 16 ? 'uppercase' : 'none',
          letterSpacing: labelSize <= 16 ? 1.2 : 0,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: valueSize,
          fontWeight: 700,
          color: accent ? tokens.accent : tokens.text,
          margin: 0,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {value}
      </p>
    </div>
  );
}
