'use client';

import { useState, type CSSProperties, type FocusEvent } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { toISODate } from '@/lib/utils/cardio';
import { RpeSelector } from './RpeSelector';
import { ModalidadePickerModal } from './ModalidadePickerModal';

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

const LABEL_STYLE: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: '#aaa',
  marginBottom: 6,
  display: 'block',
};

const OPTIONAL_STYLE: CSSProperties = {
  textTransform: 'none',
  fontWeight: 400,
  fontSize: 10,
};

const INPUT_BG = 'var(--surface-2)';
const INPUT_BG_FOCUS = '#e4e4ea';

const inputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  fontSize: 16,
  fontWeight: 400,
  color: '#1a1a1a',
  background: INPUT_BG,
  border: 'none',
  borderRadius: 10,
  padding: '0 12px',
  outline: 'none',
  fontVariantNumeric: 'tabular-nums',
};

function onInputFocus(e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.background = INPUT_BG_FOCUS;
}

function onInputBlur(e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.background = INPUT_BG;
}

function OptionalHint() {
  return <span style={OPTIONAL_STYLE}> opcional</span>;
}

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
  const [pickerOpen, setPickerOpen] = useState(false);

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
    <div className="flex flex-col gap-5">
      <div>
        <label style={LABEL_STYLE} id="cardio-modalidade-label">
          Modalidade
        </label>
        <button
          type="button"
          id="cardio-modalidade"
          aria-labelledby="cardio-modalidade-label"
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen(true)}
          className="relative flex w-full items-center touch-manipulation"
          style={{
            ...inputStyle,
            padding: '0 36px 0 12px',
            cursor: 'pointer',
            color: modalidade ? '#1a1a1a' : '#bbb',
            fontVariantNumeric: undefined,
            textAlign: 'left',
          }}
        >
          <span className="truncate">
            {modalidade || 'Selecionar modalidade'}
          </span>
          <CaretDown
            size={14}
            weight="bold"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: '#751BB4' }}
            aria-hidden
          />
        </button>

        <ModalidadePickerModal
          open={pickerOpen}
          value={modalidade}
          onClose={() => setPickerOpen(false)}
          onChange={setModalidade}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={LABEL_STYLE} htmlFor="cardio-duracao">
            Duração (min)
          </label>
          <input
            id="cardio-duracao"
            type="number"
            inputMode="numeric"
            value={duracao}
            onChange={(e) => setDuracao(e.target.value)}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            placeholder="30"
            min={1}
            max={600}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={LABEL_STYLE} htmlFor="cardio-fc">
            FC média
            <OptionalHint />
          </label>
          <input
            id="cardio-fc"
            type="number"
            inputMode="numeric"
            value={fcMedia}
            onChange={(e) => setFcMedia(e.target.value)}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            placeholder="140"
            min={30}
            max={250}
            style={inputStyle}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={LABEL_STYLE} htmlFor="cardio-distancia">
            Distância (km)
            <OptionalHint />
          </label>
          <input
            id="cardio-distancia"
            type="number"
            inputMode="decimal"
            value={distancia}
            onChange={(e) => setDistancia(e.target.value)}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            placeholder="5.0"
            step="0.1"
            min={0}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={LABEL_STYLE} htmlFor="cardio-data">
            Data
          </label>
          <input
            id="cardio-data"
            type="date"
            value={data}
            max={toISODate(new Date())}
            onChange={(e) => setData(e.target.value)}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            style={{ ...inputStyle, colorScheme: 'light' }}
          />
        </div>
      </div>

      <RpeSelector value={rpe} onChange={setRpe} />

      <div>
        <label style={LABEL_STYLE} htmlFor="cardio-obs">
          Observação
          <OptionalHint />
        </label>
        <textarea
          id="cardio-obs"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          placeholder="Como foi a sessão?"
          rows={3}
          style={{
            ...inputStyle,
            height: 'auto',
            padding: '10px 12px',
            resize: 'none',
            lineHeight: 1.5,
          }}
        />
      </div>

      <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.5 }}>
        Use a FC média para estimar as calorias e a zona de treino.
      </p>

      {mensagem && <p className="text-[12px] text-danger">{mensagem}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!podeEnviar}
        style={{
          width: '100%',
          height: 48,
          borderRadius: 12,
          border: 'none',
          background: 'var(--btn-primary-bg)',
          boxShadow: '0 4px 16px rgba(117, 27, 180,0.35)',
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
          cursor: podeEnviar ? 'pointer' : 'default',
          opacity: podeEnviar ? 1 : 0.4,
          touchAction: 'manipulation',
          transition: 'opacity 0.15s',
        }}
      >
        {submitting ? 'Registrando…' : 'Registrar cardio'}
      </button>
    </div>
  );
}
