'use client';

import { useState } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { cn } from '@/lib/utils/cn';

export interface HistoryEntry {
  id: string;
  value: number;
  unit: string;
  date: string;
  dateShort?: string;
  delta: number | null;
}

interface MeasurementHistoryListProps {
  entries: HistoryEntry[];
  onSeeAll?: () => void;
  showAll?: boolean;
  onDelete?: (id: string) => void;
}

export function MeasurementHistoryList({
  entries,
  onSeeAll,
  showAll = false,
  onDelete,
}: MeasurementHistoryListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const visible = showAll ? entries : entries.slice(0, 5);

  if (entries.length === 0) return null;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
          Histórico
        </h2>
        {onSeeAll && entries.length > 5 && !showAll && (
          <button
            type="button"
            onClick={onSeeAll}
            style={{ touchAction: 'manipulation' }}
            className="text-[11px] font-medium text-brand"
          >
            Ver tudo
          </button>
        )}
      </div>

      {visible.map((entry, index) => (
        <div
          key={entry.id}
          className={cn(
            'flex items-start justify-between gap-3 py-3',
            index < visible.length - 1 && 'border-b border-[#1e1e1e]',
          )}
        >
          <p className="text-[15px] font-semibold text-text-primary tabular-nums lining-nums">
            {entry.value.toFixed(1)} {entry.unit}
          </p>

          <div className="text-right shrink-0">
            <p className="text-xs text-text-muted">{entry.dateShort ?? entry.date}</p>
            {onDelete && (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(entry.id)}
                className="mt-1 text-[11px] font-semibold transition-opacity hover:opacity-70"
                style={{ color: '#e05555', touchAction: 'manipulation' }}
                aria-label={`Excluir registro de ${entry.dateShort ?? entry.date}`}
              >
                Excluir
              </button>
            )}
          </div>
        </div>
      ))}

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Excluir registro"
        description="Este registro será removido permanentemente do histórico."
        confirmLabel="Excluir"
        confirmVariant="danger"
        onConfirm={() => {
          if (confirmDeleteId) {
            onDelete?.(confirmDeleteId);
          }
          setConfirmDeleteId(null);
        }}
        onClose={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
