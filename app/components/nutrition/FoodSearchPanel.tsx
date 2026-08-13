'use client';

import { type CSSProperties } from 'react';
import { Check, MagnifyingGlass, Plus, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';
import type { NutritionFood } from '@/lib/nutrition/types';

const MACRO_CATEGORIES = [
  { val: 'carboidrato', label: 'Carboidrato' },
  { val: 'proteina', label: 'Proteína' },
  { val: 'gordura', label: 'Gordura' },
] as const;

const OUTROS_CATEGORIES = [
  { val: 'fruta', label: 'Fruta' },
  { val: 'vegetal', label: 'Vegetal' },
  { val: 'leguminosa', label: 'Leguminosa' },
  { val: 'laticinio', label: 'Laticínio' },
  { val: 'suplemento', label: 'Suplemento' },
  { val: 'oleaginosa', label: 'Oleaginosa' },
  { val: 'bebida', label: 'Bebida' },
  { val: 'tempero', label: 'Tempero' },
  { val: 'outro', label: 'Outro' },
] as const;

export type FoodSearchGroup = 'todos' | 'macros' | 'outros';

type FoodSearchPanelProps = {
  variant: 'inline' | 'modal';
  title: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  activeGroup: FoodSearchGroup;
  onActiveGroupChange: (group: FoodSearchGroup) => void;
  selectedCategories: string[];
  onToggleCategory: (val: string) => void;
  onResetCategories: () => void;
  filteredFoods: NutritionFood[];
  pickedFoodIds: string[];
  onTogglePicked: (foodId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

function filterChipClass(active: boolean) {
  return cn(
    'h-7 px-3 flex items-center justify-center rounded-lg text-[10px] uppercase tracking-wider font-bold border shrink-0 transition-all cursor-pointer gap-1',
    active
      ? 'border-[color:var(--brand-border)] text-[color:var(--brand-primary)]'
      : 'border-transparent text-text-secondary hover:text-text-primary',
  );
}

function filterChipStyle(active: boolean): CSSProperties {
  return {
    background: 'var(--card-macros-bg)',
    boxShadow: active ? 'var(--elev-1)' : undefined,
    borderColor: active ? 'var(--brand-border)' : undefined,
  };
}

export function FoodSearchPanel({
  variant,
  title,
  searchQuery,
  onSearchQueryChange,
  activeGroup,
  onActiveGroupChange,
  selectedCategories,
  onToggleCategory,
  onResetCategories,
  filteredFoods,
  pickedFoodIds,
  onTogglePicked,
  onConfirm,
  onClose,
}: FoodSearchPanelProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-divider pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-text-tertiary transition-colors hover:text-text-primary"
          aria-label="Fechar busca"
        >
          <X size={14} weight="bold" />
        </button>
      </div>

      <div className="field-flat-input rounded-xl border border-border-subtle bg-surface-1">
        <div className="relative flex items-center px-3 py-2.5 pl-9">
          <MagnifyingGlass className="pointer-events-none absolute left-3 h-4 w-4 text-text-disabled" />
          <input
            type="text"
            placeholder="Buscar alimento..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-disabled"
            style={{ touchAction: 'manipulation' }}
            autoFocus
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 py-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              onActiveGroupChange('todos');
              onResetCategories();
            }}
            className={filterChipClass(activeGroup === 'todos')}
            style={filterChipStyle(activeGroup === 'todos')}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => {
              onActiveGroupChange(activeGroup === 'macros' ? 'todos' : 'macros');
              onResetCategories();
            }}
            className={filterChipClass(activeGroup === 'macros')}
            style={filterChipStyle(activeGroup === 'macros')}
          >
            Macros <span className="text-[8px] opacity-75">▼</span>
            {selectedCategories.some((c) => MACRO_CATEGORIES.some((m) => m.val === c)) && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand/15 px-1 text-[9px] tabular-nums">
                {selectedCategories.filter((c) => MACRO_CATEGORIES.some((m) => m.val === c)).length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              onActiveGroupChange(activeGroup === 'outros' ? 'todos' : 'outros');
              onResetCategories();
            }}
            className={filterChipClass(activeGroup === 'outros')}
            style={filterChipStyle(activeGroup === 'outros')}
          >
            Categorias <span className="text-[8px] opacity-75">▼</span>
            {selectedCategories.some((c) => OUTROS_CATEGORIES.some((m) => m.val === c)) && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand/15 px-1 text-[9px] tabular-nums">
                {selectedCategories.filter((c) => OUTROS_CATEGORIES.some((m) => m.val === c)).length}
              </span>
            )}
          </button>
        </div>

        {activeGroup === 'macros' && (
          <div className="flex flex-wrap items-center gap-1.5 py-0.5 pl-1">
            {MACRO_CATEGORIES.map((sub) => {
              const active = selectedCategories.includes(sub.val);
              return (
                <button
                  key={sub.val}
                  type="button"
                  onClick={() => onToggleCategory(sub.val)}
                  className={cn(
                    'h-6 px-2.5 flex items-center justify-center rounded-md text-[9px] uppercase font-bold border shrink-0 transition-all cursor-pointer',
                    active
                      ? 'border-[color:var(--brand-border)] text-[color:var(--brand-primary)]'
                      : 'border-transparent text-text-secondary hover:text-text-primary',
                  )}
                  style={filterChipStyle(active)}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        )}

        {activeGroup === 'outros' && (
          <div className="flex flex-wrap items-center gap-1.5 py-0.5 pl-1">
            {OUTROS_CATEGORIES.map((sub) => {
              const active = selectedCategories.includes(sub.val);
              return (
                <button
                  key={sub.val}
                  type="button"
                  onClick={() => onToggleCategory(sub.val)}
                  className={cn(
                    'h-6 px-2.5 flex items-center justify-center rounded-md text-[9px] uppercase font-bold border shrink-0 transition-all cursor-pointer',
                    active
                      ? 'border-[color:var(--brand-border)] text-[color:var(--brand-primary)]'
                      : 'border-transparent text-text-secondary hover:text-text-primary',
                  )}
                  style={filterChipStyle(active)}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div
        className={cn(
          'mt-3 min-h-0 overflow-y-auto pr-1 pt-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-surface-3',
          variant === 'inline' ? 'h-[240px]' : 'flex-1',
        )}
      >
        {filteredFoods.length === 0 ? (
          <p className="py-6 text-center text-xs text-text-disabled">Nenhum alimento encontrado.</p>
        ) : (
          <div className="flex flex-col">
            {filteredFoods.map((food) => {
              const picked = pickedFoodIds.includes(food.id);
              return (
                <button
                  type="button"
                  key={food.id}
                  onClick={() => onTogglePicked(food.id)}
                  aria-pressed={picked}
                  className={cn(
                    'food-search-row flex w-full cursor-pointer items-center justify-between gap-2 px-1 text-left',
                    picked ? 'bg-brand/5' : 'hover:bg-surface-2/60',
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span
                      className={cn(
                        'flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px]',
                        picked ? 'bg-brand text-text-on-brand' : 'bg-transparent',
                      )}
                      style={
                        !picked
                          ? { border: '0.5px solid var(--border-default)' }
                          : undefined
                      }
                      aria-hidden
                    >
                      {picked && <Check size={8} weight="bold" />}
                    </span>
                    <p className="m-0 min-w-0 truncate text-[12px] leading-snug text-text-primary">
                      <span className="font-medium">{food.name}</span>
                      <span className="font-normal text-text-tertiary">
                        {' '}
                        · {food.category} · {food.calories_per_100g} kcal
                      </span>
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-normal tabular-nums lining-nums text-text-secondary">
                    P {food.protein_per_100g}g · C {food.carbs_per_100g}g
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-black/[0.04] pt-3 dark:border-white/[0.05]">
        {pickedFoodIds.length > 0 && (
          <p className="text-[10px] tabular-nums lining-nums text-text-tertiary">
            {pickedFoodIds.length}{' '}
            {pickedFoodIds.length === 1 ? 'alimento selecionado' : 'alimentos selecionados'}
          </p>
        )}
        <Button
          variant="primary"
          fullWidth
          disabled={pickedFoodIds.length === 0}
          onClick={onConfirm}
          className="h-10 cursor-pointer rounded-lg text-xs font-bold"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Adicionar
          {pickedFoodIds.length > 0 ? ` (${pickedFoodIds.length})` : ''}
        </Button>
      </div>
    </>
  );

  if (variant === 'inline') {
    return (
      <div
        className="flex flex-col gap-3 rounded-xl border border-brand/25 p-3"
        style={{ background: 'var(--card-macros-bg)', boxShadow: 'var(--elev-1)' }}
      >
        {body}
      </div>
    );
  }

  return (
    <Card className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 border-0 bg-surface-1 p-4 md:p-5">
      {body}
    </Card>
  );
}
