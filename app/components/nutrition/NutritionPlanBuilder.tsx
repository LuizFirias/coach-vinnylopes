'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { 
  Plus, Trash, ArrowLeft, FloppyDisk, CheckCircle, 
  MagnifyingGlass, Barbell, Info, Calendar, Copy, CaretRight
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { calculateItemMacros, sumMacros, CalculatedMacro } from '@/lib/nutrition/calculateMacros';
import { NutritionFood, NutritionFoodCategory, NutritionMealType } from '@/lib/nutrition/types';
import { formatFoodQuantityDisplay, isGramsOnlyLabel } from '@/lib/nutrition/portionDisplay';
import { cn } from '@/lib/utils/cn';
import { textIncludes } from '@/lib/utils/textNormalize';
import { readReturnUrl } from '@/lib/utils/adminNav';
import { useVirtualizer } from '@tanstack/react-virtual';

interface NutritionPlanBuilderProps {
  initialPlanData?: any;
}

export default function NutritionPlanBuilder({ initialPlanData }: NutritionPlanBuilderProps) {
  const router = useRouter();
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

  // Target macros
  const [targetKcal, setTargetKcal] = useState('');
  const [targetProtein, setTargetProtein] = useState('');
  const [targetCarbs, setTargetCarbs] = useState('');
  const [targetFat, setTargetFat] = useState('');

  // Meals data structure
  const [meals, setMeals] = useState<any[]>([]);
  // Accordion: quais refeições estão expandidas (por índice)
  const [mealsAbertas, setMealsAbertas] = useState<Record<number, boolean>>({});

  // Search combobox states
  const [searchOpen, setSearchOpen] = useState<{ mealIndex: number; itemIndex?: number; subIndex?: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [activeGroup, setActiveGroup] = useState<'todos' | 'macros' | 'outros'>('todos');

  // Load students and foods
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data: authData } = await supabaseClient.auth.getUser();
        const coachId = authData?.user?.id;
        if (!coachId) return;

        // Check local storage cache for foods (24h cache)
        const cacheKey = 'auron_food_library';
        const cacheTimeKey = 'auron_food_library_time';
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

          setTargetKcal(initialPlanData.calories_target?.toString() || '');
          setTargetProtein(initialPlanData.protein_target?.toString() || '');
          setTargetCarbs(initialPlanData.carbs_target?.toString() || '');
          setTargetFat(initialPlanData.fat_target?.toString() || '');

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
    if (!window.confirm("Remover esta refeição? Os alimentos e substituições desta refeição serão removidos do plano.")) return;
    setMeals(meals.filter((_, i) => i !== index));
  };

  const handleAddFoodToMeal = (mealIndex: number) => {
    setSearchOpen({ mealIndex });
    setSearchQuery('');
    setCategoryFilter('');
    setActiveGroup('todos');
  };

  const handleAddSubstitution = (mealIndex: number, itemIndex: number) => {
    setSearchOpen({ mealIndex, itemIndex });
    setSearchQuery('');
    setCategoryFilter('');
    setActiveGroup('todos');
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

  const handleSelectFood = (food: NutritionFood) => {
    if (!searchOpen) return;
    const { mealIndex, itemIndex } = searchOpen;

    const defaultPortion = food.portions?.find(p => p.is_default) || food.portions?.[0];
    const initialGrams = defaultPortion ? Number(defaultPortion.grams) : 100;
    const initialLabel = defaultPortion ? defaultPortion.label : '100g';

    const updated = [...meals];

    if (itemIndex !== undefined) {
      // Adding substitution to item
      const item = updated[mealIndex].items[itemIndex];
      const newSub = {
        substitute_food_id: food.id,
        quantity_grams: initialGrams,
        portion_label: initialLabel,
        notes: ''
      };
      item.substitutions = [...(item.substitutions || []), newSub];
    } else {
      // Adding main item to meal
      const newItem = {
        food_id: food.id,
        quantity_grams: initialGrams,
        portion_label: initialLabel,
        notes: '',
        sort_order: updated[mealIndex].items.length,
        substitutions: []
      };
      updated[mealIndex].items.push(newItem);
    }

    setMeals(updated);
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

  const getPlanMacros = (): CalculatedMacro => {
    const mealMacros = meals.map(m => getMealMacros(m));
    return sumMacros(mealMacros);
  };

  const planMacros = getPlanMacros();

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
          calories_target: targetKcal ? Number(targetKcal) : null,
          protein_target: targetProtein ? Number(targetProtein) : null,
          carbs_target: targetCarbs ? Number(targetCarbs) : null,
          fat_target: targetFat ? Number(targetFat) : null,
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
      const matchesCategory = categoryFilter ? food.category === categoryFilter : true;
      return matchesQuery && matchesCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredFoods.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-28">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 py-6 border-b border-divider/50 mb-6">
          <button
            onClick={goBack}
            className="w-8 h-8 rounded-md bg-surface-2 border-0 hover:border-brand/40 text-text-secondary hover:text-brand flex items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-danger-subtle border border-danger-border text-danger text-xs font-semibold animate-shake">
            <div className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0 animate-pulse" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-success-subtle border border-success-border text-success text-xs font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Layout Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Coluna Esquerda: Construtor (70%) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* CARD 1: Dados Básicos */}
            <Card className="rounded-xl border-0 p-4 md:p-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Aluno destinatário"
                  value={selectedStudentId}
                  onChange={setSelectedStudentId}
                  placeholder="Selecione o aluno..."
                  disabled={!!initialPlanData || saving}
                  options={alunos.map(a => ({
                    value: a.id,
                    label: a.coaching_reference || a.full_name || a.id
                  }))}
                />
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary ml-1">Nome do Plano</label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Ex: Bulking Limpo - Fase Carga"
                    disabled={saving}
                    className="h-10 px-3 bg-surface-2 border border-input rounded-md text-xs text-text-primary focus:outline-none focus:border-brand/40 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Objetivo principal"
                  value={goal}
                  onChange={setGoal}
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

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary ml-1">Data Início</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={saving}
                    className="h-10 px-3 bg-surface-2 border border-input rounded-md text-xs text-text-primary focus:outline-none focus:border-brand/40 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary ml-1">Data Término</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={saving}
                    className="h-10 px-3 bg-surface-2 border border-input rounded-md text-xs text-text-primary focus:outline-none focus:border-brand/40 transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary ml-1">
                  Orientações gerais
                </label>
                <textarea
                  value={orientacoesGerais}
                  onChange={(e) => {
                    setOrientacoesGerais(e.target.value);
                    setNotes(e.target.value);
                  }}
                  placeholder={`Suplementação e orientações do plano — ex.:
• Creatina 5g/dia (após o treino)
• Ômega 3 2 cápsulas no almoço
• Beber 3–4 L de água ao longo do dia`}
                  rows={5}
                  disabled={saving}
                  className="w-full px-3 py-2.5 bg-surface-2 border border-input rounded-md text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-all resize-y min-h-[100px]"
                />
                <p className="text-[10px] text-text-tertiary ml-1">
                  Visível em destaque no app do aluno — use para suplementos, timing e avisos gerais.
                </p>
              </div>
            </Card>

            {/* CARD 2: Metas Nutricionais */}
            <Card className="rounded-xl border-0 p-4 md:p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary ml-1">Kcal Alvo</label>
                  <input
                    type="number"
                    value={targetKcal}
                    onChange={(e) => setTargetKcal(e.target.value)}
                    placeholder="Ex: 2800"
                    disabled={saving}
                    className="h-10 px-3 bg-surface-2 border border-input rounded-md text-xs text-text-primary focus:outline-none focus:border-brand/40 transition-colors font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary ml-1">Proteínas (g)</label>
                  <input
                    type="number"
                    value={targetProtein}
                    onChange={(e) => setTargetProtein(e.target.value)}
                    placeholder="Ex: 160"
                    disabled={saving}
                    className="h-10 px-3 bg-surface-2 border border-input rounded-md text-xs text-text-primary focus:outline-none focus:border-brand/40 transition-colors font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary ml-1">Carboidratos (g)</label>
                  <input
                    type="number"
                    value={targetCarbs}
                    onChange={(e) => setTargetCarbs(e.target.value)}
                    placeholder="Ex: 300"
                    disabled={saving}
                    className="h-10 px-3 bg-surface-2 border border-input rounded-md text-xs text-text-primary focus:outline-none focus:border-brand/40 transition-colors font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary ml-1">Gorduras (g)</label>
                  <input
                    type="number"
                    value={targetFat}
                    onChange={(e) => setTargetFat(e.target.value)}
                    placeholder="Ex: 75"
                    disabled={saving}
                    className="h-10 px-3 bg-surface-2 border border-input rounded-md text-xs text-text-primary focus:outline-none focus:border-brand/40 transition-colors font-mono"
                  />
                </div>
              </div>
            </Card>

            {/* CARD 3: Refeições */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-end border-b border-divider/50 pb-2">
                {meals.length === 0 && (
                  <Button
                    onClick={handleCreateDefaultMeals}
                    variant="secondary"
                    className="h-7 px-2.5 text-[10px] font-bold uppercase rounded-md cursor-pointer border-0"
                  >
                    Gerar Refeições Padrão
                  </Button>
                )}
              </div>

              {meals.map((meal, mealIdx) => {
                const macros = getMealMacros(meal);
                const aberta = mealsAbertas[mealIdx] ?? (mealIdx === 0);
                return (
                  <Card key={mealIdx} className={cn("rounded-xl border-0 shadow-sm p-4 md:p-5 flex flex-col bg-surface-1", aberta ? "gap-4" : "gap-0")}>
                    
                    {/* Meal Header */}
                    <div className={cn("flex items-center justify-between gap-4", aberta && "border-b border-divider/40 pb-2")}>
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => setMealsAbertas(prev => ({ ...prev, [mealIdx]: !aberta }))}
                          className="shrink-0 text-text-tertiary hover:text-text-primary transition-colors"
                          title={aberta ? 'Recolher refeição' : 'Expandir refeição'}
                        >
                          <CaretRight size={14} className={cn("transition-transform", aberta && "rotate-90")} />
                        </button>
                        <input
                          type="text"
                          value={meal.title}
                          onChange={(e) => {
                            const updated = [...meals];
                            updated[mealIdx].title = e.target.value;
                            setMeals(updated);
                          }}
                          className="bg-transparent border-none text-xs font-extrabold text-text-primary focus:outline-none w-28 md:w-48 min-w-0"
                        />
                        <input
                          type="time"
                          value={meal.time_suggestion || ''}
                          onChange={(e) => {
                            const updated = [...meals];
                            updated[mealIdx].time_suggestion = e.target.value;
                            setMeals(updated);
                          }}
                          className="bg-surface-2 border-0 text-[10px] px-1.5 py-0.5 rounded font-mono text-text-secondary shrink-0"
                        />
                        {!aberta && (meal.items?.length ?? 0) > 0 && (
                          <span className="text-[9px] text-text-tertiary shrink-0 whitespace-nowrap">
                            · {meal.items.length} {meal.items.length === 1 ? 'item' : 'itens'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Meal Macros Summary */}
                        <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-text-tertiary">
                          <span>{macros.calories} kcal</span>
                          <span>P: {macros.protein}g</span>
                          <span>C: {macros.carbs}g</span>
                          <span>G: {macros.fat}g</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDuplicateMeal(mealIdx)}
                          className="w-7 h-7 rounded-md bg-surface-2 hover:bg-surface-3 border-0 hover:border-brand/30 text-text-secondary hover:text-brand flex items-center justify-center transition-colors cursor-pointer"
                          title="Duplicar Refeição"
                        >
                          <Copy size={13} />
                        </button>

                        <button
                          onClick={() => handleRemoveMeal(mealIdx)}
                          className="w-7 h-7 rounded-md bg-surface-2 hover:bg-surface-3 border-0 hover:border-danger/30 text-text-secondary hover:text-danger flex items-center justify-center transition-colors cursor-pointer"
                          title="Remover Refeição"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </div>

                    {aberta && (
                    <>
                    {/* Meal items (list) — Fase 8: linha de lista, sem card aninhado */}
                    <div className="flex flex-col divide-y divide-border-subtle/40">
                      {(meal.items || []).length === 0 ? (
                        <p className="text-[10px] text-text-disabled text-center py-4 border border-dashed border-divider rounded-lg">
                          Nenhum alimento prescrito para esta refeição.
                        </p>
                      ) : (
                        meal.items.map((item: any, itemIdx: number) => {
                          const food = getFoodById(item.food_id);
                          if (!food) return null;
                          const calculated = calculateItemMacros(food, Number(item.quantity_grams));

                          return (
                            <div key={itemIdx} className="py-3 first:pt-0 flex flex-col gap-2">
                              {/* Main Item Row */}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-text-primary leading-tight truncate">{food.name}</p>
                                  <span className="text-[9px] font-mono text-text-tertiary">
                                    {calculated.calories} kcal · P: {calculated.protein}g · C: {calculated.carbs}g · G: {calculated.fat}g
                                  </span>
                                </div>

                                <div className="flex items-center flex-wrap gap-2 sm:shrink-0">
                                  {/* Modo: gramas sempre editável; medida caseira quando disponível */}
                                  <div className="flex items-center gap-1 bg-surface-3 border border-input rounded-md px-2 h-7 w-20" title="Gramas (base do cálculo de macros)">
                                    <input
                                      type="number"
                                      value={item.quantity_grams}
                                      onChange={(e) => {
                                        const updated = [...meals];
                                        updated[mealIdx].items[itemIdx].quantity_grams = Number(e.target.value);
                                        setMeals(updated);
                                      }}
                                      className="w-full bg-transparent border-none text-[10px] font-mono font-bold text-text-primary focus:outline-none text-right"
                                    />
                                    <span className="text-[9px] font-mono text-text-tertiary">g</span>
                                  </div>

                                  {food.portions && food.portions.length > 0 && (
                                    <div className="flex items-center gap-1.5">
                                      <select
                                        value={item.portion_label || ''}
                                        onChange={(e) => {
                                          const label = e.target.value;
                                          const portion = food.portions?.find(p => p.label === label);
                                          const updated = [...meals];
                                          updated[mealIdx].items[itemIdx].portion_label = label;
                                          if (portion) {
                                            updated[mealIdx].items[itemIdx].quantity_grams = Number(portion.grams);
                                          }
                                          setMeals(updated);
                                        }}
                                        className="h-7 px-1.5 bg-surface-3 border border-input rounded-md text-[9px] text-text-secondary focus:outline-none max-w-[140px]"
                                        title="Medida caseira"
                                      >
                                        <option value="">Só gramas</option>
                                        {food.portions.map((p, pIdx) => (
                                          <option key={pIdx} value={p.label}>
                                            {p.label} ({p.grams}g)
                                          </option>
                                        ))}
                                      </select>

                                      {item.portion_label && !isGramsOnlyLabel(item.portion_label) && (
                                        <div className="flex items-center gap-0.5 bg-brand/10 border border-brand/30 rounded-md px-1 h-7 w-14" title="Quantidade de medidas (ex.: 3 ovos)">
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
                                            className="w-full bg-transparent border-none text-[10px] font-mono font-bold text-brand focus:outline-none text-right"
                                          />
                                          <span className="text-[8px] text-brand font-bold">×</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {item.portion_label && !isGramsOnlyLabel(item.portion_label) && (
                                    <span className="text-[9px] text-brand font-medium hidden sm:inline">
                                      {formatFoodQuantityDisplay(
                                        item.quantity_grams,
                                        item.portion_label,
                                        food.portions?.find((p) => p.label === item.portion_label)?.grams,
                                      ).primary}
                                    </span>
                                  )}

                                  <button
                                    onClick={() => handleRemoveFoodItem(mealIdx, itemIdx)}
                                    className="w-6 h-6 rounded-md bg-surface-3 hover:bg-surface-2 text-text-secondary hover:text-danger flex items-center justify-center transition-colors cursor-pointer border-0"
                                    title="Remover Alimento"
                                  >
                                    <Trash size={12} />
                                  </button>
                                </div>
                              </div>

                              {/* Substitutions section */}
                              <div className="border-t border-divider/30 pt-2 pl-3">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[9px] uppercase font-bold text-text-tertiary tracking-wider">Substituições equivalentes</span>
                                  <button
                                    onClick={() => handleAddSubstitution(mealIdx, itemIdx)}
                                    className="text-[9px] text-brand hover:text-brand-hover flex items-center gap-1 font-bold cursor-pointer"
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
                                          {/* Sub Grams Input */}
                                          <div className="flex items-center gap-0.5 bg-surface-2 border border-input/30 rounded px-1.5 h-6 w-14">
                                            <input
                                              type="number"
                                              value={sub.quantity_grams}
                                              onChange={(e) => {
                                                const updated = [...meals];
                                                updated[mealIdx].items[itemIdx].substitutions[subIdx].quantity_grams = Number(e.target.value);
                                                setMeals(updated);
                                              }}
                                              className="w-full bg-transparent border-none text-[9px] font-mono text-text-primary focus:outline-none text-right"
                                            />
                                            <span className="text-[8px] font-mono text-text-tertiary">g</span>
                                          </div>

                                          {/* Sub portions */}
                                          {subFood.portions && subFood.portions.length > 0 && (
                                            <div className="flex items-center gap-1">
                                              <select
                                                value={sub.portion_label || ''}
                                                onChange={(e) => {
                                                  const label = e.target.value;
                                                  const portion = subFood.portions?.find(p => p.label === label);
                                                  const updated = [...meals];
                                                  updated[mealIdx].items[itemIdx].substitutions[subIdx].portion_label = label;
                                                  if (portion) {
                                                    updated[mealIdx].items[itemIdx].substitutions[subIdx].quantity_grams = Number(portion.grams);
                                                  }
                                                  setMeals(updated);
                                                }}
                                                className="h-6 px-1 bg-surface-2 border border-input/30 rounded text-[8px] text-text-secondary focus:outline-none"
                                              >
                                                <option value="">Porção...</option>
                                                {subFood.portions.map((p, pIdx) => (
                                                  <option key={pIdx} value={p.label}>
                                                    {p.label}
                                                  </option>
                                                ))}
                                              </select>

                                              {sub.portion_label && (
                                                <div className="flex items-center gap-0.5 bg-surface-2 border border-input/30 rounded px-1 h-6 w-11" title="Quantidade de porções">
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
                                                    className="w-full bg-transparent border-none text-[9px] font-mono text-text-primary focus:outline-none text-right"
                                                  />
                                                  <span className="text-[8px] text-text-tertiary">x</span>
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          <button
                                            onClick={() => handleRemoveSubItem(mealIdx, itemIdx, subIdx)}
                                            className="w-5 h-5 rounded bg-surface-2 hover:bg-surface-1 text-text-secondary hover:text-danger flex items-center justify-center transition-colors cursor-pointer border-0"
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
                        })
                      )}
                    </div>

                    {/* Meal actions */}
                    <div className="flex items-center justify-between border-t border-divider/40 pt-3 mt-1">
                      <div className="flex flex-col gap-1.5 w-full mr-4">
                        <input
                          type="text"
                          value={meal.notes}
                          onChange={(e) => {
                            const updated = [...meals];
                            updated[mealIdx].notes = e.target.value;
                            setMeals(updated);
                          }}
                          placeholder="Recomendações da refeição (ex: comer 30min antes do treino)..."
                          className="w-full bg-transparent border-none text-[10px] text-text-secondary placeholder:text-text-disabled focus:outline-none"
                        />
                      </div>

                      <Button
                        onClick={() => handleAddFoodToMeal(mealIdx)}
                        variant="secondary"
                        className="h-7 px-3 text-[10px] font-bold uppercase rounded-md cursor-pointer border-0 shrink-0"
                        leftIcon={<Plus className="w-3 h-3" />}
                      >
                        Alimento
                      </Button>
                    </div>
                    </>
                    )}
                  </Card>
                );
              })}

              {/* Add Meal Select Bar — Fase 8: grid uniforme */}
              <div className="flex flex-col gap-2 mt-4 bg-surface-1 p-3 rounded-lg border-0">
                <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Adicionar Refeição:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {Object.entries(mealTypeLabels).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => handleAddMeal(type as NutritionMealType)}
                      className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded border-0 bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-brand transition-all cursor-pointer text-center"
                    >
                      + {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Resumo Sticky e Ações (30%) */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 flex flex-col gap-6">
            
            {/* CARD Resumo Lateral */}
            <Card className="rounded-xl border-0 p-4 md:p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-3 font-mono">
                {/* Calorias */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-text-secondary">Calorias:</span>
                    <span className="text-text-primary font-bold">{planMacros.calories} / {targetKcal || '—'} kcal</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand rounded-full transition-all duration-500"
                      style={{ width: `${targetKcal ? Math.min(100, (planMacros.calories / Number(targetKcal)) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Proteínas */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-text-secondary">Proteínas:</span>
                    <span className="text-text-primary font-bold">{planMacros.protein} / {targetProtein || '—'} g</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success rounded-full transition-all duration-500"
                      style={{ width: `${targetProtein ? Math.min(100, (planMacros.protein / Number(targetProtein)) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Carboidratos */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-text-secondary">Carboidratos:</span>
                    <span className="text-text-primary font-bold">{planMacros.carbs} / {targetCarbs || '—'} g</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-warning rounded-full transition-all duration-500"
                      style={{ width: `${targetCarbs ? Math.min(100, (planMacros.carbs / Number(targetCarbs)) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Gorduras */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-text-secondary">Gorduras:</span>
                    <span className="text-text-primary font-bold">{planMacros.fat} / {targetFat || '—'} g</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-danger rounded-full transition-all duration-500"
                      style={{ width: `${targetFat ? Math.min(100, (planMacros.fat / Number(targetFat)) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Refeições resumo lista */}
              <div className="border-t border-divider/40 pt-4 flex flex-col gap-2">
                <span className="text-[9px] uppercase font-bold text-text-tertiary tracking-wider">Macros por refeição</span>
                {meals.map((m, mIdx) => {
                  const mMacros = getMealMacros(m);
                  return (
                    <div key={mIdx} className="flex justify-between items-center text-[10px] text-text-secondary">
                      <span className="font-semibold truncate max-w-[150px]">{m.title}</span>
                      <span className="font-mono">{mMacros.calories} kcal</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* CARD Ações do Construtor */}
            <Card className="rounded-xl border-0 p-4 md:p-5 flex flex-col gap-3">
              <Button
                onClick={() => handleSavePlan('active')}
                variant="primary"
                loading={saving}
                disabled={saving}
                fullWidth
                className="h-10 rounded-lg text-xs font-bold gap-1.5 cursor-pointer"
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Publicar Plano Alimentar
              </Button>

              <Button
                onClick={() => handleSavePlan('draft')}
                variant="secondary"
                loading={saving}
                disabled={saving}
                fullWidth
                className="h-10 rounded-lg text-xs font-bold gap-1.5 cursor-pointer border-0"
                leftIcon={<FloppyDisk className="w-4 h-4" />}
              >
                Salvar Rascunho
              </Button>

              <Button
                onClick={goBack}
                variant="ghost"
                disabled={saving}
                fullWidth
                className="h-10 rounded-lg text-xs font-bold gap-1.5 cursor-pointer"
              >
                Cancelar
              </Button>
            </Card>
          </div>

        </div>
      </div>

      {/* MODAL / DROPDOWN: Busca de Alimentos */}
      {searchOpen !== null && (
        <div className="fixed inset-0 bg-black/60 z-100 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md bg-surface-1 border-0 p-4 md:p-5 flex flex-col gap-4 max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-divider pb-2">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                {searchOpen.itemIndex !== undefined ? 'Adicionar Substituto' : 'Adicionar Alimento'}
              </h3>
              <button
                onClick={() => setSearchOpen(null)}
                className="text-xs text-text-tertiary hover:text-text-primary font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>

            {/* Barra de pesquisa no modal */}
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por arroz, frango, aveia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 h-8 bg-surface-2 border border-input rounded-md text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
                autoFocus
              />
            </div>

            {/* Filtros rápidos por categoria */}
            <div className="flex flex-col gap-2 py-1">
              {/* Filtros Principais */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveGroup('todos');
                    setCategoryFilter('');
                  }}
                  className={cn(
                    "h-7 px-3 flex items-center justify-center rounded-lg text-[10px] uppercase tracking-wider font-bold border shrink-0 transition-all cursor-pointer",
                    activeGroup === 'todos' ? "bg-brand/10 border-brand/40 text-brand" : "bg-surface-2 border-transparent text-text-secondary hover:text-text-primary"
                  )}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveGroup('macros');
                    if (!['carboidrato', 'proteina', 'gordura'].includes(categoryFilter)) {
                      setCategoryFilter('carboidrato');
                    }
                  }}
                  className={cn(
                    "h-7 px-3 flex items-center justify-center rounded-lg text-[10px] uppercase tracking-wider font-bold border shrink-0 transition-all cursor-pointer gap-1",
                    activeGroup === 'macros' ? "bg-brand/10 border-brand/40 text-brand" : "bg-surface-2 border-transparent text-text-secondary hover:text-text-primary"
                  )}
                >
                  Macros <span className="text-[8px] opacity-75">▼</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveGroup('outros');
                    if (!['fruta', 'vegetal', 'leguminosa', 'laticinio', 'suplemento'].includes(categoryFilter)) {
                      setCategoryFilter('fruta');
                    }
                  }}
                  className={cn(
                    "h-7 px-3 flex items-center justify-center rounded-lg text-[10px] uppercase tracking-wider font-bold border shrink-0 transition-all cursor-pointer gap-1",
                    activeGroup === 'outros' ? "bg-brand/10 border-brand/40 text-brand" : "bg-surface-2 border-transparent text-text-secondary hover:text-text-primary"
                  )}
                >
                  Outros <span className="text-[8px] opacity-75">▼</span>
                </button>
              </div>

              {/* Sub-categorias (só aparece se macros ou outros estiver selecionado) */}
              {activeGroup === 'macros' && (
                <div className="flex flex-wrap items-center gap-1.5 pl-2 border-l border-divider py-0.5 mt-0.5">
                  {[
                    { val: 'carboidrato', label: 'Carboidrato' },
                    { val: 'proteina', label: 'Proteína' },
                    { val: 'gordura', label: 'Gordura' }
                  ].map(sub => (
                    <button
                      key={sub.val}
                      type="button"
                      onClick={() => setCategoryFilter(sub.val)}
                      className={cn(
                        "h-6 px-2.5 flex items-center justify-center rounded-md text-[9px] uppercase font-bold border shrink-0 transition-all cursor-pointer",
                        categoryFilter === sub.val ? "bg-brand/10 border-brand/40 text-brand" : "bg-surface-2/60 border-transparent text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}

              {activeGroup === 'outros' && (
                <div className="flex flex-wrap items-center gap-1.5 pl-2 border-l border-divider py-0.5 mt-0.5">
                  {[
                    { val: 'fruta', label: 'Fruta' },
                    { val: 'vegetal', label: 'Vegetal' },
                    { val: 'leguminosa', label: 'Leguminosa' },
                    { val: 'laticinio', label: 'Laticínio' },
                    { val: 'suplemento', label: 'Suplemento' }
                  ].map(sub => (
                    <button
                      key={sub.val}
                      type="button"
                      onClick={() => setCategoryFilter(sub.val)}
                      className={cn(
                        "h-6 px-2.5 flex items-center justify-center rounded-md text-[9px] uppercase font-bold border shrink-0 transition-all cursor-pointer",
                        categoryFilter === sub.val ? "bg-brand/10 border-brand/40 text-brand" : "bg-surface-2/60 border-transparent text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Listagem de resultados no modal */}
            <div
              ref={parentRef}
              className="flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-surface-3 [&::-webkit-scrollbar-thumb]:rounded relative"
            >
              {filteredFoods.length === 0 ? (
                <p className="text-xs text-text-disabled text-center py-6">Nenhum alimento encontrado.</p>
              ) : (
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                    const food = filteredFoods[virtualItem.index];
                    if (!food) return null;
                    return (
                      <div
                        key={virtualItem.key}
                        onClick={() => handleSelectFood(food)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualItem.size - 8}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                        className="p-3 bg-surface-2 border-0 hover:border-brand/40 hover:bg-surface-3 rounded-lg flex items-center justify-between gap-4 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary leading-tight truncate">{food.name}</p>
                          <span className="text-[8px] uppercase font-bold tracking-wider text-text-tertiary">
                            {food.category} · {food.calories_per_100g} kcal
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-text-secondary shrink-0 text-right">
                          <p>P: {food.protein_per_100g}g</p>
                          <p>C: {food.carbs_per_100g}g</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
