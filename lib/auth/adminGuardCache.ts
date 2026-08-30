/**
 * Cache curto em memória para guards admin — evita 2× getUser + profiles
 * a cada navegação e o loader full-screen de ~1–2s.
 */
type GuardProfileCache = {
  userId: string;
  role: string | null;
  must_change_password: boolean | null;
  first_access_completed: boolean | null;
  subscription_active: boolean | null;
  account_type: string | null;
  fetchedAt: number;
};

const TTL_MS = 90_000;
let cache: GuardProfileCache | null = null;
let inflight: Promise<GuardProfileCache | null> | null = null;

export function invalidateAdminGuardCache() {
  cache = null;
  inflight = null;
}

/** Leitura síncrona — permite pular loader full-screen se o cache ainda é válido. */
export function peekAdminGuardCache(): GuardProfileCache | null {
  if (!cache) return null;
  if (Date.now() - cache.fetchedAt >= TTL_MS) return null;
  return cache;
}

export async function getCachedAdminGuardProfile(
  fetchFn: () => Promise<Omit<GuardProfileCache, "fetchedAt"> | null>,
): Promise<GuardProfileCache | null> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) {
    return cache;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const data = await fetchFn();
      if (!data) {
        cache = null;
        return null;
      }
      cache = { ...data, fetchedAt: Date.now() };
      return cache;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
