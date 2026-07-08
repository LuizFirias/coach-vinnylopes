"use client";



import { cn } from "@/lib/utils/cn";

import { getStatusBadgeClasses, getStatusLabel } from "@/lib/subscriptions/display";

import { CreditCard } from "@phosphor-icons/react";



interface SubscriptionBadgeProps {

  planName?: string | null;

  status?: string | null;

  isActive?: boolean;

  studentUsage?: string | null;

  size?: "sm" | "md";

  className?: string;

}



export function SubscriptionBadge({

  planName,

  status,

  isActive = false,

  studentUsage,

  size = "sm",

  className,

}: SubscriptionBadgeProps) {

  const label = getStatusLabel(status ?? null, isActive);

  const badgeClasses = getStatusBadgeClasses(status ?? null, isActive);



  return (

    <div className={cn("flex flex-col items-center gap-1", className)}>

      <div

        className={cn(

          "inline-flex items-center gap-1.5 rounded-lg border font-bold uppercase tracking-wide",

          size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",

          badgeClasses

        )}

      >

        <CreditCard className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} weight="fill" />

        <span>{planName || "AuronFit"}</span>

        <span className="opacity-60">·</span>

        <span>{label}</span>

      </div>

      {studentUsage && (

        <span className="text-[10px] text-text-tertiary font-medium">{studentUsage}</span>

      )}

    </div>

  );

}

