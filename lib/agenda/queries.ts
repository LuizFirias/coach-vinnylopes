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
  "id, coach_id, aluno_id, data_hora, duracao_min, local_tipo, endereco, status, tipo, titulo, aluno:profiles!aluno_id(id, full_name, coaching_reference, avatar_url, sexo)";

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

/** Lista de aulas futuras (card "Próximas aulas agendadas"). */
export async function fetchAulasFuturas(coachId: string): Promise<AulaAgenda[]> {
  const { data, error } = await supabaseClient
    .from("aulas_presenciais")
    .select(AULA_SELECT)
    .eq("coach_id", coachId)
    .eq("status", "agendada")
    .eq("tipo", "aula")
    .gte("data_hora", new Date().toISOString())
    .order("data_hora", { ascending: true })
    .limit(100);

  if (error) {
    console.warn("[agenda] fetchAulasFuturas:", error.message);
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
  const { data, error } = await supabaseClient
    .from("aulas_presenciais")
    .select(AULA_SELECT)
    .eq("coach_id", coachId)
    .neq("status", "cancelada")
    .gte("data_hora", startISO)
    .lt("data_hora", endISO)
    .order("data_hora", { ascending: true });

  if (error) {
    console.warn("[agenda] fetchAgendaRange:", error.message);
    return [];
  }
  return (data as unknown as AulaAgenda[]) ?? [];
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

export async function cancelarAula(id: string) {
  const { error } = await supabaseClient
    .from("aulas_presenciais")
    .update({ status: "cancelada" })
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
