'use client';

import { CaretRight, Crown, TrendUp } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

type StudentPlanCardProps = {
  planLabel: string;
  valorPlano?: number | null;
  dataInicio?: string | null;
  dataExpiracao?: string | null;
  isActive?: boolean;
  onManage?: () => void;
  className?: string;
};

export function StudentPlanCard({
  planLabel,
  valorPlano,
  dataInicio,
  dataExpiracao,
  isActive = true,
  onManage,
  className,
}: StudentPlanCardProps) {
  const badge = (planLabel || 'Plano').split(/\s+/)[0];
  const start = dataInicio ? new Date(dataInicio) : null;
  const end = dataExpiracao ? new Date(dataExpiracao) : null;
  const now = Date.now();

  let pct = 0;
  let diasRestantes: number | null = null;
  if (start && end && end.getTime() > start.getTime()) {
    const total = end.getTime() - start.getTime();
    const elapsed = Math.min(total, Math.max(0, now - start.getTime()));
    pct = Math.min(100, Math.round((elapsed / total) * 100));
    diasRestantes = Math.ceil((end.getTime() - now) / (1000 * 60 * 60 * 24));
  } else if (end) {
    diasRestantes = Math.ceil((end.getTime() - now) / (1000 * 60 * 60 * 24));
  }

  const diasLabel =
    diasRestantes == null
      ? 'Sem vencimento definido'
      : diasRestantes < 0
        ? `Expirado há ${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) === 1 ? '' : 's'}`
        : diasRestantes === 0
          ? 'Vence hoje'
          : `${diasRestantes} dia${diasRestantes === 1 ? '' : 's'} restante${diasRestantes === 1 ? '' : 's'}`;

  return (
    <button
      type="button"
      onClick={onManage}
      className={cn(
        'plan-usage-card w-full text-left rounded-xl overflow-hidden transition-opacity hover:opacity-95 border-0 cursor-pointer',
        isActive ? 'bg-surface-2' : 'bg-danger/5',
        className,
      )}
    >
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-subtle">
            <Crown size={11} weight="fill" className="text-brand" />
          </span>
          <span className="min-w-0 flex-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-text-tertiary truncate">
            Plano atual
          </span>
          <span className="shrink-0 rounded-full bg-brand-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand">
            {badge}
          </span>
        </div>

        <p className="text-[13px] font-semibold leading-none tabular-nums lining-nums text-text-primary">
          <span className={isActive ? 'text-brand font-bold' : 'text-danger font-bold'}>
            {valorPlano != null ? formatCurrency(valorPlano) : '—'}
          </span>
          <span className="text-text-secondary font-medium"> / ciclo</span>
        </p>

        <div className="mt-2 flex items-center gap-1.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-brand-subtle">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isActive ? 'bg-brand' : 'bg-danger',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[9px] font-medium tabular-nums text-text-tertiary shrink-0">
            {pct}%
          </span>
        </div>

        <p className="mt-1.5 text-[9px] leading-none text-text-tertiary">{diasLabel}</p>
      </div>

      <div className="flex items-center gap-1.5 bg-brand/5 px-4 py-2">
        <TrendUp size={11} className="text-brand shrink-0" weight="bold" />
        <span className="flex-1 text-[10px] font-semibold text-brand">Gerenciar plano</span>
        <CaretRight size={11} className="text-brand shrink-0" />
      </div>
    </button>
  );
}
