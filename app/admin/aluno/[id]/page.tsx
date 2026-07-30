"use client";

import { use, useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import { getBootstrapProfile } from "@/lib/auth/bootstrapProfile";
import { extractStoragePath, getSignedStorageUrl, getPublicStorageUrl } from "@/lib/storageUrls";
import UploadNutritionPlan from "@/app/components/UploadNutritionPlan";
import {
  ArrowLeft,
  User,
  Calendar,
  CreditCard,
  FileText,
  UploadSimple,
  Image as ImageIcon,
  ChartLineUp,
  Trash,
  Gear,
  CurrencyDollar,
  Clock,
  WarningCircle,
  Barbell,
  PencilSimple,
  AppleLogo,
  Eye,
  Ruler,
  Copy,
  X,
  Plus,
  Coins,
  CheckCircle,
  Handshake,
  ArrowRight,
  FilePdf,
  HeartStraight,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import {
  ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { MuscleBodyFigure } from '@/app/components/MuscleBodyFigure';
import { CoachCardioTab } from '@/app/components/admin/cardio/CoachCardioTab';
import { MeasurementsView } from '@/app/components/measurements/MeasurementsView';
import { MeasurementLineChart } from '@/app/components/measurements/MeasurementLineChart';
import type { MedicaoRecord } from '@/lib/measurements/types';
import {
  buildDailyAdherenceSeries,
  getStatusAdherenceWeight,
} from '@/lib/nutrition/adherence';
import { profileSexoToBodyGender, type BodyGender } from '@/lib/utils/bodyGender';
import { buildIntensityHighlightData } from '@/lib/utils/muscleBody';
import { resolveMuscleGroup } from '@/lib/constants/muscle-groups';
import {
  ChartLine, ChartPieSlice, PersonSimpleRun, CalendarBlank, Fire, CaretRight, Question
} from "@phosphor-icons/react";
import { FichasKanban } from "@/app/components/admin/alunos/FichasKanban";
import { KanbanWorkoutBuilderSheet } from "@/app/components/admin/alunos/KanbanWorkoutBuilderSheet";
import {
  ExerciseLibraryModal,
  type LibraryExercise,
} from "@/app/components/workout-builder/ExerciseLibraryModal";
import {
  alunoTreinosReturnUrl,
  withReturnUrl,
} from "@/lib/utils/adminNav";
import { parseFichaItems, serializeFichaItems } from "@/lib/utils/biset";
import type { ExercicioFicha, SerieDefinicao } from "@/app/components/workout-builder/types";
import {
  fetchCoachCustomPlans,
  mergedPlans,
  planDisplayName,
  type CoachPlan,
} from "@/lib/coachPlans";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  full_name?: string | null;
  coaching_reference?: string | null;
  date_of_birth?: string | null;
  email?: string | null;
  ultimo_checkin?: string | null;
  status_pagamento?: string | null;
  tipo_plano?: string | null;
  data_inicio?: string | null;
  data_expiracao?: string | null;
  valor_plano?: number | null;
  orientacoes?: string | null;
  coach_id?: string | null;
  avatar_url?: string | null;
  arquivado?: boolean | null;
  sexo?: 'masculino' | 'feminino' | 'outro' | null;
}

interface PlanoFinanceiroHistorico {
  id: string;
  status_pagamento: 'pago' | 'pendente' | 'atrasado';
  tipo_plano: string; // slug — planos padrão ou personalizados do coach
  valor_plano: number;
  data_inicio: string;
  data_expiracao: string;
  origem?: string | null;
  observacao?: string | null;
  registrado_em: string;
}

interface Foto {
  id: string;
  posicao: string;
  url_foto: string;
  data_upload: string;
}

interface FichaTreino {
  id: string;
  nome_rotina: string;
  configuracao: any;
  ativo: boolean;
  criado_em: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "from-amber-500/50 to-amber-700/30",
  "from-orange-500/50 to-orange-700/30",
  "from-yellow-500/50 to-yellow-700/30",
  "from-brand/50 to-brand/20",
];

function avatarGrad(name: string): string {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

const fieldCls = cn(
  "w-full px-4 py-3 rounded-xl text-sm text-text-primary",
  "bg-surface-3 border-0",
  "focus:outline-none focus:border-brand transition-colors",
  "appearance-none"
);

// ─── Muscle mapping for statistics ──────────────────────────────────────────
const MUSCLE_MAP: Record<string, string[]> = {
  'Peito Superior': ['chest-upper'],
  'Peito Médio': ['chest-middle'],
  'Peito Inferior': ['chest-lower'],
  'Dorsais': ['lats-left', 'lats-right'],
  'Trapézio': ['trapezius'],
  'Lombar': ['lower-back'],
  'Ombro Anterior': ['shoulders-front'],
  'Ombro Lateral': ['shoulders-middle'],
  'Ombro Posterior': ['shoulders-back'],
  'Bíceps': ['biceps-left', 'biceps-right'],
  'Tríceps': ['triceps-left', 'triceps-right'],
  'Antebraço': ['forearms-left', 'forearms-right'],
  'Quadríceps': ['quads-left', 'quads-right'],
  'Posterior (Isquiotibiais)': ['hamstrings-left', 'hamstrings-right'],
  'Panturrilha': ['calves-left', 'calves-right'],
  'Glúteos': ['glutes'],
  'Abdômen': ['abs'],
  'Oblíquos': ['obliques-left', 'obliques-right'],
};

// Simplified muscle groups for radar
const RADAR_GROUPS: Record<string, string[]> = {
  'Costas': ['Dorsais', 'Trapézio', 'Lombar'],
  'Peito': ['Peito Superior', 'Peito Médio', 'Peito Inferior'],
  'Core': ['Abdômen', 'Oblíquos'],
  'Braços': ['Bíceps', 'Tríceps', 'Antebraço'],
  'Ombros': ['Ombro Anterior', 'Ombro Lateral', 'Ombro Posterior'],
  'Pernas': ['Quadríceps', 'Posterior (Isquiotibiais)', 'Panturrilha', 'Glúteos'],
};

function MuscleBodyChart({
  muscleIntensity,
  side,
  gender,
}: {
  muscleIntensity: Record<string, number>;
  side: 'front' | 'back';
  gender: BodyGender;
}) {
  const data = useMemo(
    () => buildIntensityHighlightData(muscleIntensity),
    [muscleIntensity],
  );

  return (
    <MuscleBodyFigure
      data={data}
      side={side}
      gender={gender}
      scale={0.85}
      defaultFill="#27272a"
      defaultStroke="#3f3f46"
      defaultStrokeWidth={1}
      style={{ minHeight: 260, maxHeight: 300 }}
    />
  );
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AdminAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [medidas, setMedidas] = useState<any[]>([]);
  const [treinosPdf, setTreinosPdf] = useState<any[]>([]);
  const [fichas, setFichas] = useState<FichaTreino[]>([]);
  const [clonandoFicha, setClonandoFicha] = useState<FichaTreino | null>(null);
  const [alunosCoach, setAlunosCoach] = useState<{ id: string; nome: string }[]>([]);
  const [alunoAlvoId, setAlunoAlvoId] = useState<string>("");
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editStatus, setEditStatus] = useState<string>("pago");
  const [editPlano, setEditPlano] = useState<string>("mensal");
  const [planosPersonalizados, setPlanosPersonalizados] = useState<CoachPlan[]>([]);
  const [editValorPlano, setEditValorPlano] = useState<string>("");
  const [editDataInicio, setEditDataInicio] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [planosAlimentares, setPlanosAlimentares] = useState<any[]>([]);
  const [uploadNutritionOpen, setUploadNutritionOpen] = useState(false);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [ultimaAtividade, setUltimaAtividade] = useState<string | null>(null);
  const [pontosTotais, setPontosTotais] = useState<number>(0);
  const [diasParaRenovacao, setDiasParaRenovacao] = useState<number | null>(null);
  const [mostrarAvisoRenovacao, setMostrarAvisoRenovacao] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [historicoTreinos, setHistoricoTreinos] = useState<any[]>([]);
  const [historicoFinanceiro, setHistoricoFinanceiro] = useState<PlanoFinanceiroHistorico[]>([]);
  const [exerciciosBiblioteca, setExerciciosBiblioteca] = useState<Record<string, string>>({});
  const [notasOriginais, setNotasOriginais] = useState<string>("");
  const [salvandoNotas, setSalvandoNotas] = useState(false);

  // Nutrition States
  const [digitalPlan, setDigitalPlan] = useState<any | null>(null);
  const [digitalCheckins, setDigitalCheckins] = useState<any[]>([]);
  const [latestDigitalPlan, setLatestDigitalPlan] = useState<any | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'visao-geral' | 'treinos' | 'cardio' | 'nutricao' | 'evolucao' | 'financeiro' | 'fotos' | 'observacoes'>('visao-geral');
  const [selectedRoutineForPreview, setSelectedRoutineForPreview] = useState<any | null>(null);
  const [treinoPdfOpen, setTreinoPdfOpen] = useState(false);
  const [nutritionPdfOpen, setNutritionPdfOpen] = useState(false);
  const [kanbanBuilderOpen, setKanbanBuilderOpen] = useState(false);
  const [addExerciseFichaId, setAddExerciseFichaId] = useState<string | null>(null);
  const [exerciseCatalog, setExerciseCatalog] = useState<LibraryExercise[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => { load(); }, [id]);

  // Abre a aba indicada pela URL (?tab=), ex.: vindo da "Atividade recente" do dashboard
  useEffect(() => {
    if (typeof window === "undefined") return;
    const tab = new URLSearchParams(window.location.search).get("tab");
    const abasPermitidas = ["visao-geral", "treinos", "cardio", "nutricao", "evolucao", "financeiro", "fotos", "observacoes"];
    if (tab && abasPermitidas.includes(tab)) {
      setActiveTab(tab as typeof activeTab);
    }
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!window.confirm("Tem certeza que deseja desativar este aluno? O acesso será bloqueado, mas os dados e histórico serão mantidos.")) return;
    setDeleting(true);
    setError(null);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/admin/delete-student?id=${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Falha ao desativar aluno");
      }
      router.push("/admin/alunos");
    } catch (err: any) {
      setError(err?.message || String(err));
      setDeleting(false);
    }
  };

  const handleReactivate = async () => {
    if (!window.confirm("Reativar este aluno? O acesso será restaurado.")) return;
    setDeleting(true);
    setError(null);
    try {
      const { error } = await supabaseClient
        .from("profiles")
        .update({ arquivado: false })
        .eq("id", id);
      if (error) throw error;
      await load();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setDeleting(false);
    }
  };

  const load = async () => {
    setError(null);
    try {
      // Role via bootstrap (cacheado — sem getUser de rede nem query extra em profiles)
      const boot = await getBootstrapProfile();
      if (boot) {
        setIsSuperAdmin(boot.role === "super_admin");

        if (boot.role === "coach" || boot.role === "super_admin") {
          const { data: ownership } = await supabaseClient
            .from("coach_alunos")
            .select("aluno_id")
            .eq("coach_id", boot.userId)
            .eq("aluno_id", id)
            .maybeSingle();
          if (!ownership) {
            setError("Acesso negado: este aluno não pertence ao seu perfil.");
            return;
          }

          // Planos de venda personalizados do coach (para o select de modalidade)
          fetchCoachCustomPlans(boot.userId)
            .then(setPlanosPersonalizados)
            .catch(() => setPlanosPersonalizados([]));
        }
      }

      // Tudo abaixo depende só do id do aluno — um único batch paralelo
      // (assinatura de storage encadeada dentro de cada promise p/ sobrepor com as queries)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [
        { data: prof },
        fotosAssinadas,
        treinosAssinados,
        { data: fichasData },
        { data: medidasData },
        planosAssinados,
        { data: financeiroData },
        { data: ultimaFicha },
        { data: ultimoCheckin },
        { data: pontuacaoData },
        { data: bibData },
        { data: historicoData },
        { data: activeDigPlan },
        { data: latestDigPlan },
        { data: checkinsData },
      ] = await Promise.all([
        supabaseClient.from("profiles").select("*").eq("id", id).single(),
        supabaseClient
          .from("fotos_evolucao").select("id, posicao, url_foto, data_upload")
          .eq("aluno_id", id).order("data_upload", { ascending: false }).limit(12)
          .then(async ({ data: fotosData }) =>
            Promise.all((fotosData || []).map(async (f: any) => {
              const { data: signedData } = await supabaseClient.storage.from("evolucao-fotos").createSignedUrl(f.url_foto, 3600);
              return { ...f, url_foto: signedData?.signedUrl || f.url_foto };
            }))
          ),
        supabaseClient
          .from("treinos_alunos").select("*").eq("aluno_id", id).order("data_upload", { ascending: false })
          .then(async ({ data: treinosData }) =>
            Promise.all((treinosData || []).map(async (t: any) => {
              const signed = await getSignedStorageUrl("treinos-pdf", t.url_pdf, 3600);
              return { ...t, original_url_pdf: t.url_pdf, url_pdf: signed || t.url_pdf };
            }))
          ),
        supabaseClient
          .from("fichas_treino").select("*").eq("aluno_id", id).eq("ativo", true).order("criado_em", { ascending: false }),
        supabaseClient
          .from("medidas_aluno")
          .select("id, peso, peitoral, cintura, braco_esquerdo, braco_direito, coxa_esquerda, coxa_direita, panturrilha_direita, data_medicao, gordura_corporal")
          .eq("aluno_id", id).order("data_medicao", { ascending: false }),
        supabaseClient
          .from("plano_alimentar_pdf").select("*").eq("aluno_id", id).order("criado_em", { ascending: false })
          .then(async ({ data: planosData }) =>
            Promise.all((planosData || []).map(async (p: any) => {
              const pdfPath = p.url_pdf || p.pdf_url;
              if (!pdfPath) return p;
              const signed = await getSignedStorageUrl("plano_alimentar", pdfPath, 3600);
              return { ...p, pdf_url: signed || pdfPath, original_path: pdfPath };
            }))
          ),
        supabaseClient
          .from("aluno_planos_historico")
          .select("id, status_pagamento, tipo_plano, valor_plano, data_inicio, data_expiracao, origem, observacao, registrado_em")
          .eq("aluno_id", id)
          .order("registrado_em", { ascending: false }),
        supabaseClient
          .from("historico_treinos").select("data_conclusao").eq("aluno_id", id)
          .order("data_conclusao", { ascending: false }).limit(1).maybeSingle(),
        supabaseClient
          .from("treinos_manuais").select("data_treino").eq("aluno_id", id).eq("concluido", true)
          .order("data_treino", { ascending: false }).limit(1).maybeSingle(),
        supabaseClient
          .from("pontuacao_alunos").select("total_pontos").eq("aluno_id", id).maybeSingle(),
        supabaseClient
          .from('exercicios_biblioteca')
          .select('id, grupo_muscular'),
        supabaseClient
          .from("historico_treinos")
          .select("id, data_conclusao, dados_sessao, exercicio_id")
          .eq("aluno_id", id)
          .order("data_conclusao", { ascending: false })
          .limit(150),
        supabaseClient
          .from('nutrition_plans')
          .select(`
            *,
            days:nutrition_plan_days (
              id,
              meals:nutrition_meals (
                *
              )
            )
          `)
          .eq('student_id', id)
          .eq('status', 'active')
          .maybeSingle(),
        supabaseClient
          .from('nutrition_plans')
          .select('id, created_at, status')
          .eq('student_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseClient
          .from('nutrition_meal_checkins')
          .select('*')
          .eq('student_id', id)
          .gte('checkin_date', sevenDaysAgo.toISOString().slice(0, 10))
          .order('checkin_date', { ascending: false }),
      ]);

      setProfile(prof as Profile);
      if (prof) {
        setEditStatus(prof.status_pagamento || "pago");
        setEditPlano(prof.tipo_plano || "mensal");
        setEditValorPlano(prof.valor_plano != null ? String(prof.valor_plano) : "");
        setEditDataInicio(prof.data_inicio ? new Date(prof.data_inicio).toISOString().slice(0, 10) : "");
        setNotasOriginais(prof.orientacoes || "");

        // Carregar avatar se existir
        if (prof.avatar_url) {
          setAvatarUrl(getPublicStorageUrl('avatars', prof.avatar_url));
        } else {
          setAvatarUrl(null);
        }
      }

      setFotos(fotosAssinadas);
      setTreinosPdf(treinosAssinados);
      setFichas((fichasData || []) as FichaTreino[]);
      setMedidas(medidasData || []);
      setPlanosAlimentares(planosAssinados);
      setHistoricoFinanceiro((financeiroData || []) as PlanoFinanceiroHistorico[]);

      let dataUltimaAtividade: string | null = null;
      if (ultimaFicha && ultimoCheckin) {
        dataUltimaAtividade = new Date(ultimaFicha.data_conclusao) > new Date(ultimoCheckin.data_treino)
          ? ultimaFicha.data_conclusao : ultimoCheckin.data_treino;
      } else if (ultimaFicha) {
        dataUltimaAtividade = ultimaFicha.data_conclusao;
      } else if (ultimoCheckin) {
        dataUltimaAtividade = ultimoCheckin.data_treino;
      }
      setUltimaAtividade(dataUltimaAtividade);
      setPontosTotais(pontuacaoData?.total_pontos || 0);

      const bibMap: Record<string, string> = {};
      bibData?.forEach((item) => {
        if (item.grupo_muscular) {
          bibMap[item.id] = resolveMuscleGroup(item.grupo_muscular);
        }
      });
      setExerciciosBiblioteca(bibMap);
      setHistoricoTreinos(historicoData || []);
      setDigitalPlan(activeDigPlan);
      setLatestDigitalPlan(latestDigPlan);
      setDigitalCheckins(activeDigPlan ? checkinsData || [] : []);

      // Calcular dias para renovação
      if (prof?.data_expiracao) {
        const hoje = new Date();
        const dataExp = new Date(prof.data_expiracao);
        const diffTime = dataExp.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDiasParaRenovacao(diffDays);
        setMostrarAvisoRenovacao(diffDays > 0 && diffDays <= 7);
      } else {
        setDiasParaRenovacao(null);
        setMostrarAvisoRenovacao(false);
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPdfFile(f);
  };

  const handleUploadPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return setError("Selecione um arquivo PDF");
    setUploading(true);
    setError(null);
    try {
      const fileName = `${id}/${Date.now()}_${pdfFile.name}`;
      const { error: uploadError } = await supabaseClient.storage
        .from("treinos-pdf").upload(fileName, pdfFile, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabaseClient.from("treinos_alunos").insert({
        aluno_id: id, url_pdf: fileName, nome_arquivo: pdfFile.name, data_upload: new Date().toISOString(),
      });
      if (dbError) throw dbError;
      setPdfFile(null);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      await load();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTreino = async (treinoId: string, urlPdf: string) => {
    if (!window.confirm("Remover este arquivo de treino permanentemente?")) return;
    try {
      const filePath = extractStoragePath("treinos-pdf", urlPdf) || urlPdf;
      await supabaseClient.storage.from("treinos-pdf").remove([filePath]);
      const { error: dbError } = await supabaseClient.from("treinos_alunos").delete().eq("id", treinoId);
      if (dbError) throw dbError;
      await load();
    } catch (err: any) {
      setError("Erro ao deletar treino: " + err.message);
    }
  };

  const handleDeleteFicha = async (fichaId: string) => {
    if (!window.confirm("Desativar esta ficha digital? O aluno perderá acesso, mas o histórico será mantido.")) return;
    try {
      const { error } = await supabaseClient.from("fichas_treino").update({ ativo: false }).eq("id", fichaId);
      if (error) throw error;
      await load();
    } catch (err: any) {
      setError("Erro ao deletar ficha: " + err.message);
    }
  };

  const handleUpdateFichaExercicios = async (fichaId: string, exercicios: unknown[]) => {
    const ficha = fichas.find((f) => f.id === fichaId);
    const nextConfig = { ...(ficha?.configuracao || {}), exercicios };
    setFichas((prev) =>
      prev.map((f) =>
        f.id === fichaId ? { ...f, configuracao: nextConfig } : f,
      ),
    );
    const { error } = await supabaseClient
      .from("fichas_treino")
      .update({ configuracao: nextConfig })
      .eq("id", fichaId);
    if (error) {
      setError(error.message);
      await load();
    }
  };

  const handleReorderFichas = (orderedIds: string[]) => {
    setFichas((prev) => {
      const map = new Map(prev.map((f) => [f.id, f]));
      return orderedIds.map((id) => map.get(id)).filter(Boolean) as FichaTreino[];
    });
  };

  const ensureExerciseCatalog = async () => {
    if (exerciseCatalog.length > 0 || catalogLoading) return;
    setCatalogLoading(true);
    try {
      const { data } = await supabaseClient
        .from("exercicios_biblioteca")
        .select("id, nome, grupo_muscular, tipo_exercicio, video_url")
        .order("nome", { ascending: true });
      setExerciseCatalog((data as LibraryExercise[]) || []);
    } finally {
      setCatalogLoading(false);
    }
  };

  const openAddExercise = async (fichaId: string) => {
    await ensureExerciseCatalog();
    setAddExerciseFichaId(fichaId);
  };

  const criarSeriesPadraoLocal = (tipo: string): SerieDefinicao[] => {
    const base = {
      ordem: 1,
      tecnica: "",
      tecnica_extra: "",
      peso_sugerido: null as number | null,
    };
    switch (tipo) {
      case "Duração":
      case "Duração e Peso":
      case "Distância e Duração":
        return [1, 2, 3].map((o) => ({ ...base, ordem: o, tempo_sugerido: "01:00" }));
      case "Peso e Distância":
        return [1, 2, 3].map((o) => ({ ...base, ordem: o, distancia_sugerida: 0 }));
      default:
        return [1, 2, 3].map((o) => ({ ...base, ordem: o, reps_sugerido: "12" }));
    }
  };

  const handleAddExercisesToFicha = async (selected: LibraryExercise[]) => {
    if (!addExerciseFichaId) return;
    const ficha = fichas.find((f) => f.id === addExerciseFichaId);
    if (!ficha) return;
    const current = parseFichaItems(
      (ficha.configuracao as { exercicios?: unknown[] })?.exercicios || [],
    );
    const novos: ExercicioFicha[] = selected.map((ex) => {
      const tipoEx = ex.tipo_exercicio || "Peso & Repetições";
      return {
        instanceId: crypto.randomUUID(),
        id: ex.id,
        nome: ex.nome,
        tipo_exercicio: tipoEx,
        descanso: "01:00",
        video_url: ex.video_url || "",
        observacoes: "",
        series: criarSeriesPadraoLocal(tipoEx),
      };
    });
    await handleUpdateFichaExercicios(
      addExerciseFichaId,
      serializeFichaItems([...current, ...novos]),
    );
    setAddExerciseFichaId(null);
  };

  const abrirClonarFicha = async (ficha: FichaTreino) => {
    setClonandoFicha(ficha);
    setAlunoAlvoId("");
    if (alunosCoach.length === 0) {
      try {
        const coachId = (await getBootstrapProfile())?.userId;
        if (!coachId) { setError("Sessão inválida"); return; }

        // Buscar alunos do coach
        const { data: alunosRel, error: relError } = await supabaseClient
          .from("coach_alunos").select("aluno_id").eq("coach_id", coachId);

        if (relError) throw relError;
        if (!alunosRel || alunosRel.length === 0) { setAlunosCoach([]); return; }

        // Buscar perfis dos alunos
        const alunoIds = alunosRel.map(r => r.aluno_id);
        const { data: profiles, error: profilesError } = await supabaseClient
          .from("profiles").select("id, coaching_reference, email").in("id", alunoIds);

        if (profilesError) throw profilesError;

        const lista = (profiles || [])
          .map((p: any) => ({ id: p.id, nome: p.coaching_reference || p.email || p.id }))
          .filter(a => a.id !== id);

        setAlunosCoach(lista);
      } catch (err: any) {
        setError("Erro ao carregar lista de alunos");
      }
    }
  };

  const handleClonarFicha = async () => {
    if (!clonandoFicha || !alunoAlvoId) return;
    setCloning(true);
    try {
      const coachId = (await getBootstrapProfile())?.userId;
      if (!coachId) throw new Error("Sessão inválida");
      const { error } = await supabaseClient.from("fichas_treino").insert({
        coach_id: coachId, aluno_id: alunoAlvoId, nome_rotina: clonandoFicha.nome_rotina, configuracao: clonandoFicha.configuracao, ativo: true,
      });
      if (error) throw error;
      setClonandoFicha(null);
      setAlunoAlvoId("");
      alert("Ficha clonada com sucesso!");
    } catch (err: any) {
      setError("Erro ao clonar ficha: " + err.message);
    } finally {
      setCloning(false);
    }
  };



  const handleDeleteNutritionPlan = async (planId: string, pdfUrl: string) => {
    if (!window.confirm("Remover este plano alimentar permanentemente?")) return;
    try {
      if (!pdfUrl) throw new Error("URL do PDF não encontrada");
      const pathParts = pdfUrl.split("/plano_alimentar/");
      const filePath = pathParts.length > 1 ? pathParts[1] : pdfUrl;
      await supabaseClient.storage.from("plano_alimentar").remove([filePath]);
      const { error: dbError } = await supabaseClient.from("plano_alimentar_pdf").delete().eq("id", planId);
      if (dbError) throw dbError;
      await load();
    } catch (err: any) {
      setError("Erro ao deletar plano: " + err.message);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDataInicio) return setError("Selecione a data de início do plano");
    setSavingProfile(true);
    setError(null);
    try {
      const dataInicio = new Date(editDataInicio);
      const dataExpiracao = new Date(editDataInicio);
      const planoSel = mergedPlans(planosPersonalizados).find((p) => p.slug === editPlano);
      dataExpiracao.setMonth(dataExpiracao.getMonth() + (planoSel?.duracao_meses ?? 1));
      const valorPlanoNumber = editValorPlano.trim().length ? Number(editValorPlano.replace(",", ".")) : null;
      const { error } = await supabaseClient.from("profiles").update({
        status_pagamento: editStatus,
        tipo_plano: editPlano,
        valor_plano: Number.isFinite(valorPlanoNumber) ? valorPlanoNumber : null,
        data_inicio: dataInicio.toISOString(),
        data_expiracao: dataExpiracao.toISOString(),
      }).eq("id", id);
      if (error) throw error;

      const currentInicio = profile?.data_inicio ? new Date(profile.data_inicio).toISOString().slice(0, 10) : "";
      const shouldRegisterHistory =
        editStatus === "pago" &&
        Number.isFinite(valorPlanoNumber) &&
        valorPlanoNumber !== null &&
        (
          profile?.status_pagamento !== "pago" ||
          profile?.tipo_plano !== editPlano ||
          Number(profile?.valor_plano ?? -1) !== valorPlanoNumber ||
          currentInicio !== editDataInicio
        );

      if (shouldRegisterHistory) {
        const coachId = (await getBootstrapProfile())?.userId;
        if (!coachId) throw new Error("Sessão inválida para registrar histórico financeiro");

        const { error: historyError } = await supabaseClient
          .from("aluno_planos_historico")
          .insert({
            aluno_id: id,
            coach_id: coachId,
            status_pagamento: editStatus,
            tipo_plano: editPlano,
            valor_plano: valorPlanoNumber,
            data_inicio: dataInicio.toISOString().slice(0, 10),
            data_expiracao: dataExpiracao.toISOString().slice(0, 10),
            origem: "manual_coach",
            observacao: "Registro automático pela aba Financeiro",
          });
        if (historyError) throw historyError;
      }

      await load();
      setEditingProfile(false);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const profileName = profile?.coaching_reference || profile?.full_name || "Aluno";

  // Calculations for profile overview
  const activeRoutine = fichas.find(f => f.ativo)?.nome_rotina || "Nenhuma";
  
  // Weekly adhesion: count of sessions in last 7 days
  const completedThisWeek = historicoTreinos.filter(h => {
    const diff = Date.now() - new Date(h.data_conclusao).getTime();
    return diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const expectedSessions = 3;
  const adesaoSemanal = Math.min(100, Math.round((completedThisWeek / expectedSessions) * 100));

  const today = new Date();
  const isPaid = profile?.status_pagamento === "pago";
  const expiration = profile?.data_expiracao ? new Date(profile.data_expiracao) : null;
  const isExpired = !!(expiration && expiration < today);

  const ultimoMedidaVal = medidas[0] ? `${medidas[0].peso?.toFixed(1)} kg` : "Sem dados";
  const pesoDelta =
    medidas[0]?.peso != null && medidas[1]?.peso != null
      ? Number(medidas[0].peso) - Number(medidas[1].peso)
      : null;
  const pesoDeltaLabel =
    pesoDelta == null
      ? null
      : `${pesoDelta > 0 ? "+" : ""}${pesoDelta.toFixed(1)}`;
  const diasParaVencer =
    expiration
      ? Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;
  const vencimentoVal =
    diasParaVencer != null
      ? diasParaVencer < 0
        ? "Expirado"
        : `${diasParaVencer} dias`
      : profile?.data_expiracao
        ? new Date(profile.data_expiracao).toLocaleDateString("pt-BR")
        : "A definir";
  const adesaoTone =
    adesaoSemanal >= 80 ? "good" : adesaoSemanal < 50 ? "bad" : "neutral";
  const adesaoSuffix =
    adesaoSemanal >= 80 ? "muito boa" : adesaoSemanal < 50 ? "baixa" : null;
  const vencimentoTone =
    diasParaVencer != null && diasParaVencer >= 0 && diasParaVencer <= 7
      ? "warn"
      : "neutral";
  const activeFicha = fichas.find((f) => f.ativo) || null;
  const fichaAtualizadaLabel = (() => {
    if (!activeFicha?.criado_em) return null;
    const days = Math.floor(
      (today.getTime() - new Date(activeFicha.criado_em).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (days <= 0) return "Atualizada hoje";
    if (days === 1) return "Atualizada há 1 dia";
    return `Atualizada há ${days} dias`;
  })();

  // Overview Priorities list for this student
  const studentPriorities: { id: string; desc: string; type: 'danger' | 'warning' | 'info'; action: string; tab: any }[] = [];
  // isPaid / expiration / isExpired já calculados acima

  if (!isPaid || isExpired) {
    studentPriorities.push({
      id: "finance",
      desc: isExpired ? "Acesso expirado" : "Status financeiro inadimplente",
      type: "danger",
      action: "Ajustar Plano",
      tab: "financeiro"
    });
  }
  if (fichas.length === 0) {
    studentPriorities.push({
      id: "train",
      desc: "Nenhuma ficha digital ativa",
      type: "danger",
      action: "Criar Ficha",
      tab: "treinos"
    });
  }
  const hasDigitalPlan = !!latestDigitalPlan;
  const hasPdfPlan = planosAlimentares.length > 0;

  if (!hasDigitalPlan && !hasPdfPlan) {
    studentPriorities.push({
      id: "nutrition",
      desc: "Nenhum plano alimentar prescrito",
      type: "info",
      action: "Prescrever Plano",
      tab: "nutricao"
    });
  } else {
    // Calcular a data do último plano de nutrição gerado (digital ou pdf)
    let lastPlanDate: Date | null = null;

    if (hasPdfPlan) {
      lastPlanDate = new Date(planosAlimentares[0].criado_em);
    }

    if (latestDigitalPlan) {
      const digDate = new Date(latestDigitalPlan.created_at);
      if (!lastPlanDate || digDate.getTime() > lastPlanDate.getTime()) {
        lastPlanDate = digDate;
      }
    }

    if (lastPlanDate) {
      const diffTime = today.getTime() - lastPlanDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 30) {
        studentPriorities.push({
          id: "nutrition-outdated",
          desc: `Plano alimentar desatualizado (há ${diffDays} dias)`,
          type: "warning",
          action: "Atualizar Plano",
          tab: "nutricao"
        });
      }
    }
  }
  if (fotos.length === 0) {
    studentPriorities.push({
      id: "photo",
      desc: "Nenhuma foto de evolução cadastrada",
      type: "warning",
      action: "Solicitar Fotos",
      tab: "fotos"
    });
  } else {
    const lastPhotoUpload = new Date(fotos[0].data_upload).getTime();
    const diffDays = Math.ceil((today.getTime() - lastPhotoUpload) / (1000 * 60 * 60 * 24));
    if (diffDays > 15) {
      studentPriorities.push({
        id: "photo-old",
        desc: `Fotos desatualizadas (há ${diffDays} dias)`,
        type: "warning",
        action: "Solicitar Renovação",
        tab: "fotos"
      });
    }
  }

  // ── Derivações de Estatísticas de Treino do Aluno (Visão Coach) ─────────────
  const weekMuscleIntensity = useMemo(() => {
    const now = Date.now();
    const countSets: Record<string, number> = {};
    historicoTreinos.filter(h => now - new Date(h.data_conclusao).getTime() <= 7 * 86400000).forEach(row => {
      const grupo = resolveMuscleGroup(
        exerciciosBiblioteca[row.exercicio_id] || row.dados_sessao?.grupo_muscular,
      );
      const series = (row.dados_sessao?.series || []).filter((s: any) => s.completado);
      if (series.length) countSets[grupo] = (countSets[grupo] || 0) + series.length;
    });
    const maxSets = Math.max(...Object.values(countSets), 1);
    const intensity: Record<string, number> = {};
    Object.entries(countSets).forEach(([g, c]) => { intensity[g] = Math.round((c / maxSets) * 10); });
    return intensity;
  }, [historicoTreinos, exerciciosBiblioteca]);

  const alunoBodyGender = useMemo(
    () => profileSexoToBodyGender(profile?.sexo),
    [profile?.sexo],
  );

  const radarData30 = useMemo(() => {
    const now = Date.now();
    const countSets: Record<string, number> = {};
    historicoTreinos.filter(h => now - new Date(h.data_conclusao).getTime() <= 30 * 86400000).forEach(row => {
      const grupo = resolveMuscleGroup(
        exerciciosBiblioteca[row.exercicio_id] || row.dados_sessao?.grupo_muscular,
      );
      const series = (row.dados_sessao?.series || []).filter((s: any) => s.completado);
      if (series.length) countSets[grupo] = (countSets[grupo] || 0) + series.length;
    });
    
    return Object.entries(RADAR_GROUPS).map(([group, muscles]) => ({
      subject: group,
      value: muscles.reduce((sum, m) => sum + (countSets[m] || 0), 0),
      fullMark: 100,
    }));
  }, [historicoTreinos, exerciciosBiblioteca]);

  const stats30 = useMemo(() => {
    const now = Date.now();
    const limit30 = 30 * 86400000;
    const filtered = historicoTreinos.filter(h => now - new Date(h.data_conclusao).getTime() <= limit30);
    
    const uniqueDays = new Set(filtered.map(h => h.data_conclusao?.slice(0, 10))).size;
    
    let sets = 0;
    let volume = 0;
    filtered.forEach(row => {
      const series = (row.dados_sessao?.series || []).filter((s: any) => s.completado);
      sets += series.length;
      series.forEach((s: any) => {
        volume += (Number(s.peso_atual) || 0) * (Number(s.reps) || 0);
      });
    });
    
    const minutes = sets * 4 + uniqueDays * 10;
    
    return {
      workouts: uniqueDays,
      sets,
      volume,
      minutes
    };
  }, [historicoTreinos]);

  const handleExportPDF = async () => {
    if (medidas.length === 0) return;

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const addHeader = () => {
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 30, "F");

      doc.setTextColor(250, 250, 250);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("AURONFIT", 15, 12);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("CONSULTORIA ESPORTIVA & AVALIAÇÃO FÍSICA", 15, 20);

      const todayStr = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      doc.setFontSize(8);
      doc.text(`Emitido em: ${todayStr}`, 195, 12, { align: "right" });
    };

    const addStudentInfo = () => {
      doc.setTextColor(31, 31, 35);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("DADOS DO ALUNO", 15, 42);

      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.5);
      doc.line(15, 45, 195, 45);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(113, 113, 122);
      doc.text("Nome do Aluno:", 15, 52);
      doc.text("E-mail:", 15, 58);
      doc.text("Data de Nascimento:", 15, 64);
      doc.text("Plano Ativo:", 110, 52);
      doc.text("Total Avaliações:", 110, 58);

      doc.setTextColor(31, 31, 35);
      doc.setFont("helvetica", "bold");
      doc.text(profile?.full_name || "Não informado", 45, 52);
      doc.text(profile?.email || "Não informado", 45, 58);
      
      const dob = profile?.date_of_birth
        ? new Date(profile.date_of_birth).toLocaleDateString("pt-BR")
        : "Não informada";
      doc.text(dob, 50, 64);

      doc.text(profile?.tipo_plano || "Nenhum plano", 135, 52);
      doc.text(`${medidas.length} registros`, 135, 58);
    };

    const addComparisonTable = () => {
      const first = [...medidas].reverse()[0];
      const last = medidas[0];

      if (!first || !last) return;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(31, 31, 35);
      doc.text("RESUMO DA EVOLUÇÃO DE MEDIDAS", 15, 78);

      doc.line(15, 81, 195, 81);

      const headers = [["Métrica", "Ponto de Partida", "Situação Atual", "Variação Total"]];
      
      const getDiff = (l: number | null, f: number | null, unit: string) => {
        if (l === null || f === null) return "—";
        const diff = l - f;
        const sign = diff > 0 ? "+" : "";
        return `${sign}${diff.toFixed(1)} ${unit}`;
      };

      const formatVal = (v: number | null, unit: string) => {
        return v !== null && v !== undefined ? `${v.toFixed(1)} ${unit}` : "—";
      };

      const rows = [
        ["Peso Corporal", formatVal(first.peso, "kg"), formatVal(last.peso, "kg"), getDiff(last.peso, first.peso, "kg")],
        ["Gordura Corporal", formatVal(first.gordura_corporal, "%"), formatVal(last.gordura_corporal, "%"), getDiff(last.gordura_corporal, first.gordura_corporal, "%")],
        ["Circunferência Cintura", formatVal(first.cintura, "cm"), formatVal(last.cintura, "cm"), getDiff(last.cintura, first.cintura, "cm")],
        ["Circunferência Tórax", formatVal(first.peitoral, "cm"), formatVal(last.peitoral, "cm"), getDiff(last.peitoral, first.peitoral, "cm")],
        ["Braço Esquerdo", formatVal(first.braco_esquerdo, "cm"), formatVal(last.braco_esquerdo, "cm"), getDiff(last.braco_esquerdo, first.braco_esquerdo, "cm")],
        ["Braço Direito", formatVal(first.braco_direito, "cm"), formatVal(last.braco_direito, "cm"), getDiff(last.braco_direito, first.braco_direito, "cm")],
        ["Coxa Esquerda", formatVal(first.coxa_esquerda, "cm"), formatVal(last.coxa_esquerda, "cm"), getDiff(last.coxa_esquerda, first.coxa_esquerda, "cm")],
        ["Coxa Direito", formatVal(first.coxa_direita, "cm"), formatVal(last.coxa_direita, "cm"), getDiff(last.coxa_direita, first.coxa_direita, "cm")],
      ];

      autoTable(doc, {
        startY: 85,
        head: headers,
        body: rows,
        theme: "striped",
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: "bold",
          halign: "left",
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [31, 31, 35],
        },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 40, halign: "center" },
          2: { cellWidth: 40, halign: "center" },
          3: { cellWidth: 45, halign: "center", fontStyle: "bold" },
        },
      });
    };

    const addFullHistoryTable = () => {
      doc.addPage();
      addHeader();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(31, 31, 35);
      doc.text("HISTÓRICO COMPLETO DE MEDIDAS", 15, 42);

      doc.setDrawColor(228, 228, 231);
      doc.line(15, 45, 195, 45);

      const headers = [
        ["Data", "Peso", "% Gord.", "Cintura", "Tórax", "Braço E", "Braço D", "Coxa E", "Coxa D"]
      ];

      const rows = medidas.map((m: any) => [
        new Date(m.data_medicao).toLocaleDateString("pt-BR"),
        m.peso !== null && m.peso !== undefined ? `${m.peso.toFixed(1)} kg` : "—",
        m.gordura_corporal !== null && m.gordura_corporal !== undefined ? `${m.gordura_corporal.toFixed(1)}%` : "—",
        m.cintura !== null && m.cintura !== undefined ? `${m.cintura.toFixed(1)} cm` : "—",
        m.peitoral !== null && m.peitoral !== undefined ? `${m.peitoral.toFixed(1)} cm` : "—",
        m.braco_esquerdo !== null && m.braco_esquerdo !== undefined ? `${m.braco_esquerdo.toFixed(1)} cm` : "—",
        m.braco_direito !== null && m.braco_direito !== undefined ? `${m.braco_direito.toFixed(1)} cm` : "—",
        m.coxa_esquerda !== null && m.coxa_esquerda !== undefined ? `${m.coxa_esquerda.toFixed(1)} cm` : "—",
        m.coxa_direita !== null && m.coxa_direita !== undefined ? `${m.coxa_direita.toFixed(1)} cm` : "—",
      ]);

      autoTable(doc, {
        startY: 50,
        head: headers,
        body: rows,
        theme: "striped",
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: "bold",
          halign: "center",
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [31, 31, 35],
          halign: "center",
        },
        columnStyles: {
          0: { halign: "left", fontStyle: "bold" },
        },
      });

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(113, 113, 122);
        doc.text(
          "AURONFIT Assessoria Esportiva — Relatório de Evolução Física",
          15,
          287
        );
        doc.text(`Página ${i} de ${totalPages}`, 195, 287, { align: "right" });
      }
    };

    addHeader();
    addStudentInfo();
    addComparisonTable();
    addFullHistoryTable();

    const filename = `relatorio-medidas-${profile?.full_name?.toLowerCase().replace(/\s+/g, "-") || "aluno"}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-8 lg:p-10 lg:pl-28 pb-24 text-text-primary font-sans w-full max-w-[min(1600px,96vw)] mx-auto flex flex-col gap-6">

      {/* ── Page Header & Quick actions ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/alunos')}
            className="w-9 h-9 rounded-xl bg-surface-2 border-0 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight truncate font-display">
              {profileName}
            </h1>
            <p className="text-xs text-text-tertiary truncate">{profile?.email}</p>
          </div>
        </div>

        {/* Quick action buttons — Nova Ficha full-width, Gerir/Enviar 50/50 abaixo */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1.5 w-full lg:w-auto">
          <button
            onClick={() => {
              setActiveTab("treinos");
              setKanbanBuilderOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1 w-full sm:w-auto px-2.5 py-1.5 bg-brand hover:bg-brand-hover text-text-on-brand text-[9px] font-bold uppercase tracking-wider rounded-md transition-all active:scale-95 shadow-sm shadow-brand/10"
          >
            <Plus size={10} weight="bold" /> Nova Ficha
          </button>
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5">
            <button
              onClick={() => { setActiveTab('financeiro'); setEditingProfile(!editingProfile); }}
              className="inline-flex items-center justify-center gap-1 w-full sm:w-auto px-2.5 py-1.5 bg-surface-2 border-0 hover:bg-surface-3 text-text-primary text-[9px] font-bold uppercase tracking-wider rounded-md transition-all active:scale-95"
            >
              <Gear size={10} /> Gerir Plano
            </button>
            <button
              onClick={() => { setActiveTab('nutricao'); setUploadNutritionOpen(true); }}
              className="inline-flex items-center justify-center gap-1 w-full sm:w-auto px-2.5 py-1.5 bg-surface-2 border-0 hover:bg-surface-3 text-text-primary text-[9px] font-bold uppercase tracking-wider rounded-md transition-all active:scale-95"
            >
              <UploadSimple size={10} /> Enviar Plano
            </button>
          </div>
        </div>
      </div>

      {/* ── Error Box ── */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm shadow-sm animate-fade-in">
          <WarningCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Aviso de Renovação Próxima ── */}
      {mostrarAvisoRenovacao && diasParaRenovacao !== null && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 backdrop-blur-sm shadow-md animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
          <div className="relative flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-200">Renovação de acesso próxima</p>
                <p className="text-[11px] text-amber-300/80">
                  {diasParaRenovacao === 1
                    ? "Plano vence amanhã! Fale com o aluno para renovar."
                    : `Faltam apenas ${diasParaRenovacao} dias para o vencimento do plano.`}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setActiveTab('financeiro'); setEditingProfile(true); }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-bold uppercase rounded-lg transition-all"
            >
              Renovar plano
            </button>
          </div>
        </div>
      )}

      {/* ── Profile Base Card ── */}
      {profile && (
        <Card className="rounded-2xl border-0 p-6 bg-surface-1 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative flex items-center gap-5">
            {avatarUrl ? (
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-brand/20 shrink-0 shadow-lg">
                <img src={avatarUrl || ""} alt={profileName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={cn(
                "w-16 h-16 rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-2xl text-white shrink-0 shadow-lg",
                avatarGrad(profileName)
              )}>
                {profileName[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-text-primary tracking-tight truncate">
                  {profileName}
                </h2>
                {profile.arquivado ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7a8aab]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#555555]" />
                    desativado
                  </span>
                ) : isPaid && !isExpired ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#39c75a]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#39c75a]" />
                    ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#e05555]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e05555]" />
                    bloqueado
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5">{profile.email}</p>
              
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-2xs text-text-tertiary">
                {profile.data_inicio && (
                  <span>Início: {new Date(profile.data_inicio).toLocaleDateString("pt-BR")}</span>
                )}
                {ultimaAtividade && (
                  <span>Última atividade: {new Date(ultimaAtividade).toLocaleDateString("pt-BR")}</span>
                )}
              </div>
            </div>
          </div>

          <div className="relative flex items-center gap-2 shrink-0 md:self-center">
            {profile.arquivado ? (
              <Button variant="primary" size="sm" loading={deleting} onClick={handleReactivate}>
                Reativar Aluno
              </Button>
            ) : (
              <Button variant="danger" size="sm" leftIcon={<Trash className="w-4 h-4" />} loading={deleting} onClick={handleDelete}>
                Desativar Acesso
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ── Hero unificado (métricas neutras; cor só em exceção) ── */}
      <div
        className="rounded-xl border-0 bg-surface-1 px-5 py-4 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-6"
      >
        <div className="flex items-center gap-3 min-w-0">
          {avatarUrl ? (
            <div className="w-11 h-11 rounded-full overflow-hidden border-0 shrink-0">
              <img src={avatarUrl} alt={profileName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#1e1e1e] border-0 flex items-center justify-center font-bold text-sm text-white shrink-0">
              {profileName[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[1px] text-[#7a8aab] font-medium">
              Treino atual
            </p>
            <p className="text-xl font-bold text-white truncate leading-tight mt-0.5">
              {activeRoutine}
            </p>
          </div>
        </div>

        <div className="hidden md:block" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 md:justify-self-end">
          <div>
            <p className="text-[10px] uppercase tracking-[1px] text-[#7a8aab]">Adesão</p>
            <p
              className={cn(
                "text-base font-semibold mt-0.5",
                adesaoTone === "good" && "text-[#39c75a]",
                adesaoTone === "bad" && "text-[#e05555]",
                adesaoTone === "neutral" && "text-white",
              )}
            >
              {adesaoSemanal}%
              {adesaoSuffix && (
                <span className="text-[11px] ml-1 font-medium">{adesaoSuffix}</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[1px] text-[#7a8aab]">Peso</p>
            <p className="text-base font-semibold text-white mt-0.5">
              {ultimoMedidaVal}
              {pesoDeltaLabel && (
                <span className="text-[11px] ml-1 font-medium text-[#7a8aab]">
                  {pesoDeltaLabel}
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[1px] text-[#7a8aab]">Vencimento</p>
            <p
              className={cn(
                "text-base font-semibold mt-0.5",
                vencimentoTone === "warn" ? "text-[#f59e0b]" : "text-white",
              )}
            >
              {vencimentoVal}
              {vencimentoTone === "warn" && diasParaVencer != null && diasParaVencer >= 0 && (
                <span className="text-[11px] ml-1 font-medium">atenção</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[1px] text-[#7a8aab]">Pontos</p>
            <p className="text-base font-semibold text-white mt-0.5 tabular-nums lining-nums">
              {pontosTotais}
              <span className="text-[11px] ml-1 font-medium text-[#7a8aab]">pts</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-1 bg-surface-1 border-0 p-1 rounded-xl overflow-x-auto scrollbar-none shadow-sm">
        {([
          { key: 'visao-geral', label: 'Visão Geral', icon: User },
          { key: 'treinos', label: 'Treinos', icon: Barbell },
          { key: 'cardio', label: 'Cardio', icon: HeartStraight },
          { key: 'nutricao', label: 'Nutrição', icon: AppleLogo },
          { key: 'evolucao', label: 'Evolução', icon: Ruler },
          { key: 'financeiro', label: 'Financeiro', icon: CreditCard },
          { key: 'fotos', label: 'Fotos', icon: ImageIcon },
          { key: 'observacoes', label: 'Notas/Orientações', icon: FileText }
        ] as const).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setEditingProfile(false); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all shrink-0 whitespace-nowrap",
                activeTab === tab.key
                  ? "bg-brand text-text-on-brand shadow-md shadow-brand/10 font-bold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Contents ── */}
      <div className="flex flex-col gap-6 min-h-[400px]">

        {/* ── VISÃO GERAL TAB ── */}
        {activeTab === 'visao-geral' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Esquerda: Prioridades e Atividade */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Prioridades / Pendências do Aluno */}
              <div className="bg-surface-1 border-0 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col gap-3">
                  {studentPriorities.length === 0 ? (
                    <div className="py-6 text-center text-xs text-text-tertiary">
                      ✨ Tudo em ordem por aqui. Atleta com planejamento ativo e em dia.
                    </div>
                  ) : (
                    studentPriorities.map((item) => (
                      <div key={item.id} className="p-3.5 bg-surface-1 border-0 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            item.type === 'danger' && "bg-danger",
                            item.type === 'warning' && "bg-warning",
                            item.type === 'info' && "bg-info"
                          )} />
                          <span className="text-xs font-bold text-text-primary">{item.desc}</span>
                        </div>
                        <button
                          onClick={() => setActiveTab(item.tab)}
                          className="px-3 py-1.5 bg-surface-3 hover:bg-surface-4 text-text-primary text-[10px] font-bold uppercase rounded-lg transition-all inline-flex items-center gap-1"
                        >
                          {item.action} <ArrowRight size={10} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Estatísticas Avançadas do Aluno */}
              <div className="bg-surface-1 border-0 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
                {historicoTreinos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Coluna 1: Cartões de Resumo 2x2 (Desktop span 6, Mobile span 12) */}
                    <div className="md:col-span-6 flex flex-col justify-between gap-4">
                      <div className="grid grid-cols-2 gap-3 h-full">
                        {[
                          { label: 'Treinos', value: stats30.workouts.toString(), icon: CalendarBlank },
                          { label: 'Duração estim.', value: `${Math.floor(stats30.minutes / 60)}h ${stats30.minutes % 60}m`, icon: Clock },
                          { label: 'Volume total', value: stats30.volume > 0 ? `${(stats30.volume / 1000).toFixed(1)}k kg` : `${stats30.sets} séries`, icon: ChartLine },
                          { label: 'Séries feitas', value: stats30.sets.toString(), icon: Barbell },
                        ].map((stat) => {
                          const Icon = stat.icon;
                          return (
                            <div key={stat.label} className="bg-surface-1 border-0 rounded-xl p-4 flex flex-col justify-between">
                              <div className="flex items-center gap-1.5">
                                <Icon className="w-3.5 h-3.5 text-[#7a8aab]" />
                                <span className="text-[10px] font-semibold text-[#7a8aab] uppercase tracking-wider">{stat.label}</span>
                              </div>
                              <p className="text-lg font-bold text-white mt-2 font-mono">{stat.value}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Coluna 2: Muscle Body Chart (Heatmap) (Desktop span 6, Mobile span 12) */}
                    <div className="md:col-span-6 flex flex-col gap-3 justify-center">
                      <div className="flex justify-around items-center bg-surface-1 border-0 py-3 px-2 rounded-xl h-full min-h-[320px]">
                        <div className="w-[46%] h-[300px] flex items-center justify-center overflow-hidden">
                          <MuscleBodyChart muscleIntensity={weekMuscleIntensity} side="front" gender={alunoBodyGender} />
                        </div>
                        <div className="w-[46%] h-[300px] flex items-center justify-center overflow-hidden">
                          <MuscleBodyChart muscleIntensity={weekMuscleIntensity} side="back" gender={alunoBodyGender} />
                        </div>
                      </div>
                    </div>

                    {/* Radar Chart (Distribuição Muscular) (Desktop span 12, Mobile span 12) */}
                    <div className="md:col-span-12 flex flex-col gap-3">
                      <div className="w-full h-56 bg-surface-1 border-0 rounded-xl p-2 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData30}>
                            <PolarGrid stroke="var(--color-border-subtle)" />
                            <PolarAngleAxis dataKey="subject" stroke="var(--color-text-secondary)" fontSize={9} />
                            <PolarRadiusAxis stroke="transparent" tick={false} />
                            <Radar name="Intensidade" dataKey="value" stroke="var(--color-brand)" fill="var(--color-brand)" fillOpacity={0.25} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-0 bg-surface-1 p-4">
                    <p className="text-xs text-[#555555]">
                      Sem treinos concluídos ainda — os dados aparecem aqui após o primeiro treino registrado.
                    </p>
                  </div>
                )}
              </div>

              {/* Notas Rápidas */}
              <div className="bg-surface-1 border-0 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-end mb-4">
                  <button onClick={() => setActiveTab('observacoes')} className="text-brand hover:underline text-xs font-semibold">
                    Editar
                  </button>
                </div>
                <div className="p-4 bg-surface-1 rounded-xl border-0 min-h-24">
                  {profile?.orientacoes ? (
                    <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{profile.orientacoes}</p>
                  ) : (
                    <span className="text-xs text-text-tertiary italic">Nenhuma observação interna registrada. Clique em editar para adicionar orientações para este atleta.</span>
                  )}
                </div>
              </div>

            </div>

            {/* Direita: Métricas Rápidas & Logs */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Informações de Cadastro */}
              <div className="bg-surface-1 border-0 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-tertiary font-medium">Plano Contratado</span>
                    <span className="font-bold text-text-primary capitalize">{planDisplayName(profile?.tipo_plano, planosPersonalizados)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-tertiary font-medium">Data de Início</span>
                    <span className="font-bold text-text-primary">
                      {profile?.data_inicio ? new Date(profile.data_inicio).toLocaleDateString("pt-BR") : "Não definida"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-tertiary font-medium">Último Checkin</span>
                    <span className="font-bold text-text-primary">
                      {profile?.ultimo_checkin ? new Date(profile.ultimo_checkin).toLocaleDateString("pt-BR") : "Nenhum"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7a8aab] font-medium">Total de Pontos</span>
                    <span className="font-bold text-white tabular-nums lining-nums">{pontosTotais} pts</span>
                  </div>
                </div>
              </div>

              {/* Treino Ativo Card — resumo mínimo (link para Kanban/ficha) */}
              <div className="bg-surface-1 border-0 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-[#1e1e1e] border-0 rounded-xl flex items-center justify-center shrink-0 text-[#7a8aab]">
                    <Barbell size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-medium text-[#7a8aab] tracking-[1px] block">
                      Ficha ativa
                    </span>
                    <span className="text-sm font-bold text-white block truncate mt-0.5">
                      {activeRoutine}
                    </span>
                    {fichaAtualizadaLabel && (
                      <span className="text-[11px] text-[#7a8aab] mt-0.5 block">
                        {fichaAtualizadaLabel}
                      </span>
                    )}
                  </div>
                </div>
                {activeFicha && (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        withReturnUrl(
                          `/admin/aluno/${id}/ficha/${activeFicha.id}`,
                          alunoTreinosReturnUrl(id),
                        ),
                      )
                    }
                    className="w-full text-center text-[11px] font-semibold text-[#9333ea] hover:opacity-80 py-2 border-0 rounded-lg"
                  >
                    Ver ficha completa
                  </button>
                )}
                {!activeFicha && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("treinos")}
                    className="w-full text-center text-[11px] font-medium text-[#39c75a] hover:opacity-80 py-2"
                  >
                    + criar ficha digital
                  </button>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ── TREINOS TAB ── */}
        {activeTab === 'treinos' && (
          <div className="flex flex-col gap-4">
            
            {/* Kanban de Fichas Digitais */}
            <div className="w-full bg-surface-1 border-0 rounded-2xl p-5 shadow-sm flex flex-col gap-4 min-w-0">
              <FichasKanban
                fichas={fichas}
                alunoId={id}
                currentFichaId={activeFicha?.id ?? null}
                onReorderFichas={handleReorderFichas}
                onUpdateFichaExercicios={handleUpdateFichaExercicios}
                onDeleteFicha={handleDeleteFicha}
                onCloneFicha={(f) => abrirClonarFicha(f as FichaTreino)}
                onPreviewFicha={(f) => setSelectedRoutineForPreview(f as FichaTreino)}
                onCreateTreino={() => setKanbanBuilderOpen(true)}
                onAddExercise={(fichaId) => void openAddExercise(fichaId)}
              />
            </div>

            {/* Upload de PDF individual — compacto por padrão */}
            <form
              onSubmit={handleUploadPdf}
              className="bg-surface-1 border-0 rounded-xl"
            >
              <div className="min-h-14 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setTreinoPdfOpen((open) => !open)}
                  className="flex items-center gap-2 min-w-0 text-left"
                  aria-expanded={treinoPdfOpen}
                >
                  <FilePdf size={16} className="text-[#7a8aab] shrink-0" />
                  <span className="text-[13px] text-[#7a8aab] font-medium">
                    Ficha em PDF
                  </span>
                  {pdfFile && (
                    <span className="text-[11px] text-white truncate">
                      {pdfFile.name}
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTreinoPdfOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border-0 bg-[#1e1e1e] text-[11px] font-semibold text-white hover:bg-[#232323] transition-colors"
                  >
                    <UploadSimple size={12} />
                    Enviar PDF
                  </button>
                  <Button
                    type="submit"
                    loading={uploading}
                    disabled={!pdfFile}
                    size="sm"
                    className="h-8 px-3 text-[11px]"
                  >
                    Publicar
                  </Button>
                </div>
              </div>

              {treinoPdfOpen && (
                <div className="border-t border-divider px-4 py-3 flex flex-col gap-3">
                  <div className="relative">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                    />
                    <div className={cn(
                      "flex items-center justify-center gap-2 min-h-20 rounded-lg border border-dashed transition-all",
                      pdfFile ? "border-[#9333ea]/50 bg-[#9333ea]/5" : "border-transparent bg-surface-1 hover:border-[#9333ea]/40"
                    )}>
                      <UploadSimple className={cn("w-4 h-4", pdfFile ? "text-[#9333ea]" : "text-[#7a8aab]")} />
                      <span className={cn("text-xs text-center px-4 truncate max-w-full", pdfFile ? "text-white font-medium" : "text-[#7a8aab]")}>
                        {pdfFile ? pdfFile.name : "Clique ou arraste o PDF do treino"}
                      </span>
                    </div>
                  </div>

                  {treinosPdf.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {treinosPdf.map((t) => (
                          <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-1 border-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-[#7a8aab] shrink-0" />
                              <span className="text-xs text-[#7a8aab] truncate font-medium">{t.nome_arquivo}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a href={t.url_pdf} target="_blank" rel="noopener noreferrer" className="text-xs text-[#9333ea] hover:underline font-semibold">
                                Visualizar
                              </a>
                              <button type="button" onClick={() => handleDeleteTreino(t.id, t.original_url_pdf || t.url_pdf)} className="text-text-disabled hover:text-danger transition-colors">
                                <Trash size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>

          </div>
        )}

        {/* ── NUTRIÇÃO TAB ── */}
        {activeTab === 'nutricao' && (
          <div className="w-full flex flex-col gap-4">
            
            {/* Seção 1: Plano Digital Ativo */}
            <div className="bg-surface-1 border-0 rounded-xl p-5 flex flex-col gap-5">
              <div className="flex items-center justify-end gap-3">
                {!digitalPlan && (
                  <Link href="/admin/nutricao/novo-plano">
                    <Button variant="primary" size="sm" leftIcon={<AppleLogo size={14} />}>
                      Prescrever Plano
                    </Button>
                  </Link>
                )}
              </div>

              {digitalPlan ? (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    {/* Resumo: plano + macros + KPIs */}
                    <div className="p-4 bg-surface-1 border-0 rounded-xl flex flex-col gap-4">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#39c75a]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#39c75a]" />
                            ativo
                          </span>
                          <h4 className="text-xs font-bold text-white mt-2 truncate">{digitalPlan.name}</h4>
                          <p className="text-[11px] text-[#7a8aab]">Objetivo: {digitalPlan.goal || 'Hipertrofia'}</p>
                        </div>
                        
                        <div className="flex gap-2 shrink-0">
                          <Link href={`/admin/nutricao/planos/${digitalPlan.id}`}>
                            <Button variant="secondary" size="sm" className="h-7 text-[10px] px-2.5 rounded-md cursor-pointer border-0">
                              Ver Plano
                            </Button>
                          </Link>
                          <Link href={`/admin/nutricao/planos/${digitalPlan.id}/editar`}>
                            <Button variant="secondary" size="sm" className="h-7 text-[10px] px-2.5 rounded-md cursor-pointer border-0">
                              Editar
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {digitalPlan.calories_target && (
                        <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono border-t border-b border-divider py-2.5">
                          <div className="flex flex-col">
                            <span className="text-[8px] uppercase font-semibold text-[#7a8aab] tracking-wider mb-0.5">Calorias</span>
                            <span className="text-white font-bold">{digitalPlan.calories_target} kcal</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] uppercase font-semibold text-[#7a8aab] tracking-wider mb-0.5">Proteínas</span>
                            <span className="text-white font-bold">{digitalPlan.protein_target || '—'}g</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] uppercase font-semibold text-[#7a8aab] tracking-wider mb-0.5">Carbos</span>
                            <span className="text-white font-bold">{digitalPlan.carbs_target || '—'}g</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] uppercase font-semibold text-[#7a8aab] tracking-wider mb-0.5">Gorduras</span>
                            <span className="text-white font-bold">{digitalPlan.fat_target || '—'}g</span>
                          </div>
                        </div>
                      )}

                      {(() => {
                        const todayISO = new Date().toISOString().slice(0, 10);
                        const mealsCount = digitalPlan.days?.[0]?.meals?.length || 0;
                        const todayCheckins = digitalCheckins.filter(c => c.checkin_date === todayISO);
                        let todayWeightSum = 0;
                        todayCheckins.forEach(c => {
                          todayWeightSum += getStatusAdherenceWeight(c.status);
                        });
                        const todayAdherence = mealsCount > 0 ? Math.min(100, Math.round((todayWeightSum / mealsCount) * 100)) : 100;

                        const expected7dMeals = mealsCount * 7;
                        let total7dWeightSum = 0;
                        digitalCheckins.forEach(c => {
                          total7dWeightSum += getStatusAdherenceWeight(c.status);
                        });
                        const weeklyAdherence = expected7dMeals > 0 ? Math.min(100, Math.round((total7dWeightSum / expected7dMeals) * 100)) : 100;

                        const lastCheckin = digitalCheckins[0];
                        const formattedLastCheckin = lastCheckin
                          ? `${new Date(lastCheckin.checkin_date).toLocaleDateString('pt-BR')} (${lastCheckin.status.toUpperCase()})`
                          : 'Nenhum recente';

                        return (
                          <div className="grid grid-cols-3 gap-4 text-xs font-medium">
                            <div>
                              <p className="text-[9px] uppercase font-semibold text-[#7a8aab] mb-0.5">Adesão Hoje</p>
                              <p className="text-white font-bold font-mono">{todayAdherence}%</p>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase font-semibold text-[#7a8aab] mb-0.5">Adesão 7 Dias</p>
                              <p className="text-white font-bold font-mono">{weeklyAdherence}%</p>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase font-semibold text-[#7a8aab] mb-0.5">Último Registro</p>
                              <p className="text-[#7a8aab] truncate">{formattedLastCheckin}</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Card: Adesão nos últimos 7 dias */}
                    <div className="p-4 bg-surface-1 border-0 rounded-xl flex flex-col gap-3 min-h-[180px]">
                      <div>
                        <h4 className="text-[13px] font-semibold text-white">Adesão nos últimos 7 dias</h4>
                        <p className="text-[10px] text-[#7a8aab] mt-0.5">Série diária — mesmo cálculo dos KPIs</p>
                      </div>
                      {(() => {
                        const mealsCount = digitalPlan.days?.[0]?.meals?.length || 0;
                        const series = buildDailyAdherenceSeries(digitalCheckins, mealsCount, 7);
                        const chartData = series.map((p) => ({ date: p.date, value: p.value }));
                        return (
                          <MeasurementLineChart
                            data={chartData}
                            height={140}
                            isDesktop
                            yDomain={[0, 100]}
                            labelMode="all"
                            solidBackground
                            formatValue={(v) => `${v}%`}
                          />
                        );
                      })()}
                    </div>
                  </div>

                  {/* Refeições Recentes (Hoje) */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-semibold text-[#7a8aab] tracking-wider mb-1">Adesão às refeições de hoje</span>
                    {digitalPlan.days?.[0]?.meals?.map((meal: any) => {
                      const todayISO = new Date().toISOString().slice(0, 10);
                      const checkin = digitalCheckins.find(c => c.meal_id === meal.id && c.checkin_date === todayISO);
                      const status = checkin?.status || 'pending';

                      const statusLabels: Record<string, string> = {
                        done: 'Feita',
                        substituted: 'Substituída',
                        partial: 'Parcial',
                        skipped: 'Não Feita',
                        pending: 'Pendente'
                      };

                      const statusColors: Record<string, string> = {
                        done: 'bg-success/10 text-success border-success/20',
                        substituted: 'bg-brand/10 text-brand border-brand/20',
                        partial: 'bg-warning/10 text-warning border-warning/20',
                        skipped: 'bg-danger/10 text-danger border-danger/20',
                        pending: 'bg-[#1e1e1e] text-[#7a8aab] border-transparent'
                      };

                      return (
                        <div key={meal.id} className="p-3 bg-surface-1 border-0 rounded-lg flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white leading-tight truncate">{meal.title}</p>
                            {meal.time_suggestion && (
                              <span className="text-[9px] text-[#555555] font-mono flex items-center gap-1 mt-0.5">
                                <Clock size={10} /> {meal.time_suggestion.slice(0, 5)}
                              </span>
                            )}
                          </div>
                          
                          <span className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border",
                            statusColors[status]
                          )}>
                            {statusLabels[status]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#555555] p-4 rounded-xl border-0">
                  Sem plano alimentar digital ativo — os dados de adesão aparecem aqui após a prescrição.
                </p>
              )}
            </div>

            {/* Seção 2: PDF compacto / colapsável */}
            <div className="bg-surface-1 border-0 rounded-xl">
              <div className="min-h-14 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setNutritionPdfOpen((open) => !open)}
                  className="flex items-center gap-2 min-w-0 text-left"
                  aria-expanded={nutritionPdfOpen}
                >
                  <FilePdf size={16} className="text-[#7a8aab] shrink-0" />
                  <span className="text-[13px] text-[#7a8aab] font-medium">
                    Plano em PDF
                  </span>
                  {planosAlimentares.length > 0 && (
                    <span className="text-[11px] text-white">
                      {planosAlimentares.length} arquivo{planosAlimentares.length === 1 ? '' : 's'}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setUploadNutritionOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border-0 bg-[#1e1e1e] text-[11px] font-semibold text-white hover:bg-[#232323] transition-colors shrink-0"
                >
                  <UploadSimple size={12} />
                  Enviar PDF
                </button>
              </div>

              {nutritionPdfOpen && (
                <div className="border-t border-divider px-4 py-3">
                  {planosAlimentares.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {planosAlimentares.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-1 border-0">
                          <div className="min-w-0">
                            <p className="text-xs text-white truncate font-medium">{p.nome_arquivo}</p>
                            <span className="text-[10px] text-[#7a8aab] font-mono">
                              {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={p.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#9333ea] hover:underline font-semibold"
                            >
                              Abrir
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteNutritionPlan(p.id, p.original_path || p.url_pdf || p.pdf_url)}
                              className="text-text-disabled hover:text-danger transition-colors p-1"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#555555] py-2">
                      Nenhum plano em PDF enviado ainda.
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── EVOLUÇÃO TAB ── */}
        {activeTab === 'evolucao' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Coluna Esquerda: Cargas e Gráfico/Lista */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Gráfico de Evolução de Medidas */}
              <div className="rounded-2xl border-0 p-4 md:p-6 shadow-sm bg-surface-1">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-end">
                  {medidas.length > 0 && (
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-brand px-4 py-2 text-xs font-semibold text-text-primary shadow-sm transition-all duration-200 hover:bg-brand-hover"
                    >
                      <FilePdf className="h-4 w-4" /> Exportar Relatório PDF
                    </button>
                  )}
                </div>

                <MeasurementsView
                  variant="embedded"
                  readOnly
                  medicoes={medidas as MedicaoRecord[]}
                />
              </div>

              {/* Tabela de Medidas Corporais */}
              <div className="bg-surface-1 border-0 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-end mb-4">
                  <Ruler className="text-brand w-5 h-5" />
                </div>

                {medidas.length > 0 ? (
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-xs min-w-[600px]">
                      <thead>
                        <tr className="border-b border-divider">
                          <th className="pb-3 text-left font-semibold text-text-tertiary uppercase">Data</th>
                          <th className="pb-3 text-center font-semibold text-text-tertiary uppercase">Peso</th>
                          <th className="pb-3 text-center font-semibold text-text-tertiary uppercase">Gordura</th>
                          <th className="pb-3 text-center font-semibold text-text-tertiary uppercase">Cintura</th>
                          <th className="pb-3 text-center font-semibold text-text-tertiary uppercase">Peitoral</th>
                          <th className="pb-3 text-center font-semibold text-text-tertiary uppercase">Braço E</th>
                          <th className="pb-3 text-center font-semibold text-text-tertiary uppercase">Braço D</th>
                          <th className="pb-3 text-center font-semibold text-text-tertiary uppercase">Coxa E</th>
                          <th className="pb-3 text-center font-semibold text-text-tertiary uppercase">Coxa D</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medidas.map((m: any) => (
                          <tr key={m.id} className="border-b border-divider hover:bg-surface-2/40 transition-colors">
                            <td className="py-3 font-semibold text-text-primary">{new Date(m.data_medicao).toLocaleDateString("pt-BR")}</td>
                            <td className="py-3 text-center text-brand font-bold">{m.peso?.toFixed(1) || "—"} kg</td>
                            <td className="py-3 text-center text-text-primary font-medium">{m.gordura_corporal ? `${m.gordura_corporal.toFixed(1)}%` : "—"}</td>
                            <td className="py-3 text-center text-text-secondary">{m.cintura?.toFixed(1) || "—"} cm</td>
                            <td className="py-3 text-center text-text-secondary">{m.peitoral?.toFixed(1) || "—"} cm</td>
                            <td className="py-3 text-center text-text-secondary">{m.braco_esquerdo?.toFixed(1) || "—"} cm</td>
                            <td className="py-3 text-center text-text-secondary">{m.braco_direito?.toFixed(1) || "—"} cm</td>
                            <td className="py-3 text-center text-text-secondary">{m.coxa_esquerda?.toFixed(1) || "—"} cm</td>
                            <td className="py-3 text-center text-text-secondary">{m.coxa_direita?.toFixed(1) || "—"} cm</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                    <WarningCircle size={32} className="text-text-disabled" />
                    <p className="text-xs text-text-tertiary">Nenhuma avaliação física registrada ainda.</p>
                  </div>
                )}
              </div>

            </div>

            {/* Coluna Direita: Cargas de Treinos */}
            <div className="lg:col-span-4 bg-surface-1 border-0 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              {historicoTreinos.length > 0 ? (() => {
                const sessoesPorData = new Map<string, any[]>();
                historicoTreinos.forEach(h => {
                  const dia = new Date(h.data_conclusao).toLocaleDateString("pt-BR");
                  if (!sessoesPorData.has(dia)) sessoesPorData.set(dia, []);
                  sessoesPorData.get(dia)!.push(h);
                });

                return (
                  <div className="max-h-[360px] overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-thin">
                    {Array.from(sessoesPorData.entries()).map(([dia, sessao]) => (
                      <div key={dia} className="rounded-xl bg-surface-1 border-0 overflow-hidden">
                        <div className="px-3 py-1.5 bg-surface-3 border-b border-divider flex items-center justify-between text-[9px] uppercase tracking-wider font-bold text-text-tertiary">
                          <span>{dia}</span>
                          <span className="truncate max-w-[120px]">{sessao[0]?.dados_sessao?.nome_rotina || "Treino"}</span>
                        </div>
                        <div className="divide-y divide-border-subtle/50">
                          {sessao.map((h: any, i: number) => {
                            const ds = h.dados_sessao as any;
                            if (!ds) return null;
                            const series = (ds.series || []).filter((s: any) => s.completado && s.peso_atual > 0);
                            if (series.length === 0) return null;
                            const maxCarga = Math.max(...series.map((s: any) => s.peso_atual));
                            return (
                              <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                                <span className="font-semibold text-text-primary truncate max-w-[140px]">{ds.nome_exercicio}</span>
                                <span className="font-bold text-brand">{maxCarga} kg</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })() : (
                <div className="py-12 text-center bg-surface-1 border border-dashed border-divider rounded-xl flex flex-col items-center justify-center gap-2">
                  <ChartLineUp size={24} className="text-text-disabled" />
                  <span className="text-xs text-text-tertiary">Nenhum treino concluído ainda.</span>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── FINANCEIRO TAB ── */}
        {activeTab === 'financeiro' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-4xl mx-auto w-full">
            
            {/* Detalhes do Plano */}
            <div className="lg:col-span-6 bg-surface-1 border-0 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
              <div className="flex flex-col gap-3.5 text-xs bg-surface-1 p-4 rounded-xl border-0">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-medium">Situação de Cobrança</span>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border",
                    isPaid ? "bg-success-subtle text-success border-success/15" : "bg-danger-subtle text-danger border-danger/15"
                  )}>
                    {isPaid ? "Em dia" : "Pendente/Atrasado"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-medium">Ciclo de Plano</span>
                  <span className="font-bold text-text-primary capitalize">{planDisplayName(profile?.tipo_plano, planosPersonalizados)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-medium">Ticket de Consultoria</span>
                  <span className="font-bold text-text-primary">
                    {profile?.valor_plano ? profile.valor_plano.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-medium">Próximo Vencimento</span>
                  <span className={cn(
                    "font-bold",
                    isExpired ? "text-danger" : "text-text-primary"
                  )}>
                    {profile?.data_expiracao ? new Date(profile.data_expiracao).toLocaleDateString("pt-BR") : "Não definida"}
                  </span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Gear className="w-4 h-4" />}
                onClick={() => setEditingProfile(!editingProfile)}
              >
                {editingProfile ? "Fechar Gestão" : "Editar Detalhes de Cobrança"}
              </Button>
            </div>

            {/* Formulário / Transferência */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              <div className="bg-surface-1 border-0 rounded-2xl p-6 shadow-sm">
                {historicoFinanceiro.length === 0 ? (
                  <p className="text-xs text-text-tertiary">
                    Ainda não há registros de planos pagos para este aluno.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {historicoFinanceiro.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-divider/60 bg-surface-1 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-text-primary capitalize">{planDisplayName(item.tipo_plano, planosPersonalizados)}</p>
                          <p className="text-[10px] text-text-tertiary">
                            {new Date(item.registrado_em).toLocaleDateString("pt-BR")} ·{" "}
                            {new Date(item.data_inicio).toLocaleDateString("pt-BR")} →{" "}
                            {new Date(item.data_expiracao).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="ml-3 shrink-0 text-right">
                          <p className="text-xs font-bold text-text-primary font-kpi tabular-nums lining-nums">
                            {item.valor_plano.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                          <span className={cn(
                            "text-[9px] font-bold uppercase",
                            item.status_pagamento === "pago" ? "text-success" : "text-warning",
                          )}>
                            {item.status_pagamento}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Form de Edição Inline */}
              {editingProfile && (
                <div className="bg-surface-1 border-0 rounded-2xl p-6 shadow-sm animate-fade-in">
                  <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Situação</label>
                      <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={fieldCls}>
                        <option value="pago">Pago (Acesso ativo)</option>
                        <option value="pendente">Pendente (Bloqueado)</option>
                        <option value="atrasado">Em atraso (Bloqueado)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Modalidade</label>
                        <select value={editPlano} onChange={(e) => setEditPlano(e.target.value)} className={fieldCls}>
                          {mergedPlans(planosPersonalizados).map((p) => (
                            <option key={p.slug} value={p.slug}>
                              {p.custom
                                ? `${p.nome} (${p.duracao_meses} ${p.duracao_meses === 1 ? "mês" : "meses"})`
                                : p.nome}
                            </option>
                          ))}
                          {/* Plano legado do aluno que não existe mais no catálogo */}
                          {!mergedPlans(planosPersonalizados).some((p) => p.slug === editPlano) && (
                            <option value={editPlano}>{planDisplayName(editPlano, planosPersonalizados)}</option>
                          )}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Valor (R$)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editValorPlano}
                          onChange={(e) => setEditValorPlano(e.target.value)}
                          placeholder="Ex: 149,90"
                          className={fieldCls}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Data de início do ciclo</label>
                      <input
                        type="date"
                        value={editDataInicio}
                        onChange={(e) => setEditDataInicio(e.target.value)}
                        className={cn(fieldCls, "text-brand")}
                        required
                      />
                    </div>

                    <Button type="submit" loading={savingProfile} fullWidth>
                      Confirmar Atualização
                    </Button>
                  </form>
                </div>
              )}



            </div>

          </div>
        )}

        {/* ── FOTOS TAB ── */}
        {activeTab === 'fotos' && (
          <div className="bg-surface-1 border-0 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-end mb-6">
              <ImageIcon className="text-brand w-5 h-5" />
            </div>

            {fotos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {fotos.map((f) => (
                  <div key={f.id} className="group bg-surface-1 rounded-xl border-0 overflow-hidden relative shadow hover:shadow-md transition-all">
                    <div className="aspect-3/4 bg-surface-3 overflow-hidden relative">
                      <img src={f.url_foto} alt={f.posicao} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-0/60 to-transparent pointer-events-none" />
                      <span className="absolute top-2 right-2 bg-surface-0/80 text-[10px] font-bold text-text-secondary uppercase px-2 py-0.5 rounded-full border-0">
                        {f.posicao}
                      </span>
                    </div>
                    <div className="p-3 bg-surface-2 flex items-center justify-between gap-2 border-t border-divider/50">
                      <span className="text-[10px] font-semibold text-text-tertiary">
                        {new Date(f.data_upload).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      <a href={f.url_foto} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-brand hover:underline">
                        Ampliar
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-3 bg-surface-1 border border-dashed border-divider rounded-xl max-w-lg mx-auto">
                <ImageIcon size={36} className="text-text-disabled" />
                <p className="text-xs text-text-tertiary">Nenhuma captura de evolução física enviada.</p>
                <span className="text-[10px] text-text-disabled">O atleta pode carregar fotos da evolução no portal de aluno.</span>
              </div>
            )}
          </div>
        )}

        {/* ── CARDIO TAB ── */}
        {activeTab === 'cardio' && <CoachCardioTab alunoId={id} />}

        {/* ── OBSERVAÇÕES TAB ── */}
        {activeTab === 'observacoes' && (
          <div className="bg-surface-1 border-0 rounded-2xl p-6 shadow-sm max-w-3xl mx-auto w-full flex flex-col gap-4">
            <textarea
              value={profile?.orientacoes || ""}
              onChange={(e) => {
                const newVal = e.target.value;
                setProfile((prev) => prev ? { ...prev, orientacoes: newVal } : null);
              }}
              placeholder="Digite anamnese, restrições ou ajustes estruturais..."
              className={cn(fieldCls, "h-48 resize-none text-xs")}
            />

            {profile?.orientacoes !== notasOriginais && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider/50">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setProfile((prev) => prev ? { ...prev, orientacoes: notasOriginais } : null);
                  }}
                >
                  Descartar
                </Button>
                <Button
                  size="sm"
                  loading={salvandoNotas}
                  onClick={async () => {
                    setSalvandoNotas(true);
                    try {
                      await supabaseClient.from("profiles").update({ orientacoes: profile?.orientacoes }).eq("id", id);
                      setNotasOriginais(profile?.orientacoes || "");
                    } catch (err) {
                      console.error("Erro ao salvar nota:", err);
                      setError("Erro ao salvar notas");
                    } finally {
                      setSalvandoNotas(false);
                    }
                  }}
                >
                  Salvar Observações
                </Button>
              </div>
            )}
          </div>
        )}

      </div>

      <KanbanWorkoutBuilderSheet
        open={kanbanBuilderOpen}
        alunoId={id}
        onClose={() => setKanbanBuilderOpen(false)}
        onSaved={() => void load()}
      />

      {addExerciseFichaId && (
        <ExerciseLibraryModal
          catalog={exerciseCatalog}
          onClose={() => setAddExerciseFichaId(null)}
          onAdd={(selected) => void handleAddExercisesToFicha(selected)}
        />
      )}

      {/* Modal de upload de nutrição */}
      <UploadNutritionPlan
        isOpen={uploadNutritionOpen}
        onClose={() => setUploadNutritionOpen(false)}
        alunoId={id}
        alunoName={profile?.full_name || "Aluno"}
        onUploadSuccess={() => { setUploadNutritionOpen(false); load(); }}
      />

      {/* Modal Clonar Ficha */}
      {clonandoFicha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface-1 border-0 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary font-display">Clonar Ficha</p>
                <p className="text-xs text-text-tertiary truncate max-w-[220px]">{clonandoFicha.nome_rotina}</p>
              </div>
              <button
                onClick={() => setClonandoFicha(null)}
                className="p-2 text-text-disabled hover:text-text-secondary rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-text-tertiary mb-2 block">
                Selecionar atleta destino
              </label>
              {alunosCoach.length === 0 ? (
                <p className="text-xs text-text-tertiary py-3 text-center">Carregando alunos…</p>
              ) : (
                <select
                  value={alunoAlvoId}
                  onChange={e => setAlunoAlvoId(e.target.value)}
                  className="w-full px-3 py-3 bg-surface-3 border-0 rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand/40 transition-all"
                >
                  <option value="">Escolha um aluno…</option>
                  {alunosCoach.map(a => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setClonandoFicha(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-text-secondary bg-surface-3 border-0 hover:bg-surface-2 transition-colors"
              >
                Cancelar
              </button>
              <Button
                onClick={handleClonarFicha}
                disabled={!alunoAlvoId || cloning}
                loading={cloning}
                leftIcon={<Copy className="w-4 h-4" />}
                className="flex-1"
                size="sm"
              >
                Clonar
              </Button>
            </div>
          </div>
        </div>
      )}

        {/* Simplified Routine Preview Modal */}
        {selectedRoutineForPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
            <div className="bg-surface-1 border-0 rounded-3xl w-full max-w-lg overflow-hidden shadow-elev-3 flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="p-5 border-b border-divider flex justify-between items-center bg-surface-2/40">
                <div>
                  <span className="text-[9px] uppercase font-bold text-brand tracking-wider bg-brand/10 px-2 py-0.5 rounded border border-brand/20">Ficha Digital</span>
                  <h3 className="text-sm font-bold text-text-primary mt-2 uppercase">{selectedRoutineForPreview.nome_rotina || selectedRoutineForPreview.nome}</h3>
                </div>
                <button
                  onClick={() => setSelectedRoutineForPreview(null)}
                  className="w-8 h-8 rounded-full hover:bg-surface-3 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {(() => {
                  const exercises = (selectedRoutineForPreview.configuracao as any)?.exercicios || [];
                  if (exercises.length === 0) {
                    return <p className="text-xs text-text-tertiary text-center py-4">Nenhum exercício cadastrado nesta ficha.</p>;
                  }
                  return exercises.map((ex: any, idx: number) => (
                    <div key={idx} className="p-4 bg-surface-1 border-0 rounded-xl space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-bold text-text-primary">{idx + 1}. {ex.nome}</h4>
                        {ex.descanso && (
                          <span className="text-[10px] text-text-tertiary font-mono bg-surface-3 px-1.5 py-0.5 rounded">
                            Descanso: {ex.descanso}
                          </span>
                        )}
                      </div>
                      {ex.observacoes && (
                        <p className="text-[11px] text-text-secondary italic">Obs: {ex.observacoes}</p>
                      )}
                      
                      {/* Series List */}
                      <div className="pt-2 border-t border-divider/40 space-y-1.5">
                        {ex.series?.map((s: any, sIdx: number) => (
                          <div key={sIdx} className="flex items-center gap-3 text-[11px] text-text-secondary font-medium">
                            <span className="w-5 h-5 rounded bg-brand/10 text-brand text-[9px] font-bold flex items-center justify-center">
                              {s.ordem || (sIdx + 1)}
                            </span>
                            <span>
                              {s.reps || s.reps_sugerido ? `${s.reps || s.reps_sugerido} reps` : ""}
                              {s.tempo_sugerido ? `${s.tempo_sugerido} tempo` : ""}
                              {s.distancia_sugerida ? ` • ${s.distancia_sugerida}m` : ""}
                            </span>
                            {(s.tecnica || s.tecnica_extra) && (
                              <span className="text-[9px] uppercase font-bold text-brand tracking-wider bg-brand/5 px-1 rounded">
                                {[s.tecnica, s.tecnica_extra].filter(Boolean).join(" + ")}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-divider bg-surface-2/40 flex justify-end">
                <button
                  onClick={() => setSelectedRoutineForPreview(null)}
                  className="px-4 py-2 bg-surface-3 hover:bg-surface-4 text-text-primary rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
