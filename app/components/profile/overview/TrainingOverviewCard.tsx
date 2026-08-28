'use client';

import { useMemo } from 'react';
import { Barbell } from '@phosphor-icons/react';
import { OverviewPanel } from './OverviewPanel';

export interface SessaoRecente {
  key: string;
  dateLabel: string;
  sortKey: string;
  nomeRotina: string;
  exercicios: number;
}

interface TrainingOverviewCardProps {
  historicoTreinos: { data_conclusao?: string | null }[];
  sessoesRecentes: SessaoRecente[];
  fichasAtivasCount: number;
  onOpenTreinos: () => void;
}

function diasAtras(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return '1 dia atrás';
  return `${dias} dias atrás`;
}

export function TrainingOverviewCard({
  historicoTreinos,
  sessoesRecentes,
  fichasAtivasCount,
  onOpenTreinos,
}: TrainingOverviewCardProps) {
  const { last7, last30 } = useMemo(() => {
    const now = Date.now();
    const dias7 = new Set<string>();
    const dias30 = new Set<string>();
    for (const h of historicoTreinos) {
      if (!h.data_conclusao) continue;
      const diff = now - new Date(h.data_conclusao).getTime();
      const dayKey = h.data_conclusao.slice(0, 10);
      if (diff <= 7 * 86400000) dias7.add(dayKey);
      if (diff <= 30 * 86400000) dias30.add(dayKey);
    }
    return { last7: dias7.size, last30: dias30.size };
  }, [historicoTreinos]);

  const ultimaSessao = sessoesRecentes[0];

  return (
    <OverviewPanel
      title="Training"
      action={
        <button
          type="button"
          onClick={onOpenTreinos}
          className="text-[11px] font-semibold text-brand hover:text-brand-hover bg-transparent border-0"
        >
          Ver treinos
        </button>
      }
      bodyClassName="p-0"
    >
      <div className="grid grid-cols-3 divide-x divide-border-subtle">
        {[
          { label: 'Últimos 7 dias', value: last7 },
          { label: 'Últimos 30 dias', value: last30 },
          { label: 'Fichas ativas', value: fichasAtivasCount },
        ].map((stat) => (
          <div key={stat.label} className="px-3 py-4 text-center">
            <p className="text-2xl font-black text-text-primary tabular-nums lining-nums leading-none">
              {stat.value}
            </p>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary leading-tight">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-border-subtle px-4 py-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand shrink-0">
          <Barbell size={16} weight="bold" />
        </div>
        {ultimaSessao ? (
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
              Último treino
            </p>
            <p className="text-[13px] font-semibold text-text-primary truncate">
              {ultimaSessao.nomeRotina}
              <span className="ml-1.5 font-normal text-text-tertiary">
                · {diasAtras(ultimaSessao.sortKey)}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-[12px] text-text-tertiary">Nenhum treino concluído ainda.</p>
        )}
      </div>
    </OverviewPanel>
  );
}
