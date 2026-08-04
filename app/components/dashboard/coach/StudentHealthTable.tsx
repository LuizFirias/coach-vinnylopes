"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { MobileListRow } from "@/app/components/MobileListRow";
import { cn } from "@/lib/utils/cn";
import { withReturnUrl } from "@/lib/utils/adminNav";

export interface StudentHealthRow {
  id: string;
  coaching_reference?: string | null;
  full_name?: string | null;
  status_pagamento?: string | null;
  tipo_plano?: string | null;
  ultimo_checkin?: string | null;
  data_expiracao?: string | null;
}

interface StudentHealthTableProps {
  students: StudentHealthRow[];
  today?: Date;
  formatLastWorkout: (dateStr: string | null | undefined) => string | null;
  /** Máximo de alunos na lista (os demais ficam em /admin/alunos). */
  limit?: number;
  isMobile?: boolean;
  /** Origem para o botão voltar no perfil do aluno. */
  returnUrl?: string;
}

/** Altura aproximada de 3 linhas mobile (nome + meta + padding). */
const MOBILE_VISIBLE_ROWS = 3;
const MOBILE_ROW_MAX_H = "10.75rem"; // ~3 × ~57px

function getStudentStatus(
  aluno: StudentHealthRow,
  today: Date
): { isActive: boolean; isExpired: boolean; label: string } {
  const expiration = aluno.data_expiracao ? new Date(aluno.data_expiracao) : null;
  const isPaid = aluno.status_pagamento === "pago";
  const isExpired = Boolean(expiration && expiration < today);
  const isActive = isPaid && (!expiration || expiration >= today);
  const label = isActive ? "Ativo" : isExpired ? "Expirado" : "Pendente";
  return { isActive, isExpired, label };
}

function StatusPill({ isActive, label }: { isActive: boolean; label: string }) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full font-semibold uppercase text-[8px] tracking-wider",
        isActive
          ? "bg-success-subtle text-success border border-success/10"
          : "bg-danger-subtle text-danger border border-danger/10"
      )}
    >
      {label}
    </span>
  );
}

export function StudentHealthTable({
  students,
  today = new Date(),
  formatLastWorkout,
  limit = 20,
  isMobile = false,
  returnUrl,
}: StudentHealthTableProps) {
  const rows = students.slice(0, isMobile ? limit : Math.min(limit, 5));
  const alunoHref = (id: string) =>
    returnUrl
      ? withReturnUrl(`/admin/aluno/${id}`, returnUrl)
      : `/admin/aluno/${id}`;

  return (
    <div className="rounded-xl border border-white/10 bg-[rgba(117, 27, 180,0.12)] px-4 pb-4 pt-3 backdrop-blur-xl backdrop-saturate-125 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
          Saúde dos alunos
        </h3>
        <Link
          href="/admin/alunos"
          className="inline-flex items-center gap-1 text-brand text-xs font-semibold hover:underline shrink-0"
        >
          Ver todos <ArrowRight size={10} />
        </Link>
      </div>

      {!isMobile ? (
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-divider">
                {["Nome", "Status", "Plano", "Último treino", "Expiração", "Ações"].map((h) => (
                  <th
                    key={h}
                    className="pb-2 text-[10px] font-bold tracking-wider text-text-tertiary uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((aluno) => {
                const expiration = aluno.data_expiracao ? new Date(aluno.data_expiracao) : null;
                const { isActive, label } = getStudentStatus(aluno, today);

                return (
                  <tr
                    key={aluno.id}
                    className="border-b border-divider/50 last:border-b-0 hover:bg-surface-2/40 transition-colors"
                  >
                    <td className="py-2.5 text-xs font-bold text-text-primary max-w-[160px] truncate">
                      {aluno.coaching_reference || aluno.full_name || "Aluno"}
                    </td>
                    <td className="py-2.5 text-xs">
                      <StatusPill isActive={isActive} label={label} />
                    </td>
                    <td className="py-2.5 text-xs text-text-secondary capitalize">
                      {aluno.tipo_plano?.replace(/_/g, " ") || "Sem plano"}
                    </td>
                    <td className="py-2.5 text-xs text-text-secondary">
                      {aluno.ultimo_checkin
                        ? formatLastWorkout(aluno.ultimo_checkin)
                        : "Sem treinos"}
                    </td>
                    <td className="py-2.5 text-xs text-text-secondary">
                      {expiration ? expiration.toLocaleDateString("pt-BR") : "Sem vencimento"}
                    </td>
                    <td className="py-2.5 text-xs">
                      <Link
                        href={alunoHref(aluno.id)}
                        className="text-brand hover:underline font-semibold inline-flex items-center gap-0.5 min-h-[44px]"
                      >
                        Perfil <ArrowRight size={10} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="divide-y divide-[color:var(--list-row-divider)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] scrollbar-hide"
          style={{ maxHeight: MOBILE_ROW_MAX_H }}
          aria-label={`Lista de alunos (até ${MOBILE_VISIBLE_ROWS} visíveis; role para ver mais)`}
        >
          {rows.map((aluno) => {
            const expiration = aluno.data_expiracao ? new Date(aluno.data_expiracao) : null;
            const { isActive, label } = getStudentStatus(aluno, today);

            return (
              <MobileListRow
                key={aluno.id}
                name={aluno.coaching_reference || aluno.full_name || "Aluno"}
                badge={<StatusPill isActive={isActive} label={label} />}
                topRight={
                  <Link
                    href={alunoHref(aluno.id)}
                    className="text-brand text-xs font-semibold inline-flex items-center gap-0.5 leading-none py-0.5 active:opacity-70"
                  >
                    Perfil <ArrowRight size={10} />
                  </Link>
                }
                meta={
                  <>
                    <span className="capitalize">{aluno.tipo_plano?.replace(/_/g, " ") || "Sem plano"}</span>
                    <span className="text-text-tertiary">•</span>
                    <span>
                      {aluno.ultimo_checkin
                        ? formatLastWorkout(aluno.ultimo_checkin)
                        : "Sem treinos"}
                    </span>
                    {expiration && (
                      <>
                        <span className="text-text-tertiary">•</span>
                        <span className="text-text-tertiary">
                          vence {expiration.toLocaleDateString("pt-BR")}
                        </span>
                      </>
                    )}
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
