'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretRight, CaretDown, WarningCircle, Check, BowlFood } from '@phosphor-icons/react';
import { loadMealItemsLight } from '@/lib/nutrition/plans';
import { FoodItemRow } from '@/app/components/nutrition/FoodItemRow';

interface RefeicaoPendente {
  id: string;
  nome: string;
  horario: string;
}

interface NutritionCardProps {
  nome: string;
  refeicoesFeitasHoje: number;
  totalRefeicoes: number;
  proximaRefeicao?: { nome: string; horario: string } | null;
  /** Já passou do horário e ainda não foi marcada como feita — fica colapsado, com seta pra abrir. */
  refeicoesPendentes?: RefeicaoPendente[];
  /** Marca a refeição como feita direto daqui — some da lista assim que confirmado. */
  onMarcarRefeicao?: (mealId: string) => void;
  onVerPlano: () => void;
}

type MealItem = {
  id: string;
  quantity_grams?: number | string;
  portion_label?: string | null;
  food?: { name: string; portions?: Array<{ label: string; grams: number }> };
};

export function NutritionCard({
  nome,
  refeicoesFeitasHoje,
  totalRefeicoes,
  proximaRefeicao,
  refeicoesPendentes = [],
  onMarcarRefeicao,
  onVerPlano,
}: NutritionCardProps) {
  const [showPendentes, setShowPendentes] = useState(false);
  // Cache local por refeição — evita rebuscar ao fechar/reabrir a seção.
  const [itemsCache, setItemsCache] = useState<Record<string, MealItem[]>>({});
  const [loadingItems, setLoadingItems] = useState(false);
  const progress = totalRefeicoes > 0 ? (refeicoesFeitasHoje / totalRefeicoes) * 100 : 0;
  const allDone = totalRefeicoes > 0 && refeicoesFeitasHoje >= totalRefeicoes;

  const abrirPendentes = async () => {
    const next = !showPendentes;
    setShowPendentes(next);
    if (!next) return;

    // Já abre com os alimentos de todas — busca só as que ainda não tem em
    // cache, em paralelo (lista é pequena, não pesa) — sem clique extra por refeição.
    const faltando = refeicoesPendentes.filter((r) => !itemsCache[r.id]);
    if (faltando.length === 0) return;
    setLoadingItems(true);
    try {
      const results = await Promise.all(faltando.map((r) => loadMealItemsLight(r.id)));
      setItemsCache((prev) => {
        const next2 = { ...prev };
        faltando.forEach((r, i) => {
          next2[r.id] = results[i];
        });
        return next2;
      });
    } finally {
      setLoadingItems(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 24 }}
      className="dashboard-card rounded-2xl p-4"
      style={{ border: '1px solid var(--dash-card-border)' }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <BowlFood size={13} weight="fill" className="text-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
            Nutrição
          </span>
        </div>
        <button
          type="button"
          id="btn-ver-plano-nutricao"
          onClick={onVerPlano}
          className="flex items-center gap-0.5 text-xs font-medium text-blue-500"
        >
          Ver plano
          <CaretRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="text-sm font-semibold dashboard-text">{nome}</p>
      <p className="mt-0.5 text-xs dashboard-text-subtle">
        {refeicoesFeitasHoje}/{totalRefeicoes} refeições hoje
      </p>
      {allDone ? (
        <p className="mt-0.5 text-[11px] dashboard-text-subtle">Todas as refeições registradas hoje</p>
      ) : proximaRefeicao ? (
        <p className="mt-0.5 text-[11px] dashboard-text-subtle">
          Próxima: {proximaRefeicao.nome}
          {proximaRefeicao.horario ? ` · ${proximaRefeicao.horario}` : ''}
        </p>
      ) : null}

      <div className="dashboard-progress-track mt-3 h-1 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {refeicoesPendentes.length > 0 && (
        <div className="mt-3 border-t pt-2.5" style={{ borderColor: 'var(--dash-card-border)' }}>
          <button
            type="button"
            onClick={() => void abrirPendentes()}
            className="flex w-full items-center justify-between gap-2 touch-manipulation"
            aria-expanded={showPendentes}
          >
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-500">
              <WarningCircle size={13} weight="fill" />
              {refeicoesPendentes.length} refeição{refeicoesPendentes.length === 1 ? '' : 'ões'} sem marcar
            </span>
            <CaretDown
              size={12}
              weight="bold"
              className="dashboard-text-subtle transition-transform"
              style={{ transform: showPendentes ? 'rotate(180deg)' : undefined }}
            />
          </button>

          <AnimatePresence initial={false}>
            {showPendentes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <ul className="mt-2 flex flex-col gap-3">
                  {refeicoesPendentes.map((r) => {
                    const items = itemsCache[r.id];
                    return (
                      <li key={r.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold dashboard-text">{r.nome}</span>
                          <span className="shrink-0 text-[11px] dashboard-text-subtle">{r.horario}</span>
                        </div>

                        {loadingItems && !items ? (
                          <p className="py-2 text-[11px] dashboard-text-subtle">Carregando itens…</p>
                        ) : items && items.length > 0 ? (
                          <div className="pb-1">
                            {items.map((item) => (
                              <FoodItemRow
                                key={item.id}
                                name={item.food?.name ?? ''}
                                quantityGrams={item.quantity_grams}
                                portionLabel={item.portion_label}
                                portionGrams={
                                  item.portion_label && item.food?.portions
                                    ? item.food.portions.find((p) => p.label === item.portion_label)?.grams ?? null
                                    : null
                                }
                              />
                            ))}
                          </div>
                        ) : items ? (
                          <p className="py-2 text-[11px] dashboard-text-subtle">Sem itens cadastrados nessa refeição.</p>
                        ) : null}

                        {onMarcarRefeicao && (
                          <button
                            type="button"
                            onClick={() => onMarcarRefeicao(r.id)}
                            className="mt-1 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-white touch-manipulation"
                            style={{
                              background: 'linear-gradient(135deg, #c084fc 0%, #751BB4 55%, #7e22ce 100%)',
                              boxShadow: '0 3px 10px rgba(117, 27, 180,0.30)',
                              border: 'none',
                            }}
                          >
                            <Check size={14} weight="bold" />
                            Marcar como feita
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
