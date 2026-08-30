"use client";

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

export interface RadarDataPoint {
  subject: string;
  value: number;
  fullMark: number;
}

interface MuscleDistributionRadarProps {
  data: RadarDataPoint[];
  hasData: boolean;
  isDesktop?: boolean;
}

export function MuscleDistributionRadar({
  data,
  hasData,
  isDesktop = false,
}: MuscleDistributionRadarProps) {
  const axisColor = hasData ? "#7a8aab" : "#444444";
  const fillOpacity = hasData ? 0.25 : 0.05;
  const strokeWidth = hasData ? 1.5 : 1;

  const chartHeight = isDesktop ? 320 : 288;

  return (
    <div className={isDesktop ? "max-w-[480px] mx-auto w-full min-w-0" : "w-full min-w-0"}>
      <div style={{ height: chartHeight, minHeight: chartHeight, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={chartHeight} debounce={50} minWidth={0}>
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="#1e1e1e" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: axisColor, fontSize: 11 }} />
            <PolarRadiusAxis stroke="transparent" tick={false} />
            <Radar
              name="Atual"
              dataKey="value"
              stroke={hasData ? "#D4A843" : "rgba(212, 168, 67, 0.2)"}
              fill="#D4A843"
              fillOpacity={fillOpacity}
              strokeWidth={strokeWidth}
              dot={hasData ? { r: 3, fill: "#D4A843" } : false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {!hasData && (
        <p className="mt-2 text-[11px] text-text-muted text-center">
          Complete treinos para ver sua distribuição muscular
        </p>
      )}

      <div className="flex items-center justify-center gap-4 mt-3">
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-brand inline-block" />
          Atual
        </span>
      </div>
    </div>
  );
}
