"use client";

import { useEffect } from "react";
import { X } from "@phosphor-icons/react";
import { BodyPortal, useLockBodyScroll } from "@/app/components/ui/BodyPortal";
import { NovoAlunoForm } from "@/app/components/admin/alunos/NovoAlunoForm";

type NovoAlunoModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export function NovoAlunoModal({ open, onClose, onCreated }: NovoAlunoModalProps) {
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="novo-aluno-modal-title"
        onClick={onClose}
      >
        <div
          className="flex max-h-[min(92vh,740px)] w-full max-w-[560px] flex-col overflow-y-auto rounded-2xl bg-surface-1 shadow-[var(--elev-3)] novo-aluno-form"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative shrink-0 px-6 pb-2 pt-5">
            <h2
              id="novo-aluno-modal-title"
              className="pr-10 text-lg font-semibold text-text-primary"
            >
              Cadastrar aluno
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-lg border-0 bg-transparent text-text-tertiary hover:text-text-primary"
            >
              <X size={20} />
            </button>
          </div>
          <div className="px-6 py-3">
            <NovoAlunoForm
              layout="modal"
              onCancel={onClose}
              onCreated={() => onCreated?.()}
            />
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}
