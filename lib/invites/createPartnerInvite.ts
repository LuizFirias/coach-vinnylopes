import "server-only";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSiteUrl } from "@/lib/subscriptions/siteUrl";
import { generateInviteCode } from "@/lib/invites/generateInviteCode";

export interface CreateInviteInput {
  accountType: "teste" | "parceiro";
  notes?: string | null;
  maxUses?: number;
  studentLimit?: number | null;
  createdBy?: string | null;
}

export interface PartnerInviteRecord {
  id: string;
  code: string;
  account_type: string;
  student_limit: number | null;
  max_uses: number;
  uses_count: number;
  notes: string | null;
  created_at: string;
  inviteLink: string;
}

export async function createPartnerInvite(
  input: CreateInviteInput
): Promise<PartnerInviteRecord> {
  const { accountType, notes, maxUses = 1, studentLimit, createdBy } = input;

  const resolvedLimit =
    studentLimit !== undefined
      ? studentLimit
      : accountType === "teste"
        ? 15
        : null;

  const code = generateInviteCode(accountType, notes);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("partner_invites")
    .insert({
      code,
      account_type: accountType,
      student_limit: resolvedLimit,
      max_uses: maxUses,
      notes: notes?.trim() || null,
      created_by: createdBy || null,
    })
    .select("id, code, account_type, student_limit, max_uses, uses_count, notes, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const siteUrl = getSiteUrl();

  return {
    ...data,
    inviteLink: `${siteUrl}/cadastro?convite=${data.code}`,
  };
}
