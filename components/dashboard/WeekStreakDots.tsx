import { cn } from '@/lib/utils/cn';

type DayStatus = 'completed' | 'planned' | 'rest' | 'today';

interface WeekStreakDotsProps {
  days: { label: string; status: DayStatus }[];
  streakCount?: number;
}

const dotClasses: Record<DayStatus, string> = {
  completed: 'bg-success border-success',
  planned:   'bg-transparent border-brand',
  today:     'bg-brand border-brand animate-pulse',
  rest:      'bg-transparent border-text-tertiary',
};

export function WeekStreakDots({ days, streakCount }: WeekStreakDotsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {days.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
            <span className="text-2xs font-medium uppercase tracking-caps text-text-tertiary">
              {day.label}
            </span>
            <div
              className={cn('w-3 h-3 rounded-full border-2', dotClasses[day.status])}
              aria-label={`${day.label}: ${day.status}`}
            />
          </div>
        ))}
      </div>
      {streakCount != null && streakCount > 0 && (
        <p className="text-sm text-text-secondary text-center">
          Você está em{' '}
          <span className="font-semibold text-text-primary">{streakCount} {streakCount === 1 ? 'semana' : 'semanas'}</span>{' '}
          {streakCount >= 1 ? '🔥' : ''}
        </p>
      )}
    </div>
  );
}
