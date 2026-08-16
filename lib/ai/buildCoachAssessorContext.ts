import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  assessorDateRange,
  toDateKey,
  type AssessorPeriodo,
} from "@/lib/ai/assessorPeriod";

function daysSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / (1000 * 60 * 60 * 24));
}

/** Visão da consultoria: quem some do app, quem não manda foto, quem não treina. */
export async function buildCoachAssessorContext(
  coachId: string,
  periodo: AssessorPeriodo = "mensal",
) {
  const now = new Date();
  const range = assessorDateRange(periodo, now);
  const startDate = range.startIso.slice(0, 10);
  const supabase = getSupabaseAdmin();

  const { data: vinculos } = await supabase
    .from("coach_alunos")
    .select("aluno_id")
    .eq("coach_id", coachId);

  const ids = [...new Set((vinculos || []).map((v) => v.aluno_id).filter(Boolean))];
  if (ids.length === 0) {
    return { periodo, total_alunos: 0, alunos: [] as unknown[] };
  }

  const [
    profilesRes,
    treinosRes,
    fotosRes,
    checkinsRes,
    aguaRes,
    medidasRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, coaching_reference, arquivado, sexo")
      .in("id", ids)
      .or("arquivado.is.null,arquivado.eq.false"),
    supabase
      .from("historico_treinos")
      .select("aluno_id, data_conclusao")
      .in("aluno_id", ids)
      .order("data_conclusao", { ascending: false })
      .limit(2000),
    supabase
      .from("fotos_evolucao")
      .select("aluno_id, data_upload")
      .in("aluno_id", ids)
      .order("data_upload", { ascending: false })
      .limit(800),
    supabase
      .from("nutrition_meal_checkins")
      .select("student_id, checkin_date, status")
      .in("student_id", ids)
      .gte("checkin_date", startDate)
      .in("status", ["done", "substituted"]),
    supabase
      .from("registros_agua")
      .select("aluno_id, data_registro, copos")
      .in("aluno_id", ids)
      .gte("data_registro", startDate),
    supabase
      .from("medidas_aluno")
      .select("aluno_id, data_medicao")
      .in("aluno_id", ids)
      .order("data_medicao", { ascending: false })
      .limit(400),
  ]);

  const lastTreino = new Map<string, string>();
  for (const t of treinosRes.data || []) {
    if (t.aluno_id && t.data_conclusao && !lastTreino.has(t.aluno_id)) {
      lastTreino.set(t.aluno_id, t.data_conclusao);
    }
  }
  const lastFoto = new Map<string, string>();
  for (const f of fotosRes.data || []) {
    if (f.aluno_id && f.data_upload && !lastFoto.has(f.aluno_id)) {
      lastFoto.set(f.aluno_id, f.data_upload);
    }
  }
  const lastMedida = new Map<string, string>();
  for (const m of medidasRes.data || []) {
    if (m.aluno_id && m.data_medicao && !lastMedida.has(m.aluno_id)) {
      lastMedida.set(m.aluno_id, m.data_medicao);
    }
  }
  const checkinsCount = new Map<string, number>();
  for (const c of checkinsRes.data || []) {
    const id = c.student_id as string;
    checkinsCount.set(id, (checkinsCount.get(id) || 0) + 1);
  }
  const aguaDias = new Map<string, Set<string>>();
  for (const a of aguaRes.data || []) {
    if ((a.copos || 0) <= 0) continue;
    const set = aguaDias.get(a.aluno_id) || new Set<string>();
    set.add(toDateKey(a.data_registro));
    aguaDias.set(a.aluno_id, set);
  }

  const alunos = (profilesRes.data || []).map((p) => {
    const ultimoTreino = lastTreino.get(p.id) || null;
    const ultimaFoto = lastFoto.get(p.id) || null;
    const ultimaMedida = lastMedida.get(p.id) || null;
    const diasSemTreino = daysSince(ultimoTreino, now);
    const diasSemFoto = daysSince(ultimaFoto, now);
    const risco =
      diasSemTreino == null || diasSemTreino >= 14
        ? "alto"
        : diasSemTreino >= 7
          ? "medio"
          : "baixo";
    return {
      id: p.id,
      nome: p.full_name || p.coaching_reference || "Aluno",
      ultimo_treino: ultimoTreino,
      dias_sem_treino: diasSemTreino,
      ultima_foto: ultimaFoto,
      dias_sem_foto: diasSemFoto,
      ultima_medida: ultimaMedida,
      checkins_dieta_no_periodo: checkinsCount.get(p.id) || 0,
      dias_com_agua_no_periodo: aguaDias.get(p.id)?.size || 0,
      risco_inatividade: risco,
    };
  });

  alunos.sort((a, b) => (b.dias_sem_treino ?? 999) - (a.dias_sem_treino ?? 999));

  return {
    periodo,
    janela: { de: startDate, ate: range.endIso.slice(0, 10) },
    total_alunos: alunos.length,
    menos_ativos: alunos.filter((a) => a.risco_inatividade !== "baixo").slice(0, 15),
    fotos_atrasadas: [...alunos]
      .sort((a, b) => (b.dias_sem_foto ?? 999) - (a.dias_sem_foto ?? 999))
      .slice(0, 15),
    alunos,
    papel: "assessor_do_coach",
    notas_para_ia: [
      "Você assessora o personal, não substitui o dashboard. Destaque quem precisa de mensagem, revisão de ficha ou pedido de foto.",
      "Nunca invente dados: se ultimo_treino for null, o aluno nunca executou treino no app.",
    ],
  };
}
