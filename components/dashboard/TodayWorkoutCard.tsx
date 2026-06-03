import Link from 'next/link';
import { Play, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatVolume } from '@/lib/utils/format';

interface TodayWorkoutCardProps {
  workout: {
    id: string;
    name: string;
    exerciseCount: number;
    estimatedDurationMin: number;
    lastSessionVolumeKg?: number;
    isCompletedToday?: boolean;
    completedDuration?: number;
    completedVolume?: number;
  } | null;
}

export function TodayWorkoutCard({ workout }: TodayWorkoutCardProps) {
  if (!workout) {
    return (
      <Card>
        <div className="text-center py-6">
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            Hoje é dia de descanso
          </h3>
          <p className="text-sm text-text-secondary">
            Aproveite — recuperação é treino também.
          </p>
        </div>
      </Card>
    );
  }

  if (workout.isCompletedToday) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-success-subtle border border-success-border flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-success" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-secondary">Concluído hoje</p>
            <h3 className="text-lg font-semibold text-text-primary truncate">
              {workout.name}
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              {workout.completedDuration} min · {formatVolume(workout.completedVolume ?? 0)}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="primary">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-caps text-brand mb-1">
            Treino de hoje
          </p>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">
            {workout.name}
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            {workout.exerciseCount} exercícios · ~{workout.estimatedDurationMin} min
          </p>
          {workout.lastSessionVolumeKg && (
            <p className="text-xs text-text-tertiary mt-2">
              Última sessão: vol. {formatVolume(workout.lastSessionVolumeKg)}
            </p>
          )}
        </div>
        <Link href={`/aluno/treinos/${workout.id}`} className="block">
          <Button
            variant="primary"
            fullWidth
            leftIcon={<Play className="w-4 h-4" fill="currentColor" />}
          >
            Começar treino
          </Button>
        </Link>
      </div>
    </Card>
  );
}
