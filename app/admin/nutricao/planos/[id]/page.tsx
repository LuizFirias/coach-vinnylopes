'use client';

import { useCallback, useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  PencilSimple, Info, Plus, Check, CaretDown,
} from '@phosphor-icons/react';
import { BackButton } from '@/app/components/ui/BackButton';
import { supabaseClient } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { PlanEditMetaModal, type PlanMetaDraft } from '@/app/components/nutrition/PlanEditMetaModal';
import { PlanEditMacrosModal } from '@/app/components/nutrition/PlanEditMacrosModal';
import {
  PlanEditMealModal,
  type MealDraft,
} from '@/app/components/nutrition/PlanEditMealModal';
import { calculateItemMacros, sumMacros, kcalFromMacros, type CalculatedMacro } from '@/lib/nutrition/calculateMacros';
import {
  loadFoodLibrary,
  MEAL_TYPE_LABELS,
  saveNutritionPlanPayload,
  serializeMealsForSave,
} from '@/lib/nutrition/planEdit';
import { formatFoodQuantityDisplay, getUnitPortion, isGramsOnlyLabel } from '@/lib/nutrition/portionDisplay';
import type { NutritionFood, NutritionMealType } from '@/lib/nutrition/types';
import { cn } from '@/lib/utils/cn';
import { readReturnUrl } from '@/lib/utils/adminNav';

interface VerPlanoPageProps {
  params: Promise<{ id: string }>;
}

export default function VerPlanoPage({ params }: VerPlanoPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [alunoProfile, setAlunoProfile] = useState<any>(null);

  const [alunos, setAlunos] = useState<any[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [targetStudentId, setTargetStudentId] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState<Set<number>>(() => new Set());
  const [foods, setFoods] = useState<NutritionFood[]>([]);
  const [saving, setSaving] = useState(false);

  const [metaOpen, setMetaOpen] = useState(false);
  const [metaDraft, setMetaDraft] = useState<PlanMetaDraft | null>(null);
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [macrosDraft, setMacrosDraft] = useState({
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });
  const [mealOpen, setMealOpen] = useState(false);
  const [mealIndex, setMealIndex] = useState<number | null>(null);
  const [mealDraft, setMealDraft] = useState<MealDraft | null>(null);

  const loadPlanDetails = useCallback(async () => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      const res = await fetch(`/api/admin/nutricao/plans/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar plano');
      setPlan(data.plan);

      if (data.plan?.student_id) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('full_name, coaching_reference, email')
          .eq('id', data.plan.student_id)
          .single();
        setAlunoProfile(profile);
      }

      const { data: relationshipData } = await supabaseClient
        .from('coach_alunos')
        .select('aluno_id')
        .eq('coach_id', session.user.id);

      const studentIds = relationshipData?.map((r) => r.aluno_id) || [];
      if (studentIds.length > 0) {
        const { data: profiles } = await supabaseClient
          .from('profiles')
          .select('id, coaching_reference, full_name')
          .in('id', studentIds)
          .eq('arquivado', false)
          .order('coaching_reference', { ascending: true });
        setAlunos(profiles || []);
      }

      if (data.plan) {
        setNewPlanName(`${data.plan.name} - Cópia`);
        setNewTemplateName(`Template: ${data.plan.name}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar dados do plano');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadPlanDetails();
  }, [loadPlanDetails]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('edit') === '1') setEditMode(true);
  }, []);

  useEffect(() => {
    if (!editMode) return;
    const meals = plan?.days?.[0]?.meals;
    if (!meals?.length) return;
    setExpandedMeals(new Set(meals.map((_: unknown, i: number) => i)));
  }, [editMode, plan?.days?.[0]?.meals?.length]);

  useEffect(() => {
    if (!editMode || foods.length > 0) return;
    void loadFoodLibrary()
      .then(setFoods)
      .catch((err) => console.error('[foods]', err));
  }, [editMode, foods.length]);

  useEffect(() => {
    if (!mealOpen || foods.length > 0) return;
    void loadFoodLibrary()
      .then(setFoods)
      .catch((err) => console.error('[foods]', err));
  }, [mealOpen, foods.length]);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 2800);
  };

  const buildSavePayload = (overrides?: {
    planPatch?: Record<string, unknown>;
    meals?: any[];
  }) => {
    const mealsSrc = overrides?.meals ?? plan.days?.[0]?.meals ?? [];
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
        status: plan.status === 'template' ? 'active' : plan.status,
        start_date: plan.start_date || null,
        end_date: plan.end_date || null,
        ...(overrides?.planPatch || {}),
      },
      meals: serializeMealsForSave(mealsSrc),
    };
  };

  const persistPlan = async (payload: ReturnType<typeof buildSavePayload>) => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) throw new Error('Sessão expirada');
    await saveNutritionPlanPayload(session.access_token, payload);
    await loadPlanDetails();
  };

  const cloneMealsClean = () =>
    plan.days?.[0]?.meals?.map((m: any) => ({
      meal_type: m.meal_type,
      title: m.title,
      time_suggestion: m.time_suggestion,
      notes: m.notes,
      sort_order: m.sort_order,
      items: m.items?.map((item: any) => ({
        food_id: item.food_id,
        quantity_grams: item.quantity_grams,
        portion_label: item.portion_label,
        notes: item.notes,
        sort_order: item.sort_order,
        substitutions: item.substitutions?.map((sub: any) => ({
          substitute_food_id: sub.substitute_food_id,
          quantity_grams: sub.quantity_grams,
          portion_label: sub.portion_label,
          notes: sub.notes,
        })),
      })),
    })) || [];

  const handleDuplicatePlan = async () => {
    if (!targetStudentId) {
      setError('Selecione um aluno de destino.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const payload = {
        plan: {
          student_id: targetStudentId,
          name: newPlanName || `${plan.name} - Cópia`,
          goal: plan.goal,
          notes: plan.notes,
          orientacoes_gerais: plan.orientacoes_gerais || plan.notes,
          calories_target: plan.calories_target,
          protein_target: plan.protein_target,
          carbs_target: plan.carbs_target,
          fat_target: plan.fat_target,
          status: 'draft',
        },
        meals: cloneMealsClean(),
      };

      const { planId } = await saveNutritionPlanPayload(session.access_token, payload);
      flash('Plano duplicado!');
      setShowDuplicateModal(false);
      router.push(`/admin/nutricao/planos/${planId}?edit=1`);
    } catch (err: any) {
      setError(err.message || 'Erro ao duplicar plano');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!newTemplateName.trim()) {
      setError('Informe o nome do template.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      await saveNutritionPlanPayload(session.access_token, {
        plan: {
          student_id: session.user.id,
          name: newTemplateName.trim(),
          goal: plan.goal,
          notes: plan.notes,
          orientacoes_gerais: plan.orientacoes_gerais || plan.notes,
          calories_target: plan.calories_target,
          protein_target: plan.protein_target,
          carbs_target: plan.carbs_target,
          fat_target: plan.fat_target,
          status: 'template',
        },
        meals: cloneMealsClean(),
      });

      flash('Template salvo com sucesso!');
      setShowTemplateModal(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar template');
    } finally {
      setActionLoading(false);
    }
  };

  const openMetaEditor = () => {
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
    if (!metaDraft) return;
    setSaving(true);
    setError(null);
    try {
      await persistPlan(
        buildSavePayload({
          planPatch: {
            name: metaDraft.name.trim(),
            goal: metaDraft.goal,
            start_date: metaDraft.start_date || null,
            end_date: metaDraft.end_date || null,
            orientacoes_gerais: metaDraft.orientacoes_gerais || null,
            notes: metaDraft.orientacoes_gerais || null,
          },
        }),
      );
      setMetaOpen(false);
      flash('Objetivo atualizado');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const openMacrosEditor = () => {
    setMacrosDraft({
      calories: plan.calories_target != null ? String(plan.calories_target) : '',
      protein: plan.protein_target != null ? String(plan.protein_target) : '',
      carbs: plan.carbs_target != null ? String(plan.carbs_target) : '',
      fat: plan.fat_target != null ? String(plan.fat_target) : '',
    });
    setMacrosOpen(true);
  };

  const saveMacros = async () => {
    setSaving(true);
    setError(null);
    try {
      await persistPlan(
        buildSavePayload({
          planPatch: {
            calories_target:
              kcalFromMacros(
                Number(macrosDraft.protein) || 0,
                Number(macrosDraft.carbs) || 0,
                Number(macrosDraft.fat) || 0,
              ) || null,
            protein_target: macrosDraft.protein ? Number(macrosDraft.protein) : null,
            carbs_target: macrosDraft.carbs ? Number(macrosDraft.carbs) : null,
            fat_target: macrosDraft.fat ? Number(macrosDraft.fat) : null,
          },
        }),
      );
      setMacrosOpen(false);
      flash('Metas atualizadas');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar macros');
    } finally {
      setSaving(false);
    }
  };

  const openMealEditor = (idx: number) => {
    const meal = plan.days?.[0]?.meals?.[idx];
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
        // Se veio só em gramas mas o alimento tem fatia/unidade, edita em unidades
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
    if (!mealDraft) return;
    setSaving(true);
    setError(null);
    try {
      const meals = [...(plan.days?.[0]?.meals || [])];
      const nextMeal = {
        meal_type: mealDraft.meal_type,
        title: mealDraft.title,
        time_suggestion: mealDraft.time_suggestion?.trim() || null,
        notes: mealDraft.notes,
        items: mealDraft.items,
      };
      if (mealIndex == null) meals.push(nextMeal);
      else meals[mealIndex] = { ...meals[mealIndex], ...nextMeal };

      await persistPlan(buildSavePayload({ meals }));
      setMealOpen(false);
      flash('Refeição salva');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar refeição');
    } finally {
      setSaving(false);
    }
  };

  const deleteMeal = async () => {
    if (mealIndex == null) return;
    if (!window.confirm('Excluir esta refeição?')) return;
    setSaving(true);
    setError(null);
    try {
      const meals = (plan.days?.[0]?.meals || []).filter((_: any, i: number) => i !== mealIndex);
      await persistPlan(buildSavePayload({ meals }));
      setMealOpen(false);
      flash('Refeição removida');
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
      </div>
    );
  }

  if (!plan && error) {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4">
        <div className="p-4 bg-danger-subtle border border-danger-border text-danger text-xs font-semibold rounded-lg max-w-md text-center">
          {error}
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4">
        <div className="p-4 bg-danger-subtle border border-danger-border text-danger text-xs font-semibold rounded-lg max-w-md text-center">
          Plano alimentar não encontrado.
        </div>
      </div>
    );
  }

  const getMealMacros = (meal: any): CalculatedMacro => {
    const itemMacros = (meal.items || []).map((item: any) => {
      const food = item.food;
      if (!food) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      return calculateItemMacros(food, Number(item.quantity_grams));
    });
    return sumMacros(itemMacros);
  };

  const getPlanMacros = (): CalculatedMacro => {
    const day1 = plan.days?.[0];
    if (!day1 || !day1.meals) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    return sumMacros(day1.meals.map((m: any) => getMealMacros(m)));
  };

  const planMacros = getPlanMacros();

  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    active: 'Ativo',
    archived: 'Arquivado',
    paused: 'Pausado',
    template: 'Template',
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-surface-2 border-transparent text-text-secondary',
    active: 'bg-success/15 border-success/30 text-success',
    archived: 'bg-surface-3 border-transparent text-text-disabled',
    paused: 'bg-warning/15 border-warning/30 text-warning',
    template: 'bg-brand/15 border-brand/30 text-brand',
  };

  const editCard = editMode
    ? 'ring-1 ring-brand/35 bg-brand/[0.03] shadow-[0_0_0_1px_rgba(212, 168, 67,0.12)]'
    : '';

  return (
    <div className="min-h-screen pb-28 lg:pl-8">
      <div className="w-full max-w-[min(1600px,96vw)] mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 border-b border-divider/50 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <BackButton
              onClick={() =>
                router.push(readReturnUrl(window.location.search, '/admin/nutricao'))
              }
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight truncate">
                  {plan.name}
                </h1>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border',
                    statusColors[plan.status] || statusColors.draft,
                  )}
                >
                  {statusLabels[plan.status] || plan.status}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Aluno:{' '}
                <span className="text-text-primary font-bold">
                  {alunoProfile?.coaching_reference || alunoProfile?.full_name || 'Desconhecido'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowTemplateModal(true)}
                className="h-9 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold gap-1.5 cursor-pointer border-0 w-full sm:w-auto justify-center"
              >
                Salvar Template
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowDuplicateModal(true)}
                className="h-9 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold gap-1.5 cursor-pointer border-0 w-full sm:w-auto justify-center"
              >
                Duplicar Plano
              </Button>
            </div>
            <Button
              variant={editMode ? 'secondary' : 'primary'}
              onClick={() => {
                setEditMode((v) => {
                  const next = !v;
                  const meals = plan?.days?.[0]?.meals || [];
                  if (next) {
                    setExpandedMeals(new Set(meals.map((_: unknown, i: number) => i)));
                  } else {
                    setExpandedMeals(new Set());
                  }
                  return next;
                });
              }}
              className="h-9 px-3 rounded-lg text-xs font-bold gap-1.5 cursor-pointer w-full sm:w-auto justify-center"
            >
              {editMode ? (
                <>
                  <Check className="w-4 h-4" /> Concluir edição
                </>
              ) : (
                <>
                  <PencilSimple className="w-4 h-4" /> Editar Plano
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-danger-subtle border border-danger-border text-danger text-xs font-semibold">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-success-subtle border border-success-border text-success text-xs font-semibold">
            {success}
          </div>
        )}
        {editMode && (
          <p className="mb-4 text-[11px] text-brand font-medium">
            Modo edição ativo — toque no lápis de cada card para alterar.
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 flex flex-col gap-6">
            <Card className={cn('rounded-xl border-0 p-4 md:p-5 flex flex-col gap-4 relative', editCard)}>
              {editMode && (
                <button
                  type="button"
                  onClick={openMetaEditor}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-brand/10 text-brand hover:bg-brand/20"
                  aria-label="Editar objetivo"
                >
                  <PencilSimple size={14} weight="bold" />
                </button>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pr-8">
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider mb-0.5">
                    Objetivo
                  </p>
                  <p className="text-text-primary font-semibold">{plan.goal || 'Não definido'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider mb-0.5">
                    Data Início
                  </p>
                  <p className="text-text-primary font-semibold font-mono tabular-nums lining-nums">
                    {plan.start_date
                      ? new Date(plan.start_date).toLocaleDateString('pt-BR')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider mb-0.5">
                    Data Término
                  </p>
                  <p className="text-text-primary font-semibold font-mono tabular-nums lining-nums">
                    {plan.end_date
                      ? new Date(plan.end_date).toLocaleDateString('pt-BR')
                      : '—'}
                  </p>
                </div>
              </div>

              {(plan.orientacoes_gerais || plan.notes) && (
                <div className="bg-brand/5 p-3 rounded-lg border border-brand/25">
                  <p className="text-[10px] text-brand uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                    <Info size={12} /> Orientações
                  </p>
                  <p className="text-xs text-text-secondary whitespace-pre-wrap font-medium">
                    {plan.orientacoes_gerais || plan.notes}
                  </p>
                </div>
              )}
            </Card>

            <div className="flex flex-col gap-4">
              {(!plan.days?.[0]?.meals || plan.days[0].meals.length === 0) ? (
                <p className="text-xs text-text-disabled text-center py-8">
                  Nenhuma refeição cadastrada neste plano.
                </p>
              ) : (
                plan.days[0].meals.map((meal: any, mealIdx: number) => {
                  const mMacros = getMealMacros(meal);
                  const isExpanded = expandedMeals.has(mealIdx);
                  const toggleExpanded = () => {
                    setExpandedMeals((prev) => {
                      const next = new Set(prev);
                      if (next.has(mealIdx)) next.delete(mealIdx);
                      else next.add(mealIdx);
                      return next;
                    });
                  };
                  return (
                    <Card
                      key={meal.id || mealIdx}
                      className={cn(
                        'rounded-xl border-0 shadow-sm p-4 md:p-5 flex flex-col gap-3 bg-surface-1 relative',
                        editCard,
                      )}
                    >
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={toggleExpanded}
                          className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors"
                          aria-label={isExpanded ? 'Recolher refeição' : 'Expandir refeição'}
                          aria-expanded={isExpanded}
                        >
                          <CaretDown
                            size={14}
                            weight="bold"
                            className={cn(
                              'transition-transform duration-200',
                              isExpanded && 'rotate-180',
                            )}
                          />
                        </button>
                        {editMode && (
                          <button
                            type="button"
                            onClick={() => openMealEditor(mealIdx)}
                            className="p-1.5 text-brand hover:text-brand/80 transition-colors"
                            aria-label="Editar refeição"
                          >
                            <PencilSimple size={14} weight="bold" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={toggleExpanded}
                        className={cn(
                          'flex items-start justify-between gap-3 pr-14 text-left w-full',
                          isExpanded && 'border-b border-divider/40 pb-2',
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                          <span className="text-xs font-extrabold text-text-primary truncate">
                            {meal.title}
                          </span>
                          {meal.time_suggestion && (
                            <span className="bg-surface-2 border-0 text-[9px] px-1 rounded font-mono text-text-secondary shrink-0">
                              {String(meal.time_suggestion).slice(0, 5)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end sm:flex-row sm:items-center gap-0.5 sm:gap-3 text-[10px] font-mono text-text-tertiary shrink-0 text-right tabular-nums">
                          <span>{mMacros.calories} kcal</span>
                          <span>
                            P: {mMacros.protein}g · C: {mMacros.carbs}g · G: {mMacros.fat}g
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                      <div className="flex flex-col divide-y divide-border-subtle/40">
                        {(!meal.items || meal.items.length === 0) ? (
                          <p className="text-[10px] text-text-disabled">Nenhum item adicionado.</p>
                        ) : (
                          meal.items.map((item: any, itemIdx: number) => {
                            const food = item.food;
                            if (!food) return null;
                            const calculated = calculateItemMacros(food, item.quantity_grams);
                            const unit = getUnitPortion(food, item.portion_label);
                            const qty = formatFoodQuantityDisplay(
                              item.quantity_grams,
                              unit?.label || item.portion_label,
                              unit?.grams ??
                                food.portions?.find(
                                  (p: any) => p.label === item.portion_label,
                                )?.grams,
                            );

                            return (
                              <div key={item.id || itemIdx} className="py-2.5 first:pt-0 flex flex-col gap-1">
                                <div className="flex justify-between items-baseline gap-3">
                                  <p className="text-xs font-bold text-text-primary min-w-0 truncate">
                                    {food.name}
                                  </p>
                                  <span className="text-xs font-bold text-text-secondary shrink-0 text-right">
                                    {qty.primary}
                                    {qty.secondary ? (
                                      <span className="text-text-tertiary font-medium">
                                        {' '}
                                        · {qty.secondary}
                                      </span>
                                    ) : null}
                                  </span>
                                </div>
                                <p className="text-[9px] font-mono text-text-tertiary tabular-nums">
                                  {calculated.calories} kcal · P {calculated.protein}g · C{' '}
                                  {calculated.carbs}g · G {calculated.fat}g
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>
                      )}
                    </Card>
                  );
                })
              )}

              {editMode && (
                <button
                  type="button"
                  onClick={openNewMeal}
                  className="inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border border-dashed border-brand/40 text-brand text-xs font-semibold hover:bg-brand/5"
                >
                  <Plus size={14} weight="bold" /> Nova refeição
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-6 flex flex-col gap-6">
            <Card className={cn('rounded-xl border-0 p-4 md:p-5 flex flex-col gap-4 relative', editCard)}>
              {editMode && (
                <button
                  type="button"
                  onClick={openMacrosEditor}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-brand/10 text-brand hover:bg-brand/20"
                  aria-label="Editar macros"
                >
                  <PencilSimple size={14} weight="bold" />
                </button>
              )}
              <div className="flex flex-col gap-3 font-mono pr-8">
                {[
                  {
                    label: 'Calorias',
                    current: planMacros.calories,
                    target: plan.calories_target,
                    unit: 'kcal',
                    bar: 'bg-brand',
                  },
                  {
                    label: 'Proteínas',
                    current: planMacros.protein,
                    target: plan.protein_target,
                    unit: 'g',
                    bar: 'bg-success',
                  },
                  {
                    label: 'Carboidratos',
                    current: planMacros.carbs,
                    target: plan.carbs_target,
                    unit: 'g',
                    bar: 'bg-warning',
                  },
                  {
                    label: 'Gorduras',
                    current: planMacros.fat,
                    target: plan.fat_target,
                    unit: 'g',
                    bar: 'bg-danger',
                  },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-text-secondary">{row.label}:</span>
                      <span className="text-text-primary font-bold tabular-nums lining-nums">
                        {row.current} / {row.target || '—'} {row.unit}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', row.bar)}
                        style={{
                          width: `${
                            row.target
                              ? Math.min(100, (Number(row.current) / Number(row.target)) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Duplicate / Template modals */}
        {showDuplicateModal && (
          <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
            <div className="bg-surface-1 rounded-2xl max-w-md w-full p-5 shadow-elev-3 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Duplicar plano</h3>
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  Copia refeições e alimentos para outro aluno
                </p>
              </div>
              <Select
                label="Aluno de destino"
                value={targetStudentId}
                onChange={setTargetStudentId}
                placeholder="Selecione..."
                options={alunos.map((a) => ({
                  value: a.id,
                  label: a.coaching_reference || a.full_name || a.id,
                }))}
              />
              <Input
                label="Nome do novo plano"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                className="!h-10 !text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowDuplicateModal(false)} disabled={actionLoading}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={actionLoading}
                  onClick={() => void handleDuplicatePlan()}
                  disabled={actionLoading || !targetStudentId || !newPlanName.trim()}
                >
                  Duplicar
                </Button>
              </div>
            </div>
          </div>
        )}

        {showTemplateModal && (
          <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
            <div className="bg-surface-1 rounded-2xl max-w-md w-full p-5 shadow-elev-3 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Salvar como template</h3>
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  Modelo reutilizável com as refeições atuais
                </p>
              </div>
              <Input
                label="Nome do template"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="!h-10 !text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowTemplateModal(false)} disabled={actionLoading}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={actionLoading}
                  onClick={() => void handleSaveAsTemplate()}
                  disabled={actionLoading || !newTemplateName.trim()}
                >
                  Salvar template
                </Button>
              </div>
            </div>
          </div>
        )}

        {metaDraft && (
          <PlanEditMetaModal
            open={metaOpen}
            draft={metaDraft}
            onChange={setMetaDraft}
            onClose={() => setMetaOpen(false)}
            onSave={() => void saveMeta()}
            saving={saving}
          />
        )}

        <PlanEditMacrosModal
          open={macrosOpen}
          {...macrosDraft}
          onChange={setMacrosDraft}
          onClose={() => setMacrosOpen(false)}
          onSave={() => void saveMacros()}
          saving={saving}
        />

        {mealDraft && (
          <PlanEditMealModal
            open={mealOpen}
            draft={mealDraft}
            foods={foods}
            onChange={setMealDraft}
            onClose={() => setMealOpen(false)}
            onSave={() => void saveMeal()}
            onDelete={mealIndex != null ? () => void deleteMeal() : undefined}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
