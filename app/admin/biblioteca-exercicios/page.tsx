"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  ArrowLeft,
  Video,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { extractYouTubeVideoId, isValidYouTubeUrl } from "@/lib/youtubeUtils";

interface Exercicio {
  id: string;
  nome: string;
  grupo_muscular: string;
  video_url?: string;
  descricao?: string;
  imagem_url?: string;
  equipamento?: string;
  musculos_secundarios?: string;
  tipo_exercicio?: string;
}

const GRUPOS_MUSCULARES = [
  "Peito Superior",
  "Peito Médio",
  "Peito Inferior",
  "Dorsais",
  "Trapézio",
  "Lombar",
  "Ombro Anterior",
  "Ombro Lateral",
  "Ombro Posterior",
  "Bíceps",
  "Tríceps",
  "Antebraço",
  "Quadríceps",
  "Posterior (Isquiotibiais)",
  "Panturrilha",
  "Glúteos",
  "Abdômen",
  "Oblíquos",
  "Cárdio",
];

const EQUIPAMENTOS = [
  "Nenhum",
  "Banda de Resistência",
  "Banda de Suspensão",
  "Barra",
  "Disco de Peso",
  "Haltere",
  "Kettlebell",
  "Máquina",
  "Outro",
];

const TIPOS_EXERCICIO = [
  "Peso & Repetições",
  "Repetições",
  "Peso Corporal com Peso Acrescido",
  "Duração",
  "Duração e Peso",
  "Distância e Duração",
  "Peso e Distância",
];

export default function BibliotecaExerciciosPage() {
  const router = useRouter();
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [filtrados, setFiltrados] = useState<Exercicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>("");

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [exercicioEditando, setExercicioEditando] = useState<Exercicio | null>(
    null
  );
  const [formData, setFormData] = useState({
    nome: "",
    grupo_muscular: "",
    video_url: "",
    descricao: "",
    equipamento: "",
    musculos_secundarios: "",
    tipo_exercicio: "",
  });

  // Validação
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  useEffect(() => {
    verificarAcessoECarregar();
  }, []);

  useEffect(() => {
    filtrarExercicios();
  }, [exercicios, searchTerm, grupoSelecionado]);

  const verificarAcessoECarregar = async () => {
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

      if (profile?.role !== "coach" && profile?.role !== "admin") {
        setError("Acesso restrito a coaches");
        router.push("/aluno/dashboard");
        return;
      }

      await carregarExercicios();
    } catch (err) {
      console.error("Erro ao verificar acesso:", err);
      setError("Erro ao carregar página");
    } finally {
      setLoading(false);
    }
  };

  const carregarExercicios = async () => {
    try {
      const { data, error: err } = await supabaseClient
        .from("exercicios_biblioteca")
        .select("*")
        .order("nome", { ascending: true });

      if (err) throw err;

      setExercicios(data || []);
    } catch (err) {
      console.error("Erro ao carregar exercícios:", err);
      setError("Erro ao carregar biblioteca");
    }
  };

  const filtrarExercicios = () => {
    let resultado = [...exercicios];

    // Filtrar por busca
    if (searchTerm.trim()) {
      resultado = resultado.filter(
        (ex) =>
          ex.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ex.grupo_muscular.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por grupo muscular
    if (grupoSelecionado) {
      resultado = resultado.filter(
        (ex) => ex.grupo_muscular === grupoSelecionado
      );
    }

    setFiltrados(resultado);
  };

  const abrirModalNovo = () => {
    setModoEdicao(false);
    setExercicioEditando(null);
    setFormData({
      nome: "",
      grupo_muscular: "",
      video_url: "",
      descricao: "",
      equipamento: "",
      musculos_secundarios: "",
      tipo_exercicio: "",
    });
    setErroValidacao(null);
    setModalAberto(true);
  };

  const abrirModalEdicao = (exercicio: Exercicio) => {
    setModoEdicao(true);
    setExercicioEditando(exercicio);
    setFormData({
      nome: exercicio.nome,
      grupo_muscular: exercicio.grupo_muscular,
      video_url: exercicio.video_url || "",
      descricao: exercicio.descricao || "",
      equipamento: exercicio.equipamento || "",
      musculos_secundarios: exercicio.musculos_secundarios || "",
      tipo_exercicio: exercicio.tipo_exercicio || "",
    });
    setErroValidacao(null);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setModoEdicao(false);
    setExercicioEditando(null);
    setErroValidacao(null);
  };

  const validarFormulario = (): boolean => {
    setErroValidacao(null);

    if (!formData.nome.trim()) {
      setErroValidacao("Nome do exercício é obrigatório");
      return false;
    }

    if (!formData.grupo_muscular) {
      setErroValidacao("Grupo muscular é obrigatório");
      return false;
    }

    if (!formData.equipamento) {
      setErroValidacao("Equipamento é obrigatório");
      return false;
    }

    if (!formData.tipo_exercicio) {
      setErroValidacao("Tipo de exercício é obrigatório");
      return false;
    }

    // Validar URL do YouTube se fornecida
    if (formData.video_url.trim()) {
      if (!isValidYouTubeUrl(formData.video_url)) {
        setErroValidacao(
          "URL do YouTube inválida. Use: youtu.be/ID ou youtube.com/watch?v=ID"
        );
        return false;
      }
    }

    setErroValidacao(null);
    return true;
  };

  const salvarExercicio = async () => {
    if (!validarFormulario()) return;

    setSaving(true);
    try {
      const videoId = formData.video_url
        ? extractYouTubeVideoId(formData.video_url)
        : null;

      const dados = {
        nome: formData.nome.trim(),
        grupo_muscular: formData.grupo_muscular,
        equipamento: formData.equipamento,
        tipo_exercicio: formData.tipo_exercicio,
        musculos_secundarios: formData.musculos_secundarios.trim() || null,
        video_url: videoId
          ? `https://youtube.com/embed/${videoId}`
          : null,
        descricao: formData.descricao.trim() || null,
      };

      if (modoEdicao && exercicioEditando) {
        // Editar
        const { error: err } = await supabaseClient
          .from("exercicios_biblioteca")
          .update(dados)
          .eq("id", exercicioEditando.id);

        if (err) throw err;

        setExercicios((prev) =>
          prev.map((ex) =>
            ex.id === exercicioEditando.id ? { ...ex, ...dados, id: ex.id } : ex
          ) as Exercicio[]
        );
      } else {
        // Criar
        const { data, error: err } = await supabaseClient
          .from("exercicios_biblioteca")
          .insert(dados)
          .select()
          .single();

        if (err) throw err;

        setExercicios((prev) => [...prev, data].sort((a, b) =>
          a.nome.localeCompare(b.nome)
        ));
      }

      fecharModal();
    } catch (err) {
      console.error("Erro ao salvar exercício:", err);
      setErroValidacao(
        "Erro ao salvar exercício. Tente novamente."
      );
    } finally {
      setSaving(false);
    }
  };

  const deletarExercicio = async (id: string) => {
    if (
      !confirm(
        "Tem certeza que deseja deletar este exercício? Isso não pode ser desfeito."
      )
    ) {
      return;
    }

    setDeleting(id);
    try {
      const { error: err } = await supabaseClient
        .from("exercicios_biblioteca")
        .delete()
        .eq("id", id);

      if (err) throw err;

      setExercicios((prev) => prev.filter((ex) => ex.id !== id));
    } catch (err) {
      console.error("Erro ao deletar exercício:", err);
      setError("Erro ao deletar exercício");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 lg:pl-28">
        <div className="text-center">
          <Loader2 className="animate-spin text-iron-gold mx-auto mb-4" size={40} />
          <p className="text-zinc-400 text-sm uppercase tracking-widest">
            Carregando biblioteca...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6 lg:p-10 lg:pl-28 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6 mb-10">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/alunos"
              className="w-12 h-12 bg-iron-gray rounded-xl border border-iron-divider flex items-center justify-center text-zinc-500 hover:text-iron-gold transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl text-white uppercase tracking-tighter">
                Biblioteca
              </h1>
              <p className="text-zinc-500 font-medium text-sm mt-1">
                Gerencie seus exercícios e demonstrações em vídeo
              </p>
            </div>
          </div>
          <button
            onClick={abrirModalNovo}
            className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3 bg-iron-gold text-black rounded-xl text-[11px] uppercase tracking-widest hover:bg-white shadow-lg shadow-iron-gold/20 transition-all"
          >
            <Plus size={18} /> Novo Exercício
          </button>
        </div>

        {/* Barra de Pesquisa */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou grupo muscular..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-iron-gray border border-iron-divider rounded-xl text-white placeholder-zinc-600 font-medium focus:outline-none focus:border-iron-gold transition-colors"
            />
          </div>
        </div>

        {/* Filtros por Grupo Muscular */}
        <div className="mb-10 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setGrupoSelecionado("")}
              className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
                !grupoSelecionado
                  ? "bg-iron-gold text-black"
                  : "bg-iron-gray text-zinc-400 border border-iron-divider hover:text-iron-gold"
              }`}
            >
              Todos
            </button>
            {GRUPOS_MUSCULARES.map((grupo) => (
              <button
                key={grupo}
                onClick={() => setGrupoSelecionado(grupo)}
                className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
                  grupoSelecionado === grupo
                    ? "bg-iron-gold text-black"
                    : "bg-iron-gray text-zinc-400 border border-iron-divider hover:text-iron-gold"
                }`}
              >
                {grupo}
              </button>
            ))}
          </div>
        </div>

        {/* Mensagens de Erro */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-1 shrink-0" size={18} />
            <p className="text-red-300 font-medium text-sm">{error}</p>
          </div>
        )}

        {/* Grid de Exercícios */}
        {filtrados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filtrados.map((exercicio) => (
              <div
                key={exercicio.id}
                className="bg-iron-gray rounded-2xl border border-iron-divider p-6 hover:border-iron-gold/30 transition-all group"
              >
                {/* Card Header com Actions */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg text-white uppercase tracking-tight group-hover:text-iron-gold transition-colors">
                      {exercicio.nome}
                    </h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2">
                      {exercicio.grupo_muscular}
                    </p>
                  </div>

                  {/* Indicador de Vídeo */}
                  {exercicio.video_url && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-iron-gold/10 border border-iron-gold/30 flex items-center justify-center text-iron-gold">
                      <Video size={14} />
                    </div>
                  )}
                </div>

                {/* Descrição */}
                {exercicio.descricao && (
                  <p className="text-zinc-400 text-sm mb-4 line-clamp-2">
                    {exercicio.descricao}
                  </p>
                )}

                {/* Botões de Ação */}
                <div className="flex gap-2 pt-4 border-t border-iron-divider">
                  <button
                    onClick={() => abrirModalEdicao(exercicio)}
                    className="flex-1 h-10 flex items-center justify-center gap-2 bg-black/30 border border-iron-divider rounded-lg text-iron-gold text-[10px] uppercase tracking-widest hover:border-iron-gold transition-all"
                  >
                    <Edit2 size={14} /> Editar
                  </button>
                  <button
                    onClick={() => deletarExercicio(exercicio.id)}
                    disabled={deleting === exercicio.id}
                    className="flex-1 h-10 flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[10px] uppercase tracking-widest hover:border-red-500/60 transition-all disabled:opacity-50"
                  >
                    {deleting === exercicio.id ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Deletando...
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} /> Deletar
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-iron-gray flex items-center justify-center mx-auto mb-4 text-zinc-600">
              <Search size={32} />
            </div>
            <p className="text-zinc-400 font-medium">Nenhum exercício encontrado</p>
            {searchTerm || grupoSelecionado ? (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setGrupoSelecionado("");
                }}
                className="mt-4 text-iron-gold text-sm underline hover:no-underline"
              >
                Limpar filtros
              </button>
            ) : (
              <button
                onClick={abrirModalNovo}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-iron-gold/10 border border-iron-gold/30 rounded-lg text-iron-gold text-sm hover:bg-iron-gold hover:text-black transition-all"
              >
                <Plus size={16} /> Criar primeiro exercício
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de Criar/Editar */}
      {modalAberto && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={fecharModal}
          />

          <div className="relative bg-black w-full max-w-lg rounded-2xl border border-iron-divider overflow-hidden shadow-2xl shadow-iron-gold/10">
            {/* Header */}
            <div className="sticky top-0 bg-black border-b border-iron-divider p-6 flex items-center justify-between">
              <h2 className="text-2xl text-white uppercase">
                {modoEdicao ? "Editar" : "Novo"} Exercício
              </h2>
              <button
                onClick={fecharModal}
                className="w-10 h-10 rounded-full bg-iron-gray border border-iron-divider flex items-center justify-center text-zinc-400 hover:text-iron-gold transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-6 max-h-[calc(85vh-140px)] overflow-y-auto">
              {/* Mensagem de Erro */}
              {erroValidacao && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                  <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
                  <p className="text-red-300 font-medium text-sm">{erroValidacao}</p>
                </div>
              )}

              {/* Nome */}
              <div className="space-y-2">
                <label className="block text-[10px] text-iron-gold uppercase tracking-widest">
                  Nome do Exercício *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Supino Inclinado"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-iron-gray border border-iron-divider rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-iron-gold transition-colors"
                />
              </div>

              {/* Grupo Muscular */}
              <div className="space-y-2">
                <label className="block text-[10px] text-iron-gold uppercase tracking-widest">
                  Grupo Muscular *
                </label>
                <select
                  value={formData.grupo_muscular}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      grupo_muscular: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-iron-gray border border-iron-divider rounded-lg text-white focus:outline-none focus:border-iron-gold transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {GRUPOS_MUSCULARES.map((grupo) => (
                    <option key={grupo} value={grupo}>
                      {grupo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Equipamento */}
              <div className="space-y-2">
                <label className="block text-[10px] text-iron-gold uppercase tracking-widest">
                  Equipamento *
                </label>
                <select
                  value={formData.equipamento}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      equipamento: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-iron-gray border border-iron-divider rounded-lg text-white focus:outline-none focus:border-iron-gold transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {EQUIPAMENTOS.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Exercício */}
              <div className="space-y-2">
                <label className="block text-[10px] text-iron-gold uppercase tracking-widest">
                  Tipo de Exercício *
                </label>
                <select
                  value={formData.tipo_exercicio}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tipo_exercicio: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-iron-gray border border-iron-divider rounded-lg text-white focus:outline-none focus:border-iron-gold transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {TIPOS_EXERCICIO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Músculos Secundários */}
              <div className="space-y-2">
                <label className="block text-[10px] text-iron-gold uppercase tracking-widest">
                  Músculos Secundários (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Tríceps, Ombros"
                  value={formData.musculos_secundarios}
                  onChange={(e) =>
                    setFormData({ ...formData, musculos_secundarios: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-iron-gray border border-iron-divider rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-iron-gold transition-colors"
                />
              </div>

              {/* URL do YouTube */}
              <div className="space-y-2">
                <label className="block text-[10px] text-iron-gold uppercase tracking-widest">
                  Link do YouTube (opcional)
                </label>
                <input
                  type="text"
                  placeholder="youtu.be/dQw4w9WgXcQ ou youtube.com/watch?v=dQw4w9WgXcQ"
                  value={formData.video_url}
                  onChange={(e) =>
                    setFormData({ ...formData, video_url: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-iron-gray border border-iron-divider rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-iron-gold transition-colors"
                />
                <p className="text-[9px] text-zinc-500">
                  Cole a URL completa ou apenas o ID do vídeo
                </p>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <label className="block text-[10px] text-iron-gold uppercase tracking-widest">
                  Descrição (opcional)
                </label>
                <textarea
                  placeholder="Ex: Exercício para desenvolvimento..."
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 bg-iron-gray border border-iron-divider rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-iron-gold transition-colors resize-none"
                />
              </div>
            </div>

            {/* Footer com Botões */}
            <div className="border-t border-iron-divider p-6 flex gap-3 bg-black/50">
              <button
                onClick={fecharModal}
                disabled={saving}
                className="flex-1 h-11 px-4 bg-iron-gray border border-iron-divider rounded-lg text-white text-[10px] uppercase tracking-widest hover:border-iron-gold disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarExercicio}
                disabled={saving}
                className="flex-1 h-11 px-4 bg-iron-gold text-black rounded-lg text-[10px] uppercase tracking-widest hover:bg-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Salvando...
                  </>
                ) : (
                  "Salvar Exercício"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
