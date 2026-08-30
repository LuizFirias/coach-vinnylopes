"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Figtree } from "next/font/google";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { supabaseClient } from "@/lib/supabaseClient";
import { getBootstrapProfile } from "@/lib/auth/bootstrapProfile";
import {
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  X,
  Video,
  CircleNotch,
  WarningCircle,
  Barbell,
  UploadSimple,
  ChartBar,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import { CANONICAL_MUSCLE_GROUPS } from "@/lib/constants/muscle-groups";
import { CANONICAL_EQUIPMENTS } from "@/lib/constants/equipment";
import { textIncludes } from "@/lib/utils/textNormalize";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { getPublicR2Url } from "@/lib/r2/urls";
import { extractYouTubeVideoId, isValidYouTubeUrl } from "@/lib/youtubeUtils";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { toBrazilDateString } from "@/lib/dateUtils";
import { secondsToDescanso } from "@/lib/utils/restTime";

const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Exercicio {
  id: string;
  nome: string;
  grupo_muscular: string;
  video_url?: string;
  gif_url?: string;
  gif_url_feminino?: string;
  descricao?: string;
  imagem_url?: string;
  imagem_url_feminino?: string;
  equipamento?: string;
  musculos_secundarios?: string;
  tipo_exercicio?: string;
  origem?: string;
}

interface Aluno {
  id: string;
  coaching_reference: string;
}

interface SerieSessao {
  ordem?: number;
  reps?: string | number;
  reps_executadas?: string | number;
  peso_atual?: number | null;
  completado?: boolean;
  tempo_executado_seg?: number | null;
  is_tempo?: boolean;
}

interface SessaoHistorico {
  id: string;
  aluno_id: string;
  data_conclusao: string;
  dados_sessao: {
    series?: SerieSessao[];
    nome_rotina?: string;
  } | null;
}

const GRUPOS_MUSCULARES = [...CANONICAL_MUSCLE_GROUPS];
const EQUIPAMENTOS = [...CANONICAL_EQUIPMENTS];

const TIPOS_EXERCICIO = [
  "Peso & Repetições", "Repetições", "Peso Corporal com Peso Acrescido",
  "Duração", "Duração e Peso", "Distância e Duração", "Peso e Distância",
];

const PERIODOS = [
  { value: "4s", label: "Últimas 4 semanas", dias: 28 },
  { value: "12s", label: "Últimas 12 semanas", dias: 84 },
  { value: "6m", label: "Últimos 6 meses", dias: 182 },
  { value: "1a", label: "Último ano", dias: 365 },
  { value: "tudo", label: "Todo o período", dias: null as number | null },
];

// Classe base dos campos do modal
const fieldCls = cn(
  "w-full px-4 py-3 rounded-xl text-sm text-text-primary",
  "bg-surface-3 border-0",
  "placeholder:text-text-tertiary",
  "focus:outline-none focus:border-brand transition-colors",
  "appearance-none"
);

// ─── Estatísticas por sessão ────────────────────────────────────────────────

/** Epley: 1RM estimado = peso × (1 + reps/30) */
function estimarUmRM(peso: number, reps: number): number {
  if (!peso || !reps) return 0;
  if (reps === 1) return peso;
  return peso * (1 + reps / 30);
}

function calcularStatsSessao(dadosSessao: SessaoHistorico["dados_sessao"]) {
  const series = Array.isArray(dadosSessao?.series) ? dadosSessao!.series! : [];
  let pesoMax = 0;
  let umRM = 0;
  let volumeKg = 0;
  let repsMax = 0;
  let repsTotal = 0;
  let tempoMax = 0;
  let tempoTotal = 0;
  for (const s of series) {
    if (s.completado === false) continue;
    const peso = Number(s.peso_atual) || 0;
    const reps = Number(s.reps_executadas ?? s.reps) || 0;
    const tempo = Number(s.tempo_executado_seg) || 0;
    if (peso > pesoMax) pesoMax = peso;
    const rm = estimarUmRM(peso, reps);
    if (rm > umRM) umRM = rm;
    volumeKg += peso * reps;
    if (reps > repsMax) repsMax = reps;
    repsTotal += reps;
    if (tempo > tempoMax) tempoMax = tempo;
    tempoTotal += tempo;
  }
  return { pesoMax, umRM, volumeKg, repsMax, repsTotal, tempoMax, tempoTotal };
}

type MetricaKey = keyof ReturnType<typeof calcularStatsSessao>;

interface MetricaConfig {
  key: MetricaKey;
  titulo: string;
  formatar: (v: number) => string;
}

const formatarKg = (v: number) => `${v.toLocaleString("pt-BR")} kg`;
const formatarReps = (v: number) => `${v.toLocaleString("pt-BR")} reps`;
const formatarTempo = (v: number) => secondsToDescanso(v);

const METRICAS_PESO_REPS: MetricaConfig[] = [
  { key: "pesoMax", titulo: "Peso (kg)", formatar: formatarKg },
  { key: "umRM", titulo: "1RM estimado (kg)", formatar: formatarKg },
  { key: "volumeKg", titulo: "Volume por sessão (kg)", formatar: formatarKg },
];

/** Cada tipo de exercício rastreia grandezas diferentes — o gráfico se adapta ao tipo. */
function getMetricasPorTipo(tipo: string | undefined): MetricaConfig[] {
  switch (tipo) {
    case "Peso & Repetições":
    case "Peso Corporal com Peso Acrescido":
      return METRICAS_PESO_REPS;
    case "Repetições":
      return [
        { key: "repsMax", titulo: "Repetições (máx. por série)", formatar: formatarReps },
        { key: "repsTotal", titulo: "Volume (repetições totais)", formatar: formatarReps },
      ];
    case "Duração":
      return [
        { key: "tempoMax", titulo: "Duração (máx. por série)", formatar: formatarTempo },
        { key: "tempoTotal", titulo: "Tempo total na sessão", formatar: formatarTempo },
      ];
    case "Duração e Peso":
      return [
        { key: "pesoMax", titulo: "Peso (kg)", formatar: formatarKg },
        { key: "tempoTotal", titulo: "Tempo total na sessão", formatar: formatarTempo },
      ];
    case "Distância e Duração":
      // A execução do aluno ainda não salva distância percorrida — só duração.
      return [
        { key: "tempoTotal", titulo: "Tempo total na sessão", formatar: formatarTempo },
      ];
    case "Peso e Distância":
      // Idem — sem distância salva hoje, mostra só o peso.
      return [
        { key: "pesoMax", titulo: "Peso (kg)", formatar: formatarKg },
      ];
    default:
      return METRICAS_PESO_REPS;
  }
}

// Curva neutra só pra desenhar o gráfico "fake" quando não há dado nenhum.
const FAKE_CHART_DATA = [
  { label: "1", v: 30 }, { label: "2", v: 34 }, { label: "3", v: 33 },
  { label: "4", v: 28 }, { label: "5", v: 35 }, { label: "6", v: 46 },
  { label: "7", v: 50 }, { label: "8", v: 58 }, { label: "9", v: 62 },
];

function StatChart({
  titulo,
  dados,
  dataKey,
  formatarValor,
  loading,
}: {
  titulo: string;
  dados: { label: string; v: number }[];
  dataKey: string;
  formatarValor: (v: number) => string;
  loading: boolean;
}) {
  const vazio = !loading && dados.length === 0;
  const chartData = vazio ? FAKE_CHART_DATA : dados;

  return (
    <div>
      <p className="text-xs font-bold text-text-primary mb-2">{titulo}</p>
      <div className="relative h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="label" hide />
            <YAxis
              width={34}
              tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
              axisLine={false}
              tickLine={false}
            />
            {!vazio && (
              <Tooltip
                formatter={(value: number) => formatarValor(value)}
                labelFormatter={(label) => label}
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey={vazio ? "v" : dataKey}
              stroke={vazio ? "var(--border-default)" : "var(--brand-primary)"}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: vazio ? "var(--border-default)" : "var(--brand-primary)" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
        {vazio && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-surface-1/80 backdrop-blur-[1px]">
            <ChartBar size={22} className="text-text-tertiary" />
            <span className="text-[11px] font-semibold text-text-tertiary">Nenhum dado registrado</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function BibliotecaExerciciosPage() {
  const router = useRouter();
  const isMobile = useBreakpoint("mobile");

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
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<string>("");

  const [selecionado, setSelecionado] = useState<Exercicio | null>(null);
  const [aba, setAba] = useState<"stats" | "historico" | "execucao">("stats");

  // Alunos (pro filtro de Estatísticas)
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [statsAlunoId, setStatsAlunoId] = useState<string>("");
  const [statsPeriodo, setStatsPeriodo] = useState<string>("12s");
  const [statsSessoes, setStatsSessoes] = useState<SessaoHistorico[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Histórico (todos os alunos, mais recentes primeiro)
  const [historico, setHistorico] = useState<(SessaoHistorico & { alunoNome: string })[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [exercicioEditando, setExercicioEditando] = useState<Exercicio | null>(null);
  const [formData, setFormData] = useState({
    nome: "", grupo_muscular: "", video_url: "", gif_url: "", gif_url_feminino: "",
    imagem_url: "", imagem_url_feminino: "",
    descricao: "", equipamento: "", musculos_secundarios: "", tipo_exercicio: "",
  });
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  const inputGifRef = useRef<HTMLInputElement>(null);
  const inputGifFemininoRef = useRef<HTMLInputElement>(null);
  const [uploadingGif, setUploadingGif] = useState<"padrao" | "feminino" | null>(null);

  const isSuperAdmin = userRole === "super_admin";

  useEffect(() => { verificarAcessoECarregar(); }, []);
  useEffect(() => { filtrarExercicios(); }, [exercicios, searchTerm, grupoSelecionado, equipamentoSelecionado]);

  // ── Lógica ────────────────────────────────────────────────────────────────

  const verificarAcessoECarregar = async () => {
    try {
      const boot = await getBootstrapProfile();
      const userId = boot?.userId;
      if (!userId) { router.push("/login"); return; }

      const profile = { role: boot?.role };
      if (profile?.role !== "coach" && profile?.role !== "super_admin" && profile?.role !== "admin") {
        setError("Acesso restrito a coaches");
        router.push("/aluno/dashboard");
        return;
      }
      setCoachId(userId);
      setUserRole(profile?.role || null);
      await Promise.all([carregarExercicios(), carregarAlunos(userId)]);
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

  const carregarAlunos = async (userId: string) => {
    try {
      const { data: links } = await supabaseClient
        .from("coach_alunos").select("aluno_id").eq("coach_id", userId);
      const ids = links?.map((l) => l.aluno_id) || [];
      if (!ids.length) { setAlunos([]); return; }
      const { data } = await supabaseClient
        .from("profiles").select("id, coaching_reference")
        .in("id", ids).eq("arquivado", false)
        .order("coaching_reference", { ascending: true });
      setAlunos((data as Aluno[]) || []);
    } catch {
      /* filtro de aluno fica vazio, sem bloquear a tela */
    }
  };

  const filtrarExercicios = () => {
    let resultado = [...exercicios];
    if (searchTerm.trim()) {
      resultado = resultado.filter(
        (ex) => textIncludes(ex.nome, searchTerm) || textIncludes(ex.grupo_muscular, searchTerm)
      );
    }
    if (grupoSelecionado) {
      resultado = resultado.filter((ex) => ex.grupo_muscular === grupoSelecionado);
    }
    if (equipamentoSelecionado) {
      resultado = resultado.filter((ex) => ex.equipamento === equipamentoSelecionado);
    }
    setFiltrados(resultado);
  };

  const selecionarExercicio = (ex: Exercicio) => {
    setSelecionado(ex);
    setAba("stats");
  };

  // Estatísticas — carrega quando muda exercício, aluno ou período
  useEffect(() => {
    if (!selecionado || !statsAlunoId) { setStatsSessoes([]); return; }
    (async () => {
      setStatsLoading(true);
      try {
        let query = supabaseClient
          .from("historico_treinos")
          .select("id, aluno_id, data_conclusao, dados_sessao")
          .eq("exercicio_id", selecionado.id)
          .eq("aluno_id", statsAlunoId)
          .order("data_conclusao", { ascending: true });

        const periodo = PERIODOS.find((p) => p.value === statsPeriodo);
        if (periodo?.dias) {
          const desde = new Date(Date.now() - periodo.dias * 86400000).toISOString();
          query = query.gte("data_conclusao", desde);
        }

        const { data, error: err } = await query;
        if (err) throw err;
        setStatsSessoes((data as SessaoHistorico[]) || []);
      } catch {
        setStatsSessoes([]);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [selecionado, statsAlunoId, statsPeriodo]);

  // Histórico — todos os alunos, mais recentes primeiro
  useEffect(() => {
    if (!selecionado) { setHistorico([]); return; }
    (async () => {
      setHistoricoLoading(true);
      try {
        const { data, error: err } = await supabaseClient
          .from("historico_treinos")
          .select("id, aluno_id, data_conclusao, dados_sessao")
          .eq("exercicio_id", selecionado.id)
          .order("data_conclusao", { ascending: false })
          .limit(20);
        if (err) throw err;

        const linhas = (data as SessaoHistorico[]) || [];
        const idsUnicos = [...new Set(linhas.map((l) => l.aluno_id))];
        const nomes: Record<string, string> = {};
        if (idsUnicos.length) {
          const { data: perfis } = await supabaseClient
            .from("profiles").select("id, coaching_reference").in("id", idsUnicos);
          perfis?.forEach((p) => { nomes[p.id] = p.coaching_reference; });
        }
        setHistorico(linhas.map((l) => ({ ...l, alunoNome: nomes[l.aluno_id] || "Aluno" })));
      } catch {
        setHistorico([]);
      } finally {
        setHistoricoLoading(false);
      }
    })();
  }, [selecionado]);

  const metricasAtivas = useMemo(
    () => getMetricasPorTipo(selecionado?.tipo_exercicio),
    [selecionado?.tipo_exercicio],
  );

  const statsPorMetrica = useMemo(() => {
    const mapa: Record<string, { label: string; v: number }[]> = {};
    for (const metrica of metricasAtivas) {
      mapa[metrica.key] = statsSessoes.map((s) => {
        const valores = calcularStatsSessao(s.dados_sessao);
        const bruto = valores[metrica.key];
        return {
          label: toBrazilDateString(s.data_conclusao).slice(5).split("-").reverse().join("/"),
          v: Math.round(bruto * 10) / 10,
        };
      });
    }
    return mapa;
  }, [statsSessoes, metricasAtivas]);

  const abrirModalNovo = () => {
    setModoEdicao(false);
    setExercicioEditando(null);
    setFormData({
      nome: "", grupo_muscular: "", video_url: "", gif_url: "", gif_url_feminino: "",
      imagem_url: "", imagem_url_feminino: "",
      descricao: "", equipamento: "", musculos_secundarios: "", tipo_exercicio: "",
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
      gif_url: exercicio.gif_url || "",
      gif_url_feminino: exercicio.gif_url_feminino || "",
      imagem_url: exercicio.imagem_url || "",
      imagem_url_feminino: exercicio.imagem_url_feminino || "",
      descricao: exercicio.descricao || "",
      equipamento: exercicio.equipamento || "",
      musculos_secundarios: exercicio.musculos_secundarios || "",
      tipo_exercicio: exercicio.tipo_exercicio || "",
    });
    setErroValidacao(null);
    setModalAberto(true);
  };

  /** Sobe pro R2 (via rota de servidor) — gera a miniatura estática (1º frame) automaticamente. */
  const uploadGif = async (file: File, genero: "padrao" | "feminino") => {
    if (!['image/gif', 'image/webp'].includes(file.type)) {
      alert("Apenas arquivos GIF ou WebP animado são permitidos.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("O arquivo não pode exceder 2MB.");
      return;
    }

    try {
      setUploadingGif(genero);
      const { data: { session } } = await supabaseClient.auth.getSession();
      const accessToken = session?.access_token || "";

      const fd = new FormData();
      fd.append("file", file);
      fd.append("genero", genero);

      const res = await fetch("/api/admin/upload-exercicio-media", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha no upload");

      if (genero === "feminino") {
        setFormData(prev => ({ ...prev, gif_url_feminino: json.gifKey, imagem_url_feminino: json.posterKey || "" }));
      } else {
        setFormData(prev => ({ ...prev, gif_url: json.gifKey, imagem_url: json.posterKey || "" }));
      }
    } catch (err) {
      console.error("Erro no upload do GIF:", err);
      alert("Erro ao enviar o GIF. Tente novamente.");
    } finally {
      setUploadingGif(null);
    }
  };

  const handleGifUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadGif(file, "padrao");
  };

  const handleGifUploadFeminino = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadGif(file, "feminino");
  };

  const removerGif = () => {
    setFormData(prev => ({ ...prev, gif_url: "", imagem_url: "" }));
    if (inputGifRef.current) inputGifRef.current.value = "";
  };

  const removerGifFeminino = () => {
    setFormData(prev => ({ ...prev, gif_url_feminino: "", imagem_url_feminino: "" }));
    if (inputGifFemininoRef.current) inputGifFemininoRef.current.value = "";
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
        gif_url_feminino: formData.gif_url_feminino.trim() || null,
        imagem_url: formData.imagem_url.trim() || null,
        imagem_url_feminino: formData.imagem_url_feminino.trim() || null,
        descricao: formData.descricao.trim() || null,
      };

      if (modoEdicao && exercicioEditando) {
        const { error: err } = await supabaseClient.from("exercicios_biblioteca").update(dados).eq("id", exercicioEditando.id);
        if (err) throw err;
        setExercicios((prev) => prev.map((ex) => ex.id === exercicioEditando.id ? { ...ex, ...dados, id: ex.id } : ex) as Exercicio[]);
        setSelecionado((prev) => prev && prev.id === exercicioEditando.id ? { ...prev, ...dados } : prev);
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
      setSelecionado((prev) => prev?.id === id ? null : prev);
    } catch (err) {
      setError("Erro ao deletar exercício");
    } finally {
      setDeleting(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Carregando biblioteca..." />
      </div>
    );
  }

  const equipamentoOptions = EQUIPAMENTOS.map((e) => ({ value: e, label: e }));
  const grupoOptions = GRUPOS_MUSCULARES.map((g) => ({ value: g, label: g }));
  const alunoOptions = alunos.map((a) => ({ value: a.id, label: a.coaching_reference }));
  const periodoOptions = PERIODOS.map((p) => ({ value: p.value, label: p.label }));

  const detalheExercicio = selecionado && (
    <div className="flex flex-col gap-4">
      {/* Card 1 — identificação + GIF */}
      <div className="bg-surface-1 border-0 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-text-primary truncate">{selecionado.nome}</h2>
          </div>
          {isSuperAdmin && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => abrirModalEdicao(selecionado)}
                className="w-8 h-8 flex items-center justify-center bg-surface-2 hover:bg-surface-3 border-0 rounded-md text-text-secondary hover:text-brand transition-colors"
                title="Editar exercício"
              >
                <PencilSimple className="w-4 h-4" />
              </button>
              <button
                onClick={() => deletarExercicio(selecionado.id)}
                disabled={deleting === selecionado.id}
                className="w-8 h-8 flex items-center justify-center bg-surface-2 hover:bg-surface-3 border-0 rounded-md text-text-secondary hover:text-danger transition-colors disabled:opacity-50"
                title="Excluir exercício"
              >
                {deleting === selecionado.id
                  ? <CircleNotch className="w-4 h-4 animate-spin" />
                  : <Trash className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-start gap-5 flex-wrap">
          <div className="flex flex-col gap-2.5 text-sm min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-text-tertiary">Equipamento:</span>
              <span className="text-text-primary font-medium">{selecionado.equipamento || "—"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-text-tertiary">Músculo primário:</span>
              <span className="text-text-primary font-medium">{selecionado.grupo_muscular}</span>
            </div>
          </div>

          <div className="w-full sm:w-70 sm:ml-auto aspect-square rounded-xl bg-surface-3 flex items-center justify-center overflow-hidden shrink-0">
            {selecionado.gif_url ? (
              <img
                src={getPublicR2Url(selecionado.gif_url) ?? undefined}
                alt={`Demonstração de ${selecionado.nome}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <Barbell size={32} className="text-text-disabled" />
            )}
          </div>
        </div>
      </div>

      {/* Card 2 — abas */}
      <div className="bg-surface-1 border-0 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center border-b border-border-divider px-5">
          {([
            { key: "stats", label: "Estatísticas" },
            { key: "historico", label: "Histórico" },
            { key: "execucao", label: "Execução" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setAba(t.key)}
              className={cn(
                "px-3 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors",
                aba === t.key
                  ? "text-brand border-brand"
                  : "text-text-tertiary border-transparent hover:text-text-secondary"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {aba === "stats" && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  value={statsPeriodo}
                  onChange={setStatsPeriodo}
                  options={periodoOptions}
                  size="sm"
                />
                <Select
                  value={statsAlunoId}
                  onChange={setStatsAlunoId}
                  options={alunoOptions}
                  placeholder="Selecione um aluno"
                  emptyLabel="Nenhum aluno vinculado"
                  size="sm"
                />
              </div>

              {!statsAlunoId ? (
                <div className="py-10 flex flex-col items-center gap-2 text-center">
                  <ChartBar size={26} className="text-text-tertiary" />
                  <p className="text-xs text-text-tertiary">Selecione um aluno para ver as estatísticas dele nesse exercício.</p>
                </div>
              ) : (
                <>
                  {metricasAtivas.map((metrica) => (
                    <StatChart
                      key={metrica.key}
                      titulo={metrica.titulo}
                      dados={statsPorMetrica[metrica.key] || []}
                      dataKey="v"
                      formatarValor={metrica.formatar}
                      loading={statsLoading}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {aba === "historico" && (
            <div className="flex flex-col gap-5">
              {historicoLoading ? (
                <p className="text-xs text-text-tertiary text-center py-8">Carregando...</p>
              ) : historico.length === 0 ? (
                <p className="text-xs text-text-tertiary text-center py-8">
                  Nenhum aluno registrou esse exercício ainda.
                </p>
              ) : (
                historico.map((sessao) => {
                  const series = sessao.dados_sessao?.series || [];
                  return (
                    <div key={sessao.id}>
                      <p className="text-sm font-bold text-text-primary">
                        {sessao.alunoNome}
                        <span className="text-text-tertiary font-normal"> · {sessao.dados_sessao?.nome_rotina || "Treino"}</span>
                      </p>
                      <p className="text-[11px] text-text-tertiary mb-2">
                        {new Date(sessao.data_conclusao).toLocaleString("pt-BR", {
                          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                      <div className="flex flex-col gap-1">
                        <div className="grid grid-cols-[40px_1fr] text-[10px] font-semibold uppercase tracking-wide text-text-tertiary px-1">
                          <span>Set</span>
                          <span>Kg x Reps</span>
                        </div>
                        {series.map((s, i) => (
                          <div
                            key={i}
                            className={cn(
                              "grid grid-cols-[40px_1fr] items-center rounded-lg px-1 py-1.5 text-sm",
                              i % 2 === 1 && "bg-surface-3"
                            )}
                          >
                            <span className="text-text-tertiary tabular-nums">{s.ordem ?? i + 1}</span>
                            <span className="text-text-primary font-medium tabular-nums">
                              {s.peso_atual ? `${s.peso_atual} kg` : "—"} x {s.reps_executadas ?? s.reps ?? "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {aba === "execucao" && (
            <div className="py-10 text-center">
              <p className="text-xs text-text-tertiary">
                Ainda não temos o passo a passo de execução desse exercício cadastrado.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const listaExercicios = (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-text-primary">Library</h2>
        {isSuperAdmin && (
          <button
            onClick={abrirModalNovo}
            className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            <Plus className="w-3.5 h-3.5" weight="bold" />
            Adicionar exercício
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5 mb-4">
        <Select
          value={equipamentoSelecionado}
          onChange={(val) => setEquipamentoSelecionado((prev) => (val === prev ? "" : val))}
          options={equipamentoOptions}
          placeholder="Todos os equipamentos"
          size="sm"
        />
        <Select
          value={grupoSelecionado}
          onChange={(val) => setGrupoSelecionado((prev) => (val === prev ? "" : val))}
          options={grupoOptions}
          placeholder="Todos os músculos"
          size="sm"
        />
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar exercício..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-control filter-control-search w-full h-9 pr-4 rounded-lg focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="border-t border-border-divider -mx-1 mb-2" />

      {error && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-danger-subtle border border-danger-border text-danger text-xs font-semibold">
          <WarningCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1 overflow-y-auto flex-1 -mx-1 px-1">
        {filtrados.length === 0 ? (
          <p className="text-xs text-text-tertiary text-center py-8">
            Nenhum exercício encontrado.
          </p>
        ) : (
          filtrados.map((ex) => (
            <button
              key={ex.id}
              onClick={() => selecionarExercicio(ex)}
              className={cn(
                "flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors",
                selecionado?.id === ex.id ? "bg-brand/10" : "hover:bg-surface-2"
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center text-text-tertiary shrink-0 overflow-hidden">
                {ex.imagem_url || ex.gif_url ? (
                  <img
                    src={getPublicR2Url(ex.imagem_url || ex.gif_url) ?? undefined}
                    alt=""
                    aria-hidden
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Barbell className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[13px] font-semibold truncate", selecionado?.id === ex.id ? "text-brand" : "text-text-primary")}>
                  {ex.nome}
                </p>
                <p className="text-[11px] text-text-tertiary truncate flex items-center gap-1.5">
                  {ex.grupo_muscular}
                  {ex.origem === "custom" && (
                    <span className="text-[9px] font-bold uppercase tracking-wide bg-surface-3 text-text-secondary px-1.5 py-0.5 rounded">
                      Custom
                    </span>
                  )}
                </p>
              </div>
              {ex.video_url && <Video className="w-3.5 h-3.5 text-brand shrink-0" weight="fill" />}
            </button>
          ))
        )}
      </div>
    </>
  );

  return (
    <div className={cn(figtree.className, "min-h-screen bg-surface-0")}>
      {isMobile ? (
        <div className="p-4 pb-24 flex flex-col gap-4">
          {selecionado ? (
            <>
              <button
                onClick={() => setSelecionado(null)}
                className="text-xs font-semibold text-brand self-start"
              >
                ← Voltar pra lista
              </button>
              {detalheExercicio}
            </>
          ) : (
            <div className="flex flex-col" style={{ minHeight: "calc(100vh - 32px)" }}>
              {listaExercicios}
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-screen overflow-hidden">
          {/* Painel esquerdo — detalhe do exercício */}
          <div className="flex-1 min-w-0 overflow-y-auto p-8">
            {selecionado ? (
              detalheExercicio
            ) : (
              <div className="bg-surface-1 border-0 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-center max-w-xl mx-auto mt-12">
                <Barbell size={40} className="text-text-disabled" />
                <h3 className="text-sm font-bold text-text-primary">Selecione um exercício</h3>
                <p className="text-xs text-text-tertiary">Clique em um exercício na Library ao lado pra ver as estatísticas.</p>
              </div>
            )}
          </div>

          {/* Painel direito — Library */}
          <div className="w-[380px] shrink-0 border-l border-border-divider bg-surface-0 flex flex-col p-5 overflow-hidden">
            {listaExercicios}
          </div>
        </div>
      )}

      {/* Modal criar/editar */}
      {modalAberto && (
        <div className={cn(figtree.className, "fixed inset-0 z-50 flex items-center justify-center p-4")}>
          <div className="absolute inset-0 bg-surface-0/90 backdrop-blur-sm" onClick={fecharModal} />

          <div className="relative bg-surface-1 w-full max-w-lg rounded-2xl border-0 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
              <h2 className="text-lg font-bold text-text-primary">{modoEdicao ? "Editar" : "Novo"} exercício</h2>
              <button
                onClick={fecharModal}
                className="w-8 h-8 rounded-xl bg-surface-3 border-0 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
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

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-brand">Nome do exercício *</label>
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
                <label className="text-xs font-medium text-brand">GIF de demonstração — padrão (opcional)</label>

                {uploadingGif === "padrao" ? (
                  <div className="border border-dashed border-border-default rounded-xl p-6 flex flex-col items-center justify-center gap-2 bg-surface-3">
                    <CircleNotch className="w-5 h-5 animate-spin text-brand" />
                    <p className="text-xs text-text-secondary">Enviando arquivo...</p>
                  </div>
                ) : formData.gif_url ? (
                  <div className="relative rounded-xl overflow-hidden border-0 aspect-video bg-surface-3 flex items-center justify-center">
                    <img src={getPublicR2Url(formData.gif_url) ?? undefined} alt="Demonstração" className="max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={removerGif}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-surface-0/80 border-0 flex items-center justify-center hover:bg-surface-1 transition-colors"
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
                <label className="text-xs font-medium text-brand">GIF de demonstração — feminino (opcional)</label>

                {uploadingGif === "feminino" ? (
                  <div className="border border-dashed border-border-default rounded-xl p-6 flex flex-col items-center justify-center gap-2 bg-surface-3">
                    <CircleNotch className="w-5 h-5 animate-spin text-brand" />
                    <p className="text-xs text-text-secondary">Enviando arquivo...</p>
                  </div>
                ) : formData.gif_url_feminino ? (
                  <div className="relative rounded-xl overflow-hidden border-0 aspect-video bg-surface-3 flex items-center justify-center">
                    <img src={getPublicR2Url(formData.gif_url_feminino) ?? undefined} alt="Demonstração feminino" className="max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={removerGifFeminino}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-surface-0/80 border-0 flex items-center justify-center hover:bg-surface-1 transition-colors"
                      title="Remover GIF feminino"
                    >
                      <X className="w-3.5 h-3.5 text-text-primary" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => inputGifFemininoRef.current?.click()}
                    className="border border-dashed border-border-default rounded-xl p-6 flex flex-col items-center gap-2 bg-surface-3 cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-all"
                  >
                    <UploadSimple className="w-5 h-5 text-text-tertiary" />
                    <p className="text-xs text-text-secondary text-center">
                      Clique para enviar GIF ou WebP animado (versão feminina)<br/>
                      <span className="text-2xs text-text-tertiary">Máximo 2MB · 480×480px mínimo</span>
                    </p>
                  </div>
                )}

                <input
                  ref={inputGifFemininoRef}
                  type="file"
                  accept="image/gif,image/webp"
                  className="hidden"
                  onChange={handleGifUploadFeminino}
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
