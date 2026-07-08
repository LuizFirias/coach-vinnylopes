'use client';

import { Moon, Sun } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      onClick={toggleTheme}
      className={cn(
        'relative flex h-8 w-14 items-center rounded-full border p-0.5 transition-colors',
        'border-border-subtle bg-surface-2 hover:bg-surface-3',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
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
