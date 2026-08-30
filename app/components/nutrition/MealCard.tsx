"use client";

import { Check, CaretDown, Clock } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { FoodItemRow } from "./FoodItemRow";
import { formatFoodQuantityDisplay } from "@/lib/nutrition/portionDisplay";

export interface MealFoodItem {
  id?: string;
  name: string;
  quantityGrams?: number | string | null;
  portionLabel?: string | null;
  portionGrams?: number | null;
  quantityText?: string | null;
  substitutions?: Array<{
    name: string;
    quantityGrams?: number | string | null;
    portionLabel?: string | null;
    portionGrams?: number | null;
  }>;
}

interface MealCardProps {
  mealId: string;
  title: string;
  time?: string | null;
  calories?: number | null;
  isDone: boolean;
  isExpanded: boolean;
  isToggling?: boolean;
  isDesktop?: boolean;
  foods?: MealFoodItem[];
  notes?: string | null;
  showExpandControl?: boolean;
  onToggleExpand: () => void;
  onToggleDone: () => void;
}

const CARD_STYLE = {
  background: "var(--mobile-card-bg)",
  border: "1px solid var(--mobile-card-border)",
  boxShadow: "var(--mobile-card-shadow)",
} as const;

export function MealCard({
  mealId,
  title,
  time,
  calories,
  isDone,
  isExpanded,
  isToggling = false,
  isDesktop = false,
  foods = [],
  notes,
  showExpandControl = true,
  onToggleExpand,
  onToggleDone,
}: MealCardProps) {
  const canExpand = showExpandControl && (foods.length > 0 || !!notes);

  return (
    <article className="overflow-hidden rounded-[16px] transition-colors" style={CARD_STYLE}>
      <button
        type="button"
        onClick={() => canExpand && onToggleExpand()}
        disabled={!canExpand}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          canExpand && "cursor-pointer hover:bg-black/[0.02]",
          !canExpand && "cursor-default",
        )}
        id={`btn-refeicao-${mealId}`}
        style={
          isExpanded
            ? { borderBottom: "1px solid var(--mobile-card-border)" }
            : undefined
        }
      >
        <div
          role="checkbox"
          aria-checked={isDone}
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone();
          }}
          className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center"
          style={{
            borderRadius: 5,
            // Sem borda, o quadrado "desmarcado" ficava branco em cima de
            // card branco no tema light — invisível. Border fixo resolve
            // nos dois temas (marcado não precisa, já é verde sólido).
            border: isDone ? "none" : "1.5px solid var(--border-default)",
            background: isDone ? "#39c75a" : "transparent",
            transition: "all 0.15s",
          }}
        >
          {isDone && <Check className="h-3 w-3 text-white" weight="bold" />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-tight text-text-primary">
            {title}
          </p>
          {time && (
            <div className="mt-0.5 flex items-center gap-1">
              <Clock size={11} className="shrink-0 text-text-tertiary" />
              <p className="text-[11px] text-text-tertiary">{time.slice(0, 5)}</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {calories != null && (
            <p className="text-[13px] font-medium tabular-nums lining-nums text-text-tertiary">
              {Math.round(calories)} kcal
            </p>
          )}
          {canExpand && (
            <CaretDown
              size={14}
              className={cn(
                "text-text-disabled transition-transform duration-200",
                isExpanded && "rotate-180",
              )}
            />
          )}
        </div>
      </button>

      {isExpanded && (foods.length > 0 || notes) && (
        <div className="px-4 pb-4">
          {foods.length > 0 && (
            <div className="mt-1">
              {foods.map((food, idx) => (
                <div key={food.id ?? `${mealId}-food-${idx}`}>
                  <FoodItemRow
                    name={food.name}
                    quantityGrams={food.quantityGrams}
                    portionLabel={food.portionLabel}
                    portionGrams={food.portionGrams}
                    quantityText={food.quantityText}
                  />
                  {food.substitutions && food.substitutions.length > 0 && (
                    <details className="group mb-2 pl-1">
                      <summary className="cursor-pointer select-none text-[10px] font-semibold text-brand">
                        Opções de substituição
                      </summary>
                      <div
                        className="mt-1 flex flex-col gap-1 pl-2"
                        style={{ borderLeft: "1px solid rgba(212, 168, 67,0.20)" }}
                      >
                        {food.substitutions.map((sub, subIdx) => {
                          const qty = formatFoodQuantityDisplay(
                            sub.quantityGrams,
                            sub.portionLabel,
                            sub.portionGrams,
                          );
                          return (
                            <div
                              key={subIdx}
                              className="flex justify-between gap-2 text-[10px] text-text-tertiary"
                            >
                              <span>• {sub.name}</span>
                              <span className="text-right font-semibold tabular-nums lining-nums">
                                {qty.primary}
                                {qty.secondary ? (
                                  <span className="font-normal text-text-disabled">
                                    {" "}
                                    · {qty.secondary}
                                  </span>
                                ) : null}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          {notes && (
            <div className="mt-3 rounded-lg border border-brand-border bg-brand-subtle p-2.5 text-[11px] italic text-text-secondary">
              Recomendação: {notes}
            </div>
          )}

          {!isDone && (
            <button
              type="button"
              onClick={onToggleDone}
              disabled={isToggling}
              className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] text-sm font-semibold text-white disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, #F5D061 0%, #D4A843 55%, #B8902F 100%)",
                boxShadow: "0 3px 10px rgba(212, 168, 67,0.30)",
                border: "none",
              }}
            >
              <Check size={16} weight="bold" />
              Marcar como feita
            </button>
          )}

          {isDone && !isDesktop && (
            <button
              type="button"
              onClick={onToggleDone}
              disabled={isToggling}
              className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] text-xs font-semibold text-text-tertiary disabled:opacity-50"
              style={{
                background: "var(--filter-bg, #ebebf0)",
                border: "none",
              }}
            >
              Desmarcar refeição
            </button>
          )}
        </div>
      )}
    </article>
  );
}
