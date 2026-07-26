"use client";

import { useEffect, useState, useRef } from "react";
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
  Barbell,
  UploadSimple,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import Link from "next/link";
import { extractYouTubeVideoId, isValidYouTubeUrl } from "@/lib/youtubeUtils";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { CANONICAL_MUSCLE_GROUPS } from "@/lib/constants/muscle-groups";
import { textEquals, textIncludes } from "@/lib/utils/textNormalize";
import DumbbellLoader from "@/app/components/DumbbellLoader";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Exercicio {
  id: string;
  nome: string;
  grupo_muscular: string;
  video_url?: string;
  gif_url?: string;
  descricao?: string;
  imagem_url?: string;
  equipamento?: string;
  musculos_secundarios?: string;
  tipo_exercicio?: string;
}

const GRUPOS_MUSCULARES = [...CANONICAL_MUSCLE_GROUPS];

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
  const [userRole, setUserRole] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>("");

  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [exercicioEditando, setExercicioEditando] = useState<Exercicio | null>(null);
  const [formData, setFormData] = useState({
    nome: "", grupo_muscular: "", video_url: "", gif_url: "",
    descricao: "", equipamento: "", musculos_secundarios: "", tipo_exercicio: "",
  });
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  
  const inputGifRef = useRef<HTMLInputElement>(null);
  const gruposScrollRef = useRef<HTMLDivElement>(null);
  const [uploadingGif, setUploadingGif] = useState(false);
  const [canScrollGruposLeft, setCanScrollGruposLeft] = useState(false);
  const [canScrollGruposRight, setCanScrollGruposRight] = useState(false);

  const isSuperAdmin = userRole === "super_admin";

  const updateGruposScrollState = () => {
    const el = gruposScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollGruposLeft(el.scrollLeft > 4);
    setCanScrollGruposRight(maxScroll > 4 && el.scrollLeft < maxScroll - 4);
  };

  const scrollGrupos = (direction: "left" | "right") => {
    const el = gruposScrollRef.current;
    if (!el) return;
    const amount = Math.max(180, Math.floor(el.clientWidth * 0.55));
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  useEffect(() => { verificarAcessoECarregar(); }, []);
  useEffect(() => { filtrarExercicios(); }, [exercicios, searchTerm, grupoSelecionado]);

  useEffect(() => {
    updateGruposScrollState();
    const el = gruposScrollRef.current;
    if (!el) return;

    const onScroll = () => updateGruposScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateGruposScrollState);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateGruposScrollState) : null;
    ro?.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateGruposScrollState);
      ro?.disconnect();
    };
  }, [loading]);

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
      setUserRole(profile?.role || null);
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
      resultado = resultado.filter(
        (ex) =>
          textIncludes(ex.nome, searchTerm) ||
          textIncludes(ex.grupo_muscular, searchTerm)
      );
    }
    if (grupoSelecionado) {
      resultado = resultado.filter((ex) => textEquals(ex.grupo_muscular, grupoSelecionado));
    }
    setFiltrados(resultado);
  };

  const abrirModalNovo = () => {
    setModoEdicao(false);
    setExercicioEditando(null);
    setFormData({ nome: "", grupo_muscular: "", video_url: "", gif_url: "", descricao: "", equipamento: "", musculos_secundarios: "", tipo_exercicio: "" });
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
      gif_url: exercicio.gif_url || "",
      descricao: exercicio.descricao || "",
      equipamento: exercicio.equipamento || "",
      musculos_secundarios: exercicio.musculos_secundarios || "",
      tipo_exercicio: exercicio.tipo_exercicio || "",
    });
    setErroValidacao(null);
    setModalAberto(true);
  };

  const handleGifUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/gif', 'image/webp'].includes(file.type)) {
      alert("Apenas arquivos GIF ou WebP animado são permitidos.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("O arquivo não pode exceder 2MB.");
      return;
    }

    try {
      setUploadingGif(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${coachId || 'admin'}_exercise_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('exercicios-gifs')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('exercicios-gifs')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, gif_url: publicUrl }));
    } catch (err) {
      console.error("Erro no upload do GIF:", err);
      alert("Erro ao enviar o GIF. Tente novamente.");
    } finally {
      setUploadingGif(false);
    }
  };

  const removerGif = () => {
    setFormData(prev => ({ ...prev, gif_url: "" }));
    if (inputGifRef.current) inputGifRef.current.value = "";
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
        gif_url: formData.gif_url.trim() || null,
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
      <div className="w-full max-w-[min(1600px,96vw)] mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/alunos"
              className="w-8 h-8 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-text-primary tracking-tight">Biblioteca de Exercícios</h1>
              <p className="text-xs text-text-secondary mt-0.5">Gerencie exercícios e demonstrações em vídeo</p>
            </div>
          </div>
          {isSuperAdmin && (
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={abrirModalNovo} fullWidth={false} className="py-2 rounded-lg text-xs">
              Novo exercício
            </Button>
          )}
        </div>

        {/* Busca */}
        <div className="relative mb-4">
          <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome ou grupo muscular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 pl-10 pr-4 bg-surface-2 border border-input rounded-md text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors text-2xs shadow-sm"
          />
        </div>

        {/* Filtros por grupo muscular */}
        <div className="relative mb-6 flex items-center gap-2">
          <button
            type="button"
            aria-label="Grupos anteriores"
            onClick={() => scrollGrupos("left")}
            disabled={!canScrollGruposLeft}
            className={cn(
              "hidden lg:flex shrink-0 w-8 h-8 items-center justify-center rounded-md border border-card bg-surface-2 text-text-secondary transition-colors",
              canScrollGruposLeft
                ? "hover:text-text-primary hover:border-card-hover cursor-pointer"
                : "opacity-30 cursor-default"
            )}
          >
            <CaretLeft size={16} weight="bold" />
          </button>

          <div className="relative min-w-0 flex-1">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface-0 to-transparent pointer-events-none z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface-0 to-transparent pointer-events-none z-10" />

            <div
              ref={gruposScrollRef}
              className="overflow-x-auto pb-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-2"
            >
              <div className="flex gap-1 p-0.5 bg-surface-2 border border-card rounded-md h-8.5 w-max items-center">
                <button
                  onClick={() => setGrupoSelecionado("")}
                  className={cn(
                    "px-3 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all h-6.5 flex items-center justify-center whitespace-nowrap",
                    !grupoSelecionado ? "bg-surface-0 border border-card/50 text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  Todos
                </button>
                {GRUPOS_MUSCULARES.map((grupo) => (
                  <button
                    key={grupo}
                    onClick={() => setGrupoSelecionado(grupo)}
                    className={cn(
                      "px-3 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all h-6.5 flex items-center justify-center whitespace-nowrap",
                      grupoSelecionado === grupo ? "bg-surface-0 border border-card/50 text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {grupo}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Próximos grupos"
            onClick={() => scrollGrupos("right")}
            disabled={!canScrollGruposRight}
            className={cn(
              "hidden lg:flex shrink-0 w-8 h-8 items-center justify-center rounded-md border border-card bg-surface-2 text-text-secondary transition-colors",
              canScrollGruposRight
                ? "hover:text-text-primary hover:border-card-hover cursor-pointer"
                : "opacity-30 cursor-default"
            )}
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>

        {/* Erro */}
        {error && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-danger-subtle border border-danger-border text-danger text-xs font-semibold">
            <WarningCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Lista Compacta de Exercícios */}
        {filtrados.length > 0 ? (
          <div className="flex flex-col gap-2">
            {filtrados.map((exercicio) => {
              return (
                <div
                  key={exercicio.id}
                  className="group bg-surface-1 border border-card hover:border-brand/35 rounded-xl px-4 py-3 flex items-center justify-between gap-4 transition-all shadow-sm h-[72px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Dumbbell Icon Thumbnail */}
                    <div className="w-11 h-11 rounded-lg bg-surface-3 flex items-center justify-center text-text-tertiary border border-card shrink-0 select-none">
                      <Barbell className="w-5 h-5" />
                    </div>
                    {/* Nome & Subtext */}
                    <div className="flex flex-col min-w-0">
                      <h3 className="text-xs md:text-sm font-bold text-text-primary group-hover:text-brand transition-colors truncate">
                        {exercicio.nome}
                      </h3>
                      <span className="text-[10px] text-text-tertiary mt-0.5 truncate">
                        {exercicio.grupo_muscular} {exercicio.equipamento ? `• ${exercicio.equipamento}` : ""} {exercicio.tipo_exercicio ? `• ${exercicio.tipo_exercicio}` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Video Camera Icon */}
                    {exercicio.video_url && (
                      <span 
                        className="text-text-secondary flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border border-card bg-surface-2 px-2 py-0.5 rounded"
                        title="Possui demonstração em vídeo"
                      >
                        <Video className="w-3.5 h-3.5 text-brand" weight="fill" />
                        <span>Vídeo</span>
                      </span>
                    )}

                    {/* Action buttons (discrete - visible on hover for desktop, always for mobile) */}
                    {isSuperAdmin && (
                      <div className="flex items-center gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => abrirModalEdicao(exercicio)}
                          className="w-7 h-7 flex items-center justify-center bg-surface-2 hover:bg-surface-3 border border-card rounded-md text-text-secondary hover:text-brand transition-colors"
                          title="Editar exercício"
                        >
                          <PencilSimple className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deletarExercicio(exercicio.id)}
                          disabled={deleting === exercicio.id}
                          className="w-7 h-7 flex items-center justify-center bg-surface-2 hover:bg-surface-3 border border-card rounded-md text-text-secondary hover:text-danger transition-colors disabled:opacity-50"
                          title="Excluir exercício"
                        >
                          {deleting === exercicio.id ? (
                            <CircleNotch className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : exercicios.length === 0 ? (
          /* Entire Library Empty State */
          <div className="bg-surface-1 border border-card rounded-xl p-12 text-center max-w-lg mx-auto shadow-sm">
            <Users size={44} className="text-brand/40 mx-auto mb-4" />
            <h3 className="text-base font-bold text-text-primary mb-2">Sua biblioteca AURON ainda está vazia</h3>
            <p className="text-text-secondary text-xs mb-6 max-w-sm mx-auto">
              Cadastre exercícios oficiais ou adicione exercícios personalizados para começar a montar fichas digitais com vídeos de execução.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isSuperAdmin && (
                <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={abrirModalNovo} className="py-2 rounded-lg text-xs">
                  Cadastrar exercício
                </Button>
              )}
              {isSuperAdmin && (
                <Button variant="secondary" size="sm" onClick={() => alert("Função de importação em desenvolvimento.")} className="py-2 rounded-lg text-xs">
                  Importar exercícios
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Search Results Empty State */
          <div className="bg-surface-1 border border-card rounded-2xl p-12 text-center max-w-md mx-auto shadow-md">
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
              {isSuperAdmin && (
                <button onClick={abrirModalNovo} className="btn-primary text-2xs py-2 px-3">
                  Adicionar novo exercício
                </button>
              )}
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
              <h2 className="text-lg font-bold text-text-primary">{modoEdicao ? "Editar" : "Novo"} exercício</h2>
              <button
                onClick={fecharModal}
                className="w-8 h-8 rounded-xl bg-surface-3 border border-card flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
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
                <label className="text-xs font-medium text-brand">GIF de demonstração (opcional)</label>
                
                {uploadingGif ? (
                  <div className="border border-dashed border-border-default rounded-xl p-6 flex flex-col items-center justify-center gap-2 bg-surface-3">
                    <CircleNotch className="w-5 h-5 animate-spin text-brand" />
                    <p className="text-xs text-text-secondary">Enviando arquivo...</p>
                  </div>
                ) : formData.gif_url ? (
                  <div className="relative rounded-xl overflow-hidden border border-card aspect-video bg-surface-3 flex items-center justify-center">
                    <img src={formData.gif_url} alt="Demonstração" className="max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={removerGif}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-surface-0/80 border border-card flex items-center justify-center hover:bg-surface-1 transition-colors"
                      title="Remover GIF"
                    >
                      <X className="w-3.5 h-3.5 text-text-primary" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => inputGifRef.current?.click()}
                    className="border border-dashed border-border-default rounded-xl p-6 flex flex-col items-center gap-2 bg-surface-3 cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-all"
                  >
                    <UploadSimple className="w-5 h-5 text-text-tertiary" />
                    <p className="text-xs text-text-secondary text-center">
                      Clique para enviar GIF ou WebP animado<br/>
                      <span className="text-2xs text-text-tertiary">Máximo 2MB · 480×480px mínimo</span>
                    </p>
                  </div>
                )}
                
                <input
                  ref={inputGifRef}
                  type="file"
                  accept="image/gif,image/webp"
                  className="hidden"
                  onChange={handleGifUpload}
                />
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
            <div className="flex gap-3 px-6 py-4 border-t border-divider bg-surface-2">
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
