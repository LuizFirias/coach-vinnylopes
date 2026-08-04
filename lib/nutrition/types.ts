export type NutritionFoodOrigin = 'auron_global' | 'custom';

export type NutritionFoodCategory =
  | 'carboidrato'
  | 'proteina'
  | 'gordura'
  | 'fruta'
  | 'vegetal'
  | 'leguminosa'
  | 'laticinio'
  | 'bebida'
  | 'suplemento'
  | 'oleaginosa'
  | 'tempero'
  | 'outro';

export type NutritionPlanStatus = 'draft' | 'active' | 'archived' | 'paused' | 'template';

export type NutritionMealType =
  | 'cafe_da_manha'
  | 'lanche_manha'
  | 'almoco'
  | 'pre_treino'
  | 'pos_treino'
  | 'lanche_tarde'
  | 'jantar'
  | 'ceia'
  | 'refeicao_livre';

export type NutritionMealCheckinStatus =
  | 'done'
  | 'skipped'
  | 'partial'
  | 'substituted';

export interface NutritionFood {
  id: string;
  name: string;
  slug: string | null;
  category: NutritionFoodCategory;
  default_state: string | null;
  description: string | null;
  base_unit: string;
  base_quantity: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number | null;
  source_name: string | null;
  source_reference: string | null;
  origin: NutritionFoodOrigin;
  coach_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  portions?: NutritionFoodPortion[];
}

export interface NutritionFoodPortion {
  id: string;
  food_id: string;
  label: string;
  grams: number;
  is_default: boolean;
  created_at: string;
}

export interface NutritionPlan {
  id: string;
  coach_id: string;
  student_id: string;
  name: string;
  goal: string | null;
  notes: string | null;
  /** Orientações gerais: suplementação, hidratação, timing, etc. */
  orientacoes_gerais?: string | null;
  calories_target: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fat_target: number | null;
  status: NutritionPlanStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface NutritionPlanDay {
  id: string;
  plan_id: string;
  day_index: number;
  label: string;
  notes: string | null;
  created_at: string;
}

export interface NutritionMeal {
  id: string;
  plan_day_id: string;
  meal_type: NutritionMealType;
  title: string;
  time_suggestion: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export interface NutritionMealItem {
  id: string;
  meal_id: string;
  food_id: string;
  quantity_grams: number;
  portion_label: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  // Optional relations
  food?: NutritionFood;
}

export interface NutritionSubstitution {
  id: string;
  meal_item_id: string;
  substitute_food_id: string;
  quantity_grams: number;
  portion_label: string | null;
  notes: string | null;
  created_at: string;
  // Optional relations
  food?: NutritionFood;
}

export interface NutritionMealCheckin {
  id: string;
  student_id: string;
  plan_id: string;
  meal_id: string;
  checkin_date: string;
  status: NutritionMealCheckinStatus;
  notes: string | null;
  created_at: string;
}
