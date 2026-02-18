"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { 
  Plus, 
  Trash2, 
  X, 
  Search, 
  ChevronRight, 
  Save, 
  Dumbbell, 
  Video, 
  Clock, 
  Layout,
  User,
  Loader2,
  ArrowLeft
} from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");
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

      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profile?.role !== "coach" && profile?.role !== "admin") {
        router.push("/aluno/treinos");
        return;
      }

      const { data: alunosData } = await supabaseClient
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "aluno")
        .eq("arquivado", false)
        .order("full_name", { ascending: true });

      setAlunos(alunosData || []);

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
    // Prevenir duplicação
    const jaExiste = exerciciosFicha.some(ex => ex.id === exercicio.id);
    if (jaExiste) {
      alert("Este exercício já foi adicionado à ficha");
      return;
    }
    
    const novoExercicio: ExercicioFicha = {
      id: exercicio.id,
      nome: exercicio.nome,
      descanso: "1:30",
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

      router.push("/admin/treinos");
    } catch (err) {
      console.error("Erro ao salvar ficha:", err);
      alert("Erro ao salvar ficha");
    } finally {
      setSaving(false);
    }
  };

  const filteredExercicios = exerciciosCatalogo.filter(ex => 
    ex.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ex.grupo_muscular.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-brand-purple" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Preparando ambiente...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-10 lg:pl-28 pb-24 md:pb-32">
      <div className="max-w-5xl mx-auto">
        {/* Top Header */}
        <div className="flex items-center gap-4 mb-6 md:mb-10">
          <button 
            onClick={() => router.push('/admin/treinos')}
            className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-brand-purple transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Nova <span className="text-brand-purple">Ficha Digital</span></h1>
            <p className="text-slate-500 font-medium text-sm">Monte o treino personalizado de alta fidelidade</p>
          </div>
        </div>

        {/* Global Settings Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 md:p-8 lg:p-10 border border-slate-50 mb-6 md:mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Aluno */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
                <User size={14} /> ALUNO
              </label>
              <select
                value={alunoSelecionado}
                onChange={(e) => setAlunoSelecionado(e.target.value)}
                className="w-full h-12 md:h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:border-brand-purple appearance-none transition-all cursor-pointer"
              >
                <option value="">Selecione o atleta...</option>
                {alunos.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Nome da Rotina */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
                <Layout size={14} /> TÍTULO DA ROTINA
              </label>
              <input
                type="text"
                value={nomeRotina}
                onChange={(e) => setNomeRotina(e.target.value)}
                placeholder="Ex: Treino A - Superior Foco Deltoide"
                className="w-full h-12 md:h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:border-brand-purple transition-all"
              />
            </div>
          </div>
        </div>

        {/* Exercises Section */}
        <div className="mb-6 md:mb-10">
          <div className="flex items-center justify-between mb-6 md:mb-8 px-4">
            <h2 className="text-xl md:text-2xl font-black text-slate-900">Exercícios <span className="text-brand-purple">({exerciciosFicha.length})</span></h2>
            <button
              onClick={() => setModalExercicio(true)}
              className="flex items-center gap-3 px-4 md:px-6 py-2 md:py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10 hover:bg-brand-purple transition-all"
            >
              <Plus size={16} /> ADICIONAR
            </button>
          </div>

          <div className="space-y-4 md:space-y-6">
            {exerciciosFicha.map((exercicio, exIndex) => (
              <div key={exIndex} className="bg-white rounded-2xl shadow-lg shadow-slate-100 border border-slate-50 p-4 md:p-6 lg:p-8 animate-fade-in">
                {/* Exercise Header */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-6 md:mb-8 border-b border-slate-50 pb-4 md:pb-6">
                  <div className="flex-1 space-y-4">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Exercício Selecionado</label>
                    <input
                      type="text"
                      value={exercicio.nome}
                      onChange={(e) => atualizarExercicio(exIndex, "nome", e.target.value)}
                      className="w-full text-xl font-bold text-slate-900 border-none bg-transparent p-0 focus:ring-0"
                    />
                  </div>
                  
                  <div className="w-full md:w-32 space-y-4">
                    <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
                      <Clock size={12} /> DESCANSO
                    </label>
                    <input
                      type="text"
                      value={exercicio.descanso}
                      onChange={(e) => atualizarExercicio(exIndex, "descanso", e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-bold focus:outline-none"
                    />
                  </div>

                  <div className="w-full md:w-64 space-y-4">
                    <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
                      <Video size={12} /> VÍDEO (ID YOUTUBE)
                    </label>
                    <input
                      type="text"
                      value={exercicio.video_url}
                      onChange={(e) => atualizarExercicio(exIndex, "video_url", e.target.value)}
                      placeholder="Ex: dQw4w9WgXcQ"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium focus:outline-none"
                    />
                  </div>

                  <button 
                    onClick={() => removerExercicio(exIndex)}
                    className="self-end w-12 h-12 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all border border-red-100"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {/* Series Table */}
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 px-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">SÉRIE</span>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">CARGA (KG)</span>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">REPS</span>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">AÇÃO</span>
                  </div>

                  {exercicio.series.map((serie, sIndex) => (
                    <div key={sIndex} className="grid grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                      <div className="flex items-center font-bold text-slate-900 ml-4">#{serie.ordem}</div>
                      <input
                        type="number"
                        value={serie.peso_sugerido}
                        onChange={(e) => atualizarSerie(exIndex, sIndex, "peso_sugerido", Number(e.target.value))}
                        className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-brand-purple font-black focus:outline-none shadow-sm"
                      />
                      <input
                        type="number"
                        value={serie.reps_sugerido}
                        onChange={(e) => atualizarSerie(exIndex, sIndex, "reps_sugerido", Number(e.target.value))}
                        className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-slate-900 font-bold focus:outline-none shadow-sm"
                      />
                      <button 
                        onClick={() => removerSerie(exIndex, sIndex)}
                        className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button 
                    onClick={() => adicionarSerie(exIndex)}
                    className="w-full py-3 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 hover:border-brand-purple/20 hover:text-brand-purple transition-all"
                  >
                    + Adicionar Série
                  </button>
                </div>
              </div>
            ))}

            {exerciciosFicha.length === 0 && (
              <div className="bg-white rounded-2xl p-12 md:p-20 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-6">
                  <Dumbbell size={40} />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2">Nenhum exercício na ficha</h3>
                <p className="text-slate-500 max-w-xs mb-6 md:mb-8">Comece adicionando os exercícios da biblioteca para o treino do atleta.</p>
                <button
                  onClick={() => setModalExercicio(true)}
                  className="px-6 md:px-8 py-3 md:py-4 bg-brand-purple text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-brand-purple/20 hover:scale-105 transition-all"
                >
                  Abrir Biblioteca
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-40">
           <button
            onClick={handleSalvarFicha}
            disabled={saving || !alunoSelecionado || !nomeRotina || exerciciosFicha.length === 0}
            className="w-full h-16 md:h-20 bg-slate-900 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.4em] flex items-center justify-center gap-4 shadow-2xl shadow-slate-900/30 hover:bg-brand-purple transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? "PROCESSANDO..." : "PUBLICAR FICHA"}
          </button>
        </div>

        {/* Modal BIBLIOTECA */}
        {modalExercicio && (
          <div className="fixed inset-0 z-100 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setModalExercicio(false)} />
            
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900">Biblioteca <span className="text-brand-purple">Fitness</span></h3>
                  <p className="text-slate-400 text-sm font-medium">Selecione o movimento para adicionar</p>
                </div>
                <button onClick={() => setModalExercicio(false)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100">
                  <X size={24} />
                </button>
              </div>

              <div className="p-4 md:p-6">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Filtrar por nome ou grupo muscular..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-12 md:h-14 pl-12 md:pl-14 pr-4 md:pr-6 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-purple/5 focus:border-brand-purple text-slate-900 font-medium transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-0 space-y-2">
                {filteredExercicios.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => adicionarExercicio(ex)}
                    className="w-full flex items-center justify-between p-5 rounded-3xl border border-slate-50 bg-white hover:border-brand-purple hover:bg-brand-purple/5 transition-all group"
                  >
                    <div className="text-left">
                      <p className="font-bold text-slate-900 group-hover:text-brand-purple transition-colors">{ex.nome}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{ex.grupo_muscular}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-purple group-hover:translate-x-1 transition-all" />
                  </button>
                ))}

                {filteredExercicios.length === 0 && (
                  <div className="py-20 text-center">
                    <p className="text-slate-400">Nenhum exercício encontrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
