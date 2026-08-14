import type { DiaSemana } from "@/app/components/dashboard/home/WeekCalendar";
import { getTodayBrazil } from "@/lib/dateUtils";

const WEEKDAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

/** Dados de demonstração — espelham a dashboard real do aluno. */
export const DADOS_PREVIEW_ALUNO = {
  nome: "João",
  /** Treino do dia (card principal) */
  treinoHoje: {
    status: "pendente" as const,
    nome: "Upper A — Peito e Ombro",
    qtdExercicios: 6,
    checkinPontos: 50,
  },
  /** Nutrição: 2 de 4 refeições */
  nutricao: {
    nome: "Plano definição — fase 1",
    refeicoesFeitasHoje: 2,
    totalRefeicoes: 4,
    proximaRefeicao: { nome: "Almoço", horario: "12:30" },
  },
  /**
   * Água: 1,5 L de 3 L (3 × 500 ml / 6 × 500 ml).
   * Hero e HydrationCard usam copos.
   */
  agua: {
    copos: 3,
    mlPorCopo: 500,
    metaCopos: 6,
  },
  streak: {
    sequenciaDias: 3,
    treinosSemana: 2,
    metaSemana: 4,
  },
  hero: {
    /** Hoje: treino pendente → 0/1 */
    treinos: { atual: 0, meta: 1 },
    /** Cardio da semana (minutos) */
    cardio: { atual: 20, meta: 40 },
  },
};

/**
 * Janela rolável igual à dashboard do aluno: ontem + dias à frente,
 * com treinos fictícios já marcados nesta semana.
 */
export function buildPreviewDiasSemana(count = 16): DiaSemana[] {
  const todayStr = getTodayBrazil();
  const today = new Date(`${todayStr}T12:00:00`);

  const dias: DiaSemana[] = [];
  for (let i = -1; i < count - 1; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const isoDate = `${year}-${month}-${day}`;
    const isHoje = isoDate === todayStr;

    // Padrão demo: treino em dias ímpares do offset, descanso em pares;
    // ontem concluído; hoje pendente com ficha; amanhã programado.
    let temTreino = false;
    let treinoConcluido = false;
    let isOff = false;
    let isCardio = false;
    let nomeRotina: string | undefined;

    if (i === -1) {
      temTreino = true;
      treinoConcluido = true;
      nomeRotina = "Lower A";
    } else if (i === 0) {
      temTreino = true;
      treinoConcluido = false;
      nomeRotina = DADOS_PREVIEW_ALUNO.treinoHoje.nome;
    } else if (i === 1) {
      isOff = true;
    } else if (i === 2) {
      temTreino = true;
      nomeRotina = "Upper B";
    } else if (i === 3) {
      isCardio = true;
    } else if (i % 3 === 0) {
      temTreino = true;
      nomeRotina = "Full body";
    } else {
      isOff = true;
    }

    dias.push({
      data: isoDate,
      label: WEEKDAY_LABELS[d.getDay()],
      mesLabel: d
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", "")
        .toUpperCase(),
      numero: d.getDate(),
      isHoje,
      treinoConcluido,
      temTreino,
      isOff: isOff || undefined,
      isCardio: isCardio || undefined,
      nomeRotina,
    });
  }
  return dias;
}
