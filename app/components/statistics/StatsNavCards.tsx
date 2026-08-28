"use client";

import type { Icon } from "@phosphor-icons/react";
import { ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

export interface StatsNavItem {
  icon: Icon;
  title: string;
  subtitle: string;
  onClick: () => void;
}

interface StatsNavCardsProps {
  items: StatsNavItem[];
  className?: string;
}

export function StatsNavCards({ items, className }: StatsNavCardsProps) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-2.5">
        Estatísticas avançadas
      </p>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={item.onClick}
            className={cn(
              "w-full min-h-[60px] flex items-center gap-3.5 px-4 py-3.5 text-left",
              "rounded-xl border mobile-stat-nav-card",
              "transition-colors [@media(hover:hover)]:hover:border-[var(--mobile-card-border)]",
              "group"
            )}
          >
            <item.icon size={18} className="text-brand shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary leading-tight">{item.title}</p>
              <p className="text-[11px] text-text-muted mt-0.5 leading-snug">{item.subtitle}</p>
            </div>
            <ArrowRight
              size={16}
              className="text-text-muted shrink-0 transition-colors group-hover:text-brand"
              aria-hidden
            />
          </button>
        ))}
      </div>
    </div>
  );
}
