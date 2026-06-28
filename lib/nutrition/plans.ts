import { supabaseClient } from '@/lib/supabaseClient';
import { NutritionPlan, NutritionPlanDay, NutritionMeal, NutritionMealItem, NutritionSubstitution } from './types';
import { calculateItemMacros, sumMacros, CalculatedMacro } from './calculateMacros';

/**
 * Cria ou atualiza um plano alimentar.
 */
export async function saveNutritionPlan(
  plan: Omit<NutritionPlan, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<NutritionPlan> {
  const payload = {
    ...plan,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseClient
    .from('nutrition_plans')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error('[saveNutritionPlan] Erro:', error);
    throw error;
  }

  return data;
}

/**
 * Busca o plano alimentar ativo (ou o mais recente) de um aluno.
 */
export async function getNutritionPlanByStudent(studentId: string, client = supabaseClient): Promise<NutritionPlan | null> {
  const { data, error } = await client
    .from('nutrition_plans')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`[getNutritionPlanByStudent] Erro para o aluno ${studentId}:`, error);
    return null;
  }

  // Tenta encontrar um ativo, caso contrário retorna o mais recente
  const activePlan = data?.find(p => p.status === 'active');
  return activePlan || data?.[0] || null;
}

/**
 * Retorna os planos criados por um coach.
 */
export async function getNutritionPlanByCoach(coachId: string): Promise<NutritionPlan[]> {
  const { data, error } = await supabaseClient
    .from('nutrition_plans')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`[getNutritionPlanByCoach] Erro para o coach ${coachId}:`, error);
    return [];
  }

  return data || [];
}

/**
 * Calcula a soma de macros de uma refeição específica.
 */
export async function calculateMealMacros(mealId: string): Promise<CalculatedMacro> {
  const { data: items, error } = await supabaseClient
    .from('nutrition_meal_items')
    .select('*, food:nutrition_foods(*)')
    .eq('meal_id', mealId);

  if (error || !items) {
    console.error(`[calculateMealMacros] Erro ao buscar itens para refeição ${mealId}:`, error);
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }

  const itemMacros = items.map(item => {
    const food = item.food;
    if (!food) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    return calculateItemMacros(food, Number(item.quantity_grams));
  });

  return sumMacros(itemMacros);
}

/**
 * Calcula a soma total de macros de um plano alimentar para um dia de plano (MVP considera Dia 1).
 */
export async function calculatePlanMacros(planId: string, dayIndex: number = 1): Promise<CalculatedMacro> {
  // Busca o dia do plano correspondente
  const { data: day, error: dayError } = await supabaseClient
    .from('nutrition_plan_days')
    .select('id')
    .eq('plan_id', planId)
    .eq('day_index', dayIndex)
    .single();

  if (dayError || !day) {
    console.error(`[calculatePlanMacros] Erro ao buscar dia ${dayIndex} para o plano ${planId}:`, dayError);
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }

  // Busca todas as refeições do dia
  const { data: meals, error: mealsError } = await supabaseClient
    .from('nutrition_meals')
    .select('id')
    .eq('plan_day_id', day.id);

  if (mealsError || !meals) {
    console.error(`[calculatePlanMacros] Erro ao buscar refeições:`, mealsError);
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }

  const mealMacros: CalculatedMacro[] = [];
  for (const meal of meals) {
    const macros = await calculateMealMacros(meal.id);
    mealMacros.push(macros);
  }

  return sumMacros(mealMacros);
}

/**
 * Retorna os detalhes completos de um plano alimentar, incluindo dias, refeições e itens.
 */
export async function getFullPlanDetails(planId: string, client = supabaseClient): Promise<any> {
  const { data: plan, error: planError } = await client
    .from('nutrition_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError || !plan) {
    console.error(`[getFullPlanDetails] Erro ao carregar plano ${planId}:`, planError);
    return null;
  }

  const { data: days, error: daysError } = await client
    .from('nutrition_plan_days')
    .select('*')
    .eq('plan_id', planId)
    .order('day_index', { ascending: true });

  if (daysError || !days) return { ...plan, days: [] };

  const daysWithDetails = [];
  for (const day of days) {
    const { data: meals, error: mealsError } = await client
      .from('nutrition_meals')
      .select('*')
      .eq('plan_day_id', day.id)
      .order('sort_order', { ascending: true });

    const mealsWithDetails = [];
    if (meals) {
      for (const meal of meals) {
        const { data: items, error: itemsError } = await client
          .from('nutrition_meal_items')
          .select('*, food:nutrition_foods(*)')
          .eq('meal_id', meal.id)
          .order('sort_order', { ascending: true });

        const itemsWithSubstitutions = [];
        if (items) {
          for (const item of items) {
            const { data: subs } = await client
              .from('nutrition_substitutions')
              .select('*, food:nutrition_foods(*)')
              .eq('meal_item_id', item.id);
            
            itemsWithSubstitutions.push({
              ...item,
              substitutions: subs || []
            });
          }
        }

        mealsWithDetails.push({
          ...meal,
          items: itemsWithSubstitutions
        });
      }
    }

    daysWithDetails.push({
      ...day,
      meals: mealsWithDetails
    });
  }

  return {
    ...plan,
    days: daysWithDetails
  };
}
