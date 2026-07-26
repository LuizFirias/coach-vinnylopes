'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChartLineUp, CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import { formatDuration } from '@/lib/utils/format';

interface ActiveWorkout {
  fichaId: string;
  nomeRotina: string;
  timerStartAt: number;
}

export default function ActiveWorkoutBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState<ActiveWorkout | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const checkActive = useCallback(() => {
    try {
      const raw = localStorage.getItem('treino_ativo_pointer');
      if (!raw) { setActive(null); return; }

      const pointer = JSON.parse(raw) as { fichaId: string; userId: string; nomeRotina: string };
      if (!pointer.fichaId || !pointer.userId) { setActive(null); return; }

      const workoutKey = `treino_${pointer.userId}_${pointer.fichaId}`;
      const workoutRaw = localStorage.getItem(workoutKey);
      if (!workoutRaw) {
        localStorage.removeItem('treino_ativo_pointer');
        setActive(null);
        return;
      }

      const workout = JSON.parse(workoutRaw);
      if (!workout.timerStartAt || Date.now() - (workout.timestamp || 0) > 86400000) {
        localStorage.removeItem('treino_ativo_pointer');
        localStorage.removeItem(workoutKey);
        setActive(null);
        return;
      }

      setActive({
        fichaId: pointer.fichaId,
        nomeRotina: pointer.nomeRotina || 'Treino',
        timerStartAt: workout.timerStartAt,
      });
    } catch {
      setActive(null);
    }
  }, []);

  // Re-check whenever pathname changes (e.g. after leaving executar) or on visibility
  useEffect(() => { checkActive(); }, [checkActive, pathname]);

  useEffect(() => {
    const onFocus = () => checkActive();
    const onVisibility = () => { if (document.visibilityState === 'visible') checkActive(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [checkActive]);

  // Tick elapsed time
  useEffect(() => {
    if (!active) return;
    const tick = () => setElapsed(Math.floor((Date.now() - active.timerStartAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active?.timerStartAt]);

  // Ocultar na página de execução (o usuário já está lá) e em rotas não-aluno
  if (!active || pathname?.includes('/executar')) return null;

  return (
    <div className={cn(
      'fixed z-50 left-3 right-3 bottom-[4.75rem]',
      'lg:left-auto lg:right-6 lg:w-80 lg:bottom-6'
    )}>
      <button
        onClick={() => router.push(`/aluno/treinos/${active.fichaId}/executar`)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl active:scale-[0.98] transition-transform overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
      >
        {/* Animated glow */}
        <div className="absolute inset-0 bg-white/5 animate-pulse rounded-2xl pointer-events-none" />

        {/* Icon */}
        <div className="relative w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <ChartLineUp className="w-5 h-5 text-white" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-green-700 animate-pulse" />
        </div>

        {/* Text */}
        <div className="relative flex-1 min-w-0 text-left">
          <p className="text-[10px] font-semibold text-white/70 uppercase tracking-widest leading-none mb-0.5">
            Treino em andamento
          </p>
          <p className="text-sm font-bold uppercase tracking-wide text-white truncate leading-tight">{active.nomeRotina}</p>
        </div>

        {/* Time + arrow */}
        <div className="relative flex items-center gap-1.5 flex-shrink-0">
          <span className="text-sm font-mono font-bold text-white tabular-nums lining-nums">{formatDuration(elapsed)}</span>
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <CaretRight className="w-4 h-4 text-white" />
          </div>
        </div>
      </button>
    </div>
  );
}
