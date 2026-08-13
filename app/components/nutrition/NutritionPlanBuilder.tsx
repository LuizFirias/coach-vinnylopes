'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { 
  Plus, Trash, FloppyDisk, CheckCircle,
  Copy, CaretRight, DotsThree
} from '@phosphor-icons/react';
import { BackButton } from '@/app/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Select } from '@/components/ui/Select';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { calculateItemMacros, sumMacros, CalculatedMacro } from '@/lib/nutrition/calculateMacros';
import { MacrosCard } from '@/app/components/nutrition/MacrosCard';
import { MetaProgressCard } from '@/app/components/nutrition/MetaProgressCard';
import { RefeicoesMiniResumo } from '@/app/components/nutrition/RefeicoesMiniResumo';
import { AdicionarRefeicaoButton } from '@/app/components/nutrition/AdicionarRefeicaoButton';
import { FoodSearchPanel, type FoodSearchGroup } from '@/app/components/nutrition/FoodSearchPanel';
import { NutritionFood, NutritionMealType } from '@/lib/nutrition/types';
import { isGramsOnlyLabel } from '@/lib/nutrition/portionDisplay';
import { cn } from '@/lib/utils/cn';
import { textIncludes } from '@/lib/utils/textNormalize';
import { readReturnUrl } from '@/lib/utils/adminNav';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import { concluirPasso } from '@/lib/onboarding/concluirPasso';
import { TimeRollerPicker } from '@/app/components/ui/TimeRollerPicker';

interface NutritionPlanBuilderProps {
  initialPlanData?: any;
}

export default function NutritionPlanBuilder({ initialPlanData }: NutritionPlanBuilderProps) {
  const router = useRouter();
  const isMobile = useBreakpoint('mobile');
  const goBack = () => {
    router.push(readReturnUrl(window.location.search, '/admin/nutricao'));
  };
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Database lists
  const [alunos, setAlunos] = useState<any[]>([]);
  const [foodLibrary, setFoodLibrary] = useState<NutritionFood[]>([]);

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [planName, setPlanName] = useState('');
  const [goal, setGoal] = useState('Hipertrofia');
  const [notes, setNotes] = useState('');
  const [orientacoesGerais, setOrientacoesGerais] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  /** Meta salva do plano (para Prescrito vs meta). Sem meta → card some. */
  const [macrosAlvo, setMacrosAlvo] = useState({ proteina: 0, carbo: 0, gordura: 0 });

  // Meals data structure
  const [meals, setMeals] = useState<any[]>([]);
  // Accordion: quais refeições estão expandidas (por índice)
  const [mealsAbertas, setMealsAbertas] = useState<Record<number, boolean>>({});
  const [mealToRemove, setMealToRemove] = useState<number | null>(null);
  const [mealMenuOpen, setMealMenuOpen] = useState<number | null>(null);

  // Search combobox states
  const [searchOpen, setSearchOpen] = useState<{ mealIndex: number; itemIndex?: number; subIndex?: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  /** Categorias selecionadas (multi). Vazio = sem filtro de categoria. */
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState<FoodSearchGroup>('todos');
  /** IDs dos alimentos marcados no modal (seleção múltipla) */
  const [pickedFoodIds, setPickedFoodIds] = useState<string[]>([]);

  const toggleCategory = (val: string) => {
    setSelectedCategories((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val],
    );
  };

  // Load students and foods
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data: authData } = await supabaseClient.auth.getUser();
        const coachId = authData?.user?.id;
        if (!coachId) return;

        // Check local storage cache for foods (24h cache)
        const cacheKey = 'auron_food_library_v2';
        const cacheTimeKey = 'auron_food_library_time_v2';
        const cachedData = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
        const cachedTime = typeof window !== 'undefined' ? localStorage.getItem(cacheTimeKey) : null;
        const isCacheValid = cachedData && cachedTime && (Date.now() - Number(cachedTime) < 86400000);

        let foods: any[] | null = null;
        let foodsPromise: Promise<any> | null = null;

        if (isCacheValid && cachedData) {
          try {
            foods = JSON.parse(cachedData);
          } catch (e) {
            foods = null;
          }
        }

        if (!foods) {
          foodsPromise = Promise.resolve(
            supabaseClient
              .from('nutrition_foods')
              .select('*, portions:nutrition_food_portions(*)')
              .eq('is_active', true)
              .order('name', { ascending: true })
          );
        }

        // Buscar alimentos ativos (se necessário) e vínculos de alunos em paralelo
        const [linksResult, foodsResult] = await Promise.all([
          supabaseClient
            .from('coach_alunos')
            .select('aluno_id'),
          foodsPromise || Promise.resolve({ data: null })
        ]);

        const { data: links } = linksResult;
        
        if (foodsResult && foodsResult.data) {
          foods = foodsResult.data;
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(foods));
              localStorage.setItem(cacheTimeKey, Date.now().toString());
            } catch (e) {
              console.warn('Failed to save foods to localStorage:', e);
            }
          }
        }

        const sortedFoods = [...(foods || [])].sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""), "pt-BR", { sensitivity: "base" }),
        );
        setFoodLibrary(sortedFoods);

        const ids = links?.map(l => l.aluno_id) || [];

        if (ids.length > 0) {
          const { data: profiles } = await supabaseClient
            .from('profiles')
            .select('id, coaching_reference, full_name')
            .in('id', ids)
            .eq('arquivado', false)
            .order('coaching_reference', { ascending: true });
          setAlunos(profiles || []);
        }

        // Prepopulate if editing
        if (initialPlanData) {
          setSelectedStudentId(initialPlanData.student_id);
          setPlanName(initialPlanData.name);
          setGoal(initialPlanData.goal || 'Hipertrofia');
          setNotes(initialPlanData.notes || '');
          setOrientacoesGerais(
            initialPlanData.orientacoes_gerais || initialPlanData.notes || '',
          );
          setStartDate(initialPlanData.start_date || '');
          setEndDate(initialPlanData.end_date || '');
          setMacrosAlvo({
            proteina: Number(initialPlanData.protein_target) || 0,
            carbo: Number(initialPlanData.carbs_target) || 0,
            gordura: Number(initialPlanData.fat_target) || 0,
          });

          // Populate meals from the first day
          const day1 = initialPlanData.days?.[0];
          if (day1 && day1.meals) {
            const mappedMeals = day1.meals.map((meal: any) => ({
              meal_type: meal.meal_type,
              title: meal.title,
              time_suggestion: meal.time_suggestion ? meal.time_suggestion.slice(0, 5) : '',
              notes: meal.notes || '',
              sort_order: meal.sort_order,
              items: (meal.items || []).map((item: any) => ({
                food_id: item.food_id,
                quantity_grams: item.quantity_grams,
                portion_label: item.portion_label || '',
                notes: item.notes || '',
                sort_order: item.sort_order,
                substitutions: (item.substitutions || []).map((sub: any) => ({
                  substitute_food_id: sub.substitute_food_id,
                  quantity_grams: sub.quantity_grams,
                  portion_label: sub.portion_label || '',
                  notes: sub.notes || '',
                }))
              }))
            }));
            setMeals(mappedMeals);
          }
        }
      } catch (err) {
        console.error('Error loading builder data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [initialPlanData]);

  // Default meal types mapping
  const mealTypeLabels: Record<NutritionMealType, string> = {
    cafe_da_manha: 'Café da manhã',
    lanche_manha: 'Lanche da manhã',
    almoco: 'Almoço',
    pre_treino: 'Pré-treino',
    pos_treino: 'Pós-treino',
    lanche_tarde: 'Lanche da tarde',
    jantar: 'Jantar',
    ceia: 'Ceia',
    refeicao_livre: 'Refeição livre'
  };

  const handleCreateDefaultMeals = () => {
    const defaults = [
      { meal_type: 'cafe_da_manha', title: 'Café da manhã', time_suggestion: '08:00', notes: '', sort_order: 0, items: [] },
      { meal_type: 'almoco', title: 'Almoço', time_suggestion: '12:30', notes: '', sort_order: 1, items: [] },
      { meal_type: 'lanche_tarde', title: 'Lanche da tarde', time_suggestion: '16:00', notes: '', sort_order: 2, items: [] },
      { meal_type: 'jantar', title: 'Jantar', time_suggestion: '20:00', notes: '', sort_order: 3, items: [] }
    ];
    setMeals(defaults);
  };

  const handleAddMeal = (type: NutritionMealType) => {
    const newMeal = {
      meal_type: type,
      title: mealTypeLabels[type],
      time_suggestion: '',
      notes: '',
      sort_order: meals.length,
      items: []
    };
    setMeals([...meals, newMeal]);
    setMealsAbertas(prev => ({ ...prev, [meals.length]: true }));
  };

  const handleDuplicateMeal = (index: number) => {
    const mealToCopy = meals[index];
    const clonedMeal = JSON.parse(JSON.stringify(mealToCopy));
    clonedMeal.title = `${clonedMeal.title} - Cópia`;
    clonedMeal.sort_order = meals.length;
    // Remove database IDs from cloned meal and its children
    delete clonedMeal.id;
    clonedMeal.items?.forEach((item: any) => {
      delete item.id;
      delete item.meal_id;
      item.substitutions?.forEach((sub: any) => {
        delete sub.id;
        delete sub.meal_item_id;
      });
    });
    setMeals([...meals, clonedMeal]);
    setMealsAbertas(prev => ({ ...prev, [meals.length]: true }));
  };

  const handleRemoveMeal = (index: number) => {
    setMealToRemove(index);
  };

  const confirmRemoveMeal = () => {
    if (mealToRemove === null) return;
    setMeals((prev) => prev.filter((_, i) => i !== mealToRemove));
    setMealToRemove(null);
  };

  const handleAddFoodToMeal = (mealIndex: number) => {
    setSearchOpen({ mealIndex });
    setMealsAbertas((prev) => ({ ...prev, [mealIndex]: true }));
    setSearchQuery('');
    setSelectedCategories([]);
    setActiveGroup('todos');
    setPickedFoodIds([]);
  };

  const handleAddSubstitution = (mealIndex: number, itemIndex: number) => {
    setSearchOpen({ mealIndex, itemIndex });
    setMealsAbertas((prev) => ({ ...prev, [mealIndex]: true }));
    setSearchQuery('');
    setSelectedCategories([]);
    setActiveGroup('todos');
    setPickedFoodIds([]);
  };

  const handleRemoveFoodItem = (mealIndex: number, itemIndex: number) => {
    const updated = [...meals];
    updated[mealIndex].items = updated[mealIndex].items.filter((_: any, i: number) => i !== itemIndex);
    setMeals(updated);
  };

  const handleRemoveSubItem = (mealIndex: number, itemIndex: number, subIndex: number) => {
    const updated = [...meals];
    updated[mealIndex].items[itemIndex].substitutions = updated[mealIndex].items[itemIndex].substitutions.filter((_: any, i: number) => i !== subIndex);
    setMeals(updated);
  };

  const togglePickedFood = (foodId: string) => {
    setPickedFoodIds((prev) =>
      prev.includes(foodId) ? prev.filter((id) => id !== foodId) : [...prev, foodId],
    );
  };

  const handleConfirmPickedFoods = () => {
    if (!searchOpen || pickedFoodIds.length === 0) return;
    const { mealIndex, itemIndex } = searchOpen;
    const updated = [...meals];
    const foodsById = new Map(foodLibrary.map((f) => [f.id, f]));

    for (const foodId of pickedFoodIds) {
      const food = foodsById.get(foodId);
      if (!food) continue;

      const defaultPortion = food.portions?.find((p) => p.is_default) || food.portions?.[0];
      const initialGrams = defaultPortion ? Number(defaultPortion.grams) : 100;
      const initialLabel = defaultPortion ? defaultPortion.label : '100g';

      if (itemIndex !== undefined) {
        const item = updated[mealIndex].items[itemIndex];
        item.substitutions = [
          ...(item.substitutions || []),
          {
            substitute_food_id: food.id,
            quantity_grams: initialGrams,
            portion_label: initialLabel,
            notes: '',
          },
        ];
      } else {
        updated[mealIndex].items.push({
          food_id: food.id,
          quantity_grams: initialGrams,
          portion_label: initialLabel,
          notes: '',
          sort_order: updated[mealIndex].items.length,
          substitutions: [],
        });
      }
    }

    setMeals(updated);
    setPickedFoodIds([]);
    setSearchOpen(null);
  };

  const handleCloseFoodSearch = () => {
    setPickedFoodIds([]);
    setSearchOpen(null);
  };

  // Calculations
  const getFoodById = (id: string) => foodLibrary.find(f => f.id === id);

  const getMealMacros = (meal: any): CalculatedMacro => {
    const itemMacros = (meal.items || []).map((item: any) => {
      const food = getFoodById(item.food_id);
      if (!food) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      return calculateItemMacros(food, Number(item.quantity_grams));
    });
    return sumMacros(itemMacros);
  };

  const planMacros = sumMacros(meals.map((m) => getMealMacros(m)));

  const refeicoesMini = meals.map((meal, idx) => {
    const macros = getMealMacros(meal);
    return {
      id: String(meal.id ?? `meal-${idx}`),
      nome: meal.title || mealTypeLabels[meal.meal_type as NutritionMealType] || `Refeição ${idx + 1}`,
      kcalTotal: macros.calories,
      temAlimentos: (meal.items?.length ?? 0) > 0,
    };
  });

  // Save/Publish
  const handleSavePlan = async (status: 'draft' | 'active') => {
    setError(null);
    setSuccess(null);

    if (!selectedStudentId) { setError('Por favor, selecione um aluno'); return; }
    if (!planName.trim()) { setError('Por favor, insira o nome do plano'); return; }
    if (meals.length === 0) { setError('Adicione pelo menos 1 refeição ao plano'); return; }
    
    let totalItemsCount = 0;
    meals.forEach(m => { totalItemsCount += (m.items || []).length; });
    if (totalItemsCount === 0) { setError('Adicione pelo menos 1 alimento a alguma refeição'); return; }

    setSaving(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) { setError('Sessão expirada. Faça login novamente.'); return; }

      const payload = {
        id: initialPlanData?.id || undefined,
        plan: {
          student_id: selectedStudentId,
          name: planName,
          goal,
          notes: orientacoesGerais || notes || null,
          orientacoes_gerais: orientacoesGerais || null,
          calories_target: Math.round(planMacros.calories) || null,
          protein_target: planMacros.protein || null,
          carbs_target: planMacros.carbs || null,
          fat_target: planMacros.fat || null,
          status,
          start_date: startDate || null,
          end_date: endDate || null
        },
        meals: meals.map((m, idx) => ({
          meal_type: m.meal_type,
          title: m.title,
          time_suggestion: m.time_suggestion ? `${m.time_suggestion}:00` : null,
          notes: m.notes || null,
          sort_order: idx,
          items: m.items.map((it: any, itemIdx: number) => ({
            food_id: it.food_id,
            quantity_grams: Number(it.quantity_grams),
            portion_label: it.portion_label || null,
            notes: it.notes || null,
            sort_order: itemIdx,
            substitutions: (it.substitutions || []).map((sub: any) => ({
              substitute_food_id: sub.substitute_food_id,
              quantity_grams: Number(sub.quantity_grams),
              portion_label: sub.portion_label || null,
              notes: sub.notes || null
            }))
          }))
        }))
      };

      const response = await fetch('/api/admin/nutricao/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao salvar plano');

      setSuccess(status === 'active' ? 'Plano alimentar publicado com sucesso!' : 'Rascunho salvo com sucesso!');
      if (status === 'active') {
        const { data: { session: s } } = await supabaseClient.auth.getSession();
        if (s?.user?.id) await concluirPasso(s.user.id, 'criar-nutricao');
      }
      setTimeout(() => {
        router.push(readReturnUrl(window.location.search, '/admin/nutricao'));
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar plano alimentar.');
    } finally {
      setSaving(false);
    }
  };

  const filteredFoods = foodLibrary
    .filter(food => {
      const matchesQuery = textIncludes(food.name, searchQuery);
      const matchesCategory =
        selectedCategories.length === 0
          ? true
          : selectedCategories.includes(food.category);
      return matchesQuery && matchesCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));

  const foodSearchPanelProps = {
    searchQuery,
    onSearchQueryChange: setSearchQuery,
    activeGroup,
    onActiveGroupChange: setActiveGroup,
    selectedCategories,
    onToggleCategory: toggleCategory,
    onResetCategories: () => setSelectedCategories([]),
    filteredFoods,
    pickedFoodIds,
    onTogglePicked: togglePickedFood,
    onConfirm: handleConfirmPickedFoods,
    onClose: handleCloseFoodSearch,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-28">
      <div className="w-full px-4 pt-2 md:px-6 md:pt-4">
        {/* Header */}
        <div className="mb-3 flex items-center gap-3 py-2 md:mb-4 md:pb-1 md:pt-1">
          <BackButton onClick={goBack} />
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-danger-border bg-danger-subtle px-4 py-3 text-xs font-semibold text-danger animate-shake md:mb-4">
            <div className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-danger" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-success-border bg-success-subtle px-4 py-3 text-xs font-semibold text-success md:mb-4">
            <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-success" />
            {success}
          </div>
        )}

        {/* Layout Workspace Grid */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,500px)]">
          
          {/* Coluna Esquerda: Construtor */}
          <div className="flex min-w-0 flex-col gap-3 lg:gap-4">
            
            {/* CARD 1: Dados Básicos — Nível 2 (tokens) */}
            <div
              className="rounded-2xl"
              style={{
                background: "var(--card-macros-bg)",
                border: "0.5px solid var(--brand-border)",
                boxShadow: "var(--elev-2)",
              }}
            >
              <div
                aria-hidden
                className="hidden h-0.5 w-full md:block"
                style={{ background: "var(--card-macros-topline)", opacity: 0.5 }}
              />
              <div className="flex flex-col gap-3 p-4 md:gap-3.5 md:p-5">
              {/* Linha 1 (desktop): Aluno | Nome */}
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
                <Select
                  variant="underline"
                  label="Aluno destinatário"
                  value={selectedStudentId}
                  onChange={setSelectedStudentId}
                  placeholder="Selecione o aluno..."
                  disabled={!!initialPlanData || saving}
                  className="min-w-0"
                  options={alunos.map(a => ({
                    value: a.id,
                    label: a.coaching_reference || a.full_name || a.id
                  }))}
                />

                <div className="flex min-w-0 flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                    Nome do plano
                  </label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Ex: Bulking Limpo — Fase Carga"
                    disabled={saving}
                    className="input-underline w-full"
                  />
                </div>
              </div>

              {/* Linha 2 (desktop): Objetivo | Data início | Data término */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                <Select
                  variant="underline"
                  label="Objetivo principal"
                  value={goal}
                  onChange={setGoal}
                  className="min-w-0 sm:col-span-2 lg:col-span-1"
                  options={[
                    { value: 'Hipertrofia', label: 'Hipertrofia' },
                    { value: 'Emagrecimento', label: 'Emagrecimento' },
                    { value: 'Definição', label: 'Definição' },
                    { value: 'Manutenção', label: 'Manutenção' },
                    { value: 'Condicionamento', label: 'Condicionamento' },
                    { value: 'Saúde', label: 'Saúde' },
                    { value: 'Outro', label: 'Outro' }
                  ]}
                />

                <div className="flex min-w-0 flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                    Data início
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={saving}
                    className={cn(
                      'input-underline w-full',
                      startDate ? 'date-filled' : 'date-empty',
                    )}
                  />
                </div>

                <div className="flex min-w-0 flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                    Data término
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={saving}
                    className={cn(
                      'input-underline w-full',
                      endDate ? 'date-filled' : 'date-empty',
                    )}
                  />
                </div>
              </div>

              {/* Linha 3: Orientações */}
              <div className="flex flex-col">
                <label className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                  Orientações gerais
                </label>
                <textarea
                  value={orientacoesGerais}
                  onChange={(e) => {
                    setOrientacoesGerais(e.target.value);
                    setNotes(e.target.value);
                  }}
                  placeholder="Suplementação e orientações do plano..."
                  rows={3}
                  disabled={saving}
                  className="field-token-input w-full"
                />
                <p className="mt-1 text-[10px] italic text-text-disabled">
                  Visível em destaque no app do aluno — use para suplementos, timing e avisos gerais.
                </p>
              </div>
              </div>
            </div>

            {/* CARD 3: Refeições */}
            <div className="flex flex-col gap-3">
              {meals.length === 0 && (
                <div className="flex items-center justify-center">
                  <Button
                    onClick={handleCreateDefaultMeals}
                    variant="primary"
                    size="sm"
                    className="cursor-pointer"
                  >
                    Gerar refeições padrão
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {meals.map((meal, mealIdx) => {
                const macros = getMealMacros(meal);
                const aberta = mealsAbertas[mealIdx] ?? (mealIdx === 0);
                return (
                  <Card
                    key={mealIdx}
                    className={cn("rounded-xl border-0 shadow-sm p-4 md:p-5 flex flex-col min-w-0", aberta ? "gap-4" : "gap-0")}
                    style={{ background: "var(--card-macros-bg)" }}
                  >
                    
                    {/* Meal Header — horário à esquerda */}
                    <div className={cn("flex flex-col gap-2", aberta && "border-b border-black/[0.04] pb-2 dark:border-white/[0.05]")}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => setMealsAbertas(prev => ({ ...prev, [mealIdx]: !aberta }))}
                            className="shrink-0 text-text-tertiary hover:text-text-primary transition-colors"
                            title={aberta ? 'Recolher refeição' : 'Expandir refeição'}
                          >
                            <CaretRight size={14} className={cn("transition-transform", aberta && "rotate-90")} />
                          </button>
                          <TimeRollerPicker
                            value={meal.time_suggestion || ''}
                            onChange={(next) => {
                              const updated = [...meals];
                              updated[mealIdx].time_suggestion = next;
                              setMeals(updated);
                            }}
                          />
                          <input
                            type="text"
                            value={meal.title}
                            onChange={(e) => {
                              const updated = [...meals];
                              updated[mealIdx].title = e.target.value;
                              setMeals(updated);
                            }}
                            placeholder="Nome da refeição"
                            className="input-underline input-underline-compact min-w-0 flex-1"
                          />
                          {!aberta && (meal.items?.length ?? 0) > 0 && (
                            <span className="text-[9px] text-text-tertiary shrink-0 whitespace-nowrap">
                              · {meal.items.length} {meal.items.length === 1 ? 'item' : 'itens'}
                            </span>
                          )}
                        </div>

                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setMealMenuOpen((prev) => (prev === mealIdx ? null : mealIdx))
                            }
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-text-tertiary transition-colors hover:text-text-primary"
                            title="Opções da refeição"
                            aria-label="Opções da refeição"
                            aria-expanded={mealMenuOpen === mealIdx}
                          >
                            <DotsThree size={16} weight="bold" />
                          </button>
                          {mealMenuOpen === mealIdx && (
                            <>
                              <button
                                type="button"
                                className="fixed inset-0 z-20 cursor-default bg-transparent"
                                aria-label="Fechar menu"
                                onClick={() => setMealMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-full z-30 mt-1 min-w-[160px] rounded-lg border-0 bg-surface-1 py-1 shadow-elev-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDuplicateMeal(mealIdx);
                                    setMealMenuOpen(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-text-primary hover:bg-surface-2"
                                >
                                  <Copy size={14} /> Clonar
                                </button>
                                <div className="my-1 h-px bg-[color:var(--border-divider)]" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRemoveMeal(mealIdx);
                                    setMealMenuOpen(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-danger hover:bg-danger/10"
                                >
                                  <Trash size={14} /> Excluir
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Macros — mesma tipografia do MacrosCard */}
                      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 pl-6">
                        <span className="inline-flex items-baseline gap-0.5">
                          <span className="text-[13px] font-extrabold leading-none tabular-nums lining-nums text-text-primary">
                            {macros.calories.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-[10px] font-semibold" style={{ color: 'var(--brand-primary)' }}>kcal</span>
                        </span>
                        <span className="inline-flex items-baseline gap-0.5">
                          <span className="text-[10px] text-text-tertiary">P</span>
                          <span className="text-[12px] font-extrabold leading-none tabular-nums lining-nums text-text-primary">
                            {macros.protein}
                          </span>
                          <span className="text-[10px] text-text-disabled">g</span>
                        </span>
                        <span className="inline-flex items-baseline gap-0.5">
                          <span className="text-[10px] text-text-tertiary">C</span>
                          <span className="text-[12px] font-extrabold leading-none tabular-nums lining-nums text-text-primary">
                            {macros.carbs}
                          </span>
                          <span className="text-[10px] text-text-disabled">g</span>
                        </span>
                        <span className="inline-flex items-baseline gap-0.5">
                          <span className="text-[10px] text-text-tertiary">G</span>
                          <span className="text-[12px] font-extrabold leading-none tabular-nums lining-nums text-text-primary">
                            {macros.fat}
                          </span>
                          <span className="text-[10px] text-text-disabled">g</span>
                        </span>
                      </div>
                    </div>

                    {aberta && (
                    <>
                    {/* Meal items */}
                    <div className="flex flex-col">
                      {(meal.items || []).length === 0 &&
                      !(!isMobile && searchOpen?.mealIndex === mealIdx) ? (
                        <button
                          type="button"
                          onClick={() => handleAddFoodToMeal(mealIdx)}
                          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-divider px-3 py-5 text-center transition-colors hover:border-brand/40 hover:bg-brand/5"
                        >
                          <p className="text-[10px] text-text-disabled">
                            Nenhum alimento prescrito para esta refeição.
                          </p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[color:var(--brand-primary)]">
                            <Plus className="h-3 w-3" weight="bold" />
                            Alimento
                          </span>
                        </button>
                      ) : (meal.items || []).length > 0 ? (
                        <>
                        <div className="flex flex-col divide-y divide-black/[0.03] dark:divide-white/[0.04]">
                        {meal.items.map((item: any, itemIdx: number) => {
                          const food = getFoodById(item.food_id);
                          if (!food) return null;
                          const calculated = calculateItemMacros(food, Number(item.quantity_grams));

                          return (
                            <div key={itemIdx} className="flex flex-col gap-1 py-2 first:pt-0">
                              {/* Nome + gramas na mesma linha */}
                              <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-bold leading-tight text-text-primary">{food.name}</p>
                                  <span className="text-[9px] font-mono text-text-tertiary tabular-nums lining-nums">
                                    {calculated.calories} kcal · P: {calculated.protein}g · C: {calculated.carbs}g · G: {calculated.fat}g
                                  </span>
                                </div>

                                <div className="flex shrink-0 items-center gap-1.5">
                                  <div className="flex w-[3.75rem] items-baseline gap-0.5" title="Gramas (base do cálculo de macros)">
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      value={item.quantity_grams}
                                      onChange={(e) => {
                                        const updated = [...meals];
                                        updated[mealIdx].items[itemIdx].quantity_grams = Number(e.target.value);
                                        setMeals(updated);
                                      }}
                                      aria-label="Quantidade em gramas"
                                      className="input-qty min-w-0 flex-1 text-right"
                                    />
                                    <span className="shrink-0 text-[11px] text-text-disabled">g</span>
                                  </div>

                                  <button
                                    onClick={() => handleRemoveFoodItem(mealIdx, itemIdx)}
                                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent transition-opacity hover:opacity-80"
                                    style={{ color: 'var(--brand-primary)' }}
                                    title="Remover Alimento"
                                  >
                                    <Trash size={12} />
                                  </button>
                                </div>
                              </div>

                              {food.portions && food.portions.length > 0 ? (
                                <div className="flex items-center gap-2">
                                  <Select
                                    variant="underline"
                                    size="sm"
                                    value={item.portion_label || ''}
                                    onChange={(label) => {
                                      const portion = food.portions?.find(p => p.label === label);
                                      const updated = [...meals];
                                      updated[mealIdx].items[itemIdx].portion_label = label;
                                      if (portion) {
                                        updated[mealIdx].items[itemIdx].quantity_grams = Number(portion.grams);
                                      }
                                      setMeals(updated);
                                    }}
                                    placeholder="Só gramas"
                                    className="w-[9.5rem] shrink-0"
                                    options={[
                                      { value: '', label: 'Só gramas' },
                                      ...food.portions.map((p) => ({
                                        value: p.label,
                                        label: p.label,
                                        hint: `${p.grams}g`,
                                      })),
                                    ]}
                                  />

                                  {item.portion_label && !isGramsOnlyLabel(item.portion_label) ? (
                                    <div className="flex w-12 shrink-0 items-baseline gap-0.5" title="Quantidade de medidas (ex.: 2 copas)">
                                      <input
                                        type="number"
                                        min={0.1}
                                        step={0.25}
                                        value={(() => {
                                          const portion = food.portions.find(p => p.label === item.portion_label);
                                          if (!portion || Number(portion.grams) === 0) return 1;
                                          return Math.round((Number(item.quantity_grams) / Number(portion.grams)) * 100) / 100;
                                        })()}
                                        onChange={(e) => {
                                          const mult = Number(e.target.value) || 1;
                                          const portion = food.portions?.find(p => p.label === item.portion_label);
                                          if (portion) {
                                            const updated = [...meals];
                                            updated[mealIdx].items[itemIdx].quantity_grams = Math.round(Number(portion.grams) * mult * 10) / 10;
                                            setMeals(updated);
                                          }
                                        }}
                                        aria-label="Quantidade de medidas"
                                        className="input-qty min-w-0 flex-1 text-right"
                                      />
                                      <span className="shrink-0 text-[11px] text-text-disabled">×</span>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                              {/* Substitutions section */}
                              <div className="border-t border-black/[0.04] pt-1.5 dark:border-white/[0.05]">
                                <div className="mb-1 flex items-center justify-between">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary">Substituições equivalentes</span>
                                  <button
                                    onClick={() => handleAddSubstitution(mealIdx, itemIdx)}
                                    className="flex cursor-pointer items-center gap-1 text-[9px] font-bold text-brand hover:text-brand-hover"
                                  >
                                    <Plus size={10} /> Adicionar substituto
                                  </button>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  {(item.substitutions || []).map((sub: any, subIdx: number) => {
                                    const subFood = getFoodById(sub.substitute_food_id);
                                    if (!subFood) return null;
                                    const subCalculated = calculateItemMacros(subFood, Number(sub.quantity_grams));

                                    return (
                                      <div key={subIdx} className="bg-surface-3/60 border-0 rounded px-2.5 py-1.5 flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                          <p className="text-[10px] font-bold text-text-secondary truncate">{subFood.name}</p>
                                          <span className="text-[8px] font-mono text-text-disabled">
                                            {sub.quantity_grams}g · {subCalculated.calories} kcal (P: {subCalculated.protein}g · C: {subCalculated.carbs}g)
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <div className="flex w-14 items-baseline gap-0.5">
                                            <input
                                              type="number"
                                              inputMode="decimal"
                                              value={sub.quantity_grams}
                                              onChange={(e) => {
                                                const updated = [...meals];
                                                updated[mealIdx].items[itemIdx].substitutions[subIdx].quantity_grams = Number(e.target.value);
                                                setMeals(updated);
                                              }}
                                              aria-label="Gramas do substituto"
                                              className="input-qty min-w-0 flex-1 text-right"
                                            />
                                            <span className="shrink-0 text-[11px] text-text-disabled">g</span>
                                          </div>

                                          {subFood.portions && subFood.portions.length > 0 && (
                                            <div className="flex min-w-0 items-center gap-1">
                                              <Select
                                                variant="underline"
                                                size="sm"
                                                value={sub.portion_label || ''}
                                                onChange={(label) => {
                                                  const portion = subFood.portions?.find(p => p.label === label);
                                                  const updated = [...meals];
                                                  updated[mealIdx].items[itemIdx].substitutions[subIdx].portion_label = label;
                                                  if (portion) {
                                                    updated[mealIdx].items[itemIdx].substitutions[subIdx].quantity_grams = Number(portion.grams);
                                                  }
                                                  setMeals(updated);
                                                }}
                                                placeholder="Porção…"
                                                className="w-[7.5rem] shrink-0"
                                                options={[
                                                  { value: '', label: 'Porção…' },
                                                  ...subFood.portions.map((p) => ({
                                                    value: p.label,
                                                    label: p.label,
                                                    hint: `${p.grams}g`,
                                                  })),
                                                ]}
                                              />

                                              {sub.portion_label ? (
                                                <div className="flex w-11 items-baseline gap-0.5" title="Quantidade de porções">
                                                  <input
                                                    type="number"
                                                    min={0.1}
                                                    step={0.25}
                                                    value={(() => {
                                                      const portion = subFood.portions.find(p => p.label === sub.portion_label);
                                                      if (!portion || Number(portion.grams) === 0) return 1;
                                                      return Math.round((Number(sub.quantity_grams) / Number(portion.grams)) * 100) / 100;
                                                    })()}
                                                    onChange={(e) => {
                                                      const mult = Number(e.target.value) || 1;
                                                      const portion = subFood.portions?.find(p => p.label === sub.portion_label);
                                                      if (portion) {
                                                        const updated = [...meals];
                                                        updated[mealIdx].items[itemIdx].substitutions[subIdx].quantity_grams = Math.round(Number(portion.grams) * mult * 10) / 10;
                                                        setMeals(updated);
                                                      }
                                                    }}
                                                    className="input-qty min-w-0 flex-1 text-right"
                                                  />
                                                  <span className="shrink-0 text-[10px] text-text-tertiary">×</span>
                                                </div>
                                              ) : null}
                                            </div>
                                          )}

                                          <button
                                            onClick={() => handleRemoveSubItem(mealIdx, itemIdx, subIdx)}
                                            className="flex h-5 w-5 cursor-pointer items-center justify-center rounded border-0 bg-transparent transition-opacity hover:opacity-80"
                                            style={{ color: 'var(--brand-primary)' }}
                                            title="Remover substituto"
                                          >
                                            <Trash size={10} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        </div>

                        {!(!isMobile && searchOpen?.mealIndex === mealIdx) && (
                          <div className="mt-1 flex justify-start pt-1">
                            <Button
                              onClick={() => handleAddFoodToMeal(mealIdx)}
                              variant="ghost"
                              className="h-7 cursor-pointer rounded-md px-2 text-[10px] font-bold uppercase text-[color:var(--brand-primary)] hover:bg-transparent hover:opacity-80 active:bg-transparent"
                              leftIcon={<Plus className="h-3 w-3" />}
                            >
                              Alimento
                            </Button>
                          </div>
                        )}
                        </>
                      ) : null}

                      {!isMobile && searchOpen?.mealIndex === mealIdx && (
                        <div className={cn((meal.items || []).length > 0 && 'mt-2')}>
                          <FoodSearchPanel
                            variant="inline"
                            title={
                              searchOpen.itemIndex !== undefined
                                ? 'Adicionar substituto'
                                : 'Adicionar alimento'
                            }
                            {...foodSearchPanelProps}
                          />
                        </div>
                      )}
                    </div>

                    {/* Recomendações — largura total */}
                    <div className="border-t border-black/[0.04] pt-3 dark:border-white/[0.05]">
                      <input
                        type="text"
                        value={meal.notes}
                        onChange={(e) => {
                          const updated = [...meals];
                          updated[mealIdx].notes = e.target.value;
                          setMeals(updated);
                        }}
                        placeholder="Recomendações da refeição"
                        className="field-token-input field-token-compact w-full"
                      />
                    </div>
                    </>
                    )}
                  </Card>
                );
              })}
              </div>

              <AdicionarRefeicaoButton onAdicionar={handleAddMeal} />
            </div>
          </div>

          {/* Coluna Direita: ações + análise */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)] lg:overflow-y-auto lg:px-2 lg:py-2 lg:[-ms-overflow-style:none] lg:[scrollbar-width:thin]">
            <Card className="card-nivel-3 flex w-full flex-col gap-3 rounded-[20px] border-0 p-4 md:p-5">
              <Button
                onClick={() => handleSavePlan('active')}
                variant="primary"
                loading={saving}
                disabled={saving}
                fullWidth
                className="h-10 cursor-pointer gap-1.5 rounded-lg text-xs font-bold"
                leftIcon={<CheckCircle className="h-4 w-4" />}
              >
                Publicar Plano Alimentar
              </Button>

              <Button
                onClick={() => handleSavePlan('draft')}
                variant="secondary"
                loading={saving}
                disabled={saving}
                fullWidth
                className="h-10 cursor-pointer gap-1.5 rounded-lg border-0 text-xs font-bold"
                leftIcon={<FloppyDisk className="h-4 w-4" />}
              >
                Salvar Rascunho
              </Button>
            </Card>

            <MacrosCard
              proteina={planMacros.protein}
              carbo={planMacros.carbs}
              gordura={planMacros.fat}
              readOnly={saving}
              atual={{
                proteina: planMacros.protein,
                carbo: planMacros.carbs,
                gordura: planMacros.fat,
                kcal: planMacros.calories,
              }}
            />

            <MetaProgressCard
              proteinaPrescrita={planMacros.protein}
              carboPrescrito={planMacros.carbs}
              gorduraPrescrita={planMacros.fat}
              proteinaMeta={macrosAlvo.proteina}
              carboMeta={macrosAlvo.carbo}
              gorduraMeta={macrosAlvo.gordura}
            />

            <RefeicoesMiniResumo refeicoes={refeicoesMini} />
          </div>

        </div>
      </div>

      {/* Busca de alimentos — modal só no mobile */}
      {isMobile && searchOpen !== null && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <FoodSearchPanel
            variant="modal"
            title={
              searchOpen.itemIndex !== undefined
                ? 'Adicionar Substituto'
                : 'Adicionar Alimento'
            }
            {...foodSearchPanelProps}
          />
        </div>
      )}

      <ConfirmModal
        open={mealToRemove !== null}
        title="Remover refeição"
        description="Os alimentos e substituições desta refeição serão removidos do plano."
        confirmLabel="Remover"
        confirmVariant="danger"
        onConfirm={confirmRemoveMeal}
        onClose={() => setMealToRemove(null)}
      />
    </div>
  );
}
