'use client';

import { Moon, Sun } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import { useTheme } from './ThemeProvider';

type ThemeToggleProps = {
  variant?: 'default' | 'hero';
  className?: string;
  /** Tamanho do ícone no variant hero (default 18). */
  iconSize?: number;
};

export default function ThemeToggle({
  variant = 'default',
  className,
  iconSize = 18,
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (variant === 'hero') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
        onClick={toggleTheme}
        className={cn(
          'dashboard-hero-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-opacity active:opacity-80',
          className,
        )}
      >
        {isDark ? (
          <Moon size={iconSize} weight="regular" className="currentColor" />
        ) : (
          <Sun size={iconSize} weight="fill" className="text-amber-500" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      onClick={toggleTheme}
      className={cn(
        'relative flex h-8 w-14 items-center rounded-full border p-0.5 transition-colors',
        'border-card bg-surface-2 hover:bg-surface-3',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute flex h-6 w-6 items-center justify-center rounded-full bg-surface-0 shadow-elev-1 transition-transform duration-200',
          isDark ? 'translate-x-0' : 'translate-x-6',
        )}
      >
        {isDark ? (
          <Moon size={14} weight="fill" className="text-text-secondary" />
        ) : (
          <Sun size={14} weight="fill" className="text-warning" />
        )}
      </span>
      <span className="flex w-full items-center justify-between px-1.5">
        <Moon size={12} className={cn('text-text-tertiary', isDark && 'opacity-0')} />
        <Sun size={12} className={cn('text-text-tertiary', !isDark && 'opacity-0')} />
      </span>
    </button>
  );
}
