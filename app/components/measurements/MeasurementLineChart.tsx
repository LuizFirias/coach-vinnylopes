'use client';

interface ChartPoint {
  date: string;
  value: number;
}

interface MeasurementLineChartProps {
  data: ChartPoint[];
  height?: number;
  isDesktop?: boolean;
}

export function MeasurementLineChart({
  data,
  height,
  isDesktop = false,
}: MeasurementLineChartProps) {
  const chartHeight = height ?? (isDesktop ? 240 : 120);
  const width = 300;
  const hasData = data.length >= 1;
  const isSinglePoint = data.length === 1;
  const padding = { top: isSinglePoint ? 14 : 6, bottom: 6 };
  const chartH = chartHeight - padding.top - padding.bottom;

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
  const lastPoint = data[data.length - 1];

  return (
    <div className="rounded-[10px] border mobile-stat-nav-card p-3">
      <div
        className="rounded-[10px] p-2.5 pb-1.5"
        style={{ backgroundColor: 'var(--mobile-secondary-bg)' }}
      >
        <svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${width} ${chartHeight}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <line
            x1={0}
            y1={chartHeight - 2}
            x2={width}
            y2={chartHeight - 2}
            stroke="#1e1e1e"
            strokeWidth={1}
          />

          {hasData && data.length >= 2 && (
            <polyline
              points={points}
              fill="none"
              stroke="#2b7fff"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.5}
            />
          )}

          {hasData && lastPoint && (
            <>
              {isSinglePoint && (
                <text
                  x={toX(0)}
                  y={toY(lastPoint.value) - 8}
                  textAnchor="middle"
                  fill="#2b7fff"
                  fontSize={isDesktop ? 11 : 10}
                  fontWeight={600}
                >
                  {lastPoint.value.toFixed(1)}
                </text>
              )}
              <circle
                cx={toX(data.length - 1)}
                cy={toY(lastPoint.value)}
                r={isSinglePoint ? 4 : 3}
                fill="#2b7fff"
                opacity={isSinglePoint ? 0.9 : 0.7}
              />
            </>
          )}
        </svg>

        {hasData && (
          <div className="mt-0.5 flex justify-between">
            <span className="text-[8px] text-text-muted">{firstDate}</span>
            {data.length > 2 && (
              <span className="text-[8px] text-text-muted">{midDate}</span>
            )}
            <span className="text-[8px] text-text-muted">{lastDate}</span>
          </div>
        )}
      </div>
    </div>
  );
}
