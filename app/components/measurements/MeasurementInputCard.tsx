'use client';

import { CircleNotch } from '@phosphor-icons/react';
import { useState } from 'react';
import { MEASUREMENT_COLORS } from '@/lib/measurements/types';

interface MeasurementInputCardProps {
  unit: string;
  date: string;
  placeholder?: string;
  submitting?: boolean;
  error?: string | null;
  onDateChange: (isoDate: string) => void;
  onSubmit: (value: number) => void;
}

export function MeasurementInputCard({
  unit,
  date,
  placeholder = '0',
  submitting = false,
  error,
  onDateChange,
  onSubmit,
}: MeasurementInputCardProps) {
  const [raw, setRaw] = useState('');

  const handleSubmit = () => {
    const num = parseFloat(raw);
    if (!raw || Number.isNaN(num)) return;
    onSubmit(num);
    setRaw('');
  };

  return (
    <div
      className="mb-2.5 rounded-[14px] p-3.5"
      style={{ backgroundColor: MEASUREMENT_COLORS.card }}
    >
      <p
        className="mb-2.5 text-[9px] font-semibold tracking-wider"
        style={{ color: MEASUREMENT_COLORS.textSecondary }}
      >
        NOVO REGISTRO
      </p>

      <div className="mb-2.5 flex items-center gap-2">
        <div
          className="flex h-11 flex-1 items-center justify-between rounded-[10px] border px-3.5"
          style={{
            backgroundColor: MEASUREMENT_COLORS.input,
            borderColor: MEASUREMENT_COLORS.inputBorder,
          }}
        >
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-lg font-bold outline-none"
            style={{ color: MEASUREMENT_COLORS.text }}
            disabled={submitting}
          />
          <span className="text-[13px] font-semibold" style={{ color: MEASUREMENT_COLORS.primary }}>
            {unit}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !raw}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-2xl font-light leading-none disabled:opacity-40"
          style={{ backgroundColor: MEASUREMENT_COLORS.primary, color: '#fff' }}
        >
          {submitting ? <CircleNotch className="h-5 w-5 animate-spin" /> : '+'}
        </button>
      </div>

      {error && (
        <p className="mb-2 text-[11px] text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <span className="text-[11px]" style={{ color: MEASUREMENT_COLORS.textSecondary }}>
          Data
        </span>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="bg-transparent text-[11px] outline-none"
          style={{ color: MEASUREMENT_COLORS.textDate }}
        />
      </div>
    </div>
  );
}
