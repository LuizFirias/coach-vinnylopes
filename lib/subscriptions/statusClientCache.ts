/**
 * Cache curto do GET /api/subscriptions/status no client —
 * evita 2–3 round-trips iguais (sidebar + dashboard + perfil) na mesma sessão.
 */

type CacheEntry = {
  tokenFingerprint: string;
  data: unknown;
  fetchedAt: number;
};

const TTL_MS = 45_000;
let cache: CacheEntry | null = null;
let inflight: Promise<unknown | null> | null = null;

function fingerprint(token: string): string {
  return token.slice(0, 24);
}

export function invalidateSubscriptionStatusCache() {
  cache = null;
  inflight = null;
}

export async function fetchSubscriptionStatusCached(
  accessToken: string,
): Promise<any | null> {
  const fp = fingerprint(accessToken);
  const now = Date.now();

  if (cache && cache.tokenFingerprint === fp && now - cache.fetchedAt < TTL_MS) {
    return cache.data;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch("/api/subscriptions/status", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        cache = null;
        return null;
      }
      const data = await res.json();
      cache = { tokenFingerprint: fp, data, fetchedAt: Date.now() };
      return data;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
