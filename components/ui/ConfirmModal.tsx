"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BodyPortal, useLockBodyScroll } from "@/app/components/ui/BodyPortal";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Voltar",
  confirmVariant = "primary",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  useLockBodyScroll(open);
  if (!open) return null;

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={onClose}
      >
        <Card
          className="w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            id="confirm-modal-title"
            className="text-lg font-semibold text-text-primary mb-2"
          >
            {title}
          </h3>
          <p className="text-sm text-text-secondary mb-6 leading-relaxed">
            {description}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant={confirmVariant}
              onClick={onConfirm}
              loading={loading}
              disabled={loading}
            >
              {confirmLabel}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </Button>
          </div>
        </Card>
      </div>
    </BodyPortal>
  );
}
