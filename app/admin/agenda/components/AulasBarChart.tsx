"use client";

import { useMemo, type ReactNode } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import { useTheme } from "@/app/components/ThemeProvider";

export interface AulasBarChartDatum {
  categoria: string;
  feitas: number;
  naoFeitas: number;
}

interface AulasBarChartProps {
  data: AulasBarChartDatum[];
  /** Filtro de período, renderizado no canto superior direito do header. */
  filtro?: ReactNode;
}

const CHART_H = 200;

/** Barra dupla vertical — feitas (verde) vs. não feitas (vermelho), por
 *  categoria de tempo (dia/semana/mês/ano, conforme a visão ativa da agenda). */
export function AulasBarChart({ data, filtro }: AulasBarChartProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const axisTick = useMemo(
    () => ({
      fill: isLight ? "#52525B" : "rgba(216, 220, 230, 0.72)",
      fontSize: 10,
      fontWeight: 600 as const,
    }),
    [isLight],
  );
  const gridStroke = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
  const temDados = data.some((d) => d.feitas > 0 || d.naoFeitas > 0);

  return (
    <div className="mt-4 border-t border-[#E4E7ED] pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          Aulas feitas × não feitas
        </h3>
        {filtro}
      </div>
      {!temDados ? (
        <div
          className="flex items-center justify-center text-xs text-text-disabled"
          style={{ height: CHART_H }}
        >
          Sem aulas marcadas nesse período.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={CHART_H}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 4" />
            <XAxis dataKey="categoria" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
            <Tooltip
              cursor={{ fill: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)" }}
              contentStyle={{
                backgroundColor: isLight ? "#FFFFFF" : "rgba(17, 24, 39, 0.95)",
                border: isLight ? "1px solid #E4E4E7" : "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                fontSize: 11,
              }}
              formatter={(value, name) => [value, name === "feitas" ? "Feitas" : "Não feitas"]}
            />
            <Legend
              wrapperStyle={{ fontSize: 10, fontWeight: 600, color: axisTick.fill }}
              formatter={(value) => (value === "feitas" ? "Feitas" : "Não feitas")}
            />
            <Bar dataKey="feitas" fill="#39c75a" radius={[3, 3, 0, 0]} maxBarSize={22} />
            <Bar dataKey="naoFeitas" fill="#e05555" radius={[3, 3, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
