export type FoodMacro = {
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g?: number | null;
};

export type CalculatedMacro = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export function roundMacro(value: number): number {
  return Math.round(value * 10) / 10;
}

export function calculateItemMacros(food: FoodMacro, grams: number): CalculatedMacro {
  const factor = grams / 100;

  return {
    calories: roundMacro(food.calories_per_100g * factor),
    protein: roundMacro(food.protein_per_100g * factor),
    carbs: roundMacro(food.carbs_per_100g * factor),
    fat: roundMacro(food.fat_per_100g * factor),
    fiber: roundMacro((food.fiber_per_100g || 0) * factor),
  };
}

export function sumMacros(items: CalculatedMacro[]): CalculatedMacro {
  return items.reduce(
    (acc, item) => ({
      calories: roundMacro(acc.calories + item.calories),
      protein: roundMacro(acc.protein + item.protein),
      carbs: roundMacro(acc.carbs + item.carbs),
      fat: roundMacro(acc.fat + item.fat),
      fiber: roundMacro(acc.fiber + item.fiber),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}
