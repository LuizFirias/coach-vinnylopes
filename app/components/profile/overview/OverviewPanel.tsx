'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface OverviewPanelProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Casca padrão dos cards da Visão Geral (estilo Everfit): cabeçalho em faixa
 * cinza + corpo. Sombra externa mínima, de propósito (não é o padrão de
 * shadow-elev do resto do app).
 */
export function OverviewPanel({ title, action, children, className, bodyClassName }: OverviewPanelProps) {
  return (
    <div className={cn('rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-surface-2/50 border-b border-border-subtle">
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">{title}</p>
        {action}
      </div>
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </div>
  );
}
