'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AppleLogo,
  FloppyDisk,
  PencilSimple,
  Trash,
  Copy,
  FolderSimple,
  UsersThree,
} from '@phosphor-icons/react';
import { MeasurementLineChart } from '@/app/components/measurements/MeasurementLineChart';
import { ConfirmModal } from '@/app/components/ConfirmModal';
import { NutritionPlanViewModal } from '@/app/components/nutrition/NutritionPlanViewModal';
import {
  CloneToStudentsModal,
  type CloneStudentOption,
} from '@/app/components/admin/alunos/CloneToStudentsModal';
import {
  buildDailyAdherenceSeries,
  getStatusAdherenceWeight,
} from '@/lib/nutrition/adherence';
import {
  MEAL_TYPE_LABELS,
  saveNutritionPlanPayload,
  serializeMealsForSave,
} from '@/lib/nutrition/planEdit';
import type { NutritionMealType } from '@/lib/nutrition/types';
import { supabaseClient } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils/cn';

export type PlanoNutricaoKanbanItem = {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  calories_target: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fat_target: number | null;
  notes?: string | null;
  orientacoes_gerais?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  student_id?: string;
  days?: Array<{
    id?: string;
    meals?: Array<{
      id?: string;
      title?: string;
      meal_type?: string;
      time_suggestion?: string | null;
      items?: unknown[];
    }>;
  }>;
  updated_at?: string;
  created_at?: string;
};

type Checkin = {
  meal_id?: string | null;
  checkin_date: string;
  status: string;
};

type Props = {
  planos: PlanoNutricaoKanbanItem[];
  alunoId: string;
  checkins: Checkin[];
  onRefresh: () => void;
};

const STATUS_LABEL: Record<string, string> = {
  active: 'ativo',
  archived: 'arquivo',
};

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-success/15 text-success',
  archived: 'bg-surface-2 text-text-disabled',
};

function displayStatus(status: string): 'active' | 'archived' {
  return status === 'archived' ? 'archived' : 'active';
}

const DEFAULT_MEALS = [
  { meal_type: 'cafe_da_manha' as NutritionMealType, title: MEAL_TYPE_LABELS.cafe_da_manha },
  { meal_type: 'almoco' as NutritionMealType, title: MEAL_TYPE_LABELS.almoco },
  { meal_type: 'lanche_tarde' as NutritionMealType, title: MEAL_TYPE_LABELS.lanche_tarde },
  { meal_type: 'jantar' as NutritionMealType, title: MEAL_TYPE_LABELS.jantar },
];

function mealsOf(plan: PlanoNutricaoKanbanItem) {
  return plan.days?.[0]?.meals || [];
}

function planAdherence(plan: PlanoNutricaoKanbanItem, checkins: Checkin[]) {
  const meals = mealsOf(plan);
  const mealsCount = meals.length;
  const todayISO = new Date().toISOString().slice(0, 10);
  const mealIds = new Set(meals.map((m) => m.id).filter(Boolean) as string[]);

  const relevant = checkins.filter((c) => !c.meal_id || mealIds.has(c.meal_id));
  const todayCheckins = relevant.filter((c) => c.checkin_date === todayISO);

  let todayWeight = 0;
  todayCheckins.forEach((c) => {
    todayWeight += getStatusAdherenceWeight(c.status);
  });
  const today = mealsCount > 0 ? Math.min(100, Math.round((todayWeight / mealsCount) * 100)) : 100;

  const expected7d = mealsCount * 7;
  let weekWeight = 0;
  relevant.forEach((c) => {
    weekWeight += getStatusAdherenceWeight(c.status);
  });
  const week7 =
    expected7d > 0 ? Math.min(100, Math.round((weekWeight / expected7d) * 100)) : 100;

  const series = buildDailyAdherenceSeries(relevant as any, mealsCount, 7);

  return { today, week7, series, mealsCount };
}

export function PlanosNutricaoKanban({ planos, alunoId, checkins, onRefresh }: Props) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewModal, setViewModal] = useState<{
    planId: string;
    edit: boolean;
  } | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [cloneStudents, setCloneStudents] = useState<CloneStudentOption[]>([]);
  const [cloneStudentsLoading, setCloneStudentsLoading] = useState(false);
  const [cloningPlan, setCloningPlan] = useState<PlanoNutricaoKanbanItem | null>(null);
  const [cloningBusy, setCloningBusy] = useState(false);

  useEffect(() => {
    if (!menuId) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-nutri-menu]')) setMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuId]);

  const sorted = useMemo(() => {
    const rank = (s: string) => (s === 'archived' ? 1 : 0);
    return [...planos].sort((a, b) => {
      const d = rank(a.status) - rank(b.status);
      if (d !== 0) return d;
      return String(b.updated_at || b.created_at || '').localeCompare(
        String(a.updated_at || a.created_at || ''),
      );
    });
  }, [planos]);

  const getToken = async () => {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session) throw new Error('Sessão expirada');
    return session.access_token;
  };

  const createQuickPlan = async () => {
    setCreating(true);
    setError(null);
    try {
      const token = await getToken();
      const { planId } = await saveNutritionPlanPayload(token, {
        plan: {
          student_id: alunoId,
          name: 'Novo plano alimentar',
          goal: 'Hipertrofia',
          status: 'active',
          calories_target: null,
          protein_target: null,
          carbs_target: null,
          fat_target: null,
          notes: null,
          orientacoes_gerais: null,
        },
        meals: serializeMealsForSave(
          DEFAULT_MEALS.map((m, idx) => ({
            ...m,
            time_suggestion: null,
            notes: null,
            sort_order: idx,
            items: [],
          })),
        ),
      });
      onRefresh();
      setViewModal({ planId, edit: true });
    } catch (err: any) {
      setError(err.message || 'Erro ao criar plano');
    } finally {
      setCreating(false);
    }
  };

  const archivePlan = async (planId: string) => {
    setActionLoading(planId);
    setMenuId(null);
    try {
      const { error: updErr } = await supabaseClient
        .from('nutrition_plans')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', planId);
      if (updErr) throw updErr;
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Erro ao arquivar');
    } finally {
      setActionLoading(null);
    }
  };

  const unarchivePlan = async (planId: string) => {
    setActionLoading(planId);
    setMenuId(null);
    try {
      const now = new Date().toISOString();
      const { error: archiveErr } = await supabaseClient
        .from('nutrition_plans')
        .update({ status: 'archived', updated_at: now })
        .eq('student_id', alunoId)
        .eq('status', 'active')
        .neq('id', planId);
      if (archiveErr) throw archiveErr;

      const { error: updErr } = await supabaseClient
        .from('nutrition_plans')
        .update({
          status: 'active',
          published_at: now,
          updated_at: now,
        })
        .eq('id', planId);
      if (updErr) throw updErr;
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Erro ao desarquivar');
    } finally {
      setActionLoading(null);
    }
  };

  const deletePlan = async (planId: string) => {
    setActionLoading(planId);
    setMenuId(null);
    try {
      const { error: delErr } = await supabaseClient
        .from('nutrition_plans')
        .delete()
        .eq('id', planId);
      if (delErr) throw delErr;
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir plano');
    } finally {
      setActionLoading(null);
    }
  };

  const loadCloneStudents = async () => {
    setCloneStudentsLoading(true);
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('Sessão expirada');
      const { data: links } = await supabaseClient
        .from('coach_alunos')
        .select('aluno_id')
        .eq('coach_id', session.user.id);
      const ids = (links || []).map((l) => l.aluno_id).filter((aid) => aid !== alunoId);
      if (ids.length === 0) {
        setCloneStudents([]);
        return;
      }
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('id, coaching_reference, full_name, email')
        .in('id', ids)
        .eq('arquivado', false);
      setCloneStudents(
        (profiles || []).map((p) => ({
          id: p.id,
          nome: p.coaching_reference || p.full_name || p.email || p.id,
        })),
      );
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar alunos');
      setCloneStudents([]);
    } finally {
      setCloneStudentsLoading(false);
    }
  };

  const openCloneToStudents = (plan: PlanoNutricaoKanbanItem) => {
    setMenuId(null);
    setCloningPlan(plan);
    void loadCloneStudents();
  };

  /** Duplicar no mesmo aluno */
  const duplicatePlan = async (plan: PlanoNutricaoKanbanItem) => {
    setActionLoading(plan.id);
    setMenuId(null);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/nutricao/plans/${plan.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar plano');
      const full = data.plan;
      const meals = (full.days?.[0]?.meals || []).map((m: any) => ({
        meal_type: m.meal_type,
        title: m.title,
        time_suggestion: m.time_suggestion,
        notes: m.notes,
        items: (m.items || []).map((it: any) => ({
          food_id: it.food_id,
          quantity_grams: it.quantity_grams,
          portion_label: it.portion_label,
          notes: it.notes,
          substitutions: it.substitutions || [],
        })),
      }));
      const { planId } = await saveNutritionPlanPayload(token, {
        plan: {
          student_id: alunoId,
          name: `${full.name || plan.name} — cópia`,
          goal: full.goal || plan.goal,
          notes: full.notes,
          orientacoes_gerais: full.orientacoes_gerais || full.notes,
          calories_target: full.calories_target,
          protein_target: full.protein_target,
          carbs_target: full.carbs_target,
          fat_target: full.fat_target,
          status: 'active',
        },
        meals: serializeMealsForSave(meals),
      });
      onRefresh();
      setViewModal({ planId, edit: true });
    } catch (err: any) {
      setError(err.message || 'Erro ao duplicar');
    } finally {
      setActionLoading(null);
    }
  };

  const clonePlanToStudents = async (studentIds: string[]) => {
    if (!cloningPlan || studentIds.length === 0) return;
    setCloningBusy(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/nutricao/plans/${cloningPlan.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar plano');
      const full = data.plan;
      const meals = serializeMealsForSave(
        (full.days?.[0]?.meals || []).map((m: any) => ({
          meal_type: m.meal_type,
          title: m.title,
          time_suggestion: m.time_suggestion,
          notes: m.notes,
          items: (m.items || []).map((it: any) => ({
            food_id: it.food_id,
            quantity_grams: it.quantity_grams,
            portion_label: it.portion_label,
            notes: it.notes,
            substitutions: it.substitutions || [],
          })),
        })),
      );

      for (const studentId of studentIds) {
        await saveNutritionPlanPayload(token, {
          plan: {
            student_id: studentId,
            name: full.name || cloningPlan.name,
            goal: full.goal || cloningPlan.goal,
            notes: full.notes,
            orientacoes_gerais: full.orientacoes_gerais || full.notes,
            calories_target: full.calories_target,
            protein_target: full.protein_target,
            carbs_target: full.carbs_target,
            fat_target: full.fat_target,
            status: 'active',
          },
          meals,
        });
      }
      setCloningPlan(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Erro ao clonar plano');
    } finally {
      setCloningBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="px-3 py-2 rounded-lg bg-danger-subtle text-danger text-[11px] font-semibold">
          {error}
        </div>
      )}

      <div className="flex overflow-x-auto items-start gap-3 pb-2 md:overflow-x-visible md:pb-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
        {sorted.map((plan) => {
          const meals = mealsOf(plan);
          const { today, week7, series, mealsCount } = planAdherence(plan, checkins);
          const chartData = series.map((p) => ({ date: p.date, value: p.value }));
          const busy = actionLoading === plan.id;
          const isArchived = plan.status === 'archived';
          const statusKey = displayStatus(plan.status);

          return (
            <div
              key={plan.id}
              className={cn(
                'shrink-0 w-[270px] md:w-auto flex flex-col rounded-xl border-0 bg-surface-1',
                busy && 'opacity-60',
                isArchived && 'opacity-45',
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 px-3 py-2.5 border-b border-border-divider pointer-events-auto">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-[13px] font-semibold text-text-primary truncate leading-tight">
                      {plan.name || 'Plano alimentar'}
                    </h4>
                    <span
                      className={cn(
                        'shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded',
                        STATUS_CLASS[statusKey],
                      )}
                    >
                      {STATUS_LABEL[statusKey]}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {plan.goal || 'Hipertrofia'}
                    {mealsCount
                      ? ` · ${mealsCount} refeiç${mealsCount === 1 ? 'ão' : 'ões'}`
                      : ''}
                  </p>
                </div>

                <div className="relative shrink-0" data-nutri-menu>
                  <button
                    type="button"
                    onClick={() => setMenuId(menuId === plan.id ? null : plan.id)}
                    className={cn(
                      'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
                      menuId === plan.id
                        ? 'bg-surface-2 text-text-primary'
                        : 'text-text-tertiary hover:text-text-primary hover:bg-surface-2',
                    )}
                    title="Ações"
                  >
                    <PencilSimple size={13} />
                  </button>
                  {menuId === plan.id && (
                    <div className="absolute top-full right-0 mt-1 bg-surface-2 border border-border-divider rounded-xl shadow-elev-2 z-50 min-w-40 overflow-hidden py-1">
                      <button
                        type="button"
                        disabled={isArchived}
                        className={cn(
                          'flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-medium text-left',
                          isArchived
                            ? 'text-text-disabled cursor-not-allowed'
                            : 'text-text-primary hover:bg-surface-1',
                        )}
                        onClick={() => {
                          if (isArchived) return;
                          setMenuId(null);
                          setViewModal({ planId: plan.id, edit: true });
                        }}
                      >
                        <PencilSimple size={12} className="shrink-0" />
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={isArchived}
                        className={cn(
                          'flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-medium text-left',
                          isArchived
                            ? 'text-text-disabled cursor-not-allowed'
                            : 'text-text-primary hover:bg-surface-1',
                        )}
                        onClick={() => {
                          if (isArchived) return;
                          void duplicatePlan(plan);
                        }}
                      >
                        <Copy size={12} className="shrink-0" />
                        Duplicar
                      </button>
                      {isArchived ? (
                        <button
                          type="button"
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-medium text-text-primary hover:bg-surface-1 text-left"
                          onClick={() => void unarchivePlan(plan.id)}
                        >
                          <FolderSimple size={12} className="shrink-0" />
                          Desarquivar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-medium text-text-primary hover:bg-surface-1 text-left"
                          onClick={() => {
                            setMenuId(null);
                            setConfirm({
                              title: 'Arquivar plano?',
                              message: `O plano “${plan.name}” será arquivado.`,
                              confirmLabel: 'Arquivar',
                              onConfirm: () => void archivePlan(plan.id),
                            });
                          }}
                        >
                          <FolderSimple size={12} className="shrink-0" />
                          Arquivar
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isArchived}
                        className={cn(
                          'flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-medium text-left',
                          isArchived
                            ? 'text-text-disabled cursor-not-allowed'
                            : 'text-text-primary hover:bg-surface-1',
                        )}
                        onClick={() => {
                          if (isArchived) return;
                          openCloneToStudents(plan);
                        }}
                      >
                        <UsersThree size={12} className="shrink-0" />
                        Clonar
                      </button>
                      <button
                        type="button"
                        disabled={isArchived}
                        className={cn(
                          'flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-medium text-left',
                          isArchived
                            ? 'text-text-disabled cursor-not-allowed'
                            : 'text-danger hover:bg-surface-1',
                        )}
                        onClick={() => {
                          if (isArchived) return;
                          setMenuId(null);
                          setConfirm({
                            title: 'Excluir plano?',
                            message: `Excluir “${plan.name}”? Esta ação não pode ser desfeita.`,
                            confirmLabel: 'Excluir',
                            destructive: true,
                            onConfirm: () => void deletePlan(plan.id),
                          });
                        }}
                      >
                        <Trash size={12} className="shrink-0" />
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className={cn(isArchived && 'pointer-events-none')}>
              {/* Macros compactos */}
              <div className="grid grid-cols-4 gap-1 px-3 py-2 text-center">
                {[
                  { label: 'kcal', value: plan.calories_target },
                  { label: 'P', value: plan.protein_target, suffix: 'g' },
                  { label: 'C', value: plan.carbs_target, suffix: 'g' },
                  { label: 'G', value: plan.fat_target, suffix: 'g' },
                ].map((m) => (
                  <div key={m.label} className="flex flex-col min-w-0">
                    <span className="text-[8px] uppercase font-semibold text-text-tertiary tracking-wider">
                      {m.label}
                    </span>
                    <span className="text-[11px] font-bold text-text-primary tabular-nums lining-nums truncate">
                      {m.value != null ? `${m.value}${m.suffix || ''}` : '—'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Adesão + chart compacto */}
              <div className="px-3 pb-1.5 flex items-center gap-3 text-[10px]">
                <div>
                  <p className="text-[8px] uppercase font-semibold text-text-tertiary">Hoje</p>
                  <p className="font-bold text-text-primary tabular-nums lining-nums">{today}%</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase font-semibold text-text-tertiary">7 dias</p>
                  <p className="font-bold text-text-primary tabular-nums lining-nums">{week7}%</p>
                </div>
              </div>
              <div className="px-2 pb-2">
                <MeasurementLineChart
                  data={chartData}
                  height={72}
                  isDesktop
                  yDomain={[0, 100]}
                  labelMode="all"
                  solidBackground
                  formatValue={(v) => `${v}%`}
                />
              </div>

              {/* Refeições */}
              <div className="px-3 overflow-y-auto max-h-36 border-t border-border-divider">
                {meals.length === 0 ? (
                  <p className="text-[11px] text-text-tertiary text-center py-3">Sem refeições</p>
                ) : (
                  <ul className="divide-y divide-[color:var(--list-row-divider)]">
                    {meals.map((meal, idx) => (
                      <li key={meal.id || idx} className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-text-primary truncate">
                          {meal.title ||
                            MEAL_TYPE_LABELS[meal.meal_type as NutritionMealType] ||
                            'Refeição'}
                        </span>
                        {meal.time_suggestion && (
                          <span className="text-[10px] text-text-tertiary font-mono tabular-nums shrink-0">
                            {String(meal.time_suggestion).slice(0, 5)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewModal({ planId: plan.id, edit: false })}
                className="mx-3 my-2.5 text-left text-[11px] font-semibold text-brand hover:text-brand-hover border-0 bg-transparent py-1 transition-colors"
              >
                Ver plano
              </button>
              </div>
            </div>
          );
        })}

        {/* CTA desktop */}
        <button
          type="button"
          onClick={() => void createQuickPlan()}
          disabled={creating}
          className="hidden md:flex shrink-0 min-h-44 rounded-xl border border-dashed border-[#9333ea]/35 bg-transparent text-[11px] font-medium text-[#9333ea] hover:border-[#9333ea]/60 hover:bg-[#9333ea]/5 transition-colors flex-col items-center justify-center gap-2 disabled:opacity-50"
        >
          {creating ? (
            <FloppyDisk size={18} className="animate-pulse" />
          ) : (
            <AppleLogo size={18} weight="fill" />
          )}
          {creating ? 'Criando…' : 'novo plano'}
        </button>
      </div>

      {/* CTA mobile */}
      <button
        type="button"
        onClick={() => void createQuickPlan()}
        disabled={creating}
        className="md:hidden w-full min-h-18 rounded-xl border border-dashed border-[#9333ea]/35 bg-transparent text-[11px] font-medium text-[#9333ea] hover:border-[#9333ea]/60 hover:bg-[#9333ea]/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <AppleLogo size={18} weight="fill" />
        {creating ? 'Criando…' : 'novo plano'}
      </button>

      {viewModal && (
        <NutritionPlanViewModal
          planId={viewModal.planId}
          open
          startInEdit={viewModal.edit}
          onClose={() => {
            setViewModal(null);
            onRefresh();
          }}
          onUpdated={() => onRefresh()}
        />
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          destructive={confirm.destructive}
          onConfirm={() => {
            const fn = confirm.onConfirm;
            setConfirm(null);
            fn();
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      <CloneToStudentsModal
        open={!!cloningPlan}
        title="Clonar plano"
        subtitle={cloningPlan?.name}
        students={cloneStudents}
        loadingStudents={cloneStudentsLoading}
        confirming={cloningBusy}
        onClose={() => setCloningPlan(null)}
        onConfirm={(ids) => void clonePlanToStudents(ids)}
      />
    </div>
  );
}
