import "server-only";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { hasActiveAccess } from "@/lib/access/hasActiveAccess";

export class CoachSubscriptionInactiveError extends Error {
  status = 403 as const;
  code = "COACH_SUBSCRIPTION_INACTIVE" as const;

  constructor() {
    super("Assinatura inativa. Ative seu plano para continuar prescrevendo.");
    this.name = "CoachSubscriptionInactiveError";
  }
}

/**
 * Lança CoachSubscriptionInactiveError se o coach não tiver acesso ativo.
 * Contas teste / parceiro / super_admin passam sempre.
 * Chamar no início de qualquer API route que escreve para alunos.
 */
export async function assertCoachWriteAccess(coachId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_active, account_type, role")
    .eq("id", coachId)
    .single();

  if (
    profile?.role === "super_admin" ||
    profile?.account_type === "teste" ||
    profile?.account_type === "parceiro"
  ) {
    return;
  }

  if (!hasActiveAccess(profile ?? {})) {
    throw new CoachSubscriptionInactiveError();
  }
}

/** Resposta 403 padronizada, ou null se o erro for outro. */
export function coachWriteAccessErrorResponse(err: unknown) {
  if (err instanceof CoachSubscriptionInactiveError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.status },
    );
  }
  return null;
}
