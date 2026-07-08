import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Aluno ativo = vinculado ao coach em coach_alunos e não arquivado em profiles.
 */
export async function getActiveStudentCount(coachId: string): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { data: links, error: linksError } = await supabase
    .from("coach_alunos")
    .select("aluno_id")
    .eq("coach_id", coachId);

  if (linksError) throw linksError;
  if (!links?.length) return 0;

  const alunoIds = links.map((l) => l.aluno_id);

  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("id", alunoIds)
    .or("arquivado.is.null,arquivado.eq.false");

  if (error) throw error;
  return count ?? 0;
}
