'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendUp, Clock } from '@phosphor-icons/react';

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, type: 'spring', stiffness: 260, damping: 24 }}
      className="grid grid-cols-2 gap-3"
    >
      <Link
        href="/aluno/medidas"
        id="btn-registrar-evolucao"
        className="dashboard-card flex flex-col items-center gap-1.5 rounded-[14px] border-0 py-4 transition-colors active:scale-[0.98]"
      >
        <TrendUp className="h-5 w-5 dashboard-text-muted" />
        <span className="text-center text-xs font-semibold dashboard-text-muted">
          Registrar evolução
        </span>
      </Link>

      <Link
        href="/aluno/treinos"
        id="btn-ver-historico"
        className="dashboard-card flex flex-col items-center gap-1.5 rounded-[14px] border-0 py-4 transition-colors active:scale-[0.98]"
      >
        <Clock className="h-5 w-5 dashboard-text-muted" />
        <span className="text-center text-xs font-semibold dashboard-text-muted">
          Ver histórico
        </span>
      </Link>
    </motion.div>
  );
}
