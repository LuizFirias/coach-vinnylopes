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
  DotsThreeVertical,
} from "@phosphor-icons/react";
import Link from "next/link";
import { extractYouTubeVideoId, isValidYouTubeUrl } from "@/lib/youtubeUtils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import PageHeader from "@/app/components/PageHeader";

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
  "w-full px-4 py-2.5 rounded-[6px] text-sm text-text-primary",
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
  
  // Menu dropdown state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => { verificarAcessoECarregar(); }, []);
  useEffect(() => { filtrarExercicios(); }, [exercicios, searchTerm, grupoSelecionado]);

  // Close menu on click outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // ── Lógica ────────────────────────────────────────────────────────────────

  const verificarAcessoECarregar = async () => {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) { router.push("/login"); return; }

      const { data: profile } = await supabaseClient
        .from("profiles").select("role").eq("id", userId).single();
      if (profile?.role !== "coach" && profile?.role !== "admin" && profile?.role !== "super_admin") {
        setError("Acesso restrito a coaches");
        router.push("/aluno/dashboard");
        return;
      }
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
      const dados = {
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
      <div className="min-h-screen bg-surface-0 flex items-center justify-center lg:pl-16 xl:pl-[240px]">
        <DumbbellLoader text="Carregando biblioteca..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-16 xl:pl-[240px]">
      <div className="max-w-[1440px] px-6 md:px-10 py-8 mx-auto w-full flex flex-col gap-6 animate-fade-in">
        
        {/* Header */}
        <PageHeader
          title="Biblioteca de Exercícios"
          subtitle="Gerencie exercícios e demonstrações em vídeo"
          breadcrumbs={[
            { label: "Atletas", href: "/admin/alunos" },
            { label: "Biblioteca" }
          ]}
          actions={
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={abrirModalNovo} fullWidth={false}>
              Novo exercício
            </Button>
          }
        />

        {/* Busca */}
        <div className="relative">
          <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome ou grupo muscular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-surface-2 border border-border-subtle rounded-[8px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand transition-colors text-sm shadow-sm"
          />
        </div>

        {/* Filtros por grupo muscular */}
        <div className="pb-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setGrupoSelecionado("")}
              className={cn(
                "px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-all whitespace-nowrap",
                !grupoSelecionado ? "bg-brand text-text-on-brand shadow-sm" : "bg-surface-2 text-text-secondary border border-border-subtle hover:text-brand hover:border-brand/30"
              )}
            >
              Todos
            </button>
            {GRUPOS_MUSCULARES.map((grupo) => (
              <button
                key={grupo}
                onClick={() => setGrupoSelecionado(grupo)}
                className={cn(
                  "px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-all whitespace-nowrap",
                  grupoSelecionado === grupo ? "bg-brand text-text-on-brand shadow-sm" : "bg-surface-2 text-text-secondary border border-border-subtle hover:text-brand hover:border-brand/30"
                )}
              >
                {grupo}
              </button>
            ))}
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[6px] bg-danger-subtle border border-danger-border text-danger text-sm">
            <WarningCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Grid */}
        {filtrados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filtrados.map((exercicio) => (
              <Card
                key={exercicio.id}
                className="group bg-surface-1 rounded-[10px] border border-border-subtle p-4 shadow-sm hover:shadow-md hover:border-brand/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider group-hover:text-brand transition-colors truncate">
                        {exercicio.nome}
                      </h3>
                      <p className="text-[10px] text-text-tertiary mt-0.5 uppercase tracking-wider font-semibold">{exercicio.grupo_muscular}</p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {exercicio.video_url && (
                        <div className="w-6 h-6 rounded-full bg-brand-subtle border border-brand-border flex items-center justify-center text-brand">
                          <Video className="w-3.5 h-3.5" />
                        </div>
                      )}
                      
                      {/* Action trigger dropdown Menu */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === exercicio.id ? null : exercicio.id)}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                        >
                          <DotsThreeVertical size={16} weight="bold" />
                        </button>
                        {activeMenuId === exercicio.id && (
                          <div className="absolute right-0 top-7 bg-surface-2 border border-border-subtle rounded-[6px] shadow-lg py-1 w-28 z-20 animate-fade-in">
                            <button
                              onClick={() => { abrirModalEdicao(exercicio); setActiveMenuId(null); }}
                              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-text-primary hover:bg-brand/5 hover:text-brand transition-colors flex items-center gap-1.5"
                            >
                              <PencilSimple size={14} /> Editar
                            </button>
                            <button
                              onClick={() => { deletarExercicio(exercicio.id); setActiveMenuId(null); }}
                              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-danger hover:bg-danger/5 transition-colors flex items-center gap-1.5"
                            >
                              <Trash size={14} /> Deletar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {exercicio.descricao && (
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed mb-3">{exercicio.descricao}</p>
                  )}
                </div>

                {/* Badges for Equipment and Type */}
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border-subtle/50">
                  {exercicio.equipamento && (
                    <span className="px-1.5 py-0.5 rounded-[4px] bg-surface-3 border border-border-subtle text-[9px] text-text-secondary font-bold uppercase tracking-wide">
                      {exercicio.equipamento}
                    </span>
                  )}
                  {exercicio.tipo_exercicio && (
                    <span className="px-1.5 py-0.5 rounded-[4px] bg-brand-subtle border border-brand-border text-[9px] text-brand font-bold uppercase tracking-wide">
                      {exercicio.tipo_exercicio}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-border-default rounded-[10px] bg-surface-1">
            <div className="w-14 h-14 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center mx-auto mb-4">
              <MagnifyingGlass className="w-6 h-6 text-text-disabled" />
            </div>
            <p className="text-sm text-text-secondary font-semibold">Nenhum exercício encontrado</p>
            {(searchTerm || grupoSelecionado) ? (
              <button
                onClick={() => { setSearchTerm(""); setGrupoSelecionado(""); }}
                className="mt-3 text-brand text-xs font-bold hover:underline uppercase"
              >
                Limpar filtros
              </button>
            ) : (
              <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={abrirModalNovo} className="mt-4">
                Criar primeiro exercício
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={fecharModal} />

          <div className="relative bg-surface-1 w-full max-w-lg rounded-[12px] border border-border-default overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
              <h2 className="text-base font-bold text-text-primary">{modoEdicao ? "Editar" : "Novo"} exercício</h2>
              <button
                onClick={fecharModal}
                className="w-8 h-8 rounded-[8px] bg-surface-3 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-4 overflow-y-auto">
              {erroValidacao && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-[6px] bg-danger-subtle border border-danger-border text-danger text-sm">
                  <WarningCircle className="w-4 h-4 flex-shrink-0" />
                  {erroValidacao}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Nome do exercício *</label>
                <input
                  type="text"
                  placeholder="Ex: Supino Inclinado"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className={fieldCls}
                />
              </div>

              {[
                { label: "Grupo muscular *", field: "grupo_muscular", options: GRUPOS_MUSCULARES },
                { label: "Equipamento *", field: "equipamento", options: EQUIPAMENTOS },
                { label: "Tipo de exercício *", field: "tipo_exercicio", options: TIPOS_EXERCICIO },
              ].map(({ label, field, options }) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">{label}</label>
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
                <label className="text-xs font-medium text-text-secondary">Músculos secundários (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Tríceps, Ombros"
                  value={formData.musculos_secundarios}
                  onChange={(e) => setFormData({ ...formData, musculos_secundarios: e.target.value })}
                  className={fieldCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Link do YouTube (opcional)</label>
                <input
                  type="text"
                  placeholder="youtu.be/ID ou youtube.com/watch?v=ID"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  className={fieldCls}
                />
                <p className="text-[10px] text-text-tertiary">Cole a URL completa ou apenas o ID do vídeo</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Descrição (opcional)</label>
                <textarea
                  placeholder="Ex: Exercício multiarticular..."
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                  className={cn(fieldCls, "resize-none")}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-border-subtle bg-surface-2 shrink-0">
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
