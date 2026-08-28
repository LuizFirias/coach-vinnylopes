'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from '@/lib/utils/haptics';

export interface RestTimerMeta {
  title?: string;
  subtitle?: string;
  subtitleHighlight?: string;
}

/**
 * Timer de descanso entre séries — compartilhado entre a tela de execução em
 * cards e a visualização em ficha. Baseado em timestamp (não setInterval puro),
 * então sobrevive a troca de aba/app em segundo plano. Some sozinho ao zerar.
 */
export function useRestTimer() {
  const [active, setActive] = useState(false);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [duration, setDuration] = useState(90);
  const [meta, setMeta] = useState<RestTimerMeta>({});
  const pendingCb = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    setActive(false);
    setEndAt(null);
    const cb = pendingCb.current;
    pendingCb.current = null;
    return cb;
  }, []);

  const start = useCallback(
    (durationSecs: number, onDone?: () => void, m?: RestTimerMeta) => {
      setMeta(m || {});
      pendingCb.current = onDone || null;
      setDuration(durationSecs);
      setEndAt(Date.now() + durationSecs * 1000);
      setRemaining(durationSecs);
      setActive(true);
    },
    [],
  );

  const addSeconds = useCallback((secs: number) => {
    haptic('light');
    setEndAt((prev) => (prev || Date.now()) + secs * 1000);
  }, []);

  const skip = useCallback(() => {
    haptic('light');
    const cb = stop();
    cb?.();
  }, [stop]);

  /** Encerra o timer sem disparar o callback pendente (ex.: ao descartar o treino). */
  const reset = useCallback(() => {
    stop();
  }, [stop]);

  // Contagem regressiva + desaparece sozinho ~0.6s depois de chegar em 0:00
  useEffect(() => {
    if (!active || !endAt) return;
    let finishTimeout: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      const r = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0 && finishTimeout === null) {
        haptic('success');
        finishTimeout = setTimeout(() => {
          const cb = stop();
          cb?.();
        }, 600);
      }
    };

    tick();
    const id = setInterval(tick, 250);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);

    return () => {
      clearInterval(id);
      if (finishTimeout) clearTimeout(finishTimeout);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, [active, endAt, stop]);

  return { active, remaining, duration, meta, start, addSeconds, skip, reset };
}
