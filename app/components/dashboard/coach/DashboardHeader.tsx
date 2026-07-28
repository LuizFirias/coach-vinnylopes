'use client';

import Link from 'next/link';
import { Plus, ChartBar } from '@phosphor-icons/react';
import DashboardTopActions from '@/app/components/DashboardTopActions';

interface DashboardHeaderProps {
  isMobile: boolean;
  userName?: string;
  coachStudentLimit: number | null;
  linkedStudentCount: number;
  coachAccountType: string;
  showNotificationBadge?: boolean;
}

export function DashboardHeader({
  isMobile,
  userName,
  coachStudentLimit,
  linkedStudentCount,
  coachAccountType,
  showNotificationBadge,
}: DashboardHeaderProps) {
  const primeiroNome =
    (userName ?? '').trim().split(/\s+/).filter(Boolean)[0] || 'Coach';
  const subtitle =
    coachStudentLimit !== null
      ? `${linkedStudentCount}/${coachStudentLimit} alunos`
      : coachAccountType === 'parceiro'
        ? 'Alunos ilimitados'
        : null;

  return (
    <div className="flex items-center justify-between gap-3 mb-6 pt-3">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-text-primary font-display">
          Olá, <span className="text-brand">{primeiroNome}</span>
        </h1>
        {subtitle && (
          <p className="text-xs text-text-tertiary mt-0.5">{subtitle}</p>
        )}
      </div>

      {isMobile ? (
        <div className="flex items-center gap-2 shrink-0">
          <DashboardTopActions
            compact
            showNotificationBadge={showNotificationBadge}
            notificationButtonId="btn-notificacoes-coach-dashboard"
          />
          <Link
            href="/admin/alunos/novo"
            style={{ touchAction: 'manipulation' }}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-brand text-text-on-brand transition-opacity active:opacity-80"
            aria-label="Adicionar aluno"
          >
            <Plus size={16} weight="bold" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/alunos/novo"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hover text-text-on-brand text-xs font-semibold rounded-lg transition-all active:scale-95 shadow-md shadow-brand/10"
          >
            <Plus size={13} weight="bold" /> Adicionar aluno
          </Link>
          <Link
            href="/admin/treinos/nova-ficha"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-2 border-0 hover:bg-surface-3 text-text-primary text-xs font-semibold rounded-lg transition-all active:scale-95"
          >
            Criar treino
          </Link>
          <Link
            href="/admin/relatorios"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-2 border-0 hover:bg-surface-3 text-text-primary text-xs font-semibold rounded-lg transition-all active:scale-95"
          >
            <ChartBar size={13} /> Relatórios
          </Link>
        </div>
      )}
    </div>
  );
}
