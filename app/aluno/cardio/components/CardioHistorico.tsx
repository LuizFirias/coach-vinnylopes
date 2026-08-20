'use client';

import { Trash } from '@phosphor-icons/react';
import type { CardioSessao } from '@/lib/types/cardio';
import { RPE_LABELS } from '@/lib/constants/cardio';
import { formatarDuracao } from '@/lib/utils/cardio';
import { ZonaFcBadge } from './ZonaFcBadge';

interface CardioHistoricoProps {
  sessoes: CardioSessao[];
  onDelete: (sessao: CardioSessao) => void;
}

const CARD_STYLE = {
  background: 'var(--mobile-card-bg)',
  border: '1px solid var(--mobile-card-border)',
  boxShadow: 'var(--mobile-card-shadow)',
} as const;

const EMPTY_STYLE = {
  background: 'var(--mobile-empty-bg)',
  border: '1px solid var(--mobile-empty-border)',
} as const;

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  });
}

export function CardioHistorico({ sessoes, onDelete }: CardioHistoricoProps) {
  if (sessoes.length === 0) {
    return (
      <div className="rounded-[16px] p-6 text-center" style={EMPTY_STYLE}>
        <p className="text-[13px] font-semibold text-text-tertiary">
          Nenhuma sessão registrada
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-text-disabled">
          Registre seu primeiro cardio para acompanhar o gasto calórico da semana.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {sessoes.map((s) => (
        <li key={s.id} className="rounded-[14px] px-4 py-3" style={CARD_STYLE}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-text-primary">
                {s.modalidade}
              </p>
              <p className="mt-0.5 text-[11px] text-text-tertiary">
                <span className="tabular-nums lining-nums">{formatarData(s.data)}</span>
                {' · '}
                <span className="tabular-nums lining-nums">{formatarDuracao(s.duracao_min)}</span>
                {s.fc_media !== null && (
                  <>
                    {' · '}
                    <span className="tabular-nums lining-nums">{s.fc_media} bpm</span>
                  </>
                )}
                {s.distancia_km !== null && (
                  <>
                    {' · '}
                    <span className="tabular-nums lining-nums">{s.distancia_km} km</span>
                  </>
                )}
                {s.velocidade_kmh !== null && (
                  <>
                    {' · '}
                    <span className="tabular-nums lining-nums">{s.velocidade_kmh} km/h</span>
                  </>
                )}
                {s.inclinacao_pct !== null && (
                  <>
                    {' · '}
                    <span className="tabular-nums lining-nums">{s.inclinacao_pct}% incl.</span>
                  </>
                )}
                {s.nivel_resistencia !== null && (
                  <>
                    {' · '}
                    nível <span className="tabular-nums lining-nums">{s.nivel_resistencia}</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {s.kcal_calculado !== null && (
                <div className="text-right">
                  <p className="text-[14px] font-bold tabular-nums lining-nums text-danger">
                    {Number(s.kcal_calculado).toLocaleString('pt-BR')}
                    <span className="ml-0.5 text-[10px] font-semibold">kcal</span>
                  </p>
                  {s.kcal_origem && s.kcal_origem !== 'fc' && (
                    <p className="text-[9px] font-medium uppercase tracking-wide text-text-disabled">
                      {s.kcal_origem === 'manual' ? 'Manual' : 'Estimado'}
                    </p>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => onDelete(s)}
                aria-label={`Excluir sessão de ${s.modalidade}`}
                className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-input text-text-tertiary transition-colors hover:text-danger touch-manipulation"
              >
                <Trash size={15} />
              </button>
            </div>
          </div>

          {(s.zona_fc || s.rpe !== null || s.observacao) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ZonaFcBadge zona={s.zona_fc} />
              {s.rpe !== null && (
                <span className="rounded-[4px] border border-input bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
                  RPE <span className="tabular-nums lining-nums">{s.rpe}</span> · {RPE_LABELS[s.rpe]}
                </span>
              )}
              {s.observacao && (
                <span className="text-[11px] text-text-tertiary">{s.observacao}</span>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
