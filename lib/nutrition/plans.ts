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
  'id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, portions:nutrition_food_portions(label, grams, is_default)';

/** Itens sem substituições — query leve e estável */
const MEAL_ITEM_SELECT = `id, meal_id, food_id, quantity_grams, portion_label, notes, sort_order, food:nutrition_foods(${FOOD_EMBED})`;

/**
 * Substituições: FK substitute_food_id.
 * Select leve (sem portions aninhadas) + chunks — evita timeout/500 no PostgREST.
 */
const SUB_FOOD_EMBED =
  'id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g';
const SUB_SELECT = `id, meal_item_id, quantity_grams, portion_label, notes, food:nutrition_foods!substitute_food_id(${SUB_FOOD_EMBED})`;
const SUB_CHUNK_SIZE = 40;

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
      const subRows = await fetchSubstitutionsByItemIds(itemIds, client);

      if (!subRows.length) {
        items = itemList.map((item) => ({ ...item, substitutions: [], _subsLoaded: true }));
      } else {
        const subsByItem = new Map<string, any[]>();
        for (const sub of subRows) {
          const key = sub.meal_item_id as string;
          const bucket = subsByItem.get(key) ?? [];
          bucket.push(sub);
          subsByItem.set(key, bucket);
        }
        items = itemList.map((item) => ({
          ...item,
          substitutions: subsByItem.get(item.id as string) ?? [],
          _subsLoaded: true,
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
 * Busca substituições em lotes pequenos (evita IN enorme + timeout).
 */
export async function fetchSubstitutionsByItemIds(
  itemIds: string[],
  client = supabaseClient,
): Promise<any[]> {
  const unique = Array.from(new Set(itemIds.filter(Boolean)));
  if (!unique.length) return [];

  const rows: any[] = [];
  for (let i = 0; i < unique.length; i += SUB_CHUNK_SIZE) {
    const chunk = unique.slice(i, i + SUB_CHUNK_SIZE);
    const { data, error } = await client
      .from('nutrition_substitutions')
      .select(SUB_SELECT)
      .in('meal_item_id', chunk);

    if (error) {
      console.warn('[fetchSubstitutionsByItemIds]', error.message);
      continue;
    }
    if (data?.length) rows.push(...data);
  }
  return rows;
}

/**
 * Enriquece um plano já hidratado com substituições (após first paint).
 * Prefira attachMealSubstitutionsForMealIds para lazy-load por refeição.
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

  const subRows = await fetchSubstitutionsByItemIds(itemIds, client);
  if (!subRows.length) return plan;

  return mergeSubstitutionsIntoPlan(plan, subRows);
}

/**
 * Carrega substituições só das refeições pedidas (lazy ao expandir).
 */
export async function attachMealSubstitutionsForMealIds(
  plan: any,
  mealIds: string[],
  client = supabaseClient,
): Promise<any> {
  if (!plan?.days?.[0] || !mealIds.length) return plan;

  const idSet = new Set(mealIds);
  const items = (plan.days[0].meals ?? [])
    .filter((m: any) => idSet.has(m.id))
    .flatMap((m: any) => m.items ?? []);
  const itemIds = items.map((i: any) => i.id).filter(Boolean) as string[];
  if (!itemIds.length) return plan;

  // Já carregadas? pula
  const needsFetch = items.some(
    (i: any) => !Array.isArray(i.substitutions) || i._subsLoaded !== true,
  );
  if (!needsFetch) return plan;

  const subRows = await fetchSubstitutionsByItemIds(itemIds, client);
  return mergeSubstitutionsIntoPlan(plan, subRows, mealIds);
}

function mergeSubstitutionsIntoPlan(
  plan: any,
  subRows: any[],
  onlyMealIds?: string[],
): any {
  const mealFilter = onlyMealIds ? new Set(onlyMealIds) : null;
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
        meals: (d.meals ?? []).map((meal: any) => {
          if (mealFilter && !mealFilter.has(meal.id)) return meal;
          return {
            ...meal,
            items: (meal.items ?? []).map((item: any) => ({
              ...item,
              substitutions: subsByItem.get(item.id) ?? item.substitutions ?? [],
              _subsLoaded: true,
            })),
          };
        }),
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
 * Embed raso plano → dia 1 → refeições → itens → alimento (SEM substituições —
 * essas sim derrubavam o PostgREST; ver attachMealSubstitutions).
 * Colapsa 4 round-trips sequenciais em 1.
 */
const STUDENT_PLAN_DEEP_SELECT = `id, name, goal, notes, orientacoes_gerais, calories_target, protein_target, carbs_target, fat_target, status, days:nutrition_plan_days(id, plan_id, day_index, label, notes, meals:nutrition_meals(id, plan_day_id, title, time_suggestion, notes, sort_order, meal_type, items:nutrition_meal_items(id, meal_id, food_id, quantity_grams, portion_label, notes, sort_order, food:nutrition_foods(${FOOD_EMBED}))))`;

function normalizeDeepPlan(plan: any): any {
  const days = ((plan.days ?? []) as any[])
    .slice()
    .sort((a, b) => (a.day_index ?? 0) - (b.day_index ?? 0))
    .map((day) => ({
      ...day,
      meals: ((day.meals ?? []) as any[])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((meal) => ({
          ...meal,
          items: ((meal.items ?? []) as any[])
            .slice()
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((item) => ({ ...item, substitutions: [] as any[] })),
        })),
    }));
  return { ...plan, days };
}

/** Fallback (caminho antigo em etapas) caso o embed falhe no PostgREST. */
async function loadActivePlanStepwise(studentId: string, client = supabaseClient): Promise<any | null> {
  const { data: planMeta } = await client
    .from('nutrition_plans')
    .select(
      'id, name, goal, notes, orientacoes_gerais, calories_target, protein_target, carbs_target, fat_target, status',
    )
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!planMeta?.id) return null;

  const { data: day } = await client
    .from('nutrition_plan_days')
    .select('id, plan_id, day_index, label, notes')
    .eq('plan_id', planMeta.id)
    .eq('day_index', 1)
    .maybeSingle();

  if (!day) return { ...planMeta, days: [] };

  const [hydrated] = await hydratePlanDays(
    [day as Record<string, unknown> & { id: string }],
    client,
    { includeSubstitutions: false },
  );
  return { ...planMeta, days: [hydrated] };
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
  // nutrition_plans usa embed profundo (plano→dias→refeições→itens→alimento) —
  // o PostgREST já resolve isso numa única query no banco, então continua
  // separado. As outras 3 são tabelas simples (sem join) e viram 1 RPC só
  // (get_nutrition_page_extras) — reduz a rajada de 4 conexões pra 2.
  const [planRes, extrasRes] = await Promise.all([
    client
      .from('nutrition_plans')
      .select(STUDENT_PLAN_DEEP_SELECT)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .eq('days.day_index', 1)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    client.rpc('get_nutrition_page_extras', { p_aluno_id: studentId, p_today: todayISO }),
  ]);

  let digitalPlan: any | null = null;
  if (planRes.error) {
    console.warn('[loadStudentNutritionPageData] Embed falhou, usando fallback:', planRes.error.message);
    digitalPlan = await loadActivePlanStepwise(studentId, client);
  } else if (planRes.data) {
    digitalPlan = normalizeDeepPlan(planRes.data);
  }

  if (extrasRes.error) {
    console.warn('[loadStudentNutritionPageData] get_nutrition_page_extras falhou:', extrasRes.error.message);
  }
  const extras = (extrasRes.data ?? {}) as Record<string, any>;

  return {
    digitalPlan,
    plansPDF: extras.plano_alimentar_pdf ?? [],
    agua: extras.registros_agua ?? null,
    checkins: extras.nutrition_meal_checkins ?? [],
  };
}

/**
 * Itens de UMA refeição só — pra abrir/pré-visualizar sem GIF, sem
 * substituições, sem o plano inteiro (usado no card colapsável do
 * dashboard, onde só interessa "o que tem nessa refeição" na hora).
 */
export async function loadMealItemsLight(
  mealId: string,
  client = supabaseClient,
): Promise<Array<{ id: string; quantity_grams?: number | string; portion_label?: string | null; food?: { name: string; portions?: Array<{ label: string; grams: number }> } }>> {
  const { data, error } = await client
    .from('nutrition_meal_items')
    .select(MEAL_ITEM_SELECT)
    .eq('meal_id', mealId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('[loadMealItemsLight]', error.message);
    return [];
  }
  return (data ?? []) as any;
}

