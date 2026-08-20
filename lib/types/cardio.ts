import type { CardioIntensidade, ZonaFC } from '@/lib/constants/cardio';

export interface CardioSessao {
  id: string;
  aluno_id: string;
  prescricao_id: string | null;
  modalidade: string;
  data: string;
  duracao_min: number;
  fc_media: number | null;
  distancia_km: number | null;
  rpe: number | null;
  kcal_calculado: number | null;
  kcal_origem: 'fc' | 'met' | 'manual' | null;
  peso_usado: number | null;
  idade_usada: number | null;
  zona_fc: ZonaFC | null;
  velocidade_kmh: number | null;
  inclinacao_pct: number | null;
  nivel_resistencia: number | null;
  observacao: string | null;
  created_at: string;
}

export interface CardioPrescricao {
  id: string;
  coach_id: string;
  aluno_id: string;
  modalidade: string;
  duracao_min: number;
  intensidade: CardioIntensidade | null;
  fc_alvo_min: number | null;
  fc_alvo_max: number | null;
  distancia_alvo_km: number | null;
  velocidade_alvo_kmh: number | null;
  inclinacao_alvo_pct: number | null;
  nivel_resistencia_alvo: number | null;
  observacao: string | null;
  dias_semana: number[] | null;
  ativo: boolean;
  created_at: string;
}

export interface CardioKpis {
  kcalSemana: number;
  sessoesSemana: number;
  duracaoMediaMin: number;
}
