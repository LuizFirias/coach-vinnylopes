import { DeltaLine } from '@/app/components/measurements/DeltaLine';
import { MeasurementLineChart } from '@/app/components/measurements/MeasurementLineChart';
import { PeriodSelector } from '@/app/components/measurements/PeriodSelector';
import type { MeasurementPeriod } from '@/lib/measurements/types';
import { splitValueParts } from '@/lib/measurements/helpers';
import { cn } from '@/lib/utils/cn';

interface MeasurementCurrentCardProps {
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
        <div className="mb-1 flex items-end justify-between gap-3">
          {parts ? (
            <div className="flex items-end gap-1 min-w-0">
              <span
                className={cn(
                  'font-black leading-none tabular-nums lining-nums text-text-primary',
                  isDesktop ? 'text-[80px]' : 'text-[64px]',
                )}
                style={{ letterSpacing: 'var(--tracking-display, -0.03em)' }}
              >
                {parts.whole}
              </span>
              <span
                className={cn(
                  'font-bold tabular-nums lining-nums text-text-primary mb-2',
                  isDesktop ? 'text-[36px]' : 'text-[28px]',
                )}
                style={{ letterSpacing: 'var(--tracking-headline, -0.02em)' }}
              >
                .{parts.decimal}
              </span>
              <span
                className={cn(
                  'font-bold text-brand mb-2.5 ml-1',
                  isDesktop ? 'text-[28px]' : 'text-[22px]',
                )}
              >
                {unit}
              </span>
            </div>
          ) : (
            <p className="text-[32px] font-black text-text-muted">—</p>
          )}

          <PeriodSelector
            selected={period}
            onChange={onPeriodChange}
            className="mb-3"
          />
        </div>

        {lastUpdated && (
          <p className="mt-1 text-[11px] text-text-muted">{lastUpdated}</p>
        )}

        <DeltaLine delta={delta} label={deltaLabel} unit={unit} />
      </div>

      {showChart && <MeasurementLineChart data={chartData} isDesktop={isDesktop} />}
    </div>
  );
}
