'use client';

import { cn } from '@/lib/utils/cn';
import { haptic } from '@/lib/utils/haptics';
import type { RestTimerMeta } from '@/lib/hooks/useRestTimer';

interface RestTimerBarProps {
  remaining: number;
  total: number;
  meta?: RestTimerMeta;
  onAddSeconds: (seconds: number) => void;
  onSkip: () => void;
  className?: string;
}

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Barra fina de descanso — fica no rodapé, sem escurecer a tela por trás.
 * Some sozinha quando o tempo zera (ver useRestTimer).
 */
export function RestTimerBar({
  remaining,
  total,
  meta,
  onAddSeconds,
  onSkip,
  className,
}: RestTimerBarProps) {
  const progress = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;

  return (
    <div
      className={cn('fixed inset-x-0 bottom-0 z-[70] pointer-events-none', className)}
      role="status"
      aria-label="Timer de descanso"
    >
      <div
        className="pointer-events-auto mx-auto max-w-lg overflow-hidden rounded-t-2xl border-t border-border-subtle bg-surface-1 shadow-[0_-8px_28px_rgba(0,0,0,0.25)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="h-1 w-full bg-surface-2">
          <div
            className="h-full bg-brand transition-[width] duration-300 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="px-4 pb-3 pt-2.5">
          {(meta?.title || meta?.subtitle) && (
            <p className="mb-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
              {meta.title}
              {meta.subtitle ? ` · ${meta.subtitle}` : ''}
            </p>
          )}

          <p className="text-center font-sans text-4xl font-black leading-none tabular-nums lining-nums tracking-display text-text-primary">
            {formatMMSS(remaining)}
          </p>

          {meta?.subtitleHighlight && (
            <p className="mt-1 text-center text-[11px] font-medium text-success">
              {meta.subtitleHighlight}
            </p>
          )}

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddSeconds(-15)}
              className="h-10 flex-1 rounded-xl border border-card bg-surface-1 text-xs font-bold text-text-primary transition-colors [@media(hover:hover)]:hover:bg-[#1a1a1a]"
              style={{ touchAction: 'manipulation' }}
            >
              −15
            </button>
            <button
              type="button"
              onClick={() => onAddSeconds(15)}
              className="h-10 flex-1 rounded-xl border border-card bg-surface-1 text-xs font-bold text-text-primary transition-colors [@media(hover:hover)]:hover:bg-[#1a1a1a]"
              style={{ touchAction: 'manipulation' }}
            >
              +15
            </button>
            <button
              type="button"
              onClick={() => {
                haptic('light');
                onSkip();
              }}
              className="h-10 flex-[1.4] rounded-xl bg-brand text-xs font-bold text-text-on-brand shadow-sm shadow-brand/30 transition-opacity [@media(hover:hover)]:hover:opacity-90"
              style={{ touchAction: 'manipulation' }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
