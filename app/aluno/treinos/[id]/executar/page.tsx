'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Trophy, Play, X, Clock, CaretLeft, CaretRight, Video, Download, ShareNetwork, Barbell } from '@phosphor-icons/react';
import { toPng } from 'html-to-image';
import { supabaseClient } from '@/lib/supabaseClient';
import { YouTubePlayer } from '@/app/components/YouTubePlayer';
import { formatDuration, formatVolume } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { haptic } from '@/lib/utils/haptics';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

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
  video_url?: string;
  gif_url?: string;
  observacoes?: string;
  series: SerieConfig[];
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
}

interface VolumePoint {
  data: string;
  volume: number;
}

const GRID_COLS_SERIES = '28px 1fr 52px 44px 34px 34px 36px';
const GRID_COLS_HISTORICO = '28px 72px 1fr 40px 32px 32px';

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

function getTecnicaInstrucao(tecnica?: string): string {
  if (!tecnica) return 'Execute com controle e mantenha a técnica prescrita pelo seu coach.';
  const t = tecnica.toLowerCase();
  if (t.includes('cluster')) return 'Divida a série em mini-blocos com pausas curtas, mantendo a carga e a qualidade da execução.';
  if (t.includes('drop')) return 'Após atingir a falha técnica, reduza a carga e continue sem descanso prolongado.';
  if (t.includes('bi-set') || t.includes('biset')) return 'Alterne dois exercícios em sequência com descanso mínimo entre eles.';
  if (t.includes('super')) return 'Execute os exercícios em sequência para aumentar densidade e fadiga muscular.';
  if (t.includes('isometria')) return 'Mantenha a contração na posição indicada pelo tempo recomendado, sem compensar a postura.';
  if (t.includes('tempo')) return 'Controle o ritmo da repetição, respeitando principalmente a fase excêntrica.';
  return 'Siga a técnica prescrita pelo seu coach com amplitude controlada e postura estável.';
}

function primeiraLetraTecnica(tecnica?: string): string {
  if (!tecnica) return '—';
  return tecnica.charAt(0).toUpperCase();
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
  onPesoChange: (peso: number) => void;
  onCheck: () => void;
}

function SetRow({ serie, idx, treinoIniciado, onPesoChange, onCheck }: SetRowProps) {
  return (
    <div className="grid items-center py-2.5 border-t border-border-subtle/30" style={{ gridTemplateColumns: GRID_COLS_SERIES }}>
      {/* Número da série */}
      <div className="flex justify-center">
        <span className={cn(
          'w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold font-mono',
          serie.completado ? 'bg-success text-white' : 'bg-surface-2 text-text-muted'
        )}>
          {idx + 1}
        </span>
      </div>

      {/* Anterior */}
      <div className="min-w-0 pl-2">
        <p className={cn(
          'text-[11px] font-mono tabular-nums truncate',
          serie.completado ? 'text-text-disabled line-through' : 'text-text-muted'
        )}>
          {serie.anterior || '—'}
        </p>
      </div>

      {/* Peso */}
      <div className="flex justify-end pr-2">
        <input
          type="number"
          inputMode="decimal"
          value={serie.peso_atual || ''}
          onChange={(e) => onPesoChange(parseFloat(e.target.value) || 0)}
          disabled={!treinoIniciado || serie.completado}
          placeholder="0"
          className={cn(
            'w-full h-6 rounded-md text-right text-[15px] font-bold font-mono tabular-nums',
            'bg-transparent border-b border-border-subtle',
            'text-text-primary focus:border-brand focus:outline-none',
            'disabled:opacity-50 px-1'
          )}
        />
      </div>

      {/* Reps */}
      <div className="flex justify-center">
        <span className={cn(
          'text-[13px] font-semibold font-mono tabular-nums',
          serie.completado ? 'text-success' : 'text-accent'
        )}>{serie.reps}</span>
      </div>

      {/* Técnica 1 (principal) */}
      <div className="flex justify-center">
        <span className="text-[11px] font-medium text-text-secondary leading-tight text-center">
          {duasLetrasTenica(serie.tecnica) || '—'}
        </span>
      </div>

      {/* Técnica 2 (extra) */}
      <div className="flex justify-center">
        <span className="text-[11px] font-medium text-accent leading-tight text-center">
          {abreviarTecnica(serie.tecnica_extra) || '—'}
        </span>
      </div>

      {/* Check */}
      <div className="flex justify-center">
        <button
          onClick={onCheck}
          disabled={!treinoIniciado}
          className={cn(
            'w-7 h-7 rounded-md border border-border-subtle flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 active:bg-success/10 active:border-success/30 transition-colors duration-100',
            serie.completado ? 'bg-success/10 border-success/30 text-success' : 'bg-surface-0 text-text-muted'
          )}
        >
          {serie.completado ? <Check className="w-3.5 h-3.5 text-success" /> : <span className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── ExercicioCard ─────────────────────────────────────────────────────────────

interface ExercicioCardProps {
  exercicio: ExercicioState;
  treinoIniciado: boolean;
  onPesoChange: (ordem: number, peso: number) => void;
  onCheck: (ordem: number) => void;
  onVideoOpen: (url: string) => void;
}

function ExercicioCard({ exercicio, treinoIniciado, onPesoChange, onCheck, onVideoOpen }: ExercicioCardProps) {
  const completadas = exercicio.series.filter(s => s.completado).length;
  const total = exercicio.series.length;
  const all = completadas === total;

  return (
    <div className={cn(
      'rounded-lg border transition-colors overflow-hidden',
      all ? 'bg-success-subtle/20 border-success-border' : 'bg-surface-1 border-border-subtle'
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border-subtle/50">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary leading-tight">{toTitleCase(exercicio.nome)}</h3>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Clock className="w-3 h-3 text-brand" />
            <p className="text-[10px] text-brand">
              Descanso: {formatDuration(exercicio.descanso)}
            </p>
          </div>
        </div>
        {exercicio.video_url && (
          <button
            onClick={() => onVideoOpen(exercicio.video_url!)}
            className="w-7 h-7 rounded-md bg-surface-3 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-brand hover:border-brand transition-colors shrink-0"
          >
            <Play className="w-3 h-3" fill="currentColor" />
          </button>
        )}
        {all && (
          <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-white" weight="bold" />
          </div>
        )}
      </div>

      {exercicio.observacoes && (
        <div className="mx-4 mt-3 mb-1 px-2.5 py-2 bg-surface-2 border border-border-subtle rounded-md">
          <p className="text-[10px] font-semibold uppercase tracking-caps text-text-tertiary mb-1">Observações</p>
          <p className="text-[11px] text-text-secondary leading-relaxed">{exercicio.observacoes}</p>
        </div>
      )}

      {/* Tabela de séries */}
      <div className="px-4 pt-2 pb-3">
        {/* Cabeçalho de colunas */}
        <div className="grid items-center py-2 mb-1" style={{ gridTemplateColumns: GRID_COLS_SERIES }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">Set</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted pl-2">Ant.</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-right">Peso</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">Reps</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">T1</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">T2</span>
          <span className="text-[10px] text-text-muted text-center">✓</span>
        </div>

        {/* Séries */}
        <div className="divide-y divide-border-subtle/30">
          {exercicio.series.map((serie, idx) => (
            <div key={serie.ordem}>
              <SetRow
                serie={serie}
                idx={idx}
                treinoIniciado={treinoIniciado}
                onPesoChange={(peso) => onPesoChange(serie.ordem, peso)}
                onCheck={() => onCheck(serie.ordem)}
              />
            </div>
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
  const [exercicios, setExercicios] = useState<ExercicioState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [volumeHistory, setVolumeHistory] = useState<VolumePoint[]>([]);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [showConfirmAbandon, setShowConfirmAbandon] = useState(false);
  const [coachUsername, setCoachUsername] = useState('coach');
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

  // Modal de execução (por exercício)
  const [modalExIdx, setModalExIdx] = useState<number | null>(null);
  const [modalSerieIdx, setModalSerieIdx] = useState(0);
  const [modalCarga, setModalCarga] = useState(0);
  const [modalCargaStr, setModalCargaStr] = useState('');
  const [showSeriesHistory, setShowSeriesHistory] = useState(false);
  const [modalTecnicaAberto, setModalTecnicaAberto] = useState(false);
  const [tecnicaAtual, setTecnicaAtual] = useState<string | null>(null);

  // Vídeo
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Ref sempre atualizado — usado nos listeners de pagehide/visibilitychange
  const persistRef = useRef<{
    exercicios: ExercicioState[];
    timerStartAt: number | null;
    treinoIniciado: boolean;
    saved: boolean;
  }>({ exercicios: [], timerStartAt: null, treinoIniciado: false, saved: false });

  useEffect(() => {
    persistRef.current = { exercicios, timerStartAt, treinoIniciado, saved };
  });

  // ── Carregar ficha ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!fichaId) return;
    loadFicha();
  }, [fichaId]);

  const loadFicha = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const uid = authData?.user?.id;
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

      // Buscar grupos musculares e gifs da biblioteca
      const exercicioIds = exerciciosConfig.map(ex => ex.id).filter(Boolean);
      let gruposMusculares: Record<string, string> = {};
      let gifsExercicios: Record<string, string> = {};
      if (exercicioIds.length > 0) {
        const { data: bibData } = await supabaseClient
          .from('exercicios_biblioteca')
          .select('id, grupo_muscular, gif_url')
          .in('id', exercicioIds);

        gruposMusculares = Object.fromEntries(
          (bibData || []).map(ex => [ex.id, ex.grupo_muscular || ''])
        );
        gifsExercicios = Object.fromEntries(
          (bibData || []).map(ex => [ex.id, ex.gif_url || ''])
        );
      }

      // Buscar histórico para gráfico e anterior de cada exercício
      const { data: historicoData } = await supabaseClient
        .from('historico_treinos')
        .select('data_conclusao, dados_sessao, exercicio_id')
        .eq('ficha_id', fichaId)
        .eq('aluno_id', uid)
        .order('data_conclusao', { ascending: true })
        .limit(50);

      // Montar gráfico de volume: agrupar por dia
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
      const volumePoints = Object.entries(volumePorDia).map(([data, volume]) => ({
        data: new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        volume,
      }));
      setVolumeHistory(volumePoints);

      // Último histórico por exercício para mostrar "anterior"
      const ultimoPorExercicio: Record<string, any> = {};
      for (const h of (historicoData || [])) {
        if (!h.exercicio_id) continue;
        const current = ultimoPorExercicio[h.exercicio_id];
        if (!current || h.data_conclusao > current.data_conclusao) {
          ultimoPorExercicio[h.exercicio_id] = h;
        }
      }

      const exerciciosState: ExercicioState[] = exerciciosConfig.map((ex) => {
        const ultimo = ultimoPorExercicio[ex.id];
        const seriesPrev = (ultimo?.dados_sessao as any)?.series || [];

        return {
          id: ex.id,
          nome: ex.nome,
          descanso: parseDescanso(ex.descanso),
          video_url: ex.video_url,
          gif_url: gifsExercicios[ex.id] || '',
          observacoes: ex.observacoes,
          grupo_muscular: gruposMusculares[ex.id] || '',
          series: (ex.series || []).map((s, idx) => {
            const prev = seriesPrev[idx];
            const anterior = prev ? `${prev.peso_atual || 0}kg × ${prev.reps || 0}` : '—';
            return {
              ordem: s.ordem ?? idx + 1,
              peso_atual: prev?.peso_atual ?? 0,
              reps: s.reps,
              tecnica: s.tecnica,
              tecnica_extra: s.tecnica_extra,
              completado: false,
              anterior,
            };
          }),
        };
      });

      // Restaurar estado salvo (se existir e for do mesmo dia)
      const storageKey = `treino_${uid}_${fichaId}`;
      const savedRaw = localStorage.getItem(storageKey);
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw);
          if (saved.exercicios && Date.now() - (saved.timestamp || 0) < 86400000) {
            const restored = exerciciosState.map((ex, i) => {
              const savedEx = saved.exercicios[i];
              if (!savedEx || savedEx.id !== ex.id) return ex;
              return {
                ...ex,
                series: ex.series.map((s, j) => {
                  const savedS = savedEx.series?.[j];
                  if (!savedS) return s;
                  return { ...s, peso_atual: savedS.peso_atual ?? s.peso_atual, completado: savedS.completado ?? false };
                }),
              };
            });
            setExercicios(restored);
            setTreinoIniciado(true);
            setTimerStartAt(saved.timerStartAt || Date.now());
            // Garantir que o pointer existe (para o banner global)
            localStorage.setItem('treino_ativo_pointer', JSON.stringify({
              fichaId,
              userId: uid,
              nomeRotina: fichaData.nome_rotina,
            }));
          } else {
            localStorage.removeItem(storageKey);
            setExercicios(exerciciosState);
          }
        } catch {
          localStorage.removeItem(storageKey);
          setExercicios(exerciciosState);
        }
      } else {
        setExercicios(exerciciosState);
      }

      // Buscar coach do aluno para obter username
      if (uid) {
        const { data: coachData } = await supabaseClient
          .from('coach_alunos')
          .select('coach_id')
          .eq('aluno_id', uid)
          .single();

        if (coachData?.coach_id) {
          const { data: profileData } = await supabaseClient
            .from('profiles')
            .select('coaching_reference')
            .eq('id', coachData.coach_id)
            .single();

          if (profileData?.coaching_reference) {
            setCoachUsername(profileData.coaching_reference);
          }
        }
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
      const totalSets = calcTotalSets(exercicios);
      const completedSets = calcSetsCompletos(exercicios);

      if (completedSets < totalSets) {
        e.preventDefault();
        e.returnValue = 'Você tem séries incompletas. Deseja realmente sair?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [treinoIniciado, exercicios, saved]);

  // ── Persistência de estado do treino ────────────────────────────────────────

  const savedKey = fichaId && userId ? `treino_${userId}_${fichaId}` : null;

  useEffect(() => {
    if (!savedKey || !treinoIniciado || saved) return;

    localStorage.setItem(savedKey, JSON.stringify({
      exercicios,
      timerStartAt,
      timestamp: Date.now(),
    }));
  }, [savedKey, exercicios, treinoIniciado, timerStartAt, saved]);

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
      const { exercicios: exs, timerStartAt: tsa, treinoIniciado: ti, saved: sv } = persistRef.current;
      if (!ti || sv) return;
      localStorage.setItem(`treino_${userId}_${fichaId}`, JSON.stringify({
        exercicios: exs,
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

  function iniciarRest(durationSecs: number, onDone: () => void) {
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
    abrirModalExercicio(0);
  };

  function abrirModalExercicio(exIdx: number) {
    if (exIdx < 0 || exIdx >= exercicios.length) return;
    const ex = exercicios[exIdx];
    // Encontrar primeira série não completada
    const proxSerieIdx = ex.series.findIndex(s => !s.completado);
    const serieIdx = proxSerieIdx >= 0 ? proxSerieIdx : 0;
    setModalExIdx(exIdx);
    setModalSerieIdx(serieIdx);
    const carga = ex.series[serieIdx]?.peso_atual || 0;
    setModalCarga(carga);
    setModalCargaStr(carga > 0 ? String(carga) : '');
    setShowSeriesHistory(false);
  }

  // ── Ações de séries ─────────────────────────────────────────────────────────

  const handlePesoChange = useCallback((exercicioId: string, serieOrdem: number, peso: number) => {
    setExercicios(prev => prev.map(ex =>
      ex.id !== exercicioId ? ex : {
        ...ex,
        series: ex.series.map(s => s.ordem !== serieOrdem ? s : { ...s, peso_atual: peso })
      }
    ));
  }, []);

  const handleCheck = useCallback((exercicioId: string, serieOrdem: number) => {
    if (!treinoIniciado) return;
    setExercicios(prev => {
      const exIdx = prev.findIndex(ex => ex.id === exercicioId);
      if (exIdx === -1) return prev;
      const ex = prev[exIdx];
      const serieIdx = ex.series.findIndex(s => s.ordem === serieOrdem);
      if (serieIdx === -1) return prev;
      const toggled = !ex.series[serieIdx].completado;
      const next = prev.map((e, i) => i !== exIdx ? e : {
        ...e,
        series: e.series.map(s => s.ordem !== serieOrdem ? s : { ...s, completado: toggled })
      });
      if (toggled) {
        haptic('success');
        const temProxima = serieIdx + 1 < ex.series.length;
        if (temProxima) {
          iniciarRest(ex.descanso, () => {});
        }
      } else {
        haptic('light');
      }
      return next;
    });
  }, [treinoIniciado]);

  // ── Ações do modal ───────────────────────────────────────────────────────────

  function concluirSerieModal() {
    if (modalExIdx === null) return;
    const ex = exercicios[modalExIdx];
    const serie = ex.series[modalSerieIdx];

    // Computar novo estado diretamente (evita double setState) e salvar de forma síncrona
    const newExercicios = exercicios.map((e, i) => i !== modalExIdx ? e : {
      ...e,
      series: e.series.map(s => s.ordem !== serie.ordem ? s : { ...s, peso_atual: modalCarga, completado: true })
    });
    setExercicios(newExercicios);

    if (fichaId && userId) {
      localStorage.setItem(`treino_${userId}_${fichaId}`, JSON.stringify({
        exercicios: newExercicios,
        timerStartAt,
        timestamp: Date.now(),
      }));
    }

    haptic('success');

    const isUltimaSerie = modalSerieIdx >= ex.series.length - 1;
    const isUltimoExercicio = modalExIdx >= exercicios.length - 1;

    if (isUltimaSerie) {
      // Último exercício → fechar modal
      if (isUltimoExercicio) {
        setModalExIdx(null);
        return;
      }
      // Próximo exercício
      const proxExIdx = modalExIdx + 1;
      iniciarRest(ex.descanso, () => abrirModalExercicio(proxExIdx));
    } else {
      // Próxima série
      const proxSerieIdx = modalSerieIdx + 1;
      iniciarRest(ex.descanso, () => {
        const nextCarga = ex.series[proxSerieIdx]?.peso_atual || modalCarga;
        setModalSerieIdx(proxSerieIdx);
        setModalCarga(nextCarga);
        setModalCargaStr(nextCarga > 0 ? String(nextCarga) : '');
      });
    }
  }

  // ── Finalizar treino ─────────────────────────────────────────────────────────

  const handleFinalizar = async () => {
    const setsCompletos = calcSetsCompletos(exercicios);
    const totalSets = calcTotalSets(exercicios);
    if (setsCompletos < totalSets) {
      setShowConfirmFinish(true);
      return;
    }
    await finalizarConfirmado();
  };

  const finalizarConfirmado = async () => {
    if (!userId || saving) return;
    setShowConfirmFinish(false);
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
    setExercicios([]);
    setElapsed(0);
    setTimerStartAt(null);
    setModalExIdx(null);
    setRestActive(false);
    setShowConfirmAbandon(false);
    haptic('light');
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Preparando treino..." />
      </div>
    );
  }

  if (saved) {
    const volume = calcVolume(exercicios);
    const sets = calcSetsCompletos(exercicios);

    return (
      <CompletionScreenWithExport
        nomeRotina={nomeRotina}
        duracao={elapsed}
        volume={volume}
        sets={sets}
        exercicios={exercicios}
        prsCount={prsCount}
        coachUsername={coachUsername}
      />
    );
  }

  const volume = calcVolume(exercicios);
  const setsCompletos = calcSetsCompletos(exercicios);
  const totalSets = calcTotalSets(exercicios);

  // Modal exercício atual
  const modalEx = modalExIdx !== null ? exercicios[modalExIdx] : null;
  const modalSerie = modalEx?.series[modalSerieIdx];

  return (
    <div className={cn('min-h-screen bg-surface-0', treinoIniciado ? 'pb-4' : 'pb-28')}>

      {/* ── Header sticky ── */}
      <header className="sticky top-0 z-40 bg-surface-0/95 backdrop-blur-xl border-b border-border-subtle">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <Link
            href="/aluno/treinos"
            className="w-8 h-8 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-text-primary truncate">{nomeRotina}</h1>
            {treinoIniciado && (
              <p className="text-xs text-text-tertiary">{setsCompletos}/{totalSets} sets</p>
            )}
          </div>

          {treinoIniciado && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfirmAbandon(true)}
                className="w-8 h-8 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-destructive transition-colors shrink-0"
                title="Descartar treino"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="text-right">
                <p className="font-mono tabular-nums text-sm font-bold text-brand leading-none">{formatDuration(elapsed)}</p>
                <p className="text-2xs text-text-tertiary">{formatVolume(volume)}</p>
              </div>
              <button
                onClick={handleFinalizar}
                disabled={saving}
                className="h-8 px-3 bg-brand text-text-on-brand rounded-lg text-[11px] font-semibold shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {saving ? '...' : 'Finish'}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Conteúdo ── */}
      <main className="px-4 py-4 max-w-lg mx-auto flex flex-col gap-3">

        {/* Preview: gráfico + botão iniciar */}
        {!treinoIniciado && (
          <>
            {/* Botão iniciar */}
            <button
              onClick={iniciarTreino}
              className="w-full h-10 rounded-lg font-semibold text-xs bg-brand text-text-on-brand shadow-lg shadow-brand/30 transition-all active:scale-95"
            >
              Iniciar treino
            </button>

            {/* Gráfico de volume */}
            {volumeHistory.length >= 4 && (
              <div className="bg-surface-1 border border-border-subtle rounded-lg p-3">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-caps text-text-tertiary">Progresso de Volume</p>
                    {volumeHistory.length > 0 && (
                      <p className="text-base font-bold text-text-primary mt-0.5">
                        {formatVolume(volumeHistory[volumeHistory.length - 1].volume)}
                        <span className="text-[10px] text-brand ml-1.5">{volumeHistory[volumeHistory.length - 1].data}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={volumeHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="data"
                        stroke="#6b7280"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        dy={6}
                      />
                      <YAxis stroke="#6b7280" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: 11 }}
                        labelStyle={{ color: '#ffffff' }}
                        itemStyle={{ color: '#a0a0a0' }}
                        formatter={(v: number) => [formatVolume(v), 'Volume']}
                      />
                      <Line
                        type="monotone"
                        dataKey="volume"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#6366f1' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {volumeHistory.length > 0 && volumeHistory.length < 4 && (
              <div className="bg-surface-1 border border-border-subtle rounded-lg p-3">
                <p className="text-xs font-semibold text-text-primary mb-1">Progresso de volume</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Complete pelo menos 4 sessões para visualizar uma curva de evolução mais confiável.
                </p>
              </div>
            )}
          </>
        )}

        {/* Banner treino em andamento */}
        {treinoIniciado && (
          <div className="flex items-center gap-2 px-3 py-2 bg-success-subtle border border-success-border rounded-lg">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
            <p className="text-xs text-success font-medium flex-1">Treino em andamento</p>
            <button
              onClick={() => abrirModalExercicio(exercicios.findIndex(ex => ex.series.some(s => !s.completado)))}
              className="text-[10px] font-semibold text-brand hover:underline"
            >
              Retomar →
            </button>
          </div>
        )}

        {/* Exercícios */}
        {exercicios.map((ex) => (
          <ExercicioCard
            key={ex.id}
            exercicio={ex}
            treinoIniciado={treinoIniciado}
            onPesoChange={(ordem, peso) => handlePesoChange(ex.id, ordem, peso)}
            onCheck={(ordem) => handleCheck(ex.id, ordem)}
            onVideoOpen={setVideoUrl}
          />
        ))}

      </main>

      {/* ── Rest Timer: bottom bar (só quando o modal de exercício está fechado) ── */}
      {restActive && modalExIdx === null && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-1 border-t border-border-subtle shadow-[0_-8px_32px_rgba(0,0,0,0.4)]">
          <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center gap-2">
            <button
              onClick={() => restAddSecs(-15)}
              className="w-12 h-10 bg-surface-2 border border-border-subtle rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
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
                <p className="font-mono text-3xl font-bold text-text-primary tabular-nums">
                  {Math.floor(restRemaining / 60).toString().padStart(2, '0')}:{(restRemaining % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>

            <button
              onClick={() => restAddSecs(15)}
              className="w-12 h-10 bg-surface-2 border border-border-subtle rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
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

      {/* ── Modal de confirmação para finalizar ── */}
      {showConfirmFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface-1 border border-border-subtle shadow-elev-2 rounded-2xl p-6">
            <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-brand" />
            </div>
            <h3 className="text-lg font-bold text-text-primary text-center mb-2">Treino Incompleto</h3>
            <p className="text-sm text-text-secondary text-center mb-6 leading-relaxed">
              {calcTotalSets(exercicios) - setsCompletos} séries ainda não concluídas. Deseja finalizar mesmo assim?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={finalizarConfirmado}
                disabled={saving}
                className="w-full h-11 bg-brand text-text-on-brand rounded-xl text-xs font-semibold shadow-sm shadow-brand/30 hover:opacity-90 disabled:opacity-50"
              >
                Sim, Finalizar
              </button>
              <button
                onClick={() => setShowConfirmFinish(false)}
                className="w-full h-11 bg-surface-3 border border-border-subtle text-text-secondary rounded-xl text-xs font-semibold hover:text-text-primary transition-colors"
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
          <div className="w-full max-w-sm bg-surface-1 border border-border-subtle shadow-elev-2 rounded-2xl p-6">
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
                className="w-full h-11 bg-surface-3 border border-border-subtle text-text-secondary rounded-xl text-xs font-semibold hover:text-text-primary transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de execução por exercício ── */}
      {modalEx && modalSerie && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface-0">
          {/* Barra de progresso no topo */}
          <div className="w-full h-0.5 bg-surface-2 flex-shrink-0">
            <div
              className="h-full bg-brand transition-all duration-300"
              style={{ width: `${((modalSerieIdx + 1) / modalEx.series.length) * 100}%` }}
            />
          </div>

          {/* Header do modal */}
          <div className="flex items-center gap-3 px-4 pt-safe-top pt-4 pb-3 bg-surface-1 border-b border-border-subtle flex-shrink-0">
            <button
              onClick={() => setModalExIdx(null)}
              className="w-8 h-8 rounded-md bg-surface-1 border border-border-subtle flex items-center justify-center text-text-secondary flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-brand">
                Exercício {(modalExIdx ?? 0) + 1}/{exercicios.length}
              </p>
              <h2 className="text-sm font-semibold text-text-primary leading-tight truncate">{toTitleCase(modalEx.nome)}</h2>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-text-muted">Série</p>
              <p className="text-base font-bold font-mono text-text-primary">
                {modalSerieIdx + 1}<span className="text-text-muted font-normal">/{modalEx.series.length}</span>
              </p>
            </div>
          </div>

          {/* Corpo do modal */}
          <div className="flex-1 overflow-y-auto pb-24">
            {/* GIF de demonstração — quando disponível */}
            {modalEx.gif_url ? (
              <div className="mx-4 mt-4 mb-4 rounded-lg overflow-hidden bg-surface-1 border border-border-subtle aspect-square">
                <img
                  src={modalEx.gif_url}
                  alt={`Demonstração: ${modalEx.nome}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              /* Placeholder quando não há GIF */
              <div className="mx-4 mt-4 mb-4 rounded-lg bg-surface-1 border border-border-subtle aspect-square flex flex-col items-center justify-center gap-2">
                <Barbell className="w-8 h-8 text-text-muted" strokeWidth={1} />
                <p className="text-xs text-text-muted">Sem demonstração</p>
              </div>
            )}

            {/* 3 cards de contexto: REPETIÇÕES / ÚLTIMA VEZ / TÉCNICA */}
            <div className="grid grid-cols-3 gap-2 px-4 mb-4">
              <div className="bg-surface-1 border border-border-subtle rounded-lg p-3 flex flex-col items-center">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted mb-1">
                  Repetições
                </span>
                <span className="text-2xl font-bold font-mono tabular-nums text-text-primary">
                  {modalSerie.reps}
                </span>
              </div>

              <div className="bg-surface-1 border border-border-subtle rounded-lg p-3 flex flex-col items-center justify-center">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted mb-1">
                  Última vez
                </span>
                <span className="text-xs font-semibold font-mono text-text-secondary text-center leading-tight">
                  {modalSerie.anterior || "—"}
                </span>
              </div>

              {/* TÉCNICA — clicável */}
              {(() => {
                const tecnica = modalSerie.tecnica_extra || modalSerie.tecnica;
                return (
                  <button
                    onClick={() => {
                      if (tecnica) {
                        setTecnicaAtual(tecnica);
                        setModalTecnicaAberto(true);
                      }
                    }}
                    disabled={!tecnica}
                    className={cn(
                      "border rounded-lg p-3 flex flex-col items-center relative transition-colors duration-100",
                      tecnica
                        ? "bg-brand/5 border-brand/20 active:bg-brand/10 text-brand font-semibold cursor-pointer"
                        : "bg-surface-1 border-border-subtle text-text-muted cursor-default"
                    )}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted mb-1">
                      Técnica
                    </span>
                    <span className={cn("text-xs text-center leading-tight truncate w-full", tecnica ? "text-brand font-semibold" : "text-text-muted")}>
                      {tecnica || "—"}
                    </span>
                    {tecnica && (
                      <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-brand/20 text-brand text-[8px] font-bold flex items-center justify-center">
                        i
                      </span>
                    )}
                  </button>
                );
              })()}
            </div>

            {/* Campo de CARGA — aumentado */}
            <div className="mx-4 mt-4 bg-surface-1 border border-border-subtle rounded-lg p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-3">
                Carga (kg)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newVal = Math.max(0, modalCarga - 2.5);
                    setModalCarga(newVal);
                    setModalCargaStr(String(newVal));
                  }}
                  className="w-14 h-14 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center text-2xl font-medium text-text-primary active:bg-surface-3 transition-colors"
                >
                  −
                </button>

                <div className="flex-1 h-14 bg-surface-0 border border-border-default rounded-lg flex items-center justify-center">
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
                    className="w-full bg-transparent border-0 text-center text-3xl font-bold font-mono text-text-primary focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => {
                    const newVal = modalCarga + 2.5;
                    setModalCarga(newVal);
                    setModalCargaStr(String(newVal));
                  }}
                  className="w-14 h-14 rounded-lg bg-brand flex items-center justify-center text-2xl font-medium text-white active:bg-brand/90 transition-colors"
                >
                  +
                </button>
              </div>

              {/* Incrementos rápidos */}
              <div className="grid grid-cols-4 gap-2 mt-2.5">
                {['-5', '-2.5', '+2.5', '+5'].map((inc) => (
                  <button
                    key={inc}
                    onClick={() => {
                      const val = parseFloat(inc);
                      const newVal = Math.max(0, modalCarga + val);
                      setModalCarga(newVal);
                      setModalCargaStr(String(newVal));
                    }}
                    className="h-9 rounded-md bg-surface-2 border border-border-subtle text-sm font-medium font-mono text-text-secondary active:bg-surface-3 transition-colors"
                  >
                    {inc}
                  </button>
                ))}
              </div>
            </div>

            {/* Histórico de séries */}
            <div className="mx-4 mt-4 bg-surface-1 border border-border-subtle rounded-xl overflow-hidden">
              <button
                onClick={() => setShowSeriesHistory(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 border-b border-border-subtle/50"
              >
                <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Histórico de Séries</p>
                <span className="text-2xs font-bold text-brand">{showSeriesHistory ? 'Ocultar' : 'Mostrar'}</span>
              </button>
              {showSeriesHistory && (
                <>
                  <div className="grid items-center px-3 py-2 border-b border-border-subtle/50" style={{ gridTemplateColumns: GRID_COLS_HISTORICO }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">Set</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted pl-2">Ant.</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-right">Peso</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">Reps</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">T1</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">T2</span>
                  </div>
                  {modalEx.series.map((s, idx) => {
                    const isAtual = idx === modalSerieIdx;
                    return (
                      <div
                        key={s.ordem}
                        className={cn(
                          'grid items-center py-2 border-b border-border-subtle/30 last:border-0 px-3',
                          s.completado ? 'bg-success/5' : isAtual ? 'bg-brand/5' : ''
                        )} style={{ gridTemplateColumns: GRID_COLS_HISTORICO }}
                      >
                        {/* SET */}
                        <div className="flex justify-center">
                          <span className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono',
                            s.completado ? 'bg-success text-white' : isAtual ? 'bg-brand text-white' : 'bg-surface-3 text-text-secondary'
                          )}>
                            {idx + 1}
                          </span>
                        </div>

                        {/* ANT */}
                        <span className="text-[11px] font-mono text-text-muted truncate pl-2">{s.anterior || '—'}</span>

                        {/* PESO */}
                        <span className="text-[15px] font-bold font-mono tabular-nums text-text-primary text-right">
                          {isAtual ? (modalCarga ? `${modalCarga}kg` : '—') : (s.peso_atual ? `${s.peso_atual}kg` : '—')}
                        </span>

                        {/* REPS */}
                        <span className="text-[13px] font-semibold font-mono tabular-nums text-accent text-center">
                          {s.reps}
                        </span>

                        {/* T1 */}
                        <span className="text-[11px] font-medium text-text-secondary text-center">
                          {duasLetrasTenica(s.tecnica) || '—'}
                        </span>

                        {/* T2 */}
                        <span className="text-[11px] font-medium text-accent text-center">
                          {abreviarTecnica(s.tecnica_extra) || '—'}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Botão fixo no rodapé */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-gradient-to-t from-surface-0 via-surface-0/95 to-transparent flex flex-col gap-1.5">
            {/* Rest timer — aparece aqui quando descanso está ativo */}
            {restActive && (
              <div className="mb-2 bg-surface-2 border border-border-subtle rounded-xl px-2.5 py-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                  <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Descanso</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => restAddSecs(-15)}
                    className="w-10 h-9 bg-surface-3 border border-border-subtle rounded-xl text-xs font-bold text-text-secondary flex-shrink-0"
                  >
                    −15
                  </button>
                  <div className="flex-1 text-center">
                    {restExpired ? (
                      <button
                        onClick={restAdvance}
                        className="w-full py-2 bg-success text-white rounded-xl text-sm font-bold uppercase tracking-caps"
                      >
                        Pronto! →
                      </button>
                    ) : (
                      <p className="font-mono text-2xl font-bold text-brand tabular-nums">
                        {Math.floor(restRemaining / 60).toString().padStart(2, '0')}:{(restRemaining % 60).toString().padStart(2, '0')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => restAddSecs(15)}
                    className="w-10 h-9 bg-surface-3 border border-border-subtle rounded-xl text-xs font-bold text-text-secondary flex-shrink-0"
                  >
                    +15
                  </button>
                  <button
                    onClick={restSkip}
                    className="h-9 px-3 bg-brand text-text-on-brand rounded-xl text-xs font-bold shadow-sm shadow-brand/30 flex-shrink-0"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={concluirSerieModal}
              disabled={restActive}
              className="w-full h-[52px] bg-brand text-text-on-brand rounded-lg flex items-center justify-center gap-2 text-[15px] font-semibold shadow-lg shadow-brand/30 hover:opacity-90 active:bg-brand/90 transition-all disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              {modalSerieIdx >= modalEx.series.length - 1
                ? modalExIdx !== null && modalExIdx >= exercicios.length - 1
                  ? 'Concluir treino'
                  : 'Concluir exercício'
                : `Concluir série ${modalSerieIdx + 1}/${modalEx.series.length}`
              }
            </button>
            {modalExIdx !== null && modalExIdx < exercicios.length - 1 && modalSerieIdx >= modalEx.series.length - 1 && (
              <button
                onClick={() => { setModalExIdx(null); }}
                className="w-full h-10 text-text-tertiary text-xs hover:text-text-secondary transition-colors"
              >
                Fechar e voltar à lista
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── YouTube player ── */}
      {videoUrl && <YouTubePlayer videoUrl={videoUrl} onClose={() => setVideoUrl(null)} />}

      {/* ── Modal de instrução da técnica ── */}
      {modalTecnicaAberto && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm">
          <div className="w-full bg-surface-1 border-t border-border-subtle rounded-t-xl p-6 animate-slide-up">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-0.5">
                  Técnica de execução
                </p>
                <h3 className="text-base font-bold text-text-primary">
                  {tecnicaAtual || 'Técnica'}
                </h3>
              </div>
              <button
                onClick={() => setModalTecnicaAberto(false)}
                className="w-8 h-8 rounded-md bg-surface-2 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              {getTecnicaInstrucao(tecnicaAtual || undefined)}
            </p>
            <button
              onClick={() => setModalTecnicaAberto(false)}
              className="w-full mt-6 h-11 bg-surface-2 border border-border-subtle rounded-lg text-sm font-medium text-text-primary"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CompletionScreenWithExport ────────────────────────────────────────────

interface CompletionScreenProps {
  nomeRotina: string;
  duracao: number;
  volume: number;
  sets: number;
  exercicios: ExercicioState[];
  prsCount: number;
  coachUsername: string;
}

type ShareTheme = 'escuro' | 'claro' | 'transparente';

interface ShareCardProps {
  nomeRotina: string;
  duracao: number;
  volume: number;
  sets: number;
  exercicios: ExercicioState[];
  coachUsername: string;
  theme: ShareTheme;
  monthDays: number[];
  comparativo: Array<{ nome: string; cargaAnterior: number; cargaAtual: number; delta: number }>;
}

const shareThemeTokens = {
  escuro: {
    bg: '#09090B',
    surface: '#111113',
    textPrimary: '#FAFAFA',
    textSecondary: '#A1A1AA',
    accent: '#2563EB',
    border: '#27272A',
  },
  claro: {
    bg: '#FFFFFF',
    surface: '#F4F4F5',
    textPrimary: '#09090B',
    textSecondary: '#71717A',
    accent: '#2563EB',
    border: '#E4E4E7',
  },
  transparente: {
    bg: 'transparent',
    surface: 'rgba(255,255,255,0.08)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.7)',
    accent: '#60A5FA',
    border: 'rgba(255,255,255,0.15)',
  },
} as const;

function parseCargaAnterior(serieAnterior?: string): number {
  if (!serieAnterior) return 0;
  const match = serieAnterior.match(/(\d+(?:[\.,]\d+)?)/);
  if (!match) return 0;
  return Number(match[1].replace(',', '.')) || 0;
}

function InstagramCardShell({
  theme,
  children,
}: {
  theme: ShareTheme;
  children: React.ReactNode;
}) {
  const t = shareThemeTokens[theme];
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: '20px',
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      {children}
    </div>
  );
}

function CardRodape({ theme, coachUsername }: { theme: ShareTheme; coachUsername: string }) {
  const t = shareThemeTokens[theme];
  const handle = coachUsername.replace('@', '').trim() || 'auronfit';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: `1px solid ${t.border}`, paddingTop: '18px' }}>
      <p style={{ fontSize: '14px', letterSpacing: '0.08em', fontWeight: 700, color: t.textSecondary }}>AURONFIT</p>
      <p style={{ fontSize: '14px', color: t.textSecondary }}>@{handle}</p>
    </div>
  );
}

function CardMetricas({ nomeRotina, duracao, volume, sets, theme, coachUsername }: ShareCardProps) {
  const t = shareThemeTokens[theme];
  return (
    <InstagramCardShell theme={theme}>
      <div style={{ width: '100%', padding: '64px', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
        <div>
          <p style={{ fontSize: '16px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', color: t.textSecondary }}>{nomeRotina}</p>
          <p style={{ marginTop: '6px', fontSize: '22px', fontWeight: 800, color: t.textPrimary }}>Treino concluído</p>
        </div>
        <div style={{ marginTop: '52px', display: 'grid', gap: '28px' }}>
          <div><p style={{ fontSize: '14px', color: t.textSecondary }}>Duração</p><p style={{ fontSize: '56px', fontWeight: 800, color: t.textPrimary }}>{formatDuration(duracao)}</p></div>
          <div><p style={{ fontSize: '14px', color: t.textSecondary }}>Volume Total</p><p style={{ fontSize: '56px', fontWeight: 800, color: t.textPrimary }}>{formatVolume(volume)}</p></div>
          <div><p style={{ fontSize: '14px', color: t.textSecondary }}>Séries</p><p style={{ fontSize: '56px', fontWeight: 800, color: t.textPrimary }}>{sets}</p></div>
        </div>
        <CardRodape theme={theme} coachUsername={coachUsername} />
      </div>
    </InstagramCardShell>
  );
}

function CardFrequencia({ monthDays, theme, coachUsername }: ShareCardProps) {
  const t = shareThemeTokens[theme];
  const now = new Date();
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const totalDiasNoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstWeekDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <InstagramCardShell theme={theme}>
      <div style={{ width: '100%', padding: '64px', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ fontSize: '56px', fontWeight: 800, color: t.textPrimary }}>{monthDays.length} treinos</p>
        <p style={{ fontSize: '18px', color: t.textSecondary, marginTop: '6px' }}>em {monthLabel}</p>
        <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {diasSemana.map((d, i) => <p key={`${d}-${i}`} style={{ textAlign: 'center', fontSize: '12px', color: t.textSecondary }}>{d}</p>)}
          {Array.from({ length: firstWeekDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: totalDiasNoMes }).map((_, i) => {
            const dia = i + 1;
            const treinou = monthDays.includes(dia);
            return (
              <div key={dia} style={{ aspectRatio: '1 / 1', borderRadius: '999px', border: treinou ? 'none' : `1px solid ${t.border}`, background: treinou ? t.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '12px', color: treinou ? '#fff' : t.textSecondary, fontWeight: treinou ? 700 : 500 }}>{dia}</span>
              </div>
            );
          })}
        </div>
        <CardRodape theme={theme} coachUsername={coachUsername} />
      </div>
    </InstagramCardShell>
  );
}

function CardExercicios({ nomeRotina, exercicios, theme, coachUsername }: ShareCardProps) {
  const t = shareThemeTokens[theme];
  const exerciciosOrdenados = [...exercicios].slice(0, 5).map((ex) => ({
    nome: toTitleCase(ex.nome),
    totalSets: ex.series.length,
    cargaMaxima: Math.max(0, ...ex.series.map((s) => Number(s.peso_atual || 0))),
  }));
  return (
    <InstagramCardShell theme={theme}>
      <div style={{ width: '100%', padding: '64px', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ fontSize: '16px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', color: t.textSecondary }}>{nomeRotina}</p>
        <p style={{ fontSize: '38px', fontWeight: 800, color: t.textPrimary, marginTop: '8px' }}>Exercícios</p>
        <div style={{ marginTop: '24px', display: 'grid', gap: '16px' }}>
          {exerciciosOrdenados.map((ex) => (
            <div key={ex.nome} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${t.border}`, paddingBottom: '10px' }}>
              <div>
                <p style={{ fontSize: '18px', fontWeight: 700, color: t.textPrimary }}>{ex.nome}</p>
                <p style={{ fontSize: '13px', color: t.textSecondary }}>{ex.totalSets} séries</p>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 800, color: t.accent }}>{ex.cargaMaxima}kg</p>
            </div>
          ))}
        </div>
        <CardRodape theme={theme} coachUsername={coachUsername} />
      </div>
    </InstagramCardShell>
  );
}

function CardEvolucao({ comparativo, theme, coachUsername }: ShareCardProps) {
  const t = shareThemeTokens[theme];
  return (
    <InstagramCardShell theme={theme}>
      <div style={{ width: '100%', padding: '64px', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ fontSize: '38px', fontWeight: 800, color: t.textPrimary }}>Evolução</p>
        <p style={{ fontSize: '16px', color: t.textSecondary, marginTop: '8px' }}>vs sessão anterior</p>
        <div style={{ marginTop: '26px', display: 'grid', gap: '16px' }}>
          {comparativo.length === 0 && (
            <div style={{ padding: '18px', borderRadius: '12px', background: t.surface }}>
              <p style={{ fontSize: '16px', color: t.textSecondary }}>Complete mais sessões para ver evolução de carga.</p>
            </div>
          )}
          {comparativo.slice(0, 4).map((item) => {
            const deltaColor = item.delta > 0 ? '#22C55E' : item.delta < 0 ? '#EF4444' : t.textSecondary;
            const deltaText = `${item.delta > 0 ? '+' : ''}${item.delta.toFixed(1)}kg`;
            return (
              <div key={item.nome} style={{ borderBottom: `1px solid ${t.border}`, paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: t.textPrimary }}>{toTitleCase(item.nome)}</p>
                  <p style={{ fontSize: '13px', color: t.textSecondary }}>{item.cargaAnterior.toFixed(1)}kg → {item.cargaAtual.toFixed(1)}kg</p>
                </div>
                <p style={{ fontSize: '24px', fontWeight: 800, color: deltaColor }}>{deltaText}</p>
              </div>
            );
          })}
        </div>
        <CardRodape theme={theme} coachUsername={coachUsername} />
      </div>
    </InstagramCardShell>
  );
}

function CardCoach({ nomeRotina, duracao, volume, sets, coachUsername, exercicios, theme }: ShareCardProps) {
  const t = shareThemeTokens[theme];
  return (
    <InstagramCardShell theme={theme}>
      <div style={{ width: '100%', padding: '64px', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ borderBottom: `1px solid ${t.border}`, paddingBottom: '18px' }}>
          <p style={{ fontSize: '14px', color: t.textSecondary }}>Treinando com</p>
          <p style={{ fontSize: '30px', fontWeight: 800, color: t.textPrimary, marginTop: '4px' }}>{coachUsername.replace('@', '')}</p>
        </div>
        <div style={{ marginTop: '28px' }}>
          <p style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: t.textSecondary, fontWeight: 700 }}>Treino concluído</p>
          <p style={{ fontSize: '46px', fontWeight: 900, color: t.textPrimary, lineHeight: 1.05, marginTop: '10px', textTransform: 'uppercase' }}>{nomeRotina}</p>
          <p style={{ fontSize: '18px', color: t.textSecondary, marginTop: '10px' }}>{exercicios.length} exercícios prescritos</p>
          <div style={{ marginTop: '22px', borderTop: `1px solid ${t.border}`, paddingTop: '16px', display: 'flex', gap: '24px' }}>
            <div><p style={{ fontSize: '12px', color: t.textSecondary }}>Duração</p><p style={{ fontSize: '24px', fontWeight: 800, color: t.textPrimary }}>{formatDuration(duracao)}</p></div>
            <div><p style={{ fontSize: '12px', color: t.textSecondary }}>Volume</p><p style={{ fontSize: '24px', fontWeight: 800, color: t.textPrimary }}>{formatVolume(volume)}</p></div>
            <div><p style={{ fontSize: '12px', color: t.textSecondary }}>Séries</p><p style={{ fontSize: '24px', fontWeight: 800, color: t.textPrimary }}>{sets}</p></div>
          </div>
        </div>
        <CardRodape theme={theme} coachUsername={coachUsername} />
      </div>
    </InstagramCardShell>
  );
}

function CompletionScreenWithExport({
  nomeRotina,
  duracao,
  volume,
  sets,
  exercicios,
  prsCount,
  coachUsername,
}: CompletionScreenProps) {
  const [exporting, setExporting] = useState(false);
  const [shareMode, setShareMode] = useState(false);
  const [feedbackNota, setFeedbackNota] = useState('');
  const [temaAtivo, setTemaAtivo] = useState<ShareTheme>('escuro');
  const [cardAtivo, setCardAtivo] = useState(0);
  const [cardScale, setCardScale] = useState(1);
  const router = useRouter();
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const calcScale = () => {
      const previewWidth = window.innerWidth * 0.85;
      setCardScale(previewWidth / 1080);
    };
    calcScale();
    window.addEventListener('resize', calcScale);
    return () => window.removeEventListener('resize', calcScale);
  }, []);

  const monthDays = [new Date().getDate()];
  const comparativo = exercicios
    .map((ex) => {
      const cargaAtual = Math.max(0, ...ex.series.map((s) => Number(s.peso_atual || 0)));
      const cargaAnterior = Math.max(0, ...ex.series.map((s) => parseCargaAnterior(s.anterior)));
      return {
        nome: ex.nome,
        cargaAnterior,
        cargaAtual,
        delta: cargaAtual - cargaAnterior,
      };
    })
    .filter((c) => c.cargaAnterior > 0)
    .slice(0, 4);

  const cards = [
    {
      id: 'metricas',
      label: 'Métricas',
      render: (theme: ShareTheme) => (
        <CardMetricas
          nomeRotina={nomeRotina}
          duracao={duracao}
          volume={volume}
          sets={sets}
          exercicios={exercicios}
          coachUsername={coachUsername}
          theme={theme}
          monthDays={monthDays}
          comparativo={comparativo}
        />
      ),
    },
    {
      id: 'frequencia',
      label: 'Frequência',
      render: (theme: ShareTheme) => (
        <CardFrequencia
          nomeRotina={nomeRotina}
          duracao={duracao}
          volume={volume}
          sets={sets}
          exercicios={exercicios}
          coachUsername={coachUsername}
          theme={theme}
          monthDays={monthDays}
          comparativo={comparativo}
        />
      ),
    },
    {
      id: 'exercicios',
      label: 'Exercícios',
      render: (theme: ShareTheme) => (
        <CardExercicios
          nomeRotina={nomeRotina}
          duracao={duracao}
          volume={volume}
          sets={sets}
          exercicios={exercicios}
          coachUsername={coachUsername}
          theme={theme}
          monthDays={monthDays}
          comparativo={comparativo}
        />
      ),
    },
    {
      id: 'evolucao',
      label: 'Evolução',
      render: (theme: ShareTheme) => (
        <CardEvolucao
          nomeRotina={nomeRotina}
          duracao={duracao}
          volume={volume}
          sets={sets}
          exercicios={exercicios}
          coachUsername={coachUsername}
          theme={theme}
          monthDays={monthDays}
          comparativo={comparativo}
        />
      ),
    },
    {
      id: 'coach',
      label: 'Coach Card',
      render: (theme: ShareTheme) => (
        <CardCoach
          nomeRotina={nomeRotina}
          duracao={duracao}
          volume={volume}
          sets={sets}
          exercicios={exercicios}
          coachUsername={coachUsername}
          theme={theme}
          monthDays={monthDays}
          comparativo={comparativo}
        />
      ),
    },
  ];

  const exportCardAt = async (index: number) => {
    const cardEl = cardRefs.current[index];
    if (!cardEl) return;
    try {
      setExporting(true);
      const dataUrl = await toPng(cardEl, { pixelRatio: 1, cacheBust: true, width: 1080, height: 1080 });
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = `auron-${cards[index].id}-${temaAtivo}-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Treino ${nomeRotina}` });
      } else {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Erro ao exportar card:', error);
      alert('Não foi possível gerar o card agora. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  const downloadCard = async (index: number) => {
    const cardEl = cardRefs.current[index];
    if (!cardEl) return;
    try {
      setExporting(true);
      const dataUrl = await toPng(cardEl, { pixelRatio: 1, cacheBust: true, width: 1080, height: 1080 });
      const fileName = `auron-treino-${cards[index].id}-${temaAtivo}-${Date.now()}.png`;
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Erro ao baixar card:', error);
      alert('Não foi possível salvar o card agora. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };
  if (!shareMode) {
    return (
      <div className="flex flex-col min-h-screen bg-surface-0 px-4 pb-8">
        <div className="flex flex-col items-center pt-12 pb-6">
          <Trophy className="w-10 h-10 text-success mb-3" weight="duotone" />
          <h1 className="text-xl font-bold text-text-primary">Treino concluído!</h1>
          <p className="text-xs text-text-muted mt-1 font-mono tabular-nums">
            {formatVolume(volume)} · {formatDuration(duracao)} · {sets} séries
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-surface-1 border border-border-subtle rounded-lg p-3 flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted">Duração</span>
            <span className="text-lg font-bold font-mono tabular-nums text-text-primary">{formatDuration(duracao)}</span>
          </div>
          <div className="bg-surface-1 border border-border-subtle rounded-lg p-3 flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted">Volume</span>
            <span className="text-lg font-bold font-mono tabular-nums text-text-primary">{volume}<span className="text-xs font-normal text-text-muted ml-0.5">kg</span></span>
          </div>
          <div className="bg-surface-1 border border-border-subtle rounded-lg p-3 flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted">Séries</span>
            <span className="text-lg font-bold font-mono tabular-nums text-text-primary">{sets}</span>
          </div>
        </div>

        <div className="mb-5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted block mb-1.5">
            Como foi o treino? (opcional)
          </label>
          <textarea
            value={feedbackNota}
            onChange={(e) => setFeedbackNota(e.target.value.slice(0, 300))}
            placeholder="Deixe uma nota sobre essa sessão..."
            className="w-full min-h-[80px] max-h-[140px] resize-none bg-surface-1 border border-border-subtle rounded-lg p-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            maxLength={300}
          />
        </div>

        <div className="flex flex-col gap-2 mt-auto">
          <button
            onClick={() => setShareMode(true)}
            className="w-full h-[52px] bg-brand hover:bg-brand-hover rounded-lg text-[15px] font-semibold text-white flex items-center justify-center gap-2 transition-colors duration-120"
          >
            <ShareNetwork className="w-4 h-4" />
            Compartilhar treino
          </button>
          <button
            onClick={() => router.push('/aluno/treinos')}
            className="w-full h-11 rounded-lg text-sm font-medium text-text-muted hover:text-text-primary transition-colors duration-120"
          >
            Ir para treinos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-0">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => setShareMode(false)}
          className="w-8 h-8 rounded-md bg-surface-1 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-text-secondary" />
        </button>
        <h2 className="text-sm font-semibold text-text-primary">Compartilhar treino</h2>
        <div className="w-8" />
      </div>

      <div className="relative">
        <div
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-3 scroll-smooth scrollbar-hide"
          onScroll={(e) => {
            const el = e.currentTarget;
            const cardWidth = el.clientWidth * 0.85 + 12;
            const nextIndex = Math.max(0, Math.min(cards.length - 1, Math.round(el.scrollLeft / cardWidth)));
            setCardAtivo(nextIndex);
          }}
        >
          {cards.map((card, i) => (
            <div key={card.id} className="flex-shrink-0 w-[85vw] snap-center rounded-xl overflow-hidden aspect-square">
              {/* Container que faz o scale do card 1080x1080 fixo */}
              <div style={{
                width: '85vw',
                aspectRatio: '1/1',
                overflow: 'hidden',
                borderRadius: 12,
                position: 'relative',
              }}>
                <div style={{
                  width: 1080,
                  height: 1080,
                  transform: `scale(${cardScale})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}>
                  {card.render(temaAtivo)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-1.5 mt-1">
          {cards.map((card, i) => (
            <div
              key={card.id}
              className={cn(
                'rounded-full transition-all duration-200',
                i === cardAtivo ? 'w-4 h-1.5 bg-brand' : 'w-1.5 h-1.5 bg-border-default',
              )}
            />
          ))}
        </div>
      </div>

      <div className="px-4 mt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-2">Tema</p>
        <div className="flex gap-2">
          {(['escuro', 'claro', 'transparente'] as ShareTheme[]).map((tema) => (
            <button
              key={tema}
              onClick={() => setTemaAtivo(tema)}
              className={cn(
                'flex-1 h-9 rounded-md text-xs font-medium border transition-all duration-120',
                temaAtivo === tema
                  ? 'bg-surface-0 border-brand text-brand shadow-sm'
                  : 'bg-surface-1 border-border-subtle text-text-muted',
              )}
            >
              {tema.charAt(0).toUpperCase() + tema.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 flex flex-col gap-2 pb-8">
        {/* Compartilhar — primário */}
        <button
          onClick={() => exportCardAt(cardAtivo)}
          disabled={exporting}
          className="w-full h-[52px] bg-brand hover:bg-brand-hover rounded-lg flex items-center justify-center gap-2 text-[15px] font-semibold text-white disabled:opacity-50 transition-colors"
        >
          <ShareNetwork className="w-4 h-4" />
          Compartilhar este card
        </button>

        {/* Download — secundário */}
        <button
          onClick={() => downloadCard(cardAtivo)}
          disabled={exporting}
          className="w-full h-11 bg-surface-1 border border-border-subtle rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-text-primary disabled:opacity-50 hover:bg-surface-2 transition-colors"
        >
          <Download className="w-4 h-4 text-text-secondary" />
          Salvar imagem
        </button>

        {/* Pular */}
        <button
          onClick={() => router.push('/aluno/treinos')}
          className="w-full h-10 text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          Pular
        </button>
      </div>

      <div className="absolute -top-[9999px] -left-[9999px] pointer-events-none">
        {cards.map((card, i) => (
          <div
            key={`export-${card.id}`}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            style={{ width: 1080, height: 1080 }}
          >
            {card.render(temaAtivo)}
          </div>
        ))}
      </div>
    </div>
  );
}

