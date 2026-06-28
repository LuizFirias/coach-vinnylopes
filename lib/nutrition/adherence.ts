import { NutritionMealCheckin, NutritionMealCheckinStatus } from './types';

export interface AdherenceSummary {
  plannedMeals: number;
  completedMeals: number;
  partialMeals: number;
  skippedMeals: number;
  adherencePercent: number;
}

/**
 * Retorna o peso de adesão para cada status do check-in.
 */
export function getStatusAdherenceWeight(status: NutritionMealCheckinStatus | string): number {
  switch (status) {
    case 'done':
    case 'substituted':
      return 1.0;
    case 'partial':
      return 0.5;
    case 'skipped':
    default:
      return 0.0;
  }
}

/**
 * Calcula a adesão de um conjunto de check-ins contra uma quantidade de refeições planejadas.
 */
export function calculateAdherence(
  checkins: { status: string }[],
  plannedMealsCount: number
): AdherenceSummary {
  if (plannedMealsCount === 0) {
    return {
      plannedMeals: 0,
      completedMeals: 0,
      partialMeals: 0,
      skippedMeals: 0,
      adherencePercent: 100
    };
  }

  let completedMeals = 0;
  let partialMeals = 0;
  let skippedMeals = 0;
  let weightSum = 0;

  checkins.forEach(c => {
    const weight = getStatusAdherenceWeight(c.status);
    weightSum += weight;

    if (c.status === 'done' || c.status === 'substituted') {
      completedMeals++;
    } else if (c.status === 'partial') {
      partialMeals++;
    } else if (c.status === 'skipped') {
      skippedMeals++;
    }
  });

  // Calculate percentage
  const adherencePercent = Math.min(100, Math.round((weightSum / plannedMealsCount) * 100));

  return {
    plannedMeals: plannedMealsCount,
    completedMeals,
    partialMeals,
    skippedMeals,
    adherencePercent
  };
}

/**
 * Retorna as refeições planejadas que foram puladas (skipped).
 */
export function getMissedMeals(checkins: any[], plannedMeals: any[]) {
  const skippedIds = new Set(
    checkins.filter(c => c.status === 'skipped').map(c => c.meal_id)
  );
  return plannedMeals.filter(m => skippedIds.has(m.id));
}
