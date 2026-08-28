"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

const backButtonClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-transparent border-0 text-brand hover:bg-brand/10 transition-colors";

interface BackButtonProps {
  onClick?: () => void;
  href?: string;
  className?: string;
  "aria-label"?: string;
}

/** Botão voltar padrão AURON — só a seta roxa, sem fundo preenchido */
export function BackButton({
  onClick,
  href,
  className,
  "aria-label": ariaLabel = "Voltar",
}: BackButtonProps) {
  const classes = cn(backButtonClass, className);

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={classes}>
        <ArrowLeft className="w-5 h-5" weight="bold" />
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={classes}>
      <ArrowLeft className="w-5 h-5" weight="bold" />
    </button>
  );
}
