'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabaseClient';
import { 
  ArrowLeft, PencilSimple, Calendar, Sparkle, Note, 
  User, CheckCircle, Info, BookmarkSimple
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { calculateItemMacros, sumMacros, CalculatedMacro } from '@/lib/nutrition/calculateMacros';
import { formatFoodQuantityDisplay } from '@/lib/nutrition/portionDisplay';
import { cn } from '@/lib/utils/cn';

interface VerPlanoPageProps {
  params: Promise<{ id: string }>;
}

export default function VerPlanoPage({ params }: VerPlanoPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alunoProfile, setAlunoProfile] = useState<any>(null);
  
  // Duplication & Template States
  const [alunos, setAlunos] = useState<any[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [targetStudentId, setTargetStudentId] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function loadPlanDetails() {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
          setError('Sessão expirada. Faça login novamente.');
          return;
        }

        const res = await fetch(`/api/admin/nutricao/plans/${id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar plano');
        setPlan(data.plan);

        // Fetch student profile details
        if (data.plan?.student_id) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('full_name, coaching_reference, email')
            .eq('id', data.plan.student_id)
            .single();
          setAlunoProfile(profile);
        }

        // Fetch coach's students for duplication
        const { data: relationshipData } = await supabaseClient
          .from('coach_alunos')
          .select('aluno_id')
          .eq('coach_id', session.user.id);
        
        const studentIds = relationshipData?.map(r => r.aluno_id) || [];
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
    }
    loadPlanDetails();
  }, [id]);

  const handleDuplicatePlan = async () => {
    if (!targetStudentId) {
      alert('Por favor, selecione um aluno de destino.');
      return;
    }
    setActionLoading(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      // Clone meals and clean database IDs
      const clonedMeals = plan.days?.[0]?.meals?.map((m: any) => {
        const clonedMeal = {
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
              notes: sub.notes
            }))
          }))
        };
        return clonedMeal;
      }) || [];

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
          status: 'draft'
        },
        meals: clonedMeals
      };

      const res = await fetch('/api/admin/nutricao/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao duplicar plano');

      alert('Plano duplicado com sucesso! Redirecionando para edição...');
      router.push(`/admin/nutricao/planos/${result.planId}/editar`);
    } catch (err: any) {
      alert(err.message || 'Erro ao duplicar plano');
    } finally {
      setActionLoading(false);
      setShowDuplicateModal(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('Sessão expirada');
      const coachId = session.user.id;

      // Clone meals and clean database IDs
      const clonedMeals = plan.days?.[0]?.meals?.map((m: any) => {
        const clonedMeal = {
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
              notes: sub.notes
            }))
          }))
        };
        return clonedMeal;
      }) || [];

      const payload = {
        plan: {
          student_id: coachId, // Template references coach
          name: newTemplateName || `Template: ${plan.name}`,
          goal: plan.goal,
          notes: plan.notes,
          orientacoes_gerais: plan.orientacoes_gerais || plan.notes,
          calories_target: plan.calories_target,
          protein_target: plan.protein_target,
          carbs_target: plan.carbs_target,
          fat_target: plan.fat_target,
          status: 'template'
        },
        meals: clonedMeals
      };

      const res = await fetch('/api/admin/nutricao/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao salvar template');

      alert('Template salvo com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar template');
    } finally {
      setActionLoading(false);
      setShowTemplateModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4">
        <div className="p-4 bg-danger-subtle border border-danger-border text-danger text-xs font-semibold rounded-lg max-w-md text-center">
          {error || 'Plano alimentar não encontrado.'}
        </div>
      </div>
    );
  }

  // Helper macro sum calculation
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
    const mealMacros = day1.meals.map((m: any) => getMealMacros(m));
    return sumMacros(mealMacros);
  };

  const planMacros = getPlanMacros();

  // Status mapping
  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    active: 'Ativo',
    archived: 'Arquivado',
    paused: 'Pausado'
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-surface-2 border-card text-text-secondary',
    active: 'bg-success/15 border-success/30 text-success',
    archived: 'bg-surface-3 border-card text-text-disabled',
    paused: 'bg-warning/15 border-warning/30 text-warning'
  };

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-28">
      <div className="w-full max-w-[min(1600px,96vw)] mx-auto px-4">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 border-b border-divider/50 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/nutricao')}
              className="w-8 h-8 rounded-md bg-surface-2 border border-card hover:border-brand/40 text-text-secondary hover:text-brand flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                  {plan.name}
                </h1>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border",
                  statusColors[plan.status] || statusColors.draft
                )}>
                  {statusLabels[plan.status] || plan.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Aluno: <span className="text-text-primary font-bold">{alunoProfile?.coaching_reference || alunoProfile?.full_name || 'Desconhecido'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowTemplateModal(true)}
                className="h-9 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold gap-1.5 cursor-pointer border border-card hover:border-brand/40 w-full sm:w-auto justify-center"
              >
                Salvar Template
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowDuplicateModal(true)}
                className="h-9 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold gap-1.5 cursor-pointer border border-card hover:border-brand/40 w-full sm:w-auto justify-center"
              >
                Duplicar Plano
              </Button>
            </div>
            <Link href={`/admin/nutricao/planos/${plan.id}/editar`} className="w-full sm:w-auto">
              <Button variant="primary" className="h-9 px-3 rounded-lg text-xs font-bold gap-1.5 cursor-pointer w-full justify-center">
                <PencilSimple className="w-4 h-4" />
                Editar Plano
              </Button>
            </Link>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Details (70%) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* CARD 1: Info Card */}
            <Card className="rounded-xl border border-card p-4 md:p-5 flex flex-col gap-4">
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-divider/60 pb-2 flex items-center gap-2">
                <BookmarkSimple size={14} className="text-brand" />
                Dados do Plano
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider mb-0.5">Objetivo</p>
                  <p className="text-text-primary font-semibold">{plan.goal || 'Não definido'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider mb-0.5">Data Início</p>
                  <p className="text-text-primary font-semibold font-mono">
                    {plan.start_date ? new Date(plan.start_date).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider mb-0.5">Data Término</p>
                  <p className="text-text-primary font-semibold font-mono">
                    {plan.end_date ? new Date(plan.end_date).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
              </div>

              {(plan.orientacoes_gerais || plan.notes) && (
                <div className="bg-brand/5 p-3 rounded-lg border border-brand/25">
                  <p className="text-[10px] text-brand uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                    <Info size={12} />
                    Orientações gerais
                  </p>
                  <p className="text-xs text-text-secondary whitespace-pre-wrap font-medium">
                    {plan.orientacoes_gerais || plan.notes}
                  </p>
                </div>
              )}
            </Card>

            {/* CARD 2: Refeições */}
            <div className="flex flex-col gap-4">
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-divider/50 pb-2 flex items-center gap-2">
                <Note size={14} className="text-brand" />
                Refeições Planejadas
              </h2>

              {(!plan.days?.[0]?.meals || plan.days[0].meals.length === 0) ? (
                <p className="text-xs text-text-disabled text-center py-8">Nenhuma refeição cadastrada neste plano.</p>
              ) : (
                plan.days[0].meals.map((meal: any, mealIdx: number) => {
                  const mMacros = getMealMacros(meal);
                  return (
                    <Card key={mealIdx} className="rounded-xl border border-card/80 shadow-sm p-4 md:p-5 flex flex-col gap-3 bg-surface-1">
                      
                      {/* Meal Title Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-divider/40 pb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                          <span className="text-xs font-extrabold text-text-primary truncate">{meal.title}</span>
                          {meal.time_suggestion && (
                            <span className="bg-surface-2 border border-card text-[9px] px-1 rounded font-mono text-text-secondary shrink-0">
                              {meal.time_suggestion.slice(0, 5)}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col items-end sm:flex-row sm:items-center gap-0.5 sm:gap-3 text-[10px] font-mono text-text-tertiary shrink-0 text-right">
                          <span>{mMacros.calories} kcal</span>
                          <span>P: {mMacros.protein}g · C: {mMacros.carbs}g · G: {mMacros.fat}g</span>
                        </div>
                      </div>

                      {/* Items — Fase 8: lista, sem card aninhado */}
                      <div className="flex flex-col divide-y divide-border-subtle/40">
                        {(!meal.items || meal.items.length === 0) ? (
                          <p className="text-[10px] text-text-disabled">Nenhum item adicionado.</p>
                        ) : (
                          meal.items.map((item: any, itemIdx: number) => {
                            const food = item.food;
                            if (!food) return null;
                            const calculated = calculateItemMacros(food, item.quantity_grams);

                            return (
                              <div key={itemIdx} className="py-2.5 first:pt-0 flex flex-col gap-1">
                                <div className="flex justify-between items-baseline gap-3">
                                  <p className="text-xs font-bold text-text-primary min-w-0 truncate">{food.name}</p>
                                  <span className="text-xs font-bold text-text-secondary shrink-0 text-right">
                                    {(() => {
                                      const qty = formatFoodQuantityDisplay(
                                        item.quantity_grams,
                                        item.portion_label,
                                        food.portions?.find((p: any) => p.label === item.portion_label)?.grams,
                                      );
                                      return (
                                        <>
                                          {qty.primary}
                                          {qty.secondary ? (
                                            <span className="text-text-tertiary font-medium"> · {qty.secondary}</span>
                                          ) : null}
                                        </>
                                      );
                                    })()}
                                  </span>
                                </div>
                                <p className="text-[9px] font-mono text-text-tertiary">
                                  {calculated.calories} kcal · Proteína: {calculated.protein}g · Carboidratos: {calculated.carbs}g · Gorduras: {calculated.fat}g
                                </p>

                                {/* Substitutes */}
                                {item.substitutions && item.substitutions.length > 0 && (
                                  <div className="border-t border-divider/30 pt-1.5 mt-1 pl-3">
                                    <span className="text-[8px] uppercase font-bold text-text-tertiary tracking-wider block mb-1">Substitutos autorizados:</span>
                                    <div className="flex flex-col gap-1">
                                      {item.substitutions.map((sub: any, subIdx: number) => {
                                        const subFood = sub.food;
                                        if (!subFood) return null;
                                        return (
                                          <div key={subIdx} className="text-[9px] text-text-secondary flex justify-between">
                                            <span>• {subFood.name}</span>
                                            <span className="font-mono font-semibold">{sub.quantity_grams}g {sub.portion_label ? `(${sub.portion_label})` : ''}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {meal.notes && (
                        <p className="text-[9px] text-text-tertiary italic border-t border-divider/30 pt-2 mt-1">
                          Nota: {meal.notes}
                        </p>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Sidebar summaries (30%) */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 flex flex-col gap-6">
            
            {/* Macros summary card */}
            <Card className="rounded-xl border border-card p-4 md:p-5 flex flex-col gap-4">
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-divider/60 pb-2">
                Resumo do Planejado
              </h2>

              <div className="flex flex-col gap-3 font-mono">
                {/* Calories */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-text-secondary">Calorias:</span>
                    <span className="text-text-primary font-bold">{planMacros.calories} / {plan.calories_target || '—'} kcal</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand rounded-full transition-all duration-500"
                      style={{ width: `${plan.calories_target ? Math.min(100, (planMacros.calories / Number(plan.calories_target)) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Proteins */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-text-secondary">Proteínas:</span>
                    <span className="text-text-primary font-bold">{planMacros.protein} / {plan.protein_target || '—'} g</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success rounded-full transition-all duration-500"
                      style={{ width: `${plan.protein_target ? Math.min(100, (planMacros.protein / Number(plan.protein_target)) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Carbs */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-text-secondary">Carboidratos:</span>
                    <span className="text-text-primary font-bold">{planMacros.carbs} / {plan.carbs_target || '—'} g</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-warning rounded-full transition-all duration-500"
                      style={{ width: `${plan.carbs_target ? Math.min(100, (planMacros.carbs / Number(plan.carbs_target)) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Fats */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-text-secondary">Gorduras:</span>
                    <span className="text-text-primary font-bold">{planMacros.fat} / {plan.fat_target || '—'} g</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-danger rounded-full transition-all duration-500"
                      style={{ width: `${plan.fat_target ? Math.min(100, (planMacros.fat / Number(plan.fat_target)) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

        </div>

        {/* Modals */}
        {showDuplicateModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-1 border border-card rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-scale-in">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Duplicar Plano Alimentar</h3>
                <p className="text-2xs text-text-tertiary">Copie esta rotina para outro aluno para economizar tempo</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Aluno de Destino</label>
                <select
                  value={targetStudentId}
                  onChange={(e) => setTargetStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border-default rounded-md text-text-primary text-xs focus:outline-none focus:border-brand/40"
                >
                  <option value="">Selecione um aluno...</option>
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.coaching_reference || a.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Nome do Novo Plano</label>
                <input
                  type="text"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="Ex: Plano Alimentar - Cópia"
                  className="w-full px-3 py-2 bg-surface-2 border border-border-default rounded-md text-text-primary text-xs focus:outline-none focus:border-brand/40 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2.5 mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDuplicateModal(false)}
                  disabled={actionLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={actionLoading}
                  onClick={handleDuplicatePlan}
                  disabled={actionLoading || !targetStudentId || !newPlanName}
                >
                  Duplicar
                </Button>
              </div>
            </div>
          </div>
        )}

        {showTemplateModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-1 border border-card rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-scale-in">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Salvar como Template</h3>
                <p className="text-2xs text-text-tertiary">Salve as refeições e alimentos atuais como um modelo reutilizável</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Nome do Template</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Ex: Template: Hipertrofia 2500 kcal"
                  className="w-full px-3 py-2 bg-surface-2 border border-border-default rounded-md text-text-primary text-xs focus:outline-none focus:border-brand/40 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2.5 mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowTemplateModal(false)}
                  disabled={actionLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={actionLoading}
                  onClick={handleSaveAsTemplate}
                  disabled={actionLoading || !newTemplateName}
                >
                  Salvar Template
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
