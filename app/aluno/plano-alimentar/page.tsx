'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { extractStoragePath } from '@/lib/storageUrls';
import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import PDFViewer from '@/app/components/PDFViewer';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import Link from 'next/link';
import {
  ArrowLeft, ForkKnife, FileText, Drop, Check, Plus, Minus, CaretDown, CaretUp, FilePdf,
  Clock, Flame, Egg, Bread, DropHalf
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import { calculateItemMacros, sumMacros, CalculatedMacro } from '@/lib/nutrition/calculateMacros';
import { Card } from '@/components/ui/Card';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PlanoPDF {
  id: string;
  aluno_id: string;
  nome_arquivo: string;
  descricao: string | null;
  criado_em: string;
  url_pdf: string;
}

interface RegistroAgua {
  id: string | null;
  copos: number;
  ml_por_copo: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlanoAlimentarPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Digital Plan states
  const [digitalPlan, setDigitalPlan] = useState<any | null>(null);
  const [digitalCheckins, setDigitalCheckins] = useState<Record<string, string>>({}); // meal_id -> status ('done', etc)
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [togglingMealId, setTogglingMealId] = useState<string | null>(null);

  // PDF Plan states
  const [planoPDF, setPlanoPDF] = useState<PlanoPDF | null>(null);
  const [historicoPDFs, setHistoricoPDFs] = useState<PlanoPDF[]>([]);
  const [legacyRefeicoes, setLegacyRefeicoes] = useState<any[]>([]);
  const [legacyConsumidos, setLegacyConsumidos] = useState<Set<string>>(new Set());

  // Common features
  const [agua, setAgua] = useState<RegistroAgua>({ id: null, copos: 0, ml_por_copo: 250 });
  const [metaCopos] = useState(8);
  const [savingAgua, setSavingAgua] = useState(false);

  // PDF Viewer
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>('');

  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // ── Carregar Dados ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const session = await getSafeSession();
      const user = session?.user;
      if (!user) { setLoading(false); return; }

      const uid = user.id;
      setUserId(uid);
      const today = getTodayISO();

      // 1. Tentar buscar o plano digital ativo do aluno via API otimizada (bypassa RLS lento no client-side)
      const resPlan = await fetch('/api/aluno/plano-alimentar/digital', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const resPlanData = await resPlan.json();
      const digitalPlanData = resPlanData?.plan;

      if (digitalPlanData) {
        setDigitalPlan(digitalPlanData);

        // Carregar check-ins do dia para esse plano digital
        const { data: checkins } = await supabaseClient
          .from('nutrition_meal_checkins')
          .select('meal_id, status')
          .eq('student_id', uid)
          .eq('checkin_date', today);

        const checkinsMap: Record<string, string> = {};
        if (checkins) {
          checkins.forEach(c => {
            checkinsMap[c.meal_id] = c.status;
          });
        }
        setDigitalCheckins(checkinsMap);

        // Auto-expandir primeira refeição que não foi feita
        const day1 = digitalPlanData.days?.[0];
        if (day1 && day1.meals && day1.meals.length > 0) {
          const firstPending = day1.meals.find((m: any) => !checkinsMap[m.id]);
          if (firstPending) {
            setExpandedMeals({ [firstPending.id]: true });
          } else {
            setExpandedMeals({ [day1.meals[0].id]: true });
          }
        }
      }

      // 2. Buscar planos em PDF (para histórico ou se não houver digital ativo)
      const { data: plansPDFData } = await supabaseClient
        .from('plano_alimentar_pdf')
        .select('id, aluno_id, nome_arquivo, descricao, criado_em, url_pdf')
        .eq('aluno_id', uid)
        .order('criado_em', { ascending: false });

      if (plansPDFData && plansPDFData.length > 0) {
        if (!digitalPlanData) {
          // Se não houver plano digital ativo, o PDF mais recente vira o principal
          setPlanoPDF(plansPDFData[0]);
          setHistoricoPDFs(plansPDFData.slice(1));

          // Carregar refeições legadas do PDF principal
          const { data: refeicaoData } = await supabaseClient
            .from('refeicoes_plano')
            .select('id, plano_id, nome, horario_sugerido, ordem, ingredientes, observacoes')
            .eq('plano_id', plansPDFData[0].id)
            .order('ordem', { ascending: true });

          setLegacyRefeicoes(refeicaoData || []);

          if (refeicaoData && refeicaoData.length > 0) {
            const ids = refeicaoData.map((r: any) => r.id);
            const { data: consumos } = await supabaseClient
              .from('consumos_refeicao')
              .select('refeicao_id')
              .eq('aluno_id', uid)
              .eq('data_consumo', today)
              .in('refeicao_id', ids);

            setLegacyConsumidos(new Set((consumos || []).map((c: any) => c.refeicao_id)));
          }
        } else {
          // Se houver plano digital, todos os PDFs viram histórico
          setHistoricoPDFs(plansPDFData);
        }
      }

      // 3. Carregar registro de água
      const { data: aguaData } = await supabaseClient
        .from('registros_agua')
        .select('id, copos, ml_por_copo')
        .eq('aluno_id', uid)
        .eq('data_registro', today)
        .maybeSingle();

      if (aguaData) {
        setAgua({ id: aguaData.id, copos: aguaData.copos, ml_por_copo: aguaData.ml_por_copo });
      }
    } catch (err) {
      console.error('[PlanoAlimentar] Erro geral ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Ações de Hidratação ──────────────────────────────────────────────────────

  const updateAgua = async (delta: number) => {
    if (!userId || savingAgua) return;
    const next = Math.max(0, Math.min(20, agua.copos + delta));
    if (next === agua.copos) return;

    setSavingAgua(true);
    const today = getTodayISO();

    try {
      if (agua.id) {
        await supabaseClient
          .from('registros_agua')
          .update({ copos: next, atualizado_em: new Date().toISOString() })
          .eq('id', agua.id);
      } else {
        const { data } = await supabaseClient
          .from('registros_agua')
          .insert({ aluno_id: userId, data_registro: today, copos: next, ml_por_copo: agua.ml_por_copo })
          .select('id')
          .single();
        setAgua(a => ({ ...a, id: data?.id ?? null }));
      }
      setAgua(a => ({ ...a, copos: next }));
    } catch (err) {
      console.error('[Água] Erro:', err);
    } finally {
      setSavingAgua(false);
    }
  };

  // ── Ações do Plano Digital ───────────────────────────────────────────────────

  const toggleDigitalMeal = async (mealId: string) => {
    if (!userId || !digitalPlan || togglingMealId) return;
    setTogglingMealId(mealId);
    setFeedbackError(null);

    const today = getTodayISO();
    const isDone = digitalCheckins[mealId] === 'done';

    try {
      if (isDone) {
        // Desmarcar
        const { error } = await supabaseClient
          .from('nutrition_meal_checkins')
          .delete()
          .eq('student_id', userId)
          .eq('meal_id', mealId)
          .eq('checkin_date', today);

        if (error) throw error;

        setDigitalCheckins(prev => {
          const next = { ...prev };
          delete next[mealId];
          return next;
        });
      } else {
        // Marcar feita
        const { error } = await supabaseClient
          .from('nutrition_meal_checkins')
          .upsert({
            student_id: userId,
            plan_id: digitalPlan.id,
            meal_id: mealId,
            checkin_date: today,
            status: 'done',
            created_at: new Date().toISOString()
          }, {
            onConflict: 'student_id,meal_id,checkin_date'
          });

        if (error) throw error;

        setDigitalCheckins(prev => ({
          ...prev,
          [mealId]: 'done'
        }));
      }
    } catch (err: any) {
      console.error('[Digital Checkin] Erro:', err);
      setFeedbackError('Não foi possível registrar agora. Tente novamente.');
      setTimeout(() => setFeedbackError(null), 4000);
    } finally {
      setTogglingMealId(null);
    }
  };

  const getDigitalMealMacros = (meal: any): CalculatedMacro => {
    const itemMacros = (meal.items || []).map((item: any) => {
      const food = item.food;
      if (!food) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      return calculateItemMacros(food, Number(item.quantity_grams));
    });
    return sumMacros(itemMacros);
  };

  const getDigitalPlanMacros = (): CalculatedMacro => {
    const day1 = digitalPlan?.days?.[0];
    if (!day1 || !day1.meals) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    const mealMacros = day1.meals.map((m: any) => getDigitalMealMacros(m));
    return sumMacros(mealMacros);
  };

  // ── Ações do Plano PDF ────────────────────────────────────────────────────────

  const toggleLegacyMeal = async (refeicaoId: string) => {
    if (!userId || togglingMealId) return;
    setTogglingMealId(refeicaoId);

    const today = getTodayISO();
    const jaConsumido = legacyConsumidos.has(refeicaoId);

    try {
      if (jaConsumido) {
        await supabaseClient
          .from('consumos_refeicao')
          .delete()
          .eq('aluno_id', userId)
          .eq('refeicao_id', refeicaoId)
          .eq('data_consumo', today);

        setLegacyConsumidos(prev => {
          const next = new Set(prev);
          next.delete(refeicaoId);
          return next;
        });
      } else {
        await supabaseClient
          .from('consumos_refeicao')
          .insert({ aluno_id: userId, refeicao_id: refeicaoId, data_consumo: today });

        setLegacyConsumidos(prev => new Set([...prev, refeicaoId]));
      }
    } catch (err) {
      console.error('[Consumo Legado] Erro:', err);
    } finally {
      setTogglingMealId(null);
    }
  };

  // ── Visualização de PDF ───────────────────────────────────────────────────────

  const openPdfForPlan = async (targetPlano: PlanoPDF) => {
    if (!userId) return;
    if (targetPlano.aluno_id !== userId) return;

    try {
      const filePath = extractStoragePath('plano_alimentar', targetPlano.url_pdf) || targetPlano.url_pdf;
      const { data, error } = await supabaseClient.storage
        .from('plano_alimentar')
        .createSignedUrl(filePath, 3600);

      if (error || !data?.signedUrl) {
        alert('Erro ao abrir PDF. Tente novamente.');
        return;
      }
      setPdfUrl(data.signedUrl);
      setPdfTitle(targetPlano.nome_arquivo);
      setPdfViewerOpen(true);
    } catch (err) {
      console.error('[PDF] Erro:', err);
    }
  };

  const openPdf = () => {
    if (planoPDF) openPdfForPlan(planoPDF);
  };

  // ── Renderização ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Carregando rotina alimentar..." />
      </div>
    );
  }

  const hojeFormatado = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Digital calculations
  const totalMealsCount = digitalPlan?.days?.[0]?.meals?.length || 0;
  const completedMealsCount = Object.keys(digitalCheckins).length;
  const digitalPlanMacros = getDigitalPlanMacros();

  // Legacy calculations
  const totalLegacyMeals = legacyRefeicoes.length;
  const completedLegacyMeals = legacyConsumidos.size;

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-24">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">

          {/* ── Header ── */}
          <div>
            <Link
              href="/aluno/dashboard"
              className="inline-flex items-center gap-1.5 text-brand text-2xs uppercase tracking-caps mb-3 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" /> Dashboard
            </Link>
            <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-0.5">
              {hojeFormatado}
            </p>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Nutrição</h1>
          </div>

          {/* Feedback error toast */}
          {feedbackError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-xs font-semibold animate-shake">
              <div className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0 animate-pulse" />
              {feedbackError}
            </div>
          )}

          {/* ── SEM PLANO (Nem digital nem PDF) ── */}
          {!digitalPlan && !planoPDF && (
            <div className="flex flex-col items-center text-center gap-4 px-4 py-8">
              <div className="w-16 h-16 bg-surface-2 border border-border-subtle rounded-2xl flex items-center justify-center">
                <ForkKnife className="w-8 h-8 text-brand" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary mb-2">Plano alimentar em preparação</h2>
                <p className="text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
                  Seu coach ainda não liberou um plano alimentar para você. Enquanto isso, mantenha a hidratação e rotina saudável.
                </p>
              </div>

              {/* Dicas temporárias */}
              <div className="w-full mt-4 flex flex-col gap-2 text-left">
                <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-1">Dicas de hidratação e rotina</p>
                {[
                  { icon: '💧', text: 'Beba pelo menos 35ml de água por kg de peso todos os dias' },
                  { icon: '🥩', text: 'Consuma fontes limpas de proteínas em todas as refeições' },
                  { icon: '⏰', text: 'Tente comer a cada 3 ou 4 horas para manter o metabolismo ativo' },
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 bg-surface-1 border border-border-subtle rounded-xl px-4 py-3">
                    <span className="text-lg leading-none flex-shrink-0">{tip.icon}</span>
                    <span className="text-xs text-text-secondary leading-relaxed font-medium">{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CASO 1: PLANO DIGITAL ATIVO (Destaque Principal) ── */}
          {digitalPlan && (
            <>
              {/* Card de metas e resumo */}
              <Card className="rounded-2xl border border-border-subtle p-4 flex flex-col gap-4 bg-surface-1">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold text-success uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/10 border border-success/20">
                      Plano Digital Ativo
                    </span>
                    <h2 className="text-base font-bold text-text-primary mt-2 truncate">{digitalPlan.name}</h2>
                    <p className="text-xs text-text-secondary">Foco: {digitalPlan.goal || 'Hipertrofia'}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-text-secondary">
                      {completedMealsCount} de {totalMealsCount} feitas
                    </span>
                    <p className="text-[9px] text-text-tertiary">Adesão de hoje</p>
                  </div>
                </div>

                {/* Progresso de refeições */}
                <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden w-full">
                  <div 
                    className="h-full bg-brand rounded-full transition-all duration-300"
                    style={{ width: `${totalMealsCount > 0 ? (completedMealsCount / totalMealsCount) * 100 : 0}%` }}
                  />
                </div>

                {/* Targets Summary discretos */}
                {digitalPlan.calories_target && (
                  <div className="border-t border-border-subtle/30 pt-3 grid grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-text-tertiary tracking-wider mb-0.5">Calorias</span>
                      <span className="text-text-primary font-bold">{digitalPlanMacros.calories} / {digitalPlan.calories_target} kcal</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-text-tertiary tracking-wider mb-0.5">Proteínas</span>
                      <span className="text-text-primary font-bold">{digitalPlanMacros.protein} / {digitalPlan.protein_target || '—'}g</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-text-tertiary tracking-wider mb-0.5">Carbos</span>
                      <span className="text-text-primary font-bold">{digitalPlanMacros.carbs} / {digitalPlan.carbs_target || '—'}g</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-text-tertiary tracking-wider mb-0.5">Gorduras</span>
                      <span className="text-text-primary font-bold">{digitalPlanMacros.fat} / {digitalPlan.fat_target || '—'}g</span>
                    </div>
                  </div>
                )}
              </Card>

              {/* Lista de Refeições Digitais */}
              <div className="flex flex-col gap-3">
                {digitalPlan.days?.[0]?.meals?.map((meal: any) => {
                  const isMealDone = digitalCheckins[meal.id] === 'done';
                  const isExpanded = expandedMeals[meal.id];
                  const mMacros = getDigitalMealMacros(meal);

                  return (
                    <div
                      key={meal.id}
                      className={cn(
                        'rounded-2xl border transition-all duration-200 overflow-hidden',
                        isMealDone
                          ? 'bg-success-subtle/30 border-success-border/60 shadow-sm'
                          : 'bg-surface-1 border-border-subtle shadow-sm'
                      )}
                    >
                      {/* Accordion trigger line */}
                      <div className="flex items-center gap-3 p-3">
                        {/* Check-in Toggle Button */}
                        <button
                          onClick={() => toggleDigitalMeal(meal.id)}
                          disabled={togglingMealId === meal.id}
                          className={cn(
                            'w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer',
                            isMealDone
                              ? 'bg-success border-success text-white'
                              : 'border-border-default bg-surface-2 text-transparent hover:border-brand/40'
                          )}
                          aria-label={isMealDone ? 'Desmarcar refeição' : 'Marcar como feita'}
                        >
                          <Check className="w-3.5 h-3.5" weight="bold" />
                        </button>

                        {/* Title and Time */}
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setExpandedMeals(prev => ({ ...prev, [meal.id]: !prev[meal.id] }))}
                        >
                          <p className={cn(
                            'text-xs font-bold leading-tight',
                            isMealDone ? 'text-success line-through opacity-80' : 'text-text-primary'
                          )}>
                            {meal.title}
                          </p>
                          {meal.time_suggestion && (
                            <span className="text-[10px] text-text-tertiary flex items-center gap-1 mt-0.5">
                              <Clock size={11} /> {meal.time_suggestion.slice(0, 5)}
                            </span>
                          )}
                        </div>

                        {/* Right Summary */}
                        <div 
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => setExpandedMeals(prev => ({ ...prev, [meal.id]: !prev[meal.id] }))}
                        >
                          <span className="text-[10px] font-mono text-text-tertiary">{mMacros.calories} kcal</span>
                          {isExpanded ? <CaretUp size={14} className="text-text-tertiary" /> : <CaretDown size={14} className="text-text-tertiary" />}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-border-subtle/30 bg-surface-1/40">
                          
                          {/* Foods list */}
                          <div className="mt-3 flex flex-col gap-2">
                            {meal.items?.map((item: any, itIdx: number) => {
                              const food = item.food;
                              if (!food) return null;

                              return (
                                <div key={itIdx} className="bg-surface-2/60 border border-border-subtle/20 rounded-lg p-2.5 flex flex-col gap-1.5">
                                  <div className="flex justify-between items-baseline gap-4">
                                    <span className="text-xs font-bold text-text-primary leading-tight">{food.name}</span>
                                    <span className="text-xs font-mono font-bold text-text-secondary shrink-0">
                                      {item.quantity_grams}g {item.portion_label ? `(${item.portion_label})` : ''}
                                    </span>
                                  </div>

                                  {/* Substitutions drawer/disclosure */}
                                  {item.substitutions && item.substitutions.length > 0 && (
                                    <div className="border-t border-border-subtle/20 pt-1.5 mt-1">
                                      <details className="group">
                                        <summary className="text-[9px] font-bold text-brand hover:text-brand-hover flex items-center gap-1 cursor-pointer select-none">
                                          Opções de substituição
                                        </summary>
                                        <div className="flex flex-col gap-1 mt-1.5 pl-2 border-l border-border-default">
                                          {item.substitutions.map((sub: any, subIdx: number) => {
                                            const subFood = sub.food;
                                            if (!subFood) return null;
                                            return (
                                              <div key={subIdx} className="text-[10px] text-text-secondary flex justify-between">
                                                <span>• {subFood.name}</span>
                                                <span className="font-mono font-semibold">{sub.quantity_grams}g {sub.portion_label ? `(${sub.portion_label})` : ''}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </details>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Meal Notes */}
                          {meal.notes && (
                            <div className="mt-3 p-2 bg-brand/5 border border-brand-border/30 rounded-lg text-[10px] text-text-secondary italic">
                              Recomendação: {meal.notes}
                            </div>
                          )}

                          {/* Quick Toggle Button in Footer */}
                          <div className="mt-3.5 pt-2.5 border-t border-border-subtle/25">
                            <button
                              onClick={() => toggleDigitalMeal(meal.id)}
                              disabled={togglingMealId === meal.id}
                              className={cn(
                                "w-full h-8.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                isMealDone
                                  ? "bg-surface-3 border border-border-subtle text-text-secondary hover:text-danger"
                                  : "bg-success text-white hover:bg-success-hover"
                              )}
                            >
                              <Check size={14} weight="bold" />
                              {isMealDone ? 'Desmarcar Refeição' : 'Marcar Refeição como Feita'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── CASO 2: APENAS PLANO PDF ATIVO (Fallback) ── */}
          {!digitalPlan && planoPDF && (
            <>
              {/* PDF Highlight Card */}
              <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-surface-3 border border-border-subtle flex items-center justify-center text-brand flex-shrink-0">
                    <ForkKnife className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {planoPDF.nome_arquivo.replace('.pdf', '')}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      Enviado em {new Date(planoPDF.criado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={openPdf}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-surface-3 border border-border-subtle text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-border-default transition-colors flex-shrink-0 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Ver PDF
                </button>
              </div>

              {/* Legacy meals */}
              {legacyRefeicoes.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Refeições de hoje</p>
                    <span className="text-xs text-text-tertiary">
                      {completedLegacyMeals} de {totalLegacyMeals} feitas
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-surface-3 rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full transition-all duration-300"
                      style={{ width: totalLegacyMeals > 0 ? `${(completedLegacyMeals / totalLegacyMeals) * 100}%` : '0%' }}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    {legacyRefeicoes.map(r => {
                      const feita = legacyConsumidos.has(r.id);
                      const expanded = expandedMeals[r.id];
                      const ingreds = r.ingredientes || [];

                      return (
                        <div
                          key={r.id}
                          className={cn(
                            'rounded-2xl border transition-all duration-200',
                            feita
                              ? 'bg-success-subtle border-success-border shadow-elev-1'
                              : 'bg-surface-1 border-border-subtle shadow-elev-1'
                          )}
                        >
                          <div className="flex items-center gap-3 p-3">
                            <button
                              onClick={() => toggleLegacyMeal(r.id)}
                              disabled={togglingMealId === r.id}
                              className={cn(
                                'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer',
                                feita
                                  ? 'bg-success border-success text-white'
                                  : 'border-border-default bg-surface-3 text-transparent hover:border-brand'
                              )}
                            >
                              <Check className="w-3.5 h-3.5" weight="bold" />
                            </button>

                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                'text-sm font-semibold leading-tight',
                                feita ? 'text-success line-through opacity-70' : 'text-text-primary'
                              )}>
                                {r.nome}
                              </p>
                              {r.horario_sugerido && (
                                <p className="text-2xs text-text-tertiary mt-0.5">{r.horario_sugerido.slice(0, 5)}</p>
                              )}
                            </div>

                            {ingreds.length > 0 && (
                              <button
                                onClick={() => setExpandedMeals(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                                className="w-8 h-8 flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
                              >
                                {expanded ? <CaretUp className="w-4 h-4" /> : <CaretDown className="w-4 h-4" />}
                              </button>
                            )}
                          </div>

                          {expanded && ingreds.length > 0 && (
                            <div className="px-3 pb-3 pt-0 border-t border-border-subtle/50">
                              <ul className="mt-2 space-y-1">
                                {ingreds.map((ing: any, i: number) => (
                                  <li key={i} className="flex items-center justify-between text-xs text-text-secondary">
                                    <span>{ing.nome}</span>
                                    {ing.quantidade && (
                                      <span className="text-text-tertiary ml-2">{ing.quantidade}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                              {r.observacoes && (
                                <p className="mt-2 text-xs text-text-tertiary italic border-t border-border-subtle/50 pt-2">
                                  {r.observacoes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}

          {/* ── ÁGUA (Sempre visível se houver algum plano cadastrado) ── */}
          {(digitalPlan || planoPDF) && (
            <section className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Drop className="w-4 h-4 text-brand" />
                  <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Hidratação</p>
                </div>
                <span className="text-xs text-text-tertiary">
                  {agua.copos * agua.ml_por_copo}ml / {metaCopos * agua.ml_por_copo}ml
                </span>
              </div>

              {/* Copos visuais */}
              <div className="flex gap-1.5 flex-wrap mb-4">
                {Array.from({ length: metaCopos }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => updateAgua(i < agua.copos ? -(agua.copos - i) : i + 1 - agua.copos)}
                    disabled={savingAgua}
                    className={cn(
                      'w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer',
                      i < agua.copos
                        ? 'bg-brand/20 border-brand text-brand'
                        : 'bg-surface-3 border-border-subtle text-text-tertiary'
                    )}
                    aria-label={`${i + 1} copo${i > 0 ? 's' : ''}`}
                  >
                    <Drop className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>

              {/* Controles +/- */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateAgua(-1)}
                  disabled={savingAgua || agua.copos === 0}
                  className="w-9 h-9 rounded-xl bg-surface-3 border border-border-subtle flex items-center justify-center text-text-secondary disabled:opacity-30 hover:text-text-primary transition-colors cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-lg font-bold text-text-primary">{agua.copos}</span>
                  <span className="text-xs text-text-tertiary ml-1">/ {metaCopos} copos</span>
                </div>
                <button
                  onClick={() => updateAgua(1)}
                  disabled={savingAgua || agua.copos >= metaCopos}
                  className="w-9 h-9 rounded-xl bg-brand text-text-on-brand flex items-center justify-center disabled:opacity-30 shadow-sm shadow-brand/30 transition-opacity cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {agua.copos >= metaCopos && (
                <p className="mt-3 text-xs font-semibold text-brand text-center">
                  Meta atingida! Excelente hidratação hoje.
                </p>
              )}
            </section>
          )}

          {/* ── HISTÓRICO DE DOCUMENTOS PDF ADICIONAIS ── */}
          {historicoPDFs.length > 0 && (
            <section className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-4">
              <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-3 flex items-center gap-1.5">
                <FilePdf className="w-3.5 h-3.5" />
                Documentos em PDF
              </p>
              <div className="flex flex-col gap-2">
                {historicoPDFs.map(histPlano => (
                  <div 
                    key={histPlano.id}
                    className="bg-surface-2 border border-border-subtle/50 rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FilePdf className="w-4 h-4 text-text-secondary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-text-primary truncate font-medium">
                          {histPlano.nome_arquivo.replace('.pdf', '')}
                        </p>
                        <p className="text-[10px] text-text-tertiary mt-0.5">
                          Enviado em {new Date(histPlano.criado_em).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openPdfForPlan(histPlano)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-3 border border-border-subtle text-[10px] font-bold text-text-secondary hover:text-text-primary transition-colors flex-shrink-0 cursor-pointer"
                    >
                      Abrir PDF
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>

      {/* PDF Viewer Modal */}
      {pdfViewerOpen && pdfUrl && (
        <PDFViewer
          url={pdfUrl}
          title={pdfTitle}
          onClose={() => { setPdfViewerOpen(false); setPdfUrl(null); }}
        />
      )}
    </SubscriptionGuard>
  );
}
