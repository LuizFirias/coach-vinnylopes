import { supabaseClient } from "@/lib/supabaseClient";
import { PASSOS_ONBOARDING } from "@/lib/onboarding/passos";

/** Marca um passo do guia como concluído (idempotente). */
export async function concluirPasso(coachId: string, passoId: string): Promise<void> {
  if (!coachId || !passoId) return;

  const { error } = await supabaseClient
    .from("onboarding_passos")
    .update({
      concluido: true,
      concluido_em: new Date().toISOString(),
    })
    .eq("coach_id", coachId)
    .eq("passo_id", passoId)
    .eq("concluido", false);

  if (error) {
    // Tabela pode ainda não existir em ambientes sem migration — não quebra o fluxo.
    console.warn("[onboarding] concluirPasso:", passoId, error.message);
  }
}

/** Garante as linhas do guia para o coach (não sobrescreve concluídos). */
export async function garantirPassosOnboarding(coachId: string): Promise<void> {
  if (!coachId) return;

  const rows = PASSOS_ONBOARDING.map((p) => ({
    coach_id: coachId,
    passo_id: p.id,
    concluido: false,
  }));

  const { error } = await supabaseClient.from("onboarding_passos").upsert(rows, {
    onConflict: "coach_id,passo_id",
    ignoreDuplicates: true,
  });

  if (error) {
    console.warn("[onboarding] garantirPassos:", error.message);
  }
}

export type PassoProgresso = { id: string; concluido: boolean };

export async function carregarProgressoOnboarding(
  coachId: string,
): Promise<PassoProgresso[]> {
  const { data, error } = await supabaseClient
    .from("onboarding_passos")
    .select("passo_id, concluido")
    .eq("coach_id", coachId);

  if (error) {
    console.warn("[onboarding] carregarProgresso:", error.message);
    return PASSOS_ONBOARDING.map((p) => ({ id: p.id, concluido: false }));
  }

  const byId = new Map((data || []).map((r) => [r.passo_id, Boolean(r.concluido)]));
  return PASSOS_ONBOARDING.map((p) => ({
    id: p.id,
    concluido: byId.get(p.id) ?? false,
  }));
}
