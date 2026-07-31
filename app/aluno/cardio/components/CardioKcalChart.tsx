'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '@/app/components/ThemeProvider';

export interface KcalSemanaDatum {
  semana: string;
  kcal: number;
}

interface CardioKcalChartProps {
  data: KcalSemanaDatum[];
}

const CARD_STYLE = {
  background: 'var(--mobile-card-bg)',
  border: '1px solid var(--mobile-card-border)',
  boxShadow: 'var(--mobile-card-shadow)',
} as const;

export function CardioKcalChart({ data }: CardioKcalChartProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const tickFill = isLight ? '#bbb' : '#6B7280';
  const gridStroke = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';

  return (
    <div className="mb-0 rounded-[16px] p-4" style={CARD_STYLE}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-text-primary">Gasto por semana</h2>
        <p className="mt-0.5 text-[11px] text-text-tertiary">Últimas 8 semanas</p>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="cardioKcalFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e05555" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#e05555" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey="semana"
              tick={{ fontSize: 10, fill: tickFill }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: tickFill }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={false}
              contentStyle={{
                backgroundColor: isLight ? '#ffffff' : '#1F1F23',
                border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid #27272A',
                borderRadius: '6px',
                padding: '6px',
              }}
              labelStyle={{
                color: isLight ? '#1a1a1a' : '#FAFAFA',
                fontWeight: 'bold',
                fontSize: '10px',
              }}
              itemStyle={{ color: '#e05555', fontSize: '10px', padding: '2px 0' }}
              formatter={(v: number | string) => [
                `${Number(v).toLocaleString('pt-BR')} kcal`,
                'Gasto',
              ]}
            />
            <Area
              type="monotone"
              dataKey="kcal"
              stroke="#e05555"
              strokeWidth={2}
              fill="url(#cardioKcalFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
