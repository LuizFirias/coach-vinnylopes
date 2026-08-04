/**
 * Exibição de quantidade priorizando medida caseira (o que o aluno executa),
 * com gramas como apoio. Macros sempre calculados em quantity_grams.
 */

import type { NutritionFood, NutritionFoodPortion } from '@/lib/nutrition/types';

export function isGramsOnlyLabel(label: string | null | undefined): boolean {
  if (!label?.trim()) return true;
  return /^\d+([.,]\d+)?\s*g$/i.test(label.trim());
}

/** Remove prefixo tipo "1 " / "2 " de labels legadas ("1 unidade média" → "unidade média"). */
export function stripLeadingCount(label: string): string {
  return label.replace(/^\d+\s*/, '').trim() || label;
}

export function formatPortionCount(count: number): string {
  if (Number.isInteger(count)) return String(count);
  const rounded = Math.round(count * 100) / 100;
  return String(rounded).replace('.', ',');
}

/** Porção preferida para prescrição: medida caseira (fatia/unidade) antes de "100g". */
export function preferredPortion(
  food: NutritionFood | null | undefined,
): NutritionFoodPortion | null {
  const portions = food?.portions || [];
  if (portions.length === 0) return null;
  const household = portions.filter((p) => !isGramsOnlyLabel(p.label));
  const defHousehold = household.find((p) => p.is_default);
  if (defHousehold) return defHousehold;
  if (household[0]) return household[0];
  return portions.find((p) => p.is_default) || portions[0] || null;
}

export function isUnitaryFood(food: NutritionFood | null | undefined): boolean {
  const p = preferredPortion(food);
  return Boolean(p && !isGramsOnlyLabel(p.label));
}

export function getUnitPortion(
  food: NutritionFood | null | undefined,
  portionLabel: string | null | undefined,
): NutritionFoodPortion | null {
  if (!food?.portions?.length) return null;
  if (portionLabel && !isGramsOnlyLabel(portionLabel)) {
    const match = food.portions.find((p) => p.label === portionLabel);
    if (match) return match;
  }
  const preferred = preferredPortion(food);
  if (preferred && !isGramsOnlyLabel(preferred.label)) return preferred;
  return null;
}

export type QuantityDisplay = {
  /** Texto principal (ex.: "3 × unidade média" ou "150g") */
  primary: string;
  /** Apoio opcional (ex.: "150g" quando primary é medida caseira) */
  secondary: string | null;
};

/**
 * Monta o texto de quantidade para aluno / preview.
 * Se houver medida caseira real, ela é o primary.
 */
export function formatFoodQuantityDisplay(
  quantityGrams: number | string | null | undefined,
  portionLabel: string | null | undefined,
  portionGramsHint?: number | null,
): QuantityDisplay {
  const grams =
    quantityGrams == null || quantityGrams === ''
      ? null
      : Math.round(Number(quantityGrams) * 10) / 10;

  const gramsText = grams != null && !Number.isNaN(grams) ? `${grams}g` : null;
  const label = portionLabel?.trim() || null;

  if (!label || isGramsOnlyLabel(label)) {
    return { primary: gramsText || '—', secondary: null };
  }

  const unitGrams = portionGramsHint && portionGramsHint > 0 ? portionGramsHint : null;
  if (unitGrams && grams != null && grams > 0) {
    const count = Math.round((grams / unitGrams) * 100) / 100;
    if (count > 0) {
      const unitName = stripLeadingCount(label);
      const primary =
        Math.abs(count - 1) < 0.001
          ? label.startsWith('1 ')
            ? label
            : `1 × ${unitName}`
          : `${formatPortionCount(count)} × ${unitName}`;
      return {
        primary,
        secondary: gramsText,
      };
    }
  }

  return {
    primary: label,
    secondary: gramsText,
  };
}
