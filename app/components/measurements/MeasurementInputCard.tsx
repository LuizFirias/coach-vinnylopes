'use client';

import { CircleNotch, Plus, Warning } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

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
      <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
        Novo registro
      </p>

      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-11 flex-1 items-center justify-between rounded-[10px] border-0 bg-[var(--mobile-secondary-bg)] px-4">
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent text-[22px] font-bold text-text-primary border-0 outline-none shadow-none ring-0 focus:outline-none focus:shadow-none focus:ring-0 focus-visible:!outline-none focus-visible:!shadow-none focus-visible:!border-transparent"
            disabled={submitting}
          />
          <span className="text-sm text-text-secondary">{unit}</span>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !raw}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand text-white disabled:opacity-40"
          aria-label="Adicionar registro"
        >
          {submitting ? (
            <CircleNotch className="h-5 w-5 animate-spin" />
          ) : (
            <Plus size={20} weight="bold" />
          )}
        </button>
      </div>

      {isSameAsLast && lastDateShort && (
        <p className="mb-2 flex items-center gap-1.5 text-[11px] text-[#f59e0b]">
          <Warning size={11} weight="fill" aria-hidden />
          Mesmo valor do último registro ({lastDateShort})
        </p>
      )}

      {error && <p className="mb-2 text-[11px] text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-text-muted">Data</span>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="bg-transparent text-[11px] text-text-secondary border-0 outline-none shadow-none ring-0 focus:outline-none focus:shadow-none focus:ring-0 focus-visible:!outline-none focus-visible:!shadow-none focus-visible:!border-transparent"
        />
      </div>
    </div>
  );
}
