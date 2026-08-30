import { supabaseClient } from '@/lib/supabaseClient';
import { NutritionMealCheckin, NutritionMealCheckinStatus } from './types';

/**
 * Registra ou atualiza um check-in de refeição do aluno.
 */
export async function saveMealCheckin(checkin: {
  student_id: string;
  plan_id: string;
  meal_id: string;
  checkin_date: string;
  status: NutritionMealCheckinStatus;
  notes?: string | null;
}): Promise<NutritionMealCheckin> {
  const { data, error } = await supabaseClient
    .from('nutrition_meal_checkins')
    .upsert({
      ...checkin,
      created_at: new Date().toISOString()
    }, {
      onConflict: 'student_id,meal_id,checkin_date'
    })
    .select()
    .single();

  if (error) {
    console.error('[saveMealCheckin] Erro:', error);
    throw error;
  }

  return data;
}

/**
 * Obtém todos os check-ins de refeição de um aluno para uma data específica.
 */
export async function getMealCheckinsByStudentAndDate(
  studentId: string,
  date: string
): Promise<NutritionMealCheckin[]> {
  const { data, error } = await supabaseClient
    .from('nutrition_meal_checkins')
    .select('*')
    .eq('student_id', studentId)
    .eq('checkin_date', date);

  if (error) {
    console.error(`[getMealCheckinsByStudentAndDate] Erro para o aluno ${studentId} na data ${date}:`, error);
    return [];
  }

  return data || [];
}

/**
 * Obtém o histórico de check-ins de um aluno sob um plano específico.
 */
export async function getMealCheckinsByPlan(planId: string): Promise<NutritionMealCheckin[]> {
  const { data, error } = await supabaseClient
    .from('nutrition_meal_checkins')
    .select('*')
    .eq('plan_id', planId)
    .order('checkin_date', { ascending: false });

  if (error) {
    console.error(`[getMealCheckinsByPlan] Erro para o plano ${planId}:`, error);
    return [];
  }

  return data || [];
}
