import { MUSCLE_HIGHLIGHTER_MAP } from '@/lib/utils/workoutShare';
import { resolveMuscleGroup } from '@/lib/constants/muscle-groups';

/** Converte intensidade por grupo muscular (0–10) em dados do highlighter */
export function buildIntensityHighlightData(
  muscleIntensity: Record<string, number>,
  accentRgb = '37, 99, 235',
): Array<{ slug: string; color: string }> {
  const normalizedIntensity: Record<string, number> = {};
  for (const [key, value] of Object.entries(muscleIntensity)) {
    const canonical = resolveMuscleGroup(key);
    normalizedIntensity[canonical] = (normalizedIntensity[canonical] || 0) + value;
  }

  const list: Array<{ slug: string; color: string }> = [];

  Object.entries(MUSCLE_HIGHLIGHTER_MAP).forEach(([slug, muscleGroups]) => {
    const intensities = muscleGroups.map((g) => normalizedIntensity[g] || 0);
    const maxIntensity = Math.max(...intensities, 0);

    if (maxIntensity > 0) {
      const opacity = 0.2 + (maxIntensity / 10) * 0.75;
      list.push({
        slug,
        color: `rgba(${accentRgb}, ${opacity.toFixed(2)})`,
      });
    }
  });

  return list;
}
