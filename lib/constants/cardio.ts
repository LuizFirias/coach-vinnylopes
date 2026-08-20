/** Grupos para o select do formulário do aluno */
export const MODALIDADES_CARDIO = [
  {
    grupo: 'Cardio tradicional',
    itens: [
      'Corrida',
      'Caminhada',
      'Natação',
      'Pular corda',
      'Escada (step)',
      'Stand up paddle',
      'Ciclismo (rua/MTB)',
      'Personalizado',
    ],
  },
  {
    grupo: 'Máquinas',
    itens: [
      'Esteira (corrida)',
      'Esteira (caminhada)',
      'Bike',
      'Elíptico',
      'Remo',
      'Simulador de escada',
    ],
  },
  {
    grupo: 'Esportes',
    itens: [
      'Beach tennis',
      'Futevôlei',
      'Vôlei',
      'Futsal',
      'Basquete',
      'Handebol',
      'Tênis',
      'Padel',
      'Squash',
      'Jiu-jitsu',
      'Muay thai',
      'Boxe',
      'Natação (esporte)',
      'Ciclismo (esporte)',
    ],
  },
  {
    grupo: 'Outros',
    itens: [
      'Dança',
      'Yoga',
      'Pilates',
      'Funcional',
      'CrossFit',
      'HYROX',
      'Spinning (aula)',
      'Escalada indoor',
      'Outro',
    ],
  },
] as const;

/** Lista plana usada na prescrição do coach (cardio tradicional) */
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

/** Quais campos extras cada modalidade aceita — decide o que o formulário exibe. */
export interface CardioCampos {
  distancia?: boolean;
  velocidade?: boolean;
  inclinacao?: boolean;
  /** Nível de resistência da máquina, 1–20 */
  resistencia?: boolean;
}

export const CARDIO_CAMPOS: Record<string, CardioCampos> = {
  // Cardio tradicional
  'Corrida': { distancia: true },
  'Caminhada': { distancia: true },
  'Natação': { distancia: true },
  'Pular corda': {},
  'Escada (step)': {},
  'Stand up paddle': { distancia: true },
  'Ciclismo (rua/MTB)': { distancia: true },
  'Personalizado': { distancia: true },
  // Máquinas
  'Esteira (corrida)': { distancia: true, velocidade: true, inclinacao: true },
  'Esteira (caminhada)': { distancia: true, velocidade: true, inclinacao: true },
  'Bike': { distancia: true, resistencia: true },
  'Elíptico': { distancia: true, resistencia: true },
  'Remo': { distancia: true, resistencia: true },
  'Simulador de escada': { resistencia: true },
  // Esportes — só as com deslocamento medido têm distância
  'Natação (esporte)': { distancia: true },
  'Ciclismo (esporte)': { distancia: true },
  // Outros
  'HYROX': { distancia: true },
  'Spinning (aula)': { resistencia: true },
};

/** Fallback pra modalidade sem entrada explícita em CARDIO_CAMPOS (ex.: esportes de quadra). */
export const CARDIO_CAMPOS_DEFAULT: CardioCampos = {};

/**
 * MET por modalidade (leve/moderada/intensa) — aproximação do Compêndio de Atividades
 * Físicas (Ainsworth et al.). Usado só quando não há FC média informada (ver calcKcalMet
 * em lib/utils/cardio.ts) — a faixa é escolhida pelo RPE do aluno.
 */
export const MET_POR_MODALIDADE: Record<
  string,
  { leve: number; moderada: number; intensa: number }
> = {
  'Corrida': { leve: 6, moderada: 8.3, intensa: 11 },
  'Caminhada': { leve: 2.5, moderada: 3.5, intensa: 5 },
  'Natação': { leve: 5, moderada: 7, intensa: 10 },
  'Pular corda': { leve: 8, moderada: 10, intensa: 12.3 },
  'Stand up paddle': { leve: 3, moderada: 5, intensa: 7 },
  'Ciclismo (rua/MTB)': { leve: 6, moderada: 8, intensa: 12 },
  'Personalizado': { leve: 4, moderada: 6, intensa: 9 },
  'Esteira (corrida)': { leve: 6, moderada: 8.3, intensa: 11 },
  'Esteira (caminhada)': { leve: 2.8, moderada: 3.8, intensa: 5.5 },
  'Bike': { leve: 5.5, moderada: 7, intensa: 10.5 },
  'Elíptico': { leve: 5, moderada: 7, intensa: 9 },
  'Remo': { leve: 4.8, moderada: 7, intensa: 8.5 },
  'Escada (step)': { leve: 5, moderada: 8, intensa: 10 },
  'Simulador de escada': { leve: 5, moderada: 9, intensa: 15 },
  'Beach tennis': { leve: 6, moderada: 7, intensa: 8 },
  'Futevôlei': { leve: 6, moderada: 8, intensa: 10 },
  'Vôlei': { leve: 3, moderada: 4, intensa: 6 },
  'Futsal': { leve: 5, moderada: 7, intensa: 9.5 },
  'Basquete': { leve: 4.5, moderada: 6.5, intensa: 8.5 },
  'Handebol': { leve: 6, moderada: 8, intensa: 10 },
  'Tênis': { leve: 5, moderada: 7, intensa: 8 },
  'Padel': { leve: 4.5, moderada: 6, intensa: 7.5 },
  'Squash': { leve: 7, moderada: 10, intensa: 12 },
  'Jiu-jitsu': { leve: 6, moderada: 10, intensa: 13 },
  'Muay thai': { leve: 6, moderada: 9, intensa: 12.5 },
  'Boxe': { leve: 6, moderada: 9, intensa: 12.8 },
  'Natação (esporte)': { leve: 6, moderada: 8, intensa: 10.5 },
  'Ciclismo (esporte)': { leve: 6, moderada: 10, intensa: 15.8 },
  'Dança': { leve: 3, moderada: 4.8, intensa: 7 },
  'Yoga': { leve: 2, moderada: 2.5, intensa: 4 },
  'Pilates': { leve: 2.5, moderada: 3, intensa: 4 },
  'Funcional': { leve: 4, moderada: 6, intensa: 8 },
  'CrossFit': { leve: 5, moderada: 8, intensa: 12 },
  'HYROX': { leve: 6, moderada: 9, intensa: 13 },
  'Spinning (aula)': { leve: 5.5, moderada: 7.5, intensa: 10 },
  'Escalada indoor': { leve: 4, moderada: 6, intensa: 8 },
};

/** Fallback pra modalidade sem MET tabelado (ex.: "Outro"). */
export const MET_DEFAULT = { leve: 3.5, moderada: 5, intensa: 7 };

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
