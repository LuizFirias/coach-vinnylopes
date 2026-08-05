"use client";

import { cn } from "@/lib/utils/cn";
import { BackButton } from "@/app/components/ui/BackButton";

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
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex items-center gap-2 px-4 py-3",
        "mobile-page-bg border-b border-black/[0.06] pt-safe-top dark:border-white/[0.06]",
        className,
      )}
    >
      {backHref ? (
        <BackButton href={backHref} />
      ) : (
        <BackButton onClick={onBack} />
      )}

      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-text-primary">
        {title}
      </h1>

      {periodSelector}
    </header>
  );
}
