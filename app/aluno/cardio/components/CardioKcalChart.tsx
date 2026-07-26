'use client';

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface KcalSemanaDatum {
  semana: string;
  kcal: number;
}

interface CardioKcalChartProps {
  data: KcalSemanaDatum[];
}

export function CardioKcalChart({ data }: CardioKcalChartProps) {
  return (
    <div className="rounded-[20px] border-0 bg-[var(--dash-card,#111827)] p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-text-primary">Gasto por semana</h2>
        <p className="mt-0.5 text-[11px] text-text-secondary">Últimas 8 semanas</p>
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
            <XAxis dataKey="semana" stroke="#6B7280" fontSize={9} tickLine={false} axisLine={false} />
            <YAxis stroke="#6B7280" fontSize={9} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={false}
              contentStyle={{
                backgroundColor: '#1F1F23',
                border: '1px solid #27272A',
                borderRadius: '6px',
                padding: '6px',
              }}
              labelStyle={{ color: '#FAFAFA', fontWeight: 'bold', fontSize: '10px' }}
              itemStyle={{ color: '#e05555', fontSize: '10px', padding: '2px 0' }}
              formatter={(v: number | string) => [`${Number(v).toLocaleString('pt-BR')} kcal`, 'Gasto']}
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
