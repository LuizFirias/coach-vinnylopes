"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

interface FaltaPopoverProps {
  onPick: (faltaDe: "coach" | "aluno") => void;
  className?: string;
  /** Conteúdo custom do botão-gatilho — default é só o ícone "X" pequeno (uso na lista). */
  children?: ReactNode;
}

/**
 * Botão "X" que abre um miniaturado com 2 opções — "Falta minha" / "Falta
 * do aluno" — pra não perder de quem foi a falta ao marcar uma aula como
 * não feita. Portal + posição fixa, mesmo padrão do InfoHint (evita corte
 * por overflow-hidden do card).
 */
export function FaltaPopover({ onPick, className, children }: FaltaPopoverProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const openPopover = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: rect.bottom + 6, left: rect.right });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (faltaDe: "coach" | "aluno") => {
    setOpen(false);
    onPick(faltaDe);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (open) setOpen(false);
          else openPopover();
        }}
        title="Marcar falta"
        aria-label="Marcar falta"
        className={
          children
            ? className
            : cn(
                "flex items-center justify-center text-text-tertiary transition-colors hover:text-danger",
                className,
              )
        }
      >
        {children ?? <X size={14} weight="bold" />}
      </button>

      {mounted &&
        open &&
        pos &&
        createPortal(
          <div
            ref={popRef}
            role="menu"
            className="fixed z-[300] w-40 -translate-x-full rounded-lg border border-border-subtle bg-surface-2 p-1 shadow-elev-2"
            style={{ top: pos.top, left: pos.left }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => pick("coach")}
              className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs text-text-primary transition-colors hover:bg-surface-3"
            >
              Falta minha
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => pick("aluno")}
              className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs text-text-primary transition-colors hover:bg-surface-3"
            >
              Falta do aluno
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
