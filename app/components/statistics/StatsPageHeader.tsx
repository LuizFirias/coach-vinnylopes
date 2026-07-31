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
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
    "text-text-tertiary transition-colors",
    "hover:text-text-secondary active:opacity-70",
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex items-center gap-2 px-4 py-3",
        "mobile-page-bg border-b border-black/[0.06] pt-safe-top dark:border-white/[0.06]",
        className,
      )}
    >
      {backHref ? (
        <Link href={backHref} className={backButtonClass} aria-label="Voltar">
          <ArrowLeft size={18} weight="regular" />
        </Link>
      ) : (
        <button type="button" onClick={onBack} className={backButtonClass} aria-label="Voltar">
          <ArrowLeft size={18} weight="regular" />
        </button>
      )}

      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-text-primary">
        {title}
      </h1>

      {periodSelector}
    </header>
  );
}
