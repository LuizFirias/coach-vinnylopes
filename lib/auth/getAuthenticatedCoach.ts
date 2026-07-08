import "server-only";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_ALLOWED_ROLES = ["coach", "super_admin"] as const;

type AuthError = { error: string; status: 401 | 403 | 404 | 500 };

type AuthSuccess = {
  userId: string;
  email: string | undefined;
  fullName: string | null;
  coachingReference: string | null;
  role: string;
  adminClient: SupabaseClient;
};

export type AuthenticatedCoachResult = AuthError | AuthSuccess;

export async function getAuthenticatedCoach(
  req: Request,
  options?: { allowedRoles?: readonly string[] }
): Promise<AuthenticatedCoachResult> {
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
  const userId = authData?.user?.id;

  if (authError || !userId) {
    return { error: "Sessão inválida", status: 401 as const };
  }

  const { data: profile, error: roleError } = await adminClient
    .from("profiles")
    .select("role, full_name, email, coaching_reference")
    .eq("id", userId)
    .single();

  if (roleError || !profile) {
    return { error: "Perfil não encontrado", status: 404 as const };
  }

  const allowedRoles = options?.allowedRoles ?? DEFAULT_ALLOWED_ROLES;
  if (!allowedRoles.includes(profile.role)) {
    return { error: "Acesso negado", status: 403 as const };
  }

  return {
    userId,
    email: authData.user?.email || profile.email,
    fullName: profile.full_name,
    coachingReference: profile.coaching_reference,
    role: profile.role,
    adminClient,
  };
}
