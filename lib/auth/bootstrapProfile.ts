/**
 * Bootstrap único de profile no boot — AuthProvider + MustChangePasswordGuard
 * compartilham a mesma request (inflight + cache).
 */
import { supabaseClient } from '@/lib/supabaseClient';

export type BootstrapProfile = {
  userId: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  must_change_password: boolean | null;
  first_access_completed: boolean | null;
  date_of_birth: string | null;
  subscription_active: boolean | null;
  account_type: string | null;
  status_pagamento: string | null;
  data_expiracao: string | null;
  arquivado: boolean | null;
  coach_id: string | null;
  sexo: string | null;
  trial_pendente_cartao: boolean | null;
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

      let { data: profile, error } = await supabaseClient
        .from('profiles')
        .select(
          'full_name, avatar_url, role, must_change_password, first_access_completed, date_of_birth, subscription_active, account_type, status_pagamento, data_expiracao, arquivado, coach_id, sexo, trial_pendente_cartao',
        )
        .eq('id', user.id)
        .maybeSingle();

      if (error?.message?.includes('trial_pendente_cartao')) {
        const fallback = await supabaseClient
          .from('profiles')
          .select(
            'full_name, avatar_url, role, must_change_password, first_access_completed, date_of_birth, subscription_active, account_type, status_pagamento, data_expiracao, arquivado, coach_id, sexo',
          )
          .eq('id', user.id)
          .maybeSingle();
        profile = fallback.data
          ? ({ ...fallback.data, trial_pendente_cartao: false } as typeof profile)
          : null;
        error = fallback.error;
      }

      if (error || !profile) {
        cache = null;
        return null;
      }

      const entry: CacheEntry = {
        userId: user.id,
        full_name: profile.full_name ?? null,
        avatar_url: profile.avatar_url ?? null,
        role: profile.role ?? null,
        must_change_password: profile.must_change_password ?? null,
        first_access_completed: profile.first_access_completed ?? null,
        date_of_birth: profile.date_of_birth ?? null,
        subscription_active: profile.subscription_active ?? null,
        account_type: profile.account_type ?? null,
        status_pagamento: profile.status_pagamento ?? null,
        data_expiracao: profile.data_expiracao ?? null,
        arquivado: profile.arquivado ?? null,
        coach_id: profile.coach_id ?? null,
        sexo: profile.sexo ?? null,
        trial_pendente_cartao:
          (profile as { trial_pendente_cartao?: boolean | null }).trial_pendente_cartao ?? null,
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
