'use client';

import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import {
  CARDIO_INTENSIDADES,
  CARDIO_MODALIDADES,
  DIAS_SEMANA_CURTO,
  type CardioIntensidade,
} from '@/lib/constants/cardio';
import { cn } from '@/lib/utils/cn';

export interface PrescricaoCardioValues {
  modalidade: string;
  duracaoMin: number;
  intensidade: CardioIntensidade;
  distanciaAlvoKm?: number;
  diasSemana?: number[];
  observacao?: string;
}

interface PrescricaoCardioModalProps {
  open: boolean;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (values: PrescricaoCardioValues) => void;
  onClose: () => void;
}

const LABEL_CLS =
  'block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2';
const INPUT_CLS =
  'w-full rounded-[8px] border border-input bg-surface-2 px-3 py-2.5 text-sm font-semibold text-text-primary tabular-nums lining-nums placeholder:text-text-disabled focus:outline-none focus:border-brand';

export function PrescricaoCardioModal({
  open,
  submitting = false,
  error,
  onSubmit,
  onClose,
}: PrescricaoCardioModalProps) {
  const [modalidade, setModalidade] = useState('');
  const [duracao, setDuracao] = useState('');
  const [intensidade, setIntensidade] = useState<CardioIntensidade>('moderada');
  const [distancia, setDistancia] = useState('');
  const [dias, setDias] = useState<number[]>([]);
  const [observacao, setObservacao] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  if (!open) return null;

  const toggleDia = (d: number) => {
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const handleSubmit = () => {
    const duracaoMin = parseInt(duracao, 10);
    if (!modalidade) {
      setLocalError('Selecione a modalidade.');
      return;
    }
    if (!Number.isFinite(duracaoMin) || duracaoMin <= 0 || duracaoMin > 600) {
      setLocalError('Duração deve estar entre 1 e 600 minutos.');
      return;
    }

    const km = distancia ? parseFloat(distancia.replace(',', '.')) : undefined;
    if (km !== undefined && (!Number.isFinite(km) || km <= 0)) {
      setLocalError('Distância inválida.');
      return;
    }

    setLocalError(null);
    onSubmit({
      modalidade,
      duracaoMin,
      intensidade,
      distanciaAlvoKm: km,
      diasSemana: dias.length ? dias : undefined,
      observacao: observacao || undefined,
    });
  };

  const mensagem = localError ?? error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prescricao-cardio-title"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[24px] border border-card bg-surface-1 p-5 sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 id="prescricao-cardio-title" className="text-base font-bold text-text-primary">
              Prescrever cardio
            </h2>
            <p className="mt-0.5 text-[11px] text-text-secondary">
              A faixa de FC alvo é calculada pela idade do aluno
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-input text-text-tertiary"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className={LABEL_CLS}>Modalidade</label>
            <div className="flex flex-wrap gap-2">
              {CARDIO_MODALIDADES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModalidade(m)}
                  aria-pressed={modalidade === m}
                  className={cn(
                    'rounded-[8px] px-3 py-2 text-xs font-medium transition-colors',
                    modalidade === m
                      ? 'bg-brand text-text-on-brand border border-brand'
                      : 'bg-surface-2 text-text-secondary border border-input',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Intensidade</label>
            <div className="flex gap-2">
              {CARDIO_INTENSIDADES.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  onClick={() => setIntensidade(i.value)}
                  aria-pressed={intensidade === i.value}
                  className={cn(
                    'flex-1 rounded-[8px] px-3 py-2.5 text-xs font-semibold transition-colors',
                    intensidade === i.value
                      ? 'bg-brand text-text-on-brand border border-brand'
                      : 'bg-surface-2 text-text-secondary border border-input',
                  )}
                >
                  {i.label}
                  <span className="mt-0.5 block text-[10px] font-normal opacity-70 tabular-nums lining-nums">
                    {i.pct}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS} htmlFor="presc-duracao">
                Duração (min)
              </label>
              <input
                id="presc-duracao"
                type="number"
                inputMode="numeric"
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
                placeholder="30"
                min={1}
                max={600}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS} htmlFor="presc-distancia">
                Distância (km) <span className="normal-case text-text-disabled">opcional</span>
              </label>
              <input
                id="presc-distancia"
                type="number"
                inputMode="decimal"
                value={distancia}
                onChange={(e) => setDistancia(e.target.value)}
                placeholder="5.0"
                step="0.1"
                min={0}
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>
              Dias da semana <span className="normal-case text-text-disabled">opcional</span>
            </label>
            <div className="flex gap-1.5">
              {DIAS_SEMANA_CURTO.map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDia(idx)}
                  aria-pressed={dias.includes(idx)}
                  className={cn(
                    'flex h-9 flex-1 items-center justify-center rounded-[8px] text-[11px] font-semibold transition-colors',
                    dias.includes(idx)
                      ? 'bg-brand text-text-on-brand border border-brand'
                      : 'bg-surface-2 text-text-secondary border border-input',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL_CLS} htmlFor="presc-obs">
              Observação <span className="normal-case text-text-disabled">opcional</span>
            </label>
            <textarea
              id="presc-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: manter ritmo constante, sem inclinação"
              rows={2}
              className="w-full resize-none rounded-[8px] border border-input bg-surface-2 px-3 py-2.5 text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand"
            />
          </div>

          {mensagem && <p className="text-[12px] text-danger">{mensagem}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-[10px] bg-brand py-3 text-sm font-semibold text-text-on-brand transition-opacity disabled:opacity-40"
          >
            {submitting ? 'Salvando…' : 'Prescrever'}
          </button>
        </div>
      </div>
    </div>
  );
}
