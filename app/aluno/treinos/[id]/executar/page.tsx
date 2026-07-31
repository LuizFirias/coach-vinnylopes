'use client';

import { useEffect, useState, useRef, useCallback, useId } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Play, X, Clock, CaretLeft, CaretRight, Video, Lightning, Minus, Plus, Info, CaretDown } from '@phosphor-icons/react';
import { RestTimerOverlay } from '@/app/components/treino/execucao/RestTimerOverlay';
import { VolumeProgressDots } from '@/app/components/treinos/VolumeProgressDots';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { CompletionShareScreen } from '@/app/components/workout/share/CompletionShareScreen';
import { resolveCoachShareHandle } from '@/lib/utils/workoutShare';
import { YouTubePlayer } from '@/app/components/YouTubePlayer';
import { VideoPlayerCard } from '@/app/components/treino/execucao/VideoPlayerCard';
import { formatDuration, formatVolume } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { haptic } from '@/lib/utils/haptics';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { StudentTechniqueCard } from '@/app/components/workout/StudentTechniqueCard';
import { BiSetGroupPreviewCard } from '@/app/components/treino/execucao/BiSetGroupPreviewCard';
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
  countWorkoutBlocks,
} from '@/lib/utils/biset';
import { formatRestTime } from '@/lib/utils/restTime';

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
  exercicioA?: { exercicio_id: string; nome: string; series: SerieConfig[] };
  exercicioB?: { exercicio_id: string; nome: string; series: SerieConfig[] };
}

interface SerieState {
  ordem: number;
  peso_atual: number;
  reps: number | string;
  tecnica?: string;
  tecnica_extra?: string;
  completado: boolean;
  anterior?: string;
}

interface ExercicioState {
  id: string;
  nome: string;
  descanso: number;
  video_url?: string;
  gif_url?: string;
  observacoes?: string;
  grupo_muscular?: string;
  series: SerieState[];
  biset_parceiro_id?: string;
}

interface VolumePoint {
  data: string;
  volume: number;
}

function estimateDurationMinFromBlocks(blocks: WorkoutBlock[]): number {
  const flat = flattenExercicios(blocks);
  const totalSets = blocks.reduce((acc, b) => acc + (b.kind === 'simples' ? b.exercise.series.length : b.exercicioA.series.length), 0);
  return Math.max(15, Math.round(countWorkoutBlocks(blocks) * 3 + totalSets * 2));
}

const GRID_COLS_SERIES_WITH_ANT_MOBILE = '28px minmax(96px, 1.6fr) 40px 34px 30px 30px 30px';
const GRID_COLS_SERIES_NO_ANT_MOBILE = '28px 40px 40px 32px 32px 32px';
const GRID_COLS_SERIES_WITH_ANT_DESKTOP = '36px minmax(110px, 1.5fr) 48px 48px 44px 44px 36px';
const GRID_COLS_SERIES_NO_ANT_DESKTOP = '36px 48px 48px 44px 44px 36px';
const GRID_COLS_HISTORICO = '28px minmax(96px, 1.3fr) 52px 40px 32px 32px';
const SERIES_GRID_GAP = '8px';
/** Espaço extra só na coluna Ant. (não mexe no SET) */
const ANT_COL_PAD_LEFT = 14;

function getSeriesGridCols(showAnterior: boolean, isDesktop: boolean): string {
  if (showAnterior) {
    return isDesktop ? GRID_COLS_SERIES_WITH_ANT_DESKTOP : GRID_COLS_SERIES_WITH_ANT_MOBILE;
  }
  return isDesktop ? GRID_COLS_SERIES_NO_ANT_DESKTOP : GRID_COLS_SERIES_NO_ANT_MOBILE;
}

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
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="55%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#7e22ce" />
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

function calcVolume(exercicios: ExercicioState[]): number {
  return exercicios.reduce((acc, ex) =>
    acc + ex.series.reduce((sAcc, s) => {
      if (!s.completado || s.peso_atual <= 0) return sAcc;
      const r = typeof s.reps === 'string' ? parseFloat(s.reps) || 0 : s.reps;
      return sAcc + s.peso_atual * r;
    }, 0), 0);
}

function calcSetsCompletos(exercicios: ExercicioState[]): number {
  return exercicios.reduce((acc, ex) => acc + ex.series.filter(s => s.completado).length, 0);
}

function calcTotalSets(exercicios: ExercicioState[]): number {
  return exercicios.reduce((acc, ex) => acc + ex.series.length, 0);
}

// ─── SetRow ───────────────────────────────────────────────────────────────────

interface SetRowProps {
  serie: SerieState;
  idx: number;
  treinoIniciado: boolean;
  showAnteriorCol: boolean;
  gridCols: string;
  isDesktop?: boolean;
  onPesoChange: (peso: number) => void;
  onCheck: () => void;
}

function SetRow({ serie, idx, treinoIniciado, showAnteriorCol, gridCols, isDesktop = false, onPesoChange, onCheck }: SetRowProps) {
  return (
    <div
      className={cn(
        'grid items-center',
        isDesktop ? 'py-2.5 min-h-10' : 'py-2.5'
      )}
      style={{
        gridTemplateColumns: gridCols,
        columnGap: SERIES_GRID_GAP,
        borderTop: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex justify-center">
        <span
          className="rounded-md flex items-center justify-center text-[11px] font-semibold font-kpi shrink-0"
          style={{
            width: 22,
            height: 22,
            minWidth: 22,
            ...(serie.completado
              ? { background: '#39c75a', color: '#fff' }
              : { background: '#ebebf0', color: '#888' }),
          }}
        >
          {idx + 1}
        </span>
      </div>

      {showAnteriorCol && (
        <div className="min-w-0 overflow-hidden" style={{ paddingLeft: ANT_COL_PAD_LEFT }}>
          <p
            className={cn(
              'text-[11px] font-kpi tabular-nums lining-nums truncate',
              serie.completado && 'line-through'
            )}
            style={{ color: serie.completado ? '#bbb' : '#888' }}
            title={serie.anterior || '—'}
          >
            {serie.anterior || '—'}
          </p>
        </div>
      )}

      <div className="flex justify-center min-w-0">
        <input
          type="number"
          inputMode="decimal"
          value={serie.peso_atual || ''}
          onChange={(e) => onPesoChange(parseFloat(e.target.value) || 0)}
          disabled={!treinoIniciado}
          placeholder="0"
          className="w-full max-w-[40px] bg-transparent border-0 text-center font-kpi tabular-nums lining-nums focus:outline-none disabled:opacity-50"
          style={{
            height: 28,
            fontSize: '15px',
            color: '#666',
            fontFamily: 'var(--font-kpi), "DM Sans", system-ui, sans-serif',
            fontVariantNumeric: 'tabular-nums lining-nums',
            fontWeight: 400,
            borderBottom: '1.5px solid transparent',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderBottomColor = 'rgba(147,51,234,0.45)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderBottomColor = 'transparent';
          }}
        />
      </div>

      <div className="flex justify-center">
        <span
          className="text-[13px] font-semibold font-kpi tabular-nums lining-nums"
          style={{ color: serie.completado ? '#39c75a' : '#1a1a1a' }}
        >
          {serie.reps}
        </span>
      </div>

      <div className="flex justify-center">
        <span className="text-[11px] font-medium leading-tight text-center" style={{ color: '#888' }}>
          {duasLetrasTenica(serie.tecnica) || '—'}
        </span>
      </div>

      <div className="flex justify-center">
        <span className="text-[11px] font-medium text-brand leading-tight text-center">
          {abreviarTecnica(serie.tecnica_extra) || '—'}
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
              ? { background: '#9333ea', border: '1.5px solid #9333ea', color: '#fff' }
              : { background: 'transparent', border: '1.5px solid rgba(0,0,0,0.2)', color: '#888' }),
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
  onPesoChange: (ordem: number, peso: number) => void;
  onCheck: (ordem: number) => void;
  onVideoOpen: (url: string) => void;
}

function ExercicioCard({ exercicio, treinoIniciado, showAnteriorCol, isDesktop = false, onPesoChange, onCheck, onVideoOpen }: ExercicioCardProps) {
  const completadas = exercicio.series.filter(s => s.completado).length;
  const total = exercicio.series.length;
  const all = completadas === total;
  const gridCols = getSeriesGridCols(showAnteriorCol, isDesktop);

  return (
    <div
      className={cn(
        'rounded-[14px] transition-colors overflow-hidden px-4 py-3.5 mb-0',
        all && treinoIniciado && 'ring-1 ring-success-border/40'
      )}
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div className="flex items-start gap-2 pb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-bold leading-snug" style={{ color: '#1a1a1a' }}>
            {toTitleCase(exercicio.nome)}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <Clock size={12} className="shrink-0" style={{ color: '#aaa' }} />
            <p className="text-[11px] font-medium" style={{ color: '#aaa' }}>
              Descanso: {formatDuration(exercicio.descanso)}
            </p>
          </div>
        </div>
        {exercicio.video_url && (
          <button
            type="button"
            onClick={() => onVideoOpen(exercicio.video_url!)}
            className="flex items-center justify-center shrink-0 p-1 -mr-0.5 active:opacity-70 transition-opacity"
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
          className="mb-3 px-2.5 py-2 rounded-lg"
          style={{ background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: '#888' }}>
            Observações
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: '#555' }}>{exercicio.observacoes}</p>
        </div>
      )}

      <div className="pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div
          className="grid items-center py-2 mb-0.5"
          style={{ gridTemplateColumns: gridCols, columnGap: SERIES_GRID_GAP }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-center" style={{ color: '#bbb' }}>Set</span>
          {showAnteriorCol && (
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.05em]"
              style={{ color: '#bbb', paddingLeft: ANT_COL_PAD_LEFT }}
            >
              Ant.
            </span>
          )}
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-center" style={{ color: '#bbb' }}>Peso</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-center" style={{ color: '#bbb' }}>Reps</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-center" style={{ color: '#bbb' }}>T1</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-center" style={{ color: '#bbb' }}>T2</span>
          <span className="text-[10px] text-center" style={{ color: '#bbb' }}>✓</span>
        </div>

        <div>
          {exercicio.series.map((serie, idx) => (
            <SetRow
              key={serie.ordem}
              serie={serie}
              idx={idx}
              treinoIniciado={treinoIniciado}
              showAnteriorCol={showAnteriorCol}
              gridCols={gridCols}
              isDesktop={isDesktop}
              onPesoChange={(peso) => onPesoChange(serie.ordem, peso)}
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
  const [volumeHistory, setVolumeHistory] = useState<VolumePoint[]>([]);
  const [showConfirmAbandon, setShowConfirmAbandon] = useState(false);
  const [coachUsername, setCoachUsername] = useState('@auronfit');
  const [prsCount, setPrsCount] = useState(0);

  // Timer principal
  const [treinoIniciado, setTreinoIniciado] = useState(false);
  const [timerStartAt, setTimerStartAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Rest timer (bottom bar)
  const [restActive, setRestActive] = useState(false);
  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restExpired, setRestExpired] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  const restPendingCb = useRef<(() => void) | null>(null);

  // Modal de execução (por bloco)
  const [modalBlockIdx, setModalBlockIdx] = useState<number | null>(null);
  const [modalRodadaIdx, setModalRodadaIdx] = useState(0);
  const [bisetFase, setBisetFase] = useState<'a' | 'b' | 'transicao' | null>(null);
  const [bisetTransitionName, setBisetTransitionName] = useState<string | null>(null);
  const [restTimerMeta, setRestTimerMeta] = useState<{ title?: string; subtitle?: string; subtitleHighlight?: string }>({});
  const [modalCarga, setModalCarga] = useState(0);
  const [modalCargaStr, setModalCargaStr] = useState('');
  const [showSeriesHistory, setShowSeriesHistory] = useState(true);

  const [techniqueCardExpanded, setTechniqueCardExpanded] = useState(false);

  useEffect(() => {
    if (modalBlockIdx !== null) {
      setShowSeriesHistory(true);
      setTechniqueCardExpanded(false);
    }
  }, [modalBlockIdx]);

  // Termômetro de treino — feedback após finalização
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSatisfacao, setFeedbackSatisfacao] = useState('');
  const [feedbackDor, setFeedbackDor] = useState(5);
  const [savedTimestamp, setSavedTimestamp] = useState<string | null>(null);

  // Vídeo
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [demoImg, setDemoImg] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

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

  const loadFicha = async () => {
    setLoading(true);
    try {
      const session = await getSafeSession();
      const uid = session?.user?.id;
      if (!uid) { router.push('/login'); return; }
      setUserId(uid);

      // Ficha + histórico da ficha em paralelo (histórico só depende de fichaId/uid).
      // Importante: data_conclusao DESC — ASC + limit cortava as sessões mais recentes.
      const [
        { data: fichaData, error: fichaError },
        { data: historicoData },
      ] = await Promise.all([
        supabaseClient
          .from('fichas_treino')
          .select('nome_rotina, configuracao')
          .eq('id', fichaId)
          .eq('aluno_id', uid)
          .eq('ativo', true)
          .single(),
        supabaseClient
          .from('historico_treinos')
          .select('data_conclusao, dados_sessao, exercicio_id')
          .eq('ficha_id', fichaId)
          .eq('aluno_id', uid)
          .order('data_conclusao', { ascending: false })
          .limit(200),
      ]);

      if (fichaError || !fichaData) { router.push('/aluno/treinos'); return; }

      const config = fichaData.configuracao as { exercicios?: ExercicioConfig[] };
      const exerciciosConfig: ExercicioConfig[] = config?.exercicios || [];
      setNomeRotina(fichaData.nome_rotina);

      const exercicioIds = collectBibliotecaIds(exerciciosConfig);

      // Biblioteca + última sessão por exercício (cargas "Anterior") em paralelo
      const [{ data: bibData }, { data: historicoPorExercicio }] = await Promise.all([
        exercicioIds.length > 0
          ? supabaseClient
              .from('exercicios_biblioteca')
              .select('id, grupo_muscular, gif_url, video_url')
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
      ]);

      const gruposMusculares: Record<string, string> = Object.fromEntries(
        (bibData || []).map(ex => [ex.id, ex.grupo_muscular || ''])
      );
      const gifsExercicios: Record<string, string> = Object.fromEntries(
        (bibData || []).map(ex => [ex.id, ex.gif_url || ''])
      );
      const videosBiblioteca: Record<string, string> = Object.fromEntries(
        (bibData || []).map(ex => [ex.id, ex.video_url || ''])
      );

      // Montar gráfico de volume: agrupar por dia (ordem cronológica)
      const volumePorDia: Record<string, number> = {};
      for (const h of (historicoData || [])) {
        const dia = h.data_conclusao?.slice(0, 10) || '';
        const sessao = h.dados_sessao as any;
        const vol = (sessao?.series || []).reduce((acc: number, s: any) => {
          if (!s.completado) return acc;
          const r = parseFloat(String(s.reps)) || 0;
          return acc + (s.peso_atual || 0) * r;
        }, 0);
        volumePorDia[dia] = (volumePorDia[dia] || 0) + vol;
      }
      const volumePoints = Object.entries(volumePorDia)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([data, volume]) => ({
          data: new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          volume,
        }));
      setVolumeHistory(volumePoints);

      // Última sessão por exercício (qualquer ficha) — rows já vêm DESC
      const ultimoPorExercicio: Record<string, any> = {};
      for (const h of (historicoPorExercicio || historicoData || [])) {
        if (!h.exercicio_id || ultimoPorExercicio[h.exercicio_id]) continue;
        ultimoPorExercicio[h.exercicio_id] = h;
      }

      const blocksState = buildWorkoutBlocksFromConfig(exerciciosConfig, {
        gruposMusculares,
        gifs: gifsExercicios,
        videos: videosBiblioteca,
        ultimoPorExercicio,
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
      // busca em background, sem segurar o loader
      if (uid) {
        void (async () => {
          const { data: coachData } = await supabaseClient
            .from('coach_alunos')
            .select('coach_id')
            .eq('aluno_id', uid)
            .single();

          if (!coachData?.coach_id) return;

          const [{ data: publicProfile }, { data: profileData }] = await Promise.all([
            supabaseClient
              .from('coach_public_profiles')
              .select('handle')
              .eq('coach_id', coachData.coach_id)
              .maybeSingle(),
            supabaseClient
              .from('profiles')
              .select('coaching_reference, full_name')
              .eq('id', coachData.coach_id)
              .single(),
          ]);

          setCoachUsername(
            resolveCoachShareHandle(
              publicProfile?.handle || profileData?.coaching_reference,
              profileData?.full_name,
            ),
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

  // ── Rest timer ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!restActive || !restEndAt) return;
    const tick = () => {
      const r = Math.max(0, Math.ceil((restEndAt - Date.now()) / 1000));
      setRestRemaining(r);
      if (r <= 0) setRestExpired(true);
    };
    tick();
    const id = setInterval(tick, 250);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, [restActive, restEndAt]);

  function iniciarRest(
    durationSecs: number,
    onDone: () => void,
    meta?: { title?: string; subtitle?: string; subtitleHighlight?: string }
  ) {
    setRestTimerMeta(meta || {});
    const endAt = Date.now() + durationSecs * 1000;
    restPendingCb.current = onDone;
    setRestDuration(durationSecs);
    setRestEndAt(endAt);
    setRestRemaining(durationSecs);
    setRestExpired(false);
    setRestActive(true);
  }

  function restAddSecs(secs: number) {
    haptic('light');
    const novoEnd = (restEndAt || Date.now()) + secs * 1000;
    setRestEndAt(novoEnd);
    setRestExpired(false);
  }

  function restSkip() {
    haptic('light');
    setRestActive(false);
    setRestEndAt(null);
    const cb = restPendingCb.current;
    restPendingCb.current = null;
    cb?.();
  }

  function restAdvance() {
    haptic('success');
    setRestActive(false);
    setRestEndAt(null);
    const cb = restPendingCb.current;
    restPendingCb.current = null;
    cb?.();
  }

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
      rodadaIdx = prox >= 0 ? prox : 0;
      const carga = block.exercise.series[rodadaIdx]?.peso_atual || 0;
      setModalBlockIdx(blockIdx);
      setModalRodadaIdx(rodadaIdx);
      setBisetFase(null);
      setModalCarga(carga);
      setModalCargaStr(carga > 0 ? String(carga) : '');
    } else {
      rodadaIdx = firstIncompleteRodada(block);
      const aDone = block.exercicioA.series[rodadaIdx]?.completado;
      fase = aDone ? 'b' : 'a';
      const ex = fase === 'a' ? block.exercicioA : block.exercicioB;
      const carga = ex.series[rodadaIdx]?.peso_atual || 0;
      setModalBlockIdx(blockIdx);
      setModalRodadaIdx(rodadaIdx);
      setBisetFase(fase);
      setModalCarga(carga);
      setModalCargaStr(carga > 0 ? String(carga) : '');
    }
  }

  const handlePesoChange = useCallback((exercicioId: string, serieOrdem: number, peso: number) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.kind === 'simples') {
          if (block.exercise.id !== exercicioId) return block;
          return {
            ...block,
            exercise: {
              ...block.exercise,
              series: block.exercise.series.map((s) =>
                s.ordem !== serieOrdem ? s : { ...s, peso_atual: peso }
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
                s.ordem !== serieOrdem ? s : { ...s, peso_atual: peso }
              ),
            },
          };
        };
        const updatedA = updateHalf('exercicioA');
        if (updatedA !== block) return updatedA;
        return updateHalf('exercicioB');
      })
    );
  }, []);

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

  function concluirSerieModal() {
    if (modalBlockIdx === null) return;
    const block = blocks[modalBlockIdx];
    if (!block) return;

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
              j !== modalRodadaIdx ? s : { ...s, peso_atual: modalCarga, completado: true }
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
          setModalBlockIdx(null);
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
              j !== modalRodadaIdx ? s : { ...s, peso_atual: modalCarga, completado: true }
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
              j !== modalRodadaIdx ? s : { ...s, peso_atual: modalCarga, completado: true }
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
        setRestTimerMeta({
          title: 'Descanso do Bi-Set',
          subtitle: nextBlockLabel ? `Próximo exercício: ${nextBlockLabel}` : undefined,
          subtitleHighlight: 'Bi-Set concluído ✓',
        });
        iniciarRest(descanso, () => {
          if (isUltimoBloco) setModalBlockIdx(null);
          else abrirModalBlock(modalBlockIdx + 1);
        });
      } else {
        const proxRodada = modalRodadaIdx + 1;
        setRestTimerMeta({
          title: 'Descanso do Bi-Set',
          subtitle: `Próxima rodada: ${bisetBlock.exercicioA.nome} · série ${proxRodada + 1}/${totalRodadas}`,
        });
        iniciarRest(descanso, () => {
          const carga = bisetBlock.exercicioA.series[proxRodada]?.peso_atual || 0;
          setModalRodadaIdx(proxRodada);
          setBisetFase('a');
          setModalCarga(carga);
          setModalCargaStr(carga > 0 ? String(carga) : '');
        });
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
          series: ex.series.map(s => ({
            ordem: s.ordem,
            reps: s.reps,
            tecnica: s.tecnica ?? null,
            tecnica_extra: s.tecnica_extra ?? null,
            peso_atual: s.peso_atual,
            completado: s.completado,
            anterior: s.anterior || '—',
          })),
          data_sessao: agora,
          satisfacao_treino: feedbackSatisfacao || null,
          nivel_dor: feedbackDor,
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

      // Atualizar o ultimo_checkin no perfil do aluno
      try {
        await supabaseClient
          .from('profiles')
          .update({ ultimo_checkin: new Date().toISOString() })
          .eq('id', userId);
      } catch (profileErr) {
        console.error('Erro ao atualizar ultimo_checkin:', profileErr);
      }

      // Contar PRs batidos hoje
      const hoje = new Date().toISOString().split('T')[0];
      const { data: prsData } = await supabaseClient
        .from('recordes_pessoais')
        .select('id', { count: 'exact', head: true })
        .eq('aluno_id', userId)
        .gte('conquistado_em', `${hoje}T00:00:00`)
        .lte('conquistado_em', `${hoje}T23:59:59`);

      setPrsCount(prsData?.length || 0);

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
    setBlocks([]);
    setElapsed(0);
    setTimerStartAt(null);
    setModalBlockIdx(null);
    setRestActive(false);
    setShowConfirmAbandon(false);
    haptic('light');
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f5f7' }}>
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

  const hasHistorico = exercicios.some((ex) =>
    ex.series.some((s) => s.anterior && s.anterior !== '—')
  );
  const sessionsCompleted = volumeHistory.length;

  return (
    <div
      className={cn('min-h-screen', treinoIniciado ? 'pb-4' : 'pb-28')}
      style={{ background: '#f5f5f7' }}
    >

      {/* ── Header sticky (mobile + treino em andamento) ── */}
      <header
        className={cn(
          'sticky top-0 z-40 backdrop-blur-sm',
          !treinoIniciado && 'lg:hidden'
        )}
        style={{
          background: 'rgba(245,245,247,0.95)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3 max-w-[1100px] mx-auto">
          <Link
            href="/aluno/treinos"
            className="w-11 h-11 flex items-center justify-center transition-colors shrink-0"
            style={{ color: '#555' }}
            aria-label="Voltar para Minhas Rotinas"
          >
            <ArrowLeft size={20} />
          </Link>

          <div className="flex-1 min-w-0">
            <h1
              className="font-bold uppercase tracking-wide truncate"
              style={{ color: '#1a1a1a', fontSize: '16px' }}
            >
              {nomeRotina}
            </h1>
            {treinoIniciado ? (
              <p className="mt-0.5" style={{ color: '#888', fontSize: '12px' }}>
                {setsCompletos}/{totalSets} sets
              </p>
            ) : (
              <p className="mt-0.5" style={{ color: '#888', fontSize: '12px' }}>
                {blockCount} blocos · Est. {estimateDurationMinFromBlocks(blocks)} min
              </p>
            )}
          </div>

          {treinoIniciado && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfirmAbandon(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
                style={{
                  background: '#ebebf0',
                  border: '1px solid rgba(0,0,0,0.08)',
                  color: '#555',
                }}
                title="Descartar treino"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="text-right">
                <p
                  className="font-mono tabular-nums lining-nums text-sm font-bold leading-none"
                  style={{ color: '#9333ea' }}
                >
                  {formatDuration(elapsed)}
                </p>
                <p className="text-2xs" style={{ color: '#888' }}>{formatVolume(volume)}</p>
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
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <Link
                  href="/aluno/treinos"
                  className="inline-flex items-center gap-1.5 text-xs transition-colors mb-4"
                  style={{ color: '#555' }}
                >
                  <ArrowLeft size={16} />
                  Minhas Rotinas
                </Link>
                <h1 className="text-xl font-bold uppercase tracking-wide" style={{ color: '#1a1a1a' }}>
                  {nomeRotina}
                </h1>
                <p className="text-[13px] mt-1" style={{ color: '#888' }}>
                  {blockCount} blocos · Est. {estimateDurationMinFromBlocks(blocks)} min
                </p>
                <VolumeProgressDots sessionsCompleted={sessionsCompleted} className="mt-5" />
                <button
                  type="button"
                  onClick={iniciarTreino}
                  className="w-full min-h-14 mt-5 rounded-xl font-bold text-[15px] text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 px-5 py-3.5"
                  style={{
                    background: 'linear-gradient(135deg, #c084fc 0%, #9333ea 55%, #7e22ce 100%)',
                    boxShadow: '0 4px 16px rgba(147,51,234,0.40)',
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
                    background: 'linear-gradient(135deg, #c084fc 0%, #9333ea 55%, #7e22ce 100%)',
                    boxShadow: '0 4px 16px rgba(147,51,234,0.40)',
                  }}
                >
                  <Lightning size={18} weight="fill" />
                  <span className="flex-1 text-center">Iniciar treino</span>
                  <CaretRight size={16} className="text-white/50" />
                </button>
                <VolumeProgressDots sessionsCompleted={sessionsCompleted} />
              </div>
            )}

            {/* Header da coluna de exercícios — desktop */}
            {!treinoIniciado && (
              <div
                className="hidden lg:flex sticky top-0 z-10 py-3 items-center justify-between"
                style={{
                  background: 'rgba(245,245,247,0.95)',
                  borderBottom: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                <div className="flex items-center gap-2">
                  <ArrowLeft size={18} style={{ color: '#555' }} />
                  <span className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Exercícios</span>
                </div>
                <span className="text-xs" style={{ color: '#888' }}>{blockCount} blocos</span>
              </div>
            )}

            {treinoIniciado && (
              <div className="flex items-center gap-2 px-3 py-2 bg-success-subtle border border-success-border rounded-lg">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
                <p className="text-xs text-success font-medium flex-1">Treino em andamento</p>
                <button
                  type="button"
                  onClick={() => {
                    const idx = blocks.findIndex((b) => !isBlockComplete(b));
                    abrirModalBlock(idx >= 0 ? idx : 0);
                  }}
                  className="text-[10px] font-semibold text-brand hover:underline"
                >
                  Retomar →
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {blocks.map((block, index) => (
                <div
                  key={block.kind === 'simples' ? block.exercise.id : block.id}
                  className={index > 0 ? 'pt-2.5' : undefined}
                  style={index > 0 ? { borderTop: '1px dashed rgba(0,0,0,0.08)' } : undefined}
                >
                  {block.kind === 'simples' ? (
                    <ExercicioCard
                      exercicio={block.exercise}
                      treinoIniciado={treinoIniciado}
                      showAnteriorCol={hasHistorico}
                      isDesktop={isDesktop}
                      onPesoChange={(ordem, peso) => handlePesoChange(block.exercise.id, ordem, peso)}
                      onCheck={(ordem) => handleCheck(block.exercise.id, ordem)}
                      onVideoOpen={setVideoUrl}
                    />
                  ) : (
                    <BiSetGroupPreviewCard
                      block={block}
                      blockIdx={index}
                      treinoIniciado={treinoIniciado}
                      showAnteriorCol={hasHistorico}
                      gridCols={getSeriesGridCols(hasHistorico, isDesktop)}
                      onPesoChangeA={(ordem, peso) => handlePesoChange(block.exercicioA.id, ordem, peso)}
                      onPesoChangeB={(ordem, peso) => handlePesoChange(block.exercicioB.id, ordem, peso)}
                      onCheckA={(ordem) => handleCheck(block.exercicioA.id, ordem)}
                      onCheckB={(ordem) => handleCheck(block.exercicioB.id, ordem)}
                      onVideoOpen={setVideoUrl}
                    />
                  )}
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>

      {/* ── Rest Timer: bottom bar (só quando o modal de exercício está fechado) ── */}
      {restActive && modalBlockIdx === null && (
        <div className="fixed bottom-0 left-0 right-0 z-40 shadow-[0_-8px_32px_rgba(0,0,0,0.08)]"
          style={{ background: '#ffffff', borderTop: '1px solid rgba(0,0,0,0.08)' }}
        >
          <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center gap-2">
            <button
              onClick={() => restAddSecs(-15)}
              className="w-12 h-10 rounded-xl text-xs font-bold transition-colors flex-shrink-0"
              style={{ background: '#ebebf0', color: '#555', border: '1px solid rgba(0,0,0,0.08)' }}
            >
              −15
            </button>

            <div className="flex-1 text-center">
              {restExpired ? (
                <button
                  onClick={restAdvance}
                  className="w-full py-2 bg-success text-white rounded-xl text-sm font-bold"
                >
                  Pronto! →
                </button>
              ) : (
                <p className="font-mono text-3xl font-bold tabular-nums lining-nums tracking-display" style={{ color: '#1a1a1a' }}>
                  {Math.floor(restRemaining / 60).toString().padStart(2, '0')}:{(restRemaining % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>

            <button
              onClick={() => restAddSecs(15)}
              className="w-12 h-10 rounded-xl text-xs font-bold transition-colors flex-shrink-0"
              style={{ background: '#ebebf0', color: '#555', border: '1px solid rgba(0,0,0,0.08)' }}
            >
              +15
            </button>

            <button
              onClick={restSkip}
              className="h-10 px-3.5 bg-brand text-text-on-brand rounded-xl text-xs font-bold shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity flex-shrink-0"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* ── Modal de Termômetro de Treino (Feedback) ── */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm">
          <div className="w-full bg-surface-1 border-t border-divider rounded-t-2xl p-5 pb-safe-bottom" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
            {/* Aviso se treino incompleto */}
            {setsCompletos < totalSets && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-warning-subtle border border-warning-border rounded-lg">
                <Clock className="w-4 h-4 text-warning shrink-0" />
                <p className="text-xs text-warning font-medium">
                  {totalSets - setsCompletos} série{totalSets - setsCompletos > 1 ? 's' : ''} não concluída{totalSets - setsCompletos > 1 ? 's' : ''}
                </p>
              </div>
            )}

            <h3 className="text-sm font-bold text-text-primary mb-4">Como foi o treino?</h3>

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
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Nível de Dor / Desconforto</p>
                <span className="text-xs font-bold text-text-primary">{feedbackDor}/10</span>
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
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4">
              <X className="w-7 h-7 text-destructive" />
            </div>
            <h3 className="text-lg font-bold text-text-primary text-center mb-2">Descartar Treino?</h3>
            <p className="text-sm text-text-secondary text-center mb-6 leading-relaxed">
              Seu progresso não será salvo. {setsCompletos} de {totalSets} séries serão perdidas.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={descartarTreino}
                className="w-full h-11 bg-destructive text-white rounded-xl text-xs font-semibold shadow-sm shadow-destructive/30 hover:opacity-90"
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
          style={{ background: '#f5f5f7' }}
        >
          {restActive && (
            <RestTimerOverlay
              remaining={restRemaining}
              total={restDuration}
              expired={restExpired}
              isDesktop={isDesktop}
              title={restTimerMeta.title}
              subtitle={restTimerMeta.subtitle}
              subtitleHighlight={restTimerMeta.subtitleHighlight}
              onAddSeconds={restAddSecs}
              onSkip={restSkip}
              onAdvance={restAdvance}
            />
          )}

          {bisetTransitionName && (
            <div
              className="absolute inset-0 z-[55] flex flex-col items-center justify-center animate-in fade-in duration-300"
              style={{ background: '#f5f5f7' }}
            >
              <p className="text-brand text-2xl font-bold">↓</p>
              <p className="text-xl font-bold mt-1" style={{ color: '#1a1a1a' }}>{bisetTransitionName}</p>
              <p className="text-xs mt-1" style={{ color: '#888' }}>agora</p>
            </div>
          )}

          <div className="w-full h-0.5 flex-shrink-0" style={{ background: '#ebebf0' }}>
            <div
              className="h-full bg-brand transition-all duration-300"
              style={{ width: `${((modalRodadaIdx + 1) / modalTotalRodadas) * 100}%` }}
            />
          </div>

          <header
            className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 flex-shrink-0 pt-safe-top"
            style={{
              background: 'rgba(245,245,247,0.95)',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <button
              type="button"
              onClick={() => setModalBlockIdx(null)}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0"
              style={{ background: '#ebebf0', color: '#555' }}
              aria-label="Fechar execução"
            >
              <X size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold leading-tight truncate" style={{ color: '#1a1a1a' }}>
                {toTitleCase(modalEx.nome)}
                {modalIsBiSet && (
                  <span className="ml-1.5 inline-block text-[10px] font-bold uppercase text-brand bg-brand/10 rounded px-1.5 py-0.5 align-middle">
                    BI-SET {bisetFase === 'b' ? 'B/B' : 'A/B'}
                  </span>
                )}
              </h2>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs tabular-nums lining-nums" style={{ color: '#888' }}>
                Ex. {(modalBlockIdx ?? 0) + 1}/{blockCount}
                {modalIsBiSet
                  ? ` · Rodada ${modalRodadaIdx + 1}/${modalTotalRodadas} · A→B`
                  : ` · Série ${modalRodadaIdx + 1}/${modalTotalRodadas}`}
              </p>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto pb-36">
            {modalIsBiSet && modalPartnerEx && bisetFase === 'a' && (
              <div
                className="mx-4 mt-3 px-3.5 py-2.5 rounded-lg border-l-[3px] border-brand"
                style={{ background: '#faf5ff' }}
              >
                <p className="text-xs" style={{ color: '#555' }}>
                  ↓ Em seguida: {modalPartnerEx.nome} · {modalPartnerEx.series[modalRodadaIdx]?.reps} reps
                  {modalPartnerEx.series[modalRodadaIdx]?.peso_atual
                    ? ` · ${modalPartnerEx.series[modalRodadaIdx]?.peso_atual} kg`
                    : ''}
                </p>
              </div>
            )}

            {modalIsBiSet && bisetFase === 'b' && modalBlock?.kind === 'biset' && (
              <div
                className="mx-4 mt-3 px-3.5 py-2.5 rounded-lg border-l-[3px] border-brand"
                style={{ background: '#faf5ff' }}
              >
                <p className="text-xs" style={{ color: '#555' }}>
                  ⊙ Após esta série: {formatRestTime(modalBlock.descanso)} de descanso
                  {modalRodadaIdx < modalTotalRodadas - 1 ? ', depois repete' : ''}
                </p>
              </div>
            )}
            {/* GIF de demonstração (vídeo fica após o histórico) */}
            {modalEx.gif_url && !modalEx.video_url && (
              <div className="px-4 mt-4 mb-4">
                <button
                  onClick={() => setDemoImg(modalEx.gif_url!)}
                  className="w-full h-11 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.08)',
                    color: '#555',
                  }}
                >
                  <Play className="w-4 h-4" fill="currentColor" />
                  Ver demonstração
                </button>
              </div>
            )}

            {/* 3 cards de contexto: REPETIÇÕES / ÚLTIMA VEZ / TÉCNICA */}
            <div className="mt-4 grid grid-cols-3 gap-2 px-4 mb-4">
              <div
                className="rounded-[12px] px-3.5 py-3 lg:px-5 lg:py-4 flex flex-col items-center"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <span
                  className="text-[9px] lg:text-[10px] font-semibold uppercase tracking-[0.15em] mb-1"
                  style={{ color: '#aaa' }}
                >
                  Repetições
                </span>
                <span
                  className="text-[28px] lg:text-4xl font-extrabold font-kpi tabular-nums lining-nums leading-none"
                  style={{ color: '#1a1a1a', letterSpacing: 'var(--tracking-display, -0.02em)' }}
                >
                  {modalSerie.reps}
                </span>
              </div>

              <div
                className="rounded-[12px] px-3.5 py-3 lg:px-5 lg:py-4 flex flex-col items-center justify-center"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <span
                  className="text-[9px] lg:text-[10px] font-semibold uppercase tracking-[0.15em] mb-1"
                  style={{ color: '#aaa' }}
                >
                  Última vez
                </span>
                <span
                  className={cn(
                    "text-center leading-tight font-kpi tabular-nums lining-nums",
                    modalSerie.anterior
                      ? "text-sm lg:text-base font-bold"
                      : "text-[28px] lg:text-4xl font-extrabold"
                  )}
                  style={{ color: modalSerie.anterior ? '#1a1a1a' : '#bbb' }}
                >
                  {modalSerie.anterior || "—"}
                </span>
              </div>

              {(() => {
                const hasTecnica = !!(modalSerie.tecnica?.trim() || modalSerie.tecnica_extra?.trim());
                const tecnicaLabel = modalSerie.tecnica_extra || modalSerie.tecnica || "";
                const isLongLabel = tecnicaLabel.length > 8 || tecnicaLabel.includes(" ");
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (hasTecnica) setTechniqueCardExpanded((v) => !v);
                    }}
                    disabled={!hasTecnica}
                    className={cn(
                      "rounded-[12px] px-3.5 py-3 lg:px-5 lg:py-4 flex flex-col items-center relative transition-colors",
                      hasTecnica ? "cursor-pointer" : "cursor-default"
                    )}
                    style={{
                      background: '#ffffff',
                      border: '1px solid rgba(0,0,0,0.08)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <span
                      className="text-[9px] lg:text-[10px] font-semibold uppercase tracking-[0.15em] mb-1 flex items-center gap-1"
                      style={{ color: '#aaa' }}
                    >
                      Técnica
                      {hasTecnica && <Info size={12} style={{ color: '#aaa' }} aria-hidden />}
                    </span>
                    <span
                      className={cn(
                        "text-center leading-tight truncate w-full",
                        !hasTecnica
                          ? "text-[28px] lg:text-4xl font-extrabold"
                          : isLongLabel
                            ? "text-base font-bold text-brand"
                            : "text-[28px] lg:text-4xl font-extrabold"
                      )}
                      style={!hasTecnica || !isLongLabel ? { color: hasTecnica ? '#1a1a1a' : '#bbb' } : undefined}
                    >
                      {tecnicaLabel || "—"}
                    </span>
                  </button>
                );
              })()}
            </div>

            <StudentTechniqueCard
              className="mx-4 mb-4"
              techniqueValue={modalSerie.tecnica}
              extraValue={modalSerie.tecnica_extra}
              expanded={techniqueCardExpanded}
              onExpandedChange={setTechniqueCardExpanded}
            />

            {/* Campo de CARGA */}
            <div className="mx-4 mt-4">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-3"
                style={{ color: '#888' }}
              >
                Carga (kg)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newVal = Math.max(0, modalCarga - 2.5);
                    setModalCarga(newVal);
                    setModalCargaStr(String(newVal));
                  }}
                  className="w-11 h-11 rounded-[10px] flex items-center justify-center text-xl font-bold transition-colors active:scale-95 shrink-0"
                  style={{ background: '#ebebf0', color: '#555' }}
                  aria-label="Diminuir carga"
                >
                  <Minus size={18} weight="bold" />
                </button>

                <div
                  className="flex-1 h-12 rounded-[12px] flex items-center justify-center"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.10)',
                  }}
                >
                  <input
                    type="text"
                    inputMode="decimal"
                    value={modalCargaStr}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                        setModalCargaStr(raw);
                        const num = parseFloat(raw);
                        setModalCarga(isNaN(num) ? 0 : num);
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-transparent border-0 text-center font-black font-kpi tabular-nums lining-nums focus:outline-none"
                    style={{
                      color: '#1a1a1a',
                      fontSize: '24px',
                      letterSpacing: '-0.02em',
                      fontFamily: 'var(--font-kpi), "DM Sans", system-ui, sans-serif',
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newVal = modalCarga + 2.5;
                    setModalCarga(newVal);
                    setModalCargaStr(String(newVal));
                  }}
                  className="w-11 h-11 rounded-[10px] flex items-center justify-center text-xl font-bold text-white transition-colors active:scale-95 shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #c084fc, #9333ea, #7e22ce)',
                    boxShadow: '0 2px 8px rgba(147,51,234,0.35)',
                  }}
                  aria-label="Aumentar carga"
                >
                  <Plus size={18} weight="bold" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-2.5">
                {['-5', '-2.5', '+2.5', '+5'].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => {
                      const val = parseFloat(inc);
                      const newVal = Math.max(0, modalCarga + val);
                      setModalCarga(newVal);
                      setModalCargaStr(String(newVal));
                    }}
                    className="min-h-11 rounded-[8px] text-[13px] font-semibold tabular-nums lining-nums transition-colors active:scale-95"
                    style={{ background: '#ebebf0', color: '#555' }}
                  >
                    {inc}
                  </button>
                ))}
              </div>
            </div>

            {/* Histórico de séries */}
            <div className="mx-4 mt-4">
              <button
                type="button"
                onClick={() => setShowSeriesHistory(v => !v)}
                className="w-full flex items-center justify-between py-2 min-h-11"
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: '#888' }}
                >
                  Histórico de Séries
                </p>
                <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: '#9333ea' }}>
                  {showSeriesHistory ? "Ocultar" : "Mostrar"}
                  <CaretDown
                    size={14}
                    className={cn("transition-transform duration-200", showSeriesHistory && "rotate-180")}
                    aria-hidden
                  />
                </span>
              </button>
              {showSeriesHistory && (
                <div
                  className="rounded-[12px] overflow-hidden p-0"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  {modalIsBiSet && modalBlock?.kind === 'biset' ? (
                    <div className="p-3 space-y-3">
                      {modalBlock.exercicioA.series.map((_, rodadaIdx) => {
                        const aSerie = modalBlock.exercicioA.series[rodadaIdx];
                        const bSerie = modalBlock.exercicioB.series[rodadaIdx];
                        if (!aSerie || !bSerie) return null;
                        const rows = [
                          { label: 'A', nome: modalBlock.exercicioA.nome, exId: modalBlock.exercicioA.id, s: aSerie, color: 'text-brand' },
                          { label: 'B', nome: modalBlock.exercicioB.nome, exId: modalBlock.exercicioB.id, s: bSerie, color: 'text-[#888]' },
                        ];
                        return (
                          <div
                            key={rodadaIdx}
                            className={rodadaIdx > 0 ? 'pt-3' : ''}
                            style={rodadaIdx > 0 ? { borderTop: '1px dashed rgba(0,0,0,0.06)' } : undefined}
                          >
                            <p className="text-[10px] font-semibold uppercase mb-2" style={{ color: '#bbb' }}>
                              Rodada {rodadaIdx + 1}
                            </p>
                            {rows.map(({ label, nome, exId, s, color }) => {
                              const isAtualRow =
                                rodadaIdx === modalRodadaIdx &&
                                ((label === 'A' && bisetFase === 'a') || (label === 'B' && bisetFase !== 'a'));
                              return (
                                <div key={label} className="flex items-center justify-between py-1 text-xs">
                                  <span className="truncate flex-1" style={{ color: '#555' }}>{nome}</span>
                                  <span className="mx-2" style={{ color: '#bbb' }}>{s.anterior || '—'}</span>
                                  {isAtualRow ? (
                                    <span className="font-bold font-kpi tabular-nums lining-nums" style={{ color: '#1a1a1a' }}>
                                      {modalCarga ? `${modalCarga}kg` : '—'}
                                    </span>
                                  ) : (
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      value={s.peso_atual || ''}
                                      onChange={(e) => handlePesoChange(exId, s.ordem, parseFloat(e.target.value) || 0)}
                                      placeholder="—"
                                      aria-label={`Editar peso — ${nome}, rodada ${rodadaIdx + 1}`}
                                      className="w-14 h-7 bg-transparent px-1 text-right font-bold font-kpi tabular-nums lining-nums focus:outline-none"
                                      style={{
                                        borderBottom: '1.5px solid rgba(147,51,234,0.3)',
                                        color: '#1a1a1a',
                                        fontSize: '16px',
                                      }}
                                    />
                                  )}
                                  <span className="text-accent mx-2 tabular-nums lining-nums">{s.reps}</span>
                                  <span className={cn('text-[10px]', color)}>({label})</span>
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
                    className="grid items-center px-3 py-2"
                    style={{
                      gridTemplateColumns: GRID_COLS_HISTORICO,
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    <span className="text-[9px] font-semibold uppercase text-center" style={{ color: '#bbb' }}>Set</span>
                    <span className="text-[9px] font-semibold uppercase pl-2" style={{ color: '#bbb' }}>Ant.</span>
                    <span className="text-[9px] font-semibold uppercase text-right" style={{ color: '#bbb' }}>Peso</span>
                    <span className="text-[9px] font-semibold uppercase text-center" style={{ color: '#bbb' }}>Reps</span>
                    <span className="text-[9px] font-semibold uppercase text-center" style={{ color: '#bbb' }}>T1</span>
                    <span className="text-[9px] font-semibold uppercase text-center" style={{ color: '#bbb' }}>T2</span>
                  </div>
                  {modalEx.series.map((s, idx) => {
                    const isAtual = idx === modalRodadaIdx;
                    return (
                      <div
                        key={s.ordem}
                        className={cn(
                          'grid items-center py-2 last:border-0 px-3',
                          s.completado ? 'bg-success/5' : isAtual ? 'bg-brand/5' : ''
                        )}
                        style={{
                          gridTemplateColumns: GRID_COLS_HISTORICO,
                          borderBottom: '1px solid rgba(0,0,0,0.06)',
                        }}
                      >
                        <div className="flex justify-center">
                          <span className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-kpi',
                            s.completado ? 'bg-success text-white' : isAtual ? 'bg-brand text-white' : ''
                          )}
                          style={
                            !s.completado && !isAtual
                              ? { background: '#ebebf0', color: '#888' }
                              : undefined
                          }
                          >
                            {idx + 1}
                          </span>
                        </div>
                        <span className="text-[12px] font-kpi truncate pl-2" style={{ color: '#bbb' }}>
                          {s.anterior || '—'}
                        </span>
                        {isAtual ? (
                          <span
                            className="text-[15px] font-bold font-kpi tabular-nums lining-nums text-right"
                            style={{ color: '#1a1a1a' }}
                          >
                            {modalCarga ? `${modalCarga}kg` : '—'}
                          </span>
                        ) : (
                          <input
                            type="number"
                            inputMode="decimal"
                            value={s.peso_atual || ''}
                            onChange={(e) => handlePesoChange(modalEx.id, s.ordem, parseFloat(e.target.value) || 0)}
                            placeholder="—"
                            aria-label={`Editar peso da série ${idx + 1}`}
                            className="w-full h-8 bg-transparent px-1 text-right font-bold font-kpi tabular-nums lining-nums focus:outline-none"
                            style={{
                              borderBottom: '1.5px solid rgba(147,51,234,0.3)',
                              color: '#1a1a1a',
                              fontSize: '16px',
                            }}
                          />
                        )}
                        <span className="text-[13px] font-semibold font-kpi tabular-nums lining-nums text-accent text-center">{s.reps}</span>
                        <span className="text-[11px] font-medium text-center" style={{ color: '#888' }}>
                          {duasLetrasTenica(s.tecnica) || '—'}
                        </span>
                        <span className="text-[11px] font-medium text-accent text-center">
                          {abreviarTecnica(s.tecnica_extra) || '—'}
                        </span>
                      </div>
                    );
                  })}
                    </>
                  )}
                </div>
              )}
            </div>

            {modalEx.video_url ? (
              <VideoPlayerCard
                videoUrl={modalEx.video_url}
                exercicioNome={modalEx.nome}
              />
            ) : !modalEx.gif_url ? (
              <div
                className="mx-4 mt-4 rounded-[14px] flex-shrink-0"
                style={{
                  background: 'rgba(0,0,0,0.03)',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <div className="flex items-center gap-2.5 px-4 py-3">
                  <Video className="w-4 h-4 flex-shrink-0" style={{ color: '#ccc' }} />
                  <div>
                    <p className="text-[12px] font-medium" style={{ color: '#999' }}>
                      Sem demonstração disponível
                    </p>
                    <p className="text-[11px]" style={{ color: '#bbb' }}>
                      Este exercício não possui vídeo nem GIF na biblioteca
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Botão fixo no rodapé */}
          <div
            className="absolute bottom-0 left-0 right-0 px-4 pt-3 flex flex-col gap-1.5 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            style={{
              background: 'linear-gradient(to top, #f5f5f7 60%, rgba(245,245,247,0.85) 85%, transparent)',
            }}
          >
            <button
              type="button"
              onClick={concluirSerieModal}
              disabled={restActive || bisetFase === 'transicao'}
              className="w-full min-h-[52px] rounded-[14px] flex items-center justify-center gap-2 text-[15px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #c084fc, #9333ea, #7e22ce)',
                boxShadow: '0 4px 16px rgba(147,51,234,0.40)',
              }}
            >
              <Check size={18} weight="bold" />
              {(() => {
                if (modalIsBiSet && modalPartnerEx && modalBlock?.kind === 'biset') {
                  if (bisetFase === 'a') {
                    return `Concluir ${modalEx.nome} → ${modalPartnerEx.nome}`;
                  }
                  const isUltimaRodada = modalRodadaIdx >= modalTotalRodadas - 1;
                  if (isUltimaRodada) {
                    return modalBlockIdx !== null && modalBlockIdx >= blocks.length - 1
                      ? 'Concluir treino'
                      : `Concluir ${modalEx.nome} → Finalizar Bi-Set`;
                  }
                  return `Concluir ${modalEx.nome} → Descanso ${formatRestTime(modalBlock.descanso)}`;
                }
                if (modalRodadaIdx >= modalTotalRodadas - 1) {
                  return modalBlockIdx !== null && modalBlockIdx >= blocks.length - 1
                    ? 'Concluir treino'
                    : 'Concluir exercício';
                }
                return `Concluir série ${modalRodadaIdx + 1}/${modalTotalRodadas}`;
              })()}
            </button>
            {modalBlockIdx !== null && modalBlockIdx < blocks.length - 1 && modalRodadaIdx >= modalTotalRodadas - 1 && !modalIsBiSet && (
              <button
                onClick={() => { setModalBlockIdx(null); }}
                className="w-full h-10 text-xs transition-colors"
                style={{ color: '#888' }}
              >
                Fechar e voltar à lista
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── YouTube player ── */}
      {videoUrl && <YouTubePlayer videoUrl={videoUrl} onClose={() => setVideoUrl(null)} />}

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

