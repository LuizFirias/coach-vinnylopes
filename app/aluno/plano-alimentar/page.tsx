'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { extractStoragePath } from '@/lib/storageUrls';
import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import PDFViewer from '@/app/components/PDFViewer';
import { ForkKnife, FileText, FilePdf } from '@phosphor-icons/react';
import { calculateItemMacros, sumMacros, CalculatedMacro } from '@/lib/nutrition/calculateMacros';
import { getTodayBrazil } from '@/lib/dateUtils';
import { loadStudentNutritionPageData, attachMealSubstitutionsForMealIds } from '@/lib/nutrition/plans';
import { buildAutoExpandedMap } from '@/lib/nutrition/mealAutoExpand';
import { NutritionPageHeader } from '@/app/components/nutrition/NutritionPageHeader';
import { ActivePlanCard } from '@/app/components/nutrition/ActivePlanCard';
import { MacrosCard } from '@/app/components/nutrition/MacrosCard';
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
  const didFetchRef = useRef(false);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  const subsLoadedPlanRef = useRef<string | null>(null);

  useEffect(() => {
    if (!digitalPlan || !isDesktop) return;
    const planId = digitalPlan.id as string | undefined;
    const meals = digitalPlan.days?.[0]?.meals ?? [];
    const expanded: Record<string, boolean> = {};
    const ids: string[] = [];
    meals.forEach((meal: { id: string }) => {
      expanded[meal.id] = true;
      ids.push(meal.id);
    });
    setExpandedMeals(expanded);

    if (!planId || !ids.length || subsLoadedPlanRef.current === planId) return;
    subsLoadedPlanRef.current = planId;
    void attachMealSubstitutionsForMealIds(digitalPlan, ids, supabaseClient).then((enriched) => {
      if (enriched !== digitalPlan) setDigitalPlan(enriched);
    });
  }, [digitalPlan, isDesktop]);

  useEffect(() => {
    if (digitalPlan || legacyRefeicoes.length === 0 || !isDesktop) return;
    const expanded: Record<string, boolean> = {};
    legacyRefeicoes.forEach((meal) => {
      expanded[meal.id] = true;
    });
    setExpandedMeals(expanded);
  }, [legacyRefeicoes, digitalPlan, isDesktop]);

  const ensureMealSubstitutions = useCallback((mealId: string) => {
    setDigitalPlan((prev: any) => {
      if (!prev) return prev;
      const meal = prev.days?.[0]?.meals?.find((m: any) => m.id === mealId);
      const needs =
        meal?.items?.some((i: any) => !i._subsLoaded) ?? false;
      if (!needs) return prev;

      void attachMealSubstitutionsForMealIds(prev, [mealId], supabaseClient).then((enriched) => {
        if (enriched !== prev) setDigitalPlan(enriched);
      });
      return prev;
    });
  }, []);

  const toggleMealExpand = useCallback((mealId: string) => {
    setExpandedMeals((prev) => {
      const nextOpen = !prev[mealId];
      if (nextOpen) ensureMealSubstitutions(mealId);
      return { ...prev, [mealId]: nextOpen };
    });
  }, [ensureMealSubstitutions]);

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

      // Bundle direto no Supabase — sem API /digital (N+1 no servidor)
      const { digitalPlan: digitalPlanData, plansPDF: plansPDFData, agua: aguaData, checkins } =
        await loadStudentNutritionPageData(uid, today, supabaseClient);

      if (digitalPlanData) {
        setDigitalPlan(digitalPlanData);

        const checkinsMap: Record<string, string> = {};
        checkins.forEach((c) => {
          checkinsMap[c.meal_id] = c.status;
        });
        setDigitalCheckins(checkinsMap);

        const day1 = digitalPlanData.days?.[0];
        let expandedIds: string[] = [];
        if (day1?.meals?.length) {
          const expandedMap = buildAutoExpandedMap(
            day1.meals.map((m: { id: string; time_suggestion?: string | null; meal_type?: string | null }) => ({
              id: m.id,
              time: m.time_suggestion,
              meal_type: m.meal_type,
            })),
            (id) => checkinsMap[id] === 'done',
          );
          setExpandedMeals(expandedMap);
          expandedIds = Object.keys(expandedMap).filter((id) => expandedMap[id]);
        }

        // Lazy: só a(s) refeição(ões) já aberta(s) — evita 500/timeout no mount
        if (expandedIds.length) {
          void attachMealSubstitutionsForMealIds(
            digitalPlanData,
            expandedIds,
            supabaseClient,
          ).then((enriched) => {
            if (enriched !== digitalPlanData) setDigitalPlan(enriched);
          });
        }
      }

      if (plansPDFData && plansPDFData.length > 0) {
        if (!digitalPlanData) {
          setPlanoPDF(plansPDFData[0]);
          setHistoricoPDFs(plansPDFData.slice(1));

          // Em paralelo: consumos do dia sem .in() — ids extras são ignorados pelo Set.has
          const [{ data: refeicaoData }, { data: consumos }] = await Promise.all([
            supabaseClient
              .from('refeicoes_plano')
              .select('id, plano_id, nome, horario_sugerido, ordem, ingredientes, observacoes')
              .eq('plano_id', plansPDFData[0].id)
              .order('ordem', { ascending: true }),
            supabaseClient
              .from('consumos_refeicao')
              .select('refeicao_id')
              .eq('aluno_id', uid)
              .eq('data_consumo', today),
          ]);

          const legacyMeals = refeicaoData || [];
          const consumidos = new Set((consumos || []).map((c: any) => c.refeicao_id as string));
          setLegacyRefeicoes(legacyMeals);
          setLegacyConsumidos(consumidos);
          if (legacyMeals.length > 0) {
            setExpandedMeals(
              buildAutoExpandedMap(
                legacyMeals.map((r: { id: string; horario_sugerido?: string | null }) => ({
                  id: r.id,
                  time: r.horario_sugerido,
                })),
                (id) => consumidos.has(id),
              ),
            );
          }
        } else {
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
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    void fetchData();
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
    setFeedbackError(null);

    const today = getTodayISO();
    const isDone = digitalCheckins[mealId] === 'done';

    // Otimista: marca/desmarca na hora — a requisição roda em segundo plano.
    // Sem isso, o check só aparecia depois da rede responder, e cada toque
    // parecia travar por causa da latência (é o que estava sendo relatado).
    if (isDone) {
      setDigitalCheckins(prev => {
        const next = { ...prev };
        delete next[mealId];
        return next;
      });
    } else {
      setDigitalCheckins(prev => ({ ...prev, [mealId]: 'done' }));
    }
    setTogglingMealId(mealId);

    try {
      if (isDone) {
        const { error } = await supabaseClient
          .from('nutrition_meal_checkins')
          .delete()
          .eq('student_id', userId)
          .eq('meal_id', mealId)
          .eq('checkin_date', today);

        if (error) throw error;
      } else {
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
      }
    } catch (err: any) {
      console.error('[Digital Checkin] Erro:', err);
      // Desfaz o otimismo — a rede não confirmou, volta pro estado real.
      if (isDone) {
        setDigitalCheckins(prev => ({ ...prev, [mealId]: 'done' }));
      } else {
        setDigitalCheckins(prev => {
          const next = { ...prev };
          delete next[mealId];
          return next;
        });
      }
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
    // Só conta macros das refeições marcadas como feitas hoje
    const mealMacros = day1.meals
      .filter((m: { id: string }) => digitalCheckins[m.id] === 'done')
      .map((m: unknown) => getDigitalMealMacros(m));
    return sumMacros(mealMacros);
  };

  // ── Ações do Plano PDF ────────────────────────────────────────────────────────

  const toggleLegacyMeal = async (refeicaoId: string) => {
    if (!userId || togglingMealId) return;
    const dateChanged = checkDateChange();
    if (dateChanged) return;

    const today = getTodayISO();
    const jaConsumido = legacyConsumidos.has(refeicaoId);

    // Otimista — mesmo motivo do toggle do plano digital: não espera a rede
    // pra refletir o toque, senão marca refeição parece travado.
    if (jaConsumido) {
      setLegacyConsumidos(prev => {
        const next = new Set(prev);
        next.delete(refeicaoId);
        return next;
      });
    } else {
      setLegacyConsumidos(prev => new Set([...prev, refeicaoId]));
    }
    setTogglingMealId(refeicaoId);

    try {
      if (jaConsumido) {
        const { error } = await supabaseClient
          .from('consumos_refeicao')
          .delete()
          .eq('aluno_id', userId)
          .eq('refeicao_id', refeicaoId)
          .eq('data_consumo', today);
        if (error) throw error;
      } else {
        const { error } = await supabaseClient
          .from('consumos_refeicao')
          .insert({ aluno_id: userId, refeicao_id: refeicaoId, data_consumo: today });
        if (error) throw error;
      }
    } catch (err) {
      console.error('[Consumo Legado] Erro:', err);
      // Desfaz o otimismo.
      if (jaConsumido) {
        setLegacyConsumidos(prev => new Set([...prev, refeicaoId]));
      } else {
        setLegacyConsumidos(prev => {
          const next = new Set(prev);
          next.delete(refeicaoId);
          return next;
        });
      }
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
      <div
        className="flex min-h-screen items-center justify-center pb-24 lg:pb-12"
        style={{ background: 'var(--mobile-page-bg-solid)' }}
      >
        <DumbbellLoader />
      </div>
    );
  }

  // Digital calculations
  const totalMealsCount = digitalPlan?.days?.[0]?.meals?.length || 0;
  const completedMealsCount = Object.values(digitalCheckins).filter((s) => s === 'done').length;
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
  const datePart = `${diaNumStr} de ${mesStr}`;

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
      <div
        className="min-h-screen pb-24 lg:pb-12"
        style={{ background: 'var(--mobile-page-bg-solid)' }}
      >
        <div className="max-w-2xl lg:max-w-[1000px] mx-auto flex flex-col pt-safe lg:px-6 lg:pt-10">

          <NutritionPageHeader
            weekday={diaSemanaStr}
            datePart={datePart}
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
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{
                  background: 'var(--mobile-empty-bg)',
                  border: '1px solid var(--mobile-empty-border)',
                }}
              >
                <ForkKnife className="w-8 h-8 text-brand" />
              </div>
              <div>
                <h2 className="mb-2 text-lg font-bold text-text-primary">
                  Plano alimentar em preparação
                </h2>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-text-tertiary">
                  Seu coach ainda não liberou um plano alimentar para você. Enquanto isso, mantenha a hidratação e rotina saudável.
                </p>
              </div>

              <div className="mt-4 flex w-full flex-col gap-2 text-left">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                  Dicas de hidratação e rotina
                </p>
                {[
                  { icon: '💧', text: 'Beba pelo menos 35ml de água por kg de peso todos os dias' },
                  { icon: '🥩', text: 'Consuma fontes limpas de proteínas em todas as refeições' },
                  { icon: '⏰', text: 'Tente comer a cada 3 ou 4 horas para manter o metabolismo ativo' },
                ].map((tip, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-[16px] px-4 py-3"
                    style={{
                      background: 'var(--mobile-card-bg)',
                      border: '1px solid var(--mobile-card-border)',
                      boxShadow: 'var(--mobile-card-shadow)',
                    }}
                  >
                    <span className="flex-shrink-0 text-lg leading-none">{tip.icon}</span>
                    <span className="text-xs font-medium leading-relaxed text-text-secondary">
                      {tip.text}
                    </span>
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
                  weekday={diaSemanaStr}
                  datePart={datePart}
                  dateLabel={dateLabel}
                  isDesktop={isDesktop}
                  className="hidden lg:block"
                />
                {(digitalPlan.protein_target || digitalPlan.carbs_target || digitalPlan.fat_target) ? (
                  <MacrosCard
                    proteina={Number(digitalPlan.protein_target) || 0}
                    carbo={Number(digitalPlan.carbs_target) || 0}
                    gordura={Number(digitalPlan.fat_target) || 0}
                    readOnly
                  />
                ) : null}
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
                  <div className="mb-2 flex overflow-hidden rounded-[16px]">
                    <div
                      className="w-1 shrink-0"
                      style={{
                        background: 'linear-gradient(180deg, #F5D061, #D4A843)',
                      }}
                      aria-hidden
                    />
                    <div
                      className="flex-1 rounded-r-[16px] border border-l-0 border-brand-border bg-brand-subtle px-3.5 py-3"
                    >
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-brand">
                        Orientações gerais
                      </p>
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-text-secondary">
                        {digitalPlan.orientacoes_gerais || digitalPlan.notes}
                      </p>
                    </div>
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
                      onToggleExpand={() => toggleMealExpand(meal.id)}
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
              <div
                className="flex items-center justify-between gap-3 rounded-[16px] p-4"
                style={{
                  background: 'var(--mobile-card-bg)',
                  border: '1px solid var(--mobile-card-border)',
                  boxShadow: 'var(--mobile-card-shadow)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-brand"
                    style={{ background: 'var(--filter-bg, #ebebf0)' }}
                  >
                    <ForkKnife className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {planoPDF.nome_arquivo.replace('.pdf', '')}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      Enviado em {new Date(planoPDF.criado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={openPdf}
                  id="btn-ver-pdf-nutricao"
                  className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary"
                  style={{ background: 'var(--filter-bg, #ebebf0)', border: 'none' }}
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
            <div
              className="mx-4 mb-6 rounded-[16px] p-4 lg:mx-0"
              style={{
                background: 'var(--mobile-card-bg)',
                border: '1px solid var(--mobile-card-border)',
                boxShadow: 'var(--mobile-card-shadow)',
              }}
            >
              <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                <FilePdf className="w-3.5 h-3.5" />
                Documentos em PDF
              </p>
              <div className="flex flex-col gap-2">
                {historicoPDFs.map(histPlano => (
                  <div
                    key={histPlano.id}
                    className="flex items-center justify-between gap-3 rounded-lg p-3"
                    style={{
                      background: 'var(--mobile-empty-bg)',
                      border: '1px solid var(--mobile-empty-border)',
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FilePdf className="h-4 w-4 shrink-0 text-text-tertiary" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-text-primary">
                          {histPlano.nome_arquivo.replace('.pdf', '')}
                        </p>
                        <p className="mt-0.5 text-[10px] text-text-tertiary">
                          Enviado em {new Date(histPlano.criado_em).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openPdfForPlan(histPlano)}
                      className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-text-secondary transition-colors hover:text-text-primary"
                      style={{ background: 'var(--filter-bg, #ebebf0)', border: 'none' }}
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
