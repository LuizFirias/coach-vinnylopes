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
          <p className="text-[15px] font-semibold text-text-primary">
            {entry.value.toFixed(1)} {entry.unit}
          </p>

          <div className="text-right shrink-0">
            <p className="text-xs text-text-muted">{entry.dateShort ?? entry.date}</p>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                className="mt-1 text-xs font-medium text-[#e05555] hover:opacity-80"
              >
                Excluir
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
