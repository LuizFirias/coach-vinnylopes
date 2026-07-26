'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, SkipForward, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { haptic } from '@/lib/utils/haptics';
import { formatDuration } from '@/lib/utils/format';

interface RestTimerProps {
  durationSeconds: number;
  onComplete: () => void;
  onSkip: () => void;
  nextSetInfo?: string;
}

export function RestTimer({ durationSeconds, onComplete, onSkip, nextSetInfo }: RestTimerProps) {
  const endAtRef = useRef<number>(Date.now() + durationSeconds * 1000);
  const [remaining, setRemaining] = useState(durationSeconds);
  const [expired, setExpired] = useState(false);

  const tick = useCallback(() => {
    const r = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
    setRemaining(r);
    if (r <= 0 && !expired) {
      setExpired(true);
      haptic('success');
    }
  }, [expired]);

  useEffect(() => {
    tick();
    const id = setInterval(tick, 250);

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, [tick]);

  function add(secs: number) {
    haptic('light');
    endAtRef.current += secs * 1000;
    setExpired(false);
    tick();
  }

  const progress = expired ? 100 : ((durationSeconds - remaining) / durationSeconds) * 100;

  if (expired) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-8">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor"
              className="text-surface-2" strokeWidth="6" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor"
              className="text-brand" strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 46}`}
              strokeDashoffset="0"
              strokeLinecap="round" />
          </svg>
          <div className="text-center">
            <p className="font-mono tabular-nums lining-nums font-semibold text-5xl text-brand tracking-tight">
              0:00
            </p>
            <p className="text-xs text-text-tertiary mt-1">pronto!</p>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          rightIcon={<ChevronRight className="w-5 h-5" />}
          onClick={() => { haptic('medium'); onComplete(); }}
          className="w-full max-w-xs"
        >
          {nextSetInfo ? `Iniciar ${nextSetInfo}` : 'Próxima série'}
        </Button>

        <Button variant="ghost" size="sm" onClick={() => add(30)}>
          + 30s
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8">
      <p className="text-sm text-text-secondary">Descansando…</p>

      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
          <circle
            cx="50" cy="50" r="46" fill="none" stroke="currentColor"
            className="text-surface-2" strokeWidth="6"
          />
          <circle
            cx="50" cy="50" r="46" fill="none" stroke="currentColor"
            className="text-brand transition-[stroke-dashoffset] duration-[250ms] ease-linear"
            strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 46}`}
            strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress / 100)}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center">
          <p className="font-mono tabular-nums lining-nums font-semibold text-5xl text-text-primary tracking-tight">
            {formatDuration(remaining)}
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            de {formatDuration(durationSeconds)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => add(15)}>
          15s
        </Button>
        <Button
          variant="ghost" size="sm"
          leftIcon={<SkipForward className="w-4 h-4" />}
          onClick={() => { haptic('medium'); onSkip(); }}
        >
          Pular
        </Button>
        <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => add(30)}>
          30s
        </Button>
      </div>

      {nextSetInfo && (
        <div className="text-center mt-4">
          <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-1">
            Próxima série
          </p>
          <p className="text-sm text-text-primary">{nextSetInfo}</p>
        </div>
      )}
    </div>
  );
}
