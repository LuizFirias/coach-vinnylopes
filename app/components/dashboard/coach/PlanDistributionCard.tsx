"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface PlanDistributionItem {
  name: string;
  count: number;
}

interface PlanDistributionCardProps {
  plans: PlanDistributionItem[];
  totalStudents: number;
  collapsed?: boolean;
  className?: string;
}

export function PlanDistributionCard({
  plans,
  totalStudents,
  collapsed,
  className,
}: PlanDistributionCardProps) {
  const visiblePlans = collapsed ? plans.slice(0, 1) : plans;
  const hasMore = collapsed && plans.length > 1;

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-[#122648]/35 px-4 pb-4 pt-3 backdrop-blur-xl backdrop-saturate-125 shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Distribuição de planos</h3>
          <p className="text-[11px] text-text-secondary mt-0.5">Modalidades vigentes</p>
        </div>
        {hasMore && (
          <Link
            href="/admin/alunos"
            className="text-xs font-semibold text-brand hover:text-brand-hover shrink-0"
          >
            Ver distribuição →
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {visiblePlans.length === 0 ? (
          <div className="py-2 text-center text-xs text-text-tertiary">
            Nenhum plano ativo encontrado.
          </div>
        ) : (
          visiblePlans.map((plano) => {
            const pct =
              totalStudents > 0 ? Math.round((plano.count / totalStudents) * 100) : 0;
            return (
              <div key={plano.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-secondary capitalize">{plano.name}</span>
                  <span className="font-semibold text-text-primary">
                    {plano.count} {plano.count === 1 ? "aluno" : "alunos"}
                    <span className="text-text-tertiary font-normal ml-1">({pct}%)</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-0 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
