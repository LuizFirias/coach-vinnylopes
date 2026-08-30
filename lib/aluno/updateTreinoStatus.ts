import { supabaseClient } from '@/lib/supabaseClient';

/**
 * Atualiza o status de conclusão de um dia de treino do aluno.
 * Persistido em `treinos_manuais` (mesmo fonte do WeekCalendar / check-in).
 */
export async function updateTreinoStatus(params: {
  alunoId: string;
  coachId: string | null;
  data: string; // YYYY-MM-DD
  novoStatus: 'done' | 'missed';
}): Promise<void> {
  const { alunoId, coachId, data, novoStatus } = params;

  if (novoStatus === 'done') {
    if (!coachId) {
      throw new Error('Não foi possível marcar o treino: coach não vinculado.');
    }

    const { data: existing } = await supabaseClient
      .from('treinos_manuais')
      .select('id')
      .eq('aluno_id', alunoId)
      .eq('data_treino', data)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabaseClient
        .from('treinos_manuais')
        .update({ concluido: true })
        .eq('id', existing.id);
      if (error) throw error;
      return;
    }

    const { error } = await supabaseClient.from('treinos_manuais').insert({
      aluno_id: alunoId,
      coach_id: coachId,
      tipo_treino: 'musculacao',
      data_treino: data,
      concluido: true,
      descricao: 'Check-in via calendário',
    });
    if (error) throw error;
    return;
  }

  // missed: se existir registro concluído, marca como não concluído
  const { error } = await supabaseClient
    .from('treinos_manuais')
    .update({ concluido: false })
    .eq('aluno_id', alunoId)
    .eq('data_treino', data)
    .eq('concluido', true);

  if (error) throw error;
}
