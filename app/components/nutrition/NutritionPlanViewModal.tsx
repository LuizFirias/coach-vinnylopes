'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CaretDown, PencilSimple, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import {
  PlanEditMealModal,
  type MealDraft,
} from '@/app/components/nutrition/PlanEditMealModal';
import {
  PlanEditMetaModal,
  type PlanMetaDraft,
} from '@/app/components/nutrition/PlanEditMetaModal';
import { FoodItemRow } from '@/app/components/nutrition/FoodItemRow';
import { calculateItemMacros, sumMacros, type CalculatedMacro } from '@/lib/nutrition/calculateMacros';
import {
  loadFoodLibrary,
  MEAL_TYPE_LABELS,
  saveNutritionPlanPayload,
  serializeMealsForSave,
} from '@/lib/nutrition/planEdit';
import { getUnitPortion, isGramsOnlyLabel } from '@/lib/nutrition/portionDisplay';
import type { NutritionFood, NutritionMealType } from '@/lib/nutrition/types';
import { supabaseClient } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils/cn';

type Props = {
  planId: string;
  open: boolean;
  /** Abre já em modo edição */
  startInEdit?: boolean;
  onClose: () => void;
  /** Chamado após salvar alterações (macros / refeições) */
  onUpdated?: (plan: any) => void;
};

function emptyMacros(): CalculatedMacro {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
}

function mealMacros(meal: any): CalculatedMacro {
  const parts = (meal.items || []).map((item: any) => {
    const food = item.food;
    if (!food) return emptyMacros();
    return calculateItemMacros(food, Number(item.quantity_grams) || 0);
  });
  return sumMacros(parts);
}

function planMacrosFromMeals(meals: any[]): CalculatedMacro {
  if (!meals.length) return emptyMacros();
  return sumMacros(meals.map((m) => mealMacros(m)));
}

export function NutritionPlanViewModal({
  planId,
  open,
  startInEdit = false,
  onClose,
  onUpdated,
}: Props) {
  const [plan, setPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [foods, setFoods] = useState<NutritionFood[]>([]);
  const [mealOpen, setMealOpen] = useState(false);
  const [mealIndex, setMealIndex] = useState<number | null>(null);
  const [mealDraft, setMealDraft] = useState<MealDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaDraft, setMetaDraft] = useState<PlanMetaDraft | null>(null);

  const loadPlan = useCallback(async (): Promise<any | null> => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const res = await fetch(`/api/admin/nutricao/plans/${planId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar plano');
      setPlan(data.plan);
      return data.plan;
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar plano');
      setPlan(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    if (!open) return;
    setEditing(startInEdit);
    setExpanded(new Set());
    setMealOpen(false);
    setMealDraft(null);
    setMetaOpen(false);
    setMetaDraft(null);
    void loadPlan();
  }, [open, planId, startInEdit, loadPlan]);

  useEffect(() => {
    if (!open) return;
    void loadFoodLibrary()
      .then(setFoods)
      .catch((err) => console.error('[foods]', err));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !mealOpen && !metaOpen) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, mealOpen, metaOpen, onClose]);

  const meals: any[] = plan?.days?.[0]?.meals || [];

  const displayMacros = useMemo(() => {
    const computed = planMacrosFromMeals(meals);
    const hasItems = meals.some((m) => (m.items || []).length > 0);
    if (hasItems && computed.calories > 0) return computed;
    return {
      calories: Number(plan?.calories_target) || 0,
      protein: Number(plan?.protein_target) || 0,
      carbs: Number(plan?.carbs_target) || 0,
      fat: Number(plan?.fat_target) || 0,
      fiber: 0,
    };
  }, [meals, plan]);

  const toggleExpand = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const buildSavePayload = (overrides?: {
    planPatch?: Record<string, unknown>;
    meals?: any[];
  }) => {
    const mealsSrc = overrides?.meals ?? plan?.days?.[0]?.meals ?? [];
    return {
      id: plan.id,
      plan: {
        student_id: plan.student_id,
        name: plan.name,
        goal: plan.goal,
        notes: plan.orientacoes_gerais || plan.notes || null,
        orientacoes_gerais: plan.orientacoes_gerais || plan.notes || null,
        calories_target: plan.calories_target,
        protein_target: plan.protein_target,
        carbs_target: plan.carbs_target,
        fat_target: plan.fat_target,
        status: plan.status === 'archived' ? 'archived' : 'active',
        start_date: plan.start_date || null,
        end_date: plan.end_date || null,
        ...(overrides?.planPatch || {}),
      },
      meals: serializeMealsForSave(mealsSrc),
    };
  };

  const openMetaEditor = () => {
    if (!plan) return;
    setMetaDraft({
      name: plan.name || '',
      goal: plan.goal || 'Hipertrofia',
      start_date: plan.start_date ? String(plan.start_date).slice(0, 10) : '',
      end_date: plan.end_date ? String(plan.end_date).slice(0, 10) : '',
      orientacoes_gerais: plan.orientacoes_gerais || plan.notes || '',
    });
    setMetaOpen(true);
  };

  const saveMeta = async () => {
    if (!metaDraft || !plan) return;
    setSaving(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const payload = buildSavePayload({
        planPatch: {
          name: metaDraft.name.trim(),
          goal: metaDraft.goal,
          start_date: metaDraft.start_date || null,
          end_date: metaDraft.end_date || null,
          orientacoes_gerais: metaDraft.orientacoes_gerais || null,
          notes: metaDraft.orientacoes_gerais || null,
        },
      });
      await saveNutritionPlanPayload(session.access_token, payload);
      setMetaOpen(false);
      setMetaDraft(null);
      const refreshed = await loadPlan();
      if (refreshed) onUpdated?.(refreshed);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar plano');
    } finally {
      setSaving(false);
    }
  };

  const openMealEditor = (idx: number) => {
    const meal = meals[idx];
    if (!meal) return;
    setMealIndex(idx);
    setMealDraft({
      meal_type: (meal.meal_type || 'almoco') as NutritionMealType,
      title: meal.title || '',
      time_suggestion: (meal.time_suggestion || '').slice(0, 5),
      notes: meal.notes || '',
      items: (meal.items || []).map((it: any) => {
        const food =
          foods.find((f) => f.id === it.food_id) || (it.food as NutritionFood | null);
        let portionLabel = it.portion_label as string | null;
        const unit = getUnitPortion(food, portionLabel);
        if (unit && isGramsOnlyLabel(portionLabel)) {
          portionLabel = unit.label;
        }
        return {
          food_id: it.food_id,
          quantity_grams: Number(it.quantity_grams),
          portion_label: portionLabel,
          notes: it.notes,
          food,
          substitutions: it.substitutions || [],
        };
      }),
    });
    setMealOpen(true);
  };

  const openNewMeal = () => {
    setMealIndex(null);
    setMealDraft({
      meal_type: 'almoco',
      title: MEAL_TYPE_LABELS.almoco,
      time_suggestion: '',
      notes: '',
      items: [],
    });
    setMealOpen(true);
  };

  const saveMeal = async () => {
    if (!mealDraft || !plan) return;
    setSaving(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const nextMeals = [...meals];
      const nextMeal = {
        meal_type: mealDraft.meal_type,
        title: mealDraft.title,
        time_suggestion: mealDraft.time_suggestion?.trim() || null,
        notes: mealDraft.notes,
        items: mealDraft.items,
      };
      if (mealIndex == null) nextMeals.push(nextMeal);
      else nextMeals[mealIndex] = { ...nextMeals[mealIndex], ...nextMeal };

      const computed = planMacrosFromMeals(nextMeals);
      const payload = buildSavePayload({
        meals: nextMeals,
        planPatch: {
          calories_target: Math.round(computed.calories) || null,
          protein_target: Math.round(computed.protein) || null,
          carbs_target: Math.round(computed.carbs) || null,
          fat_target: Math.round(computed.fat) || null,
        },
      });

      await saveNutritionPlanPayload(session.access_token, payload);
      setMealOpen(false);
      setMealDraft(null);
      const refreshed = await loadPlan();
      if (refreshed) onUpdated?.(refreshed);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar refeição');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center px-4 backdrop-blur-sm bg-surface-0/80"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal
          aria-label="Plano de nutrição"
          className={cn(
            'bg-surface-1 shadow-2xl w-full max-w-md rounded-2xl flex flex-col max-h-[68vh] overflow-hidden border-0',
            editing && 'ring-1 ring-brand/35',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b border-border-divider/40 flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0 flex-1">
              {editing ? (
                <button
                  type="button"
                  onClick={openMetaEditor}
                  className="group w-full text-left bg-transparent border-0 p-0"
                >
                  <h3 className="text-sm font-bold text-text-primary truncate group-hover:text-brand transition-colors inline-flex items-center gap-1.5 max-w-full">
                    <span className="truncate">
                      {loading ? 'Carregando…' : plan?.name || 'Plano alimentar'}
                    </span>
                    <PencilSimple
                      size={12}
                      weight="bold"
                      className="shrink-0 text-brand opacity-80"
                    />
                  </h3>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {plan?.goal || 'Hipertrofia'}
                    {meals.length
                      ? ` · ${meals.length} refeiç${meals.length === 1 ? 'ão' : 'ões'}`
                      : ''}
                    {' · toque para editar nome'}
                  </p>
                </button>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-text-primary truncate">
                    {loading ? 'Carregando…' : plan?.name || 'Plano alimentar'}
                  </h3>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {plan?.goal || 'Hipertrofia'}
                    {meals.length
                      ? ` · ${meals.length} refeiç${meals.length === 1 ? 'ão' : 'ões'}`
                      : ''}
                  </p>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant={editing ? 'primary' : 'secondary'}
                size="sm"
                className="h-8 px-2.5 text-[11px] font-semibold gap-1"
                leftIcon={<PencilSimple size={13} weight="bold" />}
                onClick={() => {
                  if (editing && plan && plan.status !== 'active' && plan.status !== 'archived') {
                    void (async () => {
                      try {
                        const {
                          data: { session },
                        } = await supabaseClient.auth.getSession();
                        if (!session) return;
                        await saveNutritionPlanPayload(
                          session.access_token,
                          buildSavePayload({ planPatch: { status: 'active' } }),
                        );
                        const refreshed = await loadPlan();
                        if (refreshed) onUpdated?.(refreshed);
                      } catch (err: any) {
                        setError(err.message || 'Erro ao ativar plano');
                      } finally {
                        setEditing(false);
                      }
                    })();
                    return;
                  }
                  setEditing((v) => !v);
                }}
                disabled={loading || !plan}
              >
                {editing ? 'Concluir' : 'Editar'}
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="Fechar"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-danger-subtle text-danger text-[11px] font-semibold">
              {error}
            </div>
          )}

          {loading && !plan ? (
            <div className="px-4 py-10 text-center text-xs text-text-tertiary">
              Carregando plano…
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono py-1">
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase font-semibold text-text-tertiary tracking-wider mb-0.5">
                    Calorias
                  </span>
                  <span className="text-text-primary font-bold tabular-nums lining-nums">
                    {displayMacros.calories || '—'}
                    {displayMacros.calories ? ' kcal' : ''}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase font-semibold text-text-tertiary tracking-wider mb-0.5">
                    Proteínas
                  </span>
                  <span className="text-text-primary font-bold tabular-nums lining-nums">
                    {displayMacros.protein || '—'}
                    {displayMacros.protein ? 'g' : ''}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase font-semibold text-text-tertiary tracking-wider mb-0.5">
                    Carbos
                  </span>
                  <span className="text-text-primary font-bold tabular-nums lining-nums">
                    {displayMacros.carbs || '—'}
                    {displayMacros.carbs ? 'g' : ''}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase font-semibold text-text-tertiary tracking-wider mb-0.5">
                    Gorduras
                  </span>
                  <span className="text-text-primary font-bold tabular-nums lining-nums">
                    {displayMacros.fat || '—'}
                    {displayMacros.fat ? 'g' : ''}
                  </span>
                </div>
              </div>

              {meals.length === 0 ? (
                <p className="py-4 text-center text-xs text-text-tertiary">
                  Nenhuma refeição neste plano.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {meals.map((meal: any, idx: number) => {
                    const isOpen = expanded.has(idx);
                    const items = meal.items || [];
                    const macros = mealMacros(meal);
                    const typeLabel =
                      MEAL_TYPE_LABELS[meal.meal_type as NutritionMealType] ||
                      meal.title ||
                      'Refeição';

                    return (
                      <li
                        key={meal.id || idx}
                        className="rounded-xl bg-surface-2/60 overflow-hidden"
                      >
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleExpand(idx)}
                            className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left"
                            aria-expanded={isOpen}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-text-primary truncate leading-snug">
                                {meal.title || typeLabel}
                              </p>
                              <p className="text-[10px] text-text-tertiary mt-0.5">
                                {meal.time_suggestion
                                  ? `${String(meal.time_suggestion).slice(0, 5)} · `
                                  : ''}
                                {items.length} alimento{items.length === 1 ? '' : 's'}
                                {macros.calories > 0
                                  ? ` · ${Math.round(macros.calories)} kcal`
                                  : ''}
                              </p>
                            </div>
                            <CaretDown
                              size={14}
                              weight="bold"
                              className={cn(
                                'shrink-0 text-text-tertiary transition-transform',
                                isOpen && 'rotate-180',
                              )}
                            />
                          </button>
                          {editing && (
                            <button
                              type="button"
                              onClick={() => openMealEditor(idx)}
                              className="mr-2 p-1.5 rounded-lg text-brand hover:bg-brand/10 transition-colors"
                              aria-label="Editar refeição"
                            >
                              <PencilSimple size={14} weight="bold" />
                            </button>
                          )}
                        </div>

                        {isOpen && (
                          <div className="px-3 pb-2.5 border-t border-[color:var(--list-row-divider)]">
                            {items.length === 0 ? (
                              <p className="py-2.5 text-[11px] text-text-tertiary">
                                Sem alimentos nesta refeição.
                              </p>
                            ) : (
                              items.map((item: any, itemIdx: number) => {
                                const food = item.food;
                                const unit = getUnitPortion(food, item.portion_label);
                                return (
                                  <FoodItemRow
                                    key={item.id || `${item.food_id}-${itemIdx}`}
                                    name={food?.name || 'Alimento'}
                                    quantityGrams={item.quantity_grams}
                                    portionLabel={item.portion_label}
                                    portionGrams={unit?.grams ?? null}
                                  />
                                );
                              })
                            )}
                            {editing && (
                              <button
                                type="button"
                                onClick={() => openMealEditor(idx)}
                                className="mt-1 w-full py-2 text-[11px] font-semibold text-brand hover:text-brand-hover transition-colors"
                              >
                                Adicionar ou remover alimentos
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {editing && (
                <button
                  type="button"
                  onClick={openNewMeal}
                  className="text-left text-[11px] font-semibold text-brand hover:text-brand-hover border-0 bg-transparent py-1.5 transition-colors"
                >
                  + adicionar refeição
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {mealDraft && (
        <PlanEditMealModal
          open={mealOpen}
          draft={mealDraft}
          foods={foods}
          onChange={setMealDraft}
          onClose={() => {
            setMealOpen(false);
            setMealDraft(null);
          }}
          onSave={() => void saveMeal()}
          saving={saving}
        />
      )}

      {metaDraft && (
        <PlanEditMetaModal
          open={metaOpen}
          draft={metaDraft}
          onChange={setMetaDraft}
          onClose={() => {
            setMetaOpen(false);
            setMetaDraft(null);
          }}
          onSave={() => void saveMeta()}
          saving={saving}
        />
      )}
    </>
  );
}
