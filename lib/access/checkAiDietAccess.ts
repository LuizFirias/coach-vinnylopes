import "server-only";

// Coach Vinny não tem planos/tiers (a coluna plan_tier nem existe neste
// banco) — libera sempre, sem gate de assinatura.
export async function checkAiDietAccess(_userId: string): Promise<boolean> {
  return true;
}
