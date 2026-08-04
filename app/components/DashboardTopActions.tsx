'use client';

import { Bell } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import ThemeToggle from './ThemeToggle';

type DashboardTopActionsProps = {
  showNotificationBadge?: boolean;
  /** Total de mensagens não lidas — tem prioridade no badge numérico */
  chatNaoLidas?: number;
  onNotificationsClick?: () => void;
  /** Rota padrão do sino quando não há onClick (aluno/coach) */
  notificationsHref?: string;
  notificationButtonId?: string;
  className?: string;
  variant?: 'default' | 'hero';
  /** Compacto: botões w-8 h-8 e ícones 16 (header do coach). */
  compact?: boolean;
};

export default function DashboardTopActions({
  showNotificationBadge = false,
  chatNaoLidas = 0,
  onNotificationsClick,
  notificationsHref,
  notificationButtonId = 'btn-notificacoes-dashboard',
  className,
  variant = 'default',
  compact = false,
}: DashboardTopActionsProps) {
  const router = useRouter();
  const isHero = variant === 'hero';
  const btnSize = compact ? 'h-8 w-8 rounded-[10px]' : 'h-9 w-9 rounded-lg';
  const iconSize = compact ? 16 : 18;
  const hasCount = chatNaoLidas > 0;
  const showDot = !hasCount && showNotificationBadge;

  const handleClick = () => {
    if (onNotificationsClick) {
      onNotificationsClick();
      return;
    }
    if (notificationsHref) router.push(notificationsHref);
  };

  return (
    <div className={cn('flex shrink-0 items-center gap-2 lg:hidden', className)}>
      <button
        id={notificationButtonId}
        type="button"
        onClick={handleClick}
        style={{ touchAction: 'manipulation' }}
        className={cn(
          'relative flex items-center justify-center',
          btnSize,
          isHero
            ? 'dashboard-hero-chip'
            : compact
              ? 'bg-transparent text-text-tertiary hover:text-text-primary transition-colors'
              : 'mobile-icon-btn border',
        )}
        aria-label={hasCount ? `Notificações, ${chatNaoLidas} não lidas` : 'Notificações'}
      >
        <Bell size={iconSize} className="currentColor" />
        {hasCount ? (
          <span
            className={cn(
              'absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 bg-brand px-[3px] text-[9px] font-bold text-white',
              isHero ? 'border-[#0f1f3d]' : compact ? 'border-surface-0' : 'mobile-badge-ring',
            )}
          >
            {chatNaoLidas > 99 ? '99+' : chatNaoLidas}
          </span>
        ) : showDot ? (
          <span
            className={cn(
              'absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 bg-brand',
              isHero ? 'border-[#0f1f3d]' : compact ? 'border-surface-0' : 'mobile-badge-ring',
            )}
          />
        ) : null}
      </button>
      <ThemeToggle
        variant={isHero || compact ? 'hero' : 'default'}
        iconSize={iconSize}
        className={cn(
          compact &&
            'h-8 w-8 rounded-[10px] bg-transparent text-text-tertiary hover:text-text-primary',
        )}
      />
    </div>
  );
}
