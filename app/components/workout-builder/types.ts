export interface SerieDefinicao {
  ordem: number;
  reps_sugerido?: string | number;
  tempo_sugerido?: string;
  distancia_sugerida?: number;
  peso_sugerido?: number | null;
  tecnica?: string;
  tecnica_extra?: string;
}

export interface ExercicioFicha {
  instanceId: string;
  id: string;
  nome: string;
  tipo_exercicio: string;
  descanso: string;
  video_url: string;
  observacoes: string;
  series: SerieDefinicao[];
  biset_parceiro_id?: string;
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
