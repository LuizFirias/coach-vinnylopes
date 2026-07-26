"use client";

import Link from "next/link";
import { CaretRight, ChartBar, TrendUp, Calendar } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import type { Icon } from "@phosphor-icons/react";

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  className?: string;
}

function ProfileNavLink({ href, label, icon: Icon, className }: NavItem) {
  return (
    <Link
      href={href}
      className={cn(
        "nav-button group flex items-center gap-3 min-h-12 lg:min-h-14",
        "bg-surface-1 border border-card rounded-xl px-4 py-3.5",
        "transition-colors active:bg-surface-2 cursor-pointer",
        "[@media(hover:hover)]:hover:bg-[#1a1a1a] [@media(hover:hover)]:hover:border-card-hover",
        className
      )}
    >
      <Icon size={16} className="text-brand shrink-0" />
      <span className="text-sm font-semibold text-text-primary flex-1">{label}</span>
      <CaretRight
        size={14}
        className="text-text-muted shrink-0 transition-colors [@media(hover:hover)]:group-hover:text-brand"
      />
    </Link>
  );
}

export function ProfileNavButtons() {
  return (
    <nav className="grid grid-cols-2 lg:grid-cols-3 gap-3" aria-label="Atalhos do perfil">
      <ProfileNavLink
        href="/aluno/estatisticas"
        label="Estatísticas"
        icon={ChartBar}
        className="col-span-2 lg:col-span-1"
      />
      <ProfileNavLink href="/aluno/medidas" label="Medidas" icon={TrendUp} />
      <ProfileNavLink href="/aluno/calendario" label="Calendário" icon={Calendar} />
    </nav>
  );
}
