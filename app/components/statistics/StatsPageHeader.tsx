"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

interface StatsPageHeaderProps {
  title: string;
  onBack?: () => void;
  backHref?: string;
  periodSelector?: React.ReactNode;
  className?: string;
}

export function StatsPageHeader({
  title,
  onBack,
  backHref,
  periodSelector,
  className,
}: StatsPageHeaderProps) {
  const backButtonClass = cn(
    "w-11 h-11 rounded-lg bg-[#141414] flex items-center justify-center",
    "text-text-secondary hover:text-text-primary transition-colors shrink-0"
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex items-center gap-3 px-4 py-3",
        "mobile-page-bg border-b border-[#1e1e1e] pt-safe-top",
        className
      )}
    >
      {backHref ? (
        <Link href={backHref} className={backButtonClass} aria-label="Voltar">
          <ArrowLeft size={20} />
        </Link>
      ) : (
        <button type="button" onClick={onBack} className={backButtonClass} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
      )}

      <h1 className="flex-1 min-w-0 text-lg font-bold text-text-primary truncate">{title}</h1>

      {periodSelector}
    </header>
  );
}
