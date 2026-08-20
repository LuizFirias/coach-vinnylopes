'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Barbell, ClipboardText, Ruler } from '@phosphor-icons/react';
import { dashboardColors } from '@/lib/tokens/dashboardColors';

type TreinoStatus = 'pendente' | 'concluido' | 'off' | 'sem-plano';

const workoutCardBackground = {
  background:
    'linear-gradient(180deg, rgba(117, 27, 180, 0.14) 0%, rgba(117, 27, 180, 0.22) 100%), linear-gradient(180deg, var(--dash-hero-from) 0%, var(--dash-hero-to) 100%)',
};

interface WorkoutCardProps {
  status: TreinoStatus;
  nome?: string;
  fichaId?: string;
  qtdExercicios?: number;
  checkinPontos?: number | null;
  onAlterar?: () => void;
}

export function WorkoutCard({
  status,
  nome,
  fichaId,
  qtdExercicios = 0,
  checkinPontos,
  onAlterar,
}: WorkoutCardProps) {
  const treinoHref = fichaId ? `/aluno/treinos/${fichaId}/executar` : '/aluno/treinos';

  if (status === 'sem-plano') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 24 }}
        className="dashboard-card relative z-10 mx-4 -mt-6 rounded-[20px] border-0 p-6 text-center"
        style={workoutCardBackground}
      >
        <ClipboardText
          className="mx-auto mb-2 h-8 w-8"
          weight="regular"
          style={{ color: dashboardColors.accent }}
        />
        <p className="text-lg font-bold dashboard-text">Sem treino hoje</p>
        <p className="mt-1 text-sm dashboard-text-subtle">
          Aproveite para descansar e se alimentar bem.
        </p>
        <Link
          href="/aluno/treinos"
          className="mt-4 inline-block w-full rounded-xl border-[1.5px] py-3 text-sm font-semibold transition-colors hover:bg-blue-600/10"
          style={{ borderColor: dashboardColors.accent, color: dashboardColors.accent }}
        >
          Ver treinos disponíveis
        </Link>
      </motion.div>
    );
  }

  if (status === 'off') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 24 }}
        className="dashboard-card relative z-10 mx-4 -mt-6 rounded-[20px] border-0 p-5"
        style={workoutCardBackground}
      >
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--dash-hero-icon)' }}>
          Treino de hoje
        </p>
        <p className="mt-2 text-2xl font-extrabold tracking-tight dashboard-text">Dia de descanso</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--dash-hero-icon)' }}>Recuperação ativa</p>
        <Link
          href="/aluno/medidas"
          className="dashboard-card mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-0 text-sm font-medium dashboard-text-muted"
        >
          <Ruler className="h-4 w-4" />
          Registrar evolução
        </Link>
      </motion.div>
    );
  }

  const isConcluido = status === 'concluido';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 24 }}
      className="dashboard-card relative z-10 mx-4 -mt-6 rounded-[20px] border-0 p-5"
      style={workoutCardBackground}
    >
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--dash-hero-icon)' }}>
          Treino de hoje
        </p>
        {onAlterar && (
          <button
            type="button"
            onClick={onAlterar}
            className="text-[11px] font-semibold uppercase tracking-wide dashboard-text-subtle hover:opacity-80"
          >
            Alterar
          </button>
        )}
      </div>

      <p className="text-2xl font-extrabold uppercase tracking-tight dashboard-text">
        {nome || 'Rotina prescrita'}
      </p>
      <p className="mt-1 text-sm font-medium dashboard-text-muted">
        {isConcluido ? 'Treino concluído' : 'Pronto para treinar'}
      </p>
      <p className="mt-1 text-sm dashboard-text-subtle">
        {isConcluido
          ? `+${checkinPontos ?? 20} pts ganhos hoje`
          : qtdExercicios > 0
            ? `${qtdExercicios} exercícios`
            : 'Treino disponível'}
      </p>

      {isConcluido ? (
        <div className="mt-4 rounded-[10px] bg-emerald-500/10 py-3 text-center">
          <p className="text-sm font-semibold text-emerald-500">✓ Treino concluído hoje</p>
        </div>
      ) : (
        <Link
          href={treinoHref}
          prefetch={false}
          id="btn-iniciar-treino-dashboard"
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white transition-opacity active:opacity-90"
          style={{
            background: 'linear-gradient(90deg, #751BB4 0%, #7e22ce 100%)',
          }}
        >
          <Barbell className="h-4 w-4" weight="fill" />
          Iniciar treino →
        </Link>
      )}
    </motion.div>
  );
}
