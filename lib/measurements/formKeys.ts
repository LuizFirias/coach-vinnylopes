import type { MeasurementMetricId } from '@/lib/measurements/types';

export type MeasurementFormKey =
  | 'peso'
  | 'gordura_corporal'
  | 'peitoral'
  | 'cintura'
  | 'braco_esq'
  | 'braco_dir'
  | 'coxa_esq'
  | 'coxa_dir'
  | 'panturrilha';

export function mapMetricaToFormKey(metricId: MeasurementMetricId): MeasurementFormKey {
  if (metricId === 'gordura_corporal') return 'gordura_corporal';
  if (metricId === 'braco_esquerdo') return 'braco_esq';
  if (metricId === 'braco_direito') return 'braco_dir';
  if (metricId === 'coxa_esquerda') return 'coxa_esq';
  if (metricId === 'coxa_direita') return 'coxa_dir';
  if (metricId === 'panturrilha_direita') return 'panturrilha';
  return metricId as MeasurementFormKey;
}
