import { NutritionMealCheckinStatus } from './types';

export interface AdherenceSummary {
  plannedMeals: number;
  completedMeals: number;
  partialMeals: number;
  skippedMeals: number;
  adherencePercent: number;
}

export interface DailyAdherencePoint {
  /** Label curto do eixo X (ex.: seg, ter) */
  date: string;
  /** ISO yyyy-mm-dd */
  isoDate: string;
  value: number;
}

const WEEKDAY_SHORT_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

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

  const adherencePercent = Math.min(100, Math.round((weightSum / plannedMealsCount) * 100));

  return {
    plannedMeals: plannedMealsCount,
    completedMeals,
    partialMeals,
    skippedMeals,
    adherencePercent
  };
}

function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Série diária dos últimos `days` dias (padrão 7), mesma regra de peso
 * usada nos KPIs (done/substituted = 1, partial = 0.5).
 * Sempre devolve um ponto por dia — dias sem check-in ficam em 0%.
 */
export function buildDailyAdherenceSeries(
  checkins: { checkin_date: string; status: string }[],
  plannedMealsPerDay: number,
  days = 7,
  endDate: Date = new Date(),
): DailyAdherencePoint[] {
  const end = new Date(endDate);
  end.setHours(12, 0, 0, 0);

  const byDay = new Map<string, number>();
  for (const c of checkins) {
    const key = c.checkin_date.slice(0, 10);
    byDay.set(key, (byDay.get(key) || 0) + getStatusAdherenceWeight(c.status));
  }

  const series: DailyAdherencePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const iso = toLocalISODate(d);
    const weightSum = byDay.get(iso) || 0;
    const value =
      plannedMealsPerDay > 0
        ? Math.min(100, Math.round((weightSum / plannedMealsPerDay) * 100))
        : 0;
    series.push({
      date: WEEKDAY_SHORT_PT[d.getDay()],
      isoDate: iso,
      value,
    });
  }
  return series;
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
