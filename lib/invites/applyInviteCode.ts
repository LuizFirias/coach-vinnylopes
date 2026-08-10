import "server-only";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type AccountType = "padrao" | "teste" | "parceiro";

export interface InviteApplication {
  accountType: AccountType;
  studentLimit: number | null;
}

export async function applyInviteCode(
  inviteCode: string | undefined | null
): Promise<InviteApplication> {
  if (!inviteCode?.trim()) {
    return { accountType: "padrao", studentLimit: 3 };
  }

  const normalizedCode = inviteCode.trim().toUpperCase();
  const supabase = getSupabaseAdmin();

  const { data: invite } = await supabase
    .from("partner_invites")
    .select("*")
    .eq("code", normalizedCode)
    .maybeSingle();

  const valid = invite && invite.uses_count < invite.max_uses;

  if (!valid) {
    return { accountType: "padrao", studentLimit: 3 };
  }

  const { error: updateError } = await supabase
    .from("partner_invites")
    .update({ uses_count: invite.uses_count + 1 })
    .eq("id", invite.id);

  if (updateError) {
    console.warn("[applyInviteCode] Falha ao incrementar uses_count:", updateError.message);
    return { accountType: "padrao", studentLimit: 3 };
  }

  const defaultLimit = invite.account_type === "teste" ? 15 : null;

  return {
    accountType: invite.account_type as "teste" | "parceiro",
    studentLimit: invite.student_limit ?? defaultLimit,
  };
}
