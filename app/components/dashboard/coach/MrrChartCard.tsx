import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Rectangle,
} from "recharts";
import { useTheme } from "@/app/components/ThemeProvider";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

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

const Y_AXIS_WIDTH = 52;
const BAR_STEP = 40;
const BAR_SIZE = 12;
const CHART_H_MOBILE = 168;
const CHART_H_DESKTOP = 196;

/** Sombra = 50% da intensidade do card de ações requeridas (0.28 → 0.14). */
const MRR_CARD_SHADOW = "0 3px 10px rgba(0,0,0,0.06)";

/** Passos “bonitos” (múltiplos de 50) que crescem com a receita. */
const STEP_CANDIDATES = [50, 100, 150, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 50000];

function niceYAxis(maxReceita: number, targetTicks = 5) {
  const padded = Math.max(maxReceita * 1.08, 50);
  let step = STEP_CANDIDATES[STEP_CANDIDATES.length - 1];

  for (const candidate of STEP_CANDIDATES) {
    if (Math.ceil(padded / candidate) <= targetTicks) {
      step = candidate;
      break;
    }
  }

  if (padded / step > targetTicks) {
    step = Math.ceil(padded / targetTicks / 50) * 50;
  }

  const domainMax = Math.ceil(padded / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= domainMax; v += step) ticks.push(v);

  return { domainMax, ticks };
}

function formatYTick(v: number) {
  if (v >= 1000) {
    const k = v / 1000;
    return `R$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `R$${v}`;
}

type MrrTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown; payload?: MrrChartDatum }>;
  label?: string;
  coordinate?: { x?: number; y?: number };
  isLight: boolean;
  chartRootEl: HTMLElement | null;
};

/** Tooltip via portal — não é cortado pelo overflow do scroll horizontal. */
function MrrFaturamentoTooltip({
  active,
  payload,
  label,
  coordinate,
  isLight,
  chartRootEl,
}: MrrTooltipProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !active || !payload?.length) return null;

  const value = Number(payload[0]?.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;

  const wrapper = chartRootEl?.querySelector(".recharts-wrapper") as HTMLElement | null;
  const rect = wrapper?.getBoundingClientRect();
  if (!rect || coordinate?.x == null || coordinate?.y == null) return null;

  const left = Math.min(
    Math.max(rect.left + coordinate.x, 72),
    window.innerWidth - 72,
  );
  const top = Math.max(rect.top + coordinate.y, 48);

  return createPortal(
    <div
      className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg px-2 py-1.5 shadow-lg"
      style={{
        left,
        top,
        backgroundColor: isLight ? "#FFFFFF" : "rgba(17, 24, 39, 0.95)",
        border: isLight ? "1px solid #E4E4E7" : "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <p className="text-[10px] font-medium text-text-tertiary">{label}</p>
      <p className="text-[10px] font-semibold leading-none" style={{ color: "#39c75a" }}>
        Faturamento: {formatCurrency(value)}
      </p>
    </div>,
    document.body,
  );
}

export function MrrChartCard({ currentMrr, chartData, className }: MrrChartCardProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const isMobile = useBreakpoint("mobile");
  const chartHeight = isMobile ? CHART_H_MOBILE : CHART_H_DESKTOP;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const chartRootRef = useRef<HTMLDivElement | null>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  const axisTick = useMemo(
    () => ({
      fill: isLight ? "#52525B" : "rgba(216, 220, 230, 0.72)",
      fontSize: 10,
      fontWeight: 600 as const,
    }),
    [isLight],
  );
  const gridStroke = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";

  const { domainMax: yDomainMax, ticks: yTicks } = useMemo(() => {
    const max = Math.max(0, ...chartData.map((d) => d.receita));
    return niceYAxis(max);
  }, [chartData]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const measure = () => setScrollWidth(el.clientWidth);
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [chartData.length]);

  useEffect(() => {
    if (!scrollRef.current || chartData.length === 0) return;

    let mesAtualIndex = 0;
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (!chartData[i]?.futuro) {
        mesAtualIndex = i;
        break;
      }
    }

    const targetCenter = mesAtualIndex * BAR_STEP + BAR_STEP / 2;
    const targetScrollLeft = Math.max(0, targetCenter - scrollRef.current.clientWidth / 2);
    scrollRef.current.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
  }, [chartData]);

  const chartWidth = Math.max(chartData.length * BAR_STEP, scrollWidth, 280);
  const canRenderChart = chartHeight > 0 && chartWidth > 0 && scrollWidth > 0;

  return (
    <div
      className={cn(
        "coach-mrr-card overflow-visible rounded-xl border-0 bg-surface-1 p-4",
        className,
      )}
      style={{ boxShadow: MRR_CARD_SHADOW }}
    >
      <div className="mb-3 flex items-start justify-end gap-4">
        <div className="text-right">
          <p
            className="coach-mrr-value text-2xl font-bold font-kpi tabular-nums lining-nums tracking-headline leading-none text-text-primary md:text-[24px]"
            style={{ letterSpacing: "var(--tracking-display, -0.02em)" }}
          >
            {formatCurrency(currentMrr)}
          </p>
          <p className="coach-mrr-badge mt-1 text-[10px] text-text-tertiary">MRR atual</p>
        </div>
      </div>

      <div style={{ height: chartHeight, minHeight: chartHeight, minWidth: 0 }}>
        {chartData.length === 0 ? (
          <div className="coach-mrr-empty flex h-full items-center justify-center text-xs text-text-tertiary">
            Sem dados suficientes para gerar gráfico.
          </div>
        ) : (
          <div
            className="relative w-full overflow-hidden"
            style={{ height: chartHeight, minWidth: 0 }}
          >
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10"
              style={{ width: Y_AXIS_WIDTH, height: chartHeight }}
            >
              {canRenderChart && (
                <BarChart
                  width={Y_AXIS_WIDTH}
                  height={chartHeight}
                  data={chartData}
                  margin={{ top: 8, right: 0, left: 0, bottom: 28 }}
                >
                  <YAxis
                    tick={axisTick}
                    tickFormatter={formatYTick}
                    tickLine={false}
                    axisLine={false}
                    width={Y_AXIS_WIDTH}
                    ticks={yTicks}
                    domain={[0, yDomainMax]}
                    allowDecimals={false}
                    interval={0}
                  />
                  <XAxis dataKey="mes" hide />
                  <Bar dataKey="receita" hide />
                </BarChart>
              )}
            </div>

            <div
              ref={scrollRef}
              className="absolute inset-y-0 right-0 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ left: Y_AXIS_WIDTH, height: chartHeight, minWidth: 0 }}
            >
              <div
                ref={chartRootRef}
                style={{ width: chartWidth, height: chartHeight, minWidth: 0 }}
              >
                {canRenderChart && (
                  <BarChart
                    width={chartWidth}
                    height={chartHeight}
                    data={chartData}
                    margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke={gridStroke}
                      strokeDasharray="3 4"
                    />
                    <XAxis
                      dataKey="mes"
                      tick={axisTick}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      dy={6}
                      height={28}
                    />
                    <YAxis hide domain={[0, yDomainMax]} ticks={yTicks} />
                    <Tooltip
                      cursor={false}
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ display: "none" }}
                      content={(props) => (
                        <MrrFaturamentoTooltip
                          active={props.active}
                          payload={props.payload}
                          label={props.label}
                          coordinate={props.coordinate}
                          isLight={isLight}
                          chartRootEl={chartRootRef.current}
                        />
                      )}
                    />
                    <Bar
                      dataKey="receita"
                      barSize={BAR_SIZE}
                      shape={<ActiveBar />}
                      isAnimationActive={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.futuro
                              ? "rgba(57, 199, 90, 0.35)"
                              : "rgba(57, 199, 90, 0.9)"
                          }
                          stroke={entry.futuro ? "rgba(57, 199, 90, 0.55)" : "none"}
                          strokeDasharray={entry.futuro ? "4 3" : undefined}
                          strokeWidth={entry.futuro ? 1 : 0}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
