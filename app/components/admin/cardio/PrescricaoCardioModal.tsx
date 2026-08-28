'use client';

import { useState } from 'react';
import { CaretDown, X } from '@phosphor-icons/react';
import {
  CARDIO_INTENSIDADES,
  DIAS_SEMANA_CURTO,
  CARDIO_CAMPOS,
  CARDIO_CAMPOS_DEFAULT,
  type CardioIntensidade,
} from '@/lib/constants/cardio';
import { ModalidadePickerModal } from '@/app/aluno/cardio/components/ModalidadePickerModal';
import { cn } from '@/lib/utils/cn';

export interface PrescricaoCardioValues {
  modalidade: string;
  duracaoMin: number;
  intensidade: CardioIntensidade;
  distanciaAlvoKm?: number;
  velocidadeAlvoKmh?: number;
  inclinacaoAlvoPct?: number;
  nivelResistenciaAlvo?: number;
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
  'block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-1.5';
const INPUT_CLS =
  'w-full text-sm font-semibold text-text-primary tabular-nums lining-nums placeholder:text-text-disabled';

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
  const [velocidade, setVelocidade] = useState('');
  const [inclinacao, setInclinacao] = useState('');
  const [resistencia, setResistencia] = useState('');
  const [dias, setDias] = useState<number[]>([]);
  const [observacao, setObservacao] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!open) return null;

  const campos = CARDIO_CAMPOS[modalidade] ?? CARDIO_CAMPOS_DEFAULT;

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

    const km = campos.distancia && distancia ? parseFloat(distancia.replace(',', '.')) : undefined;
    if (km !== undefined && (!Number.isFinite(km) || km <= 0)) {
      setLocalError('Distância inválida.');
      return;
    }

    const vel = campos.velocidade && velocidade ? parseFloat(velocidade.replace(',', '.')) : undefined;
    if (vel !== undefined && (!Number.isFinite(vel) || vel <= 0 || vel > 40)) {
      setLocalError('Velocidade alvo inválida.');
      return;
    }

    const inclin = campos.inclinacao && inclinacao ? parseFloat(inclinacao.replace(',', '.')) : undefined;
    if (inclin !== undefined && (!Number.isFinite(inclin) || inclin < 0 || inclin > 25)) {
      setLocalError('Inclinação alvo inválida.');
      return;
    }

    const nivel = campos.resistencia && resistencia ? parseInt(resistencia, 10) : undefined;
    if (nivel !== undefined && (!Number.isFinite(nivel) || nivel < 1 || nivel > 20)) {
      setLocalError('Nível de resistência alvo inválido.');
      return;
    }

    setLocalError(null);
    onSubmit({
      modalidade,
      duracaoMin,
      intensidade,
      distanciaAlvoKm: km,
      velocidadeAlvoKmh: vel,
      inclinacaoAlvoPct: inclin,
      nivelResistenciaAlvo: nivel,
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
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-0 bg-surface-1 p-5 sm:rounded-2xl"
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
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-input text-text-tertiary"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className={LABEL_CLS} id="presc-modalidade-label">
              Modalidade
            </label>
            <button
              type="button"
              aria-labelledby="presc-modalidade-label"
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen(true)}
              className={cn(
                'relative flex w-full items-center bg-transparent border-0 border-b border-border-divider px-0 py-1.5 text-left text-sm font-semibold transition-colors',
                modalidade ? 'text-text-primary' : 'text-text-disabled',
              )}
            >
              <span className="min-w-0 flex-1 truncate pr-6">
                {modalidade || 'Selecionar modalidade'}
              </span>
              <CaretDown
                size={14}
                weight="bold"
                className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-brand"
                aria-hidden
              />
            </button>

            <ModalidadePickerModal
              open={pickerOpen}
              value={modalidade}
              onClose={() => setPickerOpen(false)}
              onChange={(v) => {
                setModalidade(v);
                setLocalError(null);
              }}
            />
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
                    'flex-1 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors border-0',
                    intensidade === i.value
                      ? 'bg-brand text-text-on-brand'
                      : 'bg-transparent text-text-secondary hover:bg-surface-2',
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

          <div className={cn('grid gap-3', campos.distancia ? 'grid-cols-2' : 'grid-cols-1')}>
            <div className="field-flat-input border-b border-border-divider pb-1">
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
            {campos.distancia && (
              <div className="field-flat-input border-b border-border-divider pb-1">
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
            )}
          </div>

          {(campos.velocidade || campos.inclinacao || campos.resistencia) && (
            <div
              className={cn(
                'grid gap-3',
                campos.resistencia && !campos.velocidade && !campos.inclinacao
                  ? 'grid-cols-1'
                  : 'grid-cols-2',
              )}
            >
              {campos.velocidade && (
                <div className="field-flat-input border-b border-border-divider pb-1">
                  <label className={LABEL_CLS} htmlFor="presc-velocidade">
                    Velocidade (km/h) <span className="normal-case text-text-disabled">opcional</span>
                  </label>
                  <input
                    id="presc-velocidade"
                    type="number"
                    inputMode="decimal"
                    value={velocidade}
                    onChange={(e) => setVelocidade(e.target.value)}
                    placeholder="9.0"
                    step="0.1"
                    min={0}
                    className={INPUT_CLS}
                  />
                </div>
              )}
              {campos.inclinacao && (
                <div className="field-flat-input border-b border-border-divider pb-1">
                  <label className={LABEL_CLS} htmlFor="presc-inclinacao">
                    Inclinação (%) <span className="normal-case text-text-disabled">opcional</span>
                  </label>
                  <input
                    id="presc-inclinacao"
                    type="number"
                    inputMode="decimal"
                    value={inclinacao}
                    onChange={(e) => setInclinacao(e.target.value)}
                    placeholder="1.0"
                    step="0.5"
                    min={0}
                    className={INPUT_CLS}
                  />
                </div>
              )}
              {campos.resistencia && (
                <div className="field-flat-input border-b border-border-divider pb-1">
                  <label className={LABEL_CLS} htmlFor="presc-resistencia">
                    Nível <span className="normal-case text-text-disabled">opcional</span>
                  </label>
                  <input
                    id="presc-resistencia"
                    type="number"
                    inputMode="numeric"
                    value={resistencia}
                    onChange={(e) => setResistencia(e.target.value)}
                    placeholder="10"
                    min={1}
                    max={20}
                    className={INPUT_CLS}
                  />
                </div>
              )}
            </div>
          )}

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
                    'flex h-9 flex-1 items-center justify-center rounded-lg text-[11px] font-semibold transition-colors border-0',
                    dias.includes(idx)
                      ? 'bg-brand text-text-on-brand'
                      : 'bg-transparent text-text-secondary hover:bg-surface-2',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="field-flat-input border-b border-border-divider pb-1">
            <label className={LABEL_CLS} htmlFor="presc-obs">
              Observação <span className="normal-case text-text-disabled">opcional</span>
            </label>
            <textarea
              id="presc-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: manter ritmo constante, sem inclinação"
              rows={2}
              className="w-full resize-none text-xs text-text-primary placeholder:text-text-disabled"
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
