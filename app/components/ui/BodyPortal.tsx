"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renderiza filhos em `document.body` para overlays `position:fixed`.
 * Evita containing block de ancestrais com transform/filter/overflow
 * (ex.: cards da ficha no drag) — modal “sai da tela” no mobile.
 */
export function BodyPortal({
  children,
  open = true,
}: {
  children: ReactNode;
  open?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;
  return createPortal(children, document.body);
}

/** Trava scroll do documento enquanto o overlay está aberto. */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}
