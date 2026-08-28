"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CaretDown } from "@phosphor-icons/react";
import { StudentAvatar } from "@/app/components/profile/StudentAvatar";
import { cn } from "@/lib/utils/cn";
import type { GroupedActivity } from "@/lib/utils/activityGrouping";

interface RecentActivityFeedProps {
  activities: GroupedActivity[];
  limit?: number;
  showViewAll?: boolean;
  className?: string;
}

/** Teto de dias mostrados dentro do painel expandido de um aluno, no desktop.
 *  Acima disso, "Ver histórico completo" leva pro perfil dele. */
const DESKTOP_GROUP_LIMIT = 5;

interface StudentActivityBucket {
  studentId: string;
  studentName: string;
  avatarUrl?: string | null;
  sexo?: string | null;
  link: string;
  latestDate: string;
  groups: GroupedActivity[];
}

/** Reagrupa os dias-com-atividade (já agrupados por dia) em um bucket por aluno,
 * pra virar um item colapsável só — "N dias com atividade" quando fechado. */
function bucketByStudent(activities: GroupedActivity[]): StudentActivityBucket[] {
  const map = new Map<string, StudentActivityBucket>();
  activities.forEach((group) => {
    const existing = map.get(group.studentId);
    if (existing) {
      existing.groups.push(group);
    } else {
      map.set(group.studentId, {
        studentId: group.studentId,
        studentName: group.studentName,
        avatarUrl: group.avatarUrl,
        sexo: group.sexo,
        link: group.link,
        latestDate: group.date,
        groups: [group],
      });
    }
  });
  return Array.from(map.values());
}

export function RecentActivityFeed({
  activities,
  limit = 5,
  showViewAll = false,
  className,
}: RecentActivityFeedProps) {
  const buckets = useMemo(() => bucketByStudent(activities), [activities]);
  const visible = buckets.slice(0, limit);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (studentId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  return (
    <div
      className={`rounded-xl border-0 bg-surface-1 px-4 pb-4 pt-3 ${className ?? ""}`}
      style={{ boxShadow: "0 3px 10px rgba(0,0,0,0.06)" }}
    >
      <h3 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-text-secondary text-center whitespace-nowrap mb-4">
        Atividades recentes dos seus alunos
      </h3>

      {showViewAll && buckets.length > limit && (
        <div className="flex justify-end -mt-2 mb-3">
          <Link href="/admin/alunos" className="text-[10px] font-semibold text-brand hover:text-brand-hover">
            Ver tudo →
          </Link>
        </div>
      )}

      <div className="flex flex-col">
        {visible.length === 0 ? (
          <p className="text-[11px] text-text-disabled text-center">
            Nenhuma atividade ainda — aguardando atualizações dos alunos.
          </p>
        ) : (
          visible.map((bucket) => {
            const isOpen = expandedIds.has(bucket.studentId);
            const resumo =
              bucket.groups.length > 1
                ? `${bucket.groups.length} dias com atividade`
                : bucket.groups[0]?.events.map((ev) => ev.label).join(" · ");

            return (
              <div key={bucket.studentId} className="border-b border-[#E4E7ED] last:border-b-0">
                {/* Colapsado por padrão — abre inline, sem sair da tela */}
                <button
                  type="button"
                  onClick={() => toggle(bucket.studentId)}
                  aria-expanded={isOpen}
                  style={{ touchAction: "manipulation" }}
                  className="group flex w-full items-start justify-between gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-surface-2/60 active:bg-surface-2 transition-colors min-h-[44px] text-left"
                >
                  <div className="flex gap-3 min-w-0 items-start">
                    <StudentAvatar
                      name={bucket.studentName}
                      avatarUrl={bucket.avatarUrl}
                      sexo={bucket.sexo}
                      sizeClassName="h-8 w-8"
                      className="rounded-lg shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-text-primary leading-tight truncate">
                        {bucket.studentName}
                      </span>
                      {/* Data já aparece por dia dentro do expandido — evita repetir aqui */}
                      <span className="text-[11px] text-text-secondary mt-0.5 leading-tight truncate">
                        {resumo}
                      </span>
                    </div>
                  </div>
                  <CaretDown
                    size={12}
                    className={cn(
                      "shrink-0 mt-1 text-text-tertiary transition-transform group-hover:text-brand",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-2.5 pb-3 pl-11">
                    {bucket.groups.slice(0, DESKTOP_GROUP_LIMIT).map((group, gi) => (
                      <div key={gi} className="flex min-w-0 flex-col gap-1.5">
                        <span className="text-[11px] font-semibold text-text-secondary whitespace-nowrap">
                          {group.date}
                        </span>
                        <div className="flex min-w-0 flex-col gap-2.5">
                          {group.events.map((ev, j) => (
                            <span
                              key={j}
                              className="text-[11px] text-text-secondary leading-tight"
                            >
                              {ev.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}

                    {bucket.groups.length > DESKTOP_GROUP_LIMIT ? (
                      <Link
                        href={bucket.link}
                        className="mt-0.5 text-center text-[10px] font-semibold text-brand hover:text-brand-hover"
                      >
                        Ver histórico completo
                      </Link>
                    ) : (
                      <Link
                        href={bucket.link}
                        className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-brand hover:text-brand-hover"
                      >
                        Ver perfil do aluno <ArrowRight size={10} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
