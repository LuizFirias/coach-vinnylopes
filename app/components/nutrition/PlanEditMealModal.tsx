'use client';

import {
  useEffect,
  useMemo,
  useState,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { MagnifyingGlass, Plus, Trash, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MEAL_TYPE_LABELS, MEAL_TYPE_OPTIONS } from '@/lib/nutrition/planEdit';
import { calculateItemMacros, sumMacros } from '@/lib/nutrition/calculateMacros';
import {
  getUnitPortion,
  isGramsOnlyLabel,
  preferredPortion,
  stripLeadingCount,
} from '@/lib/nutrition/portionDisplay';
import type { NutritionFood, NutritionMealType } from '@/lib/nutrition/types';
import { textIncludes } from '@/lib/utils/textNormalize';
import { cn } from '@/lib/utils/cn';

export type MealDraftItem = {
  food_id: string;
  quantity_grams: number;
  portion_label: string | null;
  notes?: string | null;
  food?: NutritionFood | null;
  substitutions?: any[];
};

export type MealDraft = {
  meal_type: NutritionMealType;
  title: string;
  time_suggestion: string;
  notes: string;
  items: MealDraftItem[];
};

type Props = {
  open: boolean;
  draft: MealDraft;
  foods: NutritionFood[];
  onChange: (next: MealDraft) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  saving?: boolean;
};

const qtyInputClass =
  'w-12 !bg-transparent bg-transparent appearance-none shadow-none border-0 border-b border-border-subtle rounded-none px-0 py-0.5 text-sm font-semibold tabular-nums lining-nums text-text-primary text-right outline-none focus:border-brand placeholder:text-text-disabled/45 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

/** Input numérico estilo app de ficha: vazio mostra 0 fantasma; digitar sobrescreve. */
function SoftQtyInput({
  value,
  onValueChange,
  'aria-label': ariaLabel,
}: {
  value: number;
  onValueChange: (n: number) => void;
  'aria-label'?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const display = focused
    ? draft
    : value > 0
      ? String(value)
      : '';

  const commit = (raw: string) => {
    const normalized = raw.trim().replace(',', '.');
    if (!normalized) {
      onValueChange(0);
      return;
    }
    const n = Number(normalized);
    if (Number.isNaN(n)) {
      onValueChange(0);
      return;
    }
    onValueChange(Math.max(0, n));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      placeholder="0"
      aria-label={ariaLabel}
      className={qtyInputClass}
      style={{ fontSize: 16 }}
      onFocus={(e: FocusEvent<HTMLInputElement>) => {
        setFocused(true);
        setDraft(value > 0 ? String(value) : '');
        requestAnimationFrame(() => e.target.select());
      }}
      onBlur={() => {
        commit(draft);
        setFocused(false);
        setDraft('');
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,]/g, '');
        setDraft(raw);
        const normalized = raw.trim().replace(',', '.');
        if (!normalized || normalized === '.' || normalized === ',') {
          onValueChange(0);
          return;
        }
        const n = Number(normalized);
        if (!Number.isNaN(n)) onValueChange(Math.max(0, n));
      }}
      onKeyDown={(e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

export function PlanEditMealModal({
  open,
  draft,
  foods,
  onChange,
  onClose,
  onSave,
  onDelete,
  saving,
}: Props) {
  const [pickingFood, setPickingFood] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!open) {
      setPickingFood(false);
      setQ('');
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pickingFood) setPickingFood(false);
        else onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, pickingFood]);

  const filtered = useMemo(() => {
    return foods
      .filter((f) => textIncludes(f.name, q))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [foods, q]);

  const draftMacros = useMemo(() => {
    const parts = draft.items.map((item) => {
      const food = item.food || foods.find((f) => f.id === item.food_id);
      if (!food) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      return calculateItemMacros(food, Number(item.quantity_grams) || 0);
    });
    return sumMacros(parts);
  }, [draft.items, foods]);

  if (!open) return null;

  const timeValue = (draft.time_suggestion || '').slice(0, 5);

  const addFood = (food: NutritionFood) => {
    const portion = preferredPortion(food);
    const grams = portion ? Number(portion.grams) : 100;
    const label = portion ? portion.label : '100g';
    onChange({
      ...draft,
      items: [
        ...draft.items,
        {
          food_id: food.id,
          quantity_grams: grams,
          portion_label: label,
          food,
          substitutions: [],
        },
      ],
    });
    setPickingFood(false);
    setQ('');
  };

  const removeItem = (idx: number) => {
    onChange({
      ...draft,
      items: draft.items.filter((_, i) => i !== idx),
    });
  };

  const updateItemGrams = (idx: number, grams: number) => {
    const items = draft.items.map((it, i) =>
      i === idx ? { ...it, quantity_grams: grams } : it,
    );
    onChange({ ...draft, items });
  };

  const updateItemUnits = (idx: number, count: number) => {
    const item = draft.items[idx];
    const food = item.food || foods.find((f) => f.id === item.food_id);
    const portion = getUnitPortion(food, item.portion_label);
    if (!portion) return;
    const grams = Math.round(Number(portion.grams) * Math.max(0, count) * 10) / 10;
    const items = draft.items.map((it, i) =>
      i === idx
        ? { ...it, quantity_grams: grams, portion_label: portion.label }
        : it,
    );
    onChange({ ...draft, items });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-label={pickingFood ? 'Adicionar alimento' : 'Editar refeição'}
        className="w-full max-w-md h-[min(90vh,640px)] flex flex-col rounded-2xl bg-surface-1 shadow-elev-3 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--list-row-divider)] shrink-0">
          <h3 className="text-sm font-bold text-text-primary">
            {pickingFood ? 'Adicionar alimento' : 'Editar refeição'}
          </h3>
          <button
            type="button"
            onClick={() => (pickingFood ? setPickingFood(false) : onClose())}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary"
            aria-label="Fechar"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {pickingFood ? (
          <>
            <div className="px-4 py-2.5 shrink-0 flex items-center gap-2">
              <MagnifyingGlass size={16} weight="bold" className="text-brand shrink-0" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar alimento"
                autoFocus
                className="flex-1 min-w-0 bg-transparent border-0 border-b border-brand px-0 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-disabled"
                style={{ fontSize: 16 }}
              />
            </div>
            <p className="px-4 pb-1 text-[10px] text-text-tertiary shrink-0">
              {filtered.length} alimento{filtered.length === 1 ? '' : 's'}
            </p>
            <div className="flex-1 overflow-y-auto min-h-0 pb-3">
              {foods.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-text-tertiary">
                  Carregando alimentos...
                </p>
              ) : filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-text-tertiary">
                  Nenhum alimento encontrado.
                </p>
              ) : (
                filtered.map((food) => {
                  const portion = preferredPortion(food);
                  const unitHint =
                    portion && !isGramsOnlyLabel(portion.label)
                      ? `${portion.label} · ~${portion.grams}g`
                      : `${food.calories_per_100g} kcal/100g`;
                  return (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => addFood(food)}
                      className="w-full text-left px-4 py-2.5 hover:bg-surface-2/60 transition-colors"
                    >
                      <p className="text-sm font-semibold text-text-primary truncate">{food.name}</p>
                      <p className="text-[11px] text-text-tertiary tabular-nums">{unitHint}</p>
                    </button>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 min-h-0">
              <Select
                label="Tipo de refeição"
                value={draft.meal_type}
                onChange={(v) => {
                  const type = v as NutritionMealType;
                  onChange({
                    ...draft,
                    meal_type: type,
                    title: draft.title?.trim() ? draft.title : MEAL_TYPE_LABELS[type],
                  });
                }}
                options={MEAL_TYPE_OPTIONS}
              />
              <Input
                label="Título"
                value={draft.title}
                onChange={(e) => onChange({ ...draft, title: e.target.value })}
                className="!h-10 !text-sm"
              />

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="meal-time"
                    className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary"
                  >
                    Horário{' '}
                    <span className="normal-case tracking-normal font-medium text-text-disabled">
                      opcional
                    </span>
                  </label>
                  {timeValue ? (
                    <button
                      type="button"
                      onClick={() => onChange({ ...draft, time_suggestion: '' })}
                      className="text-[11px] font-semibold text-text-tertiary hover:text-text-primary"
                    >
                      Limpar
                    </button>
                  ) : null}
                </div>
                <input
                  id="meal-time"
                  type="time"
                  value={timeValue}
                  onChange={(e) =>
                    onChange({ ...draft, time_suggestion: e.target.value || '' })
                  }
                  className={cn(
                    'h-10 w-full px-3.5 rounded-[10px] text-[16px] font-medium',
                    'bg-transparent border border-border-subtle',
                    'text-text-primary outline-none focus:border-brand/50',
                    !timeValue && 'text-text-disabled',
                  )}
                  style={{ fontSize: 16 }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                  Alimentos
                </span>
                <button
                  type="button"
                  onClick={() => setPickingFood(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand"
                >
                  <Plus size={12} weight="bold" /> Adicionar
                </button>
              </div>

              {draft.items.length === 0 ? (
                <p className="text-xs text-text-tertiary py-2">Nenhum alimento nesta refeição.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-[color:var(--list-row-divider)]">
                  {draft.items.map((item, idx) => {
                    const food = item.food || foods.find((f) => f.id === item.food_id);
                    const name = food?.name || 'Alimento';
                    const unit = getUnitPortion(food, item.portion_label);
                    const unitary = Boolean(unit);
                    const unitCount = unit
                      ? Math.round((Number(item.quantity_grams) / Number(unit.grams)) * 100) / 100
                      : 1;
                    const macros = food
                      ? calculateItemMacros(food, Number(item.quantity_grams) || 0)
                      : null;

                    return (
                      <li key={`${item.food_id}-${idx}`} className="flex items-start gap-2 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-text-primary truncate">{name}</p>
                          <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                            {unitary && unit ? (
                              <>
                                <SoftQtyInput
                                  value={unitCount}
                                  onValueChange={(n) => updateItemUnits(idx, n)}
                                  aria-label="Quantidade em unidades"
                                />
                                <span className="text-[12px] text-text-primary font-medium">
                                  {stripLeadingCount(unit.label)}
                                </span>
                                <span className="text-[11px] text-text-tertiary tabular-nums">
                                  ~{Math.round(Number(item.quantity_grams))}g
                                </span>
                              </>
                            ) : (
                              <>
                                <SoftQtyInput
                                  value={Number(item.quantity_grams) || 0}
                                  onValueChange={(n) => updateItemGrams(idx, n)}
                                  aria-label="Quantidade em gramas"
                                />
                                <span className="text-[12px] text-text-tertiary">g</span>
                              </>
                            )}
                          </div>
                          {macros && (
                            <p className="mt-0.5 text-[10px] font-mono text-text-tertiary tabular-nums">
                              {macros.calories} kcal · P {macros.protein}g · C {macros.carbs}g · G{' '}
                              {macros.fat}g
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1.5 text-text-tertiary hover:text-danger shrink-0"
                          aria-label="Remover alimento"
                        >
                          <Trash size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="text-[11px] font-mono text-text-secondary tabular-nums pt-1 border-t border-[color:var(--list-row-divider)]">
                Total refeição · {draftMacros.calories} kcal · P {draftMacros.protein}g · C{' '}
                {draftMacros.carbs}g · G {draftMacros.fat}g
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-[color:var(--list-row-divider)] shrink-0">
              {onDelete ? (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={saving}
                  className="text-[11px] font-semibold text-danger"
                >
                  Excluir refeição
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onSave}
                  loading={saving}
                  disabled={saving || !draft.title.trim()}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
