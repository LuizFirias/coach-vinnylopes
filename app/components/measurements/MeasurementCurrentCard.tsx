import { DeltaLine } from '@/app/components/measurements/DeltaLine';
import { MeasurementLineChart } from '@/app/components/measurements/MeasurementLineChart';
import { PeriodSelector } from '@/app/components/measurements/PeriodSelector';
import { MeasurementTabs } from '@/app/components/measurements/MeasurementTabs';
import type { MeasurementMetricId, MeasurementPeriod } from '@/lib/measurements/types';
import { splitValueParts } from '@/lib/measurements/helpers';
import { cn } from '@/lib/utils/cn';

interface MeasurementCurrentCardProps {
  metricId: MeasurementMetricId;
  onMetricChange: (id: MeasurementMetricId) => void;
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
  emptyChartMessage?: string;
}

export function MeasurementCurrentCard({
  metricId,
  onMetricChange,
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
  emptyChartMessage,
}: MeasurementCurrentCardProps) {
  const parts = value !== null ? splitValueParts(value) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <MeasurementTabs selected={metricId} onChange={onMetricChange} />
        <PeriodSelector
          selected={period}
          onChange={onPeriodChange}
          className="mt-0.5"
        />
      </div>

      <div>
        {parts ? (
          <div className="flex items-end gap-1 min-w-0">
            <span
              className={cn(
                'font-black leading-none tabular-nums lining-nums',
                isDesktop ? 'text-[80px]' : 'text-[64px]',
              )}
              style={{
                letterSpacing: 'var(--tracking-display, -0.03em)',
                color: '#1a1a1a',
              }}
            >
              {parts.whole}
            </span>
            <span
              className={cn(
                'mb-2 font-bold tabular-nums lining-nums',
                isDesktop ? 'text-[36px]' : 'text-[28px]',
              )}
              style={{
                letterSpacing: 'var(--tracking-headline, -0.02em)',
                color: '#1a1a1a',
              }}
            >
              .{parts.decimal}
            </span>
            <span
              className={cn(
                'mb-2.5 ml-1 font-bold',
                isDesktop ? 'text-[28px]' : 'text-[20px]',
              )}
              style={{ color: '#751BB4' }}
            >
              {unit}
            </span>
          </div>
        ) : (
          <p className="text-[32px] font-black text-text-disabled">—</p>
        )}

        {lastUpdated && (
          <p className="mt-1 text-[11px] text-text-tertiary">{lastUpdated}</p>
        )}

        <DeltaLine delta={delta} label={deltaLabel} unit={unit} />
      </div>

      {showChart && (
        <MeasurementLineChart
          data={chartData}
          isDesktop={isDesktop}
          emptyMessage={emptyChartMessage}
        />
      )}
    </div>
  );
}
