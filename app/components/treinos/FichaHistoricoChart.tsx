'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { PeriodSelect } from '@/app/components/ui/PeriodSelect';
import type {
  HistoricoMetrica,
  HistoricoPeriodo,
  HistoricoPonto,
} from '@/lib/queries/historicoFicha';

const PERIODOS: { value: HistoricoPeriodo; label: string }[] = [
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '1a', label: 'Ano' },
  { value: 'all', label: 'Todo período' },
];

const METRICAS: { key: HistoricoMetrica; label: string }[] = [
  { key: 'volume', label: 'Volume' },
  { key: 'reps', label: 'Reps' },
  { key: 'duracao', label: 'Duração' },
];

interface FichaHistoricoChartProps {
  data: HistoricoPonto[];
  periodo: HistoricoPeriodo;
  metrica: HistoricoMetrica;
  onPeriodoChange: (p: HistoricoPeriodo) => void;
  onMetricaChange: (m: HistoricoMetrica) => void;
}

function formatAxisDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  });
}

function formatKpiValue(metrica: HistoricoMetrica, total: number): {
  value: string;
  unit: string;
} {
  if (metrica === 'volume') {
    // Sempre kg — nunca toneladas (regra do projeto).
    return { value: Math.round(total).toLocaleString('pt-BR'), unit: 'kg' };
  }
  if (metrica === 'reps') {
    return { value: Math.round(total).toLocaleString('pt-BR'), unit: 'reps' };
  }
  const mins = Math.round(total / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return { value: `${h}h ${m}`, unit: 'min' };
  }
  return { value: String(mins), unit: 'min' };
}

function formatTooltipValue(metrica: HistoricoMetrica, v: number): string {
  if (metrica === 'volume') return `${Math.round(v).toLocaleString('pt-BR')} kg`;
  if (metrica === 'reps') return `${Math.round(v).toLocaleString('pt-BR')} reps`;
  const mins = Math.round(v / 60);
  return mins >= 60
    ? `${Math.floor(mins / 60)}h ${mins % 60}min`
    : `${mins} min`;
}

export function FichaHistoricoChart({
  data,
  periodo,
  metrica,
  onPeriodoChange,
  onMetricaChange,
}: FichaHistoricoChartProps) {
  const chartData = (() => {
    if (data.length === 0) {
      return [{ data: new Date().toISOString().slice(0, 10), value: 0 }];
    }
    return data.map((d) => ({
      data: d.data,
      value:
        metrica === 'volume'
          ? d.volume
          : metrica === 'reps'
            ? d.reps
            : d.duracao,
    }));
  })();

  const total = chartData.reduce((acc, d) => acc + (d.value || 0), 0);

  const ultimaData = data[data.length - 1]?.data;
  const periodoLabel = ultimaData ? formatAxisDate(ultimaData) : '—';
  const kpi = formatKpiValue(metrica, total);

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <span
            className="font-black tabular-nums lining-nums"
            style={{
              fontSize: 20,
              letterSpacing: '-0.02em',
              color: '#1a1a1a',
            }}
          >
            {kpi.value}
          </span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#751BB4',
              marginLeft: 4,
            }}
          >
            {kpi.unit}
          </span>
          <span style={{ fontSize: 12, color: '#aaa', marginLeft: 6 }}>
            {periodoLabel}
          </span>
        </div>

        <PeriodSelect
          className="mb-1"
          value={periodo}
          options={PERIODOS}
          onChange={(v) => onPeriodoChange(v as HistoricoPeriodo)}
          aria-label="Selecionar período"
        />
      </div>

      <div style={{ width: '100%', height: 120, minWidth: 0, minHeight: 120 }}>
        <ResponsiveContainer width="100%" height={120} debounce={50}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="data"
              tick={{ fontSize: 10, fill: '#888' }}
              tickFormatter={formatAxisDate}
              tickLine={{ stroke: '#ccc' }}
              axisLine={{ stroke: '#ccc', strokeWidth: 1 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#888' }}
              tickLine={{ stroke: '#ccc' }}
              axisLine={{ stroke: '#ccc', strokeWidth: 1 }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
              width={36}
            />
            <Tooltip
              formatter={(v: number) => [
                formatTooltipValue(metrica, v),
                METRICAS.find((m) => m.key === metrica)?.label || '',
              ]}
              labelFormatter={(d) =>
                new Date(String(d) + 'T12:00:00').toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                })
              }
              contentStyle={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#751BB4"
              strokeWidth={2}
              dot={{ r: 3, fill: '#751BB4', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Exception: pills for chart metric tabs (Hevy-style), not nav tabs — see auron-design SKILL */}
      <div className="flex gap-2 mt-1">
        {METRICAS.map((tab) => {
          const active = metrica === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onMetricaChange(tab.key)}
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                touchAction: 'manipulation',
                transition: 'all 0.15s',
                background: active ? '#751BB4' : 'transparent',
                color: active ? '#fff' : '#aaa',
                border: active
                  ? '1px solid #751BB4'
                  : '1px solid rgba(0,0,0,0.12)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
