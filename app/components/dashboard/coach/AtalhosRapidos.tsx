"use client";

import Link from "next/link";
import {
  UserPlus,
  Barbell,
  ForkKnife,
  Handshake,
  type Icon,
} from "@phosphor-icons/react";
import { withReturnUrl } from "@/lib/utils/adminNav";
import { cn } from "@/lib/utils/cn";

const DASHBOARD = "/admin/dashboard";

const ATALHOS: Array<{
  label: string;
  href: string;
  icon: Icon;
}> = [
  {
    label: "Adicionar aluno",
    href: withReturnUrl("/admin/alunos/novo", DASHBOARD),
    icon: UserPlus,
  },
  {
    label: "Novo treino",
    href: withReturnUrl("/admin/treinos/nova-ficha", DASHBOARD),
    icon: Barbell,
  },
  {
    label: "Nova dieta",
    href: withReturnUrl("/admin/nutricao/novo-plano", DASHBOARD),
    icon: ForkKnife,
  },
  {
    label: "Novo parceiro",
    href: withReturnUrl("/admin/parceiros/new", DASHBOARD),
    icon: Handshake,
  },
];

interface AtalhosRapidosProps {
  className?: string;
}

/** Atalhos compactos em faixa — só desktop (pai controla visibilidade). */
export function AtalhosRapidos({ className }: AtalhosRapidosProps) {
  return (
    <section className={cn("min-w-0", className)}>
      <h2 className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        Atalhos rápidos
      </h2>
      <div className="grid grid-cols-4 gap-3 md:gap-4">
        {ATALHOS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex h-[88px] items-center gap-2.5 rounded-2xl border-0 bg-surface-1 px-3.5 no-underline transition-colors hover:bg-surface-2/60 active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand/15">
              <Icon size={20} weight="duotone" />
            </span>
            <span className="min-w-0 truncate text-xs font-semibold leading-tight text-text-primary">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
