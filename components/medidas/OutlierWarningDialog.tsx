// components/medidas/OutlierWarningDialog.tsx
// Dialog de soft warning quando medida varia >25% vs última

'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BodyPortal, useLockBodyScroll } from '@/app/components/ui/BodyPortal';

interface OutlierWarningDialogProps {
  campo: string;          // "cintura", "peitoral", "peso"
  novoValor: number;
  ultimoValor: number;
  unidade: string;        // "kg", "cm", "%"
  onConfirmar: () => void;
  onEditar: () => void;
}

export function OutlierWarningDialog({
  campo,
  novoValor,
  ultimoValor,
  unidade,
  onConfirmar,
  onEditar,
}: OutlierWarningDialogProps) {
  useLockBodyScroll(true);

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="outlier-title"
      >
        <Card className="w-full max-w-sm">
          <h3 id="outlier-title" className="text-lg font-semibold text-text-primary mb-2">
            Confirma esse valor?
          </h3>
          <p className="text-sm text-text-secondary mb-4 leading-relaxed">
            Você digitou <span className="font-semibold text-text-primary">{novoValor} {unidade}</span> em {campo}.
            Sua última medida era <span className="font-semibold text-text-primary">{ultimoValor} {unidade}</span>.
          </p>
          <p className="text-xs text-text-tertiary mb-6">
            Variação grande — só queremos garantir que não foi erro de digitação.
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={onEditar}>
              Editar valor
            </Button>
            <Button variant="primary" onClick={onConfirmar}>
              Manter {novoValor} {unidade}
            </Button>
          </div>
        </Card>
      </div>
    </BodyPortal>
  );
}
