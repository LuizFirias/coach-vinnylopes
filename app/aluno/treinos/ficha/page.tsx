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
  const [feedback, setFeedback] = useState<string>("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [treinoIniciado, setTreinoIniciado] = useState(false);

  useEffect(() => {
    loadFicha();
    
    // Verificar se há treino ativo no localStorage
    const treinoAtivo = localStorage.getItem(`treino_ativo_${fichaId}`);
    if (treinoAtivo) {
      const dados = JSON.parse(treinoAtivo);
      setTreinoIniciado(true);
      // Calcular tempo decorrido
      const agora = Date.now();
      const tempoDecorrido = Math.floor((agora - dados.inicio) / 1000);
      setSeconds(tempoDecorrido);
    }
  }, [fichaId]);

  useEffect(() => {
    if (!treinoIniciado) return;
    
    // Atualizar localStorage com tempo atual
    const interval = setInterval(() => {
      setSeconds(s => {
        const novoTempo = s + 1;
        const treinoAtivo = localStorage.getItem(`treino_ativo_${fichaId}`);
        if (treinoAtivo) {
          const dados = JSON.parse(treinoAtivo);
          localStorage.setItem(`treino_ativo_${fichaId}`, JSON.stringify({
            ...dados,
            segundos: novoTempo
          }));
        }
        return novoTempo;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fichaId, treinoIniciado]);

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
    setTreinoIniciado(true);
    const agora = Date.now();
    localStorage.setItem(`treino_ativo_${fichaId}`, JSON.stringify({
      fichaId,
      inicio: agora,
      segundos: 0
    }));
  };

  const handleCheckSerie = (exercicioId: string, serieOrdem: number) => {
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
      
      // Limpar treino ativo do localStorage
      localStorage.removeItem(`treino_ativo_${fichaId}`);
      
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
      <div className="min-h-screen bg-black flex items-center justify-center p-6 lg:pl-28">
        <DumbbellLoader text="Preparando seu treino..." />
      </div>
    );
  }

  if (!ficha) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 lg:pl-28">
        <div className="bg-iron-gray p-12 rounded-3xl shadow-2xl text-center max-w-md w-full border border-iron-divider">
          <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mx-auto mb-8 text-iron-gold">
             <Dumbbell size={40} />
          </div>
          <h2 className="text-2xl text-white mb-2 uppercase">Não Encontrado</h2>
          <p className="text-zinc-500 font-medium mb-10">Não conseguimos localizar os detalhes deste treino.</p>
          <Link
            href="/aluno/treinos"
            className="block w-full py-5 bg-iron-gold text-black rounded-xl shadow-xl hover:bg-white transition-all uppercase tracking-widest text-xs"
          >
            Voltar para Meus Treinos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6 lg:p-10 lg:pl-28 pb-32">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-10 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Link href="/aluno/treinos" className="inline-flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-widest hover:text-white transition-all">
              <ArrowLeft size={12} /> {treinoIniciado ? "Abandonar" : "Voltar"}
            </Link>
            {treinoIniciado && (
              <div className="flex items-center gap-6">
                 <div className="text-center">
                    <p className="text-[8px] text-zinc-600 uppercase tracking-tighter">Tempo</p>
                    <p className="text-sm text-white font-mono">{formatTime(seconds)}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[8px] text-zinc-600 uppercase tracking-tighter">Volume</p>
                    <p className="text-sm text-iron-gold">{totalVolume} kg</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[8px] text-zinc-600 uppercase tracking-tighter">Séries</p>
                    <p className="text-sm text-white">{totalSets}</p>
                 </div>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h1 className="text-4xl md:text-5xl text-white tracking-tighter leading-none uppercase">
              {ficha.nome_rotina}
            </h1>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleBaixarPDF}
                disabled={downloadingPDF}
                className="h-14 px-8 bg-slate-700 text-white rounded-xl uppercase tracking-widest text-[11px] hover:bg-slate-600 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {downloadingPDF ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />}
                {downloadingPDF ? "Gerando..." : "Baixar PDF"}
              </button>
              {!treinoIniciado ? (
                <button
                  onClick={iniciarTreino}
                  className="h-14 px-10 bg-iron-gold text-black rounded-xl uppercase tracking-widest text-[11px] hover:bg-white active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg shadow-iron-gold/30"
                >
                  <Play size={18} fill="currentColor" />
                  Iniciar Treino
                </button>
              ) : (
                <button
                  onClick={handleFinalizarTreino}
                  disabled={saving}
                  className="h-14 px-10 bg-iron-gold text-black rounded-xl uppercase tracking-widest text-[11px] hover:bg-white active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Concluir Treino"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Aviso se treino não iniciado */}
        {!treinoIniciado && (
          <div className="mb-8 p-6 bg-iron-gold/10 border border-iron-gold/30 rounded-2xl flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-iron-gold flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <h3 className="text-sm text-iron-gold mb-1">Visualização da Ficha</h3>
              <p className="text-xs text-zinc-400">
                Você está visualizando a ficha. Clique em "Iniciar Treino" quando estiver pronto para começar seu treino e ativar o cronômetro.
              </p>
            </div>
          </div>
        )}

        {/* Exercícios List */}
        <div className="space-y-12">
          {ficha.exercicios.map((exercicio, exIdx) => (
            <div key={exercicio.id} className="bg-black">
              {/* Exercicio Info */}
              <div className="flex items-start gap-4 mb-6 pt-6 border-t border-iron-divider">
                  <div className="w-10 h-10 bg-iron-gray rounded-lg border border-iron-divider flex items-center justify-center text-zinc-700 shrink-0">
                    <Dumbbell size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl text-iron-gold uppercase tracking-tight">{exercicio.nome}</h3>
                      {exercicio.video_url && (
                        <button
                          onClick={() => setVideoModal(exercicio.video_url || null)}
                          className="w-8 h-8 rounded-full bg-iron-gold/10 text-iron-gold border border-iron-gold/30 flex items-center justify-center hover:bg-iron-gold hover:text-black transition-all"
                          title="Assistir demonstração de vídeo"
                        >
                          <Play size={16} fill="currentColor" />
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Descanso: {exercicio.descanso}</span>
                  </div>
              </div>

              {/* Observações do Coach */}
              {exercicio.observacoes && (
                <div className="mb-6 p-4 bg-iron-gray/30 border border-iron-divider rounded-xl">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-2">Observações do Coach</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{exercicio.observacoes}</p>
                </div>
              )}

              {/* Series Table */}
              <div className="w-full">
                {/* Cabeçalhos - Desktop only */}
                <div className="hidden md:grid grid-cols-[3rem_1fr_1fr_auto_1fr_3.5rem] gap-2 mb-3 px-2">
                  <span className="text-[9px] text-zinc-700 uppercase">Set</span>
                  <span className="text-[9px] text-zinc-700 uppercase text-center">Anterior</span>
                  <span className="text-[9px] text-zinc-700 uppercase text-center">Peso kg</span>
                  <span className="text-[9px] text-zinc-700 uppercase text-center">Téc</span>
                  <span className="text-[9px] text-zinc-700 uppercase text-center">Reps</span>
                  <span className="text-[9px] text-zinc-700 uppercase text-right opacity-0">Y</span>
                </div>

                <div className="space-y-2">
                  {exercicio.series.map((serie, sIdx) => (
                    <div key={sIdx}>
                      {/* Layout Mobile */}
                      <div className={`md:hidden p-3 rounded-xl space-y-3 transition-colors ${serie.completado ? 'bg-iron-gold/5 border border-iron-gold/20' : 'bg-iron-gray/20 border border-iron-divider'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-iron-gray border border-iron-divider flex items-center justify-center">
                              <span className="text-[10px] text-zinc-500">{sIdx + 1}</span>
                            </div>
                            <span className="text-[9px] text-zinc-600">Anterior: <span className="font-mono">{serie.anterior}</span></span>
                          </div>
                          <button
                            onClick={() => handleCheckSerie(exercicio.id, serie.ordem)}
                            disabled={!treinoIniciado}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                              serie.completado 
                                ? 'bg-iron-gold text-black shadow-lg shadow-iron-gold/20' 
                                : 'bg-iron-gray text-zinc-700 border border-iron-divider'
                            }`}
                          >
                            <Check size={18} strokeWidth={4} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[8px] uppercase tracking-wider text-zinc-600 px-1">Peso (kg)</label>
                            <input
                              type="number"
                              value={serie.peso_atual}
                              onChange={(e) => handleUpdateSerie(exercicio.id, serie.ordem,"peso_atual", parseFloat(e.target.value) || 0)}
                              disabled={!treinoIniciado}
                              className="w-full h-11 bg-black border border-iron-divider rounded-lg text-center text-sm text-white focus:border-iron-gold outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              placeholder="0"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[8px] uppercase tracking-wider text-zinc-600 px-1">Reps (Coach)</label>
                            <div className="w-full h-11 bg-iron-gray/50 border border-iron-divider rounded-lg flex items-center justify-center">
                              <span className="text-sm text-iron-gold font-medium">{serie.reps || '0'}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-1 col-span-2">
                            <label className="text-[8px] uppercase tracking-wider text-zinc-600 px-1">Técnica</label>
                            <div className="w-full h-11 bg-iron-gray/50 border border-iron-divider rounded-lg flex items-center justify-center">
                              <span className="text-sm text-zinc-400">{serie.tecnica || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Layout Desktop */}
                      <div className={`hidden md:grid grid-cols-[3rem_1fr_1fr_auto_1fr_3.5rem] gap-2 items-center p-2 rounded-lg transition-colors ${serie.completado ? 'bg-iron-gold/5' : 'bg-transparent'}`}>
                        <div className="w-8 h-8 rounded-full bg-iron-gray border border-iron-divider flex items-center justify-center">
                          <span className="text-[10px] text-zinc-500">{sIdx + 1}</span>
                        </div>
                        
                        <div className="text-center">
                          <span className="text-[10px] text-zinc-600 font-mono">{serie.anterior}</span>
                        </div>

                        <div className="flex justify-center">
                          <input
                            type="number"
                            value={serie.peso_atual}
                            onChange={(e) => handleUpdateSerie(exercicio.id, serie.ordem,"peso_atual", parseFloat(e.target.value) || 0)}
                            disabled={!treinoIniciado}
                            className="w-16 h-10 bg-black border border-iron-divider rounded-lg text-center text-sm text-white focus:border-iron-gold outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="0"
                          />
                        </div>

                        <div className="flex justify-center">
                          <div className="w-12 h-10 bg-iron-gray/50 border border-iron-divider rounded-lg flex items-center justify-center">
                            <span className="text-[10px] text-zinc-500">{serie.tecnica || '-'}</span>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div className="w-16 h-10 bg-iron-gray/50 border border-iron-divider rounded-lg flex items-center justify-center">
                            <span className="text-sm text-iron-gold font-medium">{serie.reps || '0'}</span>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => handleCheckSerie(exercicio.id, serie.ordem)}
                            disabled={!treinoIniciado}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                              serie.completado 
                                ? 'bg-iron-gold text-black shadow-lg shadow-iron-gold/20' 
                                : 'bg-iron-gray text-zinc-700 border border-iron-divider'
                            }`}
                          >
                            <Check size={18} strokeWidth={4} />
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
        <div className="mt-16 p-8 bg-iron-gray/30 border border-iron-divider rounded-2xl">
          <h3 className="text-lg text-white uppercase tracking-tight mb-2">Feedback do Treino</h3>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-6">Apenas seu coach poderá ver este feedback</p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Como foi o treino? Sentiu alguma dor? Conseguiu completar todas as séries?"
            className="w-full px-4 py-3 bg-black border border-iron-divider rounded-xl text-white placeholder-zinc-700 focus:border-iron-gold outline-none resize-none mb-4"
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
            className="w-full h-12 bg-iron-gold text-black rounded-xl uppercase tracking-widest text-[11px] hover:bg-white active:scale-95 transition-all disabled:opacity-50"
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
    </div>
  );
}

export default function FichaTreinoAlunoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 lg:pl-28">
        <DumbbellLoader text="Iniciando aplicativo..." />
      </div>
    }>
      <FichaContent />
    </Suspense>
  );
}
