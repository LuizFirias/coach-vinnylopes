"use client";

import Link from "next/link";
import { WarningCircle, ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

export interface PriorityAction {
  id: string;
  aluno_id: string;
  nome: string;
  tipo: "danger" | "warning" | "info" | "success";
  descricao: string;
  acao: string;
  link: string;
}

interface PriorityActionsCardProps {
  actions: PriorityAction[];
  className?: string;
}

export function PriorityActionsCard({ actions, className }: PriorityActionsCardProps) {
  if (actions.length === 0) return null;

  return (
    <div
      className={cn(
        "bg-surface-1 border border-border-subtle rounded-xl p-4 shadow-sm self-start h-auto",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <WarningCircle className="text-brand w-4 h-4" />
          <h3 className="text-sm font-semibold text-text-primary">Ações prioritárias</h3>
        </div>
        <span className="px-2 py-0.5 bg-danger/10 text-danger text-[9px] font-semibold uppercase rounded-full">
          Ação requerida
        </span>
      </div>

      <div className="max-h-[24.5rem] md:max-h-[15.5rem] overflow-y-auto overscroll-contain pr-0.5 -mr-0.5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {actions.map((action) => (
            <div
              key={action.id}
              className="p-3 bg-surface-2 border border-border-subtle hover:border-border-strong rounded-lg flex items-start justify-between gap-3 transition-all min-h-[56px]"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0 mt-1.5",
                    action.tipo === "danger" && "bg-danger animate-pulse",
                    action.tipo === "warning" && "bg-warning",
                    action.tipo === "info" && "bg-info",
                    action.tipo === "success" && "bg-success"
                  )}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-text-primary leading-tight truncate">
                    {action.nome}
                  </span>
                  <span className="text-xs text-text-secondary mt-0.5 leading-snug line-clamp-2">
                    {action.descricao}
                  </span>
                </div>
              </div>
              <Link
                href={action.link}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover transition-colors shrink-0 min-h-[44px] px-1 pt-0.5"
              >
                {action.acao} <ArrowRight size={12} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
