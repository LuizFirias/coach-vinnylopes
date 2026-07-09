import type { MeasurementMetricId } from '@/lib/measurements/types';
import { MEASUREMENT_COLORS, MEASUREMENT_METRICS } from '@/lib/measurements/types';
import { cn } from '@/lib/utils/cn';

interface MeasurementTabsProps {
  selected: MeasurementMetricId;
  onChange: (id: MeasurementMetricId) => void;
}

export function MeasurementTabs({ selected, onChange }: MeasurementTabsProps) {
  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
      {MEASUREMENT_METRICS.map((metric) => (
        <button
          key={metric.id}
          type="button"
          onClick={() => onChange(metric.id)}
          className={cn(
            'shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-colors',
          )}
          style={
            selected === metric.id
              ? {
                  backgroundColor: MEASUREMENT_COLORS.primary,
                  borderColor: MEASUREMENT_COLORS.primary,
                  color: '#fff',
                }
              : {
                  backgroundColor: MEASUREMENT_COLORS.tabBg,
                  borderColor: MEASUREMENT_COLORS.tabBorder,
                  color: '#555',
                }
          }
        >
          {metric.label}
        </button>
      ))}
    </div>
  );
}
