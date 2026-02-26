"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { ArrowLeft, Save, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";

interface Serie {
  ordem: number;
  peso_sugerido: number;
  reps_sugerido: number;
}

interface Exercicio {
  id: string;
  nome: string;
  grupo_muscular?: string;
  descanso: string;
  video_url?: string;
  series: Serie[];
}

interface Ficha {
  id: string;
  nome_rotina: string;
  configuracao: {
    exercicios: Exercicio[];
  };
  coach_id: string;
  aluno_id: string;
}

export default function EditarFichaPage({ params }: { params: Promise<{ id: string; fichaId: string }> }) {
  const router = useRouter();
  const { id, fichaId } = use(params);
  
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nomeFicha, setNomeFicha] = useState("");
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [catalogoExercicios, setCatalogoExercicios] = useState<any[]>([]);
  const [showAddExercicioModal, setShowAddExercicioModal] = useState(false);
  const [searchExercicio, setSearchExercicio] = useState("");

  useEffect(() => {
    loadData();
  }, [fichaId]);

  const loadData = async () => {
    try {
      // Buscar a ficha
      const { data: fichaData, error: fichaError } = await supabaseClient
        .from("fichas_treino")
        .select("*")
        .eq("id", fichaId)
        .single();

      if (fichaError || !fichaData) {
        setError("Ficha não encontrada");
        setLoading(false);
        return;
      }

      const fichaTyped = fichaData as Ficha;
      setFicha(fichaTyped);
      setNomeFicha(fichaTyped.nome_rotina || "");
      
      // Normalizar exercícios para garantir que peso_sugerido e reps_sugerido são sempre números
      const exerciciosNormalizados = (fichaTyped.configuracao?.exercicios || []).map(ex => ({
        ...ex,
        series: (ex.series || []).map(s => ({
          ...s,
          peso_sugerido: s.peso_sugerido ?? 0,
          reps_sugerido: s.reps_sugerido ?? 0,
        })),
      }));
      
      setExercicios(exerciciosNormalizados);

      // Buscar catálogo de exercícios
      const { data: catalogoData } = await supabaseClient
        .from("exercicios_biblioteca")
        .select("id, nome, grupo_muscular, video_url")
        .order("nome", { ascending: true });

      setCatalogoExercicios(catalogoData || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar ficha");
      setLoading(false);
    }
  };

  const handleUpdateSerie = (exercicioIdx: number, serieIdx: number, field: string, value: any) => {
    const updated = [...exercicios];
    // Garantir que o valor seja sempre um número válido
    const numValue = isNaN(value) ? 0 : value;
    (updated[exercicioIdx].series[serieIdx] as any)[field] = numValue;
    setExercicios(updated);
  };

  const handleRemoveExercicio = (idx: number) => {
    setExercicios(exercicios.filter((_, i) => i !== idx));
  };

  const handleAddSerie = (exercicioIdx: number) => {
    const updated = [...exercicios];
    const novaOrdem = Math.max(...(updated[exercicioIdx].series.map(s => s.ordem) || [0])) + 1;
    updated[exercicioIdx].series.push({
      ordem: novaOrdem,
      peso_sugerido: 0,
      reps_sugerido: 0,
    });
    setExercicios(updated);
  };

  const handleRemoveSerie = (exercicioIdx: number, serieIdx: number) => {
    const updated = [...exercicios];
    updated[exercicioIdx].series.splice(serieIdx, 1);
    setExercicios(updated);
  };

  const handleAddExercicio = (catalogExercicio: any) => {
    const newExercicio: Exercicio = {
      id: catalogExercicio.id,
      nome: catalogExercicio.nome,
      grupo_muscular: catalogExercicio.grupo_muscular,
      descanso: "60s",
      video_url: catalogExercicio.video_url,
      series: [
        {
          ordem: 1,
          peso_sugerido: 0,
          reps_sugerido: 0,
        },
      ],
    };
    setExercicios([...exercicios, newExercicio]);
    setShowAddExercicioModal(false);
    setSearchExercicio("");
  };

  const filteredCatalogo = catalogoExercicios.filter(ex =>
    ex.nome.toLowerCase().includes(searchExercicio.toLowerCase())
  );

  const handleSalvar = async () => {
    if (!nomeFicha.trim()) {
      setError("Nome da ficha é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabaseClient
        .from("fichas_treino")
        .update({
          nome_rotina: nomeFicha,
          configuracao: {
            exercicios: exercicios.map(ex => ({
              id: ex.id,
              nome: ex.nome,
              descanso: ex.descanso,
              video_url: ex.video_url || "",
              series: ex.series,
            })),
          },
        })
        .eq("id", fichaId);

      if (error) throw error;

      router.push(`/admin/aluno/${id}`);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar ficha");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6 flex items-center justify-center">
        <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Carregando ficha...</p>
      </div>
    );
  }

  if (!ficha) {
    return (
      <div className="min-h-screen bg-black p-6">
        <Link href={`/admin/aluno/${id}`} className="text-iron-gold font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2 mb-6">
          <ArrowLeft size={14} /> Voltar
        </Link>
        <p className="text-red-500 font-bold">Ficha não encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6 lg:p-10 lg:pl-28">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/admin/aluno/${id}`} 
            className="inline-flex items-center gap-2 text-iron-gold font-black text-[10px] uppercase tracking-widest mb-4 hover:gap-3 transition-all"
          >
            <ArrowLeft size={14} /> Voltar para Perfil
          </Link>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase mb-2">
            Editar <span className="text-zinc-500">Ficha Digital</span>
          </h1>
          <p className="text-zinc-400 font-medium">Modifique os exercícios e cargas da ficha</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm font-bold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Nome da Ficha */}
        <div className="bg-black rounded-3xl p-6 md:p-10 border border-white/5 shadow-2xl mb-8">
          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3 block">
            Nome da Ficha
          </label>
          <input
            type="text"
            value={nomeFicha}
            onChange={(e) => setNomeFicha(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-2xl text-white font-bold focus:outline-none focus:border-iron-gold/40 transition-all"
            placeholder="Ex: Quadríceps Pesado"
          />
        </div>

        {/* Exercícios */}
        <div className="space-y-4">
          {exercicios.map((ex, exIdx) => (
            <div key={ex.id} className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 md:p-8">
              {/* Header do Exercício */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-lg font-black text-white mb-2">{ex.nome}</h3>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{ex.grupo_muscular || 'Exercício'}</p>
                </div>
                <button
                  onClick={() => handleRemoveExercicio(exIdx)}
                  className="p-2 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Séries */}
              <div className="space-y-3 mb-4">
                {ex.series.map((serie, serieIdx) => (
                  <div key={serieIdx} className="flex items-center gap-4 p-4 bg-black/50 rounded-2xl border border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-iron-gold/10 flex items-center justify-center text-iron-gold font-black text-[10px]">
                      {serie.ordem}
                    </div>
                    <input
                      type="number"
                      value={serie.peso_sugerido}
                      onChange={(e) => handleUpdateSerie(exIdx, serieIdx, "peso_sugerido", parseFloat(e.target.value))}
                      placeholder="Peso"
                      className="w-20 px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-iron-gold/40 text-center"
                    />
                    <span className="text-zinc-500 font-bold text-[12px]">kg</span>
                    <input
                      type="number"
                      value={serie.reps_sugerido}
                      onChange={(e) => handleUpdateSerie(exIdx, serieIdx, "reps_sugerido", parseFloat(e.target.value))}
                      placeholder="Reps"
                      className="w-20 px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-iron-gold/40 text-center"
                    />
                    <span className="text-zinc-500 font-bold text-[12px]">reps</span>
                    <button
                      onClick={() => handleRemoveSerie(exIdx, serieIdx)}
                      className="ml-auto p-2 text-zinc-700 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Adicionar Série */}
              <button
                onClick={() => handleAddSerie(exIdx)}
                className="w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] text-iron-gold border border-iron-gold/30 rounded-lg hover:bg-iron-gold/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Adicionar Série
              </button>
            </div>
          ))}
        </div>

        {/* Adicionar Exercício do Catálogo */}
        <button
          onClick={() => setShowAddExercicioModal(true)}
          className="w-full py-4 px-6 bg-zinc-900/50 border-2 border-dashed border-iron-gold/30 rounded-3xl text-iron-gold text-[10px] font-black uppercase tracking-[0.2em] hover:bg-iron-gold/5 hover:border-iron-gold/50 transition-all flex items-center justify-center gap-3 mb-8"
        >
          <Plus size={16} /> Adicionar Exercício do Catálogo
        </button>

        {exercicios.length === 0 && (
          <div className="bg-zinc-900/20 rounded-3xl p-12 text-center border border-dashed border-white/5 mb-8">
            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.4em]">Nenhum exercício nesta ficha</p>
          </div>
        )}

        {/* Botão Salvar */}
        <div className="flex gap-4 mt-12">
          <button
            onClick={handleSalvar}
            disabled={saving}
            className="flex-1 py-4 bg-iron-gold text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(212,175,55,0.1)]"
          >
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
          <button
            onClick={() => router.push(`/admin/aluno/${id}`)}
            className="flex-1 py-4 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-3"
          >
            <X size={16} />
            Cancelar
          </button>
        </div>

        {/* Modal Adicionar Exercício */}
        {showAddExercicioModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-black rounded-3xl border border-white/5 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              {/* Header Modal */}
              <div className="sticky top-0 bg-black border-b border-white/5 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-black text-white uppercase">Adicionar Exercício</h2>
                <button
                  onClick={() => {
                    setShowAddExercicioModal(false);
                    setSearchExercicio("");
                  }}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Search */}
              <div className="p-6 border-b border-white/5">
                <input
                  type="text"
                  placeholder="Buscar exercício..."
                  value={searchExercicio}
                  onChange={(e) => setSearchExercicio(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white font-bold focus:outline-none focus:border-iron-gold/40 transition-all"
                />
              </div>

              {/* Lista de Exercícios */}
              <div className="divide-y divide-white/5">
                {filteredCatalogo.length > 0 ? (
                  filteredCatalogo.map((exCatalogo) => {
                    const jáAdicionado = exercicios.some(e => e.id === exCatalogo.id);
                    return (
                      <div key={exCatalogo.id} className="p-6 hover:bg-zinc-900/30 transition-colors flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-black text-white mb-1">{exCatalogo.nome}</h3>
                          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                            {exCatalogo.grupo_muscular || 'Exercício'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddExercicio(exCatalogo)}
                          disabled={jáAdicionado}
                          className="px-6 py-2 bg-iron-gold text-black font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                          <Plus size={14} />
                          {jáAdicionado ? "Já Adicionado" : "Adicionar"}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center text-zinc-500">
                    <p className="font-bold uppercase tracking-widest text-[10px]">Nenhum exercício encontrado</p>
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
