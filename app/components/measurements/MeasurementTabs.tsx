'use client';

import { PeriodSelect } from '@/app/components/ui/PeriodSelect';
import type { MeasurementMetricId } from '@/lib/measurements/types';
import { MEASUREMENT_METRICS } from '@/lib/measurements/types';

const METRIC_OPTIONS = MEASUREMENT_METRICS.map((m) => ({
  value: m.id,
  label: m.label,
}));

interface MeasurementTabsProps {
  selected: MeasurementMetricId;
  onChange: (id: MeasurementMetricId) => void;
  className?: string;
}

/** Seletor de métrica — padrão PeriodSelect (variante título) */
export function MeasurementTabs({
  selected,
  onChange,
  className,
}: MeasurementTabsProps) {
  return (
    <PeriodSelect
      className={className}
      variant="title"
      align="left"
      value={selected}
      options={METRIC_OPTIONS}
      onChange={(v) => onChange(v as MeasurementMetricId)}
      aria-label="Selecionar medida"
    />
  );
}
