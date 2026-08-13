'use client';

import {
  useEffect,
  useMemo,
  useState,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { CaretDown, Check, MagnifyingGlass, Plus, Trash, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { MEAL_TYPE_LABELS, MEAL_TYPE_OPTIONS } from '@/lib/nutrition/planEdit';
import { calculateItemMacros, sumMacros } from '@/lib/nutrition/calculateMacros';
import {
  isGramsOnlyLabel,
  preferredPortion,
} from '@/lib/nutrition/portionDisplay';
import type { NutritionFood, NutritionMealType } from '@/lib/nutrition/types';
import { textIncludes } from '@/lib/utils/textNormalize';
import { cn } from '@/lib/utils/cn';
import { TimeRollerPicker } from '@/app/components/ui/TimeRollerPicker';

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
  'serie-metric-input w-[3.25rem] min-w-[3.25rem] !bg-transparent bg-transparent appearance-none shadow-none border-0 border-b border-border-subtle rounded-none px-0 py-0.5 text-sm font-semibold tabular-nums lining-nums text-text-primary text-right outline-none focus:border-brand placeholder:text-text-disabled/45 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

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
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [typeOpen, setTypeOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setPickingFood(false);
      setQ('');
      setPickedIds(new Set());
      setTypeOpen(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pickingFood) {
          setPickingFood(false);
          setPickedIds(new Set());
          setQ('');
        } else if (typeOpen) setTypeOpen(false);
        else onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, pickingFood, typeOpen]);

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

  const typeLabel = MEAL_TYPE_LABELS[draft.meal_type] || 'Tipo';

  const togglePick = (id: string) => {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmPickedFoods = () => {
    if (pickedIds.size === 0) {
      setPickingFood(false);
      return;
    }
    const additions: MealDraftItem[] = [];
    pickedIds.forEach((id) => {
      const food = foods.find((f) => f.id === id);
      if (!food) return;
      const portion = preferredPortion(food);
      const grams = portion ? Number(portion.grams) : 100;
      const label = portion ? portion.label : '100g';
      additions.push({
        food_id: food.id,
        quantity_grams: grams,
        portion_label: label,
        food,
        substitutions: [],
      });
    });
    onChange({
      ...draft,
      items: [...draft.items, ...additions],
    });
    setPickedIds(new Set());
    setQ('');
    setPickingFood(false);
  };

  const removeItem = (idx: number) => {
    onChange({
      ...draft,
      items: draft.items.filter((_, i) => i !== idx),
    });
  };

  const updateItemGrams = (idx: number, grams: number) => {
    const items = draft.items.map((it, i) =>
      i === idx ? { ...it, quantity_grams: grams, portion_label: '100g' } : it,
    );
    onChange({ ...draft, items });
  };

  const setMealType = (type: NutritionMealType) => {
    const prevDefault = MEAL_TYPE_LABELS[draft.meal_type];
    const trimmed = (draft.title || '').trim();
    const defaultLabels = Object.values(MEAL_TYPE_LABELS);
    const isAppDefault =
      !trimmed ||
      trimmed === prevDefault ||
      defaultLabels.includes(trimmed);
    onChange({
      ...draft,
      meal_type: type,
      title: isAppDefault ? MEAL_TYPE_LABELS[type] : draft.title,
    });
    setTypeOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/55"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-label={pickingFood ? 'Adicionar alimentos' : 'Editar refeição'}
        className="w-full max-w-md h-[min(90vh,640px)] flex flex-col rounded-2xl bg-surface-1 shadow-elev-3 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--list-row-divider)] shrink-0">
          <h3 className="text-sm font-bold text-text-primary">
            {pickingFood
              ? pickedIds.size > 0
                ? `${pickedIds.size} selecionado${pickedIds.size === 1 ? '' : 's'}`
                : 'Adicionar alimentos'
              : 'Editar refeição'}
          </h3>
          <button
            type="button"
            onClick={() => {
              if (pickingFood) {
                setPickingFood(false);
                setPickedIds(new Set());
                setQ('');
              } else onClose();
            }}
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
              Toque para selecionar · {filtered.length} alimento
              {filtered.length === 1 ? '' : 's'}
            </p>
            <div className="flex-1 overflow-y-auto min-h-0 pb-2">
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
                  const on = pickedIds.has(food.id);
                  const portion = preferredPortion(food);
                  const unitHint =
                    portion && !isGramsOnlyLabel(portion.label)
                      ? `${portion.label} · ~${portion.grams}g`
                      : `${food.calories_per_100g} kcal/100g`;
                  return (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => togglePick(food.id)}
                      className={cn(
                        'w-full flex items-center gap-3 text-left px-4 py-2.5 transition-colors',
                        on ? 'bg-brand/10' : 'hover:bg-surface-2/60',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded',
                          on ? 'bg-brand text-text-on-brand' : 'bg-surface-2',
                        )}
                      >
                        {on && <Check size={10} weight="bold" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-brand truncate">{food.name}</p>
                        <p className="text-[11px] text-text-tertiary tabular-nums">{unitHint}</p>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="px-4 py-3 border-t border-[color:var(--list-row-divider)] shrink-0">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                disabled={pickedIds.size === 0}
                onClick={confirmPickedFoods}
              >
                Adicionar{pickedIds.size > 0 ? ` (${pickedIds.size})` : ''}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="shrink-0 px-4 pt-3 pb-3 flex flex-col gap-3 border-b border-[color:var(--list-row-divider)]">
              {/* Tipo — flat, sem preenchimento */}
              <div className="relative">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand mb-1 block">
                  Tipo de refeição
                </label>
                <button
                  type="button"
                  onClick={() => setTypeOpen((v) => !v)}
                  className="w-full h-9 flex items-center gap-2 px-0 bg-transparent border-0 border-b border-border-subtle text-left outline-none focus:border-brand"
                >
                  <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-text-primary">
                    {typeLabel}
                  </span>
                  <CaretDown
                    size={14}
                    className={cn(
                      'shrink-0 text-text-tertiary transition-transform',
                      typeOpen && 'rotate-180',
                    )}
                  />
                </button>
                {typeOpen && (
                  <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl bg-surface-2 py-1 shadow-elev-3">
                    {MEAL_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMealType(opt.value)}
                        className={cn(
                          'w-full text-left px-3 py-2 text-[13px] transition-colors',
                          opt.value === draft.meal_type
                            ? 'font-semibold text-brand bg-brand/10'
                            : 'text-text-primary hover:bg-surface-1',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Título + horário compacto na mesma linha */}
              <div className="flex items-end gap-3">
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <label
                    htmlFor="meal-title"
                    className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand"
                  >
                    Título
                  </label>
                  <div className="field-flat-input border-b border-border-subtle focus-within:border-brand">
                    <input
                      id="meal-title"
                      value={draft.title}
                      onChange={(e) => onChange({ ...draft, title: e.target.value })}
                      placeholder={MEAL_TYPE_LABELS[draft.meal_type]}
                      className="h-9 w-full px-0 text-[13px] font-semibold text-text-primary"
                      style={{ fontSize: 16 }}
                    />
                  </div>
                </div>
                <div className="shrink-0 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">
                    Hora
                  </span>
                  <div className="h-9 flex items-center">
                    <TimeRollerPicker
                      value={draft.time_suggestion || ''}
                      onChange={(next) =>
                        onChange({ ...draft, time_suggestion: next })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">
                  Alimentos
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPickedIds(new Set());
                    setQ('');
                    setPickingFood(true);
                  }}
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
                    const macros = food
                      ? calculateItemMacros(food, Number(item.quantity_grams) || 0)
                      : null;

                    return (
                      <li key={`${item.food_id}-${idx}`} className="py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-semibold text-brand truncate leading-snug">
                            {name}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="p-1 text-text-tertiary hover:text-danger shrink-0"
                            aria-label="Remover alimento"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                        <div className="mt-1 flex items-center gap-2.5">
                          <div className="field-flat-input flex items-baseline gap-1 shrink-0">
                            <SoftQtyInput
                              value={Number(item.quantity_grams) || 0}
                              onValueChange={(n) => updateItemGrams(idx, n)}
                              aria-label="Quantidade em gramas"
                            />
                            <span className="text-[12px] text-text-tertiary">g</span>
                          </div>
                          {macros && (
                            <div className="grid grid-cols-[auto_auto] gap-x-1.5 gap-y-0.5 shrink-0 text-[10px] font-mono text-text-tertiary tabular-nums lining-nums leading-tight">
                              <span className="inline-flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: '#e05555' }} />
                                {Math.round(macros.calories)} kcal
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: '#751BB4' }} />
                                P {macros.protein}g
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: '#f59e0b' }} />
                                C {macros.carbs}g
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: '#39c75a' }} />
                                G {macros.fat}g
                              </span>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="text-[11px] font-mono text-text-secondary tabular-nums pt-1 border-t border-[color:var(--list-row-divider)]">
                Total · {draftMacros.calories} kcal · P {draftMacros.protein}g · C{' '}
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
