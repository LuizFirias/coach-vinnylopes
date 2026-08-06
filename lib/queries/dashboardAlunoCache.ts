/**
 * Snapshot do dashboard do aluno entre remounts (BottomNav).
 * Evita refetch completo de KPIs/agenda a cada volta ao Início.
 */
import type { DiaSemana } from '@/app/components/dashboard/home/WeekCalendar';

export type DashboardAlunoSnapshot = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  coachId: string | null;
  coachInfo: { nome: string; avatar: string | null } | null;
  coachContactAvailable: boolean;
  coachPendings: { mensagens: number; feedbacks: number };
  incompleteData: boolean;
  kpis: {
    volume_semana_kg: number;
    volume_delta_pct: number | null;
    peso_atual_kg: number | null;
    peso_delta_kg: number | null;
    treinos_mes: number;
    treinos_delta: number;
    streak_atual: number;
  } | null;
  diasSemana: DiaSemana[];
  /** Resumo da semana ISO corrente (segunda a domingo) — zera toda segunda-feira. */
  weekStats: { treinos: number; meta: number; cardioMin: number; cardioMetaMin: number };
  treinoHoje: {
    status: 'pendente' | 'concluido' | 'off' | 'sem-plano';
    nome?: string;
    fichaId?: string;
    qtdExercicios?: number;
  } | null;
  planoNutricao: {
    nome: string;
    refeicoesConcluidas: number;
    totalRefeicoes: number;
    proximaRefeicao?: { nome: string; horario: string } | null;
  } | null;
  agua: { id: string | null; copos: number; ml_por_copo: number };
  parceiros: Array<{
    id: string;
    nome_marca: string;
    descricao?: string;
    cupom?: string;
    link_desconto?: string;
    logo_url?: string | null;
    imagens?: string[] | null;
  }>;
  availableWorkouts: Array<{
    id: string;
    name: string;
    type: 'ficha' | 'pdf' | 'manual';
  }>;
  fetchedAt: number;
};

const TTL_MS = 45_000;
let snapshot: DashboardAlunoSnapshot | null = null;

export function peekDashboardAlunoCache(userId: string): DashboardAlunoSnapshot | null {
  if (!snapshot || snapshot.userId !== userId) return null;
  if (Date.now() - snapshot.fetchedAt >= TTL_MS) return null;
  return snapshot;
}

export function setDashboardAlunoCache(next: Omit<DashboardAlunoSnapshot, 'fetchedAt'>) {
  snapshot = { ...next, fetchedAt: Date.now() };
}

export function invalidateDashboardAlunoCache(userId?: string) {
  if (!userId || snapshot?.userId === userId) snapshot = null;
}

export function patchDashboardAlunoCache(
  userId: string,
  patch: Partial<Omit<DashboardAlunoSnapshot, 'userId' | 'fetchedAt'>>,
) {
  if (!snapshot || snapshot.userId !== userId) return;
  snapshot = { ...snapshot, ...patch, fetchedAt: snapshot.fetchedAt };
}
