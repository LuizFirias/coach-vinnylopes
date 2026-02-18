"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { Clock, Play, Check, Video } from "lucide-react";

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

export default function FichaTreinoAlunoPage() {
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

      alert("Treino finalizado com sucesso! 💪");
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-400 text-lg">Carregando ficha...</div>
      </div>
    );
  }

  if (!ficha) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-4">Nenhuma ficha encontrada</div>
          <button
            onClick={() => router.push("/aluno/treinos")}
            className="px-6 py-3 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98]"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{ficha.nome_rotina}</h1>
          <p className="text-gray-400">Preencha os pesos e repetições. Marque cada série ao completar.</p>
        </div>

        {/* Botão Iniciar Rotina */}
        <button
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
          className="w-full mb-6 py-5 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          INICIAR ROTINA
        </button>

        {/* Lista de Exercícios */}
        <div className="space-y-6">
          {ficha.exercicios.map((exercicio) => (
            <div
              key={exercicio.id}
              className="bg-zinc-900 border border-yellow-500/10 rounded-xl p-6 shadow-lg"
            >
              {/* Cabeçalho do Card */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-linear-to-br from-yellow-600 to-yellow-800 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-2xl">💪</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">{exercicio.nome}</h3>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Descanso: {exercicio.descanso}</span>
                  </div>
                  {exercicio.video_url && (
                    <button
                      onClick={() => setVideoModal(exercicio.video_url || null)}
                      className="mt-2 flex items-center gap-1 text-yellow-500 hover:text-yellow-400 text-sm"
                    >
                      <Video className="w-4 h-4" />
                      Ver vídeo explicativo
                    </button>
                  )}
                </div>
              </div>

              {/* Tabela de Séries */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-400 text-xs uppercase font-semibold">Série</th>
                      <th className="text-left py-2 px-3 text-gray-400 text-xs uppercase font-semibold">Anterior</th>
                      <th className="text-left py-2 px-3 text-gray-400 text-xs uppercase font-semibold">KG</th>
                      <th className="text-left py-2 px-3 text-gray-400 text-xs uppercase font-semibold">Reps</th>
                      <th className="text-center py-2 px-3 text-gray-400 text-xs uppercase font-semibold">Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exercicio.series.map((serie) => (
                      <tr
                        key={serie.ordem}
                        className={`border-b border-gray-800/50 transition ${
                          serie.completado ? "opacity-50 bg-yellow-500/5" : ""
                        }`}
                      >
                        <td className="py-3 px-3 text-white font-semibold">{serie.ordem}ª</td>
                        <td className="py-3 px-3 text-gray-400 text-sm">{serie.anterior}</td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={serie.peso_atual || ""}
                            onChange={(e) =>
                              handleUpdateSerie(exercicio.id, serie.ordem, "peso_atual", Number(e.target.value))
                            }
                            className="w-20 px-2 py-1 bg-zinc-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-yellow-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={serie.reps || ""}
                            onChange={(e) =>
                              handleUpdateSerie(exercicio.id, serie.ordem, "reps", Number(e.target.value))
                            }
                            className="w-20 px-2 py-1 bg-zinc-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-yellow-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleCheckSerie(exercicio.id, serie.ordem)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                              serie.completado
                                ? "bg-yellow-500 border-yellow-500"
                                : "border-gray-600 hover:border-yellow-500"
                            }`}
                          >
                            {serie.completado && <Check className="w-4 h-4 text-black font-bold" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Botão Finalizar Treino */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => router.push("/aluno/treinos")}
            className="flex-1 py-4 bg-white/[0.03] border border-white/10 text-white text-[11px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-white/[0.05] transition-all duration-300"
          >
            Cancelar
          </button>
          <button
            onClick={handleFinalizarTreino}
            disabled={saving}
            className="flex-1 py-5 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Salvando..." : "FINALIZAR TREINO"}
          </button>
        </div>
      </div>

      {/* Modal de Vídeo */}
      {videoModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setVideoModal(null)}
        >
          <div
            className="bg-zinc-900 rounded-xl p-6 max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-lg">Vídeo Explicativo</h3>
              <button
                onClick={() => setVideoModal(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="aspect-video bg-black rounded-lg">
              <iframe
                src={videoModal}
                className="w-full h-full rounded-lg"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
