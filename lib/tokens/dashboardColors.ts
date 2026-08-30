/**
 * Cores usadas em strings JS (SVG stroke, inline styles).
 * Preferir var(--cal-*) / var(--brand-*) em CSS quando possível.
 * Valores alinhados a app/design-tokens.css (60-30-10).
 */
export const dashboardColors = {
  bgDeep: '#000000',
  bgHero: '#141414',
  bgCard: '#141414',
  bgCardHover: '#222222',
  accent: '#D4A843', // var(--brand-primary)
  accentLight: '#B8902F', // var(--brand-hover)
  accentGlow: '#D4A84333',
  success: '#39c75a',
  warning: '#F59E0B',
  danger: '#e05555',
  streak: '#F97316',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#737373',
  /** var(--cal-done) */
  calDone: '#39c75a',
  /** var(--cal-missed) */
  calMissed: '#e05555',
  /** var(--cal-today) */
  calToday: '#D4A843',
  /** var(--cal-upcoming) */
  calUpcoming: '#7a8aab',
  /** var(--cal-rest) */
  calRest: '#444444',
} as const;
