import { supabaseClient } from '@/lib/supabaseClient';

export type AlunoObjetivo = {
  id: string;
  aluno_id: string;
  coach_id: string;
  titulo: string;
  descricao: string | null;
  data_alvo: string | null;
  criado_em: string;
  atualizado_em: string;
};

function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    Boolean(error.message?.includes('does not exist')) ||
    Boolean(error.message?.includes('Could not find the table'))
  );
}

const SELECT_FIELDS = 'id, aluno_id, coach_id, titulo, descricao, data_alvo, criado_em, atualizado_em';

/** Objetivo mais recente do aluno — o card mostra só um por vez, igual ao Everfit. */
export async function fetchObjetivoAtual(alunoId: string): Promise<AlunoObjetivo | null> {
  const { data, error } = await supabaseClient
    .from('aluno_objetivos')
    .select(SELECT_FIELDS)
    .eq('aluno_id', alunoId)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) return null;
    console.error('[objetivos] fetch', error);
    return null;
  }
  return data as AlunoObjetivo | null;
}

export async function salvarObjetivo(params: {
  id?: string;
  alunoId: string;
  coachId: string;
  titulo: string;
  descricao?: string | null;
  dataAlvo?: string | null;
}): Promise<AlunoObjetivo | null> {
  const titulo = params.titulo.trim();
  if (!titulo) return null;

  const payload = {
    aluno_id: params.alunoId,
    coach_id: params.coachId,
    titulo,
    descricao: params.descricao?.trim() || null,
    data_alvo: params.dataAlvo || null,
    atualizado_em: new Date().toISOString(),
  };

  const query = params.id
    ? supabaseClient.from('aluno_objetivos').update(payload).eq('id', params.id)
    : supabaseClient.from('aluno_objetivos').insert(payload);

  const { data, error } = await query.select(SELECT_FIELDS).single();

  if (error) {
    console.error('[objetivos] salvar', error);
    throw new Error(
      isMissingRelation(error)
        ? 'Tabela de objetivos não encontrada. Rode a migration 0080_perfil_aluno_everfit.sql.'
        : error.message || 'Erro ao salvar objetivo',
    );
  }
  return data as AlunoObjetivo;
}

export async function excluirObjetivo(id: string): Promise<void> {
  const { error } = await supabaseClient.from('aluno_objetivos').delete().eq('id', id);
  if (error) {
    console.error('[objetivos] excluir', error);
    throw new Error(error.message || 'Erro ao excluir objetivo');
  }
}
