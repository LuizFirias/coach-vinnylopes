'use client';

import { useState, type CSSProperties } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

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

const SECTION_LABEL: CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#aaa',
};

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
        <h2 style={SECTION_LABEL}>Histórico</h2>
        {onSeeAll && entries.length > 5 && !showAll && (
          <button
            type="button"
            onClick={onSeeAll}
            style={{
              touchAction: 'manipulation',
              fontSize: 11,
              fontWeight: 500,
              color: '#D4A843',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Ver tudo
          </button>
        )}
      </div>

      {visible.map((entry, index) => (
        <div
          key={entry.id}
          className="flex items-center justify-between gap-3 py-3"
          style={{
            borderBottom:
              index < visible.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
          }}
        >
          <p
            className="tabular-nums lining-nums"
            style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}
          >
            {entry.value.toFixed(1)}{' '}
            <span style={{ color: '#aaa', fontSize: 12 }}>{entry.unit}</span>
          </p>

          <div className="flex shrink-0 items-center gap-3">
            <p style={{ fontSize: 12, color: '#aaa' }}>
              {entry.dateShort ?? entry.date}
            </p>
            {onDelete && (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(entry.id)}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#e05555',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
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
