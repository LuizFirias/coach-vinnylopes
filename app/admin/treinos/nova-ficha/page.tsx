"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { Plus, Trash2, X } from "lucide-react";

interface Aluno {
  id: string;
  full_name: string;
  email: string;
}

interface Exercicio {
  id: string;
  nome: string;
  grupo_muscular: string;
}

interface SerieDefinicao {
  ordem: number;
  peso_sugerido: number;
  reps_sugerido: number;
}

interface ExercicioFicha {
  id: string;
  nome: string;
  descanso: string;
  video_url: string;
  series: SerieDefinicao[];
}

export default function NovaFichaCoachPage() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [exerciciosCatalogo, setExerciciosCatalogo] = useState<Exercicio[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<string>("");
  const [nomeRotina, setNomeRotina] = useState<string>("");
  const [exerciciosFicha, setExerciciosFicha] = useState<ExercicioFicha[]>([]);
  const [modalExercicio, setModalExercicio] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) {
        router.push("/login");
        return;
      }

      // Verificar se é coach
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profile?.role !== "coach") {
        router.push("/aluno/treinos");
        return;
      }

      // Buscar alunos do coach
      const { data: alunosData } = await supabaseClient
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "aluno")
        .order("full_name", { ascending: true });

      setAlunos(alunosData || []);

      // Buscar exercícios do catálogo
      const { data: exerciciosData } = await supabaseClient
        .from("exercicios_biblioteca")
        .select("id, nome, grupo_muscular")
        .order("nome", { ascending: true });

      setExerciciosCatalogo(exerciciosData || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const adicionarExercicio = (exercicio: Exercicio) => {
    const novoExercicio: ExercicioFicha = {
      id: exercicio.id,
      nome: exercicio.nome,
      descanso: "1min 30s",
      video_url: "",
      series: [
        { ordem: 1, peso_sugerido: 0, reps_sugerido: 12 },
        { ordem: 2, peso_sugerido: 0, reps_sugerido: 12 },
        { ordem: 3, peso_sugerido: 0, reps_sugerido: 12 },
      ],
    };
    setExerciciosFicha([...exerciciosFicha, novoExercicio]);
    setModalExercicio(false);
  };

  const removerExercicio = (index: number) => {
    setExerciciosFicha(exerciciosFicha.filter((_, i) => i !== index));
  };

  const adicionarSerie = (exercicioIndex: number) => {
    const updated = [...exerciciosFicha];
    const novaOrdem = updated[exercicioIndex].series.length + 1;
    updated[exercicioIndex].series.push({
      ordem: novaOrdem,
      peso_sugerido: 0,
      reps_sugerido: 12,
    });
    setExerciciosFicha(updated);
  };

  const removerSerie = (exercicioIndex: number, serieIndex: number) => {
    const updated = [...exerciciosFicha];
    updated[exercicioIndex].series = updated[exercicioIndex].series.filter((_, i) => i !== serieIndex);
    // Reordenar
    updated[exercicioIndex].series.forEach((s, i) => {
      s.ordem = i + 1;
    });
    setExerciciosFicha(updated);
  };

  const atualizarExercicio = (exercicioIndex: number, field: string, value: any) => {
    const updated = [...exerciciosFicha];
    (updated[exercicioIndex] as any)[field] = value;
    setExerciciosFicha(updated);
  };

  const atualizarSerie = (exercicioIndex: number, serieIndex: number, field: string, value: number) => {
    const updated = [...exerciciosFicha];
    (updated[exercicioIndex].series[serieIndex] as any)[field] = value;
    setExerciciosFicha(updated);
  };

  const handleSalvarFicha = async () => {
    if (!alunoSelecionado || !nomeRotina || exerciciosFicha.length === 0) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) return;

      const estrutura = {
        exercicios: exerciciosFicha.map((ex) => ({
          id: ex.id,
          nome: ex.nome,
          descanso: ex.descanso,
          video_url: ex.video_url,
          series: ex.series.map((s) => ({
            ordem: s.ordem,
            peso_atual: s.peso_sugerido,
            reps: s.reps_sugerido,
          })),
        })),
      };

      const { error } = await supabaseClient.from("fichas_treino").insert({
        coach_id: coachId,
        aluno_id: alunoSelecionado,
        nome_rotina: nomeRotina,
        configuracao: estrutura,
        ativo: true,
      });

      if (error) throw error;

      alert("Ficha criada com sucesso! ✅");
      router.push("/admin/treinos");
    } catch (err) {
      console.error("Erro ao salvar ficha:", err);
      alert("Erro ao salvar ficha");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-400 text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Criar Nova Ficha de Treino</h1>
          <p className="text-gray-400">Monte uma ficha digital personalizada para seu aluno</p>
        </div>

        {/* Form */}
        <div className="bg-zinc-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Aluno */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Aluno <span className="text-red-500">*</span>
              </label>
              <select
                value={alunoSelecionado}
                onChange={(e) => setAlunoSelecionado(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              >
                <option value="">Selecione um aluno</option>
                {alunos.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.full_name} ({aluno.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Nome da Rotina */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Nome da Rotina <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nomeRotina}
                onChange={(e) => setNomeRotina(e.target.value)}
                placeholder="Ex: Quadríceps (Avançado)"
                className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
            </div>
          </div>
        </div>

        {/* Exercícios */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Exercícios</h2>
            <button
              onClick={() => setModalExercicio(true)}
              className="px-6 py-4 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98] flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Adicionar Exercício
            </button>
          </div>

          {exerciciosFicha.length === 0 ? (
            <div className="bg-zinc-900 border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-400 mb-4">Nenhum exercício adicionado ainda</p>
              <button
                onClick={() => setModalExercicio(true)}
                className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition"
              >
                Adicionar Primeiro Exercício
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {exerciciosFicha.map((exercicio, exercicioIndex) => (
                <div
                  key={exercicioIndex}
                  className="bg-zinc-900 border border-yellow-500/10 rounded-xl p-6"
                >
                  {/* Header do Exercício */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Nome do Exercício</label>
                        <input
                          type="text"
                          value={exercicio.nome}
                          onChange={(e) => atualizarExercicio(exercicioIndex, "nome", e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-yellow-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Descanso</label>
                        <input
                          type="text"
                          value={exercicio.descanso}
                          onChange={(e) => atualizarExercicio(exercicioIndex, "descanso", e.target.value)}
                          placeholder="Ex: 1min 30s"
                          className="w-full px-3 py-2 bg-zinc-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-yellow-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-400 mb-1">URL do Vídeo (opcional)</label>
                        <input
                          type="text"
                          value={exercicio.video_url}
                          onChange={(e) => atualizarExercicio(exercicioIndex, "video_url", e.target.value)}
                          placeholder="https://youtube.com/watch?v=..."
                          className="w-full px-3 py-2 bg-zinc-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-yellow-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removerExercicio(exercicioIndex)}
                      className="ml-4 p-2 text-red-500 hover:bg-red-500/10 rounded transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Séries */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-300">Séries</h4>
                      <button
                        onClick={() => adicionarSerie(exercicioIndex)}
                        className="text-xs px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
                      >
                        + Série
                      </button>
                    </div>
                    <div className="space-y-2">
                      {exercicio.series.map((serie, serieIndex) => (
                        <div
                          key={serieIndex}
                          className="flex items-center gap-3 bg-zinc-800 p-3 rounded-lg"
                        >
                          <span className="text-white font-semibold min-w-10">{serie.ordem}ª</span>
                          <input
                            type="number"
                            value={serie.peso_sugerido}
                            onChange={(e) =>
                              atualizarSerie(exercicioIndex, serieIndex, "peso_sugerido", Number(e.target.value))
                            }
                            placeholder="Peso (kg)"
                            className="flex-1 px-3 py-2 bg-zinc-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-yellow-500"
                          />
                          <input
                            type="number"
                            value={serie.reps_sugerido}
                            onChange={(e) =>
                              atualizarSerie(exercicioIndex, serieIndex, "reps_sugerido", Number(e.target.value))
                            }
                            placeholder="Reps"
                            className="flex-1 px-3 py-2 bg-zinc-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-yellow-500"
                          />
                          <button
                            onClick={() => removerSerie(exercicioIndex, serieIndex)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push("/admin/treinos")}
            className="flex-1 py-4 bg-zinc-800 text-white font-semibold rounded-lg hover:bg-zinc-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvarFicha}
            disabled={saving || !alunoSelecionado || !nomeRotina || exerciciosFicha.length === 0}
            className="flex-1 py-5 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Salvando..." : "SALVAR FICHA"}
          </button>
        </div>
      </div>

      {/* Modal - Selecionar Exercício */}
      {modalExercicio && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setModalExercicio(false)}
        >
          <div
            className="bg-zinc-900 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-bold text-xl">Selecionar Exercício</h3>
              <button
                onClick={() => setModalExercicio(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              {exerciciosCatalogo.map((exercicio) => (
                <button
                  key={exercicio.id}
                  onClick={() => adicionarExercicio(exercicio)}
                  className="w-full text-left p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                >
                  <div className="text-white font-semibold">{exercicio.nome}</div>
                  <div className="text-sm text-gray-400">{exercicio.grupo_muscular}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
