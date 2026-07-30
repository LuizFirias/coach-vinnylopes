/**
 * Cores usadas em strings JS (SVG stroke, inline styles).
 * Preferir var(--cal-*) / var(--brand-*) em CSS quando possível.
 * Valores alinhados a app/design-tokens.css (SKILL.md AURON).
 */
export const dashboardColors = {
  bgDeep: '#080C14',
  bgHero: '#0F1829',
  bgCard: '#111827',
  bgCardHover: '#1A2336',
  accent: '#9333ea', // var(--brand-primary)
  accentLight: '#a855f7', // var(--brand-hover)
  accentGlow: '#9333ea33',
  success: '#39c75a',
  warning: '#F59E0B',
  danger: '#e05555',
  streak: '#F97316',
  textPrimary: '#D8DCE6',
  textSecondary: '#9CA3AF',
  textMuted: '#4B5563',
  /** var(--cal-done) */
  calDone: '#39c75a',
  /** var(--cal-missed) */
  calMissed: '#e05555',
  /** var(--cal-today) */
  calToday: '#9333ea',
  /** var(--cal-upcoming) */
  calUpcoming: '#7a8aab',
  /** var(--cal-rest) */
  calRest: '#444444',
} as const;
