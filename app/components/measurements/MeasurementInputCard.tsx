'use client';

import { CircleNotch, Plus, Warning } from '@phosphor-icons/react';
import { useMemo, useState, type CSSProperties, type FocusEvent } from 'react';

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

const SECTION_LABEL: CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#aaa',
  marginBottom: 8,
  display: 'block',
};

const INPUT_BG = '#ebebf0';
const INPUT_BG_FOCUS = '#e4e4ea';

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

  const onFocus = (e: FocusEvent<HTMLInputElement>) => {
    e.target.style.background = INPUT_BG_FOCUS;
  };
  const onBlur = (e: FocusEvent<HTMLInputElement>) => {
    e.target.style.background = INPUT_BG;
  };

  return (
    <div>
      <span style={SECTION_LABEL}>Novo registro</span>

      <div className="mb-2 flex items-center gap-2">
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={submitting}
          style={{
            flex: 1,
            height: 44,
            fontSize: 16,
            fontWeight: 500,
            color: '#1a1a1a',
            background: INPUT_BG,
            border: 'none',
            borderRadius: 10,
            padding: '0 12px',
            outline: 'none',
            fontVariantNumeric: 'tabular-nums',
          }}
        />

        <span style={{ fontSize: 13, color: '#aaa', fontWeight: 500 }}>
          {unit}
        </span>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !raw}
          aria-label="Adicionar registro"
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            border: 'none',
            background:
              'linear-gradient(135deg, #c084fc 0%, #751BB4 55%, #7e22ce 100%)',
            boxShadow: '0 3px 10px rgba(117, 27, 180,0.35)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: submitting || !raw ? 'default' : 'pointer',
            opacity: submitting || !raw ? 0.4 : 1,
            touchAction: 'manipulation',
            transition: 'opacity 0.15s',
            flexShrink: 0,
          }}
        >
          {submitting ? (
            <CircleNotch className="h-5 w-5 animate-spin" />
          ) : (
            <Plus size={18} weight="bold" />
          )}
        </button>
      </div>

      {isSameAsLast && lastDateShort && (
        <p className="mb-2 flex items-center gap-1.5 text-[11px] text-[#f59e0b]">
          <Warning size={11} weight="fill" aria-hidden />
          Mesmo valor do último registro ({lastDateShort})
        </p>
      )}

      {error && <p className="mb-2 text-[11px] text-danger">{error}</p>}

      <div className="mt-2 flex items-center gap-2">
        <span style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>Data</span>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#1a1a1a',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            colorScheme: 'light',
          }}
        />
      </div>
    </div>
  );
}
