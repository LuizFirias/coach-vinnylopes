import type { NutritionFood, NutritionMealType } from '@/lib/nutrition/types';
import { supabaseClient } from '@/lib/supabaseClient';

export const MEAL_TYPE_LABELS: Record<NutritionMealType, string> = {
  cafe_da_manha: 'Café da manhã',
  lanche_manha: 'Lanche da manhã',
  almoco: 'Almoço',
  pre_treino: 'Pré-treino',
  pos_treino: 'Pós-treino',
  lanche_tarde: 'Lanche da tarde',
  jantar: 'Jantar',
  ceia: 'Ceia',
  refeicao_livre: 'Refeição livre',
};

export const MEAL_TYPE_OPTIONS = (
  Object.entries(MEAL_TYPE_LABELS) as [NutritionMealType, string][]
).map(([value, label]) => ({ value, label }));

const FOOD_CACHE_KEY = 'auron_food_library_v2';
const FOOD_CACHE_TIME_KEY = 'auron_food_library_v2_time';
const FOOD_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function loadFoodLibrary(): Promise<NutritionFood[]> {
  try {
    const cached = typeof window !== 'undefined' ? localStorage.getItem(FOOD_CACHE_KEY) : null;
    const cachedAt = typeof window !== 'undefined' ? localStorage.getItem(FOOD_CACHE_TIME_KEY) : null;
    if (cached && cachedAt && Date.now() - Number(cachedAt) < FOOD_CACHE_TTL_MS) {
      return JSON.parse(cached) as NutritionFood[];
    }
  } catch {
    /* ignore cache */
  }

  const { data, error } = await supabaseClient
    .from('nutrition_foods')
    .select('*, portions:nutrition_food_portions(*)')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  const foods = (data || []) as NutritionFood[];

  try {
    localStorage.setItem(FOOD_CACHE_KEY, JSON.stringify(foods));
    localStorage.setItem(FOOD_CACHE_TIME_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }

  return foods;
}

/** Normaliza meals do plano (API) para o payload de save. */
export function serializeMealsForSave(meals: any[]) {
  return meals.map((m, idx) => ({
    meal_type: m.meal_type,
    title: m.title,
    time_suggestion: m.time_suggestion
      ? m.time_suggestion.length === 5
        ? `${m.time_suggestion}:00`
        : m.time_suggestion
      : null,
    notes: m.notes || null,
    sort_order: idx,
    items: (m.items || []).map((it: any, itemIdx: number) => ({
      food_id: it.food_id || it.food?.id,
      quantity_grams: Number(it.quantity_grams),
      portion_label: it.portion_label || null,
      notes: it.notes || null,
      sort_order: itemIdx,
      substitutions: (it.substitutions || []).map((sub: any) => ({
        substitute_food_id: sub.substitute_food_id || sub.food?.id,
        quantity_grams: Number(sub.quantity_grams),
        portion_label: sub.portion_label || null,
        notes: sub.notes || null,
      })),
    })),
  }));
}

export async function saveNutritionPlanPayload(
  accessToken: string,
  payload: { id?: string; plan: Record<string, unknown>; meals: unknown[] },
): Promise<{ planId: string }> {
  const response = await fetch('/api/admin/nutricao/plans', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao salvar plano');
  return { planId: data.planId as string };
}
