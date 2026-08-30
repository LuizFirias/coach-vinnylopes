export interface SerieDefinicao {
  ordem: number;
  reps_sugerido?: string | number;
  tempo_sugerido?: string;
  distancia_sugerida?: number;
  peso_sugerido?: number | null;
  tecnica?: string;
  tecnica_extra?: string;

  // Cluster Set — só usado quando tecnica ou tecnica_extra === "Cluster Set"
  /** Reps de cada bloco do cluster, na ordem (ex.: [6,4,2] → "6×4×2") — fonte de verdade atual. */
  cluster_reps_list?: number[];
  /** @deprecated mantido só por retrocompat de leitura — cluster_reps_list.length */
  cluster_qtd?: number;
  /** @deprecated mantido só por retrocompat de leitura — usar cluster_reps_list */
  cluster_reps?: number;
  cluster_descanso_seg?: number;

  // Myo Reps — só usado quando tecnica ou tecnica_extra === "Myo Reps"
  /** Reps da série de ativação (a 1ª, quase até a falha — ex.: 15). */
  myo_ativacao_reps?: number;
  /** Reps de cada mini-série depois da ativação, na ordem (ex.: [5,5,4]). */
  myo_reps_list?: number[];
  /** Descanso curto entre as mini-séries (tipicamente 10-20s). */
  myo_descanso_seg?: number;
}

export interface ExercicioFicha {
  instanceId: string;
  id: string;
  nome: string;
  tipo_exercicio: string;
  descanso: string;
  video_url: string;
  gif_url?: string;
  gif_url_feminino?: string;
  imagem_url?: string;
  imagem_url_feminino?: string;
  observacoes: string;
  series: SerieDefinicao[];
  biset_parceiro_id?: string;
  /** Segue a pré-configuração global de SET/REPS — false assim que o coach ajusta esse exercício na mão. */
  usaPreConfig?: boolean;
}

export interface ColunaSerie {
  key: keyof SerieDefinicao | string;
  label: string;
  type: "text" | "number" | "select";
  placeholder?: string;
  step?: number;
  timeInput?: boolean;
  options?: string[];
}
