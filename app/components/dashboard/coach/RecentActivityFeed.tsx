"use client";

import Link from "next/link";
import { ArrowRight, Barbell, ChatCircle, Calendar } from "@phosphor-icons/react";
import type { GroupedActivity, ActivityType } from "@/lib/utils/activityGrouping";

interface RecentActivityFeedProps {
  activities: GroupedActivity[];
  limit?: number;
  showViewAll?: boolean;
  className?: string;
}

function ActivityIcon({ type }: { type: ActivityType }) {
  if (type === "checkin_sent") return <ChatCircle size={14} />;
  if (type === "workout_manual") return <Calendar size={14} />;
  return <Barbell size={14} />;
}

export function RecentActivityFeed({
  activities,
  limit = 5,
  showViewAll = false,
  className,
}: RecentActivityFeedProps) {
  const visible = activities.slice(0, limit);

  return (
    <div
      className={`bg-surface-1 border border-border-subtle rounded-xl p-4 shadow-sm ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Atividade recente</h3>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Atualizações dos seus alunos
          </p>
        </div>
        {showViewAll && activities.length > limit && (
          <Link href="/admin/alunos" className="text-xs font-semibold text-brand hover:text-brand-hover">
            Ver tudo →
          </Link>
        )}
      </div>

      <div className="flex flex-col">
        {visible.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-tertiary">
            Nenhuma atividade recente encontrada.
          </div>
        ) : (
          visible.map((group, i) => (
            <Link
              key={`${group.studentId}-${i}`}
              href={group.link}
              className="group flex items-start justify-between gap-3 border-b border-border-subtle/50 py-3 last:border-b-0 -mx-2 px-2 rounded-lg hover:bg-surface-2/60 active:bg-surface-2 transition-colors min-h-[44px]"
            >
              <div className="flex gap-3 min-w-0 items-start">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-border-subtle bg-surface-2 text-text-secondary">
                  <ActivityIcon type={group.events[0]?.type ?? "workout_completed"} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-text-primary leading-tight truncate">
                    {group.studentName}
                  </span>
                  {group.events.map((ev, j) => (
                    <span
                      key={j}
                      className="text-[11px] text-text-secondary mt-0.5 leading-tight truncate"
                    >
                      {ev.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                <span className="text-[10px] text-text-tertiary whitespace-nowrap">{group.date}</span>
                <ArrowRight
                  size={12}
                  className="text-text-tertiary group-hover:text-brand transition-colors"
                />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
