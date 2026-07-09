import { DeltaLine } from '@/app/components/measurements/DeltaLine';
import { MeasurementLineChart } from '@/app/components/measurements/MeasurementLineChart';
import { PeriodSelector } from '@/app/components/measurements/PeriodSelector';
import type { MeasurementPeriod } from '@/lib/measurements/types';
import { splitValueParts } from '@/lib/measurements/helpers';
import { cn } from '@/lib/utils/cn';

interface MeasurementCurrentCardProps {
  label: string;
  value: number | null;
  unit: string;
  lastUpdated: string | null;
  delta: number | null;
  deltaLabel?: string;
  period: MeasurementPeriod;
  onPeriodChange: (period: MeasurementPeriod) => void;
  chartData: Array<{ date: string; value: number }>;
  isDesktop?: boolean;
  showChart?: boolean;
}

export function MeasurementCurrentCard({
  label,
  value,
  unit,
  lastUpdated,
  delta,
  deltaLabel = 'no período',
  period,
  onPeriodChange,
  chartData,
  isDesktop = false,
  showChart = true,
}: MeasurementCurrentCardProps) {
  const parts = value !== null ? splitValueParts(value) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">
            {label}
          </p>
          <PeriodSelector selected={period} onChange={onPeriodChange} />
        </div>

        {parts ? (
          <div className="flex items-baseline">
            <span
              className={cn(
                'font-black tracking-[-2px] text-text-primary leading-none',
                isDesktop ? 'text-[80px]' : 'text-[64px]',
              )}
            >
              {parts.whole}
              <span className={cn('font-black', isDesktop ? 'text-[52px]' : 'text-[40px]')}>
                .{parts.decimal}
              </span>
            </span>
            <span
              className={cn(
                'ml-1.5 self-end font-bold text-brand',
                isDesktop ? 'text-4xl mb-2' : 'text-[28px] mb-1',
              )}
            >
              {unit}
            </span>
          </div>
        ) : (
          <p className="text-[32px] font-black text-text-muted">—</p>
        )}

        {lastUpdated && (
          <p className="mt-1 text-[11px] text-text-muted">{lastUpdated}</p>
        )}

        <DeltaLine delta={delta} label={deltaLabel} unit={unit} />
      </div>

      {showChart && <MeasurementLineChart data={chartData} isDesktop={isDesktop} />}
    </div>
  );
}
