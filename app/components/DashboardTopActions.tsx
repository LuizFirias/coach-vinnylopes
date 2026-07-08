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
};

export default function DashboardTopActions({
  showNotificationBadge = false,
  onNotificationsClick,
  notificationButtonId = 'btn-notificacoes-dashboard',
  className,
  variant = 'default',
}: DashboardTopActionsProps) {
  const isHero = variant === 'hero';

  return (
    <div className={cn('flex shrink-0 items-center gap-2 lg:hidden', className)}>
      <button
        id={notificationButtonId}
        type="button"
        onClick={onNotificationsClick}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-lg',
          isHero
            ? 'dashboard-hero-chip'
            : 'mobile-icon-btn border',
        )}
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4 currentColor" />
        {showNotificationBadge && (
          <span
            className={cn(
              'absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 bg-brand',
              isHero ? 'border-[#0f1f3d]' : 'mobile-badge-ring',
            )}
          />
        )}
      </button>
      <ThemeToggle variant={variant} />
    </div>
  );
}
