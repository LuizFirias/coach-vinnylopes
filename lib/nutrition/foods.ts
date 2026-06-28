import { supabaseClient } from '@/lib/supabaseClient';
import { NutritionFood, NutritionFoodCategory } from './types';

/**
 * Retorna todos os alimentos globais ativos da base AURON.
 */
export async function getGlobalFoods(): Promise<NutritionFood[]> {
  const { data, error } = await supabaseClient
    .from('nutrition_foods')
    .select('*, portions:nutrition_food_portions(*)')
    .eq('origin', 'auron_global')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('[getGlobalFoods] Erro:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca alimentos por nome e/ou categoria.
 * Retorna alimentos globais e também alimentos customizados criados pelo coach.
 */
export async function searchFoods(
  query?: string,
  category?: NutritionFoodCategory,
  coachId?: string
): Promise<NutritionFood[]> {
  let selectQuery = supabaseClient
    .from('nutrition_foods')
    .select('*, portions:nutrition_food_portions(*)')
    .eq('is_active', true);

  if (category) {
    selectQuery = selectQuery.eq('category', category);
  }

  const { data, error } = await selectQuery;

  if (error) {
    console.error('[searchFoods] Erro:', error);
    throw error;
  }

  let foods = data || [];

  // Filtragem extra na camada de aplicação para garantir que o coach_id seja nulo ou pertença ao coach informado
  if (coachId) {
    foods = foods.filter(f => f.origin === 'auron_global' || f.coach_id === coachId);
  } else {
    foods = foods.filter(f => f.origin === 'auron_global');
  }

  // Filtragem insensível a acentos (ex: PAO acha PÃO)
  if (query) {
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const normalizedQuery = normalize(query);
    foods = foods.filter(f => normalize(f.name).includes(normalizedQuery));
  }

  return foods.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Retorna um alimento específico pelo ID.
 */
export async function getFoodById(id: string): Promise<NutritionFood | null> {
  const { data, error } = await supabaseClient
    .from('nutrition_foods')
    .select('*, portions:nutrition_food_portions(*)')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`[getFoodById] Erro para o ID ${id}:`, error);
    return null;
  }

  return data;
}

/**
 * Cria ou atualiza um alimento personalizado (custom) do coach.
 */
export async function saveCustomFood(
  food: Omit<NutritionFood, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<NutritionFood> {
  const payload = {
    ...food,
    origin: 'custom',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseClient
    .from('nutrition_foods')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error('[saveCustomFood] Erro:', error);
    throw error;
  }

  return data;
}
