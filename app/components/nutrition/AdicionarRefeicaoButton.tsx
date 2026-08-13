'use client';

import { useState } from 'react';
import { Plus, X } from '@phosphor-icons/react';
import type { NutritionMealType } from '@/lib/nutrition/types';

const REFEICOES_OPCOES: { type: NutritionMealType; label: string }[] = [
  { type: 'cafe_da_manha', label: 'Café da manhã' },
  { type: 'lanche_manha', label: 'Lanche da manhã' },
  { type: 'almoco', label: 'Almoço' },
  { type: 'pre_treino', label: 'Pré-treino' },
  { type: 'pos_treino', label: 'Pós-treino' },
  { type: 'lanche_tarde', label: 'Lanche da tarde' },
  { type: 'jantar', label: 'Jantar' },
  { type: 'ceia', label: 'Ceia' },
  { type: 'refeicao_livre', label: 'Refeição livre' },
];

export function AdicionarRefeicaoButton({
  onAdicionar,
}: {
  onAdicionar: (type: NutritionMealType) => void;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand/40 bg-brand/5 text-[12px] font-semibold text-brand transition-colors duration-150 hover:bg-brand/10"
        style={{ color: 'var(--brand-primary)', borderColor: 'color-mix(in srgb, var(--brand-primary) 40%, transparent)' }}
      >
        {aberto ? (
          <>
            <X size={14} weight="bold" /> Fechar
          </>
        ) : (
          <>
            <Plus size={14} weight="bold" /> Adicionar refeição
          </>
        )}
      </button>

      {aberto && (
        <div
          className="grid grid-cols-2 gap-2 rounded-xl border border-border-subtle bg-surface-1 p-3 sm:grid-cols-3"
          style={{ animation: 'fadeIn 150ms ease-out' }}
        >
          {REFEICOES_OPCOES.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onAdicionar(type);
                setAberto(false);
              }}
              className="h-9 rounded-lg border border-brand/20 bg-surface-2 text-[11px] font-semibold transition-colors duration-150 hover:border-brand/40 hover:bg-brand/10"
              style={{ color: 'var(--brand-primary)' }}
            >
              + {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
