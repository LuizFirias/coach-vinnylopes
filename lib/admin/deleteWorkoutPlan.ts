import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkoutPlanTipo = "digital" | "pdf";

interface DeleteWorkoutPlanInput {
  id: string;
  tipo: WorkoutPlanTipo;
  pdfUrl?: string | null;
}

/**
 * Remove referências em tabelas dependentes antes de excluir a ficha/PDF.
 * Usa service role — chamado apenas após validação de ownership no route handler.
 */
export async function deleteWorkoutPlan(
  adminClient: SupabaseClient,
  input: DeleteWorkoutPlanInput
): Promise<{ error?: string }> {
  const { id, tipo, pdfUrl } = input;

  if (tipo === "pdf") {
    const { error: agendaError } = await adminClient
      .from("agenda_semanal")
      .update({ treino_pdf_id: null })
      .eq("treino_pdf_id", id);

    if (agendaError) {
      return { error: `Falha ao desvincular agenda: ${agendaError.message}` };
    }

    if (pdfUrl) {
      const { error: storageError } = await adminClient.storage
        .from("treinos-pdf")
        .remove([pdfUrl]);

      if (storageError) {
        console.warn("[deleteWorkoutPlan] storage remove:", storageError.message);
      }
    }

    const { error: deleteError } = await adminClient
      .from("treinos_alunos")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return { error: deleteError.message };
    }

    return {};
  }

  // Ficha digital
  const { error: agendaError } = await adminClient
    .from("agenda_semanal")
    .update({ ficha_id: null })
    .eq("ficha_id", id);

  if (agendaError) {
    return { error: `Falha ao desvincular agenda: ${agendaError.message}` };
  }

  const { error: feedbackError } = await adminClient
    .from("feedbacks_treinos")
    .update({ ficha_id: null })
    .eq("ficha_id", id);

  // Tabela pode não existir em ambientes antigos — ignorar se coluna/tabela ausente
  if (feedbackError && !feedbackError.message.includes("does not exist")) {
    return { error: `Falha ao desvincular feedbacks: ${feedbackError.message}` };
  }

  const { error: historicoError } = await adminClient
    .from("historico_treinos")
    .delete()
    .eq("ficha_id", id);

  if (historicoError) {
    return { error: `Falha ao remover histórico: ${historicoError.message}` };
  }

  const { error: deleteError } = await adminClient
    .from("fichas_treino")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  return {};
}

export async function coachCanDeleteWorkoutPlan(
  adminClient: SupabaseClient,
  coachId: string,
  role: string,
  input: DeleteWorkoutPlanInput
): Promise<{ allowed: boolean; error?: string }> {
  if (role === "super_admin") {
    return { allowed: true };
  }

  if (input.tipo === "pdf") {
    const { data, error } = await adminClient
      .from("treinos_alunos")
      .select("id, aluno_id, coach_id")
      .eq("id", input.id)
      .maybeSingle();

    if (error || !data) {
      return { allowed: false, error: "Planejamento não encontrado" };
    }

    if (data.coach_id === coachId) {
      return { allowed: true };
    }

    const { data: link } = await adminClient
      .from("coach_alunos")
      .select("aluno_id")
      .eq("coach_id", coachId)
      .eq("aluno_id", data.aluno_id)
      .maybeSingle();

    return { allowed: !!link, error: link ? undefined : "Sem permissão para excluir este PDF" };
  }

  const { data, error } = await adminClient
    .from("fichas_treino")
    .select("id, aluno_id, coach_id")
    .eq("id", input.id)
    .maybeSingle();

  if (error || !data) {
    return { allowed: false, error: "Ficha não encontrada" };
  }

  if (data.coach_id === coachId) {
    return { allowed: true };
  }

  const { data: link } = await adminClient
    .from("coach_alunos")
    .select("aluno_id")
    .eq("coach_id", coachId)
    .eq("aluno_id", data.aluno_id)
    .maybeSingle();

  return { allowed: !!link, error: link ? undefined : "Sem permissão para excluir esta ficha" };
}
