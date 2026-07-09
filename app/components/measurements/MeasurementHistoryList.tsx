import { DeltaValue } from '@/app/components/measurements/DeltaLine';
import { MEASUREMENT_COLORS } from '@/lib/measurements/types';

export interface HistoryEntry {
  id: string;
  value: number;
  unit: string;
  date: string;
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
        <h2 className="text-sm font-bold" style={{ color: MEASUREMENT_COLORS.text }}>
          Histórico
        </h2>
        {onSeeAll && entries.length > 5 && !showAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="text-[11px] font-medium"
            style={{ color: MEASUREMENT_COLORS.primary }}
          >
            Ver tudo
          </button>
        )}
      </div>

      {visible.map((entry, index) => (
        <div
          key={entry.id}
          className="flex items-center justify-between py-2.5"
          style={{
            borderBottom:
              index === visible.length - 1 ? 'none' : `1px solid ${MEASUREMENT_COLORS.divider}`,
          }}
        >
          <div>
            <p className="text-sm font-bold" style={{ color: MEASUREMENT_COLORS.text }}>
              {entry.value.toFixed(1)} {entry.unit}
            </p>
            <p className="mt-0.5 text-[10px]" style={{ color: MEASUREMENT_COLORS.textMuted }}>
              {entry.date}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <DeltaValue delta={entry.delta} />
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                className="text-[10px] text-red-400/70 hover:text-red-400"
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
