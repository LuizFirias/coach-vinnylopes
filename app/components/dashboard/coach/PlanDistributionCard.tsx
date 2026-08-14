"use client";

import { cn } from "@/lib/utils/cn";

export interface PlanDistributionItem {
  name: string;
  count: number;
}

interface PlanDistributionCardProps {
  plans: PlanDistributionItem[];
  totalStudents: number;
  collapsed?: boolean;
  /** `start` alinha o donut à esquerda (ex.: Financeiro); default centraliza como na dashboard. */
  align?: "center" | "start";
  className?: string;
}

/* Ordem fixa de cores por posição na lista de planos (nunca por ranking) —
   filtrar planos zerados não repinta os que sobram. Tons médio-claros para
   o número preto dentro da fatia ter contraste nos dois temas. */
const SLICE_COLORS = [
  "#c084fc", // roxo (brand light)
  "#38bdf8", // azul
  "#39c75a", // verde
  "#f59e0b", // âmbar
  "#f472b6", // rosa
  "#fb923c", // laranja
  "#a3e635", // lima
  "#94a3b8", // cinza — "outros"
];

const TAU = Math.PI * 2;

/** Path de um setor anular (fatia de donut). Ângulo 0 = topo, sentido horário. */
function annularSectorPath(
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  a0: number,
  a1: number
): string {
  const toXY = (r: number, a: number) => {
    const rad = a - Math.PI / 2;
    return `${(cx + r * Math.cos(rad)).toFixed(3)} ${(cy + r * Math.sin(rad)).toFixed(3)}`;
  };
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${toXY(rOut, a0)}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${toXY(rOut, a1)}`,
    `L ${toXY(rIn, a1)}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${toXY(rIn, a0)}`,
    "Z",
  ].join(" ");
}

export function PlanDistributionCard({
  plans,
  collapsed,
  align = "center",
  className,
}: PlanDistributionCardProps) {
  const colored = plans.map((p, i) => ({
    ...p,
    color:
      p.name === "Outros"
        ? SLICE_COLORS[SLICE_COLORS.length - 1]
        : SLICE_COLORS[i % (SLICE_COLORS.length - 1)],
  }));
  const visible = colored.filter((p) => p.count > 0);
  const total = visible.reduce((acc, p) => acc + p.count, 0);

  const SIZE = 200;
  const CX = SIZE / 2;
  const R_OUT = 96;
  const R_IN = 58;
  const R_LABEL = (R_OUT + R_IN) / 2;
  const PAD = visible.length > 1 ? 0.035 : 0;

  let cursor = 0;
  const slices = visible.map((p) => {
    const frac = total > 0 ? p.count / total : 0;
    const a0 = cursor * TAU + PAD / 2;
    cursor += frac;
    const a1 = Math.max(a0, cursor * TAU - PAD / 2);
    const mid = (a0 + a1) / 2;
    const labelRad = mid - Math.PI / 2;
    return {
      ...p,
      frac,
      path: annularSectorPath(CX, CX, R_OUT, R_IN, a0, Math.min(a1, a0 + TAU - 0.0001)),
      labelX: CX + R_LABEL * Math.cos(labelRad),
      labelY: CX + R_LABEL * Math.sin(labelRad),
    };
  });

  const title = (
    <span className="coach-kpi-label text-[10px] font-semibold uppercase tracking-[1.5px] text-text-tertiary">
      Distribuição de planos
    </span>
  );

  const renderLegend = (opts?: { alignEnd?: boolean }) => (
    <div
      className={cn(
        "flex flex-col gap-2 min-w-0",
        opts?.alignEnd ? "items-end" : "w-full",
      )}
    >
      {visible.map((p) => {
        const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
        return (
          <div
            key={p.name}
            className={cn(
              "flex items-center gap-1.5 text-[11px] sm:text-xs min-w-0",
              opts?.alignEnd && "justify-end",
            )}
          >
            <span
              aria-hidden
              className="w-2.5 h-2.5 rounded-[3px] shrink-0"
              style={{ backgroundColor: p.color }}
            />
            <span className="truncate font-medium text-text-secondary capitalize">
              {p.name}
            </span>
            <span className="shrink-0 font-semibold text-text-primary tabular-nums">
              {p.count}
              <span className="text-text-tertiary font-normal ml-1">({pct}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );

  const donut = (
    <div className="relative shrink-0 overflow-visible">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Distribuição de alunos por plano: ${visible
          .map((p) => `${p.name} ${p.count}`)
          .join(", ")}`}
        className={cn(
          "relative shrink-0 h-auto",
          collapsed ? "w-28" : "w-32 sm:w-36 lg:w-40",
        )}
      >
        {slices.map((s) => (
          <path key={s.name} d={s.path} fill={s.color} />
        ))}
        {visible.length > 1 &&
          slices
            .filter((s) => s.frac >= 0.07 && s.frac < 0.92)
            .map((s) => (
              <text
                key={`label-${s.name}`}
                x={s.labelX}
                y={s.labelY}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#000000"
                fontSize={s.frac >= 0.15 ? 17 : 13}
                fontWeight={800}
                className="tabular-nums"
              >
                {s.count}
              </text>
            ))}
        <text
          x={CX}
          y={CX - 6}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--text-primary)"
          fontSize={30}
          fontWeight={800}
          className="tabular-nums"
        >
          {total}
        </text>
        <text
          x={CX}
          y={CX + 18}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--text-secondary)"
          fontSize={11}
          fontWeight={500}
        >
          {total === 1 ? "aluno" : "alunos"}
        </text>
      </svg>
    </div>
  );

  if (visible.length === 0) {
    return (
      <div className={cn("h-full flex flex-col", className)}>
        <div className="flex items-center justify-start mb-3 min-h-[52px]">{title}</div>
        <div className="flex-1 flex items-center justify-center text-xs text-text-tertiary">
          Nenhum plano ativo encontrado.
        </div>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className={cn("flex flex-col gap-3 min-w-0", className)}>
        <div className="flex justify-start">{title}</div>
        <div className="flex items-center justify-between gap-4 min-w-0">
          <div className="shrink-0">{donut}</div>
          <div className="min-w-0 overflow-hidden">{renderLegend({ alignEnd: true })}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "h-full flex flex-col min-w-0",
        align === "start" ? "min-h-0" : "min-h-[240px]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-start justify-start shrink-0",
          align === "start" ? "mb-2" : "mb-3 min-h-[52px] pt-0.5",
        )}
      >
        {title}
      </div>

      <div
        className={cn(
          "flex-1 flex items-center gap-3 sm:gap-4 min-w-0",
          align === "start" ? "justify-start" : "justify-between",
        )}
      >
        <div className="shrink-0 overflow-visible">{donut}</div>
        <div className="min-w-0 flex-1 overflow-hidden pl-1">{renderLegend()}</div>
      </div>
    </div>
  );
}
