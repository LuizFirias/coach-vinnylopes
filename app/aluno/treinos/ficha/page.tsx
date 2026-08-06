"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { getSafeSession } from "@/lib/authErrorHandler";
import {
  Check, Video, ArrowLeft, X, Play, Trophy,
  Barbell, WarningCircle, FileArrowDown, CircleNotch, Lightning,
} from "@phosphor-icons/react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { descansoToSeconds } from "@/lib/utils/restTime";
import { exercicioMostraPeso } from "@/app/components/workout-builder/exerciseColumns";
import { sendTreinoIniciadoNotification } from "@/lib/notifications/sendTreinoIniciadoNotification";
import { useRestTimer } from "@/lib/hooks/useRestTimer";
import { RestTimerBar } from "@/app/components/treino/execucao/RestTimerBar";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { YouTubePlayer } from "@/app/components/YouTubePlayer";
import TecnicaInfoModal from "@/app/components/TecnicaInfoModal";
import { TecnicasTooltipModal, TecnicasTooltipTrigger } from "@/app/components/treino/TecnicasTooltipModal";

interface Serie {
  ordem: number;
  anterior: string;
  peso_atual: number;
  /** Texto exatamente como o aluno digitou (aceita vírgula) — evita reformatar enquanto ele digita. */
  pesoInputStr?: string;
  /** true assim que o aluno edita o peso desta série específica — trava o preenchimento fantasma. */
  pesoManual?: boolean;
  reps: string | number;
  tecnica?: string;
  tecnica_extra?: string;
  completado: boolean;
}

/** Aceita "," ou "." como separador decimal — trata os dois do mesmo jeito (ex.: "7,5" ou "7.5"). */
function parsePesoInput(raw: string): number {
  const normalized = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

/** Formata um peso numérico para exibição com vírgula (padrão brasileiro). */
function formatPesoDisplay(value: number): string {
  if (!value) return '';
  return String(value).replace('.', ',');
}

interface Exercicio {
  id: string;
  nome: string;
  descanso: string;
  video_url?: string;
  observacoes?: string;
  tipo_exercicio?: string;
  series: Serie[];
}

interface FichaTreino {
  id: string;
  nome_rotina: string;
  exercicios: Exercicio[];
}

function estimateDurationMin(exercicios: Exercicio[]): number {
  const totalSets = exercicios.reduce((acc, ex) => acc + ex.series.length, 0);
  return Math.max(15, Math.round(exercicios.length * 3 + totalSets * 2));
}

function toTitleCase(str: string): string {
  const minusculas = ["com", "de", "do", "da", "no", "na", "em", "e", "a", "o"];
  return str
    .toLowerCase()
    .split(" ")
    .map((word, i) =>
      i === 0 || !minusculas.includes(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word,
    )
    .join(" ");
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

  const [exercicioAtivo, setExercicioAtivo] = useState<number | null>(null);
  const [serieAtual, setSerieAtual] = useState(0);
  const [cargaTemporaria, setCargaTemporaria] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [tecnicaInfoModal, setTecnicaInfoModal] = useState<string | null>(null);
  const [showTecnicasTooltip, setShowTecnicasTooltip] = useState(false);
  // Timer de descanso — barra discreta no rodapé, some sozinha ao zerar
  const restTimer = useRestTimer();

  // Chave de progresso no localStorage
  const progressKey = fichaId ? `treino_progress_${fichaId}` : null;

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
      const session = await getSafeSession();
      const userId = session?.user?.id;
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
      let videosBiblioteca: Record<string, string> = {};
      if (exercicioIds.length > 0) {
        const [{ data: historicoRows }, { data: bibData }] = await Promise.all([
          supabaseClient
            .from("historico_treinos")
            .select("exercicio_id, dados_sessao")
            .eq("aluno_id", userId)
            .in("exercicio_id", exercicioIds)
            .order("data_conclusao", { ascending: false })
            .limit(Math.max(exercicioIds.length * 10, 50)),
          supabaseClient
            .from("exercicios_biblioteca")
            .select("id, video_url")
            .in("id", exercicioIds),
        ]);
        (historicoRows || []).forEach((row: any) => {
          if (!historicoMap[row.exercicio_id]) {
            historicoMap[row.exercicio_id] = row.dados_sessao;
          }
        });
        videosBiblioteca = Object.fromEntries(
          (bibData || []).map((ex) => [ex.id, ex.video_url || ""])
        );
      }

      const exerciciosComHistorico = (configuracao.exercicios || []).map((ex: any) => {
        const historicoEx = historicoMap[ex.id];
        return {
          ...ex,
          tipo_exercicio: ex.tipo_exercicio,
          video_url: videosBiblioteca[ex.id] || undefined,
          series: (ex.series || []).map((serie: any, idx: number) => {
            const ordem = serie.ordem || idx + 1;
            const seriesPrev = (historicoEx?.series || []) as Array<{
              ordem?: number;
              peso_atual?: number;
              reps?: number | string;
              completado?: boolean;
            }>;
            const seriePrev =
              seriesPrev.find(
                (p) =>
                  (p.ordem ?? 0) === ordem &&
                  p.completado === true &&
                  (p.peso_atual ?? 0) > 0
              ) ||
              (seriesPrev[idx]?.completado === true && (seriesPrev[idx].peso_atual ?? 0) > 0
                ? seriesPrev[idx]
                : undefined);
            const anterior = seriePrev
              ? `${seriePrev.peso_atual}kg x ${seriePrev.reps || 0}`
              : "—";
            return {
              ordem,
              anterior,
              peso_atual: seriePrev?.peso_atual ?? 0,
              reps: serie.reps ?? serie.reps_sugerido ?? 0,
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
    void sendTreinoIniciadoNotification(ficha?.nome_rotina);
    localStorage.setItem(`treino_ativo_${fichaId}`, JSON.stringify({ fichaId, inicio: null, preparadoEm: Date.now() }));
    // Abrir modal do primeiro exercício automaticamente
    if (ficha && ficha.exercicios.length > 0) {
      setExercicioAtivo(0);
      setSerieAtual(0);
      restTimer.reset();
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

    const exercicio = ficha?.exercicios.find((ex) => ex.id === exercicioId);
    const serie = exercicio?.series.find((s) => s.ordem === serieOrdem);
    const vaiCompletar = serie ? !serie.completado : false;

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

    // Marcou a série como feita → dispara o descanso (barra discreta no rodapé)
    if (vaiCompletar && exercicio) {
      restTimer.start(descansoToSeconds(exercicio.descanso), () => proximaSerie(), {
        title: 'Descanso',
        subtitle: exercicio.nome,
      });
    }
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

  /**
   * Peso digitado numa série "vaza" pra frente — as próximas séries do mesmo
   * exercício (ainda não concluídas e que o aluno não editou o peso à mão)
   * já aparecem pré-preenchidas ("fantasma") com esse valor, prontas pra
   * concluir. Editar uma série trava ela como manual — deixa de receber o vazamento.
   */
  const handlePesoInputChange = (exercicioId: string, serieOrdem: number, rawValue: string) => {
    const parsed = parsePesoInput(rawValue);
    setFicha((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercicios: prev.exercicios.map((ex) => {
          if (ex.id !== exercicioId) return ex;
          let cascata = false;
          return {
            ...ex,
            series: ex.series.map((s) => {
              if (s.ordem === serieOrdem) {
                cascata = true;
                return { ...s, peso_atual: parsed, pesoInputStr: rawValue, pesoManual: true };
              }
              if (cascata && !s.completado && !s.pesoManual) {
                return { ...s, peso_atual: parsed, pesoInputStr: formatPesoDisplay(parsed) };
              }
              return s;
            }),
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
    restTimer.reset();
    const ex = ficha?.exercicios[index];
    setCargaTemporaria(ex?.series[0] ? ex.series[0].peso_atual || 0 : 0);
  };

  const concluirSerie = () => {
    if (exercicioAtivo === null || !ficha) return;
    const exercicio = ficha.exercicios[exercicioAtivo];
    const serie = exercicio.series[serieAtual];
    handleUpdateSerie(exercicio.id, serie.ordem, "peso_atual", cargaTemporaria);
    handleCheckSerie(exercicio.id, serie.ordem);
  };

  const concluirExercicio = () => {
    if (exercicioAtivo === null || !ficha) return;
    const exercicio = ficha.exercicios[exercicioAtivo];
    const serie = exercicio.series[serieAtual];
    handleUpdateSerie(exercicio.id, serie.ordem, "peso_atual", cargaTemporaria);
    handleCheckSerie(exercicio.id, serie.ordem);
    if (exercicioAtivo < ficha.exercicios.length - 1) {
      iniciarExercicio(exercicioAtivo + 1);
    } else {
      setExercicioAtivo(null);
      alert("Parabéns! Você completou todos os exercícios!");
    }
  };

  const proximaSerie = () => {
    if (exercicioAtivo === null || !ficha) return;
    const exercicio = ficha.exercicios[exercicioAtivo];
    if (serieAtual < exercicio.series.length - 1) {
      setSerieAtual(serieAtual + 1);
      const prox = exercicio.series[serieAtual + 1];
      if (prox) setCargaTemporaria(prox.peso_atual || cargaTemporaria);
    }
  };

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
    restTimer.reset();
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
      if (!userId) return;
      const agora = new Date().toISOString();

      const exerciciosValidos = ficha.exercicios.filter(ex => ex.id);
      if (exerciciosValidos.length === 0) throw new Error("Ficha sem exercícios válidos");

      const registros = exerciciosValidos.map((exercicio) => ({
        ficha_id: ficha.id,
        aluno_id: userId,
        exercicio_id: exercicio.id,
        dados_sessao: {
          nome_rotina: ficha.nome_rotina,
          nome_exercicio: exercicio.nome,
          tipo_exercicio: exercicio.tipo_exercicio,
          series: exercicio.series,
          data_sessao: agora,
          duracao_segundos: seconds,
        },
        data_conclusao: agora,
      }));

      const { error } = await supabaseClient.from("historico_treinos").insert(registros);

      if (error) {
        let savedCount = 0;
        for (const registro of registros) {
          const { error: rowError } = await supabaseClient.from("historico_treinos").insert(registro);
          if (!rowError) savedCount++;
        }
        if (savedCount === 0) throw error;
      }

      localStorage.removeItem(`treino_ativo_${fichaId}`);
      if (progressKey) localStorage.removeItem(progressKey);
      setTreinoIniciado(false);
      setTimerStartAt(null);
      setSeconds(0);
      setExercicioAtivo(null);
      restTimer.reset();
      router.push("/aluno/treinos");
    } catch (err) {
      console.error("Erro ao salvar histórico:", err);
      alert("Erro ao finalizar treino");
    } finally {
      setSaving(false);
    }
  };

  const handleBaixarPDF = async () => {
    if (!ficha) return;
    setDownloadingPDF(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

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

  // ─── Loading / Error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Preparando seu treino..." />
      </div>
    );
  }

  if (!ficha) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6 lg:pl-28">
        <div className="bg-surface-1 border border-card shadow-elev-2 rounded-2xl p-10 text-center max-w-sm w-full">
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

  const modalShowPeso =
    exercicioAtivo !== null ? exercicioMostraPeso(ficha.exercicios[exercicioAtivo]?.tipo_exercicio) : true;

  return (
    <div className="min-h-screen bg-surface-0 p-3 pb-24">
      <div className="max-w-md mx-auto flex flex-col gap-4">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            {treinoIniciado ? (
              <button
                onClick={() => setShowExitModal(true)}
                className="inline-flex items-center gap-1.5 text-brand text-2xs uppercase tracking-caps"
              >
                <ArrowLeft className="w-3 h-3" />
                Sair
              </button>
            ) : (
              <Link
                href="/aluno/treinos"
                className="inline-flex items-center gap-1.5 text-brand text-2xs uppercase tracking-caps"
              >
                <ArrowLeft className="w-3 h-3" />
                Voltar
              </Link>
            )}

            {/* Stats do treino em andamento */}
            {treinoIniciado && (
              <div className="flex items-center gap-2">
                <div className="px-3 py-2 bg-surface-1 border border-brand/30 shadow-elev-1 rounded-xl text-center min-w-[68px]">
                  <p className="text-2xs font-semibold uppercase tracking-caps text-brand">Tempo</p>
                  <p className="text-sm font-bold text-text-primary font-mono leading-tight">{formatTime(seconds)}</p>
                </div>
                <div className="px-3 py-2 bg-surface-1 border border-card shadow-elev-1 rounded-xl text-center min-w-[68px]">
                  <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Volume</p>
                  <p className="text-sm font-bold text-brand leading-tight">
                    {totalVolume}<span className="text-2xs text-text-disabled ml-0.5">kg</span>
                  </p>
                </div>
                <div className="px-3 py-2 bg-surface-1 border border-card shadow-elev-1 rounded-xl text-center min-w-[52px]">
                  <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Sets</p>
                  <p className="text-sm font-bold text-text-primary leading-tight">{totalSets}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold uppercase tracking-wide text-text-primary leading-tight">
                {ficha.nome_rotina}
              </h1>
              <p className="mt-0.5 text-xs font-medium text-text-tertiary">
                {ficha.exercicios.length} exercícios · Est. {estimateDurationMin(ficha.exercicios)} min
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleBaixarPDF}
                disabled={downloadingPDF}
                className="h-8.5 px-3 bg-surface-1 border border-card shadow-sm rounded-lg text-2xs font-bold text-text-secondary hover:text-text-primary hover:border-card-hover transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {downloadingPDF ? <CircleNotch className="w-3 animate-spin" /> : <FileArrowDown className="w-3 h-3" />}
                PDF
              </button>
              {!treinoIniciado ? (
                <button
                  onClick={iniciarTreino}
                  className="h-8 px-3 bg-brand text-text-on-brand rounded-lg text-[11px] font-semibold shadow-sm shadow-brand/30 flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <Play className="w-3 h-3" fill="currentColor" />
                  Iniciar treino
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowDiscardModal(true)}
                    className="h-8.5 px-2.5 bg-surface-1 border border-danger/30 shadow-sm rounded-lg text-2xs font-bold text-danger/80 hover:text-danger hover:border-danger/50 transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Descartar
                  </button>
                  <button
                    onClick={handleFinalizarTreino}
                    disabled={saving}
                    className="h-8 px-3 bg-brand text-text-on-brand rounded-lg text-[11px] font-semibold shadow-sm shadow-brand/30 flex items-center gap-1 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? <CircleNotch className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    {saving ? "Salvando…" : "Concluir"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar — exercícios concluídos */}
        {ficha && (
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="flex-1 h-1 bg-border-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-300"
                style={{ width: `${Math.round((ficha.exercicios.filter(ex => ex.series.every(s => s.completado)).length / ficha.exercicios.length) * 100)}%` }}
              />
            </div>
            <span className="text-2xs text-text-tertiary whitespace-nowrap">
              {ficha.exercicios.filter(ex => ex.series.every(s => s.completado)).length}/{ficha.exercicios.length} exercícios
            </span>
          </div>
        )}

        {/* ── Banner: antes de iniciar ── */}
        {!treinoIniciado && (
          <div className="flex items-start gap-3 px-4 py-3 bg-brand/5 border border-brand/20 rounded-2xl">
            <WarningCircle className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-brand mb-0.5">Visualização da Ficha</p>
              <p className="text-xs text-text-secondary leading-relaxed">
                Clique em "Iniciar" para entrar no modo de execução. O cronômetro só começa quando você marcar a primeira série.
              </p>
            </div>
          </div>
        )}

        {/* ── Banner: treino iniciado, timer não começou ── */}
        {treinoIniciado && !timerStartAt && (
          <div className="flex items-center gap-3 px-4 py-3 bg-surface-1 border border-card shadow-elev-1 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-brand-subtle border border-brand-border flex items-center justify-center text-brand flex-shrink-0 animate-pulse">
              <Lightning className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">Pronto para começar.</span> Marque a primeira série ou clique em Executar para ligar o cronômetro.
            </p>
          </div>
        )}

        {/* ── Exercícios ── */}
        <div className="flex flex-col gap-3">
          {ficha.exercicios.map((exercicio, exIdx) => (
            <div
              key={exercicio.id}
              className="bg-surface-1 border border-card shadow-elev-1 hover:shadow-elev-2 hover:border-brand/20 rounded-lg transition-all"
            >
              {/* Cabeçalho do exercício */}
              <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-semibold leading-tight mb-1"
                      style={{ fontSize: 15, color: '#751BB4' }}
                    >
                      {toTitleCase(exercicio.nome)}
                    </h3>
                    <p style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
                      Descanso: {exercicio.descanso}
                    </p>
                  </div>
                  {exercicio.video_url && (
                    <button
                      onClick={() => setVideoModal(exercicio.video_url || null)}
                      className="flex items-center gap-1 text-[10px] font-medium text-brand bg-brand/10 border border-brand/20 rounded-md px-2 py-1 hover:opacity-80 transition-opacity shrink-0"
                    >
                      <Play className="w-3 h-3 fill-brand" />
                      Ver
                    </button>
                  )}
                  {treinoIniciado && (
                    <button
                      onClick={() => iniciarExercicio(exIdx)}
                      className="rounded-[8px] px-3 py-1.5 text-[11px] font-semibold flex-shrink-0"
                      style={{
                        background: 'var(--btn-primary-bg)',
                        color: '#fff',
                        boxShadow: '0 2px 6px rgba(117, 27, 180,0.3)',
                      }}
                    >
                      Executar
                    </button>
                  )}
                </div>
              </div>

              {/* Observações do coach */}
              {exercicio.observacoes && (
                <div className="mx-4 mb-3 px-2.5 py-2 bg-surface-2 border border-card rounded-md">
                  <p className="text-[10px] font-semibold uppercase tracking-caps text-text-tertiary mb-1">Observações</p>
                  <p className="text-[11px] text-text-secondary leading-relaxed">{exercicio.observacoes}</p>
                </div>
              )}

              {/* Tabela de séries */}
              <div className="px-4 pt-2 pb-3">
                {(() => {
                  const hasTec = exercicio.series.some(s => !!s.tecnica?.trim());
                  const hasExtra = exercicio.series.some(s => !!s.tecnica_extra?.trim());
                  const showPeso = exercicioMostraPeso(exercicio.tipo_exercicio);
                  const colParts = ['2.5rem', 'minmax(4rem, 7rem)'];
                  if (showPeso) colParts.push('5rem');
                  if (hasTec) colParts.push('3.5rem');
                  if (hasExtra) colParts.push('5rem');
                  colParts.push('4rem', '2.75rem');
                  const gridTemplate = colParts.join(' ');
                  const mobileGridTemplate = showPeso
                    ? '24px minmax(36px, 72px) 44px 48px minmax(0, 1fr) 24px 24px 28px'
                    : '24px minmax(36px, 72px) 48px minmax(0, 1fr) 24px 24px 28px';
                  return (
                    <>
                      {/* Cabeçalhos desktop */}
                      <div className="hidden md:grid gap-1.5 mb-1.5 px-1 min-w-max overflow-x-auto" style={{ gridTemplateColumns: gridTemplate }}>
                        <span className="text-[10px] font-semibold uppercase tracking-caps text-text-disabled text-left">Set</span>
                        <span className="text-[10px] font-semibold uppercase tracking-caps text-text-disabled text-left pl-2">Ant.</span>
                        {showPeso && (
                          <span className="text-[10px] font-semibold uppercase tracking-caps text-text-disabled text-center">Peso</span>
                        )}
                        {hasTec && (
                          <span className="text-[10px] font-semibold uppercase tracking-caps text-text-disabled text-center flex items-center justify-center gap-1">
                            T1
                            <TecnicasTooltipTrigger compact onClick={() => setShowTecnicasTooltip(true)} />
                          </span>
                        )}
                        {hasExtra && (
                          <span className="text-[10px] font-semibold uppercase tracking-caps text-text-disabled text-center flex items-center justify-center gap-1">
                            T2
                            {!hasTec && <TecnicasTooltipTrigger compact onClick={() => setShowTecnicasTooltip(true)} />}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold uppercase tracking-caps text-text-disabled text-center">Reps</span>
                        <span className="opacity-0">X</span>
                      </div>

                      {/* Mobile Column Headers */}
                      <div
                        className="md:hidden select-none"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: mobileGridTemplate,
                          gap: '0 10px',
                          padding: '0 12px',
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-disabled)', textAlign: 'center' }}>
                          Set
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-disabled)' }}>
                          Ant.
                        </span>
                        {showPeso && (
                          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-disabled)', textAlign: 'center' }}>
                            Peso
                          </span>
                        )}
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-disabled)', textAlign: 'center' }}>
                          Reps
                        </span>
                        <span aria-hidden />
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-disabled)', textAlign: 'center' }}>
                          T1
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: 'var(--text-disabled)',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                          }}
                        >
                          T2
                          <TecnicasTooltipTrigger compact onClick={() => setShowTecnicasTooltip(true)} className="text-[8px]" />
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-disabled)', textAlign: 'center' }}>
                          ✓
                        </span>
                      </div>

                      <div className="flex flex-col">
                        {exercicio.series.map((serie, sIdx) => (
                          <div key={sIdx}>
                            {/* Mobile Set Row */}
                            <div
                              className="md:hidden transition-all"
                              style={{
                                display: 'grid',
                                gridTemplateColumns: mobileGridTemplate,
                                gap: '0 10px',
                                padding: '10px 12px',
                                alignItems: 'center',
                                background: serie.completado
                                  ? 'rgba(57,199,90,0.06)'
                                  : sIdx % 2 === 0
                                    ? 'var(--surface-1)'
                                    : 'var(--surface-2)',
                              }}
                            >
                              {/* SET */}
                              <div
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  margin: '0 auto',
                                  flexShrink: 0,
                                  background: serie.completado ? '#39c75a' : 'var(--filter-bg)',
                                  color: serie.completado ? '#fff' : 'var(--text-tertiary)',
                                }}
                              >
                                {sIdx + 1}
                              </div>

                              {/* ANT. */}
                              <span
                                className={cn(serie.completado && "line-through")}
                                style={{
                                  fontFamily: 'var(--font-kpi), "DM Sans", system-ui, sans-serif',
                                  fontSize: 10,
                                  color: serie.completado ? 'var(--text-disabled)' : 'var(--text-disabled)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {serie.anterior || '—'}
                              </span>

                              {/* PESO */}
                              {showPeso && (
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={serie.pesoInputStr ?? formatPesoDisplay(serie.peso_atual)}
                                    onChange={(e) => handlePesoInputChange(exercicio.id, serie.ordem, e.target.value)}
                                    disabled={!treinoIniciado || serie.completado}
                                    placeholder="0"
                                    style={{
                                      width: 40,
                                      height: 28,
                                      fontSize: 14,
                                      fontWeight: 500,
                                      background: 'var(--filter-bg)',
                                      border: '1px solid var(--border-subtle)',
                                      borderRadius: 6,
                                      textAlign: 'center',
                                      color: !serie.pesoManual && serie.peso_atual ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                      fontStyle: !serie.pesoManual && serie.peso_atual ? 'italic' : 'normal',
                                      fontVariantNumeric: 'tabular-nums',
                                      fontFamily: 'var(--font-kpi), "DM Sans", system-ui, sans-serif',
                                      outline: 'none',
                                    }}
                                  />
                                </div>
                              )}

                              {/* REPS */}
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#751BB4',
                                  textAlign: 'center',
                                  fontVariantNumeric: 'tabular-nums',
                                  fontFamily: 'var(--font-kpi), "DM Sans", system-ui, sans-serif',
                                }}
                              >
                                {serie.reps || '0'}
                              </span>

                              {/* Spacer: T1/T2/check à direita */}
                              <div aria-hidden />

                              {/* T1 */}
                              <div style={{ textAlign: 'center' }}>
                                {serie.tecnica ? (
                                  <button
                                    onClick={() => setTecnicaInfoModal(serie.tecnica!)}
                                    style={{
                                      padding: '2px 4px',
                                      background: 'var(--filter-bg)',
                                      border: '1px solid var(--border-subtle)',
                                      borderRadius: 4,
                                      fontSize: 8,
                                      fontWeight: 700,
                                      color: 'var(--text-secondary)',
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    {serie.tecnica.substring(0, 2).toUpperCase()}
                                  </button>
                                ) : (
                                  <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>—</span>
                                )}
                              </div>

                              {/* T2 */}
                              <div style={{ textAlign: 'center' }}>
                                {serie.tecnica_extra ? (
                                  <button
                                    onClick={() => setTecnicaInfoModal(serie.tecnica_extra!)}
                                    style={{
                                      padding: '2px 4px',
                                      background: 'rgba(117, 27, 180,0.06)',
                                      border: '1px solid rgba(117, 27, 180,0.15)',
                                      borderRadius: 4,
                                      fontSize: 8,
                                      fontWeight: 700,
                                      color: '#751BB4',
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    {serie.tecnica_extra.substring(0, 2).toUpperCase()}
                                  </button>
                                ) : (
                                  <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>—</span>
                                )}
                              </div>

                              {/* CHECK */}
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleCheckSerie(exercicio.id, serie.ordem)}
                                  disabled={!treinoIniciado}
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s',
                                    flexShrink: 0,
                                    ...(serie.completado
                                      ? { background: '#39c75a', border: '1.5px solid #39c75a' }
                                      : { background: 'transparent', border: '1.5px solid var(--border-default)' }),
                                  }}
                                >
                                  {serie.completado && <Check className="w-3.5 h-3.5 text-white" />}
                                </button>
                              </div>
                            </div>

                            {/* Desktop */}
                            <div className={cn(
                              "hidden md:grid gap-1.5 items-center p-1.5 rounded-lg border transition-all overflow-x-auto min-w-max",
                              serie.completado ? "bg-success-subtle border-success-border" : "bg-surface-0/60 border-transparent hover:border-card"
                            )} style={{ gridTemplateColumns: gridTemplate }}>
                              <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center border font-bold text-xs",
                                serie.completado ? "bg-success border-success text-white" : "bg-surface-3 border-border-default text-text-primary"
                              )}>
                                {sIdx + 1}
                              </div>
                              <div className="text-left pl-2">
                                <span className="text-[11px] text-text-secondary font-mono">{serie.anterior || "—"}</span>
                              </div>
                              {showPeso && (
                                <div className="flex justify-center">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={serie.pesoInputStr ?? formatPesoDisplay(serie.peso_atual)}
                                    onChange={(e) => handlePesoInputChange(exercicio.id, serie.ordem, e.target.value)}
                                    disabled={!treinoIniciado}
                                    className={cn(
                                      "w-full h-8 bg-surface-3 border border-input rounded-md text-center text-xs font-semibold focus:border-brand/40 outline-none disabled:opacity-40",
                                      !serie.pesoManual && serie.peso_atual ? "italic text-text-tertiary" : "text-text-primary",
                                    )}
                                    placeholder="0"
                                  />
                                </div>
                              )}
                              {hasTec && (
                                <div className="flex justify-center items-center">
                                  {serie.tecnica ? (
                                    <button
                                      onClick={() => setTecnicaInfoModal(serie.tecnica!)}
                                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-text-tertiary bg-surface-3 border border-card/50 hover:opacity-80 transition-opacity"
                                    >
                                      {serie.tecnica}
                                    </button>
                                  ) : <span className="text-xs text-text-disabled">—</span>}
                                </div>
                              )}
                              {hasExtra && (
                                <div className="flex justify-center items-center">
                                  {serie.tecnica_extra ? (
                                    <button
                                      onClick={() => setTecnicaInfoModal(serie.tecnica_extra!)}
                                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-brand/80 bg-brand/5 border border-brand/15 hover:opacity-80 transition-opacity truncate max-w-full"
                                    >
                                      {serie.tecnica_extra}
                                    </button>
                                  ) : <span className="text-xs text-text-disabled">—</span>}
                                </div>
                              )}
                              <div className="flex justify-center">
                                <div className="w-full h-8 bg-surface-2 border border-card rounded-md flex items-center justify-center">
                                  <span className="text-xs font-semibold text-brand">{serie.reps || "0"}</span>
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <button
                                  onClick={() => handleCheckSerie(exercicio.id, serie.ordem)}
                                  disabled={!treinoIniciado}
                                  className={cn(
                                    "w-8 h-8 rounded-md flex items-center justify-center transition-all active:scale-90 disabled:opacity-30",
                                    serie.completado ? "bg-success border-2 border-success text-white" : "bg-surface-3 border-2 border-border-default text-text-tertiary hover:border-brand/50"
                                  )}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>

        {/* ── Feedback ── */}
        <div className="bg-surface-1 border border-card shadow-elev-1 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-0.5">Feedback do Treino</h3>
          <p className="text-xs text-text-tertiary mb-4">Apenas seu coach poderá ver este feedback</p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Como foi o treino? Sentiu alguma dor? Conseguiu completar todas as séries?"
            className="w-full px-3 py-2.5 bg-surface-3 border border-input rounded-xl text-sm text-text-primary placeholder:text-text-disabled focus:border-brand/40 outline-none resize-none mb-3 transition-colors"
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
      <TecnicasTooltipModal open={showTecnicasTooltip} onClose={() => setShowTecnicasTooltip(false)} />

      {/* ── Modal de Confirmação de Finalização ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-surface-1 border border-card shadow-elev-2 rounded-2xl p-6">
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
                className="w-full h-11 bg-surface-3 border border-card text-text-secondary rounded-xl text-xs font-semibold hover:text-text-primary transition-colors"
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
                className="w-full h-11 bg-surface-3 border border-card text-text-secondary rounded-xl text-xs font-semibold hover:text-text-primary transition-colors"
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
          <div className="relative w-full max-w-sm bg-surface-1 border border-card shadow-elev-2 rounded-2xl p-6">
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
                className="w-full h-11 bg-surface-3 border border-card text-text-secondary rounded-xl text-xs font-semibold hover:text-text-primary transition-colors"
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

      {/* ── Rest Timer: barra discreta no rodapé — não escurece a tela, some sozinha ao zerar ── */}
      {restTimer.active && (
        <RestTimerBar
          remaining={restTimer.remaining}
          total={restTimer.duration}
          meta={restTimer.meta}
          onAddSeconds={restTimer.addSeconds}
          onSkip={restTimer.skip}
        />
      )}

      {/* ── Modal de Execução ── */}
      {exercicioAtivo !== null && ficha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-lg max-h-[90vh] bg-surface-1 border border-brand/30 shadow-glow-brand rounded-2xl overflow-hidden flex flex-col">

            {/* Fechar */}
            <button
              onClick={() => setExercicioAtivo(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 bg-surface-3/80 hover:bg-surface-3 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Nome */}
            <div className="px-5 pt-5 pb-4">
              <p className="text-2xs font-semibold uppercase tracking-caps text-brand mb-1">
                {exercicioAtivo + 1}º exercício
              </p>
              <h2 className="text-lg font-bold text-text-primary leading-tight">
                {ficha.exercicios[exercicioAtivo].nome}
              </h2>
            </div>

            {/* Vídeo */}
            {ficha.exercicios[exercicioAtivo].video_url ? (
              <div className="w-full aspect-video bg-surface-0 border-y border-divider overflow-hidden flex-shrink-0">
                <iframe
                  src={ficha.exercicios[exercicioAtivo].video_url}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                />
              </div>
            ) : (
              <div
                className="w-full border-y border-divider flex-shrink-0"
                style={{ background: 'var(--surface-2)' }}
              >
                <div className="flex items-center gap-2.5 px-5 py-3">
                  <Video className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-disabled)' }} />
                  <div>
                    <p className="text-[12px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                      Sem demonstração disponível
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>
                      Este exercício não possui vídeo na biblioteca
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo scrollável */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

              {/* Progresso */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-text-tertiary">Progresso</span>
                  <span className="text-2xl font-bold text-text-primary">
                    {serieAtual + 1}/{ficha.exercicios[exercicioAtivo].series.length}
                  </span>
                </div>
                <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all duration-300"
                    style={{ width: `${((serieAtual + 1) / ficha.exercicios[exercicioAtivo].series.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Stats da série */}
              <div className={cn("grid gap-2", modalShowPeso ? "grid-cols-2" : "grid-cols-1")}>
                <div className="bg-surface-2 border border-card rounded-xl p-3 text-center">
                  <p className="text-2xs text-text-tertiary mb-1">Repetições</p>
                  <p className="text-lg font-bold text-brand">{ficha.exercicios[exercicioAtivo].series[serieAtual]?.reps || "0"}</p>
                </div>
                {modalShowPeso && (
                  <div className="bg-surface-2 border border-card rounded-xl p-3 text-center">
                    <p className="text-2xs text-text-tertiary mb-1">Carga</p>
                    <p className="text-lg font-bold text-text-primary">{cargaTemporaria} kg</p>
                  </div>
                )}
              </div>
              {(() => {
                const serie = ficha.exercicios[exercicioAtivo].series[serieAtual];
                const hasTec = !!serie.tecnica?.trim();
                const hasExtra = !!serie.tecnica_extra?.trim();
                if (!hasTec && !hasExtra) return null;
                return (
                  <div className={cn("grid gap-2", hasTec && hasExtra ? "grid-cols-2" : "grid-cols-1")}>
                    {hasTec && (
                      <div className="bg-surface-2 border border-card rounded-xl p-3 text-center">
                        <p className="text-2xs text-text-tertiary mb-1">Técnica</p>
                        <p className="text-sm font-bold text-text-secondary">{serie.tecnica}</p>
                      </div>
                    )}
                    {hasExtra && (
                      <button
                        onClick={() => setTecnicaInfoModal(serie.tecnica_extra!)}
                        className="bg-brand/10 border border-brand/20 rounded-xl p-3 text-center hover:opacity-80 transition-opacity"
                      >
                        <p className="text-2xs text-brand/70 mb-1">Técnica Extra</p>
                        <p className="text-sm font-bold text-brand">{serie.tecnica_extra}</p>
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Ajuste de carga */}
              {modalShowPeso && (
                <div className="bg-surface-2 border border-card rounded-xl p-3">
                  <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-2">Ajustar Carga (kg)</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCargaTemporaria(Math.max(0, cargaTemporaria - 2.5))}
                      className="w-[52px] h-[52px] bg-surface-3 border border-border-default rounded-xl text-xl font-light text-text-primary hover:border-brand/40 transition-colors flex items-center justify-center"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={cargaTemporaria}
                      onChange={(e) => setCargaTemporaria(parseFloat(e.target.value) || 0)}
                      className="flex-1 h-11 bg-surface-0 border border-input rounded-xl text-center text-xl font-bold text-text-primary focus:border-brand/40 outline-none"
                      step="0.5"
                    />
                    <button
                      onClick={() => setCargaTemporaria(cargaTemporaria + 2.5)}
                      className="w-[52px] h-[52px] bg-surface-3 border border-border-default rounded-xl text-xl font-light text-text-primary hover:border-brand/40 transition-colors flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Anterior */}
              {ficha.exercicios[exercicioAtivo].series[serieAtual]?.anterior && (
                <div className="px-3 py-2.5 bg-surface-2 border border-card rounded-xl">
                  <p className="text-2xs text-text-tertiary mb-0.5">Última vez</p>
                  <p className="text-sm font-mono text-text-primary">
                    {ficha.exercicios[exercicioAtivo].series[serieAtual].anterior}
                  </p>
                </div>
              )}
            </div>

            {/* Botão concluir */}
            <div className="px-5 py-4 border-t border-divider">
              <button
                onClick={() => {
                  if (serieAtual >= ficha.exercicios[exercicioAtivo].series.length - 1) {
                    concluirExercicio();
                  } else {
                    concluirSerie();
                  }
                }}
                disabled={restTimer.active}
                className="w-full h-13 bg-brand text-text-on-brand rounded-xl font-semibold text-sm shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {serieAtual >= ficha.exercicios[exercicioAtivo].series.length - 1
                  ? "Concluir exercício"
                  : `Concluir série ${serieAtual + 1}/${ficha.exercicios[exercicioAtivo].series.length}`}
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
