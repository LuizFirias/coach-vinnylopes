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
  /** Estatísticas ocupa a linha inteira — ícone+label centralizados, sem seta. */
  centered?: boolean;
}

function ProfileNavLink({ href, label, icon: Icon, className, centered }: NavItem) {
  return (
    <Link
      href={href}
      className={cn(
        "nav-button group flex items-center gap-3 min-h-12 lg:min-h-14",
        "rounded-xl px-4 py-3.5",
        "transition-opacity active:opacity-80 cursor-pointer",
        "[@media(hover:hover)]:hover:brightness-110",
        centered && "justify-center gap-2.5",
        className
      )}
      style={{
        background: "var(--brand-primary)",
        border: "1px solid rgba(255,255,255,0.14)",
      }}
    >
      <Icon size={16} className="shrink-0" style={{ color: "#fff" }} />
      <span
        className={cn(
          "text-sm font-semibold",
          centered ? "shrink-0" : "flex-1",
        )}
        style={{ color: "#fff" }}
      >
        {label}
      </span>
      {!centered && (
        <CaretRight
          size={14}
          className="shrink-0 transition-opacity [@media(hover:hover)]:group-hover:opacity-80"
          style={{ color: "#fff" }}
        />
      )}
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
        centered
      />
      <ProfileNavLink href="/aluno/medidas" label="Medidas" icon={TrendUp} />
      <ProfileNavLink href="/aluno/calendario" label="Calendário" icon={Calendar} />
    </nav>
  );
}
