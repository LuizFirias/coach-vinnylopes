'use client';

import { useEffect, useState, useRef, useCallback, useId } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, Check, X, Clock, CaretLeft, CaretRight, Lightning, Minus, Plus, Info, CaretDown, CaretUp, Trash, ChatCircle, Play, Pause } from '@phosphor-icons/react';
import { RestTimerBar } from '@/app/components/treino/execucao/RestTimerBar';
import { useRestTimer } from '@/lib/hooks/useRestTimer';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { sendTreinoIniciadoNotification } from '@/lib/notifications/sendTreinoIniciadoNotification';
import { resolveCoachShareHandle } from '@/lib/utils/workoutShare';
import { formatDuration, formatVolume } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { haptic } from '@/lib/utils/haptics';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { StudentTechniqueCard } from '@/app/components/workout/StudentTechniqueCard';
import { BiSetGroupPreviewCard } from '@/app/components/treino/execucao/BiSetGroupPreviewCard';
import { VideoPlayerCard } from '@/app/components/treino/execucao/VideoPlayerCard';
import {
  CargaPorLadoInfoButton,
  CargaPorLadoInfoModal,
} from '@/app/components/treino/execucao/CargaPorLadoInfoModal';
import { isPerSideLoadEquipment } from '@/lib/constants/equipment';
import { exercicioMostraPeso } from '@/app/components/workout-builder/exerciseColumns';
import { secondsToDescanso } from '@/lib/utils/restTime';
import { digitsFromTempoInput, digitsToSeconds, digitsToMMSS } from '@/lib/utils/tempoInput';
import { getSeriesGridCols, GRID_COLS_HISTORICO, GRID_COLS_HISTORICO_NO_PESO } from '@/lib/utils/seriesGrid';
import { parsePesoInput, formatPesoDisplay } from '@/lib/utils/pesoInput';
import { getPublicR2Url } from '@/lib/r2/urls';
import type { WorkoutBlock } from '@/lib/utils/biset';
import {
  buildWorkoutBlocksFromConfig,
  collectBibliotecaIds,
  flattenExercicios,
  calcTotalSetsFromBlocks,
  calcSetsCompletosFromBlocks,
  calcVolumeFromBlocks,
  isBlockComplete,
  firstIncompleteRodada,
  resolveResumePosition,
  countWorkoutBlocks,
} from '@/lib/utils/biset';
import { formatRestTime } from '@/lib/utils/restTime';
import {
  getVolumeByFicha,
  type HistoricoMetrica,
  type HistoricoPeriodo,
  type HistoricoPonto,
} from '@/lib/queries/historicoFicha';
import { invalidateHistoricoTreinosCache } from '@/lib/queries/historicoTreinosCache';
import { invalidateDashboardAlunoCache } from '@/lib/queries/dashboardAlunoCache';

const FichaHistoricoChart = dynamic(
  () =>
    import('@/app/components/treinos/FichaHistoricoChart').then((m) => ({
      default: m.FichaHistoricoChart,
    })),
  { ssr: false },
);

const CompletionShareScreen = dynamic(
  () =>
    import('@/app/components/workout/share/CompletionShareScreen').then((m) => ({
      default: m.CompletionShareScreen,
    })),
  { ssr: false },
);

const YouTubePlayer = dynamic(
  () =>
    import('@/app/components/YouTubePlayer').then((m) => ({
      default: m.YouTubePlayer,
    })),
  { ssr: false },
);
// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SerieConfig {
  ordem: number;
  reps: number | string;
  tecnica?: string;
  tecnica_extra?: string;
}

interface ExercicioConfig {
  id: string;
  nome: string;
  descanso?: string;
  descanso_segundos?: number;
  video_url?: string;
  gif_url?: string;
  observacoes?: string;
  series: SerieConfig[];
  biset_parceiro_id?: string;
  tipo?: string;
  tipo_exercicio?: string;
  exercicioA?: { exercicio_id: string; nome: string; series: SerieConfig[]; tipo_exercicio?: string };
  exercicioB?: { exercicio_id: string; nome: string; series: SerieConfig[]; tipo_exercicio?: string };
}

interface SerieState {
  ordem: number;
  peso_atual: number;
  /** Texto exatamente como o aluno digitou (aceita vírgula) — evita reformatar enquanto ele digita. */
  peso_input_str?: string;
  /** true assim que o aluno edita o peso desta série — trava o preenchimento em cascata das séries seguintes. */
  peso_manual?: boolean;
  /** true = peso_atual veio pré-preenchido do histórico (última execução) — também trava a cascata. */
  peso_historico?: boolean;
  reps: number | string;
  reps_executadas?: number | string;
  /** true assim que o aluno edita as reps desta série (inclusive reconfirmando o valor pré-preenchido). */
  reps_manual?: boolean;
  tecnica?: string;
  tecnica_extra?: string;
  completado: boolean;
  anterior?: string;

  /** Série prescrita por tempo (exercício Duração/Duração e Peso, ou técnica Isometria) — `reps` guarda o tempo alvo formatado ("00:30"). */
  is_tempo?: boolean;
  /** Segundos que o aluno realmente sustentou, cronometrados na execução (só para séries is_tempo). */
  tempo_executado_seg?: number;
  /** Texto exatamente como o aluno digitou o tempo ("MM:SS") — evita reformatar enquanto ele digita. */
  tempo_input_str?: string;

  // Cluster Set — não usados na execução (reps já vem formatado como "4×5"), só para não quebrar leitura
  cluster_qtd?: number;
  cluster_reps?: number;
  cluster_descanso_seg?: number;
}

interface ExercicioState {
  id: string;
  nome: string;
  descanso: number;
  video_url?: string;
  gif_url?: string;
  imagem_url?: string;
  observacoes?: string;
  grupo_muscular?: string;
  equipamento?: string;
  tipo_exercicio?: string;
  series: SerieState[];
  biset_parceiro_id?: string;
}

function estimateDurationMinFromBlocks(blocks: WorkoutBlock[]): number {
  const flat = flattenExercicios(blocks);
  const totalSets = blocks.reduce((acc, b) => acc + (b.kind === 'simples' ? b.exercise.series.length : b.exercicioA.series.length), 0);
  return Math.max(15, Math.round(countWorkoutBlocks(blocks) * 3 + totalSets * 2));
}

const SERIES_GRID_GAP = '8px';
/** Espaço extra só na coluna Ant. da lista (não mexe no SET) */
const ANT_COL_PAD_LEFT = 4;
const HISTORICO_COL_GAP = '8px';
const HISTORICO_ROW_PAD_X = 12;

function GradientPlayIcon({ size = 22 }: { size?: number }) {
  const gradId = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9B4DD4" />
          <stop offset="55%" stopColor="#751BB4" />
          <stop offset="100%" stopColor="#5E158F" />
        </linearGradient>
      </defs>
      <path d="M8.2 5.1a1 1 0 0 1 1.55-.83l9.1 5.9a1 1 0 0 1 0 1.66l-9.1 5.9A1 1 0 0 1 8 16.9V7.1a1 1 0 0 1 .2-.99Z" fill={`url(#${gradId})`} />
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDescanso(descanso?: string): number {
  if (!descanso) return 90;
  if (descanso.includes(':')) {
    const [min, seg] = descanso.split(':').map(Number);
    const total = (isNaN(min) ? 0 : min) * 60 + (isNaN(seg) ? 0 : seg || 0);
    return total || 90;
  }
  const num = parseInt(descanso);
  return isNaN(num) ? 90 : num;
}

function abreviarTecnica(tecnica?: string): string {
  if (!tecnica) return '—';
  const lower = tecnica.toLowerCase();
  if (lower.includes('cluster')) return 'CS';
  if (lower.includes('drop')) return 'DS';
  if (lower.includes('bi-set') || lower.includes('biset')) return 'BS';
  if (lower.includes('super')) return 'SS';
  if (lower.includes('tempo')) return 'TS';
  if (lower.includes('isometria')) return 'ISO';
  // Retornar primeira letra se não reconhecer
  return tecnica.charAt(0).toUpperCase();
}

function toTitleCase(str: string): string {
  const minusculas = ['com', 'de', 'do', 'da', 'no', 'na', 'em', 'e', 'a', 'o'];
  return str
    .toLowerCase()
    .split(' ')
    .map((word, i) =>
      i === 0 || !minusculas.includes(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word,
    )
    .join(' ');
}

function duasLetrasTenica(tecnica?: string): string {
  if (!tecnica) return '—';
  const palavras = tecnica.split(' ');
  if (palavras.length >= 2) {
    return (palavras[0].charAt(0) + palavras[1].charAt(0)).toUpperCase();
  }
  return tecnica.substring(0, 2).toUpperCase();
}

/** Retorna as reps a exibir e se está abaixo do prescrito */
function resolveReps(serie: SerieState): {
  valor: number | string;
  abaixo: boolean;
} {
  const exec = serie.reps_executadas;
  const presc = serie.reps;

  if (exec === undefined || exec === null || exec === '') {
    return { valor: presc, abaixo: false };
  }

  const execNum = typeof exec === 'string' ? parseFloat(exec) : exec;
  const prescNum = typeof presc === 'string' ? parseFloat(String(presc)) : presc;
  const abaixo = !isNaN(execNum) && !isNaN(prescNum) && execNum < prescNum;

  return { valor: exec, abaixo };
}

function calcVolume(exercicios: ExercicioState[]): number {
  return exercicios.reduce((acc, ex) =>
    acc + ex.series.reduce((sAcc, s) => {
      if (!s.completado || s.peso_atual <= 0) return sAcc;
      const { valor } = resolveReps(s);
      const r = typeof valor === 'string' ? parseFloat(valor) || 0 : valor;
      return sAcc + s.peso_atual * r;
    }, 0), 0);
}

function calcSetsCompletos(exercicios: ExercicioState[]): number {
  return exercicios.reduce((acc, ex) => acc + ex.series.filter(s => s.completado).length, 0);
}

function calcTotalSets(exercicios: ExercicioState[]): number {
  return exercicios.reduce((acc, ex) => acc + ex.series.length, 0);
}

/**
 * Cor do número de peso/reps de uma série: cinza claro ("fantasma", ainda não
 * confirmado — seja vazio ou pré-preenchido do histórico) → cor normal (o aluno
 * editou/confirmou) → verde (concluída). Nunca roxo — roxo é só pro destaque da
 * série atual (background).
 */
function serieTextColor(completado: boolean, manual: boolean): string {
  if (completado) return '#39c75a';
  if (!manual) return 'var(--text-disabled)';
  return 'var(--text-primary)';
}

/**
 * Única série "atual" do treino inteiro — a próxima depois da última concluída,
 * percorrendo os blocos na ordem da ficha (bi-set intercala A/B por rodada).
 * Usado pra destacar só uma linha na lista, nunca a primeira de cada exercício.
 */
function findCurrentSerie(blocks: WorkoutBlock[]): { exercicioId: string; ordem: number } | null {
  for (const block of blocks) {
    if (block.kind === 'simples') {
      const s = block.exercise.series.find((s) => !s.completado);
      if (s) return { exercicioId: block.exercise.id, ordem: s.ordem };
      continue;
    }
    const rodadas = Math.max(block.exercicioA.series.length, block.exercicioB.series.length);
    for (let i = 0; i < rodadas; i++) {
      const a = block.exercicioA.series[i];
      const b = block.exercicioB.series[i];
      if (a && !a.completado) return { exercicioId: block.exercicioA.id, ordem: a.ordem };
      if (b && !b.completado) return { exercicioId: block.exercicioB.id, ordem: b.ordem };
    }
  }
  return null;
}

// ─── SetRow ───────────────────────────────────────────────────────────────────

interface SetRowProps {
  serie: SerieState;
  idx: number;
  treinoIniciado: boolean;
  showAnteriorCol: boolean;
  showPeso?: boolean;
  gridCols: string;
  isDesktop?: boolean;
  /** Primeira série não concluída do exercício — destaque roxo, igual ao modal. */
  isAtual?: boolean;
  onPesoChange: (peso: number, rawStr?: string) => void;
  onRepsChange: (reps: number | string) => void;
  onTempoChange: (seconds: number, rawStr?: string) => void;
  onCheck: () => void;
}

function SetRow({ serie, idx, treinoIniciado, showAnteriorCol, showPeso = true, gridCols, isDesktop = false, isAtual = false, onPesoChange, onRepsChange, onTempoChange, onCheck }: SetRowProps) {
  return (
    <div
      className={cn(
        'grid items-center',
        isDesktop ? 'py-2.5 min-h-10' : 'py-2.5'
      )}
      style={{
        gridTemplateColumns: gridCols,
        columnGap: SERIES_GRID_GAP,
        padding: '10px 12px',
        background: serie.completado
          ? 'rgba(57,199,90,0.06)'
          : isAtual
            ? 'rgba(117, 27, 180, 0.14)'
            : idx % 2 === 0
              ? 'var(--surface-1)'
              : 'var(--surface-3)',
      }}
    >
      <div className="flex justify-center">
        <span
          className="flex items-center justify-center text-[11px] font-semibold font-sans shrink-0"
          style={{
            width: 22,
            height: 22,
            minWidth: 22,
            color: serie.tecnica ? 'var(--brand-primary)' : 'var(--text-tertiary)',
          }}
        >
          {serie.tecnica ? serie.tecnica : idx + 1}
        </span>
      </div>

      {showAnteriorCol && (
        <div className="min-w-0 overflow-hidden" style={{ paddingLeft: ANT_COL_PAD_LEFT }}>
          <p
            className={cn(
              'text-[11px] font-sans tabular-nums lining-nums truncate',
              serie.completado && 'line-through'
            )}
            style={{ color: serie.completado ? 'var(--text-disabled)' : 'var(--text-tertiary)' }}
            title={serie.anterior || '—'}
          >
            {serie.anterior || '—'}
          </p>
        </div>
      )}

      {showPeso && (
        <div className="flex justify-center min-w-0">
          <input
            type="text"
            inputMode="decimal"
            value={serie.peso_input_str ?? formatPesoDisplay(serie.peso_atual)}
            onChange={(e) => {
              const raw = e.target.value;
              onPesoChange(parsePesoInput(raw), raw);
            }}
            disabled={!treinoIniciado}
            placeholder="0"
            className="w-full max-w-[44px] bg-transparent border-0 text-center font-sans tabular-nums lining-nums focus:outline-none disabled:opacity-50"
            style={{
              height: 28,
              fontSize: '12px',
              color: serieTextColor(serie.completado, serie.peso_manual ?? false),
              fontFamily: 'var(--font-sans), "DM Sans", system-ui, sans-serif',
              fontVariantNumeric: 'tabular-nums lining-nums',
              fontWeight: 500,
              borderBottom: '1.5px solid transparent',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderBottomColor = 'rgba(117, 27, 180,0.45)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderBottomColor = 'transparent';
            }}
          />
        </div>
      )}

      <div className="flex justify-center">
        {serie.is_tempo ? (
          <input
            type="text"
            inputMode="numeric"
            value={
              serie.tempo_input_str != null
                ? digitsToMMSS(serie.tempo_input_str)
                : (serie.tempo_executado_seg ? secondsToDescanso(serie.tempo_executado_seg) : '')
            }
            placeholder={String(serie.reps)}
            onChange={(e) => {
              const digits = digitsFromTempoInput(e.target.value);
              onTempoChange(digitsToSeconds(digits), digits);
            }}
            disabled={!treinoIniciado}
            aria-label={`Tempo da série ${serie.ordem}. Prescrito: ${serie.reps}`}
            className={cn(
              'w-full bg-transparent border-0 text-center font-sans',
              'tabular-nums lining-nums focus:outline-none disabled:opacity-50',
              'placeholder:text-text-disabled placeholder:font-medium',
            )}
            style={{
              height: 28,
              fontSize: '11px',
              fontWeight: 500,
              fontFamily: 'var(--font-sans), "DM Sans", system-ui, sans-serif',
              fontVariantNumeric: 'tabular-nums lining-nums',
              color: serie.completado ? '#39c75a' : 'var(--text-primary)',
              borderBottom: '1.5px solid transparent',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderBottomColor = 'rgba(117,27,180,0.45)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderBottomColor = 'transparent';
            }}
          />
        ) : (
          <input
            type="number"
            inputMode="numeric"
            value={
              serie.reps_executadas !== undefined && serie.reps_executadas !== ''
                ? serie.reps_executadas
                : ''
            }
            placeholder={String(serie.reps)}
            onChange={(e) => {
              const raw = e.target.value;
              onRepsChange(raw === '' ? '' : parseFloat(raw) || 0);
            }}
            disabled={!treinoIniciado}
            aria-label={`Reps da série ${serie.ordem}. Prescrito: ${serie.reps}`}
            className={cn(
              'w-full bg-transparent border-0 text-center font-sans',
              'tabular-nums lining-nums focus:outline-none disabled:opacity-50',
              'placeholder:text-text-disabled placeholder:font-medium',
            )}
            style={{
              height: 28,
              fontSize: '11px',
              fontWeight: 500,
              fontFamily: 'var(--font-sans), "DM Sans", system-ui, sans-serif',
              fontVariantNumeric: 'tabular-nums lining-nums',
              color: serieTextColor(serie.completado, serie.reps_manual ?? false),
              borderBottom: '1.5px solid transparent',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderBottomColor = 'rgba(117,27,180,0.45)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderBottomColor = 'transparent';
            }}
          />
        )}
      </div>

      {/* Spacer: empurra TÉC/check para a direita sem mover PESO/REPS */}
      <div aria-hidden className="min-w-0" />

      <div className="flex justify-center">
        <span className="text-[11px] font-medium text-brand leading-tight text-center">
          {serie.tecnica_extra ? abreviarTecnica(serie.tecnica_extra) : '—'}
        </span>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onCheck}
          disabled={!treinoIniciado}
          className="rounded-[4px] flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
          style={{
            width: 28,
            height: 28,
            ...(serie.completado
              ? { background: '#39c75a', border: '1.5px solid #39c75a', color: '#fff' }
              : { background: 'transparent', border: '1.5px solid var(--border-default)', color: 'var(--text-tertiary)' }),
          }}
        >
          {serie.completado && <Check className="w-3 h-3" weight="bold" />}
        </button>
      </div>
    </div>
  );
}

// ─── ExercicioCard ─────────────────────────────────────────────────────────────

interface ExercicioCardProps {
  exercicio: ExercicioState;
  treinoIniciado: boolean;
  showAnteriorCol: boolean;
  isDesktop?: boolean;
  /** Exercício + série "atuais" no treino inteiro (não só deste card) — ver findCurrentSerie. */
  currentExercicioId?: string;
  currentOrdem?: number;
  onPesoChange: (ordem: number, peso: number, rawStr?: string) => void;
  onRepsChange: (ordem: number, reps: number | string) => void;
  onTempoChange: (ordem: number, seconds: number, rawStr?: string) => void;
  onCheck: (ordem: number) => void;
  onVideoOpen: (url: string) => void;
  onCargaInfo?: () => void;
  /** Abre este exercício no card de execução, sem exigir que o anterior esteja concluído. */
  onOpenCard?: () => void;
}

function ExercicioCard({ exercicio, treinoIniciado, showAnteriorCol, isDesktop = false, currentExercicioId, currentOrdem, onPesoChange, onRepsChange, onTempoChange, onCheck, onVideoOpen, onCargaInfo, onOpenCard }: ExercicioCardProps) {
  const completadas = exercicio.series.filter(s => s.completado).length;
  const total = exercicio.series.length;
  const all = completadas === total;
  const showPeso = exercicioMostraPeso(exercicio.tipo_exercicio);
  const gridCols = getSeriesGridCols(showAnteriorCol, isDesktop, showPeso);
  const showCargaInfo = isPerSideLoadEquipment(exercicio.equipamento, exercicio.nome);

  return (
    <div
      className={cn(
        'transition-colors overflow-hidden px-0 py-0 mb-0',
        all && treinoIniciado && 'ring-1 ring-success-border/40 rounded-[10px]'
      )}
      style={{ background: 'transparent' }}
    >
      <div
        className="flex items-start justify-between gap-2 px-4 pt-4 pb-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 min-w-0">
            {onOpenCard ? (
              <button
                type="button"
                onClick={onOpenCard}
                className="font-semibold leading-tight truncate min-w-0 text-left bg-transparent border-0 p-0"
                style={{ fontSize: 15, color: '#751BB4' }}
                aria-label={`Abrir ${exercicio.nome} no card de execução`}
              >
                {toTitleCase(exercicio.nome)}
              </button>
            ) : (
              <h3
                className="font-semibold leading-tight truncate min-w-0"
                style={{ fontSize: 15, color: '#751BB4' }}
              >
                {toTitleCase(exercicio.nome)}
              </h3>
            )}
            {showCargaInfo && onCargaInfo && (
              <CargaPorLadoInfoButton onClick={onCargaInfo} size={15} />
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            Descanso: {formatRestTime(exercicio.descanso)}
          </p>
        </div>
        {exercicio.imagem_url || exercicio.gif_url ? (
          <img
            // Miniatura estática (1º frame) — cai pro GIF animado se o exercício
            // ainda não tem a miniatura gerada (compatibilidade com dados antigos).
            src={exercicio.imagem_url || exercicio.gif_url}
            alt={exercicio.nome}
            className="rounded-lg object-cover flex-shrink-0"
            style={{ width: 48, height: 48, background: 'var(--surface-0)' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}
        {exercicio.video_url && (
          <button
            type="button"
            onClick={() => onVideoOpen(exercicio.video_url!)}
            className="flex items-center justify-center shrink-0 p-1 active:opacity-70 transition-opacity"
            aria-label="Ver vídeo do exercício"
          >
            <GradientPlayIcon size={22} />
          </button>
        )}
        {all && treinoIniciado && (
          <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 text-white" weight="bold" />
          </div>
        )}
      </div>

      {exercicio.observacoes && (
        <div
          className="mx-4 my-3 px-2.5 py-2 rounded-lg"
          style={{ background: 'var(--surface-0)' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Observações
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{exercicio.observacoes}</p>
        </div>
      )}

      <div className="pt-1 pb-2">
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: gridCols,
            columnGap: SERIES_GRID_GAP,
            padding: '6px 12px',
            marginBottom: 2,
          }}
        >
          <span className="text-[10px] font-semibold tracking-[0.06em] text-center" style={{ color: 'var(--text-disabled)' }}>SET</span>
          {showAnteriorCol && (
            <span
              className="text-[10px] font-semibold tracking-[0.06em]"
              style={{ color: 'var(--text-disabled)', paddingLeft: ANT_COL_PAD_LEFT }}
            >
              ANT.
            </span>
          )}
          {showPeso && (
            <span className="text-[10px] font-semibold tracking-[0.06em] text-center" style={{ color: 'var(--text-disabled)' }}>PESO</span>
          )}
          <span className="text-[10px] font-semibold tracking-[0.06em] text-center" style={{ color: 'var(--text-disabled)' }}>REPS</span>
          <span aria-hidden className="min-w-0" />
          <span className="text-[10px] font-semibold tracking-[0.06em] text-center" style={{ color: 'var(--text-disabled)' }}>TÉC</span>
          <span className="text-[10px] text-center" style={{ color: 'var(--text-disabled)' }} />
        </div>

        <div>
          {exercicio.series.map((serie, idx) => (
            <SetRow
              key={serie.ordem}
              serie={serie}
              idx={idx}
              treinoIniciado={treinoIniciado}
              showAnteriorCol={showAnteriorCol}
              showPeso={showPeso}
              isAtual={
                treinoIniciado &&
                currentExercicioId === exercicio.id &&
                serie.ordem === currentOrdem
              }
              gridCols={gridCols}
              isDesktop={isDesktop}
              onPesoChange={(peso, raw) => onPesoChange(serie.ordem, peso, raw)}
              onRepsChange={(reps) => onRepsChange(serie.ordem, reps)}
              onTempoChange={(seconds, raw) => onTempoChange(serie.ordem, seconds, raw)}
              onCheck={() => onCheck(serie.ordem)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ExecucaoTreinoPage() {
  const params = useParams();
  const fichaId = params?.id as string;
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [nomeRotina, setNomeRotina] = useState('Treino');
  const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);
  const exercicios = flattenExercicios(blocks);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [historicoPontos, setHistoricoPontos] = useState<HistoricoPonto[]>([]);
  const [periodoHistorico, setPeriodoHistorico] = useState<HistoricoPeriodo>('3m');
  const [metricaGrafico, setMetricaGrafico] = useState<HistoricoMetrica>('volume');
  const [showConfirmAbandon, setShowConfirmAbandon] = useState(false);
  const [coachUsername, setCoachUsername] = useState('@auronfit');
  const [prsCount, setPrsCount] = useState(0);
  const [prPrincipal, setPrPrincipal] = useState<{
    exercicioNome: string;
    cargaNova: number;
    cargaAnterior: number;
  } | null>(null);

  // Timer principal
  const [treinoIniciado, setTreinoIniciado] = useState(false);
  const [timerStartAt, setTimerStartAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Rest timer (barra discreta no rodapé — some sozinha ao zerar)
  const restTimer = useRestTimer();

  // Modal de execução (por bloco)
  const [modalBlockIdx, setModalBlockIdx] = useState<number | null>(null);
  const [modalRodadaIdx, setModalRodadaIdx] = useState(0);
  const [bisetFase, setBisetFase] = useState<'a' | 'b' | 'transicao' | null>(null);
  const [bisetTransitionName, setBisetTransitionName] = useState<string | null>(null);
  const [modalCarga, setModalCarga] = useState(0);
  const [modalCargaStr, setModalCargaStr] = useState('');
  const [showSeriesHistory, setShowSeriesHistory] = useState(true);

  // Cronômetro (exercícios por tempo / técnica Isometria — substitui o ajuste de carga)
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);

  // Tique a cada segundo enquanto o cronômetro está rodando.
  useEffect(() => {
    if (!stopwatchRunning) return;
    const id = setInterval(() => setStopwatchSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [stopwatchRunning]);

  // Reseta o cronômetro ao trocar de série/exercício no modal (retoma o tempo já gravado, se houver).
  // Precisa ficar antes de qualquer `return` condicional do componente (regra dos hooks) —
  // por isso recalcula a série atual localmente em vez de reaproveitar `modalSerie`.
  useEffect(() => {
    const block = modalBlockIdx !== null ? blocks[modalBlockIdx] : null;
    const half = bisetFase === 'b' || bisetFase === 'transicao' ? 'exercicioB' : 'exercicioA';
    const ex = block ? (block.kind === 'simples' ? block.exercise : block[half]) : null;
    const serie = ex?.series[modalRodadaIdx];
    setStopwatchRunning(false);
    setStopwatchSeconds(serie?.tempo_executado_seg ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalBlockIdx, modalRodadaIdx, bisetFase]);

  const [techniqueCardExpanded, setTechniqueCardExpanded] = useState(false);
  const tecnicaKpiRef = useRef<HTMLButtonElement>(null);
  const tecnicaPanelRef = useRef<HTMLDivElement>(null);
  const modalTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  const ajustarCarga = useCallback((delta: number) => {
    setModalCarga((prev) => {
      const next = Math.max(0, Math.round((prev + delta) * 100) / 100);
      setModalCargaStr(String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (modalBlockIdx !== null) {
      setShowSeriesHistory(true);
    }
  }, [modalBlockIdx]);

  // Fecha o card de técnica ao trocar exercício/série/fase do bi-set
  useEffect(() => {
    setTechniqueCardExpanded((open) => (open ? false : open));
  }, [modalBlockIdx, modalRodadaIdx, bisetFase]);

  // Fecha ao clicar fora do KPI ⓘ e do card
  useEffect(() => {
    if (!techniqueCardExpanded) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (tecnicaKpiRef.current?.contains(target)) return;
      if (tecnicaPanelRef.current?.contains(target)) return;
      setTechniqueCardExpanded(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [techniqueCardExpanded]);

  // Termômetro de treino — feedback após finalização
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSatisfacao, setFeedbackSatisfacao] = useState('');
  const [feedbackDor, setFeedbackDor] = useState(5);
  const [feedbackNota, setFeedbackNota] = useState('');
  const [savedTimestamp, setSavedTimestamp] = useState<string | null>(null);

  // Vídeo
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [demoImg, setDemoImg] = useState<string | null>(null);
  const [cargaInfoOpen, setCargaInfoOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  /** Snapshot limpo da ficha — usado ao descartar o treino. */
  const blocksBaseRef = useRef<WorkoutBlock[]>([]);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  // Ref sempre atualizado — usado nos listeners de pagehide/visibilitychange
  const persistRef = useRef<{
    blocks: WorkoutBlock[];
    timerStartAt: number | null;
    treinoIniciado: boolean;
    saved: boolean;
  }>({ blocks: [], timerStartAt: null, treinoIniciado: false, saved: false });

  useEffect(() => {
    persistRef.current = { blocks, timerStartAt, treinoIniciado, saved };
  });

  // ── Carregar ficha ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!fichaId) return;
    loadFicha();
  }, [fichaId]);

  useEffect(() => {
    if (!fichaId || !userId || treinoIniciado) return;
    let cancelled = false;
    getVolumeByFicha(fichaId, userId, periodoHistorico).then((points) => {
      if (!cancelled) setHistoricoPontos(points);
    });
    return () => {
      cancelled = true;
    };
  }, [fichaId, userId, periodoHistorico, treinoIniciado]);

  const loadFicha = async () => {
    setLoading(true);
    try {
      const session = await getSafeSession();
      const uid = session?.user?.id;
      if (!uid) { router.push('/login'); return; }
      setUserId(uid);

      const { data: fichaData, error: fichaError } = await supabaseClient
        .from('fichas_treino')
        .select('nome_rotina, configuracao')
        .eq('id', fichaId)
        .eq('aluno_id', uid)
        .eq('ativo', true)
        .single();

      if (fichaError || !fichaData) { router.push('/aluno/treinos'); return; }

      const config = fichaData.configuracao as { exercicios?: ExercicioConfig[] };
      const exerciciosConfig: ExercicioConfig[] = config?.exercicios || [];
      setNomeRotina(fichaData.nome_rotina);

      const exercicioIds = collectBibliotecaIds(exerciciosConfig);

      // Biblioteca + última sessão por exercício (cargas "Anterior") + gênero do aluno em paralelo
      const [{ data: bibData }, { data: historicoPorExercicio }, { data: alunoProfile }] = await Promise.all([
        exercicioIds.length > 0
          ? supabaseClient
              .from('exercicios_biblioteca')
              .select('id, grupo_muscular, gif_url, gif_url_feminino, imagem_url, imagem_url_feminino, video_url, equipamento')
              .in('id', exercicioIds)
          : Promise.resolve({ data: null as null }),
        exercicioIds.length > 0
          ? supabaseClient
              .from('historico_treinos')
              .select('data_conclusao, dados_sessao, exercicio_id')
              .eq('aluno_id', uid)
              .in('exercicio_id', exercicioIds)
              .order('data_conclusao', { ascending: false })
              .limit(Math.max(exercicioIds.length * 10, 50))
          : Promise.resolve({ data: null as null }),
        supabaseClient.from('profiles').select('sexo').eq('id', uid).maybeSingle(),
      ]);

      const gruposMusculares: Record<string, string> = Object.fromEntries(
        (bibData || []).map(ex => [ex.id, ex.grupo_muscular || ''])
      );
      const gifsExercicios: Record<string, string> = Object.fromEntries(
        (bibData || []).map(ex => [ex.id, getPublicR2Url(ex.gif_url) || ''])
      );
      const gifsFemininosExercicios: Record<string, string> = Object.fromEntries(
        (bibData || []).map(ex => [ex.id, getPublicR2Url(ex.gif_url_feminino) || ''])
      );
      const imagensExercicios: Record<string, string> = Object.fromEntries(
        (bibData || []).map(ex => [ex.id, getPublicR2Url(ex.imagem_url) || ''])
      );
      const imagensFemininasExercicios: Record<string, string> = Object.fromEntries(
        (bibData || []).map(ex => [ex.id, getPublicR2Url(ex.imagem_url_feminino) || ''])
      );
      const videosBiblioteca: Record<string, string> = Object.fromEntries(
        (bibData || []).map(ex => [ex.id, ex.video_url || ''])
      );
      const equipamentosBiblioteca: Record<string, string> = Object.fromEntries(
        (bibData || []).map((ex: { id: string; equipamento?: string }) => [ex.id, ex.equipamento || ''])
      );

      // Última sessão por exercício (qualquer ficha) — rows já vêm DESC
      const ultimoPorExercicio: Record<string, any> = {};
      for (const h of (historicoPorExercicio || [])) {
        if (!h.exercicio_id || ultimoPorExercicio[h.exercicio_id]) continue;
        ultimoPorExercicio[h.exercicio_id] = h;
      }

      const blocksState = buildWorkoutBlocksFromConfig(exerciciosConfig, {
        gruposMusculares,
        gifs: gifsExercicios,
        gifsFemininos: gifsFemininosExercicios,
        imagens: imagensExercicios,
        imagensFemininas: imagensFemininasExercicios,
        videos: videosBiblioteca,
        equipamentos: equipamentosBiblioteca,
        ultimoPorExercicio,
        generoAluno: alunoProfile?.sexo ?? null,
      });

      const mergeSavedIntoBlocks = (base: WorkoutBlock[], savedFlat: ExercicioState[]): WorkoutBlock[] => {
        let flatIdx = 0;
        return base.map((block) => {
          if (block.kind === 'simples') {
            const savedEx = savedFlat[flatIdx];
            flatIdx += 1;
            if (!savedEx || savedEx.id !== block.exercise.id) return block;
            return {
              ...block,
              exercise: {
                ...block.exercise,
                series: block.exercise.series.map((s, j) => {
                  const savedS = savedEx.series[j];
                  if (!savedS) return s;
                  return { ...s, peso_atual: savedS.peso_atual ?? s.peso_atual, completado: savedS.completado ?? false };
                }),
              },
            };
          }
          const savedA = savedFlat[flatIdx];
          const savedB = savedFlat[flatIdx + 1];
          flatIdx += 2;
          if (!savedA || !savedB) return block;
          return {
            ...block,
            exercicioA: {
              ...block.exercicioA,
              series: block.exercicioA.series.map((s, j) => {
                const savedS = savedA.series[j];
                if (!savedS) return s;
                return { ...s, peso_atual: savedS.peso_atual ?? s.peso_atual, completado: savedS.completado ?? false };
              }),
            },
            exercicioB: {
              ...block.exercicioB,
              series: block.exercicioB.series.map((s, j) => {
                const savedS = savedB.series[j];
                if (!savedS) return s;
                return { ...s, peso_atual: savedS.peso_atual ?? s.peso_atual, completado: savedS.completado ?? false };
              }),
            },
          };
        });
      };

      const storageKey = `treino_${uid}_${fichaId}`;
      blocksBaseRef.current = structuredClone(blocksState);

      const savedRaw = localStorage.getItem(storageKey);
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw);
          if (Date.now() - (saved.timestamp || 0) < 86400000) {
            const savedBlocks: WorkoutBlock[] | undefined = saved.blocks;
            const savedFlat: ExercicioState[] | undefined = saved.exercicios;
            const restored = savedBlocks
              ? savedBlocks
              : savedFlat
                ? mergeSavedIntoBlocks(blocksState, savedFlat)
                : blocksState;
            setBlocks(restored);
            setTreinoIniciado(true);
            setTimerStartAt(saved.timerStartAt || Date.now());
            localStorage.setItem('treino_ativo_pointer', JSON.stringify({
              fichaId,
              userId: uid,
              nomeRotina: fichaData.nome_rotina,
            }));
          } else {
            localStorage.removeItem(storageKey);
            setBlocks(blocksState);
          }
        } catch {
          localStorage.removeItem(storageKey);
          setBlocks(blocksState);
        }
      } else {
        setBlocks(blocksState);
      }

      // Username do coach só aparece na tela de compartilhamento pós-treino —
      // busca em background, sem segurar o loader.
      // Aluno não tem SELECT em profiles do coach (RLS) — só coach_public_profiles.
      if (uid) {
        void (async () => {
          const { data: coachData } = await supabaseClient
            .from('coach_alunos')
            .select('coach_id')
            .eq('aluno_id', uid)
            .maybeSingle();

          if (!coachData?.coach_id) return;

          const { data: publicProfile } = await supabaseClient
            .from('coach_public_profiles')
            .select('handle, instagram')
            .eq('coach_id', coachData.coach_id)
            .maybeSingle();

          setCoachUsername(
            resolveCoachShareHandle(publicProfile?.handle, publicProfile?.instagram),
          );
        })().catch(() => undefined);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Timer principal ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!treinoIniciado || !timerStartAt || saved) return;
    const tick = () => setElapsed(Math.floor((Date.now() - timerStartAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, [treinoIniciado, timerStartAt, saved]);

  // ── Aviso ao sair com treino incompleto ─────────────────────────────────────

  useEffect(() => {
    if (!treinoIniciado || saved) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const totalSets = calcTotalSetsFromBlocks(blocks);
      const completedSets = calcSetsCompletosFromBlocks(blocks);

      if (completedSets < totalSets) {
        e.preventDefault();
        e.returnValue = 'Você tem séries incompletas. Deseja realmente sair?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [treinoIniciado, blocks, saved]);

  // ── Persistência de estado do treino ────────────────────────────────────────

  const savedKey = fichaId && userId ? `treino_${userId}_${fichaId}` : null;

  useEffect(() => {
    if (!savedKey || !treinoIniciado || saved) return;

    localStorage.setItem(savedKey, JSON.stringify({
      blocks,
      exercicios,
      timerStartAt,
      timestamp: Date.now(),
    }));
  }, [savedKey, blocks, exercicios, treinoIniciado, timerStartAt, saved]);

  // Limpar localStorage imediatamente quando treino é salvo com sucesso
  useEffect(() => {
    if (saved && savedKey) {
      localStorage.removeItem(savedKey);
      localStorage.removeItem('treino_ativo_pointer');
    }
  }, [saved, savedKey]);

  // Salvar quando app vai para background ou aba fecha (mobile: pagehide/visibilitychange)
  useEffect(() => {
    if (!fichaId || !userId) return;

    const saveNow = () => {
      const { blocks: blks, timerStartAt: tsa, treinoIniciado: ti, saved: sv } = persistRef.current;
      if (!ti || sv) return;
      localStorage.setItem(`treino_${userId}_${fichaId}`, JSON.stringify({
        blocks: blks,
        exercicios: flattenExercicios(blks),
        timerStartAt: tsa,
        timestamp: Date.now(),
      }));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };

    window.addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', saveNow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fichaId, userId]);

  // ── Rest timer (estado mora em useRestTimer — some sozinho ao zerar) ────────

  const iniciarRest = restTimer.start;
  const restAddSecs = restTimer.addSeconds;
  const restSkip = restTimer.skip;
  const restAdvance = restTimer.skip;

  // ── Iniciar treino → abre modal do 1º exercício ─────────────────────────────

  const iniciarTreino = () => {
    const agora = Date.now();
    // Salvar imediatamente — não esperar o useEffect (race condition em mobile)
    if (fichaId && userId) {
      localStorage.setItem(`treino_${userId}_${fichaId}`, JSON.stringify({
        blocks,
        exercicios,
        timerStartAt: agora,
        timestamp: agora,
      }));
      // Pointer para o banner global de "Treino em andamento"
      localStorage.setItem('treino_ativo_pointer', JSON.stringify({
        fichaId,
        userId,
        nomeRotina,
      }));
    }
    setTreinoIniciado(true);
    setTimerStartAt(agora);
    haptic('medium');
    void sendTreinoIniciadoNotification(nomeRotina);
    // Abre modal do primeiro exercício
    abrirModalBlock(0);
  };

  function abrirModalBlock(blockIdx: number) {
    if (blockIdx < 0 || blockIdx >= blocks.length) return;
    const block = blocks[blockIdx];
    let rodadaIdx = 0;
    let fase: 'a' | 'b' | null = null;

    if (block.kind === 'simples') {
      const prox = block.exercise.series.findIndex((s) => !s.completado);
      rodadaIdx =
        prox >= 0 ? prox : Math.max(0, block.exercise.series.length - 1);
      fase = null;
    } else if (isBlockComplete(block)) {
      rodadaIdx = Math.max(0, block.exercicioA.series.length - 1);
      fase = 'b';
    } else {
      rodadaIdx = firstIncompleteRodada(block);
      const aDone = block.exercicioA.series[rodadaIdx]?.completado;
      fase = aDone ? 'b' : 'a';
    }

    const ex =
      block.kind === 'simples'
        ? block.exercise
        : fase === 'b'
          ? block.exercicioB
          : block.exercicioA;
    const carga = ex.series[rodadaIdx]?.peso_atual || 0;
    setModalBlockIdx(blockIdx);
    setModalRodadaIdx(rodadaIdx);
    setBisetFase(fase);
    setModalCarga(carga);
    setModalCargaStr(carga > 0 ? String(carga) : '');
  }

  /** Troca de exercício por swipe lateral — não exige ter concluído o anterior. */
  function navegarBlocoPorSwipe(delta: number) {
    if (modalBlockIdx === null) return;
    const proximo = modalBlockIdx + delta;
    if (proximo < 0 || proximo >= blocks.length) return;
    haptic('light');
    abrirModalBlock(proximo);
  }

  function handleModalTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    modalTouchStartRef.current = { x: t.clientX, y: t.clientY };
  }

  function handleModalTouchEnd(e: React.TouchEvent) {
    const start = modalTouchStartRef.current;
    modalTouchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Só conta como swipe horizontal — ignora se o gesto foi mais vertical (scroll)
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    navegarBlocoPorSwipe(dx < 0 ? 1 : -1);
  }

  /** Abre o modal numa posição já resolvida (blockIdx/rodadaIdx/fase), a partir de uma lista de blocks específica. */
  function abrirPosicao(blocksList: WorkoutBlock[], pos: { blockIdx: number; rodadaIdx: number; fase: 'a' | 'b' | null }) {
    const block = blocksList[pos.blockIdx];
    if (!block) return;
    const ex =
      block.kind === 'simples'
        ? block.exercise
        : pos.fase === 'b'
          ? block.exercicioB
          : block.exercicioA;
    const carga = ex.series[pos.rodadaIdx]?.peso_atual || 0;
    setModalBlockIdx(pos.blockIdx);
    setModalRodadaIdx(pos.rodadaIdx);
    setBisetFase(pos.fase);
    setModalCarga(carga);
    setModalCargaStr(carga > 0 ? String(carga) : '');
  }

  /** Retomar: 1ª incompleta, ou último exercício da ficha se a lista já concluiu tudo. */
  function retomarExecucao() {
    abrirPosicao(blocks, resolveResumePosition(blocks));
  }

  /** Vai direto pra 1ª série pendente (usado no aviso de "séries não concluídas"). */
  function irParaSeriePendente(blocksList: WorkoutBlock[] = blocks) {
    setShowFeedbackModal(false);
    abrirPosicao(blocksList, resolveResumePosition(blocksList));
  }

  /**
   * Peso digitado numa série "vaza" pra frente — as próximas séries do mesmo
   * exercício (ainda não concluídas e que o aluno não editou o peso à mão)
   * já aparecem pré-preenchidas com esse valor. Editar uma série trava ela
   * como manual — deixa de receber o vazamento (mesmo padrão da ficha).
   */
  function cascadePeso<
    T extends {
      ordem: number;
      peso_atual: number;
      peso_input_str?: string;
      peso_manual?: boolean;
      peso_historico?: boolean;
      completado: boolean;
    }
  >(series: T[], serieOrdem: number, peso: number, rawStr: string | undefined): T[] {
    let cascata = false;
    return series.map((s) => {
      if (s.ordem === serieOrdem) {
        cascata = true;
        return { ...s, peso_atual: peso, peso_input_str: rawStr, peso_manual: true };
      }
      // Série que já veio preenchida do histórico não recebe o vazamento — já tem
      // uma referência real da última execução, não deve ser sobrescrita.
      if (cascata && !s.completado && !s.peso_manual && !s.peso_historico) {
        return { ...s, peso_atual: peso, peso_input_str: formatPesoDisplay(peso) };
      }
      return s;
    });
  }

  const handlePesoChange = useCallback((exercicioId: string, serieOrdem: number, peso: number, rawStr?: string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.kind === 'simples') {
          if (block.exercise.id !== exercicioId) return block;
          return {
            ...block,
            exercise: {
              ...block.exercise,
              series: cascadePeso(block.exercise.series, serieOrdem, peso, rawStr),
            },
          };
        }
        const updateHalf = (half: 'exercicioA' | 'exercicioB') => {
          if (block[half].id !== exercicioId) return block;
          return {
            ...block,
            [half]: {
              ...block[half],
              series: cascadePeso(block[half].series, serieOrdem, peso, rawStr),
            },
          };
        };
        const updatedA = updateHalf('exercicioA');
        if (updatedA !== block) return updatedA;
        return updateHalf('exercicioB');
      })
    );
  }, []);

  const handleRepsChange = useCallback(
    (exercicioId: string, serieOrdem: number, reps: number | string) => {
      setBlocks((prev) =>
        prev.map((block) => {
          if (block.kind === 'simples') {
            if (block.exercise.id !== exercicioId) return block;
            return {
              ...block,
              exercise: {
                ...block.exercise,
                series: block.exercise.series.map((s) =>
                  s.ordem !== serieOrdem ? s : { ...s, reps_executadas: reps, reps_manual: true }
                ),
              },
            };
          }
          const updateHalf = (half: 'exercicioA' | 'exercicioB') => {
            if (block[half].id !== exercicioId) return block;
            return {
              ...block,
              [half]: {
                ...block[half],
                series: block[half].series.map((s) =>
                  s.ordem !== serieOrdem ? s : { ...s, reps_executadas: reps, reps_manual: true }
                ),
              },
            };
          };
          const updatedA = updateHalf('exercicioA');
          if (updatedA !== block) return updatedA;
          return updateHalf('exercicioB');
        })
      );
    },
    []
  );

  /** Edição manual do tempo executado (séries is_tempo) — aceita "MM:SS" digitado direto, mesmo campo que o cronômetro preenche ao parar. */
  const handleTempoChange = useCallback(
    (exercicioId: string, serieOrdem: number, seconds: number, rawStr?: string) => {
      setBlocks((prev) =>
        prev.map((block) => {
          if (block.kind === 'simples') {
            if (block.exercise.id !== exercicioId) return block;
            return {
              ...block,
              exercise: {
                ...block.exercise,
                series: block.exercise.series.map((s) =>
                  s.ordem !== serieOrdem ? s : { ...s, tempo_executado_seg: seconds, tempo_input_str: rawStr }
                ),
              },
            };
          }
          const updateHalf = (half: 'exercicioA' | 'exercicioB') => {
            if (block[half].id !== exercicioId) return block;
            return {
              ...block,
              [half]: {
                ...block[half],
                series: block[half].series.map((s) =>
                  s.ordem !== serieOrdem ? s : { ...s, tempo_executado_seg: seconds, tempo_input_str: rawStr }
                ),
              },
            };
          };
          const updatedA = updateHalf('exercicioA');
          if (updatedA !== block) return updatedA;
          return updateHalf('exercicioB');
        })
      );
    },
    []
  );

  const handleCheck = useCallback((exercicioId: string, serieOrdem: number) => {
    if (!treinoIniciado) return;
    setBlocks((prev) => {
      let toggled = false;
      let descanso = 90;
      const next = prev.map((block) => {
        if (block.kind === 'simples') {
          if (block.exercise.id !== exercicioId) return block;
          const serieIdx = block.exercise.series.findIndex((s) => s.ordem === serieOrdem);
          if (serieIdx === -1) return block;
          toggled = !block.exercise.series[serieIdx].completado;
          descanso = block.exercise.descanso;
          return {
            ...block,
            exercise: {
              ...block.exercise,
              series: block.exercise.series.map((s) =>
                s.ordem !== serieOrdem ? s : { ...s, completado: toggled }
              ),
            },
          };
        }
        for (const half of ['exercicioA', 'exercicioB'] as const) {
          if (block[half].id !== exercicioId) continue;
          const serieIdx = block[half].series.findIndex((s) => s.ordem === serieOrdem);
          if (serieIdx === -1) return block;
          toggled = !block[half].series[serieIdx].completado;
          descanso = block.descanso;
          return {
            ...block,
            [half]: {
              ...block[half],
              series: block[half].series.map((s) =>
                s.ordem !== serieOrdem ? s : { ...s, completado: toggled }
              ),
            },
          };
        }
        return block;
      });
      if (toggled) {
        haptic('success');
        iniciarRest(descanso, () => {});
      } else {
        haptic('light');
      }
      return next;
    });
  }, [treinoIniciado]);

  // ── Ações do modal ───────────────────────────────────────────────────────────

  function persistBlocksNow(nextBlocks: WorkoutBlock[]) {
    if (fichaId && userId) {
      localStorage.setItem(`treino_${userId}_${fichaId}`, JSON.stringify({
        blocks: nextBlocks,
        exercicios: flattenExercicios(nextBlocks),
        timerStartAt,
        timestamp: Date.now(),
      }));
    }
  }

  function concluirSerieModal(extra?: { tempo_executado_seg?: number }) {
    if (modalBlockIdx === null) return;
    const block = blocks[modalBlockIdx];
    if (!block) return;
    setTechniqueCardExpanded(false);
    const extraPatch = extra?.tempo_executado_seg != null
      ? { tempo_executado_seg: extra.tempo_executado_seg, tempo_input_str: undefined }
      : {};

    if (block.kind === 'simples') {
      const ex = block.exercise;
      const serie = ex.series[modalRodadaIdx];
      const newBlocks = blocks.map((b, i) => {
        if (i !== modalBlockIdx || b.kind !== 'simples') return b;
        return {
          ...b,
          exercise: {
            ...b.exercise,
            series: b.exercise.series.map((s, j) =>
              j !== modalRodadaIdx ? s : { ...s, peso_atual: modalCarga, completado: true, ...extraPatch }
            ),
          },
        };
      });
      setBlocks(newBlocks);
      persistBlocksNow(newBlocks);
      haptic('success');

      const isUltimaSerie = modalRodadaIdx >= ex.series.length - 1;
      const isUltimoBloco = modalBlockIdx >= blocks.length - 1;

      if (isUltimaSerie) {
        if (isUltimoBloco) {
          // Ficou alguma série pendente lá atrás (pulada/esquecida)? Manda pra ela
          // em vez de abrir a pesquisa direto — "Finalizar treino" continua liberado
          // pra fechar mesmo assim quando o aluno quiser.
          if (newBlocks.some((b) => !isBlockComplete(b))) {
            abrirPosicao(newBlocks, resolveResumePosition(newBlocks));
            return;
          }
          setModalBlockIdx(null);
          handleFinalizar();
          return;
        }
        iniciarRest(ex.descanso, () => abrirModalBlock(modalBlockIdx + 1), {
          title: 'Descanso',
        });
      } else {
        const prox = modalRodadaIdx + 1;
        iniciarRest(ex.descanso, () => {
          const nextCarga = ex.series[prox]?.peso_atual || modalCarga;
          setModalRodadaIdx(prox);
          setModalCarga(nextCarga);
          setModalCargaStr(nextCarga > 0 ? String(nextCarga) : '');
        });
      }
      return;
    }

    // Bi-Set
    const bisetBlock = block;
    const totalRodadas = bisetBlock.exercicioA.series.length;
    const isUltimaRodada = modalRodadaIdx >= totalRodadas - 1;
    const isUltimoBloco = modalBlockIdx >= blocks.length - 1;

    if (bisetFase === 'a') {
      const newBlocks = blocks.map((b, i) => {
        if (i !== modalBlockIdx || b.kind !== 'biset') return b;
        return {
          ...b,
          exercicioA: {
            ...b.exercicioA,
            series: b.exercicioA.series.map((s, j) =>
              j !== modalRodadaIdx ? s : { ...s, peso_atual: modalCarga, completado: true, ...extraPatch }
            ),
          },
        };
      });
      setBlocks(newBlocks);
      persistBlocksNow(newBlocks);
      haptic('success');

      const bSerie = bisetBlock.exercicioB.series[modalRodadaIdx];
      const nextCarga = bSerie?.peso_atual || 0;
      setBisetTransitionName(bisetBlock.exercicioB.nome);
      setBisetFase('transicao');
      setTimeout(() => {
        setBisetFase('b');
        setBisetTransitionName(null);
        setModalCarga(nextCarga);
        setModalCargaStr(nextCarga > 0 ? String(nextCarga) : '');
      }, 300);
      return;
    }

    if (bisetFase === 'b') {
      const newBlocks = blocks.map((b, i) => {
        if (i !== modalBlockIdx || b.kind !== 'biset') return b;
        return {
          ...b,
          exercicioB: {
            ...b.exercicioB,
            series: b.exercicioB.series.map((s, j) =>
              j !== modalRodadaIdx ? s : { ...s, peso_atual: modalCarga, completado: true, ...extraPatch }
            ),
          },
        };
      });
      setBlocks(newBlocks);
      persistBlocksNow(newBlocks);
      haptic('success');

      const descanso = bisetBlock.descanso;
      const nextBlock = blocks[modalBlockIdx + 1];
      const nextBlockLabel = nextBlock
        ? (nextBlock.kind === 'simples' ? nextBlock.exercise.nome : nextBlock.exercicioA.nome)
        : undefined;

      if (isUltimaRodada) {
        iniciarRest(
          descanso,
          () => {
            if (isUltimoBloco) {
              if (newBlocks.some((b) => !isBlockComplete(b))) {
                abrirPosicao(newBlocks, resolveResumePosition(newBlocks));
                return;
              }
              setModalBlockIdx(null);
              handleFinalizar();
            } else {
              abrirModalBlock(modalBlockIdx + 1);
            }
          },
          {
            title: 'Descanso do Bi-Set',
            subtitle: nextBlockLabel ? `Próximo exercício: ${nextBlockLabel}` : undefined,
            subtitleHighlight: 'Bi-Set concluído ✓',
          },
        );
      } else {
        const proxRodada = modalRodadaIdx + 1;
        iniciarRest(
          descanso,
          () => {
            const carga = bisetBlock.exercicioA.series[proxRodada]?.peso_atual || 0;
            setModalRodadaIdx(proxRodada);
            setBisetFase('a');
            setModalCarga(carga);
            setModalCargaStr(carga > 0 ? String(carga) : '');
          },
          {
            title: 'Descanso do Bi-Set',
            subtitle: `Próxima rodada: ${bisetBlock.exercicioA.nome} · série ${proxRodada + 1}/${totalRodadas}`,
          },
        );
      }
    }
  }

  // ── Finalizar treino ─────────────────────────────────────────────────────────

  const handleFinalizar = () => {
    // Sempre abre o modal de feedback (que também confirma finalização)
    setShowFeedbackModal(true);
  };

  const finalizarConfirmado = async () => {
    if (!userId || saving) return;
    setShowFeedbackModal(false);
    setSaving(true);
    haptic('medium');

    try {
      const agora = new Date().toISOString();

      const exerciciosValidos = exercicios.filter(ex => ex.id);
      if (exerciciosValidos.length === 0) throw new Error('Ficha sem exercícios válidos');

      const registros = exerciciosValidos.map(ex => ({
        ficha_id: fichaId,
        aluno_id: userId,
        exercicio_id: ex.id,
        dados_sessao: {
          nome_rotina: nomeRotina,
          nome_exercicio: ex.nome,
          tipo_exercicio: ex.tipo_exercicio,
          series: ex.series.map(s => ({
            ordem: s.ordem,
            reps_prescritas: s.reps,
            reps_executadas: s.reps_executadas ?? s.reps,
            reps: s.reps_executadas ?? s.reps,
            tecnica: s.tecnica ?? null,
            tecnica_extra: s.tecnica_extra ?? null,
            peso_atual: s.peso_atual,
            completado: s.completado,
            anterior: s.anterior || '—',
            is_tempo: s.is_tempo ?? false,
            tempo_executado_seg: s.tempo_executado_seg ?? null,
          })),
          data_sessao: agora,
          duracao_segundos: elapsed,
          satisfacao_treino: feedbackSatisfacao || null,
          nivel_dor: feedbackDor,
          nota_sessao: feedbackNota.trim() || null,
        },
        data_conclusao: agora,
      }));

      const { error } = await supabaseClient.from('historico_treinos').insert(registros);

      if (error) {
        let savedCount = 0;
        for (const registro of registros) {
          const { error: rowError } = await supabaseClient.from('historico_treinos').insert(registro);
          if (!rowError) savedCount++;
        }
        if (savedCount === 0) throw error;
      }

      invalidateHistoricoTreinosCache(userId);
      invalidateDashboardAlunoCache(userId);

      // Atualizar o ultimo_checkin no perfil do aluno
      try {
        await supabaseClient
          .from('profiles')
          .update({ ultimo_checkin: new Date().toISOString() })
          .eq('id', userId);
      } catch (profileErr) {
        console.error('Erro ao atualizar ultimo_checkin:', profileErr);
      }

      // PRs batidos hoje — schema: peso/reps (não carga_nova)
      const hoje = new Date().toISOString().split('T')[0];
      const { data: prsDetalhes } = await supabaseClient
        .from('recordes_pessoais')
        .select('exercicio_id, peso, reps, exercicios_biblioteca(nome)')
        .eq('aluno_id', userId)
        .gte('conquistado_em', `${hoje}T00:00:00`)
        .lte('conquistado_em', `${hoje}T23:59:59`)
        .order('peso', { ascending: false });

      const prsHoje = prsDetalhes ?? [];
      setPrsCount(prsHoje.length);

      const parseAnteriorPeso = (anterior?: string): number => {
        if (!anterior || anterior === '—') return 0;
        const m = anterior.match(/([\d.,]+)/);
        return m ? parseFloat(m[1].replace(',', '.')) || 0 : 0;
      };

      type PrCand = { exercicioNome: string; cargaNova: number; cargaAnterior: number; delta: number };
      const candidatos: PrCand[] = [];

      for (const pr of prsHoje) {
        const exId = pr.exercicio_id as string;
        const cargaNova = Number(pr.peso) || 0;
        const bib = pr.exercicios_biblioteca as { nome?: string } | { nome?: string }[] | null;
        const nomeBib = Array.isArray(bib) ? bib[0]?.nome : bib?.nome;
        const exSessao = exercicios.find((e) => e.id === exId);
        const serieMatch =
          exSessao?.series.find((s) => s.completado && Number(s.reps_executadas ?? s.reps) === Number(pr.reps))
          ?? exSessao?.series.find((s) => s.completado && s.peso_atual === cargaNova)
          ?? exSessao?.series.find((s) => s.completado);
        const cargaAnterior = parseAnteriorPeso(serieMatch?.anterior);
        candidatos.push({
          exercicioNome: nomeBib || exSessao?.nome || 'Exercício',
          cargaNova,
          cargaAnterior,
          delta: cargaNova - cargaAnterior,
        });
      }

      candidatos.sort((a, b) => b.delta - a.delta || b.cargaNova - a.cargaNova);
      const top = candidatos[0];
      setPrPrincipal(
        top
          ? {
              exercicioNome: top.exercicioNome,
              cargaNova: top.cargaNova,
              cargaAnterior: top.cargaAnterior,
            }
          : null,
      );

      setSaved(true);
      haptic('success');
    } catch (err) {
      console.error('Erro ao salvar treino:', err);
      haptic('error');
      alert('Erro ao salvar treino. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const descartarTreino = () => {
    if (fichaId && userId) {
      localStorage.removeItem(`treino_${userId}_${fichaId}`);
      localStorage.removeItem('treino_ativo_pointer');
    }
    setTreinoIniciado(false);
    setElapsed(0);
    setTimerStartAt(null);
    setModalBlockIdx(null);
    restTimer.reset();
    // Restaura a ficha limpa — não zerar blocks (sumia a lista de exercícios)
    const base = blocksBaseRef.current;
    if (base.length > 0) {
      setBlocks(structuredClone(base));
    } else {
      void loadFicha();
    }
    setShowConfirmAbandon(false);
    haptic('light');
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-0)' }}>
        <DumbbellLoader text="Preparando treino..." />
      </div>
    );
  }

  if (saved) {
    const volume = calcVolumeFromBlocks(blocks);
    const sets = calcSetsCompletosFromBlocks(blocks);

    return (
      <CompletionShareScreen
        nomeRotina={nomeRotina}
        duracao={elapsed}
        volume={volume}
        sets={sets}
        exercicios={exercicios}
        coachUsername={coachUsername}
        prsCount={prsCount}
        prPrincipal={prPrincipal}
      />
    );
  }

  const volume = calcVolumeFromBlocks(blocks);
  const setsCompletos = calcSetsCompletosFromBlocks(blocks);
  const totalSets = calcTotalSetsFromBlocks(blocks);
  const blockCount = countWorkoutBlocks(blocks);

  const modalBlock = modalBlockIdx !== null ? blocks[modalBlockIdx] : null;
  const modalIsBiSet = modalBlock?.kind === 'biset';
  const modalEx = modalBlock
    ? modalBlock.kind === 'simples'
      ? modalBlock.exercise
      : bisetFase === 'b' || bisetFase === 'transicao'
        ? modalBlock.exercicioB
        : modalBlock.exercicioA
    : null;
  const modalSerie = modalEx?.series[modalRodadaIdx];
  const modalTotalRodadas = modalBlock
    ? modalBlock.kind === 'simples'
      ? modalBlock.exercise.series.length
      : modalBlock.exercicioA.series.length
    : 0;
  const modalPartnerEx = modalBlock?.kind === 'biset' ? modalBlock.exercicioB : null;
  const modalShowPeso = exercicioMostraPeso(modalEx?.tipo_exercicio);
  const modalSerieEhTempo = modalSerie?.is_tempo ?? false;

  function pararCronometro() {
    if (modalBlockIdx === null) return;
    const seconds = stopwatchSeconds;
    setStopwatchRunning(false);
    // Passa o tempo direto pro concluirSerieModal — ele que atualiza `blocks` numa
    // única leitura/escrita (concluirSerieModal não usa updater funcional, então um
    // setBlocks separado aqui seria sobrescrito pelo dele, baseado no estado antigo).
    concluirSerieModal({ tempo_executado_seg: seconds });
  }

  const hasHistorico = exercicios.some((ex) =>
    ex.series.some((s) => s.anterior && s.anterior !== '—')
  );

  const renderHistoricoChart = () => (
    <FichaHistoricoChart
      data={historicoPontos}
      periodo={periodoHistorico}
      metrica={metricaGrafico}
      onPeriodoChange={setPeriodoHistorico}
      onMetricaChange={setMetricaGrafico}
    />
  );

  return (
    <div
      className={cn('min-h-screen', treinoIniciado ? 'pb-4' : 'pb-28')}
      style={{ background: 'var(--surface-0)' }}
    >

      {/* ── Header sticky (mobile + treino em andamento) ── */}
      <header
        className={cn(
          'sticky top-0 z-40 backdrop-blur-sm',
          !treinoIniciado && 'lg:hidden'
        )}
        style={{
          background: 'color-mix(in srgb, var(--surface-0) 95%, transparent)',
          borderBottom: '1px solid var(--border-divider)',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3 max-w-[1100px] mx-auto">
          <Link
            href="/aluno/treinos"
            className="w-11 h-11 flex items-center justify-center transition-colors shrink-0"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Voltar para Minhas Rotinas"
          >
            <ArrowLeft size={20} />
          </Link>

          <div className="flex-1 min-w-0">
            <h1
              className="font-bold uppercase tracking-wide truncate"
              style={{ color: 'var(--text-primary)', fontSize: '16px' }}
            >
              {nomeRotina}
            </h1>
            {treinoIniciado ? (
              <p className="mt-0.5" style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                {setsCompletos}/{totalSets} sets
              </p>
            ) : (
              <p className="mt-0.5" style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                {blockCount} blocos · Est. {estimateDurationMinFromBlocks(blocks)} min
              </p>
            )}
          </div>

          {treinoIniciado && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfirmAbandon(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 active:opacity-70"
                style={{
                  background: 'transparent',
                  color: 'var(--brand-primary)',
                }}
                title="Descartar treino"
                aria-label="Descartar treino"
              >
                <Trash size={18} weight="bold" />
              </button>
              <div className="text-right">
                <p
                  className="font-sans tabular-nums lining-nums text-sm font-bold leading-none"
                  style={{ color: '#751BB4' }}
                >
                  {formatDuration(elapsed)}
                </p>
                <p className="text-2xs" style={{ color: 'var(--text-tertiary)' }}>{formatVolume(volume)}</p>
              </div>
              <button
                onClick={handleFinalizar}
                disabled={saving}
                className="h-8 px-3 bg-brand text-text-on-brand rounded-lg text-[11px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {saving ? '...' : 'Finish'}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-4 py-4 lg:px-6 lg:py-8">
        <div className={cn(!treinoIniciado && 'lg:grid lg:grid-cols-[2fr_3fr] lg:gap-6 lg:items-start')}>

          {/* Coluna esquerda — contexto + iniciar (desktop, pré-execução) */}
          {!treinoIniciado && (
            <aside className="hidden lg:block lg:sticky lg:top-6">
              <div
                className="rounded-[14px] p-6"
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <Link
                  href="/aluno/treinos"
                  className="inline-flex items-center gap-1.5 text-xs transition-colors mb-4"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ArrowLeft size={16} />
                  Minhas Rotinas
                </Link>
                <h1 className="text-xl font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
                  {nomeRotina}
                </h1>
                <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {blockCount} blocos · Est. {estimateDurationMinFromBlocks(blocks)} min
                </p>
                {isDesktop && <div className="mt-5">{renderHistoricoChart()}</div>}
                <button
                  type="button"
                  onClick={iniciarTreino}
                  className="w-full min-h-14 mt-5 rounded-xl font-bold text-[15px] text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 px-5 py-3.5"
                  style={{
                    background: 'var(--btn-primary-bg)',
                    boxShadow: '0 4px 16px rgba(117, 27, 180,0.40)',
                  }}
                >
                  <Lightning size={18} weight="fill" />
                  <span className="flex-1 text-center">Iniciar treino</span>
                  <CaretRight size={16} className="text-white/50" />
                </button>
              </div>
            </aside>
          )}

          <main className="flex flex-col gap-3 min-w-0">
            {/* Pré-execução — mobile */}
            {!treinoIniciado && (
              <div className="lg:hidden flex flex-col gap-3">
                <button
                  type="button"
                  onClick={iniciarTreino}
                  className="w-full min-h-12 rounded-xl font-bold text-[15px] text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 px-5 py-3.5"
                  style={{
                    background: 'var(--btn-primary-bg)',
                    boxShadow: '0 4px 16px rgba(117, 27, 180,0.40)',
                  }}
                >
                  <Lightning size={18} weight="fill" />
                  <span className="flex-1 text-center">Iniciar treino</span>
                  <CaretRight size={16} className="text-white/50" />
                </button>
                {!isDesktop && <div className="px-1">{renderHistoricoChart()}</div>}
              </div>
            )}

            {/* Header da coluna de exercícios — desktop */}
            {!treinoIniciado && (
              <div
                className="hidden lg:flex sticky top-0 z-10 py-3 items-center justify-between"
                style={{
                  background: 'var(--surface-0)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-2">
                  <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Exercícios</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{blockCount} blocos</span>
              </div>
            )}

            {treinoIniciado && (
              <div className="flex items-center gap-2 px-3 py-2 bg-success-subtle border border-success-border rounded-lg">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
                <p className="text-xs text-success font-medium flex-1">Treino em andamento</p>
                <button
                  type="button"
                  onClick={retomarExecucao}
                  className="text-[10px] font-semibold text-brand hover:underline"
                >
                  Retomar →
                </button>
              </div>
            )}

            {(() => {
              const current = treinoIniciado ? findCurrentSerie(blocks) : null;
              return (
            <div className="flex flex-col gap-2.5">
              {blocks.map((block, index) => (
                <div
                  key={block.kind === 'simples' ? block.exercise.id : block.id}
                  className={index > 0 ? 'pt-2.5' : undefined}
                  style={index > 0 ? { borderTop: '1px dashed var(--border-subtle)' } : undefined}
                >
                  {block.kind === 'simples' ? (
                    <ExercicioCard
                      exercicio={block.exercise}
                      treinoIniciado={treinoIniciado}
                      showAnteriorCol={hasHistorico}
                      isDesktop={isDesktop}
                      currentExercicioId={current?.exercicioId}
                      currentOrdem={current?.ordem}
                      onPesoChange={(ordem, peso, raw) => handlePesoChange(block.exercise.id, ordem, peso, raw)}
                      onRepsChange={(ordem, reps) => handleRepsChange(block.exercise.id, ordem, reps)}
                      onTempoChange={(ordem, seconds, raw) => handleTempoChange(block.exercise.id, ordem, seconds, raw)}
                      onCheck={(ordem) => handleCheck(block.exercise.id, ordem)}
                      onVideoOpen={setVideoUrl}
                      onCargaInfo={() => setCargaInfoOpen(true)}
                      onOpenCard={treinoIniciado ? () => abrirModalBlock(index) : undefined}
                    />
                  ) : (
                    <BiSetGroupPreviewCard
                      block={block}
                      blockIdx={index}
                      treinoIniciado={treinoIniciado}
                      showAnteriorCol={hasHistorico}
                      isDesktop={isDesktop}
                      onPesoChangeA={(ordem, peso, raw) => handlePesoChange(block.exercicioA.id, ordem, peso, raw)}
                      onPesoChangeB={(ordem, peso, raw) => handlePesoChange(block.exercicioB.id, ordem, peso, raw)}
                      onRepsChangeA={(ordem, reps) => handleRepsChange(block.exercicioA.id, ordem, reps)}
                      onRepsChangeB={(ordem, reps) => handleRepsChange(block.exercicioB.id, ordem, reps)}
                      onTempoChangeA={(ordem, seconds, raw) => handleTempoChange(block.exercicioA.id, ordem, seconds, raw)}
                      onTempoChangeB={(ordem, seconds, raw) => handleTempoChange(block.exercicioB.id, ordem, seconds, raw)}
                      onCheckA={(ordem) => handleCheck(block.exercicioA.id, ordem)}
                      onCheckB={(ordem) => handleCheck(block.exercicioB.id, ordem)}
                      onVideoOpen={setVideoUrl}
                      onCargaInfo={() => setCargaInfoOpen(true)}
                      onOpenCard={treinoIniciado ? () => abrirModalBlock(index) : undefined}
                    />
                  )}
                </div>
              ))}
            </div>
              );
            })()}
          </main>
        </div>
      </div>

      {/* ── Rest Timer: barra discreta no rodapé — não escurece a tela, some sozinha ao zerar ── */}
      {restTimer.active && (
        <RestTimerBar
          remaining={restTimer.remaining}
          total={restTimer.duration}
          meta={restTimer.meta}
          onAddSeconds={restAddSecs}
          onSkip={restSkip}
        />
      )}

      {/* ── Modal de Termômetro de Treino (Feedback) ── */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm">
          <div className="w-full bg-surface-1 border-t border-divider rounded-t-2xl p-5 pb-safe-bottom" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
            {/* Aviso se treino incompleto — cada exercício pendente leva pra 1ª série faltando */}
            {setsCompletos < totalSets && (() => {
              const pendentes = flattenExercicios(blocks).filter((ex) => ex.series.some((s) => !s.completado));
              return (
                <div className="mb-4 rounded-lg border border-warning-border bg-warning-subtle overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Clock className="w-4 h-4 text-warning shrink-0" />
                    <p className="text-xs text-warning font-medium">
                      {totalSets - setsCompletos} série{totalSets - setsCompletos > 1 ? 's' : ''} não concluída{totalSets - setsCompletos > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="px-1.5 pb-1.5 flex flex-col gap-0.5">
                    {pendentes.map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => irParaSeriePendente()}
                        className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-left text-xs text-text-primary hover:bg-warning/10 active:bg-warning/15 transition-colors min-h-11 touch-manipulation"
                      >
                        <span className="truncate">{ex.nome}</span>
                        <CaretRight size={12} className="text-warning shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            <h3 className="text-sm font-bold text-text-primary mb-4">Feedback do treino</h3>

            {/* Escala de Satisfação */}
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-2">Dificuldade</p>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Muito Fácil', emoji: '😴', color: 'bg-blue-500/15 border-blue-500/40 text-blue-400' },
                  { label: 'Fácil',       emoji: '😊', color: 'bg-success/15 border-success/40 text-success' },
                  { label: 'Moderado',    emoji: '💪', color: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400' },
                  { label: 'Difícil',     emoji: '🔥', color: 'bg-danger/15 border-danger/40 text-danger' },
                ].map(({ label, emoji, color }) => (
                  <button
                    key={label}
                    onClick={() => setFeedbackSatisfacao(feedbackSatisfacao === label ? '' : label)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-center transition-all',
                      feedbackSatisfacao === label
                        ? color
                        : 'bg-surface-2 border-card text-text-muted'
                    )}
                  >
                    <span className="text-lg leading-none">{emoji}</span>
                    <span className="text-[9px] font-semibold leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Escala de Dor */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Nível de Dor / Desconforto</p>
                <span className="text-xs font-bold tabular-nums lining-nums text-text-primary">{feedbackDor}/10</span>
              </div>
              <div className="relative flex items-center gap-2">
                <span className="text-base">😌</span>
                <div className="flex-1 relative">
                  <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(feedbackDor - 1) / 9 * 100}%`,
                        background: feedbackDor <= 3
                          ? '#22c55e'
                          : feedbackDor <= 6
                          ? '#eab308'
                          : '#ef4444',
                      }}
                    />
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={feedbackDor}
                    onChange={(e) => setFeedbackDor(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-6 -top-2.5"
                    style={{ touchAction: 'none' }}
                  />
                  {/* Thumb visual */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-1 border-2 flex items-center justify-center text-[10px] pointer-events-none shadow-sm"
                    style={{
                      left: `calc(${(feedbackDor - 1) / 9 * 100}% - 12px)`,
                      borderColor: feedbackDor <= 3 ? '#22c55e' : feedbackDor <= 6 ? '#eab308' : '#ef4444',
                    }}
                  >
                    🫀
                  </div>
                </div>
                <span className="text-base">😣</span>
              </div>
            </div>

            {/* Nota da sessão */}
            <div className="mb-5">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                Como foi o treino? (opcional)
              </label>
              <textarea
                value={feedbackNota}
                onChange={(e) => setFeedbackNota(e.target.value.slice(0, 300))}
                placeholder="Deixe uma nota sobre essa sessão..."
                className="max-h-[120px] min-h-[72px] w-full resize-none rounded-xl border border-card bg-surface-2 p-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                maxLength={300}
              />
            </div>

            {/* Botões */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => finalizarConfirmado()}
                disabled={saving}
                className="w-full h-11 bg-brand text-text-on-brand rounded-xl text-sm font-semibold shadow-sm shadow-brand/30 hover:opacity-90 disabled:opacity-50"
              >
                {saving ? '...' : 'Finalizar Treino'}
              </button>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="w-full h-10 bg-surface-3 border border-card text-text-secondary rounded-xl text-xs font-semibold hover:text-text-primary transition-colors"
              >
                Continuar Treinando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de confirmação para descartar ── */}
      {showConfirmAbandon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface-1 border border-card shadow-elev-2 rounded-2xl p-6">
            <div className="w-14 h-14 rounded-2xl bg-danger-subtle border border-danger-border flex items-center justify-center mx-auto mb-4">
              <X className="w-7 h-7 text-danger" />
            </div>
            <h3 className="text-lg font-bold text-text-primary text-center mb-2">Descartar Treino?</h3>
            <p className="text-sm text-text-secondary text-center mb-6 leading-relaxed">
              Seu progresso não será salvo. {setsCompletos} de {totalSets} séries serão perdidas.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={descartarTreino}
                className="w-full h-11 rounded-xl text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                style={{
                  background: '#e05555',
                  boxShadow: '0 2px 8px rgba(224,85,85,0.35)',
                }}
              >
                Sim, Descartar
              </button>
              <button
                onClick={() => setShowConfirmAbandon(false)}
                className="w-full h-11 bg-surface-3 border border-card text-text-secondary rounded-xl text-xs font-semibold hover:text-text-primary transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de execução por exercício ── */}
      {modalEx && modalSerie && (
        <div
          className="fixed inset-0 z-50 flex flex-col lg:max-w-[640px] lg:mx-auto lg:left-1/2 lg:-translate-x-1/2"
          onTouchStart={handleModalTouchStart}
          onTouchEnd={handleModalTouchEnd}
          style={{ background: 'var(--surface-0)' }}
        >

          {bisetTransitionName && (
            <div
              className="absolute inset-0 z-[55] flex flex-col items-center justify-center animate-in fade-in duration-300"
              style={{ background: 'var(--surface-0)' }}
            >
              <p className="text-brand text-2xl font-bold">↓</p>
              <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{bisetTransitionName}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>agora</p>
            </div>
          )}

          <div className="w-full h-0.5 flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
            <div
              className="h-full bg-brand transition-all duration-300"
              style={{ width: `${((modalRodadaIdx + 1) / modalTotalRodadas) * 100}%` }}
            />
          </div>

          <header
            className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 flex-shrink-0 pt-safe-top"
            style={{
              background: 'var(--surface-0)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => setModalBlockIdx(null)}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0"
              style={{ background: 'transparent', color: 'var(--brand-primary)' }}
              aria-label="Fechar execução"
            >
              <X size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="text-base font-bold leading-tight truncate min-w-0" style={{ color: 'var(--text-primary)' }}>
                  {toTitleCase(modalEx.nome)}
                </h2>
                {isPerSideLoadEquipment(modalEx.equipamento, modalEx.nome) && (
                  <CargaPorLadoInfoButton onClick={() => setCargaInfoOpen(true)} size={16} />
                )}
                {modalIsBiSet && (
                  <span className="ml-0.5 inline-block text-[10px] font-bold uppercase text-brand bg-brand/10 rounded px-1.5 py-0.5 align-middle shrink-0">
                    BI-SET {bisetFase === 'b' ? 'B/B' : 'A/B'}
                  </span>
                )}
              </div>
              <p
                className="mt-0.5 text-[11px] tabular-nums lining-nums flex items-center gap-1"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Clock size={12} className="shrink-0" aria-hidden />
                Descanso {formatRestTime(modalEx.descanso)}
                <span className="mx-0.5" aria-hidden>·</span>
                {formatDuration(elapsed)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs tabular-nums lining-nums" style={{ color: 'var(--text-tertiary)' }}>
                Ex. {(modalBlockIdx ?? 0) + 1}/{blockCount}
                {modalIsBiSet ? ` · Rodada ${modalRodadaIdx + 1}/${modalTotalRodadas} · A→B` : null}
              </p>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto pb-36">
            {modalIsBiSet && modalPartnerEx && bisetFase === 'a' && (
              <div
                className="mx-4 mt-3 px-3.5 py-2.5 rounded-lg border-l-[3px] border-brand"
                style={{ background: 'var(--brand-subtle)' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  ↓ Em seguida: {modalPartnerEx.nome} · {modalPartnerEx.series[modalRodadaIdx]?.reps} reps
                  {exercicioMostraPeso(modalPartnerEx.tipo_exercicio) && modalPartnerEx.series[modalRodadaIdx]?.peso_atual
                    ? ` · ${modalPartnerEx.series[modalRodadaIdx]?.peso_atual} kg`
                    : ''}
                </p>
              </div>
            )}

            {modalIsBiSet && bisetFase === 'b' && modalBlock?.kind === 'biset' && (
              <div
                className="mx-4 mt-3 px-3.5 py-2.5 rounded-lg border-l-[3px] border-brand"
                style={{ background: 'var(--brand-subtle)' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  ⊙ Após esta série: {formatRestTime(modalBlock.descanso)} de descanso
                  {modalRodadaIdx < modalTotalRodadas - 1 ? ', depois repete' : ''}
                </p>
              </div>
            )}
            {/* Técnica — único meta no topo, centralizado */}
            {(() => {
              const hasTecnica = !!(modalSerie.tecnica?.trim() || modalSerie.tecnica_extra?.trim());
              if (!hasTecnica) return null;
              const tecnicaLabel = (modalSerie.tecnica_extra || modalSerie.tecnica || '').trim();
              const expanded = techniqueCardExpanded;
              return (
                <div className="flex justify-center px-4 py-3 mt-2">
                  <button
                    ref={tecnicaKpiRef}
                    type="button"
                    onClick={() => setTechniqueCardExpanded((v) => !v)}
                    aria-expanded={expanded}
                    aria-controls="tecnica-info-panel"
                    className={cn(
                      'px-3 py-1.5 rounded-md bg-brand/10 text-brand text-[12px] font-semibold border border-brand/25',
                      'inline-flex items-center gap-1.5 max-w-[min(100%,16rem)] min-h-11 touch-manipulation',
                      expanded && 'bg-brand/15',
                    )}
                  >
                    <span className="truncate">{tecnicaLabel}</span>
                    <Info size={14} weight={expanded ? 'fill' : 'regular'} aria-hidden />
                  </button>
                </div>
              );
            })()}

            <div ref={tecnicaPanelRef} id="tecnica-info-panel" className="mx-4 mb-2 empty:hidden">
              <StudentTechniqueCard
                techniqueValue={modalSerie.tecnica}
                extraValue={modalSerie.tecnica_extra}
                expanded={techniqueCardExpanded}
                onExpandedChange={setTechniqueCardExpanded}
              />
            </div>

            {!modalShowPeso && modalSerieEhTempo && (
              <div className="flex flex-col items-center gap-1 py-3 px-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-disabled">
                  Cronômetro
                </p>
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 shrink-0" aria-hidden />

                  <div className="min-w-[100px] text-center">
                    <span className="block text-5xl font-black tabular-nums lining-nums tracking-tight text-text-primary leading-none font-sans">
                      {secondsToDescanso(stopwatchSeconds)}
                    </span>
                    <span className="block text-base font-bold text-brand mt-0.5">min</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (stopwatchRunning) {
                        haptic('success');
                        pararCronometro();
                      } else {
                        haptic('light');
                        setStopwatchRunning(true);
                      }
                    }}
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-transform touch-manipulation shrink-0',
                      stopwatchRunning ? 'bg-danger text-white' : 'bg-brand text-white',
                    )}
                    aria-label={stopwatchRunning ? 'Parar cronômetro e concluir série' : 'Iniciar cronômetro'}
                  >
                    {stopwatchRunning ? <Pause size={20} weight="bold" /> : <Play size={20} weight="bold" />}
                  </button>
                </div>
              </div>
            )}

            {modalShowPeso && (
              <>
                {/* Display de carga (placar) */}
                <div className="flex flex-col items-center gap-1 py-3 px-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-disabled">
                    Carga
                    {isPerSideLoadEquipment(modalEx.equipamento, modalEx.nome) ? (
                      <span className="normal-case tracking-normal font-medium text-text-tertiary"> · por lado</span>
                    ) : null}
                  </p>

                  <div className="flex items-center gap-5">
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        ajustarCarga(-2.5);
                      }}
                      className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center text-text-secondary active:scale-95 active:bg-surface-3 transition-transform touch-manipulation"
                      aria-label="Diminuir carga"
                    >
                      <Minus size={20} weight="bold" />
                    </button>

                    <div className="min-w-[100px] text-center">
                      <div className="relative">
                        <span
                          className="block text-5xl font-black tabular-nums lining-nums tracking-tight text-text-primary leading-none font-sans pointer-events-none"
                          aria-hidden
                        >
                          {modalCargaStr === '' ? '—' : modalCargaStr}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={modalCargaStr}
                          onChange={(e) => {
                            const raw = e.target.value.replace(',', '.');
                            if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                              setModalCargaStr(raw);
                              const num = parseFloat(raw);
                              setModalCarga(isNaN(num) ? 0 : num);
                            }
                          }}
                          onFocus={(e) => {
                            e.currentTarget.select();
                          }}
                          onBlur={() => {
                            if (modalCargaStr !== '' && !isNaN(parseFloat(modalCargaStr))) {
                              const normalized = String(Math.max(0, Math.round(parseFloat(modalCargaStr) * 100) / 100));
                              setModalCargaStr(normalized);
                              setModalCarga(parseFloat(normalized));
                            }
                          }}
                          className="absolute inset-0 w-full h-full cursor-text bg-transparent border-0 p-0 m-0 text-center opacity-0"
                          style={{ fontSize: '16px' }}
                          aria-label="Editar carga em kg"
                        />
                      </div>
                      <span className="block text-base font-bold text-brand mt-0.5">kg</span>
                    </div>

                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        ajustarCarga(2.5);
                      }}
                      className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center text-text-secondary active:scale-95 active:bg-surface-3 transition-transform touch-manipulation"
                      aria-label="Aumentar carga"
                    >
                      <Plus size={20} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Ajustes rápidos */}
                <div className="flex gap-2 justify-center px-4">
                  {[
                    { delta: -5, label: '−5' },
                    { delta: -2.5, label: '−2.5' },
                    { delta: 2.5, label: '+2.5' },
                    { delta: 5, label: '+5' },
                  ].map(({ delta, label }) => (
                    <button
                      key={delta}
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        ajustarCarga(delta);
                      }}
                      className="min-w-[60px] h-11 rounded-[10px] bg-surface-2 text-sm font-semibold text-text-secondary tabular-nums lining-nums active:bg-surface-3 active:scale-95 transition-all touch-manipulation"
                      aria-label={`${delta > 0 ? 'Adicionar' : 'Remover'} ${Math.abs(delta)} kg`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Observação do coach — preenche o espaço entre ajustes e histórico */}
            {modalEx.observacoes?.trim() ? (
              <div className="mx-4 mt-4 rounded-xl bg-surface-1 px-4 py-3 flex gap-2">
                <ChatCircle size={14} weight="fill" className="text-brand mt-0.5 shrink-0" aria-hidden />
                <p className="text-xs text-text-secondary leading-relaxed">{modalEx.observacoes}</p>
              </div>
            ) : null}

            {/* Histórico de séries */}
            <div className="mt-4">
              <div className="flex items-center justify-between px-4 pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
                  Histórico de séries
                </p>
                <button
                  type="button"
                  onClick={() => setShowSeriesHistory((v) => !v)}
                  className="text-xs text-text-tertiary flex items-center gap-1 min-h-11 px-1 active:text-text-primary transition-colors touch-manipulation"
                >
                  {showSeriesHistory ? <CaretUp size={12} aria-hidden /> : <CaretDown size={12} aria-hidden />}
                  {showSeriesHistory ? 'Ocultar' : 'Ver'}
                </button>
              </div>

              {showSeriesHistory && (
                <div className="mx-4 rounded-xl bg-surface-2 overflow-hidden border border-border-default shadow-sm">
                  {modalIsBiSet && modalBlock?.kind === 'biset' ? (
                    <div className="space-y-3 px-3 py-2">
                      {modalBlock.exercicioA.series.map((_, rodadaIdx) => {
                        const aSerie = modalBlock.exercicioA.series[rodadaIdx];
                        const bSerie = modalBlock.exercicioB.series[rodadaIdx];
                        if (!aSerie || !bSerie) return null;
                        const rows = [
                          { label: 'A', nome: modalBlock.exercicioA.nome, exId: modalBlock.exercicioA.id, s: aSerie },
                          { label: 'B', nome: modalBlock.exercicioB.nome, exId: modalBlock.exercicioB.id, s: bSerie },
                        ];
                        return (
                          <div
                            key={rodadaIdx}
                            className={cn(rodadaIdx > 0 && 'pt-3 border-t border-dashed border-border-divider')}
                          >
                            <p className="text-[10px] font-semibold uppercase mb-2 text-text-disabled">
                              Rodada {rodadaIdx + 1}
                            </p>
                            {rows.map(({ label, nome, exId, s }) => {
                              const isAtualRow =
                                rodadaIdx === modalRodadaIdx &&
                                ((label === 'A' && bisetFase === 'a') || (label === 'B' && bisetFase !== 'a'));
                              const pesoExibido = isAtualRow ? modalCarga : s.peso_atual;
                              const showPesoRow = exercicioMostraPeso(
                                label === 'A' ? modalBlock.exercicioA.tipo_exercicio : modalBlock.exercicioB.tipo_exercicio,
                              );
                              return (
                                <div
                                  key={label}
                                  className="flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-md text-xs"
                                  style={{
                                    background: s.completado
                                      ? 'rgba(57,199,90,0.06)'
                                      : isAtualRow
                                        ? 'rgba(117, 27, 180, 0.14)'
                                        : 'transparent',
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleCheck(exId, s.ordem)}
                                    className="w-5 h-5 flex items-center justify-center shrink-0 text-[9px] font-bold border-0 bg-transparent"
                                    style={{ color: s.completado ? '#39c75a' : 'var(--text-secondary)' }}
                                    aria-label={
                                      s.completado
                                        ? `Rodada ${rodadaIdx + 1} ${label} concluída — toque para desmarcar`
                                        : `Rodada ${rodadaIdx + 1} ${label}`
                                    }
                                  >
                                    {s.completado ? (
                                      <Check size={12} weight="bold" />
                                    ) : (
                                      label
                                    )}
                                  </button>
                                  <span className="truncate flex-1 text-text-secondary">{nome}</span>
                                  <span className="text-text-disabled tabular-nums lining-nums shrink-0">
                                    {s.anterior || '—'}
                                  </span>
                                  {showPesoRow && (isAtualRow ? (
                                    <span
                                      className="font-bold tabular-nums lining-nums font-sans shrink-0"
                                      style={{ color: serieTextColor(s.completado, s.peso_manual ?? false) }}
                                    >
                                      {pesoExibido ? (
                                        <>
                                          {pesoExibido}
                                          <span className="text-[10px] font-medium text-text-tertiary ml-0.5">kg</span>
                                        </>
                                      ) : (
                                        '—'
                                      )}
                                    </span>
                                  ) : (
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={s.peso_input_str ?? formatPesoDisplay(s.peso_atual)}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        handlePesoChange(exId, s.ordem, parsePesoInput(raw), raw);
                                      }}
                                      placeholder="—"
                                      aria-label={`Editar peso — ${nome}, rodada ${rodadaIdx + 1}`}
                                      className="w-14 h-7 bg-transparent px-1 text-right text-xs font-medium font-sans tabular-nums lining-nums focus:outline-none border-b border-brand/30"
                                      style={{ color: serieTextColor(s.completado, s.peso_manual ?? false) }}
                                    />
                                  ))}
                                  {(() => {
                                    if (s.is_tempo) {
                                      return (
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          value={
                                            s.tempo_input_str != null
                                              ? digitsToMMSS(s.tempo_input_str)
                                              : (s.tempo_executado_seg ? secondsToDescanso(s.tempo_executado_seg) : '')
                                          }
                                          placeholder={String(s.reps)}
                                          onChange={(e) => {
                                            const digits = digitsFromTempoInput(e.target.value);
                                            handleTempoChange(exId, s.ordem, digitsToSeconds(digits), digits);
                                          }}
                                          aria-label={`Tempo — ${nome}, rodada ${rodadaIdx + 1}. Prescrito: ${s.reps}`}
                                          className={cn(
                                            'min-w-9 w-auto shrink-0 bg-transparent text-center text-xs font-medium',
                                            'tabular-nums lining-nums font-sans focus:outline-none',
                                            'placeholder:text-text-disabled',
                                          )}
                                          style={{
                                            color: s.completado ? '#39c75a' : 'var(--text-primary)',
                                            borderBottom: '1.5px solid transparent',
                                          }}
                                          onFocus={(e) => {
                                            e.currentTarget.style.borderBottomColor = 'rgba(117,27,180,0.45)';
                                          }}
                                          onBlur={(e) => {
                                            e.currentTarget.style.borderBottomColor = 'transparent';
                                          }}
                                        />
                                      );
                                    }
                                    return (
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        value={
                                          s.reps_executadas !== undefined && s.reps_executadas !== ''
                                            ? s.reps_executadas
                                            : ''
                                        }
                                        placeholder={String(s.reps)}
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          handleRepsChange(
                                            exId,
                                            s.ordem,
                                            raw === '' ? '' : parseFloat(raw) || 0,
                                          );
                                        }}
                                        aria-label={`Reps — ${nome}, rodada ${rodadaIdx + 1}. Prescrito: ${s.reps}`}
                                        className={cn(
                                          'min-w-9 w-auto shrink-0 bg-transparent text-center text-xs font-medium',
                                          'tabular-nums lining-nums font-sans focus:outline-none',
                                          'placeholder:text-text-disabled',
                                        )}
                                        style={{
                                          color: serieTextColor(s.completado, s.reps_manual ?? false),
                                          borderBottom: '1.5px solid transparent',
                                        }}
                                        onFocus={(e) => {
                                          e.currentTarget.style.borderBottomColor = 'rgba(117,27,180,0.45)';
                                        }}
                                        onBlur={(e) => {
                                          e.currentTarget.style.borderBottomColor = 'transparent';
                                        }}
                                      />
                                    );
                                  })()}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      <div
                        className="grid items-center border-b border-border-divider"
                        style={{
                          gridTemplateColumns: modalShowPeso ? GRID_COLS_HISTORICO : GRID_COLS_HISTORICO_NO_PESO,
                          columnGap: HISTORICO_COL_GAP,
                          padding: `6px ${HISTORICO_ROW_PAD_X}px`,
                        }}
                      >
                        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-disabled text-center">SET</span>
                        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-disabled text-left">ANT.</span>
                        {modalShowPeso && (
                          <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-disabled text-center">PESO</span>
                        )}
                        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-disabled text-center">REPS</span>
                        <span aria-hidden className="min-w-0" />
                        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-disabled text-left">TÉC</span>
                      </div>
                      {modalEx.series.map((s, idx) => {
                        const isAtual = idx === modalRodadaIdx;
                        const t1 = s.tecnica ? duasLetrasTenica(s.tecnica) : '';
                        const t2 = s.tecnica_extra ? duasLetrasTenica(s.tecnica_extra) : '';
                        return (
                          <div
                            key={s.ordem}
                            className={cn(
                              'grid items-center',
                              idx < modalEx.series.length - 1 && 'border-b border-border-divider',
                            )}
                            style={{
                              gridTemplateColumns: modalShowPeso ? GRID_COLS_HISTORICO : GRID_COLS_HISTORICO_NO_PESO,
                              columnGap: HISTORICO_COL_GAP,
                              padding: `10px ${HISTORICO_ROW_PAD_X}px`,
                              background: s.completado
                                ? 'rgba(57,199,90,0.06)'
                                : isAtual
                                  ? 'rgba(117, 27, 180, 0.14)'
                                  : 'transparent',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleCheck(modalEx.id, s.ordem)}
                              className="w-6 h-6 flex items-center justify-center text-[10px] font-bold mx-auto font-sans tabular-nums border-0 bg-transparent"
                              style={{
                                color: s.completado
                                  ? '#39c75a'
                                  : s.tecnica
                                    ? 'var(--brand-primary)'
                                    : isAtual
                                      ? 'var(--brand-primary)'
                                      : 'var(--text-tertiary)',
                              }}
                              aria-label={
                                s.completado
                                  ? `Série ${idx + 1} concluída — toque para desmarcar`
                                  : `Série ${idx + 1}`
                              }
                            >
                              {s.completado ? (
                                <Check size={14} weight="bold" />
                              ) : (
                                t1 || idx + 1
                              )}
                            </button>

                            <span
                              className="text-xs text-text-disabled tabular-nums lining-nums font-sans truncate"
                              title={s.anterior || '—'}
                            >
                              {s.anterior || '—'}
                            </span>

                            {modalShowPeso && (
                              <div className="flex items-baseline justify-center gap-0.5 min-w-0">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={isAtual ? modalCargaStr : (s.peso_input_str ?? formatPesoDisplay(s.peso_atual))}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const val = parsePesoInput(raw);
                                    if (isAtual) {
                                      setModalCarga(val);
                                      setModalCargaStr(raw);
                                    }
                                    handlePesoChange(modalEx.id, s.ordem, val, raw);
                                  }}
                                  placeholder="—"
                                  aria-label={`Editar peso da série ${idx + 1}`}
                                  className="w-full max-w-10 bg-transparent text-center tabular-nums lining-nums font-sans focus:outline-none leading-none appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    lineHeight: '22px',
                                    height: 22,
                                    fontFamily: 'var(--font-sans), "DM Sans", system-ui, sans-serif',
                                    fontVariantNumeric: 'tabular-nums lining-nums',
                                    color: serieTextColor(s.completado, s.peso_manual ?? false),
                                    WebkitTextFillColor: serieTextColor(s.completado, s.peso_manual ?? false),
                                  }}
                                />
                                {(isAtual ? modalCarga : s.peso_atual) ? (
                                  <span
                                    className="shrink-0 text-text-tertiary"
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 500,
                                      lineHeight: '22px',
                                    }}
                                  >
                                    kg
                                  </span>
                                ) : null}
                              </div>
                            )}

                            {(() => {
                              if (s.is_tempo) {
                                return (
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={
                                      s.tempo_input_str != null
                                        ? digitsToMMSS(s.tempo_input_str)
                                        : (s.tempo_executado_seg ? secondsToDescanso(s.tempo_executado_seg) : '')
                                    }
                                    placeholder={String(s.reps)}
                                    onChange={(e) => {
                                      const digits = digitsFromTempoInput(e.target.value);
                                      handleTempoChange(modalEx.id, s.ordem, digitsToSeconds(digits), digits);
                                    }}
                                    aria-label={`Tempo da série ${idx + 1}. Prescrito: ${s.reps}`}
                                    className={cn(
                                      'w-full mx-auto bg-transparent text-center',
                                      'tabular-nums lining-nums font-sans focus:outline-none',
                                      'placeholder:text-text-disabled',
                                    )}
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 500,
                                      fontFamily: 'var(--font-sans), "DM Sans", system-ui, sans-serif',
                                      color: s.completado ? '#39c75a' : 'var(--text-primary)',
                                      height: 22,
                                    }}
                                  />
                                );
                              }
                              return (
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={
                                    s.reps_executadas !== undefined && s.reps_executadas !== ''
                                      ? s.reps_executadas
                                      : ''
                                  }
                                  placeholder={String(s.reps)}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    handleRepsChange(
                                      modalEx.id,
                                      s.ordem,
                                      raw === '' ? '' : parseFloat(raw) || 0,
                                    );
                                  }}
                                  aria-label={`Reps da série ${idx + 1}. Prescrito: ${s.reps}`}
                                  className={cn(
                                    'w-full mx-auto bg-transparent text-center',
                                    'tabular-nums lining-nums font-sans focus:outline-none',
                                    'placeholder:text-text-disabled',
                                  )}
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 500,
                                    fontFamily: 'var(--font-sans), "DM Sans", system-ui, sans-serif',
                                    color: serieTextColor(s.completado, s.reps_manual ?? false),
                                    height: 22,
                                  }}
                                />
                              );
                            })()}

                            <div aria-hidden className="min-w-0" />

                            <div className="flex gap-1 justify-start items-center flex-wrap">
                              {t2 ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-surface-3 text-text-tertiary">
                                  {t2}
                                </span>
                              ) : (
                                <span className="text-[9px] text-text-disabled">—</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Preview de vídeo / gif — abaixo do histórico */}
            {modalEx.video_url ? (
              <div className="pb-2">
                <VideoPlayerCard videoUrl={modalEx.video_url} exercicioNome={modalEx.nome} />
              </div>
            ) : modalEx.gif_url ? (
              <button
                type="button"
                onClick={() => setDemoImg(modalEx.gif_url!)}
                className="mx-4 mt-4 mb-2 w-[calc(100%-2rem)] overflow-hidden rounded-[14px] bg-surface-1 active:opacity-90 transition-opacity touch-manipulation"
                aria-label="Ver demonstração do exercício"
              >
                <img
                  src={modalEx.gif_url}
                  alt=""
                  className="w-full h-[180px] object-cover"
                  loading="lazy"
                />
              </button>
            ) : null}
          </div>

          {/* Bottom bar */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-surface-0/95 backdrop-blur-md border-t border-border-divider px-4 pt-3 flex flex-col gap-1.5 pb-[max(12px,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => {
                // Lista já concluiu todos os blocos → só finalizar (não re-marcar série)
                const treinoConcluidoNaLista = blocks.length > 0 && blocks.every(isBlockComplete);
                if (treinoConcluidoNaLista) {
                  setModalBlockIdx(null);
                  handleFinalizar();
                  return;
                }
                concluirSerieModal();
              }}
              disabled={restTimer.active || bisetFase === 'transicao'}
              className="btn-primary w-full min-h-[52px] rounded-[14px] flex items-center justify-center gap-2 text-[15px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 touch-manipulation"
            >
              <Check size={18} weight="bold" />
              {(() => {
                const treinoConcluidoNaLista = blocks.length > 0 && blocks.every(isBlockComplete);
                if (treinoConcluidoNaLista) {
                  return 'Finalizar treino';
                }
                if (modalIsBiSet && modalPartnerEx && modalBlock?.kind === 'biset') {
                  if (bisetFase === 'a') {
                    return `Concluir ${modalEx.nome} → ${modalPartnerEx.nome}`;
                  }
                  const isUltimaRodada = modalRodadaIdx >= modalTotalRodadas - 1;
                  if (isUltimaRodada) {
                    return modalBlockIdx !== null && modalBlockIdx >= blocks.length - 1
                      ? 'Finalizar treino'
                      : `Concluir ${modalEx.nome} → Finalizar Bi-Set`;
                  }
                  return `Concluir ${modalEx.nome} → Descanso ${formatRestTime(modalBlock.descanso)}`;
                }
                if (modalRodadaIdx >= modalTotalRodadas - 1) {
                  return modalBlockIdx !== null && modalBlockIdx >= blocks.length - 1
                    ? 'Finalizar treino'
                    : 'Concluir exercício';
                }
                return `Concluir série ${modalRodadaIdx + 1}/${modalTotalRodadas}`;
              })()}
            </button>
            {modalBlockIdx !== null && modalBlockIdx < blocks.length - 1 && modalRodadaIdx >= modalTotalRodadas - 1 && !modalIsBiSet && (
              <button
                type="button"
                onClick={() => { setModalBlockIdx(null); }}
                className="w-full h-10 text-xs text-text-tertiary transition-colors touch-manipulation"
              >
                Fechar e voltar à lista
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── YouTube player ── */}
      {videoUrl && <YouTubePlayer videoUrl={videoUrl} onClose={() => setVideoUrl(null)} />}
      <CargaPorLadoInfoModal open={cargaInfoOpen} onClose={() => setCargaInfoOpen(false)} />

      {/* ── Demonstração em imagem (sob demanda) ── */}
      {demoImg && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setDemoImg(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-brand/20 overflow-hidden bg-surface-0">
            <button
              onClick={() => setDemoImg(null)}
              className="absolute top-3 right-3 w-9 h-9 bg-black/50 text-brand rounded-full flex items-center justify-center z-10 backdrop-blur-md hover:bg-brand hover:text-black transition-all"
            >
              <X size={18} />
            </button>
            <img src={demoImg} alt="Demonstração" className="w-full h-auto object-contain" loading="lazy" />
          </div>
        </div>
      )}

    </div>
  );
}

