'use client';

import { motion } from 'framer-motion';
import { Drop, Minus, Plus } from '@phosphor-icons/react';
import { dashboardColors } from '@/lib/tokens/dashboardColors';

interface HydrationCardProps {
  copos: number;
  mlPorCopo: number;
  metaCopos: number;
  saving: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

export function HydrationCard({
  copos,
  mlPorCopo,
  metaCopos,
  saving,
  onAdd,
  onRemove,
}: HydrationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 24 }}
      className="dashboard-card flex items-center justify-between rounded-2xl border-0 p-4"
    >
      <div className="flex items-center gap-2">
        <Drop className="h-4 w-4" weight="fill" style={{ color: '#4880D8' }} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#4880D8' }}>
            Hidratação
          </p>
          <p className="mt-0.5 text-xs font-bold dashboard-text tabular-nums lining-nums">
            {copos * mlPorCopo}ml / {metaCopos * mlPorCopo}ml
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          id="btn-dashboard-remover-copo"
          onClick={onRemove}
          disabled={saving || copos === 0}
          className="dashboard-card flex h-8 w-8 items-center justify-center rounded-lg border-0 disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5 dashboard-text-muted" />
        </button>
        <span className="min-w-[20px] text-center font-mono text-sm font-bold tabular-nums lining-nums dashboard-text">
          {copos}
        </span>
        <button
          type="button"
          id="btn-dashboard-adicionar-copo"
          onClick={onAdd}
          disabled={saving || copos >= metaCopos}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white disabled:opacity-30"
          style={{ background: `linear-gradient(135deg, ${dashboardColors.accentLight} 0%, ${dashboardColors.accent} 100%)` }}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
