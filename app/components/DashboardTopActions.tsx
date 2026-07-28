'use client';

import { Bell } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import ThemeToggle from './ThemeToggle';

type DashboardTopActionsProps = {
  showNotificationBadge?: boolean;
  onNotificationsClick?: () => void;
  notificationButtonId?: string;
  className?: string;
  variant?: 'default' | 'hero';
  /** Compacto: botões w-8 h-8 e ícones 16 (header do coach). */
  compact?: boolean;
};

export default function DashboardTopActions({
  showNotificationBadge = false,
  onNotificationsClick,
  notificationButtonId = 'btn-notificacoes-dashboard',
  className,
  variant = 'default',
  compact = false,
}: DashboardTopActionsProps) {
  const isHero = variant === 'hero';
  const btnSize = compact ? 'h-8 w-8 rounded-[10px]' : 'h-9 w-9 rounded-lg';
  const iconSize = compact ? 16 : 18;

  return (
    <div className={cn('flex shrink-0 items-center gap-2 lg:hidden', className)}>
      <button
        id={notificationButtonId}
        type="button"
        onClick={onNotificationsClick}
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
        aria-label="Notificações"
      >
        <Bell size={iconSize} className="currentColor" />
        {showNotificationBadge && (
          <span
            className={cn(
              'absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 bg-brand',
              isHero ? 'border-[#0f1f3d]' : compact ? 'border-surface-0' : 'mobile-badge-ring',
            )}
          />
        )}
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
