'use client';

import { useEffect, useRef, useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

export interface PeriodSelectOption {
  value: string;
  label: string;
}

interface PeriodSelectProps {
  value: string;
  options: PeriodSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  /** Alinhamento do menu — default right (como na ficha) */
  align?: 'left' | 'right';
  /** period = roxo compacto; title = título escuro (métrica) */
  variant?: 'period' | 'title';
  'aria-label'?: string;
}

/**
 * Seletor de período padrão AURON — trigger texto + dropdown.
 * Mesmo padrão da ficha de treino (`FichaHistoricoChart`).
 *
 * @example
 * import { PeriodSelect } from '@/app/components/ui/PeriodSelect';
 * <PeriodSelect value={periodo} options={OPTS} onChange={setPeriodo} />
 */
export function PeriodSelect({
  value,
  options,
  onChange,
  className,
  align = 'right',
  variant = 'period',
  'aria-label': ariaLabel = 'Selecionar período',
}: PeriodSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  const currentLabel =
    options.find((o) => o.value === value)?.label ?? options[0]?.label ?? '';

  const isTitle = variant === 'title';

  return (
    <div ref={rootRef} className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-0.5"
        style={{
          fontSize: isTitle ? 14 : 10,
          fontWeight: isTitle ? 700 : 400,
          color: isTitle ? '#1a1a1a' : '#D4A843',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          touchAction: 'manipulation',
          whiteSpace: 'nowrap',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span>{currentLabel}</span>
        <CaretDown
          size={isTitle ? 11 : 9}
          weight="bold"
          style={{ color: '#D4A843' }}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className={cn(
            'absolute top-full z-30 mt-1 min-w-full overflow-hidden rounded-lg py-1',
            align === 'right' ? 'right-0' : 'left-0',
          )}
          style={{
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            whiteSpace: 'nowrap',
          }}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full px-3 py-1.5',
                    align === 'right' ? 'text-right' : 'text-left',
                  )}
                  style={{
                    fontSize: isTitle ? 13 : 11,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#D4A843' : '#555',
                    background: active ? 'rgba(212, 168, 67,0.06)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
