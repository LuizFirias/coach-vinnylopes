"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  Clock, Check, Video, ArrowLeft, X, Play, Trophy,
  Barbell, WarningCircle, FileArrowDown, CircleNotch, Lightning,
} from "@phosphor-icons/react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { YouTubePlayer } from "@/app/components/YouTubePlayer";
import TecnicaInfoModal from "@/app/components/TecnicaInfoModal";
import { CompletionScreenWithExport } from "@/app/aluno/treinos/components/CompletionScreenWithExport";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
} from "recharts";

interface Serie {
  ordem: number;
  anterior: string;
  peso_atual: number;
  reps: string | number;
  tecnica?: string;
  tecnica_extra?: string;
  completado: boolean;
}

interface Exercicio {
  id: string;
  nome: string;
  descanso: string;
  video_url?: string;
  observacoes?: string;
  series: Serie[];
  grupo_biset_id?: string;
  biset_ordem?: 1 | 2;
}

interface FichaTreino {
  id: string;
  nome_rotina: string;
  exercicios: Exercicio[];
}

function calcVolume(exercicios: Exercicio[]): number {
  return exercicios.reduce((acc, ex) =>
    acc + ex.series.reduce((sAcc, s) => {
      if (!s.completado || s.peso_atual <= 0) return sAcc;
      const r = typeof s.reps === "string" ? parseFloat(s.reps) || 0 : s.reps;
      return sAcc + s.peso_atual * r;
    }, 0), 0);
}

function calcSetsCompletos(exercicios: Exercicio[]): number {
  return exercicios.reduce((acc, ex) => acc + ex.series.filter(s => s.completado).length, 0);
}

function FichaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fichaId = searchParams?.get("id");

  const [ficha, setFicha] = useState<FichaTreino | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [videoModal, setVideoModal] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [timerStartAt, setTimerStartAt] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [treinoIniciado, setTreinoIniciado] = useState(false);
  const [volumeHistory, setVolumeHistory] = useState<any[]>([]);

  const [exercicioAtivo, setExercicioAtivo] = useState<number | null>(null);
  const [serieAtual, setSerieAtual] = useState(0);
  const [descansoAtivo, setDescansoAtivo] = useState(false);
  const [descansoExpirado, setDescansoExpirado] = useState(false);
  const [tempoDescanso, setTempoDescanso] = useState(0);
  const [descansoEndAt, setDescansoEndAt] = useState<number | null>(null);
  const [cargaTemporaria, setCargaTemporaria] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [tecnicaInfoModal, setTecnicaInfoModal] = useState<string | null>(null);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [bisetToast, setBisetToast] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [prsCount, setPrsCount] = useState<number>(0);
  const [coachUsername, setCoachUsername] = useState<string>("vinnyloppes");
  const [duracaoFinal, setDuracaoFinal] = useState(0);
  const [volumeFinal, setVolumeFinal] = useState(0);
  const [setsFinal, setSetsFinal] = useState(0);

  const exercicioEmExecucao = (exercicioAtivo !== null && ficha) ? ficha.exercicios[exercicioAtivo] : null;

  // Chave de progresso no localStorage
  const progressKey = fichaId ? `treino_progress_${fichaId}` : null;

  // Suporte para segurar os botões de + e - para incremento rápido
  const startCargaInterval = (increment: boolean) => {
    setCargaTemporaria(prev => Math.max(0, prev + (increment ? 2.5 : -2.5)));
    const timeoutId = setTimeout(() => {
      const intervalId = setInterval(() => {
        setCargaTemporaria(prev => Math.max(0, prev + (increment ? 2.5 : -2.5)));
      }, 150);
      (window as any)._cargaIntervalId = intervalId;
    }, 500);
    (window as any)._cargaTimeoutId = timeoutId;
  };

  const stopCargaInterval = () => {
    if ((window as any)._cargaTimeoutId) clearTimeout((window as any)._cargaTimeoutId);
    if ((window as any)._cargaIntervalId) clearInterval((window as any)._cargaIntervalId);
  };

  useEffect(() => {
    return () => {
      if ((window as any)._cargaTimeoutId) clearTimeout((window as any)._cargaTimeoutId);
      if ((window as any)._cargaIntervalId) clearInterval((window as any)._cargaIntervalId);
    };
  }, []);

  useEffect(() => {
    loadFicha();

    const treinoAtivo = localStorage.getItem(`treino_ativo_${fichaId}`);
    if (treinoAtivo) {
      try {
        const dados = JSON.parse(treinoAtivo);
        setTreinoIniciado(true);
        if (dados.inicio) {
          setTimerStartAt(dados.inicio);
          setSeconds(Math.floor((Date.now() - dados.inicio) / 1000));
        }
      } catch {
        localStorage.removeItem(`treino_ativo_${fichaId}`);
      }
    }
  }, [fichaId]);

  useEffect(() => {
    if (!coachId) return;
    const fetchCoachUsername = async () => {
      try {
        const { data } = await supabaseClient
          .from("profiles")
          .select("coaching_reference")
          .eq("id", coachId)
          .single();
        if (data?.coaching_reference) {
          setCoachUsername(data.coaching_reference);
        }
      } catch (err) {
        console.error("Erro ao obter username do coach:", err);
      }
    };
    fetchCoachUsername();
  }, [coachId]);

  // Persiste o progresso do treino sempre que ficha mudar (apenas se iniciado)
  useEffect(() => {
    if (!treinoIniciado || !progressKey || !ficha) return;
    try {
      const progresso: Record<string, { peso_atual: number; completado: boolean }[]> = {};
      ficha.exercicios.forEach(ex => {
        progresso[ex.id] = ex.series.map(s => ({ peso_atual: s.peso_atual, completado: s.completado }));
      });
      localStorage.setItem(progressKey, JSON.stringify(progresso));
    } catch {
      // localStorage cheio ou bloqueado — ignora silenciosamente
    }
  }, [ficha, treinoIniciado, progressKey]);

  useEffect(() => {
    if (!treinoIniciado || !timerStartAt) return;

    const tick = () => {
      setSeconds(Math.floor((Date.now() - timerStartAt) / 1000));
    };

    tick();
    const interval = setInterval(tick, 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    window.addEventListener("pageshow", tick);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
      window.removeEventListener("pageshow", tick);
    };
  }, [treinoIniciado, timerStartAt]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? hrs + ":" : ""}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalVolume =
    ficha?.exercicios.reduce((acc, ex) => {
      return (
        acc +
        ex.series.filter((s) => s.completado).reduce((sAcc, s) => {
          const reps = typeof s.reps === "string" ? parseFloat(s.reps) || 0 : s.reps;
          return sAcc + s.peso_atual * reps;
        }, 0)
      );
    }, 0) || 0;

  const totalSets =
    ficha?.exercicios.reduce((acc, ex) => acc + ex.series.filter((s) => s.completado).length, 0) || 0;

  const loadFicha = async () => {
    if (!fichaId) { setLoading(false); return; }

    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) { router.push("/login"); return; }

      const { data: fichaData, error: fichaError } = await supabaseClient
        .from("fichas_treino")
        .select("*")
        .eq("id", fichaId)
        .eq("aluno_id", userId)
        .eq("ativo", true)
        .single();

      if (fichaError || !fichaData) { setLoading(false); return; }

      const configuracao = fichaData.configuracao as any;
      const exercicioIds = (configuracao.exercicios || []).map((ex: any) => ex.id).filter(Boolean);

      let historicoMap: Record<string, any> = {};
      let volumePoints: any[] = [];
      let gruposMusculares: Record<string, string> = {};
      if (exercicioIds.length > 0) {
        const { data: historicoRows } = await supabaseClient
          .from("historico_treinos")
          .select("exercicio_id, dados_sessao, data_conclusao")
          .eq("ficha_id", fichaId)
          .eq("aluno_id", userId)
          .order("data_conclusao", { ascending: true });

        // Map for exercise anterior (since sorted ascending, later entries overwrite and represent the latest)
        (historicoRows || []).forEach((row: any) => {
          historicoMap[row.exercicio_id] = row.dados_sessao;
        });

        // Group by day for volumeHistory
        const volumePorDia: Record<string, number> = {};
        (historicoRows || []).forEach((row: any) => {
          const dia = row.data_conclusao?.slice(0, 10) || "";
          const sessao = row.dados_sessao as any;
          const vol = (sessao?.series || []).reduce((acc: number, s: any) => {
            if (!s.completado) return acc;
            const r = parseFloat(String(s.reps)) || 0;
            return acc + (s.peso_atual || 0) * r;
          }, 0);
          volumePorDia[dia] = (volumePorDia[dia] || 0) + vol;
        });

        volumePoints = Object.entries(volumePorDia).map(([data, volume]) => ({
          data: new Date(data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          volume,
        }));

        // Fetch muscle groups from library
        const { data: bibData } = await supabaseClient
          .from("exercicios_biblioteca")
          .select("id, grupo_muscular")
          .in("id", exercicioIds);

        gruposMusculares = Object.fromEntries(
          (bibData || []).map((ex: any) => [ex.id, ex.grupo_muscular || ""])
        );
      }
      setVolumeHistory(volumePoints);

      const exerciciosComHistorico = (configuracao.exercicios || []).map((ex: any) => {
        const historicoEx = historicoMap[ex.id];
        return {
          ...ex,
          grupo_muscular: gruposMusculares[ex.id] || "",
          series: (ex.series || []).map((serie: any, idx: number) => {
            const seriePrev = historicoEx?.series?.[idx];
            const anterior = seriePrev ? `${seriePrev.peso_atual || 0}kg x ${seriePrev.reps || 0}` : "—";
            return {
              ordem: serie.ordem || idx + 1,
              anterior,
              peso_atual: 0,
              reps: serie.reps ?? 0,
              tecnica: serie.tecnica || "",
              tecnica_extra: serie.tecnica_extra
                || (serie.cluster ? "Cluster Set" : null)
                || (serie.drop_set ? "Drop Set" : null)
                || (serie.bi_set ? "Bi-Set" : null)
                || (serie.isometria ? "Isometria" : null)
                || "",
              completado: false,
            };
          }),
        };
      });

      // Restaurar progresso salvo (caso o app tenha sido suspenso em background)
      const savedProgress = fichaId ? localStorage.getItem(`treino_progress_${fichaId}`) : null;
      if (savedProgress) {
        try {
          const progresso: Record<string, { peso_atual: number; completado: boolean }[]> = JSON.parse(savedProgress);
          exerciciosComHistorico.forEach((ex: any) => {
            const exProg = progresso[ex.id];
            if (exProg) {
              ex.series = ex.series.map((s: any, idx: number) => ({
                ...s,
                peso_atual: exProg[idx]?.peso_atual ?? s.peso_atual,
                completado: exProg[idx]?.completado ?? s.completado,
              }));
            }
          });
        } catch {
          localStorage.removeItem(`treino_progress_${fichaId}`);
        }
      }

      setFicha({ id: fichaData.id, nome_rotina: fichaData.nome_rotina, exercicios: exerciciosComHistorico });
      setCoachId(fichaData.coach_id);
    } catch (err) {
      console.error("Erro ao carregar ficha:", err);
    } finally {
      setLoading(false);
    }
  };

  const iniciarTreino = () => {
    setTreinoIniciado(true);
    setTimerStartAt(null);
    setSeconds(0);
    localStorage.setItem(`treino_ativo_${fichaId}`, JSON.stringify({ fichaId, inicio: null, preparadoEm: Date.now() }));
    // Abrir modal do primeiro exercício automaticamente
    if (ficha && ficha.exercicios.length > 0) {
      setExercicioAtivo(0);
      setSerieAtual(0);
      setDescansoAtivo(false);
      setDescansoExpirado(false);
      setTempoDescanso(0);
      setDescansoEndAt(null);
      setCargaTemporaria(ficha.exercicios[0]?.series[0]?.peso_atual || 0);
    }
  };

  const garantirTimerIniciado = () => {
    if (timerStartAt) return;
    const agora = Date.now();
    setTimerStartAt(agora);
    try {
      const treinoAtivo = localStorage.getItem(`treino_ativo_${fichaId}`);
      const dados = treinoAtivo ? JSON.parse(treinoAtivo) : { fichaId };
      localStorage.setItem(`treino_ativo_${fichaId}`, JSON.stringify({ ...dados, inicio: agora }));
    } catch {
      localStorage.setItem(`treino_ativo_${fichaId}`, JSON.stringify({ fichaId, inicio: agora }));
    }
  };

  const handleCheckSerie = (exercicioId: string, serieOrdem: number) => {
    if (treinoIniciado) garantirTimerIniciado();
    setFicha((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercicios: prev.exercicios.map((ex) => {
          if (ex.id !== exercicioId) return ex;
          return {
            ...ex,
            series: ex.series.map((s) => (s.ordem !== serieOrdem ? s : { ...s, completado: !s.completado })),
          };
        }),
      };
    });
  };

  const handleUpdateSerie = (exercicioId: string, serieOrdem: number, field: "peso_atual" | "reps", value: number | string) => {
    setFicha((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercicios: prev.exercicios.map((ex) => {
          if (ex.id !== exercicioId) return ex;
          return {
            ...ex,
            series: ex.series.map((s) => (s.ordem !== serieOrdem ? s : { ...s, [field]: value })),
          };
        }),
      };
    });
  };

  const iniciarExercicio = (index: number) => {
    if (!treinoIniciado) { alert("Inicie o treino primeiro!"); return; }
    garantirTimerIniciado();
    setExercicioAtivo(index);
    setSerieAtual(0);
    setDescansoAtivo(false);
    setDescansoExpirado(false);
    setTempoDescanso(0);
    setDescansoEndAt(null);
    const ex = ficha?.exercicios[index];
    setCargaTemporaria(ex?.series[0] ? ex.series[0].peso_atual || 0 : 0);
  };

  const concluirSerie = () => {
    if (exercicioAtivo === null || !ficha) return;
    const exercicio = ficha.exercicios[exercicioAtivo];
    const serie = exercicio.series[serieAtual];
    handleUpdateSerie(exercicio.id, serie.ordem, "peso_atual", cargaTemporaria);
    handleCheckSerie(exercicio.id, serie.ordem);
    if (serieAtual >= exercicio.series.length - 1) return;

    // Se for o 1º exercício do bi-set, vai DIRETO para o 2º exercício, mesma série, sem descanso
    if (exercicio.grupo_biset_id && exercicio.biset_ordem === 1) {
      const parceiroIdx = ficha.exercicios.findIndex(
        (e) => e.grupo_biset_id === exercicio.grupo_biset_id && e.id !== exercicio.id
      );
      if (parceiroIdx !== -1) {
        const parceiro = ficha.exercicios[parceiroIdx];
        setExercicioAtivo(parceiroIdx);
        // Mantém a mesma série (serieAtual)
        const cargaParceiro = parceiro.series[serieAtual]?.peso_atual || 0;
        setCargaTemporaria(cargaParceiro);

        // Feedback visual
        setBisetToast(`Agora: ${parceiro.nome}`);
        setTimeout(() => setBisetToast(null), 2000);
        return;
      }
    }

    const descansoStr = exercicio.descanso || "1:30";
    let tempoTotal = 90;
    if (descansoStr.includes(":")) {
      const [min, seg] = descansoStr.split(":").map(Number);
      tempoTotal = (isNaN(min) ? 0 : min) * 60 + (isNaN(seg) ? 0 : seg || 0);
    } else {
      const num = parseInt(descansoStr);
      if (!isNaN(num)) tempoTotal = num;
    }
    setTempoDescanso(tempoTotal);
    setDescansoEndAt(Date.now() + tempoTotal * 1000);
    setDescansoAtivo(true);
    setRestTimer(60);
  };

  const concluirExercicio = () => {
    if (exercicioAtivo === null || !ficha) return;
    const exercicio = ficha.exercicios[exercicioAtivo];
    const serie = exercicio.series[serieAtual];
    handleUpdateSerie(exercicio.id, serie.ordem, "peso_atual", cargaTemporaria);
    handleCheckSerie(exercicio.id, serie.ordem);

    // Se for o 1º exercício do bi-set, vai DIRETO para a última série do 2º exercício
    if (exercicio.grupo_biset_id && exercicio.biset_ordem === 1) {
      const parceiroIdx = ficha.exercicios.findIndex(
        (e) => e.grupo_biset_id === exercicio.grupo_biset_id && e.id !== exercicio.id
      );
      if (parceiroIdx !== -1) {
        const parceiro = ficha.exercicios[parceiroIdx];
        setExercicioAtivo(parceiroIdx);
        // Mantém a mesma última série
        const cargaParceiro = parceiro.series[serieAtual]?.peso_atual || 0;
        setCargaTemporaria(cargaParceiro);

        // Feedback visual
        setBisetToast(`Agora: ${parceiro.nome}`);
        setTimeout(() => setBisetToast(null), 2000);
        return;
      }
    }

    if (exercicioAtivo < ficha.exercicios.length - 1) {
      setRestTimer(60);
      iniciarExercicio(exercicioAtivo + 1);
    } else {
      setExercicioAtivo(null);
      alert("Parabéns! Você completou todos os exercícios!");
    }
  };

  const proximaSerie = () => {
    if (exercicioAtivo === null || !ficha) return;
    const exercicio = ficha.exercicios[exercicioAtivo];

    // Se for o 2º exercício do bi-set e acabamos de descansar, retornamos para a próxima série do 1º exercício do bi-set
    if (exercicio.grupo_biset_id && exercicio.biset_ordem === 2) {
      const parceiroIdx = ficha.exercicios.findIndex(
        (e) => e.grupo_biset_id === exercicio.grupo_biset_id && e.id !== exercicio.id
      );
      if (parceiroIdx !== -1) {
        const parceiro = ficha.exercicios[parceiroIdx];
        if (serieAtual < parceiro.series.length - 1) {
          setExercicioAtivo(parceiroIdx);
          setSerieAtual(serieAtual + 1);
          setDescansoAtivo(false);
          setDescansoExpirado(false);
          setTempoDescanso(0);
          setDescansoEndAt(null);
          const prox = parceiro.series[serieAtual + 1];
          if (prox) setCargaTemporaria(prox.peso_atual || 0);

          setBisetToast(`Agora: ${parceiro.nome}`);
          setTimeout(() => setBisetToast(null), 2000);
          return;
        }
      }
    }

    if (serieAtual < exercicio.series.length - 1) {
      setSerieAtual(serieAtual + 1);
      setDescansoAtivo(false);
      setDescansoExpirado(false);
      setTempoDescanso(0);
      setDescansoEndAt(null);
      const prox = exercicio.series[serieAtual + 1];
      if (prox) setCargaTemporaria(prox.peso_atual || cargaTemporaria);
    }
  };

  useEffect(() => {
    if (!descansoAtivo || !descansoEndAt) return;
    const tick = () => {
      const restante = Math.max(0, Math.ceil((descansoEndAt - Date.now()) / 1000));
      setTempoDescanso(restante);
      if (restante <= 0) setDescansoExpirado(true);
    };
    tick();
    const timer = setInterval(tick, 250);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, [descansoAtivo, descansoEndAt]);

  const formatarTempoDescanso = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  useEffect(() => {
    if (restTimer === null || restTimer <= 0) {
      if (restTimer === 0) setRestTimer(null);
      return;
    }
    const t = setTimeout(() => setRestTimer(r => r !== null ? r - 1 : null), 1000);
    return () => clearTimeout(t);
  }, [restTimer]);

  const handleFinalizarTreino = async () => {
    if (!ficha) return;

    // Verificar se há séries incompletas
    const totalSeries = ficha.exercicios.reduce((acc, ex) => acc + ex.series.length, 0);
    const seriesCompletas = ficha.exercicios.reduce((acc, ex) => acc + ex.series.filter(s => s.completado).length, 0);

    if (seriesCompletas < totalSeries) {
      setShowConfirmModal(true);
      return;
    }

    await finalizarTreinoConfirmado();
  };

  const handleDescartarTreino = () => {
    localStorage.removeItem(`treino_ativo_${fichaId}`);
    if (progressKey) localStorage.removeItem(progressKey);
    setTreinoIniciado(false);
    setTimerStartAt(null);
    setSeconds(0);
    setExercicioAtivo(null);
    setDescansoAtivo(false);
    setDescansoExpirado(false);
    setTempoDescanso(0);
    setDescansoEndAt(null);
    setShowDiscardModal(false);
    setShowConfirmModal(false);
    router.push("/aluno/treinos");
  };

  const finalizarTreinoConfirmado = async () => {
    if (!ficha) return;
    setShowConfirmModal(false);
    setSaving(true);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) { setSaving(false); return; }
      const agora = new Date().toISOString();

      // Capturar métricas antes de qualquer reset de state
      const duracaoCapturada = seconds;
      const volumeCapturado = ficha.exercicios.reduce((acc, ex) =>
        acc + ex.series.reduce((sAcc, s) => {
          if (!s.completado || s.peso_atual <= 0) return sAcc;
          const r = typeof s.reps === "string" ? parseFloat(s.reps) || 0 : Number(s.reps);
          return sAcc + s.peso_atual * r;
        }, 0), 0);
      const setsCapturados = ficha.exercicios.reduce((acc, ex) => acc + ex.series.filter(s => s.completado).length, 0);

      const exerciciosValidos = ficha.exercicios.filter(ex => ex.id);
      if (exerciciosValidos.length === 0) throw new Error("Ficha sem exercícios válidos");

      const registros = exerciciosValidos.map((exercicio) => ({
        ficha_id: ficha.id,
        aluno_id: userId,
        exercicio_id: exercicio.id,
        dados_sessao: { nome_rotina: ficha.nome_rotina, nome_exercicio: exercicio.nome, series: exercicio.series, data_sessao: agora },
        data_conclusao: agora,
      }));

      // Tentar insert em lote; se falhar, tentar um a um
      const { error } = await supabaseClient.from("historico_treinos").insert(registros);
      if (error) {
        console.warn("Insert em lote falhou, tentando individualmente:", error);
        let savedCount = 0;
        for (const registro of registros) {
          const { error: rowError } = await supabaseClient.from("historico_treinos").insert(registro);
          if (!rowError) savedCount++;
          else console.error("Erro ao salvar exercício:", rowError);
        }
        if (savedCount === 0) {
          // Nenhum registro salvo — erro real
          throw error;
        }
        // Salvamento parcial: continua para mostrar tela de conclusão
        console.warn(`Apenas ${savedCount}/${registros.length} exercícios salvos.`);
      }

      // Limpar localStorage
      localStorage.removeItem(`treino_ativo_${fichaId}`);
      if (progressKey) localStorage.removeItem(progressKey);

      // Contar PRs batidos hoje (erro aqui não bloqueia a tela de conclusão)
      const hoje = new Date().toISOString().split("T")[0];
      try {
        const { data: prsData } = await supabaseClient
          .from("recordes_pessoais")
          .select("id")
          .eq("aluno_id", userId)
          .gte("conquistado_em", `${hoje}T00:00:00`)
          .lte("conquistado_em", `${hoje}T23:59:59`);
        
        setPrsCount(prsData?.length || 0);
      } catch (prsErr) {
        console.error("Erro ao obter recordes pessoais:", prsErr);
      }

      setDuracaoFinal(duracaoCapturada);
      setVolumeFinal(volumeCapturado);
      setSetsFinal(setsCapturados);
      setSaved(true);
    } catch (err) {
      console.error("Erro ao salvar histórico:", err);
      alert("Erro ao finalizar treino. Verifique sua conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleBaixarPDF = async () => {
    if (!ficha) return;
    setDownloadingPDF(true);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) throw new Error("Sessão inválida");

      const { data: profileData } = await supabaseClient
        .from("profiles")
        .select("coaching_reference, email")
        .eq("id", userId)
        .single();

      const nomeAluno = profileData?.coaching_reference || profileData?.email || "Aluno";
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text("FICHA DE TREINO", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(ficha.nome_rotina, 105, 28, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Atleta: ${nomeAluno}`, 20, 40);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 20, 46);
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 50, 190, 50);

      let currentY = 58;

      ficha.exercicios.forEach((exercicio, index) => {
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(12);
        doc.setTextColor(212, 175, 55);
        doc.text(`${index + 1}. ${exercicio.nome}`, 20, currentY);
        currentY += 6;
        if (exercicio.video_url) {
          doc.setFontSize(8);
          doc.setTextColor(70, 130, 180);
          doc.textWithLink("🎥 Vídeo demonstrativo", 20, currentY, { url: exercicio.video_url });
          currentY += 5;
        }
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        if (exercicio.descanso) { doc.text(`Descanso: ${exercicio.descanso}`, 20, currentY); currentY += 5; }
        if (exercicio.observacoes) {
          const obsLines = doc.splitTextToSize(`Obs: ${exercicio.observacoes}`, 170);
          doc.text(obsLines, 20, currentY);
          currentY += obsLines.length * 5;
        }
        const hasTecnica = exercicio.series.some(s => !!s.tecnica?.trim());
        const hasTecnicaExtra = exercicio.series.some(s => !!s.tecnica_extra?.trim());

        const tableData = exercicio.series.map((serie) => {
          const row: any[] = [serie.ordem, serie.anterior || "-", "-", serie.reps || "-"];
          if (hasTecnica) row.push(serie.tecnica || '-');
          if (hasTecnicaExtra) row.push(serie.tecnica_extra || '-');
          return row;
        });
        const headers = ["Série", "Anterior", "Peso (kg)", "Reps"];
        if (hasTecnica) headers.push('TÉC');
        if (hasTecnicaExtra) headers.push('Técnica Extra');
        autoTable(doc, {
          startY: currentY,
          head: [headers],
          body: tableData,
          theme: "grid",
          headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontSize: 9, fontStyle: "bold" },
          bodyStyles: { fontSize: 9, textColor: [60, 60, 60] },
          margin: { left: 20 },
          tableWidth: 170,
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      });

      const pdfBlob = doc.output("blob");
      const fileName = `${userId}/${Date.now()}_${ficha.nome_rotina.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      const { error: uploadError } = await supabaseClient.storage
        .from("treinos-pdf")
        .upload(fileName, pdfBlob, { contentType: "application/pdf", cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabaseClient.from("treinos_alunos").insert({
        aluno_id: userId, coach_id: coachId || null, url_pdf: fileName,
        nome_arquivo: `${ficha.nome_rotina}.pdf`, data_upload: new Date().toISOString(),
      });
      if (dbError) throw dbError;

      alert("✅ PDF baixado e salvo nos seus protocolos!");
    } catch (err: any) {
      console.error("Erro ao baixar PDF:", err);
      alert("❌ Erro ao gerar PDF: " + (err.message || "Erro desconhecido"));
    } finally {
      setDownloadingPDF(false);
    }
  };

  const renderExercicioCard = (exercicio: Exercicio, exIdx: number, isBisetCard: boolean) => {
    return (
      <div
        key={exercicio.id}
        className={cn(
          "bg-surface-1 rounded-[14px] p-5 flex flex-col gap-4 shadow-sm",
          isBisetCard && "border border-border-subtle/50 shadow-none bg-surface-1/40"
        )}
      >
        {/* Cabeçalho do exercício */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-start gap-2">
            {exercicio.grupo_biset_id && (
              <span className="inline-flex px-1.5 py-0.5 bg-brand/15 text-brand text-[9px] font-extrabold uppercase tracking-caps rounded flex-shrink-0 mt-0.5">
                B-S {exercicio.biset_ordem}/2
              </span>
            )}
            <h3 className="text-[17px] font-semibold text-text-primary leading-[22px] line-clamp-2">
              {exercicio.nome}
            </h3>
          </div>

          <div className="flex items-center justify-between gap-4 mt-0.5">
            <p className="text-2xs text-text-secondary flex items-center gap-1 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
              <span className="whitespace-nowrap">
                {exercicio.grupo_biset_id ? (
                  exercicio.biset_ordem === 1 ? "Sem descanso" : `Descanso: ${exercicio.descanso} (após o par)`
                ) : (
                  `Descanso: ${exercicio.descanso}`
                )}
              </span>
            </p>

            <div className="flex items-center gap-2 flex-shrink-0">
              {exercicio.video_url && (
                <button
                  type="button"
                  onClick={() => setVideoModal(exercicio.video_url || null)}
                  className="w-8 h-8 rounded-full bg-brand-subtle text-brand flex items-center justify-center hover:opacity-85 transition-opacity flex-shrink-0"
                  aria-label="Ver vídeo"
                  title="Ver vídeo"
                >
                  <Play className="w-3.5 h-3.5" weight="fill" />
                </button>
              )}
              {treinoIniciado && (
                <button
                  type="button"
                  onClick={() => iniciarExercicio(exIdx)}
                  className="h-8 px-3.5 bg-brand text-text-on-brand rounded-full text-2xs font-bold shadow-sm shadow-brand/20 hover:opacity-95 transition-all whitespace-nowrap"
                >
                  Executar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Observações do coach */}
        {exercicio.observacoes && (
          <div className="p-3 bg-surface-2 rounded-xl">
            <p className="text-2xs font-bold uppercase tracking-wider text-text-tertiary mb-1">Observações</p>
            <p className="text-xs text-text-secondary leading-relaxed">{exercicio.observacoes}</p>
          </div>
        )}

        {/* Tabela de séries */}
        <div className="flex flex-col">
          {/* Cabeçalho */}
          <div className="grid grid-cols-5 gap-2 pb-2 border-b border-border-subtle text-[10px] font-bold uppercase tracking-wider text-text-secondary text-center">
            <div className="text-left">Set</div>
            <div>Anterior</div>
            <div>Peso</div>
            <div>Reps</div>
            <div className="text-right">Técnica</div>
          </div>

          {/* Linhas */}
          <div className="divide-y divide-border-subtle/30">
            {exercicio.series.map((serie, sIdx) => {
              const temTecnica = serie.tecnica?.trim() || serie.tecnica_extra?.trim();
              const labelTecnica = (serie.tecnica_extra || serie.tecnica || "").trim();

              return (
                <div key={sIdx} className="grid grid-cols-5 gap-2 py-3.5 items-center text-center text-xs">
                  <div className="text-left font-bold text-text-primary">{sIdx + 1}</div>
                  <div className="text-text-secondary font-mono text-xs">{serie.anterior}</div>
                  <div className="text-text-primary font-semibold">
                    {serie.peso_atual > 0 ? `${serie.peso_atual} kg` : '—'}
                  </div>
                  <div className="text-brand font-bold">{serie.reps}</div>
                  <div className="text-right">
                    {temTecnica ? (
                      <button
                        onClick={() => setTecnicaInfoModal(serie.tecnica_extra || serie.tecnica || '')}
                        className="inline-flex px-1.5 py-0.5 bg-brand-subtle border border-brand-border text-[9px] font-bold text-brand rounded hover:opacity-85 transition-opacity whitespace-nowrap truncate max-w-[55px] xs:max-w-[70px] sm:max-w-none"
                        title={labelTecnica}
                      >
                        {labelTecnica}
                      </button>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ─── Loading / Error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Preparando seu treino..." />
      </div>
    );
  }

  if (saved && ficha) {
    return (
      <CompletionScreenWithExport
        nomeRotina={ficha.nome_rotina}
        duracao={duracaoFinal}
        volume={volumeFinal}
        sets={setsFinal}
        exercicios={ficha.exercicios}
        prsCount={prsCount}
        coachUsername={coachUsername}
      />
    );
  }

  if (!ficha) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6 lg:pl-28">
        <div className="bg-surface-1 border border-border-subtle shadow-elev-2 rounded-2xl p-10 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-surface-3 flex items-center justify-center mx-auto mb-5 text-text-tertiary">
            <Barbell className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-text-primary mb-1">Treino não encontrado</p>
          <p className="text-sm text-text-tertiary mb-6">Não conseguimos localizar os detalhes deste treino.</p>
          <Link
            href="/aluno/treinos"
            className="block w-full py-3 bg-brand text-text-on-brand rounded-xl text-xs font-semibold shadow-sm shadow-brand/30 text-center"
          >
            Voltar para Meus Treinos
          </Link>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-32">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            {treinoIniciado ? (
              <button
                onClick={() => setShowExitModal(true)}
                className="inline-flex items-center gap-1.5 text-text-secondary hover:text-brand text-2xs font-bold uppercase tracking-caps transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Sair
              </button>
            ) : (
              <Link
                href="/aluno/treinos"
                className="inline-flex items-center gap-1.5 text-text-secondary hover:text-brand text-2xs font-bold uppercase tracking-caps transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Voltar
              </Link>
            )}

            {/* Stats do treino em andamento */}
            {treinoIniciado && (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-surface-1 rounded-xl text-center min-w-[68px] border-none shadow-sm">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-brand leading-none">Tempo</p>
                  <p className="text-xs font-bold text-text-primary font-mono mt-1 leading-tight">{formatTime(seconds)}</p>
                </div>
                <div className="px-3 py-1.5 bg-surface-1 rounded-xl text-center min-w-[68px] border-none shadow-sm">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary leading-none">Volume</p>
                  <p className="text-xs font-bold text-brand mt-1 leading-tight">
                    {totalVolume}<span className="text-[9px] text-text-tertiary ml-0.5">kg</span>
                  </p>
                </div>
                <div className="px-3 py-1.5 bg-surface-1 rounded-xl text-center min-w-[52px] border-none shadow-sm">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary leading-none">Séries</p>
                  <p className="text-xs font-bold text-text-primary mt-1 leading-tight">{totalSets}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <h1 className="text-[22px] sm:text-2xl font-bold text-text-primary tracking-tight leading-tight">
                {ficha.nome_rotina}
              </h1>
              {!treinoIniciado && (
                <p className="text-xs text-text-secondary mt-1">
                  {ficha.exercicios.length} exercício{ficha.exercicios.length !== 1 ? 's' : ''} planejado{ficha.exercicios.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleBaixarPDF}
                disabled={downloadingPDF}
                className="h-10 px-3.5 bg-surface-1 border border-border-subtle rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary hover:border-border-default transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {downloadingPDF ? <CircleNotch className="w-3.5 h-3.5 animate-spin" /> : <FileArrowDown className="w-3.5 h-3.5" />}
                PDF
              </button>
              {treinoIniciado && (
                <>
                  <button
                    onClick={() => setShowDiscardModal(true)}
                    className="h-10 px-3 bg-surface-1 border border-danger/20 rounded-xl text-xs font-bold text-danger/80 hover:text-danger hover:border-danger/40 transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Descartar
                  </button>
                  <button
                    onClick={handleFinalizarTreino}
                    disabled={saving}
                    className="h-10 px-4 bg-brand text-text-on-brand rounded-xl text-xs font-bold shadow-sm shadow-brand/20 flex items-center gap-1.5 hover:opacity-95 transition-all disabled:opacity-50"
                  >
                    {saving ? <CircleNotch className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {saving ? "Salvando…" : "Concluir"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Gráfico de volume (apenas se não iniciado e se houver histórico) */}
        {!treinoIniciado && volumeHistory.length >= 2 && (
          <div className="bg-surface-1 rounded-[14px] p-5 flex flex-col gap-4 relative overflow-hidden shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Evolução do Volume Semanal</p>
              {volumeHistory.length > 0 && (
                <p className="text-base font-bold text-text-primary mt-1">
                  Último treino: {(volumeHistory[volumeHistory.length - 1].volume / 1000).toFixed(1)}t
                  <span className="text-[10px] font-semibold text-text-tertiary ml-2">({volumeHistory[volumeHistory.length - 1].data})</span>
                </p>
              )}
            </div>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeHistory} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="data" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(1)}t`}
                  />
                  <RechartsTooltip
                    contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: 'var(--text-primary)' }}
                    itemStyle={{ color: 'var(--brand-primary)' }}
                    formatter={(v: number) => [`${(v / 1000).toFixed(1)}t`, 'Volume']}
                  />
                  <Area type="monotone" dataKey="volume" stroke="var(--brand-primary)" strokeWidth={2} fill="url(#volumeGrad)" dot={{ r: 3, fill: 'var(--brand-primary)' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Botão Iniciar Treino Principal (Se não iniciado) ── */}
        {!treinoIniciado && (
          <button
            onClick={iniciarTreino}
            className="btn-primary w-full shadow-gold-glow flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 text-text-on-brand" weight="fill" />
            Iniciar Treino
          </button>
        )}

        {/* Progress bar — exercícios concluídos */}
        {ficha && treinoIniciado && (
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-300"
                style={{ width: `${Math.round((ficha.exercicios.filter(ex => ex.series.every(s => s.completado)).length / ficha.exercicios.length) * 100)}%` }}
              />
            </div>
            <span className="text-2xs text-text-secondary whitespace-nowrap">
              {ficha.exercicios.filter(ex => ex.series.every(s => s.completado)).length}/{ficha.exercicios.length} concluídos
            </span>
          </div>
        )}

        {/* ── Banner: treino iniciado, timer não começou ── */}
        {treinoIniciado && !timerStartAt && (
          <div className="flex items-center gap-3 px-4 py-3 bg-surface-1 border border-border-subtle shadow-sm rounded-[14px]">
            <div className="w-8 h-8 rounded-full bg-brand-subtle flex items-center justify-center text-brand flex-shrink-0 animate-pulse">
              <Lightning className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">Pronto para começar.</span> Clique em "Executar" em qualquer exercício para ligar o cronômetro.
            </p>
          </div>
        )}

        {/* ── Exercícios ── */}
        <div className="flex flex-col gap-4">
          {(() => {
            return ficha.exercicios.map((exercicio, exIdx) => {
              if (exercicio.grupo_biset_id && exercicio.biset_ordem === 2) {
                return null;
              }
              if (exercicio.grupo_biset_id && exercicio.biset_ordem === 1) {
                const partnerIndex = exIdx + 1;
                const partner = ficha.exercicios[partnerIndex];
                if (partner && partner.grupo_biset_id === exercicio.grupo_biset_id) {
                  return (
                    <div key={exercicio.id} className="border border-brand/20 bg-brand/5 p-3 rounded-[20px] space-y-3">
                      {renderExercicioCard(exercicio, exIdx, true)}
                      
                      <div className="flex items-center gap-2 px-4 py-2 bg-brand/10 border border-brand/20 rounded-xl text-brand">
                        <Lightning className="w-4 h-4 flex-shrink-0 animate-pulse" />
                        <span className="text-2xs font-extrabold uppercase tracking-caps">BI-SET (Sem descanso)</span>
                      </div>

                      {renderExercicioCard(partner, partnerIndex, true)}
                    </div>
                  );
                }
              }
              return renderExercicioCard(exercicio, exIdx, false);
            });
          })()}
        </div>

        {/* ── Feedback ── */}
        <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-0.5">Feedback do Treino</h3>
          <p className="text-xs text-text-tertiary mb-4">Apenas seu coach poderá ver este feedback</p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Como foi o treino? Sentiu alguma dor? Conseguiu completar todas as séries?"
            className="w-full px-3 py-2.5 bg-surface-3 border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-disabled focus:border-brand/40 outline-none resize-none mb-3 transition-colors"
            rows={4}
          />
          <button
            onClick={async () => {
              if (!feedback.trim()) { alert("Digite um feedback antes de enviar."); return; }
              if (!coachId || !fichaId) return;
              setSavingFeedback(true);
              try {
                const { data: authData } = await supabaseClient.auth.getUser();
                const userId = authData?.user?.id;
                if (!userId) return;
                const { error } = await supabaseClient.from("feedbacks_treinos").insert({
                  aluno_id: userId, coach_id: coachId, ficha_id: fichaId,
                  feedback: feedback.trim(), tipo: "treino_completo",
                });
                if (error) throw error;
                alert("Feedback enviado com sucesso!");
                setFeedback("");
              } catch (err) {
                console.error("Erro ao salvar feedback:", err);
                alert("Erro ao enviar feedback. Tente novamente.");
              } finally {
                setSavingFeedback(false);
              }
            }}
            disabled={savingFeedback}
            className="w-full h-11 bg-brand text-text-on-brand rounded-xl text-xs font-semibold shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {savingFeedback ? "Enviando…" : "Enviar Feedback"}
          </button>
        </div>

      </div>

      {/* ── Video Modal ── */}
      {videoModal && <YouTubePlayer videoUrl={videoModal} onClose={() => setVideoModal(null)} />}

      {/* ── Técnica Info Modal ── */}
      <TecnicaInfoModal tecnica={tecnicaInfoModal} onClose={() => setTecnicaInfoModal(null)} />

      {/* ── Modal de Confirmação de Finalização ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-surface-1 border border-border-subtle shadow-elev-2 rounded-2xl p-6">
            <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-4">
              <WarningCircle className="w-7 h-7 text-brand" />
            </div>
            <h3 className="text-lg font-bold text-text-primary text-center mb-2">Treino Incompleto</h3>
            <p className="text-sm text-text-secondary text-center mb-6 leading-relaxed">
              Ainda restam séries não finalizadas. Tem certeza que deseja concluir o treino mesmo assim?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={finalizarTreinoConfirmado}
                disabled={saving}
                className="w-full h-11 bg-brand text-text-on-brand rounded-xl text-xs font-semibold shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Finalizando..." : "Sim, Finalizar Treino"}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-full h-11 bg-surface-3 border border-border-subtle text-text-secondary rounded-xl text-xs font-semibold hover:text-text-primary transition-colors"
              >
                Continuar Treinando
              </button>
              <button
                onClick={() => { setShowConfirmModal(false); setShowDiscardModal(true); }}
                className="w-full h-11 border border-danger/30 text-danger/80 rounded-xl text-xs font-semibold hover:text-danger hover:border-danger/50 transition-colors"
              >
                Descartar Treino
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Descarte ── */}
      {showDiscardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-surface-1 border border-danger/30 shadow-elev-2 rounded-2xl p-6">
            <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto mb-4">
              <X className="w-7 h-7 text-danger" />
            </div>
            <h3 className="text-lg font-bold text-text-primary text-center mb-2">Descartar Treino?</h3>
            <p className="text-sm text-text-secondary text-center mb-6 leading-relaxed">
              Nenhuma métrica será salva e o progresso atual será perdido.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDescartarTreino}
                className="w-full h-11 bg-danger text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Sim, Descartar Treino
              </button>
              <button
                onClick={() => setShowDiscardModal(false)}
                className="w-full h-11 bg-surface-3 border border-border-subtle text-text-secondary rounded-xl text-xs font-semibold hover:text-text-primary transition-colors"
              >
                Continuar Treinando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Saída ── */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-surface-1 border border-border-subtle shadow-elev-2 rounded-2xl p-6">
            <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-4">
              <WarningCircle className="w-7 h-7 text-brand" />
            </div>
            <h3 className="text-lg font-bold text-text-primary text-center mb-2">Sair do Treino</h3>
            <p className="text-sm text-text-secondary text-center mb-6 leading-relaxed">
              O que deseja fazer com o treino atual?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setShowExitModal(false); handleFinalizarTreino(); }}
                disabled={saving}
                className="w-full h-11 bg-brand text-text-on-brand rounded-xl text-xs font-semibold shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Finalizando..." : "Finalizar e Salvar Treino"}
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className="w-full h-11 bg-surface-3 border border-border-subtle text-text-secondary rounded-xl text-xs font-semibold hover:text-text-primary transition-colors"
              >
                Continuar Treinando
              </button>
              <button
                onClick={() => { setShowExitModal(false); handleDescartarTreino(); }}
                className="w-full h-11 border border-danger/30 text-danger/80 rounded-xl text-xs font-semibold hover:text-danger hover:border-danger/50 transition-colors"
              >
                Descartar Treino
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Execução ── */}
      {exercicioAtivo !== null && ficha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-lg max-h-[90vh] bg-surface-1 border border-brand/20 shadow-glow-brand rounded-2xl overflow-hidden flex flex-col">

            {bisetToast && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-brand/95 backdrop-blur text-text-on-brand rounded-full text-xs font-bold shadow-gold-glow animate-fade-in flex items-center gap-2">
                <Lightning className="w-4 h-4 text-text-on-brand animate-pulse" weight="fill" />
                {bisetToast}
              </div>
            )}

            {/* Rest Timer banner sutil no topo do modal */}
            {restTimer !== null && (
              <div className="sticky top-0 z-50 flex items-center gap-3 px-4 py-2.5 bg-surface-2 border-b border-border-subtle">
                <span className="text-sm">⏱</span>
                <span className="text-xs text-text-secondary">
                  {exercicioEmExecucao?.grupo_biset_id ? "Descanso Bi-set" : "Descanso"}
                </span>
                <span className="flex-1 text-center text-sm font-bold text-brand tabular-nums">
                  {Math.floor(restTimer / 60)}:{String(restTimer % 60).padStart(2, '0')}
                </span>
                <button
                  onClick={() => setRestTimer(null)}
                  className="text-xs text-text-tertiary px-2 py-1 rounded-lg hover:bg-surface-3 transition-colors"
                >
                  Pular
                </button>
              </div>
            )}

            {/* Header: Close (left) / Name (center) / Video (right) */}
            <div className={cn(
              "px-5 py-4 border-b border-border-subtle flex items-center justify-between gap-4 bg-surface-1",
              exercicioEmExecucao?.grupo_biset_id && "border-b-brand/20 bg-brand/5"
            )}>
              <button
                onClick={() => setExercicioAtivo(null)}
                className="w-9 h-9 bg-surface-3/80 hover:bg-surface-3 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex-1 text-center min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-caps text-brand mb-0.5">
                  {exercicioEmExecucao?.grupo_biset_id ? (
                    `BI-SET ${exercicioEmExecucao.biset_ordem}/2`
                  ) : (
                    `${exercicioAtivo + 1}º Exercício`
                  )}
                </p>
                <h2 className="text-sm font-bold text-text-primary truncate">
                  {exercicioEmExecucao?.nome}
                </h2>
              </div>

              <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center">
                {ficha.exercicios[exercicioAtivo].video_url ? (
                  <button
                    onClick={() => setVideoModal(ficha.exercicios[exercicioAtivo].video_url || null)}
                    className="w-9 h-9 bg-brand-subtle text-brand hover:opacity-85 rounded-xl flex items-center justify-center transition-all"
                    title="Assistir Vídeo explicativo"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="w-9 h-9" />
                )}
              </div>
            </div>

            {/* Rest Timer bottom sheet overlay (Fase 5) */}
            {descansoAtivo && (
              <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-all flex items-end">
                <div className="w-full bg-surface-1/90 backdrop-blur-xl border-t border-brand/20 shadow-elev-3 rounded-t-3xl p-6 flex flex-col items-center justify-center text-center animate-slide-up">
                  {descansoExpirado ? (
                    <div className="w-full py-4 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-success/20 border border-success flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-success" weight="bold" />
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-caps text-success mb-1">Descanso Concluído!</p>
                      <h3 className="text-base font-bold text-text-primary mb-5">Pronto para a próxima série?</h3>
                      <div className="w-full max-w-xs flex flex-col gap-2">
                        <button
                          onClick={() => { setDescansoAtivo(false); setDescansoExpirado(false); setDescansoEndAt(null); proximaSerie(); }}
                          className="w-full h-11 bg-success text-white rounded-full font-semibold text-sm hover:opacity-90 transition-opacity"
                        >
                          Iniciar Próxima Série
                        </button>
                        <button
                          onClick={() => { setDescansoAtivo(false); setDescansoExpirado(false); setDescansoEndAt(null); }}
                          className="w-full h-9 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                        >
                          Fechar Timer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col items-center py-6">
                      <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-2">
                        {exercicioEmExecucao?.grupo_biset_id ? "Descanso Bi-set" : "Tempo de Descanso"}
                      </p>
                      <div className="text-[72px] font-black text-brand tracking-tighter tabular-nums font-mono leading-none mb-6">
                        {formatarTempoDescanso(tempoDescanso)}
                      </div>
                      <button
                        onClick={() => { setDescansoAtivo(false); setDescansoExpirado(false); setDescansoEndAt(null); proximaSerie(); }}
                        className="text-xs text-text-secondary hover:text-text-primary font-medium transition-all hover:underline"
                      >
                        Pular Descanso
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conteúdo scrollável */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

              {/* Progresso de séries via dot indicators (Fase 5) */}
              <div className="flex flex-col gap-2.5 items-center bg-surface-2 p-3 rounded-2xl border border-border-subtle">
                <span className="text-[10px] font-bold uppercase tracking-caps text-text-tertiary">
                  Série {serieAtual + 1} de {ficha.exercicios[exercicioAtivo].series.length}
                </span>
                <div className="flex items-center gap-3">
                  {ficha.exercicios[exercicioAtivo].series.map((_, sIdx) => {
                    const isCompleted = sIdx < serieAtual;
                    const isActive = sIdx === serieAtual;
                    return (
                      <div
                        key={sIdx}
                        className={cn(
                          "w-7 h-7 rounded-full transition-all duration-300 flex items-center justify-center text-xs font-bold",
                          isCompleted && "bg-success text-white shadow-sm shadow-success/20",
                          isActive && "bg-brand text-text-on-brand ring-4 ring-brand/20 scale-110",
                          !isCompleted && !isActive && "bg-surface-3 border border-border-subtle text-text-tertiary"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5 text-white" weight="bold" />
                        ) : (
                          <span>{sIdx + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats e Informações da série atual */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface-2 border border-border-subtle rounded-xl p-3 text-center">
                  <p className="text-2xs text-text-tertiary mb-1">Repetições Alvo</p>
                  <p className="text-lg font-bold text-brand">{ficha.exercicios[exercicioAtivo].series[serieAtual]?.reps || "0"}</p>
                </div>
                <div className="bg-surface-2 border border-border-subtle rounded-xl p-3 text-center">
                  <p className="text-2xs text-text-tertiary mb-1">Carga Registrada</p>
                  <p className="text-lg font-bold text-text-primary">{cargaTemporaria} kg</p>
                </div>
              </div>

              {/* Técnicas */}
              {(() => {
                const serie = ficha.exercicios[exercicioAtivo].series[serieAtual];
                if (!serie) return null;
                const hasTec = !!serie.tecnica?.trim();
                const hasExtra = !!serie.tecnica_extra?.trim();
                if (!hasTec && !hasExtra) return null;
                return (
                  <div className={cn("grid gap-2", hasTec && hasExtra ? "grid-cols-2" : "grid-cols-1")}>
                    {hasTec && (
                      <div className="bg-surface-2 border border-border-subtle rounded-xl p-3 text-center">
                        <p className="text-2xs text-text-tertiary mb-1">Técnica</p>
                        <p className="text-sm font-bold text-text-secondary">{serie.tecnica}</p>
                      </div>
                    )}
                    {hasExtra && (
                      <button
                        onClick={() => setTecnicaInfoModal(serie.tecnica_extra!)}
                        className="bg-brand/10 border border-brand/20 rounded-xl p-3 text-center hover:opacity-80 transition-opacity"
                      >
                        <p className="text-2xs text-brand/70 mb-1">Técnica Extra (Info)</p>
                        <p className="text-sm font-bold text-brand">{serie.tecnica_extra}</p>
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Ajuste de carga (Fase 5: Carga em display de 48px e botões de 48x48px com fundo #1C1C1C) */}
              <div className="bg-surface-2 border border-border-subtle rounded-2xl p-5 flex flex-col gap-3">
                <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary text-center">Ajustar Carga</p>
                <div className="flex items-center justify-between gap-4">
                  <button
                    onMouseDown={() => startCargaInterval(false)}
                    onMouseUp={stopCargaInterval}
                    onMouseLeave={stopCargaInterval}
                    onTouchStart={() => startCargaInterval(false)}
                    onTouchEnd={stopCargaInterval}
                    className="w-12 h-12 bg-[#1C1C1C] hover:bg-[#252525] text-brand hover:text-brand rounded-full text-2xl font-light transition-colors flex items-center justify-center flex-shrink-0"
                    title="Diminuir Carga"
                  >
                    −
                  </button>
                  <div className="flex-1 flex items-baseline justify-center min-w-0">
                    <input
                      type="number"
                      value={cargaTemporaria}
                      onChange={(e) => setCargaTemporaria(parseFloat(e.target.value) || 0)}
                      className="w-28 text-center bg-transparent text-[48px] font-bold text-text-primary focus:outline-none focus:ring-0 p-0 border-none select-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none leading-none"
                      step="0.5"
                    />
                    <span className="text-lg font-bold text-text-secondary ml-1">kg</span>
                  </div>
                  <button
                    onMouseDown={() => startCargaInterval(true)}
                    onMouseUp={stopCargaInterval}
                    onMouseLeave={stopCargaInterval}
                    onTouchStart={() => startCargaInterval(true)}
                    onTouchEnd={stopCargaInterval}
                    className="w-12 h-12 bg-[#1C1C1C] hover:bg-[#252525] text-brand hover:text-brand rounded-full text-2xl font-light transition-colors flex items-center justify-center flex-shrink-0"
                    title="Aumentar Carga"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Tabela de Histórico de Séries com Borda Dourada à Esquerda na Série Atual (Fase 5) */}
              <div className="bg-surface-2 border border-border-subtle rounded-2xl overflow-hidden flex flex-col flex-shrink-0">
                <div className="px-4 py-2.5 border-b border-border-subtle bg-surface-3/30 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Histórico de Séries</span>
                </div>
                <div className="divide-y divide-border-subtle/30 max-h-[160px] overflow-y-auto scrollbar-thin pb-1">
                  {ficha.exercicios[exercicioAtivo].series.map((s, idx) => {
                    const isActive = idx === serieAtual;
                    const isCompleted = s.completado;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "grid grid-cols-5 gap-2 px-4 py-3 items-center text-center text-xs transition-all",
                          isActive ? "bg-brand/5 border-l-[3px] border-brand pl-[13px]" : "border-l-[3px] border-transparent"
                        )}
                      >
                        <div className={cn("text-left font-bold", isActive ? "text-brand" : "text-text-secondary")}>
                          Série {idx + 1}
                        </div>
                        <div className="text-text-tertiary font-mono text-center truncate">{s.anterior || "—"}</div>
                        <div className="text-text-primary text-center font-semibold">
                          {isActive ? `${cargaTemporaria} kg` : (isCompleted || s.peso_atual > 0 ? `${s.peso_atual} kg` : "—")}
                        </div>
                        <div className="text-text-primary text-center font-semibold">
                          {s.reps} reps
                        </div>
                        <div className="flex justify-end">
                          {isCompleted ? (
                            <span className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center text-success">
                              <Check className="w-3.5 h-3.5" weight="bold" />
                            </span>
                          ) : (
                            <span className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                              isActive ? "border border-brand text-brand" : "border border-border-subtle text-text-disabled"
                            )}>
                              {idx + 1}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Anterior sutil se houver */}
              {ficha.exercicios[exercicioAtivo].series[serieAtual]?.anterior && (
                <div className="px-3 py-2 bg-surface-2 border border-border-subtle rounded-xl flex items-center justify-between">
                  <span className="text-2xs text-text-tertiary">Última vez obtido:</span>
                  <span className="text-xs font-mono text-brand font-semibold">
                    {ficha.exercicios[exercicioAtivo].series[serieAtual].anterior}
                  </span>
                </div>
              )}
            </div>

            {/* CTA Concluir com a classe btn-primary de 56px de altura (Fase 5) */}
            <div className="px-5 py-4 border-t border-border-subtle bg-surface-1">
              <button
                onClick={() => {
                  if (exercicioEmExecucao && serieAtual >= exercicioEmExecucao.series.length - 1) {
                    concluirExercicio();
                  } else {
                    concluirSerie();
                  }
                }}
                disabled={descansoAtivo}
                className="btn-primary w-full shadow-gold-glow flex items-center justify-center gap-2"
              >
                {exercicioEmExecucao && serieAtual >= exercicioEmExecucao.series.length - 1 ? (
                  exercicioEmExecucao.grupo_biset_id && exercicioEmExecucao.biset_ordem === 1 ? (
                    <>
                      <Check className="w-4 h-4 text-text-on-brand" weight="bold" />
                      Ir para 2º Exercício
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-text-on-brand" weight="bold" />
                      Concluir Exercício
                    </>
                  )
                ) : (
                  `Concluir Série ${serieAtual + 1}/${exercicioEmExecucao?.series.length || 0}`
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function FichaTreinoAlunoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Iniciando aplicativo..." />
      </div>
    }>
      <FichaContent />
    </Suspense>
  );
}
