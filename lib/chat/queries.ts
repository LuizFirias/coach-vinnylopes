import { supabaseClient } from '@/lib/supabaseClient';

export type ChatPerfilMini = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  sexo?: string | null;
};

export type ChatConversa = {
  id: string;
  coach_id: string;
  aluno_id: string;
  ultima_msg: string | null;
  ultima_msg_em: string | null;
  ultima_msg_de: string | null;
  nao_lidas_coach: number;
  nao_lidas_aluno: number;
};

export type ChatMensagem = {
  id: string;
  conversa_id: string;
  texto: string;
  enviada_em: string;
  lida_em: string | null;
  remetente_id: string;
};

export type ChatListItem = {
  id: string;
  ultima_msg: string | null;
  ultima_msg_em: string | null;
  nao_lidas: number;
  outro: ChatPerfilMini;
  /** true se ainda não existe linha em chat_conversas (só aluno listado) */
  pendingCreate?: boolean;
  alunoId: string;
};

function formatSupabaseError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;
  const e = error as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };
  const parts = [e.message, e.code, e.details, e.hint].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
}

function isMissingRelation(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  const msg = (e.message ?? '').toLowerCase();
  return (
    e.code === 'PGRST205' ||
    e.code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table')
  );
}

/** Coach: conversas existentes (sem embed — evita ambiguidade de FK). */
export async function getConversasCoach(coachId: string): Promise<ChatConversa[]> {
  const { data, error } = await supabaseClient
    .from('chat_conversas')
    .select(
      'id, coach_id, aluno_id, ultima_msg, ultima_msg_em, ultima_msg_de, nao_lidas_coach, nao_lidas_aluno',
    )
    .eq('coach_id', coachId)
    .order('ultima_msg_em', { ascending: false });

  if (error) {
    if (isMissingRelation(error)) {
      throw new Error(
        'Tabelas de chat não encontradas. Rode a migration 0057_chat_coach_aluno.sql no Supabase.',
      );
    }
    throw new Error(formatSupabaseError(error, 'Erro ao carregar conversas'));
  }
  return (data ?? []) as ChatConversa[];
}

/**
 * Coach: lista unificada — alunos com conversa + alunos ainda sem chat.
 * Sem embeds PostgREST (mais estável).
 */
export async function getChatListCoach(coachId: string): Promise<ChatListItem[]> {
  const { data: links, error: linksErr } = await supabaseClient
    .from('coach_alunos')
    .select('aluno_id')
    .eq('coach_id', coachId);

  if (linksErr) {
    throw new Error(formatSupabaseError(linksErr, 'Erro ao listar alunos'));
  }

  const alunoIds = (links ?? []).map((l) => l.aluno_id as string);

  const [{ data: profiles }, conversas] = await Promise.all([
    alunoIds.length
      ? supabaseClient.from('profiles').select('id, full_name, avatar_url, sexo').in('id', alunoIds)
      : Promise.resolve({ data: [] as ChatPerfilMini[] }),
    getConversasCoach(coachId),
  ]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p as ChatPerfilMini]),
  );

  const byAluno = new Map<string, ChatListItem>();

  for (const c of conversas) {
    const aluno = profileMap.get(c.aluno_id) ?? {
      id: c.aluno_id,
      full_name: 'Aluno',
      avatar_url: null,
      sexo: null,
    };
    byAluno.set(c.aluno_id, {
      id: c.id,
      ultima_msg: c.ultima_msg,
      ultima_msg_em: c.ultima_msg_em,
      nao_lidas: c.nao_lidas_coach ?? 0,
      outro: aluno,
      alunoId: c.aluno_id,
    });
  }

  for (const alunoId of alunoIds) {
    if (byAluno.has(alunoId)) continue;
    byAluno.set(alunoId, {
      id: `pending:${alunoId}`,
      ultima_msg: null,
      ultima_msg_em: null,
      nao_lidas: 0,
      outro: profileMap.get(alunoId) ?? {
        id: alunoId,
        full_name: 'Aluno',
        avatar_url: null,
        sexo: null,
      },
      pendingCreate: true,
      alunoId,
    });
  }

  return Array.from(byAluno.values()).sort((a, b) => {
    if (a.ultima_msg_em && b.ultima_msg_em) {
      return b.ultima_msg_em.localeCompare(a.ultima_msg_em);
    }
    if (a.ultima_msg_em) return -1;
    if (b.ultima_msg_em) return 1;
    return (a.outro.full_name ?? '').localeCompare(b.outro.full_name ?? '', 'pt-BR');
  });
}

/** Busca ou cria conversa (RPC — funciona para aluno e coach). */
export async function getOuCriarConversa(alunoId: string, coachId: string): Promise<string> {
  const { data, error } = await supabaseClient.rpc('fn_get_ou_criar_conversa', {
    p_coach_id: coachId,
    p_aluno_id: alunoId,
  });

  if (error) {
    if (isMissingRelation(error) || (error.message ?? '').includes('fn_get_ou_criar_conversa')) {
      throw new Error(
        'Função de chat não encontrada. Rode a migration 0057_chat_coach_aluno.sql no Supabase.',
      );
    }
    throw new Error(formatSupabaseError(error, 'Não foi possível abrir a conversa'));
  }
  if (!data) throw new Error('Não foi possível abrir a conversa');
  return data as string;
}

export async function getMensagens(conversaId: string, limit = 50): Promise<ChatMensagem[]> {
  const { data, error } = await supabaseClient
    .from('chat_mensagens')
    .select('id, conversa_id, texto, enviada_em, lida_em, remetente_id')
    .eq('conversa_id', conversaId)
    .order('enviada_em', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelation(error)) {
      throw new Error(
        'Tabelas de chat não encontradas. Rode a migration 0057_chat_coach_aluno.sql no Supabase.',
      );
    }
    throw new Error(formatSupabaseError(error, 'Erro ao carregar mensagens'));
  }
  return ((data ?? []) as ChatMensagem[]).reverse();
}

export async function getConversaMeta(conversaId: string): Promise<(ChatConversa & {
  aluno?: ChatPerfilMini | null;
  coach?: ChatPerfilMini | null;
}) | null> {
  const { data, error } = await supabaseClient
    .from('chat_conversas')
    .select(
      'id, coach_id, aluno_id, ultima_msg, ultima_msg_em, ultima_msg_de, nao_lidas_coach, nao_lidas_aluno',
    )
    .eq('id', conversaId)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) {
      throw new Error(
        'Tabelas de chat não encontradas. Rode a migration 0057_chat_coach_aluno.sql no Supabase.',
      );
    }
    throw new Error(formatSupabaseError(error, 'Erro ao carregar conversa'));
  }
  if (!data) return null;

  const ids = [data.coach_id, data.aluno_id].filter(Boolean) as string[];
  const { data: profiles } = await supabaseClient
    .from('profiles')
    .select('id, full_name, avatar_url, sexo')
    .in('id', ids);

  const map = new Map((profiles ?? []).map((p) => [p.id as string, p as ChatPerfilMini]));

  return {
    ...(data as ChatConversa),
    coach: map.get(data.coach_id as string) ?? null,
    aluno: map.get(data.aluno_id as string) ?? null,
  };
}

export async function getTotalNaoLidas(
  userId: string,
  role: 'coach' | 'aluno',
): Promise<number> {
  const campo = role === 'coach' ? 'nao_lidas_coach' : 'nao_lidas_aluno';
  const filtro = role === 'coach' ? 'coach_id' : 'aluno_id';

  const { data, error } = await supabaseClient
    .from('chat_conversas')
    .select(campo)
    .eq(filtro, userId)
    .gt(campo, 0);

  if (error) return 0;
  return (data || []).reduce((acc: number, row: Record<string, number>) => {
    return acc + (Number(row[campo]) || 0);
  }, 0);
}

export function unwrapPerfil(
  value: ChatPerfilMini | ChatPerfilMini[] | null | undefined,
): ChatPerfilMini | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
