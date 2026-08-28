"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus,
  UserPlus,
  Barbell,
  AppleLogo,
} from "@phosphor-icons/react";
import { withReturnUrl } from "@/lib/utils/adminNav";

interface DashboardHeaderProps {
  isMobile: boolean;
  userName?: string;
  coachStudentLimit: number | null;
  linkedStudentCount: number;
  coachAccountType: string;
}

const DASHBOARD = "/admin/dashboard";

const CREATE_ACTIONS = [
  {
    label: "Novo aluno",
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
    icon: AppleLogo,
  },
] as const;

function CreateMenu({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        style={{ touchAction: "manipulation" }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Mais ações"
        aria-expanded={open}
        aria-haspopup="menu"
        className={
          compact
            ? "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-brand text-text-on-brand transition-opacity active:opacity-80"
            : "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-brand px-3 py-2 text-xs font-semibold text-text-on-brand shadow-md shadow-brand/10 transition-all hover:bg-brand-hover active:scale-95"
        }
      >
        <Plus size={compact ? 16 : 13} weight="bold" />
        {!compact && "Mais"}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[11.5rem] overflow-hidden rounded-xl bg-surface-1 shadow-elev-3"
        >
          <div className="flex flex-col py-1">
            {CREATE_ACTIONS.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-left no-underline transition-colors hover:bg-surface-2 active:bg-surface-2"
              >
                <Icon size={18} weight="regular" className="shrink-0 text-brand" />
                <span className="text-[12px] font-medium text-text-primary">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Saudação do dashboard — ações de perfil/notif ficam no CoachAppChrome. */
export function DashboardHeader({
  isMobile,
  userName,
  coachStudentLimit,
  linkedStudentCount,
  coachAccountType,
}: DashboardHeaderProps) {
  const primeiroNome =
    (userName ?? "").trim().split(/\s+/).filter(Boolean)[0] || "Coach";
  const subtitle =
    coachStudentLimit !== null
      ? `${linkedStudentCount}/${coachStudentLimit} alunos`
      : coachAccountType === "parceiro"
        ? "Alunos ilimitados"
        : null;

  return (
    <div className="mb-5 flex items-center justify-between gap-3 pt-0 lg:mb-3">
      {/* pl-9 no mobile — o hambúrguer do menu fica fixo nesse mesmo canto
          em toda tela, sem essa folga o título ficava embaixo dele. */}
      <div className="min-w-0 pl-9 lg:pl-0">
        {/* Desktop: a saudação já aparece no topbar (CoachAppChrome) — evita duplicar. */}
        <h1 className="font-display text-xl font-extrabold tracking-tight text-text-primary md:text-2xl lg:hidden">
          Olá, <span className="text-brand">{primeiroNome}</span>
        </h1>
        {/* Desktop: a contagem de alunos já aparece no card do topbar — evita duplicar. */}
        {subtitle && (
          <p className="mt-0.5 text-xs text-text-tertiary lg:hidden">{subtitle}</p>
        )}
      </div>

      {isMobile && <CreateMenu compact />}
    </div>
  );
}
