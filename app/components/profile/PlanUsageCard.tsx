"use client";

import Link from "next/link";
import { CaretRight, Crown, TrendUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

type PlanUsageCardProps = {
  planLabel: string;
  studentCount: number;
  studentLimit: number;
  isActive?: boolean;
  href?: string;
  className?: string;
};

export function PlanUsageCard({
  planLabel,
  studentCount,
  studentLimit,
  isActive = true,
  href = "/admin/assinatura",
  className,
}: PlanUsageCardProps) {
  const pct =
    studentLimit > 0
      ? Math.min(100, Math.round((studentCount / studentLimit) * 100))
      : 0;
  const vagas = Math.max(0, studentLimit - studentCount);
  const badge = (planLabel || "Plano").split(/\s+/)[0];

  return (
    <Link
      href={href}
      className={cn(
        "plan-usage-card block rounded-xl overflow-hidden transition-opacity hover:opacity-95",
        isActive ? "bg-surface-2" : "bg-danger/5",
        className,
      )}
    >
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-subtle">
            <Crown size={11} weight="fill" className="text-brand" />
          </span>
          <span className="min-w-0 flex-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-text-tertiary truncate">
            Plano atual
          </span>
          <span className="shrink-0 rounded-full bg-brand-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand">
            {badge}
          </span>
        </div>

        <p className="text-[13px] font-semibold leading-none tabular-nums lining-nums text-text-primary">
          <span className={isActive ? "text-brand font-bold" : "text-danger font-bold"}>
            {studentCount}
          </span>
          <span className="text-text-secondary font-medium">
            {" "}
            / {studentLimit} alunos
          </span>
        </p>

        <div className="mt-2 flex items-center gap-1.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-brand-subtle">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isActive ? "bg-brand" : "bg-danger",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[9px] font-medium tabular-nums text-text-tertiary shrink-0">
            {pct}%
          </span>
        </div>

        <p className="mt-1.5 text-[9px] leading-none text-text-tertiary">
          {vagas} {vagas === 1 ? "vaga disponível" : "vagas disponíveis"}
        </p>
      </div>

      <div className="flex items-center gap-1.5 bg-brand/5 px-4 py-2">
        <TrendUp size={11} className="text-brand shrink-0" weight="bold" />
        <span className="flex-1 text-[10px] font-semibold text-brand">
          Gerenciar plano
        </span>
        <CaretRight size={11} className="text-brand shrink-0" />
      </div>
    </Link>
  );
}
