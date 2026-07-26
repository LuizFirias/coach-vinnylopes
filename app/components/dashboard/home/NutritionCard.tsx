'use client';

import { motion } from 'framer-motion';
import { CaretRight } from '@phosphor-icons/react';

interface NutritionCardProps {
  nome: string;
  refeicoesFeitasHoje: number;
  totalRefeicoes: number;
  proximaRefeicao?: { nome: string; horario: string } | null;
  onVerPlano: () => void;
}

export function NutritionCard({
  nome,
  refeicoesFeitasHoje,
  totalRefeicoes,
  proximaRefeicao,
  onVerPlano,
}: NutritionCardProps) {
  const progress = totalRefeicoes > 0 ? (refeicoesFeitasHoje / totalRefeicoes) * 100 : 0;
  const allDone = totalRefeicoes > 0 && refeicoesFeitasHoje >= totalRefeicoes;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 24 }}
      className="dashboard-card rounded-2xl border-0 p-4"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <motion.span
            className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"
            animate={{ scale: [1, 1.35, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
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
    </motion.div>
  );
}
