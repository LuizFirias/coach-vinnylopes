"use client";

import Link from "next/link";
import {
  ArrowRight,
  Barbell,
  ForkKnife,
  Heartbeat,
  Camera,
  Ruler,
} from "@phosphor-icons/react";
import type { GroupedActivity, ActivityType } from "@/lib/utils/activityGrouping";

interface RecentActivityFeedProps {
  activities: GroupedActivity[];
  limit?: number;
  showViewAll?: boolean;
  className?: string;
}

function ActivityIcon({ type }: { type: ActivityType }) {
  if (type === "cardio_completed") return <Heartbeat size={14} />;
  if (type === "meal_done") return <ForkKnife size={14} />;
  if (type === "measurement_added") return <Ruler size={14} />;
  if (type === "photo_sent") return <Camera size={14} />;
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
      className={`rounded-xl border border-white/10 bg-[rgba(117, 27, 180,0.12)] px-4 pb-4 pt-3 backdrop-blur-xl backdrop-saturate-125 shadow-[0_8px_24px_rgba(0,0,0,0.28)] ${className ?? ""}`}
    >
      <h3 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-text-secondary text-center whitespace-nowrap mb-4">
        Atividades recentes dos seus alunos
      </h3>

      {showViewAll && activities.length > limit && (
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
          visible.map((group, i) => (
            <Link
              key={`${group.studentId}-${i}`}
              href={group.link}
              className="group flex items-start justify-between gap-3 border-b border-white/10 py-3 last:border-b-0 -mx-2 px-2 rounded-lg hover:bg-surface-2/60 active:bg-surface-2 transition-colors min-h-[44px]"
            >
              <div className="flex gap-3 min-w-0 items-start">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border-0 bg-surface-2 text-text-secondary">
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
