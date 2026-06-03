import { formatWeight } from '@/lib/utils/format';

export interface SerieAnterior {
  peso: number;
  reps: number;
}

interface PreviousSetIndicatorProps {
  anterior: SerieAnterior | null;
}

export function PreviousSetIndicator({ anterior }: PreviousSetIndicatorProps) {
  return (
    <div className="bg-surface-2 rounded-md p-3 flex flex-col gap-1">
      <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">
        Anterior
      </span>
      {anterior == null ? (
        <p className="text-sm text-text-secondary">
          Primeira vez · comece leve, foque na técnica
        </p>
      ) : (
        <p className="text-base font-mono tabular-nums font-medium text-text-primary">
          {formatWeight(anterior.peso)} × {anterior.reps}
        </p>
      )}
    </div>
  );
}

/**
 * Extrai a série anterior do JSONB retornado por get_ultimo_treino_exercicio.
 * Filtra apenas séries completadas com peso real (peso_atual > 0).
 */
export function getSerieAnterior(
  ultimaSessao: {
    series?: Array<{
      ordem: number;
      peso_atual: number;
      reps: number | string;
      completado: boolean;
    }>;
  } | null,
  ordemSerie: number
): SerieAnterior | null {
  if (!ultimaSessao?.series) return null;
  const serie = ultimaSessao.series.find(
    (s) => s.ordem === ordemSerie && s.completado && s.peso_atual > 0
  );
  if (!serie) return null;
  const reps = typeof serie.reps === 'string' ? parseInt(serie.reps, 10) : serie.reps;
  if (!Number.isFinite(reps) || reps < 1) return null;
  return { peso: serie.peso_atual, reps };
}
