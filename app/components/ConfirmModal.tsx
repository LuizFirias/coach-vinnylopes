"use client";

import { useEffect } from "react";
import { WarningCircle } from "@phosphor-icons/react";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (loading) return;
      if (e.key === "Escape") { e.stopImmediatePropagation(); onCancel(); }
      if (e.key === "Enter")  { e.stopImmediatePropagation(); onConfirm(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [loading, onCancel, onConfirm]);

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}
    >
      <div className="bg-surface-1 rounded-2xl w-full max-w-sm shadow-elev-3 p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <WarningCircle
            size={22}
            weight="fill"
            className={destructive ? "text-danger shrink-0 mt-0.5" : "text-brand shrink-0 mt-0.5"}
          />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-text-primary leading-tight">{title}</h3>
            <p className="text-xs text-text-secondary leading-relaxed mt-1">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-surface-3 hover:bg-surface-4 text-text-primary rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
              destructive
                ? "bg-danger hover:bg-danger/90 text-white"
                : "bg-brand hover:bg-brand-hover text-text-on-brand"
            }`}
          >
            {loading ? "Aguarde…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
