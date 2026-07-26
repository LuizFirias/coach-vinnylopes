'use client';

import { useState } from 'react';
import { CARDIO_MODALIDADES } from '@/lib/constants/cardio';
import { toISODate } from '@/lib/utils/cardio';
import { RpeSelector } from './RpeSelector';

export interface CardioFormValues {
  modalidade: string;
  data: string;
  duracaoMin: number;
  fcMedia?: number;
  distanciaKm?: number;
  rpe?: number;
  observacao?: string;
}

interface CardioFormProps {
  modalidadePreset?: string;
  duracaoPreset?: number;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (values: CardioFormValues) => void;
}

const INPUT_CLS =
  'w-full rounded-[8px] border border-input bg-surface-2 px-3 py-2.5 text-base font-semibold text-text-primary tabular-nums lining-nums placeholder:text-text-disabled focus:outline-none focus:border-brand';
const LABEL_CLS =
  'block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2';

export function CardioForm({
  modalidadePreset,
  duracaoPreset,
  submitting = false,
  error,
  onSubmit,
}: CardioFormProps) {
  const [modalidade, setModalidade] = useState(modalidadePreset ?? '');
  const [data, setData] = useState(toISODate(new Date()));
  const [duracao, setDuracao] = useState(duracaoPreset?.toString() ?? '');
  const [fcMedia, setFcMedia] = useState('');
  const [distancia, setDistancia] = useState('');
  const [rpe, setRpe] = useState<number | null>(null);
  const [observacao, setObservacao] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const podeEnviar = Boolean(modalidade && duracao) && !submitting;

  const handleSubmit = () => {
    if (!modalidade || !duracao) {
      setLocalError('Modalidade e duração são obrigatórios.');
      return;
    }

    const duracaoMin = parseInt(duracao, 10);
    if (!Number.isFinite(duracaoMin) || duracaoMin <= 0 || duracaoMin > 600) {
      setLocalError('Duração deve estar entre 1 e 600 minutos.');
      return;
    }

    const fc = fcMedia ? parseInt(fcMedia, 10) : undefined;
    if (fc !== undefined && (fc < 30 || fc > 250)) {
      setLocalError('FC média deve estar entre 30 e 250 bpm.');
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
      data,
      duracaoMin,
      fcMedia: fc,
      distanciaKm: km,
      rpe: rpe ?? undefined,
      observacao: observacao || undefined,
    });
  };

  const mensagem = localError ?? error;

  return (
    <div className="space-y-5">
      <div>
        <label className={LABEL_CLS}>Modalidade</label>
        <div className="flex flex-wrap gap-2">
          {CARDIO_MODALIDADES.map((m) => {
            const ativo = modalidade === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setModalidade(m)}
                aria-pressed={ativo}
                className="rounded-[8px] px-3 py-2 text-sm font-medium transition-colors touch-manipulation"
                style={{
                  background: ativo ? '#2b7fff' : 'var(--surface-2)',
                  color: ativo ? '#ffffff' : 'var(--text-secondary)',
                  border: `1px solid ${ativo ? '#2b7fff' : 'var(--border-input)'}`,
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLS} htmlFor="cardio-duracao">
            Duração (min)
          </label>
          <input
            id="cardio-duracao"
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
          <label className={LABEL_CLS} htmlFor="cardio-fc">
            FC média <span className="normal-case text-text-disabled">opcional</span>
          </label>
          <input
            id="cardio-fc"
            type="number"
            inputMode="numeric"
            value={fcMedia}
            onChange={(e) => setFcMedia(e.target.value)}
            placeholder="140"
            min={30}
            max={250}
            className={INPUT_CLS}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLS} htmlFor="cardio-distancia">
            Distância (km) <span className="normal-case text-text-disabled">opcional</span>
          </label>
          <input
            id="cardio-distancia"
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

        <div>
          <label className={LABEL_CLS} htmlFor="cardio-data">
            Data
          </label>
          <input
            id="cardio-data"
            type="date"
            value={data}
            max={toISODate(new Date())}
            onChange={(e) => setData(e.target.value)}
            className={INPUT_CLS}
          />
        </div>
      </div>

      <RpeSelector value={rpe} onChange={setRpe} />

      <div>
        <label className={LABEL_CLS} htmlFor="cardio-obs">
          Observação <span className="normal-case text-text-disabled">opcional</span>
        </label>
        <textarea
          id="cardio-obs"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Como foi a sessão?"
          rows={2}
          className="w-full resize-none rounded-[8px] border border-input bg-surface-2 px-3 py-2.5 text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand"
        />
      </div>

      <p className="text-[11px] leading-relaxed text-text-tertiary">
        Informe a FC média para estimar as calorias e a zona de treino.
      </p>

      {mensagem && <p className="text-[12px] text-danger">{mensagem}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!podeEnviar}
        className="w-full rounded-[10px] bg-brand py-[14px] text-[15px] font-semibold text-white transition-opacity disabled:opacity-40 touch-manipulation"
      >
        {submitting ? 'Registrando…' : 'Registrar cardio'}
      </button>
    </div>
  );
}
