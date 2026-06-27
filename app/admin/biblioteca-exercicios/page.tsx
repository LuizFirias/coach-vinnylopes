"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  X,
  ArrowLeft,
  Video,
  CircleNotch,
  WarningCircle,
  Users,
} from "@phosphor-icons/react";
import Link from "next/link";
import { extractYouTubeVideoId, isValidYouTubeUrl } from "@/lib/youtubeUtils";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import DumbbellLoader from "@/app/components/DumbbellLoader";

// ─── Tipos ────────────────────────────────────────────────────────────────────

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
  "Peito Superior", "Peito Médio", "Peito Inferior",
  "Dorsais", "Trapézio", "Lombar",
  "Ombro Anterior", "Ombro Lateral", "Ombro Posterior",
  "Bíceps", "Tríceps", "Antebraço",
  "Quadríceps", "Posterior (Isquiotibiais)", "Panturrilha",
  "Glúteos", "Abdômen", "Oblíquos", "Cardio",
];

const EQUIPAMENTOS = [
  "Nenhum", "Banda de Resistência", "Banda de Suspensão", "Barra",
  "Disco de Peso", "Haltere", "Kettlebell", "Máquina", "Outro",
];

const TIPOS_EXERCICIO = [
  "Peso & Repetições", "Repetições", "Peso Corporal com Peso Acrescido",
  "Duração", "Duração e Peso", "Distância e Duração", "Peso e Distância",
];

// Classe base dos campos do modal
const fieldCls = cn(
  "w-full px-4 py-3 rounded-xl text-sm text-text-primary",
  "bg-surface-3 border border-border-default",
  "placeholder:text-text-tertiary",
  "focus:outline-none focus:border-brand transition-colors",
  "appearance-none"
);

// ─── Componente ───────────────────────────────────────────────────────────────

export default function BibliotecaExerciciosPage() {
  const router = useRouter();
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [filtrados, setFiltrados] = useState<Exercicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>("");

  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [exercicioEditando, setExercicioEditando] = useState<Exercicio | null>(null);
  const [formData, setFormData] = useState({
    nome: "", grupo_muscular: "", video_url: "",
    descricao: "", equipamento: "", musculos_secundarios: "", tipo_exercicio: "",
  });
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  useEffect(() => { verificarAcessoECarregar(); }, []);
  useEffect(() => { filtrarExercicios(); }, [exercicios, searchTerm, grupoSelecionado]);

  // ── Lógica ────────────────────────────────────────────────────────────────

  const verificarAcessoECarregar = async () => {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) { router.push("/login"); return; }

      const { data: profile } = await supabaseClient
        .from("profiles").select("role").eq("id", userId).single();
      if (profile?.role !== "coach" && profile?.role !== "super_admin" && profile?.role !== "admin") {
        setError("Acesso restrito a coaches");
        router.push("/aluno/dashboard");
        return;
      }
      setCoachId(userId);
      await carregarExercicios();
    } catch (err) {
      setError("Erro ao carregar página");
    } finally {
      setLoading(false);
    }
  };

  const carregarExercicios = async () => {
    try {
      const { data, error: err } = await supabaseClient
        .from("exercicios_biblioteca").select("*").order("nome", { ascending: true });
      if (err) throw err;
      setExercicios(data || []);
    } catch (err) {
      setError("Erro ao carregar biblioteca");
    }
  };

  const filtrarExercicios = () => {
    let resultado = [...exercicios];
    if (searchTerm.trim()) {
      resultado = resultado.filter((ex) =>
        ex.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.grupo_muscular.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (grupoSelecionado) {
      resultado = resultado.filter((ex) => ex.grupo_muscular === grupoSelecionado);
    }
    setFiltrados(resultado);
  };

  const abrirModalNovo = () => {
    setModoEdicao(false);
    setExercicioEditando(null);
    setFormData({ nome: "", grupo_muscular: "", video_url: "", descricao: "", equipamento: "", musculos_secundarios: "", tipo_exercicio: "" });
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
    if (!formData.nome.trim()) { setErroValidacao("Nome do exercício é obrigatório"); return false; }
    if (!formData.grupo_muscular) { setErroValidacao("Grupo muscular é obrigatório"); return false; }
    if (!formData.equipamento) { setErroValidacao("Equipamento é obrigatório"); return false; }
    if (!formData.tipo_exercicio) { setErroValidacao("Tipo de exercício é obrigatório"); return false; }
    if (formData.video_url.trim() && !isValidYouTubeUrl(formData.video_url)) {
      setErroValidacao("URL do YouTube inválida. Use: youtu.be/ID ou youtube.com/watch?v=ID");
      return false;
    }
    return true;
  };

  const salvarExercicio = async () => {
    if (!validarFormulario()) return;
    setSaving(true);
    try {
      const videoId = formData.video_url ? extractYouTubeVideoId(formData.video_url) : null;
      const dados: any = {
        nome: formData.nome.trim(),
        grupo_muscular: formData.grupo_muscular,
        equipamento: formData.equipamento,
        tipo_exercicio: formData.tipo_exercicio,
        musculos_secundarios: formData.musculos_secundarios.trim() || null,
        video_url: videoId ? `https://youtube.com/embed/${videoId}` : null,
        descricao: formData.descricao.trim() || null,
      };

      if (modoEdicao && exercicioEditando) {
        const { error: err } = await supabaseClient.from("exercicios_biblioteca").update(dados).eq("id", exercicioEditando.id);
        if (err) throw err;
        setExercicios((prev) => prev.map((ex) => ex.id === exercicioEditando.id ? { ...ex, ...dados, id: ex.id } : ex) as Exercicio[]);
      } else {
        dados.origem = 'custom';
        dados.coach_id = coachId;
        dados.ativo = true;
        const { data, error: err } = await supabaseClient.from("exercicios_biblioteca").insert(dados).select().single();
        if (err) throw err;
        setExercicios((prev) => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
      }
      fecharModal();
    } catch (err) {
      setErroValidacao("Erro ao salvar exercício. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const deletarExercicio = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este exercício? Isso não pode ser desfeito.")) return;
    setDeleting(id);
    try {
      const { error: err } = await supabaseClient.from("exercicios_biblioteca").delete().eq("id", id);
      if (err) throw err;
      setExercicios((prev) => prev.filter((ex) => ex.id !== id));
    } catch (err) {
      setError("Erro ao deletar exercício");
    } finally {
      setDeleting(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center lg:pl-28">
        <DumbbellLoader text="Carregando biblioteca..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-24 p-4 md:p-6 lg:p-10 lg:pl-28">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/alunos"
              className="w-9 h-9 rounded-xl bg-surface-2 border border-border-default flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">Biblioteca</h1>
              <p className="text-sm text-text-secondary">Gerencie exercícios e demonstrações em vídeo</p>
            </div>
          </div>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={abrirModalNovo} fullWidth={false}>
            Novo exercício
          </Button>
        </div>

        {/* Busca */}
        <div className="relative mb-6">
          <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome ou grupo muscular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-surface-2 border border-border-subtle rounded-2xl text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors text-sm shadow-elev-1"
          />
        </div>

        {/* Filtros por grupo muscular */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setGrupoSelecionado("")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
                !grupoSelecionado ? "bg-brand text-text-on-brand shadow-glow-brand" : "bg-surface-2 text-text-secondary border border-border-subtle hover:text-brand hover:border-brand/30"
              )}
            >
              Todos
            </button>
            {GRUPOS_MUSCULARES.map((grupo) => (
              <button
                key={grupo}
                onClick={() => setGrupoSelecionado(grupo)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
                  grupoSelecionado === grupo ? "bg-brand text-text-on-brand shadow-glow-brand" : "bg-surface-2 text-text-secondary border border-border-subtle hover:text-brand hover:border-brand/30"
                )}
              >
                {grupo}
              </button>
            ))}
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm">
            <WarningCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Grid */}
        {filtrados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map((exercicio) => (
              <div
                key={exercicio.id}
                className="group bg-surface-1 rounded-2xl border border-border-subtle p-5 shadow-elev-1 hover:shadow-elev-2 hover:border-brand/25 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary uppercase tracking-tight group-hover:text-brand transition-colors truncate">
                      {exercicio.nome}
                    </h3>
                    <p className="text-xs text-text-tertiary mt-1 uppercase tracking-caps">{exercicio.grupo_muscular}</p>
                  </div>
                  {exercicio.video_url && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-subtle border border-brand-border flex items-center justify-center text-brand ml-2">
                      <Video className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {exercicio.descricao && (
                  <p className="text-xs text-text-secondary mb-3 line-clamp-2">{exercicio.descricao}</p>
                )}

                <div className="flex gap-2 pt-3 border-t border-border-subtle">
                  <button
                    onClick={() => abrirModalEdicao(exercicio)}
                    className="flex-grow h-9 flex items-center justify-center gap-1.5 bg-surface-3 border border-border-default rounded-lg text-brand text-xs font-medium hover:border-brand hover:bg-brand/5 transition-colors"
                  >
                    <PencilSimple className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => deletarExercicio(exercicio.id)}
                    disabled={deleting === exercicio.id}
                    className="w-9 h-9 flex items-center justify-center bg-surface-3 border border-border-default rounded-lg text-text-tertiary hover:text-danger hover:border-danger/30 hover:bg-danger-subtle/10 transition-colors disabled:opacity-50 flex-shrink-0"
                    title="Excluir exercício"
                  >
                    {deleting === exercicio.id ? (
                      <CircleNotch className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : exercicios.length === 0 ? (
          /* Entire Library Empty State */
          <div className="bg-surface-1 border border-border-subtle rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xl">
            <Users size={48} className="text-brand/40 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-text-primary mb-2">Sua biblioteca AURON ainda está vazia</h3>
            <p className="text-text-secondary text-sm mb-6 max-w-sm mx-auto">
              Cadastre exercícios oficiais ou adicione exercícios personalizados para começar a montar fichas digitais com vídeos de execução.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={abrirModalNovo}>
                Cadastrar exercício
              </Button>
              <Button variant="secondary" size="sm" onClick={() => alert("Função de importação em desenvolvimento.")}>
                Importar exercícios
              </Button>
            </div>
          </div>
        ) : (
          /* Search Results Empty State */
          <div className="bg-surface-1 border border-border-subtle rounded-2xl p-12 text-center max-w-md mx-auto shadow-md">
            <WarningCircle size={40} className="text-warning/60 mx-auto mb-3" />
            <h3 className="text-md font-bold text-text-primary mb-1">Nenhum exercício encontrado</h3>
            <p className="text-text-secondary text-xs mb-5">
              Tente buscar por outro termo, grupo muscular ou limpe os filtros aplicados.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => { setSearchTerm(""); setGrupoSelecionado(""); }}
                className="btn-secondary text-2xs py-2 px-3"
              >
                Limpar filtros
              </button>
              <button onClick={abrirModalNovo} className="btn-primary text-2xs py-2 px-3">
                Adicionar novo exercício
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface-0/90 backdrop-blur-sm" onClick={fecharModal} />

          <div className="relative bg-surface-1 w-full max-w-lg rounded-2xl border border-border-default overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
              <h2 className="text-lg font-bold text-text-primary">{modoEdicao ? "Editar" : "Novo"} exercício</h2>
              <button
                onClick={fecharModal}
                className="w-8 h-8 rounded-xl bg-surface-3 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-5 max-h-[calc(85vh-140px)] overflow-y-auto">
              {erroValidacao && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm">
                  <WarningCircle className="w-4 h-4 flex-shrink-0" />
                  {erroValidacao}
                </div>
              )}

              {([
                { label: "Nome do exercício *", field: "nome", type: "input", placeholder: "Ex: Supino Inclinado" },
              ] as const).map(({ label, field, type, placeholder }) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-brand">{label}</label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={formData[field]}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    className={fieldCls}
                  />
                </div>
              ))}

              {[
                { label: "Grupo muscular *", field: "grupo_muscular", options: GRUPOS_MUSCULARES },
                { label: "Equipamento *", field: "equipamento", options: EQUIPAMENTOS },
                { label: "Tipo de exercício *", field: "tipo_exercicio", options: TIPOS_EXERCICIO },
              ].map(({ label, field, options }) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-brand">{label}</label>
                  <select
                    value={formData[field as keyof typeof formData]}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    className={fieldCls}
                  >
                    <option value="">Selecione...</option>
                    {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              ))}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-brand">Músculos secundários (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Tríceps, Ombros"
                  value={formData.musculos_secundarios}
                  onChange={(e) => setFormData({ ...formData, musculos_secundarios: e.target.value })}
                  className={fieldCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-brand">Link do YouTube (opcional)</label>
                <input
                  type="text"
                  placeholder="youtu.be/ID ou youtube.com/watch?v=ID"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  className={fieldCls}
                />
                <p className="text-xs text-text-tertiary">Cole a URL completa ou apenas o ID do vídeo</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-brand">Descrição (opcional)</label>
                <textarea
                  placeholder="Ex: Exercício para desenvolvimento..."
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                  className={cn(fieldCls, "resize-none")}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-border-subtle bg-surface-2">
              <Button variant="secondary" onClick={fecharModal} disabled={saving} fullWidth>
                Cancelar
              </Button>
              <Button onClick={salvarExercicio} loading={saving} fullWidth>
                Salvar exercício
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
