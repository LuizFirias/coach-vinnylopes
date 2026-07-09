import type { MeasurementPeriod } from '@/lib/measurements/types';
import { cn } from '@/lib/utils/cn';

const PERIODS: MeasurementPeriod[] = ['7d', '30d', '90d', '1a'];

interface PeriodSelectorProps {
  selected: MeasurementPeriod;
  onChange: (period: MeasurementPeriod) => void;
  className?: string;
}

export function PeriodSelector({ selected, onChange, className }: PeriodSelectorProps) {
  return (
    <div className={cn('flex items-center gap-1 shrink-0', className)}>
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
            selected === p
              ? 'bg-brand font-semibold text-white'
              : 'bg-transparent text-text-muted [@media(hover:hover)]:hover:text-text-secondary',
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

export { PERIODS };
