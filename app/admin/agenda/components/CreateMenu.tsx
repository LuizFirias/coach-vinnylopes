"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, CalendarCheck, Lock } from "@phosphor-icons/react";
import type { ItemTipo } from "@/lib/agenda/queries";

interface CreateMenuProps {
  onSelect: (tipo: ItemTipo) => void;
}

export function CreateMenu({ onSelect }: CreateMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="auron-cta-btn inline-flex h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold"
      >
        Criar <Plus size={16} weight="bold" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1.5 w-72 rounded-2xl bg-surface-1 p-2 shadow-elev-3">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSelect("aula");
            }}
            className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-surface-2"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success">
              <CalendarCheck size={18} weight="bold" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-text-primary">Agendar aula</span>
              <span className="block text-xs text-text-tertiary">
                Marque uma sessão com um dos seus alunos
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSelect("evento");
            }}
            className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-surface-2"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand">
              <Lock size={18} weight="bold" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-text-primary">Registrar evento</span>
              <span className="block text-xs text-text-tertiary">
                Bloqueie um horário na sua agenda
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
