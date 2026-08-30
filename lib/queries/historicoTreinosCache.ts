/**
 * Cache compartilhado do histórico completo do aluno (estatísticas / perfil / calendário).
 * TTL curto + inflight evita 3–6 GETs idênticos na mesma sessão de navegação.
 *
 * Também persiste em localStorage (stale-while-revalidate): ao reabrir o app
 * (sobretudo o instalado/mobile), mostra na hora o que já tinha salvo da
 * última vez, enquanto atualiza em segundo plano — sem esconder nenhuma
 * sessão antiga, só evita esperar a rede de novo pra mostrar o que já se sabia.
 */
import { supabaseClient } from '@/lib/supabaseClient';

export type HistoricoTreinoRow = {
  id: string;
  data_conclusao: string;
  dados_sessao: Record<string, unknown> | null;
  exercicio_id: string | null;
  ficha_id: string | null;
};

const TTL_MS = 60_000;
/** Quanto tempo o que está salvo no aparelho ainda vale a pena mostrar de cara
 *  (sempre seguido de uma atualização em segundo plano, então isso só define
 *  o quão "velho" pode ser o que aparece por um instante ao reabrir a tela). */
const LOCAL_STORAGE_STALE_MS = 24 * 60 * 60 * 1000;
const LOCAL_STORAGE_PREFIX = 'auron_historico_treinos_v1_';
const SELECT =
  'id, data_conclusao, dados_sessao, exercicio_id, ficha_id';

type CacheEntry = {
  userId: string;
  rows: HistoricoTreinoRow[];
  fetchedAt: number;
};

let cache: CacheEntry | null = null;
let inflight: Promise<HistoricoTreinoRow[]> | null = null;
let inflightUserId: string | null = null;

function readLocalStorage(userId: string): CacheEntry | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(LOCAL_STORAGE_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || parsed.userId !== userId || !Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalStorage(entry: CacheEntry) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LOCAL_STORAGE_PREFIX + entry.userId, JSON.stringify(entry));
  } catch {
    // localStorage cheio/bloqueado (aba anônima, etc.) — cache em memória
    // ainda funciona normalmente, só não persiste entre aberturas do app.
  }
}

export function invalidateHistoricoTreinosCache(userId?: string) {
  if (!userId || cache?.userId === userId) {
    cache = null;
    inflight = null;
    inflightUserId = null;
  }
  try {
    if (typeof window !== 'undefined' && userId) {
      window.localStorage.removeItem(LOCAL_STORAGE_PREFIX + userId);
    }
  } catch {
    // ignora
  }
}

function fetchFresh(
  userId: string,
  client: typeof supabaseClient,
): Promise<HistoricoTreinoRow[]> {
  if (inflight && inflightUserId === userId) return inflight;

  inflightUserId = userId;
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
      const entry: CacheEntry = { userId, rows, fetchedAt: Date.now() };
      cache = entry;
      writeLocalStorage(entry);
      return rows;
    } finally {
      inflight = null;
      inflightUserId = null;
    }
  })();

  return inflight;
}

/**
 * Versão síncrona: devolve na hora o que já está em memória ou salvo no
 * aparelho (sem esperar nenhum await), pra telas iniciarem o estado já
 * preenchido em vez de nascer em "Carregando...". Não dispara fetch —
 * quem chamar continua chamando getHistoricoTreinosFull normalmente depois.
 */
export function peekHistoricoTreinosFull(userId: string): HistoricoTreinoRow[] | undefined {
  if (cache && cache.userId === userId) return cache.rows;
  const stored = readLocalStorage(userId);
  if (stored && Date.now() - stored.fetchedAt < LOCAL_STORAGE_STALE_MS) return stored.rows;
  return undefined;
}

export async function getHistoricoTreinosFull(
  userId: string,
  client = supabaseClient,
): Promise<HistoricoTreinoRow[]> {
  const now = Date.now();
  if (cache && cache.userId === userId && now - cache.fetchedAt < TTL_MS) {
    return cache.rows;
  }

  // Sem cache "quente" em memória (primeira vez nessa sessão de navegação) —
  // tenta o que ficou salvo no aparelho da última vez pra responder na hora,
  // e atualiza em segundo plano sem bloquear quem já vai receber o valor salvo.
  if (!cache || cache.userId !== userId) {
    const stored = readLocalStorage(userId);
    if (stored && now - stored.fetchedAt < LOCAL_STORAGE_STALE_MS) {
      cache = stored;
      void fetchFresh(userId, client);
      return stored.rows;
    }
  }

  return fetchFresh(userId, client);
}
