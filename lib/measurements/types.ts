export type MeasurementPeriod = '7d' | '30d' | '90d' | '1a';

export type MeasurementMetricId =
  | 'peso'
  | 'gordura_corporal'
  | 'cintura'
  | 'peitoral'
  | 'braco_esquerdo'
  | 'braco_direito'
  | 'coxa_esquerda'
  | 'coxa_direita'
  | 'panturrilha_direita';

export interface MedicaoRecord {
  id: string;
  aluno_id: string;
  data_medicao: string;
  peso: number | null;
  gordura_corporal: number | null;
  peitoral: number | null;
  cintura: number | null;
  braco_esquerdo: number | null;
  braco_direito: number | null;
  coxa_esquerda: number | null;
  coxa_direita: number | null;
  panturrilha_direita: number | null;
  panturrilha_esquerda?: number | null;
}

export interface MeasurementMetric {
  id: MeasurementMetricId;
  label: string;
  unit: string;
  key: keyof MedicaoRecord;
}

export const MEASUREMENT_METRICS: MeasurementMetric[] = [
  { id: 'peso', label: 'Peso', unit: 'kg', key: 'peso' },
  { id: 'gordura_corporal', label: '% Gordura', unit: '%', key: 'gordura_corporal' },
  { id: 'cintura', label: 'Cintura', unit: 'cm', key: 'cintura' },
  { id: 'peitoral', label: 'Tórax', unit: 'cm', key: 'peitoral' },
  { id: 'braco_esquerdo', label: 'Braço E', unit: 'cm', key: 'braco_esquerdo' },
  { id: 'braco_direito', label: 'Braço D', unit: 'cm', key: 'braco_direito' },
  { id: 'coxa_esquerda', label: 'Coxa E', unit: 'cm', key: 'coxa_esquerda' },
  { id: 'coxa_direita', label: 'Coxa D', unit: 'cm', key: 'coxa_direita' },
  { id: 'panturrilha_direita', label: 'Panturrilha', unit: 'cm', key: 'panturrilha_direita' },
];

export const MEASUREMENT_COLORS = {
  page: '#0d0d0d',
  card: '#141414',
  input: '#1e1e1e',
  inputBorder: '#282828',
  chartBg: '#0f0f0f',
  primary: '#2b7fff',
  deltaDown: '#39c75a',
  deltaUp: '#e05555',
  text: '#ffffff',
  textSecondary: '#444444',
  textMuted: '#333333',
  textDate: '#666666',
  divider: '#1a1a1a',
  tabBg: '#1a1a1a',
  tabBorder: '#2a2a2a',
  periodBtn: '#1e1e1e',
} as const;
