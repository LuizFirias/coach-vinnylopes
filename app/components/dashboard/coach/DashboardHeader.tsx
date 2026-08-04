'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  ChartBar,
  UserPlus,
  Barbell,
  AppleLogo,
} from '@phosphor-icons/react';
import DashboardTopActions from '@/app/components/DashboardTopActions';
import { withReturnUrl } from '@/lib/utils/adminNav';

interface DashboardHeaderProps {
  isMobile: boolean;
  userName?: string;
  coachStudentLimit: number | null;
  linkedStudentCount: number;
  coachAccountType: string;
  showNotificationBadge?: boolean;
  chatNaoLidas?: number;
}

const DASHBOARD = '/admin/dashboard';

const CREATE_ACTIONS = [
  {
    label: 'Novo aluno',
    href: withReturnUrl('/admin/alunos/novo', DASHBOARD),
    icon: UserPlus,
  },
  {
    label: 'Novo treino',
    href: withReturnUrl('/admin/treinos/nova-ficha', DASHBOARD),
    icon: Barbell,
  },
  {
    label: 'Nova dieta',
    href: withReturnUrl('/admin/nutricao/novo-plano', DASHBOARD),
    icon: AppleLogo,
  },
] as const;

function CreateMenu({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        style={{ touchAction: 'manipulation' }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Mais ações"
        aria-expanded={open}
        aria-haspopup="menu"
        className={
          compact
            ? 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-brand text-text-on-brand transition-opacity active:opacity-80 border-0 cursor-pointer'
            : 'inline-flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hover text-text-on-brand text-xs font-semibold rounded-lg transition-all active:scale-95 shadow-md shadow-brand/10 border-0 cursor-pointer'
        }
      >
        <Plus size={compact ? 16 : 13} weight="bold" />
        {!compact && 'Mais'}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[11.5rem] rounded-xl bg-surface-1 shadow-elev-3 overflow-hidden"
        >
          <div className="flex flex-col py-1">
            {CREATE_ACTIONS.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-left no-underline transition-colors hover:bg-surface-2 active:bg-surface-2"
              >
                <Icon size={18} weight="regular" className="shrink-0 text-brand" />
                <span className="text-[12px] font-medium text-text-primary">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardHeader({
  isMobile,
  userName,
  coachStudentLimit,
  linkedStudentCount,
  coachAccountType,
  showNotificationBadge,
  chatNaoLidas,
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
            chatNaoLidas={chatNaoLidas}
            notificationsHref="/admin/chat"
            notificationButtonId="btn-notificacoes-coach-dashboard"
          />
          <CreateMenu compact />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <CreateMenu />
          <Link
            href="/admin/relatorios"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-[rgba(117, 27, 180,0.12)] text-text-primary text-xs font-semibold transition-all hover:bg-[rgba(117, 27, 180,0.18)] active:scale-95"
          >
            <ChartBar size={13} /> Relatórios
          </Link>
        </div>
      )}
    </div>
  );
}
