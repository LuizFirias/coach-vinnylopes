import { SHARE_CARD, type ShareTheme, getShareThemeTokens } from '@/lib/utils/workoutShare';

interface ShareCardShellProps {
  children: React.ReactNode;
  theme?: ShareTheme;
}

export function ShareCardShell({ children, theme = 'escuro' }: ShareCardShellProps) {
  const tokens = getShareThemeTokens(theme);

  return (
    <div
      style={{
        width: SHARE_CARD.width,
        height: SHARE_CARD.height,
        backgroundColor: tokens.bg,
        borderRadius: SHARE_CARD.radius,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {children}
    </div>
  );
}
