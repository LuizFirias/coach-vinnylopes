type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export function haptic(pattern: HapticPattern = 'light') {
  if (typeof window === 'undefined' || !navigator.vibrate) return;

  const patterns: Record<HapticPattern, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10],
    warning: [20, 100, 20],
    error: [50, 100, 50, 100, 50],
  };

  navigator.vibrate(patterns[pattern]);
}
