"use client";

import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";

export interface MrrChartDatum {
  mes: string;
  receita: number;
  futuro: boolean;
}

interface MrrChartCardProps {
  currentMrr: number;
  chartData: MrrChartDatum[];
  className?: string;
}

export function MrrChartCard({ currentMrr, chartData, className }: MrrChartCardProps) {
  return (
    <div
      className={`bg-surface-1 border border-border-subtle rounded-xl p-4 shadow-sm ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Faturamento mensal</h3>
          <p className="text-[11px] text-text-secondary mt-0.5">Realizado + projeção</p>
        </div>
        <div className="text-right">
          <p className="text-2xl md:text-[24px] font-bold text-text-primary font-mono tabular-nums leading-none">
            {formatCurrency(currentMrr)}
          </p>
          <p className="text-[10px] text-success mt-1">MRR atual</p>
        </div>
      </div>

      <div className="h-36 md:h-44">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-text-tertiary">
            Sem dados suficientes para gerar gráfico.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <XAxis
                dataKey="mes"
                stroke="#6B7280"
                fontSize={9}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={9}
                tickFormatter={(v) => `R$${v}`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F1F23",
                  border: "1px solid #27272A",
                  borderRadius: "6px",
                  padding: "6px",
                }}
                labelStyle={{ color: "#FAFAFA", fontWeight: "bold", fontSize: "10px" }}
                itemStyle={{ color: "#2563EB", fontSize: "10px", padding: "2px 0" }}
                formatter={(v: number | string) => [formatCurrency(Number(v)), "Faturamento"]}
              />
              <Bar dataKey="receita" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.futuro ? "rgba(43, 127, 255, 0.25)" : "#2b7fff"}
                    stroke={entry.futuro ? "#2b7fff" : undefined}
                    strokeDasharray={entry.futuro ? "4 3" : undefined}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
