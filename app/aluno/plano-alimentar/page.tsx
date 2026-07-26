'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { extractStoragePath } from '@/lib/storageUrls';
import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import PDFViewer from '@/app/components/PDFViewer';
import { ForkKnife, FileText, FilePdf } from '@phosphor-icons/react';
import { calculateItemMacros, sumMacros, CalculatedMacro } from '@/lib/nutrition/calculateMacros';
import { getTodayBrazil } from '@/lib/dateUtils';
import { NutritionPageHeader } from '@/app/components/nutrition/NutritionPageHeader';
import { ActivePlanCard } from '@/app/components/nutrition/ActivePlanCard';
import { MealCard, type MealFoodItem } from '@/app/components/nutrition/MealCard';
import { HydrationSection } from '@/app/components/nutrition/HydrationSection';
import DumbbellLoader from '@/app/components/DumbbellLoader';

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

function mapDigitalMealFoods(meal: { items?: Array<{
  id?: string;
  quantity_grams?: number | string;
  portion_label?: string | null;
  food?: {
    name: string;
    portions?: Array<{ label: string; grams: number }>;
  };
  substitutions?: Array<{
    quantity_grams?: number | string;
    portion_label?: string | null;
    food?: {
      name: string;
      portions?: Array<{ label: string; grams: number }>;
    };
  }>;
}> }): MealFoodItem[] {
  const foods: MealFoodItem[] = [];
  for (const item of meal.items ?? []) {
    const food = item.food;
    if (!food) continue;
    const portionGrams =
      item.portion_label && food.portions
        ? food.portions.find((p) => p.label === item.portion_label)?.grams
        : undefined;
    foods.push({
      id: item.id,
      name: food.name,
      quantityGrams: item.quantity_grams,
      portionLabel: item.portion_label,
      portionGrams: portionGrams ?? null,
      substitutions: (item.substitutions ?? [])
        .map((sub) => {
          const subPortionGrams =
            sub.portion_label && sub.food?.portions
              ? sub.food.portions.find((p) => p.label === sub.portion_label)?.grams
              : undefined;
          return {
            name: sub.food?.name ?? '',
            quantityGrams: sub.quantity_grams,
            portionLabel: sub.portion_label,
            portionGrams: subPortionGrams ?? null,
          };
        })
        .filter((sub) => sub.name),
    });
  }
  return foods;
}

function mapLegacyMealFoods(ingredientes: Array<{ nome?: string; quantidade?: string }>): MealFoodItem[] {
  return (ingredientes ?? []).map((ing, idx) => ({
    id: `legacy-${idx}`,
    name: ing.nome ?? '',
    quantityText: ing.quantidade ?? null,
  }));
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
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!digitalPlan || !isDesktop) return;
    const meals = digitalPlan.days?.[0]?.meals ?? [];
    const expanded: Record<string, boolean> = {};
    meals.forEach((meal: { id: string }) => {
      expanded[meal.id] = true;
    });
    setExpandedMeals(expanded);
  }, [digitalPlan, isDesktop]);

  useEffect(() => {
    if (digitalPlan || legacyRefeicoes.length === 0 || !isDesktop) return;
    const expanded: Record<string, boolean> = {};
    legacyRefeicoes.forEach((meal) => {
      expanded[meal.id] = true;
    });
    setExpandedMeals(expanded);
  }, [legacyRefeicoes, digitalPlan, isDesktop]);

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

      // 1. Buscar plano digital, planos em PDF e registro de água em paralelo
      const [resPlan, resPDFs, resAgua] = await Promise.all([
        fetch('/api/aluno/plano-alimentar/digital', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }),
        supabaseClient
          .from('plano_alimentar_pdf')
          .select('id, aluno_id, nome_arquivo, descricao, criado_em, url_pdf')
          .eq('aluno_id', uid)
          .order('criado_em', { ascending: false }),
        supabaseClient
          .from('registros_agua')
          .select('id, copos, ml_por_copo')
          .eq('aluno_id', uid)
          .eq('data_registro', today)
          .maybeSingle()
      ]);

      const resPlanData = await resPlan.json();
      const digitalPlanData = resPlanData?.plan;
      const { data: plansPDFData } = resPDFs;
      const { data: aguaData } = resAgua;

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
      <div className="min-h-screen pb-24 lg:pb-12 bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
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
  const dateLabel = `${diaSemanaStr}, ${diaNumStr} de ${mesStr}`;

  const macroDisplays = digitalPlan?.calories_target
    ? [
        { label: 'Kcal', current: digitalPlanMacros.calories, target: digitalPlan.calories_target as number, unit: '' },
        { label: 'Proteína', current: digitalPlanMacros.protein, target: digitalPlan.protein_target as number | null, unit: 'g' },
        { label: 'Carbo', current: digitalPlanMacros.carbs, target: digitalPlan.carbs_target as number | null, unit: 'g' },
        { label: 'Gordura', current: digitalPlanMacros.fat, target: digitalPlan.fat_target as number | null, unit: 'g' },
      ]
    : [];

  const hydrationBlock = (digitalPlan || planoPDF) ? (
    <HydrationSection
      mlCurrent={mlAtual}
      mlTarget={mlMeta}
      cupsCurrent={agua.copos}
      cupsTarget={metaCopos}
      saving={savingAgua}
      isDesktop={isDesktop}
      onToggleCup={toggleCopo}
    />
  ) : null;

  return (
    <SubscriptionGuard>
      <div className="min-h-screen pb-24 lg:pb-12 bg-surface-0">
        <div className="max-w-2xl lg:max-w-[1000px] mx-auto flex flex-col pt-safe lg:px-6 lg:pt-10">

          <NutritionPageHeader
            dateLabel={dateLabel}
            isDesktop={isDesktop}
            className="px-4 pt-4 pb-3 lg:hidden"
          />

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
              <div className="w-16 h-16 border-0 rounded-2xl bg-[#111827] flex items-center justify-center">
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
                  <div key={i} className="flex items-start gap-3 bg-[#111827] border-0 rounded-xl px-4 py-3">
                    <span className="text-lg leading-none flex-shrink-0">{tip.icon}</span>
                    <span className="text-xs text-text-secondary leading-relaxed font-medium">{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CASO 1: PLANO DIGITAL ATIVO ── */}
          {digitalPlan && (
            <div className="lg:grid lg:grid-cols-[2fr_3fr] lg:gap-6 lg:items-start px-4 lg:px-0">
              <aside className="lg:sticky lg:top-6 space-y-4 mb-4 lg:mb-0">
                <NutritionPageHeader
                  dateLabel={dateLabel}
                  isDesktop={isDesktop}
                  className="hidden lg:block"
                />
                <ActivePlanCard
                  planName={digitalPlan.name}
                  goal={digitalPlan.goal || 'Hipertrofia'}
                  completedMeals={completedMealsCount}
                  totalMeals={totalMealsCount}
                  macros={macroDisplays}
                  isDesktop={isDesktop}
                />
                {hydrationBlock && <div className="hidden lg:block">{hydrationBlock}</div>}
              </aside>

              <main className="space-y-2 mb-4 lg:mb-0">
                {(digitalPlan.orientacoes_gerais || digitalPlan.notes) && (
                  <div className="rounded-xl border border-brand/30 bg-[#111827] p-4 mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-brand mb-2">
                      Orientações gerais
                    </p>
                    <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
                      {digitalPlan.orientacoes_gerais || digitalPlan.notes}
                    </p>
                  </div>
                )}
                {digitalPlan.days?.[0]?.meals?.map((meal: {
                  id: string;
                  title: string;
                  time_suggestion?: string | null;
                  notes?: string | null;
                  items?: Parameters<typeof mapDigitalMealFoods>[0]['items'];
                }) => {
                  const isMealDone = digitalCheckins[meal.id] === 'done';
                  const isExpanded = !!expandedMeals[meal.id];
                  const mMacros = getDigitalMealMacros(meal);

                  return (
                    <MealCard
                      key={meal.id}
                      mealId={meal.id}
                      title={meal.title}
                      time={meal.time_suggestion}
                      calories={mMacros.calories}
                      isDone={isMealDone}
                      isExpanded={isExpanded}
                      isToggling={togglingMealId === meal.id}
                      isDesktop={isDesktop}
                      foods={mapDigitalMealFoods(meal)}
                      notes={meal.notes}
                      onToggleExpand={() =>
                        setExpandedMeals((prev) => ({ ...prev, [meal.id]: !prev[meal.id] }))
                      }
                      onToggleDone={() => toggleDigitalMeal(meal.id)}
                    />
                  );
                })}
                {hydrationBlock && <div className="lg:hidden pt-2">{hydrationBlock}</div>}
              </main>
            </div>
          )}

          {/* ── CASO 2: APENAS PLANO PDF ATIVO (Fallback) ── */}
          {!digitalPlan && planoPDF && (
            <div className="px-4 lg:px-0 space-y-4 mb-4">
              <div className="bg-[#111827] border-0 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg border-0 bg-surface-2 flex items-center justify-center text-brand shrink-0">
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
                  className="flex items-center gap-1.5 px-3 h-9 rounded-lg border-0 bg-surface-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors shrink-0 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Ver PDF
                </button>
              </div>

              {legacyRefeicoes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                      Refeições de hoje
                    </p>
                    <span className="text-xs text-text-muted">
                      {completedLegacyMeals} de {totalLegacyMeals} feitas
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {legacyRefeicoes.map((r) => {
                      const feita = legacyConsumidos.has(r.id);
                      const expanded = !!expandedMeals[r.id];
                      const ingreds = r.ingredientes || [];

                      return (
                        <MealCard
                          key={r.id}
                          mealId={r.id}
                          title={r.nome}
                          time={r.horario_sugerido}
                          isDone={feita}
                          isExpanded={expanded}
                          isToggling={togglingMealId === r.id}
                          isDesktop={isDesktop}
                          foods={mapLegacyMealFoods(ingreds)}
                          notes={r.observacoes}
                          showExpandControl={ingreds.length > 0 || !!r.observacoes}
                          onToggleExpand={() =>
                            setExpandedMeals((prev) => ({ ...prev, [r.id]: !prev[r.id] }))
                          }
                          onToggleDone={() => toggleLegacyMeal(r.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {hydrationBlock && <div className="pt-2">{hydrationBlock}</div>}
            </div>
          )}

          {/* Hidratação para plano digital já está no grid acima */}

          {/* ── HISTÓRICO DE DOCUMENTOS PDF ADICIONAIS ── */}
          {historicoPDFs.length > 0 && (
            <div className="mx-4 lg:mx-0 mb-6 bg-[#111827] border-0 rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-3 flex items-center gap-1.5">
                <FilePdf className="w-3.5 h-3.5" />
                Documentos em PDF
              </p>
              <div className="flex flex-col gap-2">
                {historicoPDFs.map(histPlano => (
                  <div
                    key={histPlano.id}
                    className="border-0 rounded-lg p-3 bg-[#111827] ring-1 ring-white/5 flex items-center justify-between gap-3"
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-0 bg-surface-1 text-[10px] font-bold text-text-secondary hover:text-text-primary transition-colors shrink-0 cursor-pointer"
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
