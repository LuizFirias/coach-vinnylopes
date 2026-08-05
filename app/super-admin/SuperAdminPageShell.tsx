"use client";

import DashboardTopActions from "@/app/components/DashboardTopActions";
import { BackButton } from "@/app/components/ui/BackButton";
import { cn } from "@/lib/utils/cn";

interface SuperAdminPageShellProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  headerAction?: React.ReactNode;
  maxWidth?: "4xl" | "7xl";
  children: React.ReactNode;
  className?: string;
}

export function SuperAdminPageShell({
  title,
  subtitle,
  backHref,
  headerAction,
  maxWidth = "4xl",
  children,
  className,
}: SuperAdminPageShellProps) {
  const maxWidthClass = maxWidth === "7xl" ? "max-w-7xl" : "max-w-4xl";

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-8 lg:p-10 lg:pl-28 pb-24 text-text-primary font-sans">
      <div className={cn(maxWidthClass, "mx-auto", className)}>
        <div className="dashboard-mobile-toolbar is-surface -mx-4 px-4 pb-3 mb-2 flex items-center justify-end lg:hidden">
          <DashboardTopActions />
        </div>

        {backHref && (
          <BackButton href={backHref} className="mb-4" />
        )}

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary font-display">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction}
        </div>

        {children}
      </div>
    </div>
  );
}
