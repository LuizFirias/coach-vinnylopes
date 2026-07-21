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
    <div className="py-2.5 border-b border-dashed border-surface-2 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-text-primary leading-snug">{name}</p>
        {display.primary && (
          <p className="text-[13px] font-semibold text-text-primary tabular-nums shrink-0 text-right max-w-[48%]">
            {display.primary}
          </p>
        )}
      </div>
      {display.secondary && (
        <p className="text-[11px] text-text-muted text-right mt-0.5 leading-snug">
          {display.secondary}
        </p>
      )}
    </div>
  );
}
