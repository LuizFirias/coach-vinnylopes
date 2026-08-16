import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { planHasAiDiet, type PlanSlug } from "@/lib/subscriptions/plans";

export async function checkAiDietAccess(userId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from("profiles")
    .select("plan_tier, role")
    .eq("id", userId)
    .single();

  if (data?.role === "super_admin") return true;
  return planHasAiDiet(data?.plan_tier as PlanSlug);
}
