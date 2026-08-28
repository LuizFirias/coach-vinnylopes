import "server-only";
import { createClient } from "@supabase/supabase-js";

export const getSupabaseAdmin = () => {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
