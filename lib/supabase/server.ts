import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a server-side Supabase client authenticated with the given access token.
 *
 * Since this project stores auth in localStorage (not cookies), server actions
 * cannot auto-detect the session. The caller must pass the access_token obtained
 * client-side via `supabaseClient.auth.getSession()`.
 */
export function createClient(accessToken?: string) {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });

  return client;
}
