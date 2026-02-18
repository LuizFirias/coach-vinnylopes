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

  useEffect(() => {
    loadFicha();
  }, [fichaId]);

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
              peso_atual: serie.peso_atual || 0,
              reps: serie.reps || 0,
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

      const dadosSessao = {
        nome_rotina: ficha.nome_rotina,
        exercicios: ficha.exercicios,
        data_sessao: new Date().toISOString(),
      };

      const { error } = await supabaseClient.from("historico_treinos").insert({
        ficha_id: ficha.id,
        aluno_id: userId,
        dados_sessao: dadosSessao,
        data_conclusao: new Date().toISOString(),
      });

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 lg:pl-28">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-12 h-12 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin"></div>
          <span className="font-bold uppercase tracking-widest text-[10px]">Preparando seu treino...</span>
        </div>
      </div>
    );
  }

  if (!ficha) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 lg:pl-28">
        <div className="bg-white p-12 rounded-[50px] shadow-2xl shadow-slate-200/40 text-center max-w-md w-full border border-slate-50">
          <div className="w-20 h-20 bg-slate-50 rounded-[30px] flex items-center justify-center mx-auto mb-8 text-slate-400">
             <Dumbbell size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase">Não Encontrado</h2>
          <p className="text-slate-500 font-medium italic mb-10">Não conseguimos localizar os detalhes deste treino ou ele não está mais disponível.</p>
          <Link
            href="/aluno/treinos"
            className="block w-full py-5 bg-brand-purple text-white rounded-3xl font-black shadow-xl shadow-brand-purple/30 hover:bg-brand-purple/90 transition-all uppercase tracking-widest text-xs"
          >
            Voltar para Meus Treinos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-10 lg:pl-40 font-sans pb-24 md:pb-32">
      <div className="max-w-4xl mx-auto">
        
        {/* Top Navigation & Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-8 md:mb-12">
          <div>
            <Link href="/aluno/treinos" className="inline-flex items-center gap-2 text-brand-purple font-black text-[9px] md:text-[10px] uppercase tracking-widest mb-3 md:mb-4 hover:ml-1 transition-all">
              <ArrowLeft size={12} /> Abandonar Treino
            </Link>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none uppercase">
              {ficha.nome_rotina}
            </h1>
          </div>
          
          <button
            onClick={handleFinalizarTreino}
            disabled={saving}
            className="h-14 md:h-16 px-8 md:px-10 bg-slate-900 text-white rounded-2xl md:rounded-[24px] font-black shadow-2xl shadow-slate-900/20 hover:bg-brand-purple hover:shadow-brand-purple/30 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group uppercase tracking-widest text-xs"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                Finalizar Sessão
                <Trophy className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </>
            )}
          </button>
        </div>

        {/* Exercícios List */}
        <div className="space-y-8 md:space-y-12">
          {ficha.exercicios.map((exercicio, exIdx) => (
            <div
              key={exercicio.id}
              className="bg-white rounded-2xl md:rounded-[50px] border border-white shadow-2xl shadow-slate-200/40 overflow-hidden"
            >
              {/* Exercicio Header */}
              <div className="p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 border-b border-slate-50">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-900 text-white rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0 shadow-lg shadow-slate-200 rotate-3 transition-transform hover:rotate-0">
                    <span className="text-xl md:text-2xl font-black">{(exIdx + 1).toString().padStart(2, '0')}</span>
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2 leading-tight uppercase tracking-tight">{exercicio.nome}</h3>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <RotateCcw size={12} className="text-brand-purple/60" />
                        Descanso: {exercicio.descanso}
                      </div>
                      {exercicio.video_url && (
                        <button
                          onClick={() => setVideoModal(exercicio.video_url || null)}
                          className="flex items-center gap-2 px-4 py-2 bg-brand-purple/5 text-brand-purple rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-purple/10 transition-colors"
                        >
                          <Video size={14} />
                          Demonstração
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Series Table */}
              <div className="p-4 md:p-10">
                <div className="bg-slate-50/50 rounded-[35px] overflow-hidden border border-slate-50">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100/30">
                        <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Série</th>
                        <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Anterior</th>
                        <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Carga (kg)</th>
                        <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Reps</th>
                        <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50">
                      {exercicio.series.map((serie) => (
                        <tr 
                          key={serie.ordem} 
                          className={`transition-colors ${serie.completado ? 'bg-green-50/30' : 'hover:bg-white'}`}
                        >
                          <td className="py-5 px-6">
                            <span className="text-sm font-black text-slate-900 italic">#{serie.ordem}</span>
                          </td>
                          <td className="py-5 px-6 text-center">
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white px-3 py-1.5 rounded-xl border border-slate-50">
                              <History size={10} />
                              {serie.anterior}
                            </div>
                          </td>
                          <td className="py-5 px-6">
                             <input
                               type="number"
                               value={serie.peso_atual || ""}
                               placeholder="0"
                               onChange={(e) => handleUpdateSerie(exercicio.id, serie.ordem, "peso_atual", parseFloat(e.target.value) || 0)}
                               className="w-20 mx-auto block bg-white border-2 border-slate-100 rounded-2xl py-2 px-2 text-center text-sm font-black text-slate-900 focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/5 transition-all"
                             />
                          </td>
                          <td className="py-5 px-6">
                            <input
                              type="number"
                              value={serie.reps || ""}
                              placeholder="0"
                              onChange={(e) => handleUpdateSerie(exercicio.id, serie.ordem, "reps", parseInt(e.target.value) || 0)}
                              className="w-16 mx-auto block bg-white border-2 border-slate-100 rounded-2xl py-2 px-2 text-center text-sm font-black text-slate-900 focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/5 transition-all"
                            />
                          </td>
                          <td className="py-5 px-6 text-right">
                             <button
                               onClick={() => handleCheckSerie(exercicio.id, serie.ordem)}
                               className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ml-auto ${
                                 serie.completado 
                                  ? 'bg-green-500 text-white shadow-lg shadow-green-200 rotate-[360deg]' 
                                  : 'bg-white border-2 border-slate-100 text-slate-300 hover:border-brand-purple hover:text-brand-purple'
                               }`}
                             >
                               <Check size={20} strokeWidth={4} />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Video Modal */}
        {videoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="relative w-full max-w-4xl aspect-video bg-black rounded-[40px] overflow-hidden shadow-2xl">
               <button 
                 onClick={() => setVideoModal(null)}
                 className="absolute top-6 right-6 z-10 w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 hover:scale-110 transition-transform"
               >
                 <X size={24} />
               </button>
               <iframe
                 src={videoModal.replace("watch?v=", "embed/")}
                 className="w-full h-full"
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                 allowFullScreen
               ></iframe>
            </div>
          </div>
        )}

      </div>
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
