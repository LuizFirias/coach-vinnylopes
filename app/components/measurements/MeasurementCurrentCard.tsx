import { DeltaLine } from '@/app/components/measurements/DeltaLine';
import { MeasurementLineChart } from '@/app/components/measurements/MeasurementLineChart';
import { PeriodSelector } from '@/app/components/measurements/PeriodSelector';
import type { MeasurementPeriod } from '@/lib/measurements/types';
import { MEASUREMENT_COLORS } from '@/lib/measurements/types';
import { splitValueParts } from '@/lib/measurements/helpers';

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
}: MeasurementCurrentCardProps) {
  const parts = value !== null ? splitValueParts(value) : null;

  return (
    <div
      className="mb-2.5 rounded-[14px] p-4"
      style={{ backgroundColor: MEASUREMENT_COLORS.card }}
    >
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-[11px]" style={{ color: MEASUREMENT_COLORS.textSecondary }}>
            {label}
          </p>

          {parts ? (
            <div className="flex items-baseline">
              <span
                className="text-[48px] font-black leading-[50px] tracking-[-2px]"
                style={{ color: MEASUREMENT_COLORS.text }}
              >
                {parts.whole}
                <span className="text-[28px] font-black">.{parts.decimal}</span>
              </span>
              <span
                className="mb-1.5 ml-1 self-end text-[20px] font-bold"
                style={{ color: MEASUREMENT_COLORS.primary }}
              >
                {unit}
              </span>
            </div>
          ) : (
            <p className="text-[32px] font-black" style={{ color: MEASUREMENT_COLORS.textSecondary }}>
              —
            </p>
          )}

          {lastUpdated && (
            <p className="mt-0.5 text-[10px]" style={{ color: MEASUREMENT_COLORS.textMuted }}>
              {lastUpdated}
            </p>
          )}

          <DeltaLine delta={delta} label={deltaLabel} unit={unit} />
        </div>

        <PeriodSelector selected={period} onChange={onPeriodChange} />
      </div>

      <MeasurementLineChart data={chartData} />
    </div>
  );
}
