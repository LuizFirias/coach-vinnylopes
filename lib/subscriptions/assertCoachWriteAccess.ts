import "server-only";
import { NextResponse } from "next/server";

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
// Coach Vinny não tem plano/assinatura (treinador único) — este gate do
// AURON travaria toda escrita porque as colunas subscription_active/
// account_type não existem neste banco. No-op aqui de propósito.
export async function assertCoachWriteAccess(_coachId: string): Promise<void> {
  return;
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
