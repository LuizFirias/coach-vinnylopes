'use client';

import { useEffect } from 'react';
import { X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Props = {
  open: boolean;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  onChange: (next: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  }) => void;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
};

export function PlanEditMacrosModal({
  open,
  calories,
  protein,
  carbs,
  fat,
  onChange,
  onClose,
  onSave,
  saving,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const patch = (key: 'calories' | 'protein' | 'carbs' | 'fat', value: string) => {
    onChange({ calories, protein, carbs, fat, [key]: value });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-label="Editar metas de macros"
        className="w-full max-w-sm rounded-2xl bg-surface-1 shadow-elev-3 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--list-row-divider)]">
          <h3 className="text-sm font-bold text-text-primary">Metas diárias</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary"
            aria-label="Fechar"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-3">
          <Input
            label="Calorias (kcal)"
            type="number"
            inputMode="numeric"
            value={calories}
            onChange={(e) => patch('calories', e.target.value)}
            className="!h-10 !text-sm"
          />
          <Input
            label="Proteínas (g)"
            type="number"
            inputMode="decimal"
            value={protein}
            onChange={(e) => patch('protein', e.target.value)}
            className="!h-10 !text-sm"
          />
          <Input
            label="Carboidratos (g)"
            type="number"
            inputMode="decimal"
            value={carbs}
            onChange={(e) => patch('carbs', e.target.value)}
            className="!h-10 !text-sm"
          />
          <Input
            label="Gorduras (g)"
            type="number"
            inputMode="decimal"
            value={fat}
            onChange={(e) => patch('fat', e.target.value)}
            className="!h-10 !text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[color:var(--list-row-divider)]">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={onSave} loading={saving} disabled={saving}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
