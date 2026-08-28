'use client';

import { CircleNotch, Plus, Warning } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { DatePickerField } from '@/components/ui/DatePickerField';

interface MeasurementInputCardProps {
  unit: string;
  date: string;
  placeholder?: string;
  submitting?: boolean;
  error?: string | null;
  lastValue?: number | null;
  lastDateShort?: string | null;
  onDateChange: (isoDate: string) => void;
  onSubmit: (value: number) => void;
}

export function MeasurementInputCard({
  unit,
  date,
  placeholder = '0',
  submitting = false,
  error,
  lastValue = null,
  lastDateShort = null,
  onDateChange,
  onSubmit,
}: MeasurementInputCardProps) {
  const [raw, setRaw] = useState('');

  const isSameAsLast = useMemo(() => {
    if (lastValue === null || !raw) return false;
    const num = parseFloat(raw);
    return !Number.isNaN(num) && num === lastValue;
  }, [raw, lastValue]);

  const handleSubmit = () => {
    const num = parseFloat(raw);
    if (!raw || Number.isNaN(num)) return;
    onSubmit(num);
    setRaw('');
  };

  return (
    <div>
      <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
        Novo registro
      </span>

      <div className="mb-3 flex items-end gap-2">
        <Input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder={placeholder}
          disabled={submitting}
          rightElement={<span className="text-[12px] font-medium">{unit}</span>}
          aria-label={`Novo registro de ${unit}`}
          className="h-9 flex-1 px-3 text-[14px] tabular-nums lining-nums"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !raw}
          aria-label="Adicionar registro"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-[1.5px] text-brand transition-colors touch-manipulation disabled:cursor-default disabled:opacity-40"
          style={{ borderColor: '#751BB4', background: 'transparent' }}
        >
          {submitting ? (
            <CircleNotch className="h-4 w-4 animate-spin" />
          ) : (
            <Plus size={16} weight="bold" />
          )}
        </button>
      </div>

      {isSameAsLast && lastDateShort && (
        <p className="mb-2 flex items-center gap-1.5 text-[11px] text-warning">
          <Warning size={11} weight="fill" aria-hidden />
          Mesmo valor do último registro ({lastDateShort})
        </p>
      )}

      {error && <p className="mb-2 text-[11px] text-danger">{error}</p>}

      <DatePickerField label="Data" value={date} onChange={onDateChange} variant="bare" />
    </div>
  );
}
