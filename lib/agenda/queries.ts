import { supabaseClient } from "@/lib/supabaseClient";

export type LocalTipo = "presencial" | "online";
export type ItemTipo = "aula" | "evento";

export interface AulaAgenda {
  id: string;
  coach_id: string;
  aluno_id: string | null;
  data_hora: string;
  duracao_min: number;
  local_tipo: LocalTipo;
  endereco: string | null;
  status: "agendada" | "concluida" | "cancelada";
  /** De quem foi a falta quando status='cancelada' — null = motivo não especificado. */
  falta_de: "coach" | "aluno" | null;
  tipo: ItemTipo;
  titulo: string | null;
  aluno?: {
    id: string;
    full_name: string | null;
    coaching_reference: string | null;
    avatar_url: string | null;
    sexo: string | null;
  } | null;
}

const AULA_SELECT =
  "id, coach_id, aluno_id, data_hora, duracao_min, local_tipo, endereco, status, falta_de, tipo, titulo, aluno:profiles!aluno_id(id, full_name, coaching_reference, avatar_url, sexo)";

/** Próxima aula agendada (a partir de agora), pra o card do dashboard. */
export async function fetchProximaAula(coachId: string): Promise<AulaAgenda | null> {
  const { data, error } = await supabaseClient
    .from("aulas_presenciais")
    .select(AULA_SELECT)
    .eq("coach_id", coachId)
    .eq("status", "agendada")
    .eq("tipo", "aula")
    .gte("data_hora", new Date().toISOString())
    .order("data_hora", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[agenda] fetchProximaAula:", error.message);
    return null;
  }
  return (data as unknown as AulaAgenda) ?? null;
}

/**
 * Aulas pendentes de marcação (card "Próximas aulas") — futuras + as dos
 * últimos 7 dias que ainda não foram marcadas como feita/falta, pra não
 * sumirem sem o coach confirmar o que aconteceu.
 */
export async function fetchAulasPendentes(coachId: string): Promise<AulaAgenda[]> {
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  const { data, error } = await supabaseClient
    .from("aulas_presenciais")
    .select(AULA_SELECT)
    .eq("coach_id", coachId)
    .eq("status", "agendada")
    .eq("tipo", "aula")
    .gte("data_hora", seteDiasAtras.toISOString())
    .order("data_hora", { ascending: true })
    .limit(100);

  if (error) {
    console.warn("[agenda] fetchAulasPendentes:", error.message);
    return [];
  }
  return (data as unknown as AulaAgenda[]) ?? [];
}

/** Tudo (aulas + eventos) num intervalo de datas, pro grid do calendário. */
export async function fetchAgendaRange(
  coachId: string,
  startISO: string,
  endISO: string,
): Promise<AulaAgenda[]> {
  // Sem filtrar "cancelada" — aulas canceladas/faltadas continuam aparecendo
  // no grid (estilizadas em vermelho), pra não sumirem da agenda.
  const { data, error } = await supabaseClient
    .from("aulas_presenciais")
    .select(AULA_SELECT)
    .eq("coach_id", coachId)
    .gte("data_hora", startISO)
    .lt("data_hora", endISO)
    .order("data_hora", { ascending: true });

  if (error) {
    console.warn("[agenda] fetchAgendaRange:", error.message);
    return [];
  }
  return (data as unknown as AulaAgenda[]) ?? [];
}

/**
 * Últimas N aulas com um status específico (feitas/canceladas) — pra lista
 * que substitui "Próximas aulas" quando o coach clica no card de contagem.
 * Vem do mais recente pro mais antigo (fácil pegar as N últimas) e já
 * devolve invertido (mais antiga → mais recente), ordem de exibição pedida.
 */
export async function fetchAulasPorStatus(
  coachId: string,
  status: "concluida" | "cancelada",
  limit = 30,
): Promise<AulaAgenda[]> {
  const { data, error } = await supabaseClient
    .from("aulas_presenciais")
    .select(AULA_SELECT)
    .eq("coach_id", coachId)
    .eq("status", status)
    .eq("tipo", "aula")
    .order("data_hora", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[agenda] fetchAulasPorStatus:", error.message);
    return [];
  }
  return ((data as unknown as AulaAgenda[]) ?? []).reverse();
}

export interface CriarAulaInput {
  coachId: string;
  alunoId: string;
  dataHoraISO: string;
  duracaoMin: number;
  localTipo: LocalTipo;
  endereco?: string | null;
}

export async function criarAula(input: CriarAulaInput) {
  const { error } = await supabaseClient.from("aulas_presenciais").insert({
    coach_id: input.coachId,
    aluno_id: input.alunoId,
    data_hora: input.dataHoraISO,
    duracao_min: input.duracaoMin,
    local_tipo: input.localTipo,
    endereco: input.endereco || null,
    status: "agendada",
    tipo: "aula",
  });
  if (error) throw error;
}

export interface CriarEventoInput {
  coachId: string;
  titulo: string;
  dataHoraISO: string;
  duracaoMin: number;
}

/** "Registrar evento" — bloqueio de agenda simples, sem aluno vinculado. */
export async function criarEvento(input: CriarEventoInput) {
  const { error } = await supabaseClient.from("aulas_presenciais").insert({
    coach_id: input.coachId,
    aluno_id: null,
    titulo: input.titulo,
    data_hora: input.dataHoraISO,
    duracao_min: input.duracaoMin,
    local_tipo: "presencial",
    status: "agendada",
    tipo: "evento",
  });
  if (error) throw error;
}

/** Marca a aula como feita. */
export async function marcarConcluida(id: string) {
  const { error } = await supabaseClient
    .from("aulas_presenciais")
    .update({ status: "concluida", falta_de: null })
    .eq("id", id);
  if (error) throw error;
}

/** Marca a aula como não feita, guardando de quem foi a falta. */
export async function marcarFalta(id: string, faltaDe: "coach" | "aluno") {
  const { error } = await supabaseClient
    .from("aulas_presenciais")
    .update({ status: "cancelada", falta_de: faltaDe })
    .eq("id", id);
  if (error) throw error;
}

/** "Desmarcar" — exclui a aula de vez (não é uma falta, não entra em estatística). */
export async function excluirAula(id: string) {
  const { error } = await supabaseClient
    .from("aulas_presenciais")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Horário de trabalho ──────────────────────────────────────────────────

export interface HorarioTrabalhoDia {
  diaSemana: number; // 0=domingo .. 6=sábado
  ativo: boolean;
  horaInicio: string; // "HH:mm"
  horaFim: string;
}

const DEFAULT_HORARIO: Omit<HorarioTrabalhoDia, "diaSemana"> = {
  ativo: false,
  horaInicio: "08:00",
  horaFim: "18:00",
};

export async function fetchHorarioTrabalho(coachId: string): Promise<HorarioTrabalhoDia[]> {
  const { data, error } = await supabaseClient
    .from("coach_horario_trabalho")
    .select("dia_semana, ativo, hora_inicio, hora_fim")
    .eq("coach_id", coachId);

  if (error) {
    console.warn("[agenda] fetchHorarioTrabalho:", error.message);
  }

  const byDia = new Map<number, HorarioTrabalhoDia>();
  (data ?? []).forEach((row) => {
    byDia.set(row.dia_semana, {
      diaSemana: row.dia_semana,
      ativo: row.ativo,
      horaInicio: (row.hora_inicio as string).slice(0, 5),
      horaFim: (row.hora_fim as string).slice(0, 5),
    });
  });

  // Sempre retorna os 7 dias (0..6), mesmo sem linha salva ainda
  return Array.from({ length: 7 }, (_, dia) => byDia.get(dia) ?? { diaSemana: dia, ...DEFAULT_HORARIO });
}

export async function salvarHorarioTrabalho(coachId: string, dias: HorarioTrabalhoDia[]) {
  const rows = dias.map((d) => ({
    coach_id: coachId,
    dia_semana: d.diaSemana,
    ativo: d.ativo,
    hora_inicio: d.horaInicio,
    hora_fim: d.horaFim,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabaseClient
    .from("coach_horario_trabalho")
    .upsert(rows, { onConflict: "coach_id,dia_semana" });
  if (error) throw error;
}
