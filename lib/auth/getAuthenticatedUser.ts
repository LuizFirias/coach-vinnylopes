import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function getAuthenticatedUser(req: Request) {
  let token = "";
  try {
    const cookieStore = await cookies();
    token = cookieStore.get("sb-access-token")?.value || "";
  } catch {
    // ignore
  }

  if (!token) {
    const bearer = req.headers.get("authorization") || "";
    token = bearer.replace("Bearer ", "").trim();
  }

  if (!token) {
    return { error: "Não autorizado", status: 401 as const };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: "Configuração do servidor inválida", status: 500 as const };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await adminClient.auth.getUser(token);
  const user = authData?.user;

  if (authError || !user?.id) {
    return { error: "Sessão inválida", status: 401 as const };
  }

  return {
    userId: user.id,
    email: user.email,
    user,
    adminClient,
  };
}
