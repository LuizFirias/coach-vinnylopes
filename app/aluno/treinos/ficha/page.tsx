"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
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
  Dumbbell
} from "lucide-react";
import Link from "next/link";

interface Serie {
  ordem: number;
  anterior: string;
  peso_atual: number;
  reps: number;
  completado: boolean;
}

interface Exercicio {
  id: string;
  nome: string;
  descanso: string;
  video_url?: string;
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
  const [videoModal, setVideoModal] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    loadFicha();
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [fichaId]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? hrs + ":" : ""}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalVolume = ficha?.exercicios.reduce((acc, ex) => {
    return acc + ex.series.filter(s => s.completado).reduce((sAcc, s) => sAcc + (s.peso_atual * s.reps), 0);
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

      // Construir ficha com dados anteriores
      const exerciciosComHistorico = (configuracao.exercicios || []).map((ex: any) => {
        const historicoEx = historico?.exercicios?.find((h: any) => h.id === ex.id);
        
        return {
          ...ex,
          series: (ex.series || []).map((serie: any, idx: number) => {
            const seriePrev = historicoEx?.series?.[idx];
            const anterior = seriePrev 
              ? `${seriePrev.peso_atual || 0}kg x ${seriePrev.reps || 0}`
              : "—";
            
            return {
              ordem: serie.ordem || idx + 1,
              anterior,
              peso_atual: serie.peso_atual ?? 0,
              reps: serie.reps ?? 0,
              completado: false,
            };
          }),
        };
      });

      setFicha({
        id: fichaData.id,
        nome_rotina: fichaData.nome_rotina,
        exercicios: exerciciosComHistorico,
      });
    } catch (err) {
      console.error("Erro ao carregar ficha:", err);
    } finally {
      setLoading(false);
    }
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

  const handleUpdateSerie = (exercicioId: string, serieOrdem: number, field: "peso_atual" | "reps", value: number) => {
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
      router.push("/aluno/treinos");
    } catch (err) {
      console.error("Erro ao salvar histórico:", err);
      alert("Erro ao finalizar treino");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 lg:pl-28">
        <div className="flex flex-col items-center gap-4 text-zinc-500">
          <div className="w-12 h-12 border-4 border-iron-gold/20 border-t-iron-gold rounded-full animate-spin"></div>
          <span className="font-bold uppercase tracking-widest text-[10px]">Preparando seu treino...</span>
        </div>
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
          <h2 className="text-2xl font-black text-white mb-2 uppercase">Não Encontrado</h2>
          <p className="text-zinc-500 font-medium italic mb-10">Não conseguimos localizar os detalhes deste treino.</p>
          <Link
            href="/aluno/treinos"
            className="block w-full py-5 bg-iron-gold text-black rounded-xl font-black shadow-xl hover:bg-white transition-all uppercase tracking-widest text-xs"
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
            <Link href="/aluno/treinos" className="inline-flex items-center gap-2 text-zinc-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-all">
              <ArrowLeft size={12} /> Abandonar
            </Link>
            <div className="flex items-center gap-6">
               <div className="text-center">
                  <p className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">Tempo</p>
                  <p className="text-sm font-black text-white font-mono">{formatTime(seconds)}</p>
               </div>
               <div className="text-center">
                  <p className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">Volume</p>
                  <p className="text-sm font-black text-iron-gold">{totalVolume} kg</p>
               </div>
               <div className="text-center">
                  <p className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">Séries</p>
                  <p className="text-sm font-black text-white">{totalSets}</p>
               </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none uppercase">
              {ficha.nome_rotina}
            </h1>
            <button
               onClick={handleFinalizarTreino}
               disabled={saving}
               className="h-14 px-10 bg-iron-gold text-black rounded-xl font-bold uppercase tracking-widest text-[11px] hover:bg-white active:scale-95 transition-all flex items-center justify-center gap-3"
            >
               {saving ? "Salvando..." : "Concluir Treino"}
            </button>
          </div>
        </div>

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
                    <h3 className="text-xl font-black text-iron-gold uppercase tracking-tight">{exercicio.nome}</h3>
                    <div className="flex items-center gap-4 mt-1">
                       <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Descanso: {exercicio.descanso}</span>
                       {exercicio.video_url && (
                         <button onClick={() => setVideoModal(exercicio.video_url || null)} className="text-[10px] font-black text-white uppercase tracking-widest underline decoration-iron-gold/30 underline-offset-4">Vídeo</button>
                       )}
                    </div>
                  </div>
              </div>

              {/* Series Table */}
              <div className="w-full">
                <div className="grid grid-cols-[3rem_1fr_1fr_1fr_3.5rem] gap-2 mb-3 px-2">
                  <span className="text-[9px] font-black text-zinc-700 uppercase">Set</span>
                  <span className="text-[9px] font-black text-zinc-700 uppercase text-center">Anterior</span>
                  <span className="text-[9px] font-black text-zinc-700 uppercase text-center">Peso kg</span>
                  <span className="text-[9px] font-black text-zinc-700 uppercase text-center">Reps</span>
                  <span className="text-[9px] font-black text-zinc-700 uppercase text-right opacity-0">Y</span>
                </div>

                <div className="space-y-2">
                  {exercicio.series.map((serie, sIdx) => (
                    <div 
                      key={sIdx} 
                      className={`grid grid-cols-[3rem_1fr_1fr_1fr_3.5rem] gap-2 items-center p-2 rounded-lg transition-colors ${serie.completado ? 'bg-iron-gold/5' : 'bg-transparent'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-iron-gray border border-iron-divider flex items-center justify-center">
                         <span className="text-[10px] font-bold text-zinc-500">{sIdx + 1}</span>
                      </div>
                      
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-zinc-600 font-mono italic">{serie.anterior}</span>
                      </div>

                      <div className="flex justify-center">
                        <input
                          type="number"
                          value={serie.peso_atual}
                          onChange={(e) => handleUpdateSerie(exercicio.id, serie.ordem, "peso_atual", parseFloat(e.target.value) || 0)}
                          className="w-16 h-10 bg-black border border-iron-divider rounded-lg text-center text-sm font-bold text-white focus:border-iron-gold outline-none transition-colors"
                          placeholder="0"
                        />
                      </div>

                      <div className="flex justify-center">
                        <input
                          type="number"
                          value={serie.reps}
                          onChange={(e) => handleUpdateSerie(exercicio.id, serie.ordem, "reps", parseInt(e.target.value) || 0)}
                          className="w-16 h-10 bg-black border border-iron-divider rounded-lg text-center text-sm font-bold text-white focus:border-iron-gold outline-none transition-colors"
                          placeholder="0"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => handleCheckSerie(exercicio.id, serie.ordem)}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                            serie.completado 
                              ? 'bg-iron-gold text-black shadow-lg shadow-iron-gold/20' 
                              : 'bg-iron-gray text-zinc-700 border border-iron-divider'
                          }`}
                        >
                          <Check size={18} strokeWidth={4} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal */}
      {videoModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setVideoModal(null)} />
          <div className="relative bg-iron-gray w-full max-w-xl aspect-video rounded-2xl border border-iron-divider overflow-hidden shadow-2xl">
            <button onClick={() => setVideoModal(null)} className="absolute top-4 right-4 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center z-10 backdrop-blur-md">
              <X size={20} />
            </button>
            <iframe src={videoModal} className="w-full h-full" allowFullScreen />
          </div>
        </div>
      )}
    </div>
  );
}

export default function FichaTreinoAlunoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 lg:pl-28">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-12 h-12 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin"></div>
          <span className="font-bold uppercase tracking-widest text-[10px]">Iniciando aplicativo...</span>
        </div>
      </div>
    }>
      <FichaContent />
    </Suspense>
  );
}
