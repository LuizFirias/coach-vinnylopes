import { supabaseClient } from '@/lib/supabaseClient';

export type NotificacaoTipo = 'checkin_reminder' | 'photos_reminder' | 'treino_iniciado';

export type Notificacao = {
  id: string;
  destinatario_id: string;
  remetente_id: string | null;
  tipo: NotificacaoTipo;
  titulo: string;
  corpo: string;
  link: string | null;
  metadata: Record<string, unknown>;
  lida_em: string | null;
  criada_em: string;
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

export async function listNotificacoes(limit = 30): Promise<Notificacao[]> {
  const { data, error } = await supabaseClient
    .from('notificacoes')
    .select(
      'id, destinatario_id, remetente_id, tipo, titulo, corpo, link, metadata, lida_em, criada_em',
    )
    .order('criada_em', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelation(error)) return [];
    console.error('[notificacoes] list', error);
    return [];
  }
  return (data ?? []) as Notificacao[];
}

export async function countNotificacoesNaoLidas(): Promise<number> {
  const { count, error } = await supabaseClient
    .from('notificacoes')
    .select('id', { count: 'exact', head: true })
    .is('lida_em', null);

  if (error) {
    if (isMissingRelation(error)) return 0;
    console.error('[notificacoes] count', error);
    return 0;
  }
  return count ?? 0;
}

export async function marcarNotificacaoLida(id: string): Promise<void> {
  const { error } = await supabaseClient
    .from('notificacoes')
    .update({ lida_em: new Date().toISOString() })
    .eq('id', id)
    .is('lida_em', null);

  if (error && !isMissingRelation(error)) {
    console.error('[notificacoes] marcar lida', error);
  }
}

export async function marcarTodasNotificacoesLidas(): Promise<void> {
  const { error } = await supabaseClient
    .from('notificacoes')
    .update({ lida_em: new Date().toISOString() })
    .is('lida_em', null);

  if (error && !isMissingRelation(error)) {
    console.error('[notificacoes] marcar todas', error);
  }
}

/** Conversas do aluno com mensagens não lidas (para o painel do sino). */
export async function listChatNaoLidasAluno(alunoId: string): Promise<
  Array<{
    conversaId: string;
    ultimaMsg: string | null;
    ultimaMsgEm: string | null;
    naoLidas: number;
    coachNome: string | null;
  }>
> {
  const { data, error } = await supabaseClient
    .from('chat_conversas')
    .select('id, ultima_msg, ultima_msg_em, nao_lidas_aluno, coach_id')
    .eq('aluno_id', alunoId)
    .gt('nao_lidas_aluno', 0)
    .order('ultima_msg_em', { ascending: false });

  if (error || !data?.length) return [];

  const coachIds = [...new Set(data.map((r) => r.coach_id as string))];
  const { data: profiles } = await supabaseClient
    .from('profiles')
    .select('id, full_name')
    .in('id', coachIds);

  const names = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string | null]));

  return data.map((row) => ({
    conversaId: row.id as string,
    ultimaMsg: (row.ultima_msg as string | null) ?? null,
    ultimaMsgEm: (row.ultima_msg_em as string | null) ?? null,
    naoLidas: Number(row.nao_lidas_aluno) || 0,
    coachNome: names.get(row.coach_id as string) ?? null,
  }));
}
