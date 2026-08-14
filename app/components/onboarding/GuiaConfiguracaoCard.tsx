"use client";

import { useState } from "react";
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
  /** Marca um passo como feito sem exigir a ação (ex.: não usa nutrição). */
  onConcluirPasso?: (passoId: string) => Promise<void> | void;
  /** Marca todos os pendentes e esconde o guia. */
  onConcluirRestantes?: () => Promise<void> | void;
};

export function GuiaConfiguracaoCard({
  passos,
  returnTo = "/admin/dashboard",
  onConcluirPasso,
  onConcluirRestantes,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);

  const total = PASSOS_ONBOARDING.length;
  const totalConcluidos = PASSOS_ONBOARDING.filter((p) =>
    passos.find((pr) => pr.id === p.id)?.concluido,
  ).length;

  if (totalConcluidos >= total) return null;

  const proximoPasso = PASSOS_ONBOARDING.find(
    (p) => !passos.find((pr) => pr.id === p.id)?.concluido,
  );

  const pct = Math.round((totalConcluidos / total) * 100);
  const podeConcluirManual = Boolean(onConcluirPasso);
  const podeConcluirRestantes = Boolean(onConcluirRestantes);

  const handleConcluir = async (passoId: string) => {
    if (!onConcluirPasso || busyId || busyAll) return;
    setBusyId(passoId);
    try {
      await onConcluirPasso(passoId);
    } finally {
      setBusyId(null);
    }
  };

  const handleConcluirRestantes = async () => {
    if (!onConcluirRestantes || busyAll || busyId) return;
    setBusyAll(true);
    try {
      await onConcluirRestantes();
    } finally {
      setBusyAll(false);
    }
  };

  return (
    <div className="mb-6 overflow-hidden rounded-xl border-0 bg-surface-1">
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">
            Guia de configuração
          </p>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {totalConcluidos} de {total} passos concluídos
          </p>
        </div>
        <span className="shrink-0 text-xs font-bold tabular-nums text-brand">
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
          const href = withReturnUrl(passo.href, returnTo);
          const marcando = busyId === passo.id;

          return (
            <li key={passo.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
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

                <div className="min-w-0 flex-1">
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
                    <p className="mt-0.5 text-xs leading-snug text-text-secondary">
                      {passo.descricao}
                    </p>
                  )}
                </div>

                {concluido ? (
                  <span className="shrink-0 text-xs text-success">Feito</span>
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    {podeConcluirManual && (
                      <button
                        type="button"
                        disabled={marcando || busyAll}
                        onClick={() => void handleConcluir(passo.id)}
                        className="inline-flex h-7 touch-manipulation items-center px-1 text-xs font-medium text-text-tertiary transition-colors hover:text-text-secondary disabled:opacity-50"
                        title="Marcar como já feito"
                      >
                        {marcando ? "…" : "Já fiz"}
                      </button>
                    )}
                    {isProximo && (
                      <Link
                        href={href}
                        className="inline-flex h-7 touch-manipulation items-center rounded-md bg-brand/10 px-2.5 text-xs font-semibold text-brand"
                      >
                        {passo.cta} →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {podeConcluirRestantes && (
        <div className="border-t border-[color:var(--list-row-divider,#1a2540)] px-4 py-2">
          <button
            type="button"
            disabled={busyAll || Boolean(busyId)}
            onClick={() => void handleConcluirRestantes()}
            className="inline-flex h-8 w-full touch-manipulation items-center justify-center text-xs font-medium text-text-tertiary transition-colors hover:text-text-secondary disabled:opacity-50"
          >
            {busyAll ? "Concluindo…" : "Concluir guia e ocultar"}
          </button>
          <p className="pb-0.5 text-center text-[10px] leading-snug text-text-disabled">
            Use se não for usar algum passo (ex.: nutrição). O guia só volta com
            funcionalidade nova.
          </p>
        </div>
      )}
    </div>
  );
}
