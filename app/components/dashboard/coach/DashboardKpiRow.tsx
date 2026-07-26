import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";

export type KpiDot = "green" | "blue" | "red" | "yellow";

export interface CoachKpiCardProps {
  dot: KpiDot;
  label: string;
  value: string | number;
  subtitle: string;
  delta?: number | null;
  alert?: boolean;
  compact?: boolean;
}

const DOT_CLASS: Record<KpiDot, string> = {
  green: "bg-success",
  blue: "bg-brand",
  red: "bg-danger",
  yellow: "bg-warning",
};

export function CoachKpiCard({
  dot,
  label,
  value,
  subtitle,
  delta,
  alert,
  compact,
}: CoachKpiCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-1 border border-card rounded-xl p-4 shadow-sm flex flex-col justify-center min-h-[88px]",
        compact && "p-3 min-h-[80px]",
        alert && "border-danger/30"
      )}
    >
      <div className="flex items-center gap-1.5 leading-none mb-2">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", DOT_CLASS[dot])} />
        <span
          className={cn(
            "font-semibold text-text-tertiary uppercase tracking-wider",
            compact ? "text-[10px]" : "text-[11px]"
          )}
        >
          {label}
        </span>
      </div>
      <div
        className={cn(
          "font-bold text-text-primary font-mono tabular-nums lining-nums leading-none",
          compact ? "text-[26px] tracking-tight" : "text-[32px] tracking-display"
        )}
      >
        {value}
      </div>
      {delta != null ? (
        <span
          className={cn(
            "text-[11px] mt-1.5 leading-none",
            delta >= 0 ? "text-success" : "text-danger"
          )}
        >
          {delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}% vs. mês anterior
        </span>
      ) : (
        <span className="text-[11px] text-text-secondary mt-1.5 leading-none">{subtitle}</span>
      )}
    </div>
  );
}

export interface DashboardKpiRowProps {
  activeStudents: number;
  mrr: number;
  studentsAtRisk: number;
  pendingCheckIns: number;
  activeStudentsSubtitle?: string;
  mrrDeltaPercent?: number | null;
  compact?: boolean;
}

export function DashboardKpiRow({
  activeStudents,
  mrr,
  studentsAtRisk,
  pendingCheckIns,
  activeStudentsSubtitle = "Perfis pagantes vigentes",
  mrrDeltaPercent,
  compact,
}: DashboardKpiRowProps) {
  return (
    <div>
      <h2 className="text-[10px] font-bold tracking-wider text-text-tertiary uppercase border-t border-divider/50 pt-3 mb-2.5">
        Visão geral
      </h2>
      <div
        className={cn(
          "grid gap-3 md:gap-4",
          compact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"
        )}
      >
        <CoachKpiCard
          dot="green"
          label="Alunos ativos"
          value={activeStudents}
          subtitle={activeStudentsSubtitle}
          compact={compact}
        />
        <CoachKpiCard
          dot="blue"
          label="MRR ativo"
          value={formatCurrency(mrr)}
          subtitle="Recorrência mensal"
          delta={mrrDeltaPercent}
          compact={compact}
        />
        <CoachKpiCard
          dot="red"
          label="Alunos em risco"
          value={studentsAtRisk}
          subtitle="Inativos há mais de 7 dias"
          alert={studentsAtRisk > 0}
          compact={compact}
        />
        <CoachKpiCard
          dot="yellow"
          label="Check-ins pendentes"
          value={pendingCheckIns}
          subtitle="Novos relatos sem resposta"
          alert={pendingCheckIns > 0}
          compact={compact}
        />
      </div>
    </div>
  );
}
