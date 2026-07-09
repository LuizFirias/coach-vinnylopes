"use client";

import Link from "next/link";
import { Plus, ChartBar } from "@phosphor-icons/react";
import DashboardTopActions from "@/app/components/DashboardTopActions";

interface DashboardHeaderProps {
  isMobile: boolean;
  coachStudentLimit: number | null;
  linkedStudentCount: number;
  coachAccountType: string;
  showNotificationBadge?: boolean;
}

export function DashboardHeader({
  isMobile,
  coachStudentLimit,
  linkedStudentCount,
  coachAccountType,
  showNotificationBadge,
}: DashboardHeaderProps) {
  const subtitleExtra =
    coachStudentLimit !== null
      ? ` · ${linkedStudentCount}/${coachStudentLimit} alunos`
      : coachAccountType === "parceiro"
        ? " · Alunos ilimitados"
        : "";

  return (
    <>
      {isMobile && (
        <div className="dashboard-mobile-toolbar is-surface -mx-4 px-4 pb-3 mb-2 flex items-center justify-end lg:hidden">
          <DashboardTopActions
            showNotificationBadge={showNotificationBadge}
            notificationButtonId="btn-notificacoes-coach-dashboard"
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary font-display">
            Dashboard
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {isMobile ? "Visão geral" : "Visão geral da sua consultoria"}
            {subtitleExtra && (
              <span className="text-text-tertiary">{subtitleExtra}</span>
            )}
          </p>
        </div>

        {isMobile ? (
          <Link
            href="/admin/alunos/novo"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand text-text-on-brand shadow-md shadow-brand/10 active:scale-95 transition-all"
            aria-label="Adicionar aluno"
          >
            <Plus size={20} weight="bold" />
          </Link>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/alunos/novo"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hover text-text-on-brand text-xs font-semibold rounded-lg transition-all active:scale-95 shadow-md shadow-brand/10"
            >
              <Plus size={13} weight="bold" /> Adicionar aluno
            </Link>
            <Link
              href="/admin/treinos/nova-ficha"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-border-default hover:bg-surface-3 text-text-primary text-xs font-semibold rounded-lg transition-all active:scale-95"
            >
              Criar treino
            </Link>
            <Link
              href="/admin/relatorios"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-border-default hover:bg-surface-3 text-text-primary text-xs font-semibold rounded-lg transition-all active:scale-95"
            >
              <ChartBar size={13} /> Relatórios
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
