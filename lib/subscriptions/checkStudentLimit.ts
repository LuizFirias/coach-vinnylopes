import "server-only";
import { hasActiveAccess } from "@/lib/access/hasActiveAccess";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getActiveStudentCount } from "@/lib/subscriptions/getActiveStudentCount";
import {
  getPlanLabel,
  isUnlimitedStudents,
  FREE_TIER_STUDENT_LIMIT,
} from "@/lib/subscriptions/plans";

export interface StudentLimitCheck {
  allowed: boolean;
  count: number;
  limit: number | null;
  message?: string;
}

export async function checkStudentLimit(
  coachId: string,
  role?: string | null
): Promise<StudentLimitCheck> {
  if (role === "super_admin") {
    return { allowed: true, count: 0, limit: null };
  }

  const supabase = getSupabaseAdmin();
  const [{ data: profile }, count] = await Promise.all([
    supabase
      .from("profiles")
      .select("subscription_active, student_limit, plan_tier, account_type")
      .eq("id", coachId)
      .single(),
    getActiveStudentCount(coachId),
  ]);

  const limit = profile?.student_limit ?? null;
  const accountType = profile?.account_type ?? "padrao";

  if (accountType === "teste" || accountType === "parceiro") {
    if (limit == null) {
      return { allowed: true, count, limit: null };
    }

    if (count >= limit) {
      const label = accountType === "teste" ? "conta de teste" : "conta parceiro";
      return {
        allowed: false,
        count,
        limit,
        message: `Limite de ${limit} alunos atingido para esta ${label}.`,
      };
    }

    return { allowed: true, count, limit };
  }

  if (!hasActiveAccess(profile ?? {})) {
    return {
      allowed: false,
      count,
      limit,
      message: "Assinatura inativa. Ative seu plano em Assinatura para convidar alunos.",
    };
  }

  if (isUnlimitedStudents(profile?.plan_tier)) {
    return { allowed: true, count, limit: null };
  }

  if (limit == null || limit <= 0) {
    return {
      allowed: false,
      count,
      limit,
      message: "Plano sem limite configurado. Escolha um plano em Assinatura.",
    };
  }

  if (count >= limit) {
    const isFree =
      !profile?.plan_tier &&
      (profile?.student_limit ?? 0) > 0 &&
      (profile?.student_limit ?? 0) <= FREE_TIER_STUDENT_LIMIT;
    return {
      allowed: false,
      count,
      limit,
      message: isFree
        ? `Limite do plano gratuito (${limit} alunos) atingido. Assine um plano para adicionar mais.`
        : `Limite do plano ${getPlanLabel(profile?.plan_tier)} (${limit} alunos) atingido. Faça upgrade.`,
    };
  }

  return { allowed: true, count, limit };
}
