import { formatFoodQuantityDisplay } from "@/lib/nutrition/portionDisplay";

interface FoodItemRowProps {
  name: string;
  quantityGrams?: number | string | null;
  portionLabel?: string | null;
  quantityText?: string | null;
  /** Gramas da porção unitária (para calcular "3 × unidade") */
  portionGrams?: number | null;
}

export function FoodItemRow({
  name,
  quantityGrams,
  portionLabel,
  quantityText,
  portionGrams,
}: FoodItemRowProps) {
  const display = quantityText
    ? { primary: quantityText, secondary: null as string | null }
    : formatFoodQuantityDisplay(quantityGrams, portionLabel, portionGrams);

  return (
    <div className="border-b border-black/[0.04] py-2.5 last:border-0 dark:border-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium leading-snug text-text-primary">
          {name}
        </p>
        {display.primary && (
          <p className="max-w-[48%] shrink-0 text-right text-[13px] font-semibold tabular-nums lining-nums text-text-tertiary">
            {display.primary}
          </p>
        )}
      </div>
      {display.secondary && (
        <p className="mt-0.5 text-right text-[11px] leading-snug text-text-disabled">
          {display.secondary}
        </p>
      )}
    </div>
  );
}
