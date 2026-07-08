'use client';

import { Bell } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import ThemeToggle from './ThemeToggle';

type DashboardTopActionsProps = {
  showNotificationBadge?: boolean;
  onNotificationsClick?: () => void;
  notificationButtonId?: string;
  className?: string;
};

export default function DashboardTopActions({
  showNotificationBadge = false,
  onNotificationsClick,
  notificationButtonId = 'btn-notificacoes-dashboard',
  className,
}: DashboardTopActionsProps) {
  return (
    <div className={cn('flex items-center gap-2 shrink-0 lg:hidden', className)}>
      <button
        id={notificationButtonId}
        type="button"
        onClick={onNotificationsClick}
        className="mobile-icon-btn w-9 h-9 rounded-lg border flex items-center justify-center relative"
        aria-label="Notificações"
      >
        <Bell className="w-4 h-4 text-text-secondary" />
        {showNotificationBadge && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 bg-brand mobile-badge-ring" />
        )}
      </button>
      <ThemeToggle />
    </div>
  );
}
