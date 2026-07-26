'use client';

import { motion } from 'framer-motion';
import { Flame, Lightning } from '@phosphor-icons/react';
import { dashboardColors } from '@/lib/tokens/dashboardColors';
import { useCountUp } from './useCountUp';

interface StreakRowProps {
  sequenciaDias: number;
  treinosSemana: number;
  metaSemana: number;
}

export function StreakRow({ sequenciaDias, treinosSemana, metaSemana }: StreakRowProps) {
  const animatedStreak = useCountUp(sequenciaDias);
  const weekProgress = metaSemana > 0 ? Math.min(treinosSemana / metaSemana, 1) : 0;
  const streakProgress = Math.min(sequenciaDias / 4, 1);
  const weekBarWidth = `${Math.max(weekProgress * 100, weekProgress === 0 ? 2 : 4)}%`;
  const streakBarWidth = `${Math.max(streakProgress * 100, streakProgress === 0 ? 2 : 4)}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 24 }}
      className="mx-4 grid grid-cols-2 gap-3"
    >
      <div
        className="dashboard-card rounded-2xl border-0 p-4"
        style={{ borderBottom: `2px solid ${dashboardColors.streak}` }}
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
        <div className="dashboard-progress-track mt-2.5 h-1 w-full overflow-hidden rounded-full">
          <motion.div
            className="h-full min-w-1 rounded-full"
            style={{ backgroundColor: dashboardColors.streak }}
            initial={{ width: '2%' }}
            animate={{ width: streakBarWidth }}
            transition={{ type: 'spring', stiffness: 90, damping: 20, delay: 0.15 }}
          />
        </div>
      </div>

      <div
        className="dashboard-card rounded-2xl border-0 p-4"
        style={{ borderBottom: `2px solid ${dashboardColors.accent}` }}
      >
        <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest dashboard-text-subtle">
          <Lightning className="h-3.5 w-3.5" weight="fill" style={{ color: dashboardColors.accentLight }} />
          Esta semana
        </p>
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
