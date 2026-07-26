/**
 * Bootstrap único de profile no boot — AuthProvider + MustChangePasswordGuard
 * compartilham a mesma request (inflight + cache).
 */
import { supabaseClient } from '@/lib/supabaseClient';

export type BootstrapProfile = {
  userId: string;
  role: string | null;
  must_change_password: boolean | null;
  first_access_completed: boolean | null;
  subscription_active: boolean | null;
  account_type: string | null;
  status_pagamento: string | null;
  data_expiracao: string | null;
  arquivado: boolean | null;
  coach_id: string | null;
  sexo: string | null;
};

type CacheEntry = BootstrapProfile & { fetchedAt: number };

const TTL_MS = 90_000;
let cache: CacheEntry | null = null;
let inflight: Promise<BootstrapProfile | null> | null = null;

export function invalidateBootstrapProfile() {
  cache = null;
  inflight = null;
}

export function peekBootstrapProfile(): BootstrapProfile | null {
  if (!cache) return null;
  if (Date.now() - cache.fetchedAt >= TTL_MS) return null;
  return cache;
}

export async function getBootstrapProfile(): Promise<BootstrapProfile | null> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      const user = session?.user;
      if (!user) {
        cache = null;
        return null;
      }

      const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select(
          'role, must_change_password, first_access_completed, subscription_active, account_type, status_pagamento, data_expiracao, arquivado, coach_id, sexo',
        )
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        cache = null;
        return null;
      }

      const entry: CacheEntry = {
        userId: user.id,
        role: profile.role ?? null,
        must_change_password: profile.must_change_password ?? null,
        first_access_completed: profile.first_access_completed ?? null,
        subscription_active: profile.subscription_active ?? null,
        account_type: profile.account_type ?? null,
        status_pagamento: profile.status_pagamento ?? null,
        data_expiracao: profile.data_expiracao ?? null,
        arquivado: profile.arquivado ?? null,
        coach_id: profile.coach_id ?? null,
        sexo: profile.sexo ?? null,
        fetchedAt: Date.now(),
      };
      cache = entry;
      return entry;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
