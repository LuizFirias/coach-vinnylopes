/**
 * Cache genérico em memória, por chave, com TTL + dedupe de requisições em
 * andamento. Mesmo padrão já usado em lib/queries/historicoTreinosCache.ts
 * e lib/auth/bootstrapProfile.ts — aqui generalizado pra qualquer fetch.
 *
 * Criado pra resolver telas que "recarregam" (mostram loading de novo) toda
 * vez que o usuário troca de aba: as abas do perfil do aluno são montadas/
 * desmontadas ao trocar (ver activeTab em admin/aluno/[id]/page.tsx), então
 * qualquer fetch feito só no `useEffect` de montagem do componente roda de
 * novo do zero a cada troca — com cache, a volta pra aba já usa o valor
 * recente, sem esperar a rede de novo.
 */

type Entry<T> = { value: T; fetchedAt: number };

export function createKeyedCache<T>(ttlMs: number) {
  const cache = new Map<string, Entry<T>>();
  const inflight = new Map<string, Promise<T>>();

  function peek(key: string): T | undefined {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.fetchedAt >= ttlMs) return undefined;
    return entry.value;
  }

  async function get(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = peek(key);
    if (cached !== undefined) return cached;

    const existingInflight = inflight.get(key);
    if (existingInflight) return existingInflight;

    const promise = (async () => {
      try {
        const value = await fetcher();
        cache.set(key, { value, fetchedAt: Date.now() });
        return value;
      } finally {
        inflight.delete(key);
      }
    })();

    inflight.set(key, promise);
    return promise;
  }

  function invalidate(key?: string) {
    if (key) {
      cache.delete(key);
      inflight.delete(key);
    } else {
      cache.clear();
      inflight.clear();
    }
  }

  return { peek, get, invalidate };
}
