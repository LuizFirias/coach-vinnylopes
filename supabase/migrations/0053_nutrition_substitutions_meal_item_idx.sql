-- Acelera leitura de substituições por item (hydratePlanDays usa .in(meal_item_id, ...))
CREATE INDEX IF NOT EXISTS idx_nutrition_substitutions_meal_item_id
  ON public.nutrition_substitutions (meal_item_id);
