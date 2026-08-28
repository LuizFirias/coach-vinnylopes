/** Tipos de prescrição de ficha (JSONB configuracao.exercicios) */

export interface SeriePrescricao {
  ordem: number;
  reps?: number | string | null;
  reps_sugerido?: number | string | null;
  peso?: number | null;
  peso_sugerido?: number | null;
  tempo?: string | null;
  tempo_sugerido?: string | null;
  distancia?: number | null;
  distancia_sugerida?: number | null;
  tecnica?: string | null;
  tecnica_extra?: string | null;
  tecnica2?: string | null;
  /** Cluster Set — reps de cada bloco, na ordem (ex.: [6,4,2]). */
  cluster_reps_list?: number[] | null;
  /** @deprecated mantido só por retrocompat de leitura */
  cluster_qtd?: number | null;
  /** @deprecated mantido só por retrocompat de leitura */
  cluster_reps?: number | null;
  cluster_descanso_seg?: number | null;
  /** Myo Reps — reps da série de ativação. */
  myo_ativacao_reps?: number | null;
  /** Myo Reps — reps de cada mini-série, na ordem. */
  myo_reps_list?: number[] | null;
  myo_descanso_seg?: number | null;
}

export interface BiSetHalfPrescricao {
  exercicio_id: string;
  nome: string;
  tipo_exercicio?: string;
  video_url?: string;
  observacoes?: string;
  series: SeriePrescricao[];
}

export interface ExercicioSimplesPrescricao {
  id: string;
  tipo?: "simples";
  nome: string;
  tipo_exercicio?: string;
  descanso?: string;
  descanso_segundos?: number;
  video_url?: string;
  observacoes?: string;
  series: SeriePrescricao[];
  /** legado */
  biset_parceiro_id?: string;
}

export interface BiSetGroupPrescricao {
  id: string;
  tipo: "biset";
  descanso?: string;
  descanso_segundos?: number;
  exercicioA: BiSetHalfPrescricao;
  exercicioB: BiSetHalfPrescricao;
}

export type ExercicioPrescricao = ExercicioSimplesPrescricao | BiSetGroupPrescricao;

export function isBiSetPrescricao(ex: ExercicioPrescricao): ex is BiSetGroupPrescricao {
  return (ex as BiSetGroupPrescricao).tipo === "biset";
}

/** Estado de execução do Bi-Set */
export type BiSetFase = "executando_a" | "transicao" | "executando_b";

export interface BiSetExecutionState {
  blockIdx: number;
  rodada: number;
  fase: BiSetFase;
  isFinalRodada: boolean;
}
