'use client';

interface ChartPoint {
  date: string;
  value: number;
}

interface MeasurementLineChartProps {
  data: ChartPoint[];
  height?: number;
  isDesktop?: boolean;
  /** Escala Y fixa (ex.: [0, 100] para adesão %). Sem isso, auto-escala pelo min/max. */
  yDomain?: [number, number];
  /** 'sparse' = 1ª / meio / última (padrão peso). 'all' = todos os pontos no eixo X. */
  labelMode?: 'sparse' | 'all';
  /** Formata o valor do ponto único (ex.: "80%"). Default: 1 casa decimal. */
  formatValue?: (value: number) => string;
  /** Usa fundo sólido do design system (#0f0f0f) em vez do token mobile. */
  solidBackground?: boolean;
}

export function MeasurementLineChart({
  data,
  height,
  isDesktop = false,
  yDomain,
  labelMode = 'sparse',
  formatValue,
  solidBackground = false,
}: MeasurementLineChartProps) {
  const chartHeight = height ?? (isDesktop ? 240 : 120);
  const width = 300;
  const hasData = data.length >= 1;
  const isSinglePoint = data.length === 1;
  const padding = { top: isSinglePoint ? 14 : 6, bottom: 6 };
  const chartH = chartHeight - padding.top - padding.bottom;

  const minVal = yDomain
    ? yDomain[0]
    : hasData
      ? Math.min(...data.map((d) => d.value))
      : 0;
  const maxVal = yDomain
    ? yDomain[1]
    : hasData
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
  const format = formatValue ?? ((v: number) => v.toFixed(1));

  return (
    <div
      className={
        solidBackground
          ? 'rounded-[10px] border border-[#222222] p-3'
          : 'rounded-[10px] border mobile-stat-nav-card p-3'
      }
    >
      <div
        className="rounded-[10px] p-2.5 pb-1.5"
        style={{
          backgroundColor: solidBackground
            ? '#0f0f0f'
            : 'var(--mobile-secondary-bg)',
        }}
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
                  {format(lastPoint.value)}
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

        {hasData && labelMode === 'all' && (
          <div className="mt-0.5 flex justify-between gap-0.5">
            {data.map((d, i) => (
              <span
                key={`${d.date}-${i}`}
                className="flex-1 text-center text-[7px] text-[#333333]"
              >
                {d.date}
              </span>
            ))}
          </div>
        )}

        {hasData && labelMode === 'sparse' && (
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
