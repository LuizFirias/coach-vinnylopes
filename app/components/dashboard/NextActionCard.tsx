'use client';

import Link from 'next/link';
import { Barbell, Check, Moon, ArrowRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

interface NextActionCardProps {
  status: 'pendente' | 'concluido' | 'off' | 'sem-plano';
  treinoNome?: string;
  fichaId?: string;
  pontosGanhos?: number;
}

export function NextActionCard({
  status,
  treinoNome,
  fichaId,
  pontosGanhos,
}: NextActionCardProps) {
  if (status === 'sem-plano') {
    return (
      <div className="bg-surface-1 border border-dashed border-border-default rounded-2xl p-5 text-center">
        <Barbell className="w-6 h-6 text-text-disabled mx-auto mb-2" />
        <p className="text-sm font-semibold text-text-primary mb-1">Sem treino agendado hoje</p>
        <p className="text-xs text-text-tertiary">Configure sua agenda semanal abaixo</p>
      </div>
    );
  }

  if (status === 'off') {
    return (
      <div className="bg-surface-1 border border-border-subtle rounded-2xl p-5 shadow-elev-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-info-subtle border border-info/30 flex items-center justify-center text-info flex-shrink-0">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Dia de descanso</p>
            <p className="text-xs text-text-secondary">Recuperação ativa · sono e hidratação</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'concluido') {
    return (
      <div className="bg-success-subtle border border-success-border rounded-2xl p-5 shadow-elev-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-success flex items-center justify-center text-white flex-shrink-0">
          <Check className="w-5 h-5" weight="bold" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text-primary">Treino confirmado hoje</p>
            <p className="text-xs text-text-secondary">
              +{pontosGanhos ?? 20} pts contabilizados no ranking
            </p>
          </div>
        </div>
      </div>
    );
  }

  // status === 'pendente'
  return (
    <Link
      href={fichaId ? `/aluno/treinos/${fichaId}/executar` : '/aluno/treinos'}
      className={cn(
        'block bg-surface-2 border border-brand-border rounded-2xl p-5',
        'shadow-elev-2 hover:shadow-elev-3 hover:border-brand transition-all active:scale-[0.99]',
        'relative overflow-hidden group',
      )}
    >
      {/* Glow accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-subtle via-transparent to-transparent pointer-events-none" />

      <div className="relative flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center text-text-on-brand flex-shrink-0 shadow-glow-brand">
          <Barbell className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-caps text-brand mb-0.5">
            Treino de hoje
          </p>
          <p className="text-base font-bold text-text-primary truncate">
            {treinoNome ?? 'Iniciar treino'}
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-text-secondary group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
