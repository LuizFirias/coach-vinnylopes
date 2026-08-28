'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getHistoricoTreinosFull } from '@/lib/queries/historicoTreinosCache';
import { buildShareExerciseInputs, type ShareExerciseInput } from '@/lib/utils/workoutShare';
import { CompletionShareScreen } from '@/app/components/workout/share/CompletionShareScreen';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import type { ProfileWorkoutItem } from './ProfileWorkoutHistory';

interface PastWorkoutShareOverlayProps {
  workout: ProfileWorkoutItem;
  userId: string;
  coachUsername: string;
  onClose: () => void;
}

/**
 * Reabre o carrossel de cards de compartilhamento (CompletionShareScreen) pra um treino
 * já concluído, reconstruindo os dados a partir das linhas cruas de historico_treinos
 * daquela sessão em vez do estado ao vivo da execução.
 */
export function PastWorkoutShareOverlay({
  workout,
  userId,
  coachUsername,
  onClose,
}: PastWorkoutShareOverlayProps) {
  const [loading, setLoading] = useState(true);
  const [exercicios, setExercicios] = useState<ShareExerciseInput[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const historico = await getHistoricoTreinosFull(userId);
        const rows = historico.filter((h) => h.data_conclusao === workout.sessionKey);

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

        if (!cancelled) {
          setExercicios(buildShareExerciseInputs(rows, gruposPorExercicio));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, workout.sessionKey]);

  return (
    <div className="fixed inset-0 z-[60] bg-surface-0">
      {loading ? (
        <div className="flex min-h-screen items-center justify-center">
          <DumbbellLoader text="Preparando cards..." />
        </div>
      ) : (
        <CompletionShareScreen
          nomeRotina={workout.nome_rotina}
          duracao={workout.duracaoSegundos ?? 0}
          volume={workout.volumeTotal}
          sets={workout.totalSets}
          exercicios={exercicios}
          coachUsername={coachUsername}
          prsCount={0}
          prPrincipal={null}
          onClose={onClose}
        />
      )}
    </div>
  );
}
