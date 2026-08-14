import { supabaseClient } from "@/lib/supabaseClient";
import { PASSOS_ONBOARDING } from "@/lib/onboarding/passos";

/** Marca um passo do guia como concluído (idempotente; cria a linha se faltar). */
export async function concluirPasso(coachId: string, passoId: string): Promise<void> {
  if (!coachId || !passoId) return;

  const { error } = await supabaseClient.from("onboarding_passos").upsert(
    {
      coach_id: coachId,
      passo_id: passoId,
      concluido: true,
      concluido_em: new Date().toISOString(),
    },
    { onConflict: "coach_id,passo_id" },
  );

  if (error) {
    // Tabela pode ainda não existir em ambientes sem migration — não quebra o fluxo.
    console.warn("[onboarding] concluirPasso:", passoId, error.message);
  }
}

/** Marca vários passos de uma vez (ex.: “concluir restantes”). */
export async function concluirPassos(
  coachId: string,
  passoIds: string[],
): Promise<void> {
  if (!coachId || passoIds.length === 0) return;

  const agora = new Date().toISOString();
  const rows = passoIds.map((passo_id) => ({
    coach_id: coachId,
    passo_id,
    concluido: true,
    concluido_em: agora,
  }));

  const { error } = await supabaseClient.from("onboarding_passos").upsert(rows, {
    onConflict: "coach_id,passo_id",
  });

  if (error) {
    console.warn("[onboarding] concluirPassos:", error.message);
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

/**
 * Garante linhas + marca como feitos os passos que o coach já cumpriu na prática
 * (ex.: já tinha alunos/fichas antes do guia existir). Passos novos no array
 * PASSOS_ONBOARDING entram como pendentes e o card volta a aparecer.
 */
export async function sincronizarProgressoOnboarding(
  coachId: string,
): Promise<PassoProgresso[]> {
  if (!coachId) {
    return PASSOS_ONBOARDING.map((p) => ({ id: p.id, concluido: false }));
  }

  await garantirPassosOnboarding(coachId);

  const progresso = await carregarProgressoOnboarding(coachId);
  const pendentes = new Set(
    progresso.filter((p) => !p.concluido).map((p) => p.id),
  );

  if (pendentes.size === 0) return progresso;

  const checks: Array<Promise<{ id: string; ok: boolean }>> = [];

  const checkExiste = async (
    id: string,
    query: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  ): Promise<{ id: string; ok: boolean }> => {
    const { data, error } = await query;
    if (error) console.warn(`[onboarding] sync ${id}:`, error.message);
    const n = Array.isArray(data) ? data.length : 0;
    return { id, ok: !error && n > 0 };
  };

  if (pendentes.has("cadastrar-aluno")) {
    checks.push(
      checkExiste(
        "cadastrar-aluno",
        supabaseClient
          .from("coach_alunos")
          .select("aluno_id")
          .eq("coach_id", coachId)
          .limit(1),
      ),
    );
  }

  if (pendentes.has("montar-ficha")) {
    checks.push(
      checkExiste(
        "montar-ficha",
        supabaseClient
          .from("fichas_treino")
          .select("id")
          .eq("coach_id", coachId)
          .limit(1),
      ),
    );
  }

  if (pendentes.has("criar-nutricao")) {
    checks.push(
      checkExiste(
        "criar-nutricao",
        supabaseClient
          .from("nutrition_plans")
          .select("id")
          .eq("coach_id", coachId)
          .limit(1),
      ),
    );
  }

  if (checks.length === 0) return progresso;

  const results = await Promise.all(checks);
  const autoIds = results.filter((r) => r.ok).map((r) => r.id);
  if (autoIds.length > 0) {
    await concluirPassos(coachId, autoIds);
  }

  return carregarProgressoOnboarding(coachId);
}
