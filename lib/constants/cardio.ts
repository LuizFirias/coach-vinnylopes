export const CARDIO_MODALIDADES = [
  'Corrida',
  'Caminhada',
  'Bike',
  'Elíptico',
  'Natação',
  'Pular corda',
  'Remo',
  'Escada (step)',
  'Personalizado',
] as const;

export type CardioModalidade = (typeof CARDIO_MODALIDADES)[number];

export const CARDIO_INTENSIDADES = [
  { value: 'leve', label: 'Leve', zonas: ['Z1', 'Z2'], pct: '50–70%' },
  { value: 'moderada', label: 'Moderada', zonas: ['Z2', 'Z3'], pct: '60–80%' },
  { value: 'intensa', label: 'Intensa', zonas: ['Z4', 'Z5'], pct: '80–100%' },
] as const;

export type CardioIntensidade = (typeof CARDIO_INTENSIDADES)[number]['value'];

export const ZONAS_FC = {
  Z1: { nome: 'Recuperação', pctMin: 50, pctMax: 60, cor: '#7a8aab' },
  Z2: { nome: 'Base aeróbica', pctMin: 60, pctMax: 70, cor: '#39c75a' },
  Z3: { nome: 'Aeróbico', pctMin: 70, pctMax: 80, cor: '#f59e0b' },
  Z4: { nome: 'Limiar', pctMin: 80, pctMax: 90, cor: '#e05555' },
  Z5: { nome: 'Máximo', pctMin: 90, pctMax: 100, cor: '#e05555' },
} as const;

export type ZonaFC = keyof typeof ZONAS_FC;

export const RPE_LABELS: Record<number, string> = {
  1: 'Muito leve',
  2: 'Leve',
  3: 'Moderado leve',
  4: 'Moderado',
  5: 'Moderado intenso',
  6: 'Intenso',
  7: 'Muito intenso',
  8: 'Muito difícil',
  9: 'Extremamente difícil',
  10: 'Máximo esforço',
};

export const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

/** Peso assumido quando o aluno ainda não registrou nenhuma medida. */
export const CARDIO_PESO_FALLBACK_KG = 70;
