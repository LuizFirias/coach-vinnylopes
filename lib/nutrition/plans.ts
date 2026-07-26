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

const MEAL_ITEM_SELECT =
  '*, food:nutrition_foods(*, portions:nutrition_food_portions(*)), substitutions:nutrition_substitutions(*, food:nutrition_foods(*, portions:nutrition_food_portions(*)))';

/**
 * Monta a árvore dia → refeições → itens (+ substituições) com poucas queries em lote.
 * Substitui o antigo N+1 sequencial (dezenas de round-trips).
 */
async function hydratePlanDays(
  days: Array<Record<string, unknown> & { id: string }>,
  client = supabaseClient,
): Promise<any[]> {
  if (!days.length) return [];

  const dayIds = days.map((d) => d.id);
  const { data: meals } = await client
    .from('nutrition_meals')
    .select('*')
    .in('plan_day_id', dayIds)
    .order('sort_order', { ascending: true });

  const mealList = meals ?? [];
  const mealIds = mealList.map((m) => m.id as string);

  let items: any[] = [];
  if (mealIds.length) {
    // Preferência: embed de substituições numa única query
    const nested = await client
      .from('nutrition_meal_items')
      .select(MEAL_ITEM_SELECT)
      .in('meal_id', mealIds)
      .order('sort_order', { ascending: true });

    if (!nested.error && nested.data) {
      items = nested.data;
    } else {
      // Fallback: 2 queries em lote se o embed falhar (FK ambígua etc.)
      const { data: baseItems } = await client
        .from('nutrition_meal_items')
        .select('*, food:nutrition_foods(*, portions:nutrition_food_portions(*))')
        .in('meal_id', mealIds)
        .order('sort_order', { ascending: true });

      const itemList = baseItems ?? [];
      const itemIds = itemList.map((i) => i.id as string);
      let subs: any[] = [];
      if (itemIds.length) {
        const { data: subRows } = await client
          .from('nutrition_substitutions')
          .select('*, food:nutrition_foods(*, portions:nutrition_food_portions(*))')
          .in('meal_item_id', itemIds);
        subs = subRows ?? [];
      }
      const subsByItem = new Map<string, any[]>();
      for (const sub of subs) {
        const key = sub.meal_item_id as string;
        const bucket = subsByItem.get(key) ?? [];
        bucket.push(sub);
        subsByItem.set(key, bucket);
      }
      items = itemList.map((item) => ({
        ...item,
        substitutions: subsByItem.get(item.id as string) ?? [],
      }));
    }
  }

  const itemsByMeal = new Map<string, any[]>();
  for (const item of items) {
    const key = item.meal_id as string;
    const bucket = itemsByMeal.get(key) ?? [];
    bucket.push(item);
    itemsByMeal.set(key, bucket);
  }

  const mealsByDay = new Map<string, any[]>();
  for (const meal of mealList) {
    const key = meal.plan_day_id as string;
    const bucket = mealsByDay.get(key) ?? [];
    bucket.push({
      ...meal,
      items: itemsByMeal.get(meal.id as string) ?? [],
    });
    mealsByDay.set(key, bucket);
  }

  return days.map((day) => ({
    ...day,
    meals: mealsByDay.get(day.id) ?? [],
  }));
}

/**
 * Retorna os detalhes completos de um plano alimentar, incluindo dias, refeições e itens.
 * ~3–4 round-trips em lote (antes: N+1 por refeição/item).
 */
export async function getFullPlanDetails(planId: string, client = supabaseClient): Promise<any> {
  const [{ data: plan, error: planError }, { data: days, error: daysError }] = await Promise.all([
    client.from('nutrition_plans').select('*').eq('id', planId).single(),
    client
      .from('nutrition_plan_days')
      .select('*')
      .eq('plan_id', planId)
      .order('day_index', { ascending: true }),
  ]);

  if (planError || !plan) {
    console.error(`[getFullPlanDetails] Erro ao carregar plano ${planId}:`, planError);
    return null;
  }

  if (daysError || !days?.length) return { ...plan, days: [] };

  const daysWithDetails = await hydratePlanDays(days as Array<Record<string, unknown> & { id: string }>, client);
  return { ...plan, days: daysWithDetails };
}

/**
 * Bundle da tela do aluno: plano ativo (só dia 1) + PDFs + água + check-ins — em paralelo.
 * Evita a API /digital e o hop auth.getUser do servidor.
 */
export async function loadStudentNutritionPageData(
  studentId: string,
  todayISO: string,
  client = supabaseClient,
): Promise<{
  digitalPlan: any | null;
  plansPDF: any[];
  agua: { id: string; copos: number; ml_por_copo: number } | null;
  checkins: Array<{ meal_id: string; status: string }>;
}> {
  const [planRes, pdfRes, aguaRes, checkinsRes] = await Promise.all([
    client
      .from('nutrition_plans')
      .select(
        'id, name, goal, notes, orientacoes_gerais, calories_target, protein_target, carbs_target, fat_target, status',
      )
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from('plano_alimentar_pdf')
      .select('id, aluno_id, nome_arquivo, descricao, criado_em, url_pdf')
      .eq('aluno_id', studentId)
      .order('criado_em', { ascending: false }),
    client
      .from('registros_agua')
      .select('id, copos, ml_por_copo')
      .eq('aluno_id', studentId)
      .eq('data_registro', todayISO)
      .maybeSingle(),
    client
      .from('nutrition_meal_checkins')
      .select('meal_id, status')
      .eq('student_id', studentId)
      .eq('checkin_date', todayISO),
  ]);

  let digitalPlan: any | null = null;
  const planMeta = planRes.data;
  if (planMeta?.id) {
    const { data: day } = await client
      .from('nutrition_plan_days')
      .select('*')
      .eq('plan_id', planMeta.id)
      .eq('day_index', 1)
      .maybeSingle();

    if (day) {
      const [hydrated] = await hydratePlanDays(
        [day as Record<string, unknown> & { id: string }],
        client,
      );
      digitalPlan = { ...planMeta, days: [hydrated] };
    } else {
      digitalPlan = { ...planMeta, days: [] };
    }
  }

  return {
    digitalPlan,
    plansPDF: pdfRes.data ?? [],
    agua: aguaRes.data ?? null,
    checkins: checkinsRes.data ?? [],
  };
}
