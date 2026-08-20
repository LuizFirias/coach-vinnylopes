'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { resolveCoachShareHandle } from '@/lib/utils/workoutShare';

/**
 * @ do Instagram do coach do aluno logado — usado nos cards de compartilhamento
 * (rodapé "AURONFIT · @coach"). Mesmo padrão de 2 queries (coach_alunos →
 * coach_public_profiles) já usado ao vivo em app/aluno/treinos/[id]/executar/page.tsx.
 */
export function useCoachShareHandle(userId: string | null): string {
  const [handle, setHandle] = useState('@auronfit');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const { data: coachData } = await supabaseClient
        .from('coach_alunos')
        .select('coach_id')
        .eq('aluno_id', userId)
        .maybeSingle();

      if (!coachData?.coach_id || cancelled) return;

      const { data: publicProfile } = await supabaseClient
        .from('coach_public_profiles')
        .select('handle, instagram')
        .eq('coach_id', coachData.coach_id)
        .maybeSingle();

      if (!cancelled) {
        setHandle(resolveCoachShareHandle(publicProfile?.handle, publicProfile?.instagram));
      }
    })().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return handle;
}
