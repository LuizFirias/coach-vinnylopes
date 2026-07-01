'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { extractStoragePath } from '@/lib/storageUrls';
import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import PDFViewer from '@/app/components/PDFViewer';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import {
  ForkKnife, FileText, Drop, Check, Plus, Minus, CaretDown, FilePdf,
  Clock,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import { calculateItemMacros, sumMacros, CalculatedMacro } from '@/lib/nutrition/calculateMacros';
import { Card } from '@/components/ui/Card';
import { getTodayBrazil } from '@/lib/dateUtils';

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
  return getTodayBrazil();
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
  const [loadedDate, setLoadedDate] = useState<string>('');

  // ── Carregar Dados ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const session = await getSafeSession();
      const user = session?.user;
      if (!user) { setLoading(false); return; }

      const uid = user.id;
      setUserId(uid);
      const today = getTodayISO();
      setLoadedDate(today);

      // 1. Tentar buscar o plano digital ativo do aluno via API otimizada
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

  const checkDateChange = useCallback(() => {
    const today = getTodayISO();
    if (loadedDate && today !== loadedDate) {
      setLoadedDate(today);
      setDigitalCheckins({});
      setLegacyConsumidos(new Set());
      setAgua({ id: null, copos: 0, ml_por_copo: 250 });
      fetchData();
      return true;
    }
    return false;
  }, [loadedDate, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkDateChange();
    }, 15000); // Verifica a cada 15 segundos
    return () => clearInterval(interval);
  }, [checkDateChange]);

  useEffect(() => {
    const handleFocus = () => {
      checkDateChange();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkDateChange]);

  // ── Ações de Hidratação ──────────────────────────────────────────────────────

  const updateAgua = async (delta: number) => {
    if (!userId || savingAgua) return;
    const dateChanged = checkDateChange();
    if (dateChanged) return;
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

  const toggleCopo = async (index: number) => {
    // Clicar num copo já bebido desmarca a partir dali; clicar num não-bebido marca até ele
    const newCopos = index < agua.copos ? index : index + 1;
    const delta = newCopos - agua.copos;
    await updateAgua(delta);
  };

  // ── Ações do Plano Digital ───────────────────────────────────────────────────

  const toggleDigitalMeal = async (mealId: string) => {
    if (!userId || !digitalPlan || togglingMealId) return;
    const dateChanged = checkDateChange();
    if (dateChanged) return;
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
    const dateChanged = checkDateChange();
    if (dateChanged) return;
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

  // Digital calculations
  const totalMealsCount = digitalPlan?.days?.[0]?.meals?.length || 0;
  const completedMealsCount = Object.keys(digitalCheckins).length;
  const digitalPlanMacros = getDigitalPlanMacros();

  // Legacy calculations
  const totalLegacyMeals = legacyRefeicoes.length;
  const completedLegacyMeals = legacyConsumidos.size;

  // Date header
  const now = new Date();
  const diasSemanaLabels = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const mesesLabels = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const diaSemanaStr = diasSemanaLabels[now.getDay()];
  const diaNumStr = now.getDate();
  const mesStr = mesesLabels[now.getMonth()];

  // Water
  const mlAtual = agua.copos * agua.ml_por_copo;
  const mlMeta = metaCopos * agua.ml_por_copo;

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-surface-0 pb-24 scroll-content">
        <div className="max-w-2xl mx-auto flex flex-col pt-safe">

          {/* ── Header — padrão igual ao dashboard, sem "← DASHBOARD" azul ── */}
          <div className="px-4 pt-4 pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted capitalize">
              {diaSemanaStr}, {diaNumStr} de {mesStr}
            </p>
            <h1 className="text-xl font-bold text-text-primary mt-0.5">Nutrição</h1>
          </div>

          {/* Feedback error toast */}
          {feedbackError && (
            <div className="mx-4 mb-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-xs font-semibold animate-shake">
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-1">Dicas de hidratação e rotina</p>
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

          {/* ── CASO 1: PLANO DIGITAL ATIVO ── */}
          {digitalPlan && (
            <>
              {/* Card de Plano Ativo — refatorado */}
              <div className="mx-4 mb-4 bg-surface-1 border border-border-subtle rounded-lg p-4">

                {/* Status + adesão lado a lado */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    {/* Dot em vez de badge pill verde */}
                    <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
                    <span className="text-[11px] font-medium text-success">Plano ativo</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono tabular-nums text-text-primary">
                      {completedMealsCount} de {totalMealsCount}
                    </p>
                    <p className="text-[10px] text-text-muted">refeições hoje</p>
                  </div>
                </div>

                {/* Nome e foco */}
                <p className="text-base font-bold text-text-primary">{digitalPlan.name}</p>
                <p className="text-xs text-text-muted mt-0.5">Foco: {digitalPlan.goal || 'Hipertrofia'}</p>

                {/* Barra de progresso */}
                <div className="mt-3 w-full h-1 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all duration-300"
                    style={{ width: `${totalMealsCount > 0 ? (completedMealsCount / totalMealsCount) * 100 : 0}%` }}
                  />
                </div>

                {/* Macros — grid 4 colunas */}
                {digitalPlan.calories_target && (
                  <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-border-subtle/50">
                    {[
                      { label: 'Kcal',     atual: digitalPlanMacros.calories,  meta: digitalPlan.calories_target,   unit: '' },
                      { label: 'Proteína', atual: digitalPlanMacros.protein,   meta: digitalPlan.protein_target,    unit: 'g' },
                      { label: 'Carbo',    atual: digitalPlanMacros.carbs,     meta: digitalPlan.carbs_target,      unit: 'g' },
                      { label: 'Gordura',  atual: digitalPlanMacros.fat,       meta: digitalPlan.fat_target,        unit: 'g' },
                    ].map(({ label, atual, meta, unit }) => (
                      <div key={label}>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-text-muted mb-0.5">
                          {label}
                        </p>
                        <p className="text-[12px] font-bold font-mono tabular-nums text-text-primary leading-tight">
                          {atual}
                        </p>
                        <p className="text-[10px] font-mono text-text-muted">
                          /{meta ?? '—'}{unit}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de Refeições Digitais */}
              <div className="mx-4 mb-4 flex flex-col gap-2">
                {digitalPlan.days?.[0]?.meals?.map((meal: any) => {
                  const isMealDone = digitalCheckins[meal.id] === 'done';
                  const isExpanded = expandedMeals[meal.id];
                  const mMacros = getDigitalMealMacros(meal);

                  return (
                    <div
                      key={meal.id}
                      className={cn(
                        'bg-surface-1 border rounded-lg overflow-hidden transition-colors duration-100',
                        isMealDone
                          ? 'border-success/20 bg-success/5'
                          : 'border-border-subtle'
                      )}
                    >
                      {/* Header da refeição — sempre visível */}
                      <button
                        onClick={() => setExpandedMeals(prev => ({ ...prev, [meal.id]: !prev[meal.id] }))}
                        className="w-full flex items-center gap-3 px-4 py-3"
                        id={`btn-refeicao-${meal.id}`}
                      >
                        {/* Check — compacto, caixa 20px rounded-md */}
                        <div
                          onClick={(e) => { e.stopPropagation(); toggleDigitalMeal(meal.id); }}
                          className={cn(
                            'w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 cursor-pointer',
                            isMealDone
                              ? 'bg-success border-success'
                              : 'border-border-default bg-surface-2'
                          )}
                        >
                          {isMealDone && (
                            <Check className="w-3 h-3 text-white" weight="bold" />
                          )}
                        </div>

                        <div className="flex-1 text-left">
                          {/* Nome — tachado quando concluída */}
                          <p className={cn(
                            'text-sm font-semibold',
                            isMealDone
                              ? 'line-through text-text-muted'
                              : 'text-text-primary'
                          )}>
                            {meal.title}
                          </p>
                          {meal.time_suggestion && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-text-muted" />
                              <p className="text-[11px] text-text-muted">{meal.time_suggestion.slice(0, 5)}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <p className="text-xs font-mono tabular-nums text-text-secondary">
                            {mMacros.calories} kcal
                          </p>
                          <CaretDown className={cn(
                            'w-4 h-4 text-text-muted transition-transform duration-200',
                            isExpanded ? 'rotate-180' : ''
                          )} />
                        </div>
                      </button>

                      {/* Detalhes expandíveis */}
                      {isExpanded && (
                        <div className="px-4 pb-3 border-t border-border-subtle/50">
                          {/* Foods list */}
                          {meal.items && meal.items.length > 0 && (
                            <div className="mt-3 flex flex-col gap-1.5">
                              {meal.items.map((item: any, itIdx: number) => {
                                const food = item.food;
                                if (!food) return null;
                                return (
                                  <div key={itIdx} className="flex justify-between py-1.5 border-b border-border-subtle/30 last:border-0">
                                    <div>
                                      <p className="text-xs text-text-secondary">{food.name}</p>
                                      {/* Substituições */}
                                      {item.substitutions && item.substitutions.length > 0 && (
                                        <details className="group mt-1">
                                          <summary className="text-[9px] font-bold text-brand cursor-pointer select-none">
                                            Opções de substituição
                                          </summary>
                                          <div className="flex flex-col gap-1 mt-1 pl-2 border-l border-border-default">
                                            {item.substitutions.map((sub: any, subIdx: number) => {
                                              const subFood = sub.food;
                                              if (!subFood) return null;
                                              return (
                                                <div key={subIdx} className="text-[10px] text-text-secondary flex justify-between">
                                                  <span>• {subFood.name}</span>
                                                  <span className="font-mono font-semibold">{sub.quantity_grams}g</span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </details>
                                      )}
                                    </div>
                                    <p className="text-xs font-mono text-text-muted flex-shrink-0 ml-4">
                                      {item.quantity_grams}g {item.portion_label ? `(${item.portion_label})` : ''}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Notas da refeição */}
                          {meal.notes && (
                            <div className="mt-3 p-2 bg-brand/5 border border-brand/20 rounded-lg text-[10px] text-text-secondary italic">
                              Recomendação: {meal.notes}
                            </div>
                          )}

                          {/* Botão marcar como feita — apenas quando não concluída */}
                          {!isMealDone && (
                            <button
                              onClick={() => toggleDigitalMeal(meal.id)}
                              disabled={togglingMealId === meal.id}
                              className="mt-3 w-full h-9 rounded-md bg-success/10 border border-success/20 text-xs font-semibold text-success flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" weight="bold" />
                              Marcar como feita
                            </button>
                          )}
                          {isMealDone && (
                            <button
                              onClick={() => toggleDigitalMeal(meal.id)}
                              disabled={togglingMealId === meal.id}
                              className="mt-3 w-full h-9 rounded-md bg-surface-2 border border-border-subtle text-xs font-semibold text-text-secondary flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              Desmarcar refeição
                            </button>
                          )}
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
              <div className="mx-4 mb-4 bg-surface-1 border border-border-subtle rounded-lg p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center text-brand flex-shrink-0">
                    <ForkKnife className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {planoPDF.nome_arquivo.replace('.pdf', '')}
                    </p>
                    <p className="text-xs text-text-muted">
                      Enviado em {new Date(planoPDF.criado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={openPdf}
                  id="btn-ver-pdf-nutricao"
                  className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-surface-2 border border-border-subtle text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors flex-shrink-0 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Ver PDF
                </button>
              </div>

              {/* Legacy meals */}
              {legacyRefeicoes.length > 0 && (
                <div className="mx-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">Refeições de hoje</p>
                    <span className="text-xs text-text-muted">
                      {completedLegacyMeals} de {totalLegacyMeals} feitas
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1 bg-surface-2 rounded-full mb-4 overflow-hidden">
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
                            'bg-surface-1 border rounded-lg overflow-hidden transition-colors duration-100',
                            feita
                              ? 'border-success/20 bg-success/5'
                              : 'border-border-subtle'
                          )}
                        >
                          <button
                            onClick={() => ingreds.length > 0 && setExpandedMeals(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                            className="w-full flex items-center gap-3 px-4 py-3"
                          >
                            {/* Check — caixa 20px */}
                            <div
                              onClick={(e) => { e.stopPropagation(); toggleLegacyMeal(r.id); }}
                              className={cn(
                                'w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 cursor-pointer',
                                feita
                                  ? 'bg-success border-success'
                                  : 'border-border-default bg-surface-2'
                              )}
                            >
                              {feita && (
                                <Check className="w-3 h-3 text-white" weight="bold" />
                              )}
                            </div>

                            <div className="flex-1 text-left">
                              <p className={cn(
                                'text-sm font-semibold',
                                feita ? 'line-through text-text-muted' : 'text-text-primary'
                              )}>
                                {r.nome}
                              </p>
                              {r.horario_sugerido && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 text-text-muted" />
                                  <p className="text-[11px] text-text-muted">{r.horario_sugerido.slice(0, 5)}</p>
                                </div>
                              )}
                            </div>

                            {ingreds.length > 0 && (
                              <CaretDown className={cn(
                                'w-4 h-4 text-text-muted transition-transform duration-200',
                                expanded ? 'rotate-180' : ''
                              )} />
                            )}
                          </button>

                          {expanded && ingreds.length > 0 && (
                            <div className="px-4 pb-3 border-t border-border-subtle/50">
                              {ingreds.map((ing: any, i: number) => (
                                <div key={i} className="flex justify-between py-1.5 border-b border-border-subtle/30 last:border-0">
                                  <p className="text-xs text-text-secondary">{ing.nome}</p>
                                  {ing.quantidade && (
                                    <p className="text-xs font-mono text-text-muted">{ing.quantidade}</p>
                                  )}
                                </div>
                              ))}
                              {r.observacoes && (
                                <p className="mt-2 text-xs text-text-muted italic border-t border-border-subtle/50 pt-2">
                                  {r.observacoes}
                                </p>
                              )}
                              {/* Botão marcar como feita dentro do expandido */}
                              {!feita && (
                                <button
                                  onClick={() => toggleLegacyMeal(r.id)}
                                  disabled={togglingMealId === r.id}
                                  className="mt-3 w-full h-9 rounded-md bg-success/10 border border-success/20 text-xs font-semibold text-success flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" weight="bold" />
                                  Marcar como feita
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── ÁGUA (Card de Hidratação refatorado — sempre visível se houver plano) ── */}
          {(digitalPlan || planoPDF) && (
            <div className="mx-4 mb-6 bg-surface-1 border border-border-subtle rounded-lg p-4">

              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Drop className="w-4 h-4 text-brand" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                    Hidratação
                  </p>
                </div>
                <p className="text-xs font-mono tabular-nums text-text-secondary">
                  {mlAtual}ml / {mlMeta}ml
                </p>
              </div>

              {/* Barra de progresso de água */}
              <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((mlAtual / mlMeta) * 100, 100)}%` }}
                />
              </div>

              {/* Copos — grid de ícones */}
              <div className="grid grid-cols-8 gap-1.5 mb-3">
                {Array.from({ length: metaCopos }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => toggleCopo(i)}
                    disabled={savingAgua}
                    aria-label={`${i + 1} copo${i > 0 ? 's' : ''}`}
                    id={`btn-copo-${i}`}
                    className={cn(
                      'aspect-square rounded-md flex items-center justify-center transition-colors duration-100 cursor-pointer',
                      i < agua.copos
                        ? 'bg-brand/20 border border-brand/40'
                        : 'bg-surface-2 border border-border-subtle'
                    )}
                  >
                    <Drop className={cn(
                      'w-3.5 h-3.5',
                      i < agua.copos ? 'text-brand' : 'text-border-default'
                    )} />
                  </button>
                ))}
              </div>

              {/* Controles +/- */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => updateAgua(-1)}
                  disabled={savingAgua || agua.copos === 0}
                  id="btn-remover-copo"
                  className="w-10 h-10 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center disabled:opacity-30 active:bg-surface-3 cursor-pointer"
                >
                  <Minus className="w-4 h-4 text-text-secondary" />
                </button>

                <div className="text-center">
                  <p className="text-xl font-bold font-mono tabular-nums text-text-primary">
                    {agua.copos}
                  </p>
                  <p className="text-[10px] text-text-muted">de {metaCopos} copos</p>
                </div>

                <button
                  onClick={() => updateAgua(1)}
                  disabled={savingAgua || agua.copos >= metaCopos}
                  id="btn-adicionar-copo"
                  className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center disabled:opacity-30 active:opacity-80 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>

              {agua.copos >= metaCopos && (
                <p className="mt-3 text-xs font-semibold text-brand text-center">
                  Meta atingida! Excelente hidratação hoje.
                </p>
              )}
            </div>
          )}

          {/* ── HISTÓRICO DE DOCUMENTOS PDF ADICIONAIS ── */}
          {historicoPDFs.length > 0 && (
            <div className="mx-4 mb-6 bg-surface-1 border border-border-subtle rounded-lg p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-3 flex items-center gap-1.5">
                <FilePdf className="w-3.5 h-3.5" />
                Documentos em PDF
              </p>
              <div className="flex flex-col gap-2">
                {historicoPDFs.map(histPlano => (
                  <div
                    key={histPlano.id}
                    className="bg-surface-2 border border-border-subtle/50 rounded-lg p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FilePdf className="w-4 h-4 text-text-secondary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-text-primary truncate">
                          {histPlano.nome_arquivo.replace('.pdf', '')}
                        </p>
                        <p className="text-[10px] text-text-muted mt-0.5">
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
            </div>
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
