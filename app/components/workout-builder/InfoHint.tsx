"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

interface InfoHintProps {
  text: string;
  className?: string;
}

/**
 * Pequeno (i) com dica ao passar o mouse — mesma ideia dos KPIs do dashboard.
 * Usa portal + posição fixa (em vez de CSS puro) porque essas linhas de
 * cabeçalho vivem dentro de cards com `overflow-hidden` — uma dica só
 * absoluta ficaria cortada por baixo dos cards de cima.
 */
export function InfoHint({ text, className }: InfoHintProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => setMounted(true), []);

  const show = () => {
    const rect = iconRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: rect.top - 6, left: rect.left + rect.width / 2 });
    setOpen(true);
  };
  const hide = () => setOpen(false);

  return (
    <span
      ref={iconRef}
      className={cn("relative inline-flex shrink-0 items-center", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
    >
      <Info size={10} weight="bold" className="cursor-help text-text-tertiary" aria-hidden />
      {mounted &&
        open &&
        pos &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[300] w-max max-w-40 -translate-x-1/2 -translate-y-full rounded-lg border border-border-subtle bg-surface-2 px-2 py-1.5 text-[10px] font-normal normal-case leading-snug text-text-secondary shadow-elev-2"
            style={{ top: pos.top, left: pos.left }}
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
