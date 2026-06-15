'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Trophy, Play, X, Clock, CaretLeft, CaretRight, Video, Download, ShareNetwork } from '@phosphor-icons/react';
import html2canvas from 'html2canvas';
import { supabaseClient } from '@/lib/supabaseClient';
import { YouTubePlayer } from '@/app/components/YouTubePlayer';
import { formatDuration, formatVolume } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { haptic } from '@/lib/utils/haptics';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import CompletionCard from './completion-card';
import { useExportWorkoutCard } from './use-export-card';
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
  observacoes?: string;
  grupo_muscular?: string;
  series: SerieState[];
}

interface VolumePoint {
  data: string;
  volume: number;
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
    <div className={cn(
      'flex items-center gap-1.5 py-2 px-4 transition-colors',
      serie.completado ? 'opacity-100' : 'opacity-100',
    )}>
      {/* Número da série */}
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
        serie.completado ? 'bg-success text-white' : 'bg-surface-3 text-text-secondary'
      )}>
        {idx + 1}
      </div>

      {/* Anterior */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-[10px] font-mono tabular-nums',
          serie.completado ? 'text-text-disabled line-through' : 'text-text-disabled/60'
        )}>
          {serie.anterior || '—'}
        </p>
      </div>

      {/* Peso */}
      <input
        type="number"
        inputMode="decimal"
        value={serie.peso_atual || ''}
        onChange={(e) => onPesoChange(parseFloat(e.target.value) || 0)}
        disabled={!treinoIniciado || serie.completado}
        placeholder="0"
        className={cn(
          'w-12 h-7 rounded-lg text-center text-[10px] font-bold tabular-nums',
          'bg-transparent border-b border-border-subtle',
          'text-text-primary focus:border-brand focus:outline-none',
          'disabled:opacity-50 px-1'
        )}
      />

      {/* Reps */}
      <div className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
      )}>
        <span className={cn(
          'text-[10px] font-bold',
          serie.completado ? 'text-success' : 'text-brand'
        )}>{serie.reps}</span>
      </div>

      {/* Técnica 1 (principal) - 2 letras */}
      <div className="w-6 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold text-text-secondary leading-tight text-center">
          {duasLetrasTenica(serie.tecnica)}
        </span>
      </div>

      {/* Técnica 2 (extra) - abreviada */}
      <div className="w-6 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold text-brand leading-tight text-center">
          {abreviarTecnica(serie.tecnica_extra)}
        </span>
      </div>

      {/* Check */}
      <button
        onClick={onCheck}
        disabled={!treinoIniciado}
        className={cn(
          'w-7 h-7 rounded-xl flex items-center justify-center transition-all active:scale-90 flex-shrink-0',
          'disabled:opacity-30',
          serie.completado
            ? 'bg-success text-white'
            : 'bg-surface-3 border border-border-default text-text-tertiary hover:border-brand'
        )}
      >
        <Check className="w-3 h-3" weight="bold" />
      </button>
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
      'rounded-2xl border transition-colors',
      all ? 'bg-success-subtle/20 border-success-border' : 'bg-surface-1 border-border-subtle'
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-text-primary uppercase tracking-tight">{exercicio.nome}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="w-3 h-3 text-brand" />
            <p className="text-xs text-brand">
              Descanso: {formatDuration(exercicio.descanso)}
            </p>
          </div>
        </div>
        {exercicio.video_url && (
          <button
            onClick={() => onVideoOpen(exercicio.video_url!)}
            className="w-8 h-8 rounded-full bg-surface-3 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-brand hover:border-brand transition-colors flex-shrink-0"
          >
            <Play className="w-3.5 h-3.5" fill="currentColor" />
          </button>
        )}
        {all && (
          <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-white" weight="bold" />
          </div>
        )}
      </div>

      {exercicio.observacoes && (
        <p className="text-xs text-text-secondary px-4 pb-2">{exercicio.observacoes}</p>
      )}

      {/* Cabeçalho de colunas */}
      <div className="flex items-center gap-1.5 px-4 pb-1">
        <span className="w-7 h-7 text-[10px] font-bold uppercase tracking-caps text-text-disabled text-center flex items-center justify-center">Set</span>
        <span className="flex-1 min-w-0 text-[10px] font-bold uppercase tracking-caps text-text-disabled">Ant.</span>
        <span className="w-12 text-[10px] font-bold uppercase tracking-caps text-text-disabled text-center">Peso</span>
        <span className="w-7 text-[10px] font-bold uppercase tracking-caps text-text-disabled text-center">Reps</span>
        <span className="w-6 text-[10px] font-bold uppercase tracking-caps text-text-disabled text-center">Té1</span>
        <span className="w-6 text-[10px] font-bold uppercase tracking-caps text-text-disabled text-center">Té2</span>
        <span className="w-7 text-[10px] font-bold uppercase tracking-caps text-text-disabled text-center">✓</span>
      </div>

      {/* Séries */}
      <div className="pb-3 divide-y divide-border-subtle/40">
        {exercicio.series.map((serie, idx) => (
          <div
            key={serie.ordem}
            className={cn(
              'transition-colors',
              serie.completado ? 'bg-success/10 rounded-xl my-0.5' : ''
            )}
          >
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

      // Buscar grupos musculares da biblioteca
      const exercicioIds = exerciciosConfig.map(ex => ex.id).filter(Boolean);
      let gruposMusculares: Record<string, string> = {};
      if (exercicioIds.length > 0) {
        const { data: bibData } = await supabaseClient
          .from('exercicios_biblioteca')
          .select('id, grupo_muscular')
          .in('id', exercicioIds);

        gruposMusculares = Object.fromEntries(
          (bibData || []).map(ex => [ex.id, ex.grupo_muscular || ''])
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
            className="w-9 h-9 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-text-primary truncate uppercase">{nomeRotina}</h1>
            {treinoIniciado && (
              <p className="text-xs text-text-tertiary">{setsCompletos}/{totalSets} sets</p>
            )}
          </div>

          {treinoIniciado && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfirmAbandon(true)}
                className="w-9 h-9 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-destructive transition-colors flex-shrink-0"
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
                className="h-9 px-4 bg-brand text-text-on-brand rounded-xl text-xs font-bold uppercase tracking-caps shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {saving ? '...' : 'Finish'}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Conteúdo ── */}
      <main className="px-4 py-5 max-w-lg mx-auto flex flex-col gap-4">

        {/* Preview: gráfico + botão iniciar */}
        {!treinoIniciado && (
          <>
            {/* Botão iniciar */}
            <button
              onClick={iniciarTreino}
              className="w-full h-14 rounded-2xl font-bold text-sm uppercase tracking-caps bg-brand text-text-on-brand shadow-lg shadow-brand/30 transition-all active:scale-95"
            >
              Iniciar Treino
            </button>

            {/* Gráfico de volume */}
            {volumeHistory.length >= 2 && (
              <div className="bg-surface-1 border border-border-subtle rounded-2xl p-4">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Progresso de Volume</p>
                    {volumeHistory.length > 0 && (
                      <p className="text-lg font-bold text-text-primary mt-0.5">
                        {formatVolume(volumeHistory[volumeHistory.length - 1].volume)}
                        <span className="text-2xs text-brand ml-1.5">{volumeHistory[volumeHistory.length - 1].data}</span>
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
          </>
        )}

        {/* Banner treino em andamento */}
        {treinoIniciado && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-success-subtle border border-success-border rounded-xl">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse flex-shrink-0" />
            <p className="text-xs text-success font-medium flex-1">Treino em andamento</p>
            <button
              onClick={() => abrirModalExercicio(exercicios.findIndex(ex => ex.series.some(s => !s.completado)))}
              className="text-2xs font-semibold text-brand uppercase tracking-caps hover:underline"
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
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => restAddSecs(-15)}
              className="w-14 h-12 bg-surface-2 border border-border-subtle rounded-xl text-sm font-bold text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
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
                <p className="font-mono text-3xl font-bold text-text-primary tabular-nums">
                  {Math.floor(restRemaining / 60).toString().padStart(2, '0')}:{(restRemaining % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>

            <button
              onClick={() => restAddSecs(15)}
              className="w-14 h-12 bg-surface-2 border border-border-subtle rounded-xl text-sm font-bold text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
            >
              +15
            </button>

            <button
              onClick={restSkip}
              className="h-12 px-5 bg-brand text-text-on-brand rounded-xl text-sm font-bold shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity flex-shrink-0"
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
          {/* Header do modal */}
          <div className="flex items-center gap-3 px-4 pt-safe-top pt-4 pb-3 bg-surface-1 border-b border-border-subtle flex-shrink-0">
            <button
              onClick={() => setModalExIdx(null)}
              className="w-9 h-9 rounded-xl bg-surface-3 border border-border-subtle flex items-center justify-center text-text-secondary flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-2xs font-semibold uppercase tracking-caps text-brand mb-0.5">
                Exercício {(modalExIdx ?? 0) + 1}/{exercicios.length}
              </p>
              <h2 className="text-sm font-bold text-text-primary uppercase leading-tight truncate">{modalEx.nome}</h2>
            </div>
            {modalEx.video_url && (
              <button
                onClick={() => setVideoUrl(modalEx.video_url || null)}
                className="w-9 h-9 rounded-xl bg-brand-subtle border border-brand-border flex items-center justify-center text-brand flex-shrink-0"
              >
                <Play className="w-4 h-4" fill="currentColor" />
              </button>
            )}
          </div>

          {/* Corpo do modal */}
          <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">

            {/* Progresso da série */}
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Série</span>
              <span className="text-2xl font-bold text-text-primary">
                {modalSerieIdx + 1}<span className="text-sm text-text-tertiary">/{modalEx.series.length}</span>
              </span>
            </div>
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-300"
                style={{ width: `${((modalSerieIdx + 1) / modalEx.series.length) * 100}%` }}
              />
            </div>

            {/* Stats da série */}
            <div className={cn('grid gap-3', (modalSerie.tecnica || modalSerie.tecnica_extra) ? 'grid-cols-3' : 'grid-cols-2')}>
              <div className="bg-surface-1 border border-border-subtle rounded-2xl p-4 text-center">
                <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-1">Repetições</p>
                <p className="text-3xl font-bold text-brand">{modalSerie.reps}</p>
              </div>
              <div className="bg-surface-1 border border-border-subtle rounded-2xl p-4 text-center">
                <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-1">Última vez</p>
                <p className="text-sm font-mono text-text-secondary mt-1">{modalSerie.anterior || '—'}</p>
              </div>
              {(modalSerie.tecnica || modalSerie.tecnica_extra) && (
                <div className="bg-brand/10 border border-brand-border rounded-2xl p-4 text-center">
                  <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-1">Técnica</p>
                  <p className="text-sm font-bold text-brand">{modalSerie.tecnica_extra || modalSerie.tecnica}</p>
                </div>
              )}
            </div>

            {/* Ajuste de carga */}
            <div className="bg-surface-1 border border-border-subtle rounded-2xl p-4">
              <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-3">Carga (kg)</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const newVal = Math.max(0, modalCarga - 2.5);
                    setModalCarga(newVal);
                    setModalCargaStr(String(newVal));
                  }}
                  className="w-14 h-14 bg-surface-3 border border-border-subtle rounded-xl text-xl font-bold text-text-primary hover:border-brand/40 transition-colors flex-shrink-0"
                >
                  −
                </button>
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
                  className="flex-1 h-14 bg-surface-0 border border-border-subtle rounded-xl text-center text-2xl font-bold text-text-primary focus:border-brand/40 outline-none"
                />
                <button
                  onClick={() => {
                    const newVal = modalCarga + 2.5;
                    setModalCarga(newVal);
                    setModalCargaStr(String(newVal));
                  }}
                  className="w-14 h-14 bg-brand text-text-on-brand rounded-xl text-xl font-bold shadow-sm shadow-brand/30 hover:opacity-90 flex-shrink-0"
                >
                  +
                </button>
              </div>
            </div>

            {/* Séries anteriores do exercício */}
            <div className="bg-surface-1 border border-border-subtle rounded-2xl overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border-subtle/50">
                <span className="w-7 h-7 text-[10px] font-bold uppercase tracking-caps text-text-disabled text-center flex items-center justify-center">Set</span>
                <span className="flex-1 min-w-0 text-[10px] font-bold uppercase tracking-caps text-text-disabled">Ant.</span>
                <span className="w-12 text-[10px] font-bold uppercase tracking-caps text-text-disabled text-center">Peso</span>
                <span className="w-7 text-[10px] font-bold uppercase tracking-caps text-text-disabled text-center">Reps</span>
                <span className="w-6 text-[10px] font-bold uppercase tracking-caps text-text-disabled text-center">Té1</span>
                <span className="w-6 text-[10px] font-bold uppercase tracking-caps text-text-disabled text-center">Té2</span>
              </div>
              {modalEx.series.map((s, idx) => {
                const isAtual = idx === modalSerieIdx;
                return (
                  <div
                    key={s.ordem}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 border-b border-border-subtle/30 last:border-0',
                      s.completado ? 'bg-success/10' : isAtual ? 'bg-brand/5' : ''
                    )}
                  >
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                      s.completado ? 'bg-success text-white' : isAtual ? 'bg-brand text-white' : 'bg-surface-3 text-text-secondary'
                    )}>
                      {idx + 1}
                    </div>
                    <span className="flex-1 min-w-0 text-[10px] font-mono text-text-disabled/60 truncate">{s.anterior || '—'}</span>
                    <span className="w-12 text-[10px] font-bold text-text-primary text-center">{isAtual ? modalCarga || '—' : s.peso_atual || '—'}</span>
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                      s.completado ? 'bg-success-subtle' : isAtual ? 'bg-brand/10' : ''
                    )}>
                      <span className={cn(
                        'text-xs font-bold',
                        s.completado ? 'text-success' : isAtual ? 'text-brand' : 'text-text-tertiary'
                      )}>{s.reps}</span>
                    </div>
                    <div className="w-6 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-text-secondary">{duasLetrasTenica(s.tecnica)}</span>
                    </div>
                    <div className="w-6 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-brand">{abreviarTecnica(s.tecnica_extra)}</span>
                    </div>
                    {s.completado && <Check className="w-3 h-3 text-success flex-shrink-0" weight="bold" />}
                    {isAtual && !s.completado && <div className="w-2 h-2 rounded-full bg-brand animate-pulse flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botão de ação */}
          <div className="px-4 pb-safe-bottom pb-6 pt-3 bg-surface-1 border-t border-border-subtle flex-shrink-0">

            {/* Rest timer — aparece aqui quando descanso está ativo */}
            {restActive && (
              <div className="mb-3 bg-surface-2 border border-border-subtle rounded-2xl px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                  <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Descanso</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => restAddSecs(-15)}
                    className="w-12 h-10 bg-surface-3 border border-border-subtle rounded-xl text-sm font-bold text-text-secondary flex-shrink-0"
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
                    className="w-12 h-10 bg-surface-3 border border-border-subtle rounded-xl text-sm font-bold text-text-secondary flex-shrink-0"
                  >
                    +15
                  </button>
                  <button
                    onClick={restSkip}
                    className="h-10 px-4 bg-brand text-text-on-brand rounded-xl text-sm font-bold shadow-sm shadow-brand/30 flex-shrink-0"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={concluirSerieModal}
              disabled={restActive}
              className="w-full h-14 bg-brand text-text-on-brand rounded-2xl font-bold text-sm uppercase tracking-caps shadow-lg shadow-brand/30 hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {modalSerieIdx >= modalEx.series.length - 1
                ? modalExIdx !== null && modalExIdx >= exercicios.length - 1
                  ? '✓ Concluir Treino'
                  : '✓ Concluir Exercício'
                : `Concluir Série ${modalSerieIdx + 1}/${modalEx.series.length}`
              }
            </button>
            {modalExIdx !== null && modalExIdx < exercicios.length - 1 && modalSerieIdx >= modalEx.series.length - 1 && (
              <button
                onClick={() => { setModalExIdx(null); }}
                className="w-full h-10 mt-2 text-text-tertiary text-xs hover:text-text-secondary transition-colors"
              >
                Fechar e voltar à lista
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── YouTube player ── */}
      {videoUrl && <YouTubePlayer videoUrl={videoUrl} onClose={() => setVideoUrl(null)} />}
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
  const [showPreview, setShowPreview] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string | null>>({
    dark: null,
    light: null,
    transparent: null,
  });
  const { exportCard, exportAllCards, shareToGallery } = useExportWorkoutCard();
  const router = useRouter();

  const exportOptions = {
    nomeRotina,
    duracao,
    volume,
    sets,
    exercicios: exercicios.map(ex => ({
      nome: ex.nome,
      grupo_muscular: ex.grupo_muscular,
      series: ex.series,
    })),
    prsCount,
    coachUsername,
  };

  // Carregar previews quando modal abre
  useEffect(() => {
    if (!showPreview) return;

    const loadPreviews = async () => {
      const newPreviews = { ...previews };
      const themes: Array<'dark' | 'light' | 'transparent'> = ['dark', 'light', 'transparent'];

      for (const theme of themes) {
        const element = document.getElementById(`card-${theme}`);
        if (element) {
          try {
            const canvas = await html2canvas(element, {
              scale: 1.5,
              backgroundColor: theme === 'transparent' ? null : undefined,
              logging: false,
              useCORS: true,
              allowTaint: true,
            });
            newPreviews[theme] = canvas.toDataURL('image/png');
          } catch (error) {
            console.error(`Erro ao gerar preview ${theme}:`, error);
          }
        }
      }
      setPreviews(newPreviews);
    };

    loadPreviews();
  }, [showPreview]);

  const handleExportSingle = async (theme: 'dark' | 'light' | 'transparent') => {
    setExporting(true);
    await exportCard(theme, exportOptions);
    setExporting(false);
  };

  const handleShareToGallery = async (theme: 'dark' | 'light' | 'transparent') => {
    setExporting(true);
    await shareToGallery(theme, exportOptions);
    setExporting(false);
  };

  const handleExportAll = async () => {
    setExporting(true);
    await exportAllCards(exportOptions);
    setExporting(false);
  };

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4 pb-24">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-success-subtle border-2 border-success flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Treino concluído!</h2>
          <p className="text-text-secondary">
            {formatVolume(volume)} · {formatDuration(duracao)} · {sets} sets
          </p>
        </div>

        {/* Cards Preview */}
        <div className="mb-8 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-caps text-text-tertiary mb-4">
            Exportar para redes sociais
          </h3>

          {/* Dark Card */}
          <div className="bg-surface-1 border border-border-subtle rounded-2xl p-4 flex items-start gap-4">
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
              <div id="card-dark">
                <CompletionCard
                  theme="dark"
                  nomeRotina={nomeRotina}
                  duracao={duracao}
                  volume={volume}
                  sets={sets}
                  exercicios={exercicios}
                  prsCount={prsCount}
                  coachUsername={coachUsername}
                />
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-surface-2 flex-shrink-0 flex items-center justify-center">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#0F1419',
                  borderRadius: '8px',
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary mb-1">Tema Escuro</p>
              <p className="text-xs text-text-tertiary">Fundo preto, letras brancas</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleShareToGallery('dark')}
                disabled={exporting}
                className="w-10 h-10 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-brand hover:border-brand transition-colors disabled:opacity-50"
                title="Salvar na galeria"
              >
                <ShareNetwork className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleExportSingle('dark')}
                disabled={exporting}
                className="w-10 h-10 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-brand hover:border-brand transition-colors flex-shrink-0 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Light Card */}
          <div className="bg-surface-1 border border-border-subtle rounded-2xl p-4 flex items-start gap-4">
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
              <div id="card-light">
                <CompletionCard
                  theme="light"
                  nomeRotina={nomeRotina}
                  duracao={duracao}
                  volume={volume}
                  sets={sets}
                  exercicios={exercicios}
                  prsCount={prsCount}
                  coachUsername={coachUsername}
                />
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-surface-2 flex-shrink-0 flex items-center justify-center border border-border-subtle">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary mb-1">Tema Claro</p>
              <p className="text-xs text-text-tertiary">Fundo branco, letras pretas</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleShareToGallery('light')}
                disabled={exporting}
                className="w-10 h-10 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-brand hover:border-brand transition-colors disabled:opacity-50"
                title="Salvar na galeria"
              >
                <ShareNetwork className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleExportSingle('light')}
                disabled={exporting}
                className="w-10 h-10 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-brand hover:border-brand transition-colors flex-shrink-0 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Transparent Card */}
          <div className="bg-surface-1 border border-border-subtle rounded-2xl p-4 flex items-start gap-4">
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
              <div id="card-transparent">
                <CompletionCard
                  theme="transparent"
                  nomeRotina={nomeRotina}
                  duracao={duracao}
                  volume={volume}
                  sets={sets}
                  exercicios={exercicios}
                  prsCount={prsCount}
                  coachUsername={coachUsername}
                />
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-surface-2 flex-shrink-0 flex items-center justify-center border border-dashed border-border-subtle">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(176,176,176,0.1) 10px, rgba(176,176,176,0.1) 20px)',
                  borderRadius: '8px',
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary mb-1">Tema Transparente</p>
              <p className="text-xs text-text-tertiary">Fundo transparente, letras brancas</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleShareToGallery('transparent')}
                disabled={exporting}
                className="w-10 h-10 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-brand hover:border-brand transition-colors disabled:opacity-50"
                title="Salvar na galeria"
              >
                <ShareNetwork className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleExportSingle('transparent')}
                disabled={exporting}
                className="w-10 h-10 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-brand hover:border-brand transition-colors flex-shrink-0 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => setShowPreview(true)}
            disabled={exporting}
            className="w-full h-12 rounded-xl bg-surface-2 border border-border-subtle text-text-primary font-semibold flex items-center justify-center gap-2 hover:bg-surface-3 transition-colors disabled:opacity-50"
          >
            👁️ Ver preview dos estilos
          </button>
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="w-full h-12 rounded-xl bg-brand text-text-on-brand font-semibold flex items-center justify-center gap-2 hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Baixar os 3 estilos
          </button>
          <button
            onClick={() => router.push('/aluno/treinos')}
            disabled={exporting}
            className="w-full h-12 rounded-xl bg-surface-1 border border-border-subtle text-text-primary font-semibold hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            Ir para treinos
          </button>
        </div>
      </div>

      {/* Modal de Preview */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-surface-0 rounded-t-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface-0 border-b border-border-subtle p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary">Preview dos estilos</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Dark Preview */}
              {previews.dark && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-caps text-text-tertiary mb-2">Tema Escuro</p>
                  <img
                    src={previews.dark}
                    alt="Preview tema escuro"
                    className="w-full rounded-xl border border-border-subtle"
                    style={{ maxHeight: '600px', objectFit: 'contain' }}
                  />
                </div>
              )}

              {/* Light Preview */}
              {previews.light && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-caps text-text-tertiary mb-2">Tema Claro</p>
                  <img
                    src={previews.light}
                    alt="Preview tema claro"
                    className="w-full rounded-xl border border-border-subtle"
                    style={{ maxHeight: '600px', objectFit: 'contain' }}
                  />
                </div>
              )}

              {/* Transparent Preview */}
              {previews.transparent && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-caps text-text-tertiary mb-2">Tema Transparente</p>
                  <div className="w-full rounded-xl border border-dashed border-border-subtle p-2 bg-checkered">
                    <img
                      src={previews.transparent}
                      alt="Preview tema transparente"
                      className="w-full rounded-lg"
                      style={{ maxHeight: '600px', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}

              {/* Loading State */}
              {(!previews.dark || !previews.light || !previews.transparent) && (
                <div className="flex items-center justify-center py-12">
                  <p className="text-text-secondary">Carregando previews...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

