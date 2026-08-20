'use client';

import { useEffect, useRef, useState, type CSSProperties, type FocusEvent } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';
import { toISODate } from '@/lib/utils/cardio';
import { MODALIDADES_CARDIO, CARDIO_CAMPOS, CARDIO_CAMPOS_DEFAULT } from '@/lib/constants/cardio';
import { cn } from '@/lib/utils/cn';
import { RpeSelector } from './RpeSelector';

export interface CardioFormValues {
  modalidade: string;
  data: string;
  duracaoMin: number;
  fcMedia?: number;
  distanciaKm?: number;
  rpe?: number;
  observacao?: string;
  kcalManual?: number;
  velocidadeKmh?: number;
  inclinacaoPct?: number;
  nivelResistencia?: number;
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
  height: 40,
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
  const [kcalManual, setKcalManual] = useState('');
  const [velocidade, setVelocidade] = useState('');
  const [inclinacao, setInclinacao] = useState('');
  const [resistencia, setResistencia] = useState('');
  const [rpe, setRpe] = useState<number | null>(null);
  const [observacao, setObservacao] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (pickerRef.current?.contains(e.target as Node)) return;
      setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  const campos = CARDIO_CAMPOS[modalidade] ?? CARDIO_CAMPOS_DEFAULT;

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

    const km = campos.distancia && distancia ? parseFloat(distancia.replace(',', '.')) : undefined;
    if (km !== undefined && (!Number.isFinite(km) || km <= 0)) {
      setLocalError('Distância inválida.');
      return;
    }

    const kcal = kcalManual ? parseInt(kcalManual, 10) : undefined;
    if (kcal !== undefined && (!Number.isFinite(kcal) || kcal <= 0 || kcal > 5000)) {
      setLocalError('Calorias inválidas.');
      return;
    }

    const vel = campos.velocidade && velocidade ? parseFloat(velocidade.replace(',', '.')) : undefined;
    if (vel !== undefined && (!Number.isFinite(vel) || vel <= 0 || vel > 40)) {
      setLocalError('Velocidade inválida.');
      return;
    }

    const inclin = campos.inclinacao && inclinacao ? parseFloat(inclinacao.replace(',', '.')) : undefined;
    if (inclin !== undefined && (!Number.isFinite(inclin) || inclin < 0 || inclin > 25)) {
      setLocalError('Inclinação inválida.');
      return;
    }

    const nivel = campos.resistencia && resistencia ? parseInt(resistencia, 10) : undefined;
    if (nivel !== undefined && (!Number.isFinite(nivel) || nivel < 1 || nivel > 20)) {
      setLocalError('Nível de resistência inválido.');
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
      kcalManual: kcal,
      velocidadeKmh: vel,
      inclinacaoPct: inclin,
      nivelResistencia: nivel,
    });
  };

  const mensagem = localError ?? error;

  return (
    <div className="flex flex-col gap-4">
      <div ref={pickerRef} className="relative">
        <label style={LABEL_STYLE} id="cardio-modalidade-label">
          Modalidade
        </label>
        <button
          type="button"
          id="cardio-modalidade"
          aria-labelledby="cardio-modalidade-label"
          aria-haspopup="listbox"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((v) => !v)}
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
            className={cn(
              'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform',
              pickerOpen && 'rotate-180',
            )}
            style={{ color: '#751BB4' }}
            aria-hidden
          />
        </button>

        {pickerOpen && (
          <div
            role="listbox"
            aria-labelledby="cardio-modalidade-label"
            className="absolute top-full left-0 z-30 mt-1.5 max-h-52 w-full overflow-y-auto overscroll-contain rounded-[10px] py-1.5"
            style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            {MODALIDADES_CARDIO.map((grupo, gi) => (
              <div key={grupo.grupo}>
                {gi > 0 && (
                  <div className="mx-3 my-1.5" style={{ height: 1, background: 'rgba(117,27,180,0.15)' }} aria-hidden />
                )}
                <p
                  className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: '#751BB4' }}
                >
                  {grupo.grupo}
                </p>
                {grupo.itens.map((item) => {
                  const selected = modalidade === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        setModalidade(item);
                        setPickerOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-2 border-0 px-3 py-2 text-left touch-manipulation"
                      style={{
                        background: 'transparent',
                        color: selected ? '#751BB4' : '#1a1a1a',
                        fontSize: 13,
                        fontWeight: selected ? 600 : 400,
                      }}
                    >
                      <span className="truncate">{item}</span>
                      {selected && <Check size={13} weight="bold" style={{ color: '#751BB4' }} />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
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

      <div className={cn('grid gap-2.5', campos.distancia ? 'grid-cols-2' : 'grid-cols-1')}>
        {campos.distancia && (
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
        )}

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

      {(campos.velocidade || campos.inclinacao) && (
        <div className={cn('grid gap-2.5', campos.velocidade && campos.inclinacao ? 'grid-cols-2' : 'grid-cols-1')}>
          {campos.velocidade && (
            <div>
              <label style={LABEL_STYLE} htmlFor="cardio-velocidade">
                Velocidade (km/h)
                <OptionalHint />
              </label>
              <input
                id="cardio-velocidade"
                type="number"
                inputMode="decimal"
                value={velocidade}
                onChange={(e) => setVelocidade(e.target.value)}
                onFocus={onInputFocus}
                onBlur={onInputBlur}
                placeholder="9.0"
                step="0.1"
                min={0}
                style={inputStyle}
              />
            </div>
          )}

          {campos.inclinacao && (
            <div>
              <label style={LABEL_STYLE} htmlFor="cardio-inclinacao">
                Inclinação (%)
                <OptionalHint />
              </label>
              <input
                id="cardio-inclinacao"
                type="number"
                inputMode="decimal"
                value={inclinacao}
                onChange={(e) => setInclinacao(e.target.value)}
                onFocus={onInputFocus}
                onBlur={onInputBlur}
                placeholder="1.0"
                step="0.5"
                min={0}
                style={inputStyle}
              />
            </div>
          )}
        </div>
      )}

      {campos.resistencia && (
        <div>
          <label style={LABEL_STYLE} htmlFor="cardio-resistencia">
            Nível de resistência
            <OptionalHint />
          </label>
          <input
            id="cardio-resistencia"
            type="number"
            inputMode="numeric"
            value={resistencia}
            onChange={(e) => setResistencia(e.target.value)}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            placeholder="10"
            min={1}
            max={20}
            style={inputStyle}
          />
        </div>
      )}

      <div>
        <label style={LABEL_STYLE} htmlFor="cardio-kcal">
          Calorias (kcal)
          <OptionalHint />
        </label>
        <input
          id="cardio-kcal"
          type="number"
          inputMode="numeric"
          value={kcalManual}
          onChange={(e) => setKcalManual(e.target.value)}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          placeholder="350"
          min={1}
          max={5000}
          style={inputStyle}
        />
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
          rows={2}
          style={{
            ...inputStyle,
            height: 'auto',
            padding: '9px 12px',
            resize: 'none',
            lineHeight: 1.5,
          }}
        />
      </div>

      {!kcalManual && (
        <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.5 }}>
          {fcMedia
            ? 'Use a FC média para estimar as calorias e a zona de treino.'
            : 'Sem FC média, estimamos as calorias pelo seu peso e duração.'}
        </p>
      )}

      {mensagem && <p className="text-[12px] text-danger">{mensagem}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!podeEnviar}
        style={{
          width: '100%',
          height: 44,
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
