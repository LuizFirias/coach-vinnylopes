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
    <div className={cn('flex items-center shrink-0', className)}>
      {PERIODS.map((p, i) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          style={{ touchAction: 'manipulation' }}
          className={cn(
            'text-[12px] font-semibold transition-colors px-2.5',
            i > 0 && 'border-l border-[#282828]',
            i === 0 && 'pl-0',
            selected === p
              ? 'text-brand'
              : 'text-text-disabled [@media(hover:hover)]:hover:text-text-tertiary',
          )}
          aria-pressed={selected === p}
          aria-label={`Período de ${p}`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

export { PERIODS };
