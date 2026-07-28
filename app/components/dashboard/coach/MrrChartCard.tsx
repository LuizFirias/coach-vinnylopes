"use client";

import { useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Rectangle,
} from "recharts";
import { GlassPanel, DASHBOARD_KPI_GLASS } from "@/components/ui/GlassPanel";
import { useTheme } from "@/app/components/ThemeProvider";
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

function ActiveBar(props: any) {
  const futuro = Boolean(props?.payload?.futuro);
  return (
    <Rectangle
      {...props}
      fill={futuro ? "rgba(57, 199, 90, 0.35)" : "rgba(57, 199, 90, 0.9)"}
      stroke="none"
      strokeWidth={0}
    />
  );
}

export function MrrChartCard({ currentMrr, chartData, className }: MrrChartCardProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const axisStroke = isLight ? "#71717A" : "rgba(255,255,255,0.45)";
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current || chartData.length === 0) return;

    const barStep = 52;
    let mesAtualIndex = 0;
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (!chartData[i]?.futuro) {
        mesAtualIndex = i;
        break;
      }
    }

    const targetCenter = mesAtualIndex * barStep + barStep / 2;
    const targetScrollLeft = Math.max(0, targetCenter - scrollRef.current.clientWidth / 2);
    scrollRef.current.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
  }, [chartData]);

  return (
    <GlassPanel
      variant={DASHBOARD_KPI_GLASS}
      shine="subtle"
      flatInLight
      className={`coach-mrr-card p-4 ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="coach-mrr-title text-sm font-semibold">Faturamento mensal</h3>
          <p className="coach-mrr-subtitle text-[11px] mt-0.5">Realizado + projeção</p>
        </div>
        <div className="text-right">
          <p
            className="coach-mrr-value text-2xl md:text-[24px] font-bold font-kpi tabular-nums lining-nums tracking-headline leading-none"
            style={{ letterSpacing: 'var(--tracking-display, -0.02em)' }}
          >
            {formatCurrency(currentMrr)}
          </p>
          <p className="coach-mrr-badge text-[10px] mt-1">MRR atual</p>
        </div>
      </div>

      <div className="h-36 md:h-44">
        {chartData.length === 0 ? (
          <div className="coach-mrr-empty h-full flex items-center justify-center text-xs">
            Sem dados suficientes para gerar gráfico.
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="h-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            <div style={{ width: `${chartData.length * 52}px`, minWidth: "100%", height: "100%" }}>
              <BarChart
                width={Math.max(chartData.length * 52, 320)}
                height={176}
                data={chartData}
                margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
              >
                <XAxis
                  dataKey="mes"
                  stroke={axisStroke}
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={axisStroke}
                  fontSize={9}
                  tickFormatter={(v) => `R$${v}`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    backgroundColor: isLight ? "#FFFFFF" : "rgba(17, 24, 39, 0.92)",
                    border: isLight ? "1px solid #E4E4E7" : "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    padding: "6px",
                    backdropFilter: isLight ? undefined : "blur(8px)",
                  }}
                  labelStyle={{
                    color: isLight ? "#09090B" : "#FAFAFA",
                    fontWeight: "bold",
                    fontSize: "10px",
                  }}
                  itemStyle={{ color: "#39c75a", fontSize: "10px", padding: "2px 0" }}
                  formatter={(v: number | string) => [formatCurrency(Number(v)), "Faturamento"]}
                />
                <Bar
                  dataKey="receita"
                  radius={[3, 3, 0, 0]}
                  activeBar={<ActiveBar />}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.futuro ? "rgba(57, 199, 90, 0.28)" : "rgba(57, 199, 90, 0.85)"}
                      stroke={entry.futuro ? "rgba(57, 199, 90, 0.55)" : "none"}
                      strokeDasharray={entry.futuro ? "4 3" : undefined}
                      strokeWidth={entry.futuro ? 1 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </div>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
