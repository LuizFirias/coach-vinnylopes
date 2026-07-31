'use client';

interface ChartPoint {
  date: string;
  value: number;
}

interface MeasurementLineChartProps {
  data: ChartPoint[];
  height?: number;
  isDesktop?: boolean;
  yDomain?: [number, number];
  labelMode?: 'sparse' | 'all';
  formatValue?: (value: number) => string;
  solidBackground?: boolean;
}

export function MeasurementLineChart({
  data,
  height,
  isDesktop = false,
  yDomain,
  labelMode = 'sparse',
}: MeasurementLineChartProps) {
  const chartHeight = height ?? (isDesktop ? 240 : 120);
  const width = 300;
  const hasEnough = data.length >= 2;
  const padding = { top: 6, bottom: 6 };
  const chartH = chartHeight - padding.top - padding.bottom;

  const minVal = yDomain
    ? yDomain[0]
    : hasEnough
      ? Math.min(...data.map((d) => d.value))
      : 0;
  const maxVal = yDomain
    ? yDomain[1]
    : hasEnough
      ? Math.max(...data.map((d) => d.value))
      : 1;
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
    <div
      className="rounded-[14px] p-4"
      style={{
        background: 'var(--mobile-card-bg, #ffffff)',
        border: '1px solid var(--mobile-card-border, rgba(0,0,0,0.08))',
        boxShadow: 'var(--mobile-card-shadow, 0 1px 3px rgba(0,0,0,0.05))',
        minHeight: chartHeight + 24,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: hasEnough ? 'flex-start' : 'center',
        alignItems: hasEnough ? 'stretch' : 'center',
      }}
    >
      {hasEnough ? (
        <div>
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
              stroke="rgba(0,0,0,0.06)"
              strokeWidth={1}
            />

            <polyline
              points={points}
              fill="none"
              stroke="#9333ea"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {lastPoint && (
              <circle
                cx={toX(data.length - 1)}
                cy={toY(lastPoint.value)}
                r={3}
                fill="#9333ea"
              />
            )}
          </svg>

          {labelMode === 'all' && (
            <div className="mt-0.5 flex justify-between gap-0.5">
              {data.map((d, i) => (
                <span
                  key={`${d.date}-${i}`}
                  className="flex-1 text-center text-[7px] text-text-disabled"
                >
                  {d.date}
                </span>
              ))}
            </div>
          )}

          {labelMode === 'sparse' && (
            <div className="mt-0.5 flex justify-between">
              <span className="text-[8px] text-text-disabled">{firstDate}</span>
              {data.length > 2 && (
                <span className="text-[8px] text-text-disabled">{midDate}</span>
              )}
              <span className="text-[8px] text-text-disabled">{lastDate}</span>
            </div>
          )}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center' }}>
          Registre pelo menos 2 medidas para ver o gráfico
        </p>
      )}
    </div>
  );
}
