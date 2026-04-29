"use client";

import { useEffect, useState, Suspense } from"react";
import { useRouter, useSearchParams } from"next/navigation";
import { supabaseClient } from"@/lib/supabaseClient";
import { 
  Clock, 
  Check, 
  Video, 
  ArrowLeft, 
  Activity, 
  History, 
  X,
  Play,
  RotateCcw,
  Trophy,
  Dumbbell,
  AlertCircle,
  FileDown,
  Loader2
} from"lucide-react";
import Link from"next/link";
import DumbbellLoader from"@/app/components/DumbbellLoader";
import { YouTubePlayer } from"@/app/components/YouTubePlayer";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Serie {
  ordem: number;
  anterior: string;
  peso_atual: number;
  reps: string | number;
  tecnica?: string;
  completado: boolean;
}

interface Exercicio {
  id: string;
  nome: string;
  descanso: string;
  video_url?: string;
  observacoes?: string;
  series: Serie[];
}

interface FichaTreino {
  id: string;
  nome_rotina: string;
  exercicios: Exercicio[];
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

  // Estados para o novo modal de execução
  const [exercicioAtivo, setExercicioAtivo] = useState<number | null>(null);
  const [serieAtual, setSerieAtual] = useState(0);
  const [descansoAtivo, setDescansoAtivo] = useState(false);
  const [tempoDescanso, setTempoDescanso] = useState(0);
  const [descansoEndAt, setDescansoEndAt] = useState<number | null>(null);
  const [cargaTemporaria, setCargaTemporaria] = useState(0);

  useEffect(() => {
    loadFicha();

    // Restaurar treino ativo do localStorage (se houver)
    const treinoAtivo = localStorage.getItem(`treino_ativo_${fichaId}`);
    if (treinoAtivo) {
      try {
        const dados = JSON.parse(treinoAtivo);
        setTreinoIniciado(true);
        // inicio pode ser null (treino preparado mas timer não iniciou ainda)
        if (dados.inicio) {
          setTimerStartAt(dados.inicio);
          setSeconds(Math.floor((Date.now() - dados.inicio) / 1000));
        }
      } catch {
        localStorage.removeItem(`treino_ativo_${fichaId}`);
      }
    }
  }, [fichaId]);

  // Cronômetro principal — baseado em timestamp (continua certo após background)
  useEffect(() => {
    if (!treinoIniciado || !timerStartAt) return;

    const tick = () => {
      setSeconds(Math.floor((Date.now() - timerStartAt) / 1000));
    };

    tick();
    const interval = setInterval(tick, 1000);

    // Re-sincroniza quando o usuário volta para a aba/app
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    window.addEventListener('pageshow', tick);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
      window.removeEventListener('pageshow', tick);
    };
  }, [treinoIniciado, timerStartAt]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? hrs +":" :""}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalVolume = ficha?.exercicios.reduce((acc, ex) => {
    return acc + ex.series.filter(s => s.completado).reduce((sAcc, s) => {
      const reps = typeof s.reps === 'string' ? parseFloat(s.reps) || 0 : s.reps;
      return sAcc + (s.peso_atual * reps);
    }, 0);
  }, 0) || 0;

  const totalSets = ficha?.exercicios.reduce((acc, ex) => acc + ex.series.filter(s => s.completado).length, 0) || 0;

  const loadFicha = async () => {
    if (!fichaId) {
      setLoading(false);
      return;
    }

    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) {
        router.push("/login");
        return;
      }

      // Buscar ficha do aluno
      const { data: fichaData, error: fichaError } = await supabaseClient
        .from("fichas_treino")
        .select("*")
        .eq("id", fichaId)
        .eq("aluno_id", userId)
        .eq("ativo", true)
        .single();

      if (fichaError || !fichaData) {
        console.error("Erro ao carregar ficha:", fichaError);
        setLoading(false);
        return;
      }

      // Buscar último treino para preencher coluna ANTERIOR
      const { data: historicoData } = await supabaseClient
        .from("historico_treinos")
        .select("dados_sessao")
        .eq("ficha_id", fichaId)
        .eq("aluno_id", userId)
        .order("data_conclusao", { ascending: false })
        .limit(1)
        .maybeSingle();

      const configuracao = fichaData.configuracao as any;
      const historico = historicoData?.dados_sessao as any;

      console.log("Configuração da ficha:", configuracao);
      console.log("Exercicios:", configuracao.exercicios);
      if (configuracao.exercicios?.[0]?.series) {
        console.log("Primeira série do primeiro exercicio:", configuracao.exercicios[0].series[0]);
      }

      // Construir ficha com dados anteriores
      const exerciciosComHistorico = (configuracao.exercicios || []).map((ex: any) => {
        const historicoEx = historico?.exercicios?.find((h: any) => h.id === ex.id);
        
        return {
          ...ex,
          series: (ex.series || []).map((serie: any, idx: number) => {
            const seriePrev = historicoEx?.series?.[idx];
            const anterior = seriePrev 
              ? `${seriePrev.peso_atual || 0}kg x ${seriePrev.reps || 0}`
              :"—";
            
            return {
              ordem: serie.ordem || idx + 1,
              anterior,
              peso_atual: 0,  // Aluno sempre começa com peso zerado
              reps: serie.reps ?? 0,  // Reps vem da configuracao (definido pelo coach)
              tecnica: serie.tecnica || "",
              completado: false,
            };
          }),
        };
      });

      console.log("Exercicios processados para aluno:", exerciciosComHistorico);
      if (exerciciosComHistorico?.[0]?.series) {
        console.log("Primeira série processada:", exerciciosComHistorico[0].series[0]);
      }

      setFicha({
        id: fichaData.id,
        nome_rotina: fichaData.nome_rotina,
        exercicios: exerciciosComHistorico,
      });

      setCoachId(fichaData.coach_id);
    } catch (err) {
      console.error("Erro ao carregar ficha:", err);
    } finally {
      setLoading(false);
    }
  };

  const iniciarTreino = () => {
    // Apenas habilita o modo de treino — o cronômetro só começa
    // quando o aluno executa a primeira série/exercício
    setTreinoIniciado(true);
    setTimerStartAt(null);
    setSeconds(0);
    localStorage.setItem(`treino_ativo_${fichaId}`, JSON.stringify({
      fichaId,
      inicio: null,
      preparadoEm: Date.now(),
    }));
  };

  // Garante que o cronômetro está rodando — chamado na primeira ação real do aluno
  const garantirTimerIniciado = () => {
    if (timerStartAt) return;
    const agora = Date.now();
    setTimerStartAt(agora);
    try {
      const treinoAtivo = localStorage.getItem(`treino_ativo_${fichaId}`);
      const dados = treinoAtivo ? JSON.parse(treinoAtivo) : { fichaId };
      localStorage.setItem(`treino_ativo_${fichaId}`, JSON.stringify({
        ...dados,
        inicio: agora,
      }));
    } catch {
      localStorage.setItem(`treino_ativo_${fichaId}`, JSON.stringify({
        fichaId,
        inicio: agora,
      }));
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
            series: ex.series.map((s) => {
              if (s.ordem !== serieOrdem) return s;
              return { ...s, completado: !s.completado };
            }),
          };
        }),
      };
    });
  };

  const handleUpdateSerie = (exercicioId: string, serieOrdem: number, field:"peso_atual" |"reps", value: number | string) => {
    setFicha((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercicios: prev.exercicios.map((ex) => {
          if (ex.id !== exercicioId) return ex;
          return {
            ...ex,
            series: ex.series.map((s) => {
              if (s.ordem !== serieOrdem) return s;
              return { ...s, [field]: value };
            }),
          };
        }),
      };
    });
  };
  // ==================== FUNÇÕES DO MODAL DE EXERCÍCIO ====================
  
  const iniciarExercicio = (index: number) => {
    if (!treinoIniciado) {
      alert("Inicie o treino primeiro!");
      return;
    }
    garantirTimerIniciado();
    setExercicioAtivo(index);
    setSerieAtual(0);
    setDescansoAtivo(false);
    setTempoDescanso(0);
    setDescansoEndAt(null);
    
    // Pegar peso da última vez ou peso sugerido
    const exercicio = ficha?.exercicios[index];
    if (exercicio?.series[0]) {
      const pesoAnterior = exercicio.series[0].anterior ? parseFloat(exercicio.series[0].anterior.split('x')[0]) : 0;
      setCargaTemporaria(exercicio.series[0].peso_atual || pesoAnterior || 0);
    }
  };

  const concluirSerie = () => {
    if (exercicioAtivo === null || !ficha) return;
    
    const exercicio = ficha.exercicios[exercicioAtivo];
    const serie = exercicio.series[serieAtual];
    
    // Atualizar peso da série
    handleUpdateSerie(exercicio.id, serie.ordem, "peso_atual", cargaTemporaria);
    
    // Marcar série como completada
    handleCheckSerie(exercicio.id, serie.ordem);
    
    // Verificar se é a última série
    if (serieAtual >= exercicio.series.length - 1) {
      // Última série - não inicia descanso
      return;
    }
    
    // Iniciar descanso
    const tempoDescansoString = exercicio.descanso || "1:30";
    const [min, seg] = tempoDescansoString.split(':').map(Number);
    const tempoTotal = (min * 60) + (seg || 0);

    setTempoDescanso(tempoTotal);
    setDescansoEndAt(Date.now() + tempoTotal * 1000);
    setDescansoAtivo(true);
  };

  const concluirExercicio = () => {
    if (exercicioAtivo === null || !ficha) return;
    
    const exercicio = ficha.exercicios[exercicioAtivo];
    const serie = exercicio.series[serieAtual];
    
    // Atualizar peso e marcar como completado
    handleUpdateSerie(exercicio.id, serie.ordem, "peso_atual", cargaTemporaria);
    handleCheckSerie(exercicio.id, serie.ordem);
    
    // Ir para próximo exercício ou fechar modal
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
      setDescansoAtivo(false);
      setTempoDescanso(0);
      setDescansoEndAt(null);

      // Atualizar carga para próxima série
      const proximaSerie = exercicio.series[serieAtual + 1];
      if (proximaSerie) {
        setCargaTemporaria(proximaSerie.peso_atual || cargaTemporaria);
      }
    }
  };

  // Timer de descanso — também baseado em timestamp (resiste a background)
  useEffect(() => {
    if (!descansoAtivo || !descansoEndAt) return;

    const tick = () => {
      const restante = Math.max(0, Math.ceil((descansoEndAt - Date.now()) / 1000));
      setTempoDescanso(restante);
      if (restante <= 0) {
        setDescansoAtivo(false);
        setDescansoEndAt(null);
        proximaSerie();
      }
    };

    tick();
    const timer = setInterval(tick, 250);

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, [descansoAtivo, descansoEndAt]);

  const formatarTempoDescanso = (segundos: number) => {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min}:${seg.toString().padStart(2, '0')}`;
  };

  // ==================== FIM FUNÇÕES DO MODAL ====================
  const handleFinalizarTreino = async () => {
    if (!ficha) return;
    
    setSaving(true);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return;

      const agora = new Date().toISOString();
      
      // Criar um registro de histórico por exercício
      const registros = ficha.exercicios.map((exercicio) => ({
        ficha_id: ficha.id,
        aluno_id: userId,
        exercicio_id: exercicio.id,
        dados_sessao: {
          nome_rotina: ficha.nome_rotina,
          nome_exercicio: exercicio.nome,
          series: exercicio.series,
          data_sessao: agora,
        },
        data_conclusao: agora,
      }));

      const { error } = await supabaseClient
        .from("historico_treinos")
        .insert(registros);

      if (error) throw error;

      // Resetar cronômetro e estados de treino
      localStorage.removeItem(`treino_ativo_${fichaId}`);
      setTreinoIniciado(false);
      setTimerStartAt(null);
      setSeconds(0);
      setExercicioAtivo(null);
      setDescansoAtivo(false);
      setTempoDescanso(0);
      setDescansoEndAt(null);

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
      const { data: authData } = await supabaseClient.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) throw new Error('Sessão inválida');

      // Buscar informações do aluno
      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('coaching_reference, email')
        .eq('id', userId)
        .single();

      const nomeAluno = profileData?.coaching_reference || profileData?.email || 'Aluno';

      // Criar PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Cabeçalho
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('FICHA DE TREINO', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(ficha.nome_rotina, 105, 28, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Atleta: ${nomeAluno}`, 20, 40);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 46);

      // Linha divisória
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 50, 190, 50);

      let currentY = 58;

      // Processar cada exercício
      ficha.exercicios.forEach((exercicio, index) => {
        // Verificar se precisa de nova página
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        // Nome do exercício
        doc.setFontSize(12);
        doc.setTextColor(212, 175, 55); // Dourado
        doc.text(`${index + 1}. ${exercicio.nome}`, 20, currentY);
        currentY += 6;

        // Link do vídeo (se existir)
        if (exercicio.video_url) {
          doc.setFontSize(8);
          doc.setTextColor(70, 130, 180); // Azul
          doc.textWithLink('🎥 Vídeo demonstrativo', 20, currentY, { url: exercicio.video_url });
          currentY += 5;
        }

        // Descanso e observações
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        if (exercicio.descanso) {
          doc.text(`Descanso: ${exercicio.descanso}`, 20, currentY);
          currentY += 5;
        }
        if (exercicio.observacoes) {
          const obsLines = doc.splitTextToSize(`Obs: ${exercicio.observacoes}`, 170);
          doc.text(obsLines, 20, currentY);
          currentY += (obsLines.length * 5);
        }

        // Tabela de séries - formato simples para o aluno
        const tableData = exercicio.series.map((serie) => [
          serie.ordem,
          serie.anterior || '-',
          '-', // Peso atual (vazio para aluno preencher)
          serie.reps || '-',
          serie.tecnica || '-'
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['Série', 'Anterior', 'Peso (kg)', 'Reps', 'Técnica']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [212, 175, 55],
            textColor: [0, 0, 0],
            fontSize: 9,
            fontStyle: 'bold'
          },
          bodyStyles: {
            fontSize: 9,
            textColor: [60, 60, 60]
          },
          margin: { left: 20 },
          tableWidth: 170
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      });

      // Converter PDF para Blob
      const pdfBlob = doc.output('blob');
      const fileName = `${userId}/${Date.now()}_${ficha.nome_rotina.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      // Upload para storage
      const { error: uploadError } = await supabaseClient.storage
        .from('treinos-pdf')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Registrar no banco (sem coach_id, pois é o próprio aluno baixando)
      const { error: dbError } = await supabaseClient
        .from('treinos_alunos')
        .insert({
          aluno_id: userId,
          coach_id: coachId || null,
          url_pdf: fileName,
          nome_arquivo: `${ficha.nome_rotina}.pdf`,
          data_upload: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      alert('✅ PDF baixado e salvo nos seus protocolos!');
    } catch (err: any) {
      console.error('Erro ao baixar PDF:', err);
      alert('❌ Erro ao gerar PDF: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-6 lg:pl-28">
        <DumbbellLoader text="Preparando seu treino..." />
      </div>
    );
  }

  if (!ficha) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-6 lg:pl-28">
        <div className="bg-bg-card p-12 rounded-lg shadow-2xl text-center max-w-md w-full border border-border-subtle">
          <div className="w-20 h-20 bg-bg-elevated rounded-lg flex items-center justify-center mx-auto mb-8 text-gold-light">
             <Dumbbell size={40} />
          </div>
          <h2 className="heading-h2 text-text-primary mb-2">Não Encontrado</h2>
          <p className="text-text-secondary font-medium mb-10">Não conseguimos localizar os detalhes deste treino.</p>
          <Link
            href="/aluno/treinos"
            className="block w-full py-5 bg-gold-default text-black rounded-lg shadow-xl hover:bg-gold-light transition-all uppercase tracking-widest text-xs font-600"
          >
            Voltar para Meus Treinos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base p-4 md:p-6 lg:p-10 lg:pl-28 pb-32">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-10 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Link href="/aluno/treinos" className="inline-flex items-center gap-2 text-text-secondary text-[10px] uppercase tracking-widest hover:text-text-primary transition-all">
              <ArrowLeft size={12} /> {treinoIniciado ? "Abandonar" : "Voltar"}
            </Link>
            {treinoIniciado && (
              <div className="flex items-center gap-2 md:gap-3">
                 <div className="px-3 py-2 md:px-4 md:py-2.5 bg-gradient-to-br from-bg-card to-bg-elevated rounded-xl border border-gold-default/30 shadow-lg shadow-black/40 text-center min-w-[72px]">
                    <p className="text-[8px] text-gold-light uppercase tracking-widest">Tempo</p>
                    <p className="text-base md:text-lg text-text-primary font-mono font-bold leading-tight">{formatTime(seconds)}</p>
                 </div>
                 <div className="px-3 py-2 md:px-4 md:py-2.5 bg-gradient-to-br from-bg-card to-bg-elevated rounded-xl border border-border-subtle shadow-lg shadow-black/40 text-center min-w-[72px]">
                    <p className="text-[8px] text-text-disabled uppercase tracking-widest">Volume</p>
                    <p className="text-base md:text-lg text-gold-light font-bold leading-tight">{totalVolume}<span className="text-[10px] text-text-disabled ml-0.5">kg</span></p>
                 </div>
                 <div className="px-3 py-2 md:px-4 md:py-2.5 bg-gradient-to-br from-bg-card to-bg-elevated rounded-xl border border-border-subtle shadow-lg shadow-black/40 text-center min-w-[60px]">
                    <p className="text-[8px] text-text-disabled uppercase tracking-widest">Sets</p>
                    <p className="text-base md:text-lg text-text-primary font-bold leading-tight">{totalSets}</p>
                 </div>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h1 className="heading-h1 text-text-primary tracking-tighter leading-none">
              {ficha.nome_rotina}
            </h1>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleBaixarPDF}
                disabled={downloadingPDF}
                className="h-14 px-8 bg-bg-card text-text-primary rounded-lg uppercase tracking-widest text-[11px] hover:bg-bg-elevated active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 border border-border-subtle"
              >
                {downloadingPDF ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />}
                {downloadingPDF ? "Gerando..." : "Baixar PDF"}
              </button>
              {!treinoIniciado ? (
                <button
                  onClick={iniciarTreino}
                  style={{
                    background: 'linear-gradient(135deg, #EDD06B 0%, #D4AF47 45%, #B8972A 100%)',
                    color: '#000',
                    boxShadow: '0 10px 30px -8px rgba(212, 175, 71, 0.55), inset 0 1px 0 rgba(255,255,255,0.35)'
                  }}
                  className="h-14 px-10 rounded-xl uppercase tracking-widest text-[11px] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 font-bold border border-[#EDD06B]"
                >
                  <Play size={18} fill="currentColor" />
                  Iniciar Treino
                </button>
              ) : (
                <button
                  onClick={handleFinalizarTreino}
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #EDD06B 0%, #D4AF47 45%, #B8972A 100%)',
                    color: '#000',
                    boxShadow: '0 10px 30px -8px rgba(212, 175, 71, 0.55), inset 0 1px 0 rgba(255,255,255,0.35)'
                  }}
                  className="h-14 px-10 rounded-xl uppercase tracking-widest text-[11px] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 font-bold border border-[#EDD06B]"
                >
                  {saving ? "Salvando..." : "Concluir Treino"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Aviso se treino não iniciado */}
        {!treinoIniciado && (
          <div className="mb-8 p-5 bg-gradient-to-r from-gold-default/15 to-gold-default/5 border border-gold-default/30 rounded-xl flex items-start gap-4 shadow-lg shadow-black/30">
            <AlertCircle className="w-6 h-6 text-gold-default flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <h3 className="text-sm text-gold-light mb-1 font-semibold">Visualização da Ficha</h3>
              <p className="text-xs text-text-secondary">
                Clique em "Iniciar Treino" para entrar no modo de execução. O cronômetro só começa quando você marcar a primeira série ou clicar em Executar.
              </p>
            </div>
          </div>
        )}

        {/* Aviso quando treino iniciado mas timer ainda não começou */}
        {treinoIniciado && !timerStartAt && (
          <div className="mb-8 p-4 bg-gradient-to-r from-bg-card to-bg-elevated border border-gold-default/40 rounded-xl flex items-center gap-3 shadow-lg shadow-black/30">
            <div className="w-9 h-9 rounded-full bg-gold-default/20 border border-gold-default/40 flex items-center justify-center text-gold-light shrink-0 animate-pulse">
              <Play size={16} fill="currentColor" />
            </div>
            <p className="text-xs text-text-secondary">
              <span className="text-gold-light font-semibold">Pronto para começar.</span> Marque a primeira série ou clique em Executar para ligar o cronômetro.
            </p>
          </div>
        )}

        {/* Exercícios List */}
        <div className="space-y-6">
          {ficha.exercicios.map((exercicio, exIdx) => (
            <div
              key={exercicio.id}
              className="bg-gradient-to-b from-bg-card to-bg-surface rounded-2xl border border-border-subtle shadow-xl shadow-black/40 hover:border-gold-default/30 transition-colors p-4 md:p-6"
            >
              {/* Exercicio Info */}
              <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 bg-gradient-to-br from-gold-default/20 to-gold-default/5 rounded-xl border border-gold-default/30 flex items-center justify-center text-gold-light shrink-0 shadow-inner">
                    <Dumbbell size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="heading-h3 text-gold-light truncate">{exercicio.nome}</h3>
                      {exercicio.video_url && (
                        <button
                          onClick={() => setVideoModal(exercicio.video_url || null)}
                          className="w-8 h-8 rounded-full bg-gold-default/10 text-gold-light border border-gold-default/30 flex items-center justify-center hover:bg-gold-default hover:text-black transition-all shadow-md"
                          title="Assistir demonstração de vídeo"
                        >
                          <Play size={16} fill="currentColor" />
                        </button>
                      )}
                      {treinoIniciado && (
                        <button
                          onClick={() => iniciarExercicio(exIdx)}
                          style={{
                            background: 'linear-gradient(135deg, #EDD06B 0%, #B8972A 100%)',
                            color: '#000',
                            boxShadow: '0 6px 16px -6px rgba(212, 175, 71, 0.55), inset 0 1px 0 rgba(255,255,255,0.35)'
                          }}
                          className="ml-auto px-4 py-2 rounded-lg uppercase text-[10px] tracking-widest font-bold hover:brightness-110 active:scale-95 transition-all"
                        >
                          Executar
                        </button>
                      )}
                    </div>
                    <span className="label-small text-text-secondary">Descanso: {exercicio.descanso}</span>
                  </div>
              </div>

              {/* Observações do Coach */}
              {exercicio.observacoes && (
                <div className="mb-6 p-4 bg-bg-elevated border border-border-subtle rounded-lg">
                  <p className="label-small text-text-secondary mb-2">Observações do Coach</p>
                  <p className="body-text text-text-primary leading-relaxed">{exercicio.observacoes}</p>
                </div>
              )}

              {/* Series Table */}
              <div className="w-full">
                {/* Cabeçalhos - Desktop only */}
                <div className="hidden md:grid grid-cols-[3rem_1fr_1fr_auto_1fr_3.5rem] gap-2 mb-2 px-3">
                  <span className="text-[10px] uppercase tracking-widest text-text-disabled font-semibold">Set</span>
                  <span className="text-[10px] uppercase tracking-widest text-text-disabled text-center font-semibold">Anterior</span>
                  <span className="text-[10px] uppercase tracking-widest text-text-disabled text-center font-semibold">Peso kg</span>
                  <span className="text-[10px] uppercase tracking-widest text-text-disabled text-center font-semibold">Téc</span>
                  <span className="text-[10px] uppercase tracking-widest text-text-disabled text-center font-semibold">Reps</span>
                  <span className="text-[10px] uppercase tracking-widest text-text-disabled text-right opacity-0">Y</span>
                </div>

                <div className="space-y-2">
                  {exercicio.series.map((serie, sIdx) => (
                    <div key={sIdx}>
                      {/* Layout Mobile */}
                      <div
                        className={`md:hidden p-3 rounded-xl space-y-3 transition-all border-2 ${
                          serie.completado
                            ? 'bg-gradient-to-br from-gold-default/25 to-gold-default/10 border-gold-default/60 shadow-lg shadow-gold-default/10'
                            : 'bg-gradient-to-br from-bg-elevated to-bg-card border-border-subtle shadow-md shadow-black/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-inner border ${
                              serie.completado
                                ? 'bg-gold-default text-black border-gold-light'
                                : 'bg-bg-base text-text-primary border-border-default'
                            }`}>
                              <span className="text-sm font-bold">{sIdx + 1}</span>
                            </div>
                            <span className="text-[10px] text-text-secondary">Anterior: <span className="font-mono text-text-primary">{serie.anterior}</span></span>
                          </div>
                          <button
                            onClick={() => handleCheckSerie(exercicio.id, serie.ordem)}
                            disabled={!treinoIniciado}
                            style={serie.completado ? {
                              background: 'linear-gradient(135deg, #EDD06B 0%, #B8972A 100%)',
                              color: '#000',
                              boxShadow: '0 6px 14px -4px rgba(212, 175, 71, 0.6), inset 0 1px 0 rgba(255,255,255,0.4)'
                            } : undefined}
                            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed ${
                              serie.completado
                                ? 'border border-gold-light'
                                : 'bg-bg-base text-text-secondary border-2 border-border-default hover:border-gold-default/50'
                            }`}
                          >
                            <Check size={20} strokeWidth={4} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-wider text-text-disabled px-1 font-semibold">Peso (kg)</label>
                            <input
                              type="number"
                              value={serie.peso_atual || ''}
                              onChange={(e) => handleUpdateSerie(exercicio.id, serie.ordem,"peso_atual", parseFloat(e.target.value) || 0)}
                              disabled={!treinoIniciado}
                              className="w-full h-12 bg-bg-base border-2 border-border-subtle rounded-lg text-center text-base font-bold text-text-primary focus:border-gold-default outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                              placeholder="0"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-wider text-text-disabled px-1 font-semibold">Reps</label>
                            <div className="w-full h-12 bg-gradient-to-br from-bg-card to-bg-base border-2 border-border-subtle rounded-lg flex items-center justify-center shadow-inner">
                              <span className="text-base text-gold-light font-bold">{serie.reps || '0'}</span>
                            </div>
                          </div>

                          <div className="space-y-1 col-span-2">
                            <label className="text-[10px] uppercase tracking-wider text-text-disabled px-1 font-semibold">Técnica</label>
                            <div className="w-full h-10 bg-gradient-to-br from-bg-card to-bg-base border-2 border-border-subtle rounded-lg flex items-center justify-center shadow-inner">
                              <span className="text-sm text-text-primary">{serie.tecnica || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Layout Desktop */}
                      <div
                        className={`hidden md:grid grid-cols-[3rem_1fr_1fr_auto_1fr_3.5rem] gap-2 items-center p-2.5 rounded-xl transition-all border ${
                          serie.completado
                            ? 'bg-gradient-to-r from-gold-default/15 to-gold-default/5 border-gold-default/40 shadow-md shadow-gold-default/10'
                            : 'bg-bg-base/40 border-transparent hover:border-border-subtle'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-inner border ${
                          serie.completado
                            ? 'bg-gold-default text-black border-gold-light'
                            : 'bg-bg-card text-text-primary border-border-default'
                        }`}>
                          <span className="text-sm font-bold">{sIdx + 1}</span>
                        </div>

                        <div className="text-center">
                          <span className="text-[11px] text-text-primary font-mono">{serie.anterior}</span>
                        </div>

                        <div className="flex justify-center">
                          <input
                            type="number"
                            value={serie.peso_atual || ''}
                            onChange={(e) => handleUpdateSerie(exercicio.id, serie.ordem,"peso_atual", parseFloat(e.target.value) || 0)}
                            disabled={!treinoIniciado}
                            className="w-20 h-11 bg-bg-base border-2 border-border-subtle rounded-lg text-center text-sm font-bold text-text-primary focus:border-gold-default outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                            placeholder="0"
                          />
                        </div>

                        <div className="flex justify-center">
                          <div className="w-12 h-11 bg-gradient-to-br from-bg-card to-bg-base border-2 border-border-subtle rounded-lg flex items-center justify-center shadow-inner">
                            <span className="text-[11px] text-text-primary font-medium">{serie.tecnica || '-'}</span>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div className="w-16 h-11 bg-gradient-to-br from-bg-card to-bg-base border-2 border-border-subtle rounded-lg flex items-center justify-center shadow-inner">
                            <span className="text-sm text-gold-light font-bold">{serie.reps || '0'}</span>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => handleCheckSerie(exercicio.id, serie.ordem)}
                            disabled={!treinoIniciado}
                            style={serie.completado ? {
                              background: 'linear-gradient(135deg, #EDD06B 0%, #B8972A 100%)',
                              color: '#000',
                              boxShadow: '0 6px 14px -4px rgba(212, 175, 71, 0.6), inset 0 1px 0 rgba(255,255,255,0.4)'
                            } : undefined}
                            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed ${
                              serie.completado
                                ? 'border border-gold-light'
                                : 'bg-bg-card text-text-secondary border-2 border-border-default hover:border-gold-default/50'
                            }`}
                          >
                            <Check size={20} strokeWidth={4} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Seção de Feedback */}
        <div className="mt-16 p-8 bg-bg-card border border-border-subtle rounded-lg">
          <h3 className="heading-h3 text-text-primary mb-2">Feedback do Treino</h3>
          <p className="label-small text-text-secondary mb-6">Apenas seu coach poderá ver este feedback</p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Como foi o treino? Sentiu alguma dor? Conseguiu completar todas as séries?"
            className="w-full px-4 py-3 bg-bg-base border border-border-subtle rounded-lg text-text-primary placeholder-text-disabled focus:border-gold-default outline-none resize-none mb-4"
            rows={4}
          />
          <button
            onClick={async () => {
              if (!feedback.trim()) {
                alert("Digite um feedback antes de enviar.");
                return;
              }
              if (!coachId || !fichaId) return;

              setSavingFeedback(true);
              try {
                const { data: authData } = await supabaseClient.auth.getUser();
                const userId = authData?.user?.id;
                if (!userId) return;

                const { error } = await supabaseClient.from("feedbacks_treinos").insert({
                  aluno_id: userId,
                  coach_id: coachId,
                  ficha_id: fichaId,
                  feedback: feedback.trim(),
                  tipo: 'treino_completo',
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
            className="w-full h-12 bg-gold-default text-black rounded-lg uppercase tracking-widest text-[11px] hover:bg-gold-light active:scale-95 transition-all disabled:opacity-50 font-600"
          >
            {savingFeedback ? "Enviando..." : "Enviar Feedback"}
          </button>
        </div>
      </div>

      {/* Video Modal */}
      {videoModal && (
        <YouTubePlayer
          videoUrl={videoModal}
          onClose={() => setVideoModal(null)}
        />
      )}

      {/* Modal de Execução de Exercício - Estilo Neon */}
      {exercicioAtivo !== null && ficha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl h-[85vh] bg-gradient-to-b from-bg-elevated via-bg-base to-bg-base rounded-lg border-2 border-danger shadow-[0_0_40px_rgba(192,57,43,0.6),inset_0_0_40px_rgba(192,57,43,0.1)] overflow-hidden">
            
            {/* Botão Fechar */}
            <button
              onClick={() => setExercicioAtivo(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-bg-base/80 hover:bg-danger text-text-primary rounded-full flex items-center justify-center transition-all"
            >
              <X size={20} />
            </button>

            {/* Conteúdo do Modal */}
            <div className="h-full flex flex-col">
              
              {/* Nome do Exercício - Topo */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="label-small text-danger">{exercicioAtivo + 1}º EXERCÍCIO</span>
                </div>
                <h2 className="heading-h2 text-text-primary uppercase tracking-tight">
                  {ficha.exercicios[exercicioAtivo].nome}
                </h2>
              </div>

              {/* Player de Vídeo */}
              <div className="w-full aspect-video bg-bg-base border-y border-danger/30 flex items-center justify-center overflow-hidden">
                {ficha.exercicios[exercicioAtivo].video_url ? (
                  <iframe
                    src={ficha.exercicios[exercicioAtivo].video_url}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                  />
                ) : (
                  <div className="text-text-disabled text-center">
                    <Video size={48} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Sem vídeo disponível</p>
                  </div>
                )}
              </div>

              {/* Timer de Descanso */}
              {descansoAtivo && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-bg-base/95 border-2 border-danger rounded-lg p-8 text-center shadow-[0_0_60px_rgba(192,57,43,0.8)]">
                  <Clock size={48} className="mx-auto mb-4 text-danger animate-pulse" />
                  <p className="text-text-secondary uppercase text-xs tracking-wider mb-2">Descanso</p>
                  <p className="text-6xl font-bold text-text-primary font-mono">{formatarTempoDescanso(tempoDescanso)}</p>
                  <button
                    onClick={() => {
                      setDescansoAtivo(false);
                      setDescansoEndAt(null);
                      proximaSerie();
                    }}
                    className="mt-6 px-6 py-2 bg-bg-card hover:bg-bg-elevated text-text-primary rounded-lg text-sm uppercase tracking-wider transition-all border border-border-subtle"
                  >
                    Pular Descanso
                  </button>
                </div>
              )}

              {/* Informações e Controles */}
              <div className="flex-1 px-6 py-6 overflow-y-auto">
                
                {/* Séries Realizadas */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="label-small text-text-secondary">Progresso</span>
                    <span className="text-3xl font-bold text-text-primary">
                      {serieAtual + 1}/{ficha.exercicios[exercicioAtivo].series.length}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-bg-card rounded-full overflow-hidden border border-border-subtle">
                    <div 
                      className="h-full bg-gradient-to-r from-danger to-danger/70 transition-all duration-300"
                      style={{ width: `${((serieAtual + 1) / ficha.exercicios[exercicioAtivo].series.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Info da Série Atual */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-bg-card border border-border-subtle rounded-lg p-4 text-center">
                    <p className="label-small text-text-secondary mb-1">Repetições</p>
                    <p className="text-2xl font-bold text-danger">
                      {ficha.exercicios[exercicioAtivo].series[serieAtual]?.reps || '0'}
                    </p>
                  </div>
                  <div className="bg-bg-card border border-border-subtle rounded-lg p-4 text-center">
                    <p className="label-small text-text-secondary mb-1">Carga</p>
                    <p className="text-2xl font-bold text-text-primary">
                      {cargaTemporaria} kg
                    </p>
                  </div>
                  <div className="bg-bg-card border border-border-subtle rounded-lg p-4 text-center">
                    <p className="label-small text-text-secondary mb-1">Técnica</p>
                    <p className="text-2xl font-bold text-text-disabled">
                      {ficha.exercicios[exercicioAtivo].series[serieAtual]?.tecnica || '-'}
                    </p>
                  </div>
                </div>

                {/* Ajuste de Carga */}
                <div className="mb-6 p-4 bg-bg-card border border-border-subtle rounded-lg">
                  <label className="label-small text-text-secondary mb-2 block">
                    Ajustar Carga (kg)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCargaTemporaria(Math.max(0, cargaTemporaria - 2.5))}
                      className="w-12 h-12 bg-bg-elevated hover:bg-danger/20 text-text-primary rounded-lg text-xl font-bold transition-all border border-border-subtle hover:border-danger"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={cargaTemporaria}
                      onChange={(e) => setCargaTemporaria(parseFloat(e.target.value) || 0)}
                      className="flex-1 h-12 bg-bg-base border-2 border-border-subtle rounded-lg text-center text-2xl font-bold text-text-primary focus:border-danger outline-none transition-all"
                      step="0.5"
                    />
                    <button
                      onClick={() => setCargaTemporaria(cargaTemporaria + 2.5)}
                      className="w-12 h-12 bg-bg-elevated hover:bg-danger/20 text-text-primary rounded-lg text-xl font-bold transition-all border border-border-subtle hover:border-danger"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Série Anterior */}
                {ficha.exercicios[exercicioAtivo].series[serieAtual]?.anterior && (
                  <div className="mb-4 p-3 bg-bg-card border border-border-subtle rounded-lg">
                    <p className="label-small text-text-secondary mb-1">Última Vez</p>
                    <p className="body-text text-text-primary font-mono">
                      {ficha.exercicios[exercicioAtivo].series[serieAtual].anterior}
                    </p>
                  </div>
                )}

              </div>

              {/* Botão Concluir */}
              <div className="px-6 pb-6">
                <button
                  onClick={() => {
                    if (serieAtual >= ficha.exercicios[exercicioAtivo].series.length - 1) {
                      concluirExercicio();
                    } else {
                      concluirSerie();
                    }
                  }}
                  disabled={descansoAtivo}
                  className="w-full h-16 bg-gradient-to-r from-danger to-danger/80 hover:from-danger/90 hover:to-danger/70 text-white rounded-lg font-bold uppercase tracking-wider text-lg transition-all shadow-[0_0_30px_rgba(192,57,43,0.4)] hover:shadow-[0_0_40px_rgba(192,57,43,0.6)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {serieAtual >= ficha.exercicios[exercicioAtivo].series.length - 1
                    ? '✓ Concluir Exercício'
                    : `Concluir Série ${serieAtual + 1}/${ficha.exercicios[exercicioAtivo].series.length}`
                  }
                </button>
              </div>

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
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-6 lg:pl-28">
        <DumbbellLoader text="Iniciando aplicativo..." />
      </div>
    }>
      <FichaContent />
    </Suspense>
  );
}
