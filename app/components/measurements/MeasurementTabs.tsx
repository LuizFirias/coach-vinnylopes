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
      {MEASUREMENT_METRICS.map((metric) => (
        <button
          key={metric.id}
          type="button"
          onClick={() => onChange(metric.id)}
          className={cn(
            'shrink-0 snap-start rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
            selected === metric.id
              ? 'bg-brand font-semibold text-white'
              : 'bg-transparent text-text-muted [@media(hover:hover)]:hover:text-text-secondary',
          )}
        >
          {metric.label}
        </button>
      ))}
    </div>
  );
}
