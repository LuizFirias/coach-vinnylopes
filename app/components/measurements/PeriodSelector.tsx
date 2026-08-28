'use client';

import { PeriodSelect } from '@/app/components/ui/PeriodSelect';
import type { MeasurementPeriod } from '@/lib/measurements/types';
import { cn } from '@/lib/utils/cn';

const MEASUREMENT_PERIOD_OPTIONS: { value: MeasurementPeriod; label: string }[] = [
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: '1a', label: 'Último ano' },
  { value: 'custom', label: 'Personalizado' },
];

interface PeriodSelectorProps {
  selected: MeasurementPeriod;
  onChange: (period: MeasurementPeriod) => void;
  className?: string;
}

export function PeriodSelector({ selected, onChange, className }: PeriodSelectorProps) {
  return (
    <PeriodSelect
      className={cn(className)}
      value={selected}
      options={MEASUREMENT_PERIOD_OPTIONS}
      onChange={(v) => onChange(v as MeasurementPeriod)}
      aria-label="Selecionar período"
    />
  );
}

export const PERIODS = MEASUREMENT_PERIOD_OPTIONS.map((o) => o.value);
