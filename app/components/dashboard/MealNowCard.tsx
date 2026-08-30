'use client';

import Link from 'next/link';
import { ForkKnife, ArrowRight, Check } from '@phosphor-icons/react';

interface MealNowCardProps {
  refeicaoNome: string;
  refeicaoId: string;
  horario: string; // "HH:MM"
  consumida: boolean;
  onMarcar: () => void;
}

export function MealNowCard({
  refeicaoNome,
  refeicaoId,
  horario,
  consumida,
  onMarcar,
}: MealNowCardProps) {
  return (
    <div className="bg-surface-1 border border-card rounded-2xl p-4 shadow-elev-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ForkKnife className="w-3.5 h-3.5 text-success" />
          <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">
            Hora de comer
          </p>
        </div>
        <span className="text-2xs font-bold text-success px-2 py-0.5 bg-success-subtle border border-success-border rounded-full">
          AGORA
        </span>
      </div>

      <p className="text-lg font-bold text-text-primary mb-1">{refeicaoNome}</p>
      <p className="text-xs text-text-tertiary mb-4">Horário sugerido: {horario}</p>

      {consumida ? (
        <div className="flex items-center gap-2 px-4 h-10 bg-success-subtle border border-success-border rounded-xl text-success text-sm font-semibold">
          <Check className="w-4 h-4" weight="bold" />
          Refeição feita
        </div>
      ) : (
        <button
          onClick={onMarcar}
          className="w-full h-10 bg-success text-white rounded-xl text-sm font-semibold transition-transform active:scale-98 flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" weight="bold" />
          Marcar refeição
        </button>
      )}

      <Link
        href="/aluno/plano-alimentar"
        className="mt-3 flex items-center justify-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
      >
        Ver plano completo <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
