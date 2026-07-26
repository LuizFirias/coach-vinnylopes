import type { MeasurementMetricId } from '@/lib/measurements/types';
import { MEASUREMENT_METRICS } from '@/lib/measurements/types';
import { cn } from '@/lib/utils/cn';

interface MeasurementTabsProps {
  selected: MeasurementMetricId;
  onChange: (id: MeasurementMetricId) => void;
}

export function MeasurementTabs({ selected, onChange }: MeasurementTabsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide snap-x snap-mandatory">
      {MEASUREMENT_METRICS.map((metric) => {
        const isActive = selected === metric.id;
        return (
          <button
            key={metric.id}
            type="button"
            onClick={() => onChange(metric.id)}
            style={{ touchAction: 'manipulation' }}
            className={cn(
              'shrink-0 snap-start rounded-[8px] px-3 py-1.5 text-[12px] font-semibold transition-colors',
              isActive
                ? 'bg-brand text-white'
                : 'bg-[rgba(255,255,255,0.04)] text-text-tertiary border border-card [@media(hover:hover)]:hover:text-text-secondary',
            )}
            aria-pressed={isActive}
          >
            {metric.label}
          </button>
        );
      })}
    </div>
  );
}
