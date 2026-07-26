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

/** Campos mínimos do alimento para macros + exibição de porção */
const FOOD_EMBED =
  'id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, portions:nutrition_food_portions(label, grams)';

/** Itens sem substituições — query leve e estável */
const MEAL_ITEM_SELECT = `id, meal_id, food_id, quantity_grams, portion_label, notes, sort_order, food:nutrition_foods(${FOOD_EMBED})`;

/**
 * Substituições: a FK é substitute_food_id (não food_id).
 * Sem o !hint o PostgREST gera join inválido/lento → statement timeout.
 */
const SUB_SELECT = `id, meal_item_id, quantity_grams, portion_label, notes, food:nutrition_foods!substitute_food_id(${FOOD_EMBED})`;

type HydrateOptions = {
  /** Default true. Na tela do aluno pode adiar para first paint. */
  includeSubstitutions?: boolean;
};

/**
 * Monta a árvore dia → refeições → itens (+ substituições opcionais) em lote.
 * Nunca usa embed profundo de substitutions (timeout no PostgREST).
 */
async function hydratePlanDays(
  days: Array<Record<string, unknown> & { id: string }>,
  client = supabaseClient,
  options: HydrateOptions = {},
): Promise<any[]> {
  const includeSubstitutions = options.includeSubstitutions !== false;
  if (!days.length) return [];

  const dayIds = days.map((d) => d.id);
  const { data: meals } = await client
    .from('nutrition_meals')
    .select('id, plan_day_id, title, time_suggestion, notes, sort_order, meal_type')
    .in('plan_day_id', dayIds)
    .order('sort_order', { ascending: true });

  const mealList = meals ?? [];
  const mealIds = mealList.map((m) => m.id as string);

  let items: any[] = [];
  if (mealIds.length) {
    const { data: itemRows, error: itemsError } = await client
      .from('nutrition_meal_items')
      .select(MEAL_ITEM_SELECT)
      .in('meal_id', mealIds)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      console.error('[hydratePlanDays] Erro ao carregar itens:', itemsError);
    }

    const itemList = itemRows ?? [];

    if (includeSubstitutions && itemList.length) {
      const itemIds = itemList.map((i) => i.id as string);
      const { data: subRows, error: subsError } = await client
        .from('nutrition_substitutions')
        .select(SUB_SELECT)
        .in('meal_item_id', itemIds);

      if (subsError) {
        console.warn('[hydratePlanDays] Substituições omitidas:', subsError.message);
        items = itemList.map((item) => ({ ...item, substitutions: [] }));
      } else {
        const subsByItem = new Map<string, any[]>();
        for (const sub of subRows ?? []) {
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
    } else {
      items = itemList.map((item) => ({ ...item, substitutions: [] as any[] }));
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
 * Enriquece um plano já hidratado com substituições (após first paint).
 */
export async function attachMealSubstitutions(
  plan: any,
  client = supabaseClient,
): Promise<any> {
  const day = plan?.days?.[0];
  const meals = day?.meals ?? [];
  const items = meals.flatMap((m: any) => m.items ?? []);
  const itemIds = items.map((i: any) => i.id).filter(Boolean) as string[];
  if (!itemIds.length) return plan;

  const { data: subRows, error } = await client
    .from('nutrition_substitutions')
    .select(SUB_SELECT)
    .in('meal_item_id', itemIds);

  if (error || !subRows?.length) {
    if (error) console.warn('[attachMealSubstitutions]', error.message);
    return plan;
  }

  const subsByItem = new Map<string, any[]>();
  for (const sub of subRows) {
    const key = sub.meal_item_id as string;
    const bucket = subsByItem.get(key) ?? [];
    bucket.push(sub);
    subsByItem.set(key, bucket);
  }

  return {
    ...plan,
    days: plan.days.map((d: any, idx: number) => {
      if (idx !== 0) return d;
      return {
        ...d,
        meals: (d.meals ?? []).map((meal: any) => ({
          ...meal,
          items: (meal.items ?? []).map((item: any) => ({
            ...item,
            substitutions: subsByItem.get(item.id) ?? [],
          })),
        })),
      };
    }),
  };
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

  const daysWithDetails = await hydratePlanDays(
    days as Array<Record<string, unknown> & { id: string }>,
    client,
    { includeSubstitutions: true },
  );
  return { ...plan, days: daysWithDetails };
}

/**
 * Bundle da tela do aluno: plano ativo (só dia 1) + PDFs + água + check-ins — em paralelo.
 * Itens sem substituições no caminho crítico; use attachMealSubstitutions depois.
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
      .select('id, plan_id, day_index, label, notes')
      .eq('plan_id', planMeta.id)
      .eq('day_index', 1)
      .maybeSingle();

    if (day) {
      const [hydrated] = await hydratePlanDays(
        [day as Record<string, unknown> & { id: string }],
        client,
        { includeSubstitutions: false },
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

