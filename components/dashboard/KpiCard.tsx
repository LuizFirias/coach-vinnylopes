import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  compact?: boolean;
  delta?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    isFavorable: boolean;
    period: string;
  };
}

export function KpiCard({ label, value, unit, compact, delta }: KpiCardProps) {
  if (compact) {
    return (
      <div className="bg-surface-1 border border-border-subtle rounded-2xl p-3 flex flex-col gap-0.5 shadow-elev-1">
        <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary leading-none">
          {label}
        </span>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="font-mono tabular-nums font-bold text-xl text-text-primary leading-none">
            {value}
          </span>
          {unit && <span className="text-2xs text-text-tertiary">{unit}</span>}
        </div>
      </div>
    );
  }

  const DeltaIcon =
    delta?.direction === 'up' ? ArrowUp :
    delta?.direction === 'down' ? ArrowDown : Minus;

  return (
    <Card className="flex flex-col gap-2">
      <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="font-mono tabular-nums font-semibold text-3xl text-text-primary tracking-tight">
          {value}
        </span>
        {unit && <span className="text-sm text-text-secondary">{unit}</span>}
      </div>
      {delta && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs',
            delta.direction === 'neutral'
              ? 'text-text-tertiary'
              : delta.isFavorable
                ? 'text-success'
                : 'text-danger'
          )}
        >
          <DeltaIcon className="w-3 h-3" strokeWidth={2.5} />
          <span className="font-medium">{delta.value}</span>
          <span className="text-text-tertiary ml-0.5">{delta.period}</span>
        </div>
      )}
    </Card>
  );
}
