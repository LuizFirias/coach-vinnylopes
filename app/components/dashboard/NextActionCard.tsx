'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Barbell, Check, Moon, Ruler, ArrowClockwise } from '@phosphor-icons/react';

interface NextActionCardProps {
  status: 'pendente' | 'concluido' | 'off' | 'sem-plano';
  treinoNome?: string;
  fichaId?: string;
  qtdExercicios?: number;
  pontosGanhos?: number;
}

export function NextActionCard({
  status,
  treinoNome,
  fichaId,
  qtdExercicios,
  pontosGanhos,
}: NextActionCardProps) {
  const router = useRouter();

  if (status === 'sem-plano') {
    return (
      <div className="bg-surface-1 border border-dashed border-card rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-surface-2 border border-card flex items-center justify-center text-text-disabled flex-shrink-0">
            <Barbell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-text-primary leading-tight">Nenhum treino ativo</p>
            <p className="text-[10px] text-text-tertiary leading-none mt-0.5">
              Aproveite para descansar e se alimentar bem.
            </p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1 px-2.5 h-7.5 bg-brand text-text-on-brand text-[10px] font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all shrink-0 cursor-pointer shadow-sm"
        >
          <ArrowClockwise className="w-3 h-3 animate-spin-hover" />
          Verificar Treinos
        </button>
      </div>
    );
  }

  if (status === 'off') {
    return (
      <div className="bg-surface-1 border border-card rounded-2xl p-5 shadow-elev-1 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-info-subtle border border-info/30 flex items-center justify-center text-info flex-shrink-0">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">Dia de recuperação</p>
            <p className="text-xs text-text-secondary">Recuperação ativa · foco no sono, alimentação e hidratação.</p>
          </div>
        </div>
        <div className="flex gap-2 border-t border-divider/50 pt-3">
          <Link
            href="/aluno/treinos"
            className="flex-1 h-9 bg-surface-2 border border-card text-[11px] font-semibold text-text-secondary hover:text-text-primary rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Barbell className="w-3.5 h-3.5" />
            Ver próximos treinos
          </Link>
          <Link
            href="/aluno/medidas"
            className="flex-1 h-9 bg-surface-2 border border-card text-[11px] font-semibold text-text-secondary hover:text-text-primary rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Ruler className="w-3.5 h-3.5" />
            Ver evolução
          </Link>
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
            <p className="text-sm font-bold text-text-primary">Treino concluído hoje</p>
            <p className="text-xs text-text-secondary">
              +{pontosGanhos ?? 20} pts contabilizados no ranking de consistência!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // status === 'pendente'
  return (
    <div className="bg-surface-1 border border-brand-border/40 rounded-2xl p-5 shadow-elev-2 relative overflow-hidden flex flex-col gap-4">
      {/* Glow accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-subtle/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-brand flex items-center justify-center text-text-on-brand flex-shrink-0 shadow-glow-brand">
          <Barbell className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xs font-bold uppercase tracking-widest text-brand mb-0.5">
            Treino de hoje
          </p>
          <p className="text-base font-bold text-text-primary truncate">
            {treinoNome ?? 'Rotina prescrita'}
          </p>
          {qtdExercicios !== undefined && (
            <p className="text-[11px] text-text-tertiary mt-0.5">
              {qtdExercicios} exercício{qtdExercicios !== 1 ? 's' : ''} programado{qtdExercicios !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-t border-divider/50 pt-3 relative">
        <Link
          href={fichaId ? `/aluno/treinos/${fichaId}/executar` : '/aluno/treinos'}
          prefetch={fichaId ? false : undefined}
          className="flex-1 h-10 bg-brand text-text-on-brand text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-glow-brand hover:opacity-90 active:scale-95 transition-all"
        >
          Iniciar treino
        </Link>
      </div>
    </div>
  );
}
