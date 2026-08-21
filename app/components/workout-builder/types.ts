export interface SerieDefinicao {
  ordem: number;
  reps_sugerido?: string | number;
  tempo_sugerido?: string;
  distancia_sugerida?: number;
  peso_sugerido?: number | null;
  tecnica?: string;
  tecnica_extra?: string;

  // Cluster Set — só usado quando tecnica ou tecnica_extra === "Cluster Set"
  cluster_qtd?: number;
  cluster_reps?: number;
  cluster_descanso_seg?: number;
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
