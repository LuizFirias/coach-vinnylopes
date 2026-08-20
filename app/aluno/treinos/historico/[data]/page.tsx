'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CaretLeft, ShareNetwork } from '@phosphor-icons/react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { getHistoricoTreinosFull } from '@/lib/queries/historicoTreinosCache';
import { formatDurationLong } from '@/lib/utils/format';
import { useCoachShareHandle } from '@/lib/hooks/useCoachShareHandle';
import { StudentAvatar } from '@/app/components/profile/StudentAvatar';
import { formatWorkoutDateFull, type ProfileWorkoutItem } from '@/app/components/profile/ProfileWorkoutHistory';
import { PastWorkoutShareOverlay } from '@/app/components/profile/PastWorkoutShareOverlay';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import SubscriptionGuard from '@/app/components/SubscriptionGuard';

interface SerieDetalhe {
  ordem: number;
  peso_atual: number;
  reps: number | string;
  completado: boolean;
}

interface ExercicioDetalhe {
  nome: string;
  grupo_muscular: string;
  series: SerieDetalhe[];
}

interface WorkoutDetalhe {
  nome_rotina: string;
  data_conclusao: string;
  duracaoSegundos: number | null;
  volumeTotal: number;
  totalSets: number;
  exercicios: ExercicioDetalhe[];
}

const BAR_COLOR = 'var(--brand-primary)';

export default function TreinoHistoricoDetalhePage() {
  const params = useParams();
  const sessionKey = decodeURIComponent((params?.data as string) || '');
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sexo, setSexo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<WorkoutDetalhe | null>(null);
  const [sharing, setSharing] = useState(false);

  const coachUsername = useCoachShareHandle(userId);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const session = await getSafeSession();
      const uid = session?.user?.id;
      if (!uid) {
        router.replace('/login');
        return;
      }
      if (cancelled) return;
      setUserId(uid);

      const [{ data: profile }, historico] = await Promise.all([
        supabaseClient
          .from('profiles')
          .select('full_name, avatar_url, sexo')
          .eq('id', uid)
          .maybeSingle(),
        getHistoricoTreinosFull(uid),
      ]);

      if (cancelled) return;
      setUserName(profile?.full_name || '');
      setAvatarUrl(profile?.avatar_url || null);
      setSexo(profile?.sexo || null);

      const rows = historico.filter((h) => h.data_conclusao === sessionKey);

      if (rows.length === 0) {
        setWorkout(null);
        setLoading(false);
        return;
      }

      const exercicioIds = [...new Set(rows.map((r) => r.exercicio_id).filter(Boolean))] as string[];
      let gruposPorExercicio = new Map<string, string>();
      if (exercicioIds.length > 0) {
        const { data: exData } = await supabaseClient
          .from('exercicios_biblioteca')
          .select('id, grupo_muscular')
          .in('id', exercicioIds);
        gruposPorExercicio = new Map(
          (exData ?? []).map((e: any) => [e.id as string, e.grupo_muscular as string]),
        );
      }

      const firstDs = (rows[0]?.dados_sessao ?? {}) as Record<string, any>;
      const duracaoSegundos =
        typeof firstDs.duracao_segundos === 'number'
          ? firstDs.duracao_segundos
          : typeof firstDs.duracao_segundos === 'string' && firstDs.duracao_segundos !== ''
            ? Number(firstDs.duracao_segundos)
            : null;

      let volumeTotal = 0;
      let totalSets = 0;
      const exercicios: ExercicioDetalhe[] = rows.map((row) => {
        const ds = (row.dados_sessao ?? {}) as Record<string, any>;
        const series: SerieDetalhe[] = (ds.series ?? []).map((s: any) => ({
          ordem: s.ordem ?? 0,
          peso_atual: Number(s.peso_atual) || 0,
          reps: s.reps ?? 0,
          completado: !!s.completado,
        }));
        series.forEach((s) => {
          if (!s.completado) return;
          totalSets += 1;
          volumeTotal += s.peso_atual * (Number(s.reps) || 0);
        });
        return {
          nome: ds.nome_exercicio || 'Exercício',
          grupo_muscular: (row.exercicio_id && gruposPorExercicio.get(row.exercicio_id)) || 'Outro',
          series,
        };
      });

      if (!cancelled) {
        setWorkout({
          nome_rotina: firstDs.nome_rotina || 'Treino',
          data_conclusao: sessionKey,
          duracaoSegundos,
          volumeTotal,
          totalSets,
          exercicios,
        });
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionKey, router]);

  const muscleSplit = useMemo(() => {
    if (!workout) return [];
    const map = new Map<string, number>();
    for (const ex of workout.exercicios) {
      const completas = ex.series.filter((s) => s.completado).length;
      if (completas === 0) continue;
      map.set(ex.grupo_muscular, (map.get(ex.grupo_muscular) ?? 0) + completas);
    }
    const total = [...map.values()].reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    return [...map.entries()]
      .map(([musculo, series]) => ({ musculo, pct: Math.round((series / total) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [workout]);

  const shareWorkoutItem: ProfileWorkoutItem | null = workout
    ? {
        sessionKey,
        data_conclusao: workout.data_conclusao,
        nome_rotina: workout.nome_rotina,
        totalSets: workout.totalSets,
        volumeTotal: workout.volumeTotal,
        duracaoSegundos: workout.duracaoSegundos,
        exercises: workout.exercicios.map((ex) => ({
          nome: ex.nome,
          sets: ex.series.length,
        })),
      }
    : null;

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-surface-0 px-4 pb-28 lg:px-8 lg:pl-28 lg:pb-12">
        <div className="mx-auto flex max-w-[640px] flex-col gap-4 lg:pt-10">
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Voltar"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary touch-manipulation"
            >
              <CaretLeft size={18} weight="bold" />
            </button>
            <h1 className="text-sm font-semibold text-text-primary">Detalhe do treino</h1>
            {shareWorkoutItem ? (
              <button
                type="button"
                onClick={() => setSharing(true)}
                aria-label="Compartilhar treino"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary touch-manipulation"
              >
                <ShareNetwork size={18} />
              </button>
            ) : (
              <div className="h-9 w-9" />
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <DumbbellLoader text="Carregando treino..." />
            </div>
          ) : !workout ? (
            <p className="py-16 text-center text-sm text-text-tertiary">
              Não foi possível encontrar esse treino.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <StudentAvatar name={userName} avatarUrl={avatarUrl} sexo={sexo} sizeClassName="w-9 h-9" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-text-secondary">{userName}</p>
                  <p className="text-[11px] text-text-tertiary">
                    {formatWorkoutDateFull(workout.data_conclusao)}
                  </p>
                </div>
              </div>

              <p className="text-lg font-bold uppercase tracking-wide text-text-primary">
                {workout.nome_rotina}
              </p>

              <div className="flex items-center gap-8">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                    Time
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums lining-nums text-text-primary">
                    {formatDurationLong(workout.duracaoSegundos)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                    Volume
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums lining-nums text-text-primary">
                    {workout.volumeTotal.toLocaleString('pt-BR')} kg
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                    Sets
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums lining-nums text-text-primary">
                    {workout.totalSets}
                  </p>
                </div>
              </div>

              <div className="border-t border-surface-2" />

              {muscleSplit.length > 0 && (
                <>
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                      Muscle Split
                    </p>
                    <div className="flex flex-col gap-3">
                      {muscleSplit.map((m) => (
                        <div key={m.musculo}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm text-text-primary">{m.musculo}</span>
                            <span className="text-xs font-semibold tabular-nums lining-nums text-text-secondary">
                              {m.pct}%
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${m.pct}%`, background: BAR_COLOR }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-surface-2" />
                </>
              )}

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Workout
                </p>
                <div className="flex flex-col gap-4">
                  {workout.exercicios.map((ex, i) => (
                    <div key={`${ex.nome}-${i}`}>
                      <p className="mb-1.5 text-sm font-semibold text-text-primary">{ex.nome}</p>
                      <div className="flex items-center justify-between px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                        <span>Set</span>
                        <span>Weight &amp; Reps</span>
                      </div>
                      <div className="flex flex-col">
                        {ex.series.map((s) => (
                          <div
                            key={s.ordem}
                            className="flex items-center justify-between rounded-lg px-1 py-1.5 text-sm text-text-primary odd:bg-surface-1"
                          >
                            <span className="tabular-nums lining-nums text-text-tertiary">
                              {s.ordem}
                            </span>
                            <span className="tabular-nums lining-nums">
                              {s.peso_atual > 0 ? `${s.peso_atual} kg × ${s.reps}` : `${s.reps} reps`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {sharing && shareWorkoutItem && userId && (
        <PastWorkoutShareOverlay
          workout={shareWorkoutItem}
          userId={userId}
          coachUsername={coachUsername}
          onClose={() => setSharing(false)}
        />
      )}
    </SubscriptionGuard>
  );
}
