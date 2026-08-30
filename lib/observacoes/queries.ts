import { supabaseClient } from '@/lib/supabaseClient';

export type ObservacaoTipo = 'nota' | 'lesao';

export type AlunoObservacao = {
  id: string;
  aluno_id: string;
  coach_id: string;
  conteudo: string;
  criada_em: string;
  visualizada_em: string | null;
  finalizada_em: string | null;
  tipo: ObservacaoTipo;
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

export async function listObservacoesAluno(
  alunoId: string,
  tipo: ObservacaoTipo = 'nota',
): Promise<AlunoObservacao[]> {
  const { data, error } = await supabaseClient
    .from('aluno_observacoes')
    .select('id, aluno_id, coach_id, conteudo, criada_em, visualizada_em, finalizada_em, tipo')
    .eq('aluno_id', alunoId)
    .eq('tipo', tipo)
    .order('criada_em', { ascending: false });

  if (error) {
    if (isMissingRelation(error)) return [];
    console.error('[observacoes] list', error);
    return [];
  }
  return (data ?? []) as AlunoObservacao[];
}

export async function criarObservacao(
  alunoId: string,
  coachId: string,
  conteudo: string,
  tipo: ObservacaoTipo = 'nota',
): Promise<AlunoObservacao | null> {
  const texto = conteudo.trim();
  if (!texto) return null;

  const { data, error } = await supabaseClient
    .from('aluno_observacoes')
    .insert({
      aluno_id: alunoId,
      coach_id: coachId,
      conteudo: texto,
      tipo,
    })
    .select('id, aluno_id, coach_id, conteudo, criada_em, visualizada_em, finalizada_em, tipo')
    .single();

  if (error) {
    console.error('[observacoes] create', error);
    throw new Error(
      isMissingRelation(error)
        ? 'Tabela de observações não encontrada. Rode a migration 0062_aluno_observacoes.sql.'
        : error.message || 'Erro ao salvar observação',
    );
  }
  return data as AlunoObservacao;
}

export async function excluirObservacao(id: string): Promise<void> {
  const { error } = await supabaseClient.from('aluno_observacoes').delete().eq('id', id);
  if (error) {
    console.error('[observacoes] delete', error);
    throw new Error(error.message || 'Erro ao excluir observação');
  }
}

export async function marcarObservacaoVisualizada(id: string): Promise<void> {
  const { error } = await supabaseClient
    .from('aluno_observacoes')
    .update({ visualizada_em: new Date().toISOString() })
    .eq('id', id)
    .is('visualizada_em', null);

  if (error) {
    console.error('[observacoes] marcar visualizada', error);
  }
}

export async function finalizarObservacao(id: string): Promise<void> {
  const { error } = await supabaseClient
    .from('aluno_observacoes')
    .update({ finalizada_em: new Date().toISOString() })
    .eq('id', id)
    .is('finalizada_em', null);

  if (error) {
    console.error('[observacoes] finalizar', error);
    throw new Error(error.message || 'Erro ao concluir observação');
  }
}
