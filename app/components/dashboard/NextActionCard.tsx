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
        'block rounded-2xl p-5',
        'hover:opacity-95 transition-all active:scale-[0.99]',
        'relative overflow-hidden group',
      )}
      style={{ background: 'var(--gradient-gold)', boxShadow: 'var(--shadow-gold-glow)' }}
    >
      {/* Noise/depth overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 60%)' }} />

      <div className="relative flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-black/20 backdrop-blur-sm flex items-center justify-center shrink-0">
          <Barbell className="w-6 h-6 text-white" weight="fill" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-caps text-black/60 mb-0.5">
            Treino de hoje
          </p>
          <p className="text-lg font-bold text-black truncate leading-tight">
            {treinoNome ?? 'Iniciar treino'}
          </p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform">
          <ArrowRight className="w-4 h-4 text-black/70" weight="bold" />
        </div>
      </div>
    </Link>
  );
}
