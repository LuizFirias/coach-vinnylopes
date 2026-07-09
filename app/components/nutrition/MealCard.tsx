"use client";

import { Check, CaretDown, Clock } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { FoodItemRow } from "./FoodItemRow";

export interface MealFoodItem {
  id?: string;
  name: string;
  quantityGrams?: number | string | null;
  portionLabel?: string | null;
  quantityText?: string | null;
  substitutions?: Array<{
    name: string;
    quantityGrams?: number | string | null;
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
    <article
      className={cn(
        "border border-border-subtle rounded-xl overflow-hidden transition-colors",
        isDone ? "bg-[#0f1a0f]" : "bg-surface-1"
      )}
    >
      <button
        type="button"
        onClick={() => canExpand && onToggleExpand()}
        disabled={!canExpand}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
          canExpand && "hover:bg-surface-2/60 lg:hover:bg-[#1a1a1a] cursor-pointer",
          !canExpand && "cursor-default"
        )}
        id={`btn-refeicao-${mealId}`}
      >
        <div
          role="checkbox"
          aria-checked={isDone}
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone();
          }}
          className={cn(
            "w-5 h-5 rounded border-[1.5px] flex items-center justify-center shrink-0 cursor-pointer",
            isDone ? "bg-success border-success" : "border-border-input bg-transparent"
          )}
        >
          {isDone && <Check className="w-3 h-3 text-white" weight="bold" />}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-[15px] font-semibold leading-tight",
              isDone ? "text-text-primary" : "text-text-primary"
            )}
          >
            {title}
          </p>
          {time && (
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={11} className="text-text-muted shrink-0" />
              <p className="text-[11px] text-text-muted">{time.slice(0, 5)}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {calories != null && (
            <p className="text-[13px] font-medium tabular-nums text-text-secondary">
              {Math.round(calories)} kcal
            </p>
          )}
          {canExpand && (
            <CaretDown
              size={16}
              className={cn(
                "text-text-muted transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          )}
        </div>
      </button>

      {isExpanded && (foods.length > 0 || notes) && (
        <div className="px-4 pb-4 border-t border-border-subtle/60">
          {foods.length > 0 && (
            <div className="mt-2">
              {foods.map((food, idx) => (
                <div key={food.id ?? `${mealId}-food-${idx}`}>
                  <FoodItemRow
                    name={food.name}
                    quantityGrams={food.quantityGrams}
                    portionLabel={food.portionLabel}
                    quantityText={food.quantityText}
                  />
                  {food.substitutions && food.substitutions.length > 0 && (
                    <details className="group mb-2 pl-1">
                      <summary className="text-[10px] font-semibold text-brand cursor-pointer select-none">
                        Opções de substituição
                      </summary>
                      <div className="flex flex-col gap-1 mt-1 pl-2 border-l border-border-subtle">
                        {food.substitutions.map((sub, subIdx) => (
                          <div
                            key={subIdx}
                            className="text-[10px] text-text-secondary flex justify-between gap-2"
                          >
                            <span>• {sub.name}</span>
                            {sub.quantityGrams != null && (
                              <span className="font-mono font-semibold tabular-nums">
                                {sub.quantityGrams}g
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          {notes && (
            <div className="mt-3 p-2.5 bg-brand-subtle border border-brand-border rounded-lg text-[11px] text-text-secondary italic">
              Recomendação: {notes}
            </div>
          )}

          {!isDone && (
            <button
              type="button"
              onClick={onToggleDone}
              disabled={isToggling}
              className="mt-3 w-full min-h-[44px] rounded-[10px] bg-brand text-sm font-semibold text-text-on-brand flex items-center justify-center gap-2 disabled:opacity-50"
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
              className="mt-3 w-full min-h-[44px] rounded-[10px] border border-border-subtle bg-surface-2 text-xs font-semibold text-text-secondary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Desmarcar refeição
            </button>
          )}
        </div>
      )}
    </article>
  );
}
