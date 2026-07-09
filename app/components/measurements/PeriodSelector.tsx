import type { MeasurementPeriod } from '@/lib/measurements/types';
import { MEASUREMENT_COLORS } from '@/lib/measurements/types';
import { cn } from '@/lib/utils/cn';

const PERIODS: MeasurementPeriod[] = ['7d', '30d', '90d', '1a'];

interface PeriodSelectorProps {
  selected: MeasurementPeriod;
  onChange: (period: MeasurementPeriod) => void;
}

export function PeriodSelector({ selected, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {[['7d', '30d'], ['90d', '1a']].map((row) => (
        <div key={row.join('-')} className="flex gap-0.5">
          {row.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p as MeasurementPeriod)}
              className={cn(
                'rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors',
                selected === p ? 'text-white' : '',
              )}
              style={{
                backgroundColor: selected === p ? MEASUREMENT_COLORS.primary : MEASUREMENT_COLORS.periodBtn,
                color: selected === p ? '#fff' : MEASUREMENT_COLORS.textSecondary,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export { PERIODS };
