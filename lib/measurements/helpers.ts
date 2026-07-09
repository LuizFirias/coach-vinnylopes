import type { MeasurementPeriod, MedicaoRecord, MeasurementMetricId } from '@/lib/measurements/types';
import { MEASUREMENT_METRICS } from '@/lib/measurements/types';

const PERIOD_DAYS: Record<MeasurementPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1a': 365,
};

export function filterByPeriod<T extends { data_medicao: string }>(
  records: T[],
  period: MeasurementPeriod,
): T[] {
  const now = Date.now();
  const ms = PERIOD_DAYS[period] * 86400000;
  return records.filter((r) => now - new Date(r.data_medicao).getTime() <= ms);
}

export function formatMeasurementDate(iso: string, short = false): string {
  const date = new Date(iso);
  if (short) {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatChartDate(iso: string, period: MeasurementPeriod): string {
  const date = new Date(iso);
  if (period === '7d' || period === '30d') {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

export function splitValueParts(value: number): { whole: string; decimal: string } {
  const fixed = value.toFixed(1);
  const [whole, decimal = '0'] = fixed.split('.');
  return { whole, decimal };
}

export function getMetricValues(
  records: MedicaoRecord[],
  metricId: MeasurementMetricId,
): Array<{ data: string; valor: number }> {
  const metric = MEASUREMENT_METRICS.find((m) => m.id === metricId)!;
  return records
    .map((r) => ({ data: r.data_medicao, valor: r[metric.key] as number | null }))
    .filter((v): v is { data: string; valor: number } => v.valor !== null && v.valor !== undefined);
}

/** Delta entre o valor mais recente e o mais antigo dentro do período */
export function computePeriodDelta(
  values: Array<{ data: string; valor: number }>,
  period: MeasurementPeriod,
): number | null {
  if (values.length === 0) return null;

  const now = Date.now();
  const ms = PERIOD_DAYS[period] * 86400000;
  const inPeriod = values.filter((v) => now - new Date(v.data).getTime() <= ms);
  const sorted = [...inPeriod].sort(
    (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
  );

  if (sorted.length === 0) return null;
  if (sorted.length === 1) return 0;

  const earliest = sorted[0].valor;
  const latest = sorted[sorted.length - 1].valor;
  const diff = latest - earliest;
  if (Math.abs(diff) < 0.05) return 0;
  return diff;
}

export function buildChartData(
  records: MedicaoRecord[],
  metricId: MeasurementMetricId,
  period: MeasurementPeriod,
): Array<{ date: string; value: number; iso: string }> {
  const metric = MEASUREMENT_METRICS.find((m) => m.id === metricId)!;
  const chronological = [...records].reverse();
  const inPeriod = filterByPeriod(chronological, period);

  return inPeriod
    .map((r) => {
      const val = r[metric.key] as number | null;
      if (val === null || val === undefined) return null;
      return {
        date: formatChartDate(r.data_medicao, period),
        value: Number(val),
        iso: r.data_medicao,
      };
    })
    .filter((d): d is { date: string; value: number; iso: string } => d !== null);
}

export function buildHistoryEntries(
  records: MedicaoRecord[],
  metricId: MeasurementMetricId,
  unit: string,
  limit?: number,
): Array<{ id: string; value: number; unit: string; date: string; delta: number | null }> {
  const metric = MEASUREMENT_METRICS.find((m) => m.id === metricId)!;
  const withValue = records
    .map((r) => ({
      id: r.id,
      value: r[metric.key] as number | null,
      date: r.data_medicao,
    }))
    .filter((r): r is { id: string; value: number; date: string } => r.value !== null);

  const entries = withValue.map((entry, index) => {
    const older = withValue[index + 1];
    let delta: number | null = null;
    if (older) {
      const diff = entry.value - older.value;
      delta = Math.abs(diff) < 0.05 ? 0 : diff;
    }
    return {
      id: entry.id,
      value: entry.value,
      unit,
      date: formatMeasurementDate(entry.date, true),
      delta,
    };
  });

  return limit ? entries.slice(0, limit) : entries;
}
