"use client";

import Link from "next/link";
import {
  Barbell,
  CheckCircle,
  Eye,
  ForkKnife,
  PaperPlaneTilt,
  UserPlus,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { PASSOS_ONBOARDING } from "@/lib/onboarding/passos";
import { withReturnUrl } from "@/lib/utils/adminNav";

const ICONS: Record<string, Icon> = {
  UserPlus,
  Barbell,
  ForkKnife,
  PaperPlaneTilt,
  Eye,
};

export type PassoProgressoUi = { id: string; concluido: boolean };

type Props = {
  passos: PassoProgressoUi[];
  returnTo?: string;
};

export function GuiaConfiguracaoCard({
  passos,
  returnTo = "/admin/dashboard",
}: Props) {
  const total = PASSOS_ONBOARDING.length;
  const totalConcluidos = PASSOS_ONBOARDING.filter((p) =>
    passos.find((pr) => pr.id === p.id)?.concluido,
  ).length;

  if (totalConcluidos >= total) return null;

  const proximoPasso = PASSOS_ONBOARDING.find(
    (p) => !passos.find((pr) => pr.id === p.id)?.concluido,
  );

  const pct = Math.round((totalConcluidos / total) * 100);

  return (
    <div className="rounded-xl bg-surface-1 border-0 overflow-hidden mb-6">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">
            Guia de configuração
          </p>
          <p className="text-xs text-text-tertiary mt-0.5">
            {totalConcluidos} de {total} passos concluídos
          </p>
        </div>
        <span className="text-xs font-bold text-brand tabular-nums shrink-0">
          {pct}%
        </span>
      </div>

      <div className="mx-4 mb-3 h-1.5 rounded-full bg-surface-2">
        <div
          className="h-1.5 rounded-full bg-brand transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="flex flex-col divide-y divide-[color:var(--list-row-divider,#1a2540)]">
        {PASSOS_ONBOARDING.map((passo) => {
          const concluido = Boolean(
            passos.find((p) => p.id === passo.id)?.concluido,
          );
          const isProximo = passo.id === proximoPasso?.id;
          const IconeComp = ICONS[passo.icone] || UserPlus;
          const href = concluido
            ? "#"
            : withReturnUrl(passo.href, returnTo);

          return (
            <li key={passo.id}>
              <Link
                href={href}
                aria-disabled={concluido}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors",
                  !concluido && "active:bg-surface-2 hover:bg-surface-2/60",
                  concluido && "pointer-events-none",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    concluido
                      ? "bg-success/15"
                      : isProximo
                        ? "bg-brand/15"
                        : "bg-surface-2",
                  )}
                >
                  {concluido ? (
                    <CheckCircle
                      size={18}
                      weight="fill"
                      className="text-success"
                    />
                  ) : (
                    <IconeComp
                      size={18}
                      weight="duotone"
                      className={
                        isProximo ? "text-brand" : "text-text-disabled"
                      }
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      concluido
                        ? "text-text-tertiary line-through"
                        : "text-text-primary",
                    )}
                  >
                    {passo.titulo}
                  </p>
                  {isProximo && !concluido && (
                    <p className="text-xs text-text-secondary mt-0.5 leading-snug">
                      {passo.descricao}
                    </p>
                  )}
                </div>

                {isProximo && !concluido && (
                  <span className="shrink-0 rounded-[8px] bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
                    {passo.cta} →
                  </span>
                )}

                {concluido && (
                  <span className="text-xs text-success shrink-0">Feito</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
