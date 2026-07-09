'use client';

import { MEASUREMENT_COLORS } from '@/lib/measurements/types';

interface ChartPoint {
  date: string;
  value: number;
}

interface MeasurementLineChartProps {
  data: ChartPoint[];
  height?: number;
}

export function MeasurementLineChart({ data, height = 56 }: MeasurementLineChartProps) {
  const width = 300;
  const hasData = data.length >= 1;
  const padding = { top: 6, bottom: 6 };
  const chartH = height - padding.top - padding.bottom;

  const minVal = hasData ? Math.min(...data.map((d) => d.value)) : 0;
  const maxVal = hasData ? Math.max(...data.map((d) => d.value)) : 1;
  const range = maxVal - minVal || 1;

  const toX = (i: number) =>
    data.length <= 1 ? width / 2 : (i / (data.length - 1)) * width;

  const toY = (v: number) =>
    padding.top + chartH - ((v - minVal) / range) * chartH;

  const points = data
    .map((d, i) => `${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`)
    .join(' ');

  const firstDate = data[0]?.date ?? '';
  const midDate = data[Math.floor(data.length / 2)]?.date ?? '';
  const lastDate = data[data.length - 1]?.date ?? '';

  return (
    <div
      className="rounded-[10px] p-2.5 pb-1.5"
      style={{ backgroundColor: MEASUREMENT_COLORS.chartBg }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <line
          x1={0}
          y1={height - 2}
          x2={width}
          y2={height - 2}
          stroke={MEASUREMENT_COLORS.periodBtn}
          strokeWidth={0.5}
        />

        {hasData && data.length >= 2 && (
          <polyline
            points={points}
            fill="none"
            stroke={MEASUREMENT_COLORS.primary}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.5}
          />
        )}

        {hasData && (
          <circle
            cx={toX(data.length - 1)}
            cy={toY(data[data.length - 1].value)}
            r={3}
            fill={MEASUREMENT_COLORS.primary}
            opacity={0.7}
          />
        )}
      </svg>

      {hasData && (
        <div className="mt-0.5 flex justify-between">
          <span className="text-[8px]" style={{ color: MEASUREMENT_COLORS.textMuted }}>
            {firstDate}
          </span>
          {data.length > 2 && (
            <span className="text-[8px]" style={{ color: MEASUREMENT_COLORS.textMuted }}>
              {midDate}
            </span>
          )}
          <span className="text-[8px]" style={{ color: MEASUREMENT_COLORS.textMuted }}>
            {lastDate}
          </span>
        </div>
      )}
    </div>
  );
}
