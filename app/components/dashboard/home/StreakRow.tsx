'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Info, Lightning } from '@phosphor-icons/react';
import { dashboardColors } from '@/lib/tokens/dashboardColors';
import { useCountUp } from './useCountUp';

interface StreakRowProps {
  sequenciaDias: number;
  treinosSemana: number;
  metaSemana: number;
}

export function StreakRow({ sequenciaDias, treinosSemana, metaSemana }: StreakRowProps) {
  const animatedStreak = useCountUp(sequenciaDias);
  // Sem meta programada, qualquer treino concluído já preenche a barra por completo.
  const weekProgress =
    metaSemana > 0 ? Math.min(treinosSemana / metaSemana, 1) : treinosSemana > 0 ? 1 : 0;
  const weekBarWidth = `${Math.max(weekProgress * 100, weekProgress === 0 ? 2 : 4)}%`;

  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!infoOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (infoRef.current?.contains(event.target as Node)) return;
      setInfoOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [infoOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 24 }}
      className="mx-4 grid grid-cols-2 gap-3"
    >
      <div
        className="dashboard-card rounded-2xl p-4"
        style={{
          border: '1px solid var(--dash-card-border)',
          borderBottom: `2px solid ${dashboardColors.streak}`,
        }}
      >
        <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest dashboard-text-subtle">
          <Flame className="h-3.5 w-3.5" weight="fill" style={{ color: dashboardColors.streak }} />
          Sequência
        </p>
        <p className="text-4xl font-extrabold leading-none tracking-display tabular-nums lining-nums dashboard-text">
          {animatedStreak}
        </p>
        <p className="mt-1 text-xs font-medium dashboard-text-subtle">
          {sequenciaDias === 1 ? 'semana' : 'semanas'}
        </p>
      </div>

      <div
        className="dashboard-card relative rounded-2xl p-4"
        style={{
          border: '1px solid var(--dash-card-border)',
          borderBottom: `2px solid ${dashboardColors.accent}`,
        }}
      >
        <div className="mb-1 flex items-center justify-between gap-1">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest dashboard-text-subtle">
            <Lightning className="h-3.5 w-3.5" weight="fill" style={{ color: dashboardColors.accentLight }} />
            Esta semana
          </p>
          {metaSemana === 0 && (
            <div ref={infoRef} className="relative">
              <button
                type="button"
                aria-label="Por que não há meta esta semana?"
                aria-expanded={infoOpen}
                onClick={() => setInfoOpen((open) => !open)}
                className="flex h-5 w-5 items-center justify-center rounded-full dashboard-text-subtle"
              >
                <Info size={13} weight="bold" />
              </button>
              {infoOpen && (
                <div
                  role="tooltip"
                  className="dashboard-card absolute right-0 top-6 z-20 w-[168px] rounded-lg border-0 p-2.5 shadow-elev-2"
                >
                  <p className="text-[10px] leading-relaxed dashboard-text-subtle">
                    {treinosSemana > 0
                      ? 'Nenhum treino foi programado nesta semana, mas os treinos concluídos continuam contando aqui.'
                      : 'Nenhum treino foi programado nesta semana no calendário.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-4xl font-extrabold leading-none tracking-display tabular-nums lining-nums dashboard-text">
          {treinosSemana}
          <span className="text-xl font-semibold tabular-nums lining-nums dashboard-text-subtle">/{metaSemana}</span>
        </p>
        <p className="mt-1 text-xs font-medium dashboard-text-subtle">treinos</p>
        <div className="dashboard-progress-track mt-2.5 h-1 w-full overflow-hidden rounded-full">
          <motion.div
            className="h-full min-w-1 rounded-full"
            style={{ backgroundColor: dashboardColors.accent }}
            initial={{ width: '2%' }}
            animate={{ width: weekBarWidth }}
            transition={{ type: 'spring', stiffness: 90, damping: 20, delay: 0.2 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
