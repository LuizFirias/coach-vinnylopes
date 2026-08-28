'use client';

import { useId, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  emptyMessage?: string;
}

const BRAND = '#751BB4';

function MeasurementTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown }>;
  label?: string;
  formatValue?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div
      className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold shadow-lg"
      style={{ background: '#1a1a1a', color: '#fff' }}
    >
      <p className="mb-0.5 font-normal text-white/60">{label}</p>
      {formatValue ? formatValue(value) : value}
    </div>
  );
}

export function MeasurementLineChart({
  data,
  height,
  isDesktop = false,
  yDomain,
  labelMode = 'sparse',
  formatValue,
  emptyMessage = 'Registre pelo menos 2 medidas para ver o gráfico',
}: MeasurementLineChartProps) {
  const gradientId = `measurementFill-${useId().replace(/:/g, '')}`;
  const chartHeight = height ?? (isDesktop ? 240 : 140);
  const hasEnough = data.length >= 2;

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
  // Respiro acima/abaixo — sem isso a linha às vezes encosta na borda do gráfico.
  const pad = yDomain ? 0 : Math.max((maxVal - minVal) * 0.15, 0.5);
  const domain: [number, number] = [minVal - pad, maxVal + pad];

  // "all" = todo ponto rotulado (uso do sparkline compacto do kanban, poucos pontos).
  // "sparse" = ~5 marcações espalhadas — dá pra ver a coluna vertical sem
  // lotar de rótulo quando o período tem muitos pontos (90 dias, 1 ano...).
  const sparseTicks = useMemo(() => {
    if (labelMode === 'all' || data.length === 0) return undefined;
    const count = Math.min(5, data.length);
    const indices = new Set(
      Array.from({ length: count }, (_, i) => Math.round((i * (data.length - 1)) / Math.max(1, count - 1))),
    );
    return [...indices].map((i) => data[i]?.date);
  }, [data, labelMode]);

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
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={data} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND} stopOpacity={0.22} />
                <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical
              horizontal={false}
              stroke="rgba(0,0,0,0.07)"
              strokeDasharray="3 4"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 8, fill: '#aaa' }}
              tickLine={false}
              axisLine={false}
              interval={sparseTicks ? undefined : 0}
              ticks={sparseTicks}
              dy={4}
            />
            <YAxis hide domain={domain} />
            <Tooltip
              cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1 }}
              content={<MeasurementTooltip formatValue={formatValue} />}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={BRAND}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={labelMode === 'all' ? false : { r: 2.5, fill: BRAND, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: BRAND, strokeWidth: 2, stroke: '#fff' }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center' }}>
          {emptyMessage}
        </p>
      )}
    </div>
  );
}
