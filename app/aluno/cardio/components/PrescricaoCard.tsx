'use client';

import { DIAS_SEMANA_CURTO } from '@/lib/constants/cardio';
import { formatarDuracao } from '@/lib/utils/cardio';
import type { CardioPrescricao } from '@/lib/types/cardio';

interface PrescricaoCardProps {
  prescricao: CardioPrescricao;
  onRegistrar: (prescricao: CardioPrescricao) => void;
}

export function PrescricaoCard({ prescricao, onRegistrar }: PrescricaoCardProps) {
  const dias = prescricao.dias_semana
    ?.slice()
    .sort((a, b) => a - b)
    .map((d) => DIAS_SEMANA_CURTO[d])
    .filter(Boolean);

  return (
    <div className="rounded-[16px] border-0 bg-[var(--dash-card,#111827)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-text-primary">
            {prescricao.modalidade}
          </p>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            <span className="tabular-nums lining-nums">
              {formatarDuracao(prescricao.duracao_min)}
            </span>
            {prescricao.intensidade && <> · {prescricao.intensidade}</>}
            {prescricao.fc_alvo_min !== null && prescricao.fc_alvo_max !== null && (
              <>
                {' · '}
                <span className="tabular-nums lining-nums">
                  {prescricao.fc_alvo_min}–{prescricao.fc_alvo_max} bpm
                </span>
              </>
            )}
          </p>
          {dias && dias.length > 0 && (
            <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-text-tertiary">
              {dias.join(' · ')}
            </p>
          )}
          {prescricao.observacao && (
            <p className="mt-1.5 text-[11px] text-text-tertiary">{prescricao.observacao}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRegistrar(prescricao)}
          className="shrink-0 rounded-[8px] border border-input bg-surface-2 px-3 py-2 text-[11px] font-semibold text-brand transition-colors hover:border-card-hover touch-manipulation"
        >
          Registrar
        </button>
      </div>
    </div>
  );
}
