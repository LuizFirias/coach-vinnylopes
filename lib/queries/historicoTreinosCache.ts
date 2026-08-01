/**
 * Cache compartilhado do histórico completo do aluno (estatísticas / perfil / calendário).
 * TTL curto + inflight evita 3–6 GETs idênticos na mesma sessão de navegação.
 */
import { supabaseClient } from '@/lib/supabaseClient';

export type HistoricoTreinoRow = {
  id: string;
  data_conclusao: string;
  dados_sessao: Record<string, unknown> | null;
  exercicio_id: string | null;
};

const TTL_MS = 60_000;
const SELECT =
  'id, data_conclusao, dados_sessao, exercicio_id';

type CacheEntry = {
  userId: string;
  rows: HistoricoTreinoRow[];
  fetchedAt: number;
};

let cache: CacheEntry | null = null;
let inflight: Promise<HistoricoTreinoRow[]> | null = null;

export function invalidateHistoricoTreinosCache(userId?: string) {
  if (!userId || cache?.userId === userId) {
    cache = null;
    inflight = null;
  }
}

export async function getHistoricoTreinosFull(
  userId: string,
  client = supabaseClient,
): Promise<HistoricoTreinoRow[]> {
  const now = Date.now();
  if (cache && cache.userId === userId && now - cache.fetchedAt < TTL_MS) {
    return cache.rows;
  }
  if (inflight && cache?.userId === userId) return inflight;

  inflight = (async () => {
    try {
      const { data, error } = await client
        .from('historico_treinos')
        .select(SELECT)
        .eq('aluno_id', userId)
        .order('data_conclusao', { ascending: false });

      if (error) {
        console.error('[getHistoricoTreinosFull]', error.message);
        return cache?.userId === userId ? cache.rows : [];
      }

      const rows = (data ?? []) as HistoricoTreinoRow[];
      cache = { userId, rows, fetchedAt: Date.now() };
      return rows;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
