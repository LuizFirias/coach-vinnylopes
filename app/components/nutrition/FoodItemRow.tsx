interface FoodItemRowProps {
  name: string;
  quantityGrams?: number | string | null;
  portionLabel?: string | null;
  quantityText?: string | null;
}

export function FoodItemRow({
  name,
  quantityGrams,
  portionLabel,
  quantityText,
}: FoodItemRowProps) {
  const grams =
    quantityGrams != null && quantityGrams !== ""
      ? `${quantityGrams}g`
      : quantityText || null;

  return (
    <div className="py-2.5 border-b border-dashed border-surface-2 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-text-primary leading-snug">{name}</p>
        {grams && (
          <p className="text-[13px] font-semibold text-text-primary tabular-nums shrink-0">
            {grams}
          </p>
        )}
      </div>
      {portionLabel && (
        <p className="text-[11px] text-text-muted text-right mt-0.5 leading-snug">
          {portionLabel}
        </p>
      )}
    </div>
  );
}
