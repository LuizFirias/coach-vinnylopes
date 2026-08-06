"use client";

import { use, useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import { getBootstrapProfile } from "@/lib/auth/bootstrapProfile";
import { extractStoragePath, getSignedStorageUrl, getPublicStorageUrl } from "@/lib/storageUrls";
import UploadNutritionPlan from "@/app/components/UploadNutritionPlan";
import {
  User,
  Calendar,
  CreditCard,
  FileText,
  UploadSimple,
  Image as ImageIcon,
  ChartLineUp,
  Trash,
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
  DotsThree,
  Check,
  ChartLine,
  CalendarBlank,
  CaretDown,
  Smiley,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import { CoachCardioTab } from '@/app/components/admin/cardio/CoachCardioTab';
import { MeasurementsView } from '@/app/components/measurements/MeasurementsView';
import type { MedicaoRecord } from '@/lib/measurements/types';
import { FichasKanban, type FichaKanbanItem } from "@/app/components/admin/alunos/FichasKanban";
import { WorkoutLoadReport } from "@/app/components/workout/WorkoutLoadReport";
import {
  PlanosNutricaoKanban,
  type PlanoNutricaoKanbanItem,
} from "@/app/components/admin/alunos/PlanosNutricaoKanban";
import { CloneToStudentsModal } from "@/app/components/admin/alunos/CloneToStudentsModal";
import { AlunoObservacoesCard } from "@/app/components/admin/alunos/AlunoObservacoesCard";
import { StudentPlanCard } from "@/app/components/admin/alunos/StudentPlanCard";
import {
  ExerciseLibraryModal,
  type LibraryExercise,
} from "@/app/components/workout-builder/ExerciseLibraryModal";
import {
  alunoTreinosReturnUrl,
  readReturnUrl,
  withReturnUrl,
} from "@/lib/utils/adminNav";
import { isBiSetFichaItem, parseFichaItems, serializeFichaItems } from "@/lib/utils/biset";
import type { ExercicioFicha, SerieDefinicao } from "@/app/components/workout-builder/types";
import {
  fetchCoachCustomPlans,
  mergedPlans,
  planDisplayName,
  type CoachPlan,
} from "@/lib/coachPlans";
import { RenovarPlanoModal } from "@/app/components/admin/alunos/RenovarPlanoModal";
import {
  FORMA_PAGAMENTO_LABEL,
  type FormaPagamento,
} from "@/lib/financeiro/types";
import { sendCoachNotification } from "@/lib/notifications/sendCoachNotification";
import { ConfirmModal } from "@/app/components/ConfirmModal";
import { BackButton } from "@/app/components/ui/BackButton";

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
  status_pagamento: 'pago' | 'pendente' | 'atrasado' | 'cancelado';
  tipo_plano: string; // slug — planos padrão ou personalizados do coach
  valor_plano: number;
  data_inicio: string;
  data_expiracao: string;
  data_pagamento?: string | null;
  forma_pagamento?: string | null;
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
  const [alunosCoachLoading, setAlunosCoachLoading] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [planosPersonalizados, setPlanosPersonalizados] = useState<CoachPlan[]>([]);
  const [historicoMenuId, setHistoricoMenuId] = useState<string | null>(null);
  const [cancellingHistoricoId, setCancellingHistoricoId] = useState<string | null>(null);
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
  const [sessaoHistoricoExpandida, setSessaoHistoricoExpandida] = useState<string | null>(null);

  // Nutrition States
  const [digitalPlan, setDigitalPlan] = useState<any | null>(null);
  const [digitalPlans, setDigitalPlans] = useState<PlanoNutricaoKanbanItem[]>([]);
  const [digitalCheckins, setDigitalCheckins] = useState<any[]>([]);
  const [latestDigitalPlan, setLatestDigitalPlan] = useState<any | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'visao-geral' | 'treinos' | 'cardio' | 'nutricao' | 'evolucao' | 'financeiro' | 'fotos'>('visao-geral');
  const [selectedRoutineForPreview, setSelectedRoutineForPreview] = useState<any | null>(null);
  const [treinoPdfOpen, setTreinoPdfOpen] = useState(false);
  const [nutritionPdfOpen, setNutritionPdfOpen] = useState(false);
  const [addExerciseFichaId, setAddExerciseFichaId] = useState<string | null>(null);
  const [exerciseCatalog, setExerciseCatalog] = useState<LibraryExercise[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [routineMenuId, setRoutineMenuId] = useState<string | null>(null);
  const [routineMenuPos, setRoutineMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [notifToast, setNotifToast] = useState<string | null>(null);
  const [notifToastTone, setNotifToastTone] = useState<'ok' | 'error'>('ok');
  const [sendingPhotosNotif, setSendingPhotosNotif] = useState(false);
  const [coachUserId, setCoachUserId] = useState<string | null>(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    destructive?: boolean;
    loading?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const showConfirm = (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
  }) => setConfirmModal(opts);

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!notifToast) return;
    const t = setTimeout(() => setNotifToast(null), 3200);
    return () => clearTimeout(t);
  }, [notifToast]);

  // Abre a aba indicada pela URL (?tab=) e opcionalmente o modal de renovação
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const abasPermitidas = ["visao-geral", "treinos", "cardio", "nutricao", "evolucao", "financeiro", "fotos"];
    if (tab && abasPermitidas.includes(tab)) {
      setActiveTab(tab as typeof activeTab);
    }
    if (params.get("renovar") === "1") {
      setActiveTab("financeiro");
      setEditingProfile(true);
    }
  }, []);

  useEffect(() => {
    if (!historicoMenuId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHistoricoMenuId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [historicoMenuId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDelete = () => {
    showConfirm({
      title: "Desativar aluno",
      message: "Tem certeza que deseja desativar este aluno? O acesso será bloqueado, mas os dados e histórico serão mantidos.",
      confirmLabel: "Desativar",
      destructive: true,
      onConfirm: () => void handleDeleteConfirmed(),
    });
  };

  const handleDeleteConfirmed = async () => {
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

  const handleReactivate = () => {
    showConfirm({
      title: "Reativar aluno",
      message: "Reativar este aluno? O acesso será restaurado.",
      confirmLabel: "Reativar",
      onConfirm: () => void handleReactivateConfirmed(),
    });
  };

  const handleReactivateConfirmed = async () => {
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
        setCoachUserId(boot.userId);

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
        { data: historicoData },
        { data: digPlansData },
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
          .from("fichas_treino").select("*").eq("aluno_id", id).order("criado_em", { ascending: false }),
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
          .select("id, status_pagamento, tipo_plano, valor_plano, data_inicio, data_expiracao, data_pagamento, forma_pagamento, origem, observacao, registrado_em")
          .eq("aluno_id", id)
          .neq("status_pagamento", "cancelado")
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
          .neq('status', 'template')
          .order('updated_at', { ascending: false }),
        supabaseClient
          .from('nutrition_meal_checkins')
          .select('*')
          .eq('student_id', id)
          .gte('checkin_date', sevenDaysAgo.toISOString().slice(0, 10))
          .order('checkin_date', { ascending: false }),
      ]);

      setProfile(prof as Profile);
      if (prof) {
        // Carregar avatar se existir
        if (prof.avatar_url) {
          setAvatarUrl(getPublicStorageUrl('avatars', prof.avatar_url));
        } else {
          setAvatarUrl(null);
        }
      }

      setFotos(fotosAssinadas);
      setTreinosPdf(treinosAssinados);
      setFichas(
        ([...(fichasData || [])] as FichaTreino[]).sort(
          (a, b) => Number(b.ativo) - Number(a.ativo),
        ),
      );
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
      setHistoricoTreinos(historicoData || []);
      setDigitalPlans((digPlansData || []) as PlanoNutricaoKanbanItem[]);
      const activeDigPlan =
        (digPlansData || []).find((p: any) => p.status === 'active') || null;
      const latestDigPlan = (digPlansData || [])[0] || null;
      setDigitalPlan(activeDigPlan);
      setLatestDigitalPlan(latestDigPlan);
      setDigitalCheckins(checkinsData || []);

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

  const handleDeleteTreino = (treinoId: string, urlPdf: string) => {
    showConfirm({
      title: "Remover arquivo",
      message: "Remover este arquivo de treino permanentemente? Esta ação não pode ser desfeita.",
      confirmLabel: "Remover",
      destructive: true,
      onConfirm: () => void handleDeleteTreinoConfirmed(treinoId, urlPdf),
    });
  };

  const handleDeleteTreinoConfirmed = async (treinoId: string, urlPdf: string) => {
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

  const handleDeleteFicha = (fichaId: string) => {
    showConfirm({
      title: "Excluir ficha",
      message: "Excluir esta ficha permanentemente? Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      destructive: true,
      onConfirm: () => void handleDeleteFichaConfirmed(fichaId),
    });
  };

  const handleDeleteFichaConfirmed = async (fichaId: string) => {
    try {
      const { error } = await supabaseClient.from("fichas_treino").delete().eq("id", fichaId);
      if (error) throw error;
      await load();
    } catch (err: any) {
      setError("Erro ao excluir ficha: " + err.message);
    }
  };

  const handleArchiveFicha = (fichaId: string) => {
    showConfirm({
      title: "Arquivar ficha?",
      message: "A ficha ficará arquivada (bloqueada) neste aluno.",
      confirmLabel: "Arquivar",
      onConfirm: () => void handleArchiveFichaConfirmed(fichaId),
    });
  };

  const handleArchiveFichaConfirmed = async (fichaId: string) => {
    try {
      const { error } = await supabaseClient
        .from("fichas_treino")
        .update({ ativo: false })
        .eq("id", fichaId);
      if (error) throw error;
      await load();
    } catch (err: any) {
      setError("Erro ao arquivar ficha: " + err.message);
    }
  };

  const handleUnarchiveFicha = async (fichaId: string) => {
    try {
      const { error } = await supabaseClient
        .from("fichas_treino")
        .update({ ativo: true })
        .eq("id", fichaId);
      if (error) throw error;
      await load();
    } catch (err: any) {
      setError("Erro ao desarquivar ficha: " + err.message);
    }
  };

  const handleDuplicateFicha = async (ficha: FichaKanbanItem | FichaTreino) => {
    try {
      const coachId = (await getBootstrapProfile())?.userId;
      if (!coachId) throw new Error("Sessão inválida");
      const { error } = await supabaseClient.from("fichas_treino").insert({
        coach_id: coachId,
        aluno_id: id,
        nome_rotina: `${ficha.nome_rotina || "Ficha"} — cópia`,
        configuracao: ficha.configuracao,
        ativo: true,
      });
      if (error) throw error;
      await load();
    } catch (err: any) {
      setError("Erro ao duplicar ficha: " + err.message);
    }
  };

  const handleSolicitarFotos = async () => {
    if (sendingPhotosNotif) return;
    setSendingPhotosNotif(true);
    try {
      const result = await sendCoachNotification(id, 'photos_reminder');
      if (!result.ok) {
        setNotifToastTone('error');
        setNotifToast(result.error);
        return;
      }
      setNotifToastTone('ok');
      setNotifToast(
        result.deduped
          ? 'Fotos já solicitadas (notificação ainda não lida pelo aluno)'
          : 'Notificação de fotos enviada para o aluno',
      );
    } finally {
      setSendingPhotosNotif(false);
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
        .select("id, nome, grupo_muscular, tipo_exercicio, equipamento, video_url")
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
    const existingIds = new Set<string>();
    for (const item of current) {
      if (isBiSetFichaItem(item as never)) {
        const bi = item as { exercicioA?: { id?: string }; exercicioB?: { id?: string } };
        if (bi.exercicioA?.id) existingIds.add(bi.exercicioA.id);
        if (bi.exercicioB?.id) existingIds.add(bi.exercicioB.id);
      } else {
        const id = (item as { id?: string })?.id;
        if (id) existingIds.add(id);
      }
    }
    const novos: ExercicioFicha[] = selected
      .filter((ex) => !existingIds.has(ex.id))
      .map((ex) => {
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
    if (novos.length === 0) {
      setAddExerciseFichaId(null);
      return;
    }
    await handleUpdateFichaExercicios(
      addExerciseFichaId,
      serializeFichaItems([...current, ...novos]),
    );
    setAddExerciseFichaId(null);
  };

  const loadAlunosCoach = async () => {
    setAlunosCoachLoading(true);
    try {
      const coachId = (await getBootstrapProfile())?.userId;
      if (!coachId) { setError("Sessão inválida"); return; }

      const { data: alunosRel, error: relError } = await supabaseClient
        .from("coach_alunos").select("aluno_id").eq("coach_id", coachId);
      if (relError) throw relError;
      if (!alunosRel || alunosRel.length === 0) { setAlunosCoach([]); return; }

      const alunoIds = alunosRel.map(r => r.aluno_id).filter((aid) => aid !== id);
      if (alunoIds.length === 0) { setAlunosCoach([]); return; }

      const { data: profiles, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("id, coaching_reference, full_name, email")
        .in("id", alunoIds)
        .eq("arquivado", false);
      if (profilesError) throw profilesError;

      setAlunosCoach(
        (profiles || []).map((p: any) => ({
          id: p.id,
          nome: p.coaching_reference || p.full_name || p.email || p.id,
        })),
      );
    } catch {
      setError("Erro ao carregar lista de alunos");
      setAlunosCoach([]);
    } finally {
      setAlunosCoachLoading(false);
    }
  };

  const abrirClonarFicha = async (ficha: FichaTreino | FichaKanbanItem) => {
    setClonandoFicha(ficha as FichaTreino);
    await loadAlunosCoach();
  };

  const handleClonarFicha = async (studentIds: string[]) => {
    if (!clonandoFicha || studentIds.length === 0) return;
    setCloning(true);
    try {
      const coachId = (await getBootstrapProfile())?.userId;
      if (!coachId) throw new Error("Sessão inválida");
      const rows = studentIds.map((alunoId) => ({
        coach_id: coachId,
        aluno_id: alunoId,
        nome_rotina: clonandoFicha.nome_rotina,
        configuracao: clonandoFicha.configuracao,
        ativo: true,
      }));
      const { error } = await supabaseClient.from("fichas_treino").insert(rows);
      if (error) throw error;
      setClonandoFicha(null);
    } catch (err: any) {
      setError("Erro ao clonar ficha: " + err.message);
    } finally {
      setCloning(false);
    }
  };



  const handleCancelarHistorico = (itemId: string) => {
    if (itemId === "profile-current") return;
    showConfirm({
      title: "Cancelar pagamento",
      message: "Cancelar este registro de pagamento? Ele deixará de contar no faturamento.",
      confirmLabel: "Cancelar pagamento",
      destructive: true,
      onConfirm: () => void handleCancelarHistoricoConfirmed(itemId),
    });
  };

  const handleCancelarHistoricoConfirmed = async (itemId: string) => {
    setCancellingHistoricoId(itemId);
    setHistoricoMenuId(null);
    setError(null);
    try {
      const { error: cancelError } = await supabaseClient
        .from("aluno_planos_historico")
        .update({ status_pagamento: "cancelado" })
        .eq("id", itemId);
      if (cancelError) throw cancelError;
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCancellingHistoricoId(null);
    }
  };

  const handleDeleteNutritionPlan = (planId: string, pdfUrl: string) => {
    showConfirm({
      title: "Remover plano alimentar",
      message: "Remover este plano alimentar permanentemente? Esta ação não pode ser desfeita.",
      confirmLabel: "Remover",
      destructive: true,
      onConfirm: () => void handleDeleteNutritionPlanConfirmed(planId, pdfUrl),
    });
  };

  const handleDeleteNutritionPlanConfirmed = async (planId: string, pdfUrl: string) => {
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

  const profileName = profile?.coaching_reference || profile?.full_name || "Aluno";

  // Calculations for profile overview
  
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

  /**
   * Histórico vem de aluno_planos_historico. Assinaturas simuladas / seed
   * costumam atualizar só profiles — nesse caso mostramos o plano atual do perfil.
   */
  const historicoExibido = useMemo((): PlanoFinanceiroHistorico[] => {
    if (historicoFinanceiro.length > 0) return historicoFinanceiro;
    if (!profile) return [];
    const hasPlan =
      Boolean(profile.tipo_plano) ||
      profile.valor_plano != null ||
      Boolean(profile.data_inicio) ||
      Boolean(profile.data_expiracao);
    if (!hasPlan) return [];

    const status = (profile.status_pagamento || 'pendente') as PlanoFinanceiroHistorico['status_pagamento'];
    return [
      {
        id: 'profile-current',
        status_pagamento: status === 'pago' || status === 'atrasado' ? status : 'pendente',
        tipo_plano: profile.tipo_plano || 'mensal',
        valor_plano: Number(profile.valor_plano) || 0,
        data_inicio: profile.data_inicio || new Date().toISOString(),
        data_expiracao: profile.data_expiracao || profile.data_inicio || new Date().toISOString(),
        origem: 'profile',
        observacao: 'Plano atual do perfil',
        registrado_em: profile.data_inicio || new Date().toISOString(),
      },
    ];
  }, [historicoFinanceiro, profile]);

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

  /** Sessões agrupadas por dia (para lista scrollável na visão geral). */
  const sessoesRecentes = useMemo(() => {
    const map = new Map<string, {
      key: string;
      dateLabel: string;
      sortKey: string;
      nomeRotina: string;
      exercicios: number;
      satisfacao: string | null;
      nivelDor: number | null;
      exerciciosDetalhe: { nome: string; seriesCompletas: number }[];
    }>();

    for (const h of historicoTreinos) {
      const iso = h.data_conclusao as string | undefined;
      if (!iso) continue;
      const dayKey = iso.slice(0, 10);
      const ds = (h.dados_sessao ?? {}) as Record<string, unknown>;
      const nome = (ds.nome_rotina as string | undefined) || 'Treino';
      const key = `${dayKey}::${nome}`;
      const series = (ds.series as Array<{ completado?: boolean }> | undefined) || [];
      const seriesCompletas = series.filter((s) => s.completado).length;
      const nomeEx = (ds.nome_exercicio as string | undefined) || 'Exercício';
      const satisfacao = (ds.satisfacao_treino as string | null | undefined) || null;
      const nivelDorRaw = ds.nivel_dor;
      const nivelDor =
        typeof nivelDorRaw === 'number'
          ? nivelDorRaw
          : typeof nivelDorRaw === 'string' && nivelDorRaw !== ''
            ? Number(nivelDorRaw)
            : null;

      const existing = map.get(key);
      if (existing) {
        existing.exercicios += 1;
        existing.exerciciosDetalhe.push({ nome: nomeEx, seriesCompletas });
        if (!existing.satisfacao && satisfacao) existing.satisfacao = satisfacao;
        if (existing.nivelDor == null && nivelDor != null && !Number.isNaN(nivelDor)) {
          existing.nivelDor = nivelDor;
        }
      } else {
        map.set(key, {
          key,
          dateLabel: new Date(iso).toLocaleDateString('pt-BR'),
          sortKey: dayKey,
          nomeRotina: nome,
          exercicios: 1,
          satisfacao,
          nivelDor: nivelDor != null && !Number.isNaN(nivelDor) ? nivelDor : null,
          exerciciosDetalhe: [{ nome: nomeEx, seriesCompletas }],
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
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
    <div className="min-h-screen bg-surface-0 p-4 md:p-8 lg:p-10 lg:pl-28 pb-24 text-text-primary font-sans w-full max-w-[min(1600px,96vw)] mx-auto flex flex-col gap-4 md:gap-6">

      {/* ── Back + Profile ── */}
      <div className="relative will-change-transform">
        <BackButton
          onClick={() =>
            router.push(readReturnUrl(window.location.search, "/admin/alunos"))
          }
          className="mb-3 self-start -ml-1 lg:mb-0 lg:absolute lg:-left-12 lg:top-1"
        />

        {/* ── Profile Base Card ── */}
        {profile && (
          <Card className="rounded-2xl border border-brand p-4 bg-brand shadow-[0_12px_32px_rgba(147,51,234,0.35)] relative overflow-visible outline-none">
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.14)_0%,transparent_55%)]" />
          </div>

          <button
            type="button"
            aria-label="Mais opções"
            aria-expanded={profileMenuOpen}
            onClick={() => setProfileMenuOpen((o) => !o)}
            className="absolute top-2.5 right-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <DotsThree size={20} weight="bold" />
          </button>
          {profileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                aria-hidden
                onClick={() => setProfileMenuOpen(false)}
              />
              <div className="absolute right-2.5 top-11 z-30 min-w-[168px] rounded-lg border border-border-subtle bg-surface-1 py-1 shadow-elev-2">
                {!profile.arquivado && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setActiveTab("financeiro");
                      setEditingProfile(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-text-primary hover:bg-surface-2 border-0 bg-transparent cursor-pointer"
                  >
                    <Coins size={14} />
                    Renovar plano
                  </button>
                )}
                {profile.arquivado ? (
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => {
                      setProfileMenuOpen(false);
                      void handleReactivate();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-text-primary hover:bg-surface-2"
                  >
                    Reativar aluno
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => {
                      setProfileMenuOpen(false);
                      void handleDelete();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-danger hover:bg-danger/5"
                  >
                    <Trash size={14} />
                    Desativar acesso
                  </button>
                )}
              </div>
            </>
          )}

          <div className="relative flex items-start gap-3 pr-9">
            {avatarUrl ? (
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/25 shrink-0">
                <img src={avatarUrl || ""} alt={profileName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/15 border border-white/20 flex items-center justify-center font-bold text-lg text-white shrink-0">
                {profileName[0].toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-base font-bold text-white tracking-tight truncate">
                  {profileName}
                </h2>
                {profile.arquivado ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/45" />
                    desativado
                  </span>
                ) : isPaid && !isExpired ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#39c75a]" />
                    ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e05555]" />
                    bloqueado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/70 mt-0.5 truncate">{profile.email}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-white/55">
                {profile.data_inicio && (
                  <span>Início: {new Date(profile.data_inicio).toLocaleDateString("pt-BR")}</span>
                )}
                {ultimaAtividade && (
                  <span>Última: {new Date(ultimaAtividade).toLocaleDateString("pt-BR")}</span>
                )}
              </div>
            </div>
          </div>
        </Card>
        )}
      </div>

      {/* Quick action — Nova Ficha */}
      <button
        type="button"
        onClick={() => router.push(withReturnUrl(`/admin/treinos/nova-ficha?alunoId=${id}`, `/admin/aluno/${id}`))}
        className="inline-flex items-center justify-center gap-1.5 w-full min-h-11 px-3 py-3 bg-brand hover:bg-brand-hover text-text-on-brand text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] border border-brand outline-none"
      >
        <Plus size={14} weight="bold" /> Nova Ficha
      </button>

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

      {/* ── Rotinas (carrossel) + métricas ── */}
      <div className="flex flex-col gap-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          Rotinas
        </p>

        {fichas.length === 0 ? (
          <div className="rounded-xl border-0 bg-surface-1 px-4 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">Nenhuma rotina prescrita</p>
              <p className="text-[11px] text-text-tertiary mt-0.5">
                Crie uma ficha digital para este aluno.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(withReturnUrl(`/admin/treinos/nova-ficha?alunoId=${id}`, `/admin/aluno/${id}`))}
              className="shrink-0 text-[11px] font-semibold text-brand"
            >
              + criar
            </button>
          </div>
        ) : (
          <div
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pt-2 pb-5 scrollbar-hide"
            style={{ scrollPaddingInline: '1rem', WebkitOverflowScrolling: 'touch' }}
          >
            {fichas.map((ficha) => {
              const exCount = parseFichaItems(
                (ficha.configuracao as { exercicios?: unknown[] })?.exercicios || [],
              ).length;
              const menuOpen = routineMenuId === ficha.id;
              return (
                <div
                  key={ficha.id}
                  className="relative w-[min(88%,20rem)] shrink-0 snap-start snap-always rounded-xl border-0 bg-surface-1 px-4 py-3.5 md:w-[min(100%,320px)] shadow-[0_0_0_1px_rgba(147,51,234,0.22),0_2px_16px_rgba(147,51,234,0.35)]"
                >
                  <div className="flex items-start gap-3 pr-7">
                    <div className="w-10 h-10 flex items-center justify-center shrink-0 text-brand">
                      <Barbell size={18} weight="bold" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text-primary truncate leading-tight">
                        {ficha.nome_rotina || "Sem nome"}
                      </p>
                      <p className="text-[11px] text-text-tertiary mt-1">
                        {exCount} exercício{exCount === 1 ? "" : "s"}
                        {ficha.ativo ? " · ativa" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="absolute top-2.5 right-2.5 z-10">
                    <button
                      type="button"
                      aria-label={`Opções de ${ficha.nome_rotina}`}
                      aria-expanded={menuOpen}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (routineMenuId === ficha.id) {
                          setRoutineMenuId(null);
                          setRoutineMenuPos(null);
                          return;
                        }
                        const rect = e.currentTarget.getBoundingClientRect();
                        const menuW = 148;
                        setRoutineMenuPos({
                          top: rect.bottom + 4,
                          left: Math.min(
                            Math.max(8, rect.right - menuW),
                            window.innerWidth - menuW - 8,
                          ),
                        });
                        setRoutineMenuId(ficha.id);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
                    >
                      <DotsThree size={18} weight="bold" />
                    </button>
                  </div>
                </div>
              );
            })}
            {typeof document !== "undefined" &&
              routineMenuId &&
              routineMenuPos &&
              createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[80]"
                    aria-hidden
                    onClick={() => {
                      setRoutineMenuId(null);
                      setRoutineMenuPos(null);
                    }}
                  />
                  <div
                    role="menu"
                    className="fixed z-[90] min-w-[148px] rounded-lg border border-border-subtle bg-surface-1 py-1 shadow-elev-2"
                    style={{ top: routineMenuPos.top, left: routineMenuPos.left }}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        const fichaId = routineMenuId;
                        setRoutineMenuId(null);
                        setRoutineMenuPos(null);
                        router.push(
                          withReturnUrl(
                            `/admin/aluno/${id}/ficha/${fichaId}`,
                            alunoTreinosReturnUrl(id),
                          ),
                        );
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-text-primary hover:bg-surface-2"
                    >
                      <PencilSimple size={14} />
                      Editar
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        const ficha = fichas.find((f) => f.id === routineMenuId);
                        setRoutineMenuId(null);
                        setRoutineMenuPos(null);
                        if (ficha) setSelectedRoutineForPreview(ficha);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-text-primary hover:bg-surface-2"
                    >
                      <Eye size={14} />
                      Visualizar
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        const fichaId = routineMenuId;
                        setRoutineMenuId(null);
                        setRoutineMenuPos(null);
                        if (fichaId) void handleDeleteFicha(fichaId);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-danger hover:bg-danger/5"
                    >
                      <Trash size={14} />
                      Excluir
                    </button>
                  </div>
                </>,
                document.body,
              )}
          </div>
        )}

        <div className="rounded-xl border-0 bg-transparent sm:bg-surface-1 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-center sm:text-left">
          <div>
            <p className="text-[10px] uppercase tracking-[1px] text-text-tertiary">Adesão</p>
            <p
              className={cn(
                "text-base font-semibold mt-0.5",
                adesaoTone === "good" && "text-success",
                adesaoTone === "bad" && "text-danger",
                adesaoTone === "neutral" && "text-text-primary",
              )}
            >
              {adesaoSemanal}%
              {adesaoSuffix && (
                <span className="text-[11px] ml-1 font-medium text-text-tertiary">{adesaoSuffix}</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[1px] text-text-tertiary">Peso</p>
            <p className="text-base font-semibold text-text-primary mt-0.5">
              {ultimoMedidaVal}
              {pesoDeltaLabel && (
                <span className="text-[11px] ml-1 font-medium text-text-tertiary">
                  {pesoDeltaLabel}
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[1px] text-text-tertiary">Vencimento</p>
            <p
              className={cn(
                "text-base font-semibold mt-0.5",
                vencimentoTone === "warn" ? "text-warning" : "text-text-primary",
              )}
            >
              {vencimentoVal}
              {vencimentoTone === "warn" && diasParaVencer != null && diasParaVencer >= 0 && (
                <span className="text-[11px] ml-1 font-medium">atenção</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[1px] text-text-tertiary">Pontos</p>
            <p className="text-base font-semibold text-text-primary mt-0.5 tabular-nums lining-nums">
              {pontosTotais}
              <span className="text-[11px] ml-1 font-medium text-text-tertiary">pts</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div
        className={cn(
          "flex items-center gap-1 bg-surface-1 border-0 p-1 rounded-xl overflow-x-auto shadow-sm",
          "aluno-tabs-scroll",
        )}
      >
        {([
          { key: 'visao-geral', label: 'Visão Geral', icon: User },
          { key: 'treinos', label: 'Treinos', icon: Barbell },
          { key: 'cardio', label: 'Cardio', icon: HeartStraight },
          { key: 'nutricao', label: 'Nutrição', icon: AppleLogo },
          { key: 'evolucao', label: 'Evolução', icon: Ruler },
          { key: 'financeiro', label: 'Financeiro', icon: CreditCard },
          { key: 'fotos', label: 'Fotos', icon: ImageIcon },
        ] as const).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setEditingProfile(false); }}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all shrink-0 whitespace-nowrap bg-transparent border-0",
                activeTab === tab.key
                  ? "text-[13px] font-bold text-brand"
                  : "text-xs font-semibold text-text-secondary hover:text-text-primary",
              )}
            >
              <Icon size={activeTab === tab.key ? 16 : 14} weight={activeTab === tab.key ? 'bold' : 'regular'} />
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
              <div className="bg-surface-1 border-0 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex flex-col divide-y divide-[color:var(--list-row-divider)]">
                  {studentPriorities.length === 0 ? (
                    <div className="py-3 text-center text-xs text-text-tertiary">
                      Tudo em ordem — atleta com planejamento ativo e em dia.
                    </div>
                  ) : (
                    studentPriorities.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 py-2.5 first:pt-0.5 last:pb-0.5"
                      >
                        <div
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            item.type === 'danger' && "bg-danger",
                            item.type === 'warning' && "bg-warning",
                            item.type === 'info' && "bg-info"
                          )}
                        />
                        <span className="min-w-0 flex-1 text-[13px] font-medium text-text-primary leading-snug">
                          {item.desc}
                        </span>
                        <button
                          type="button"
                          disabled={
                            sendingPhotosNotif &&
                            (item.action === 'Solicitar Fotos' || item.action === 'Solicitar Renovação')
                          }
                          onClick={() => {
                            if (
                              item.action === 'Solicitar Fotos' ||
                              item.action === 'Solicitar Renovação'
                            ) {
                              void handleSolicitarFotos();
                              return;
                            }
                            setActiveTab(item.tab);
                          }}
                          className="shrink-0 ml-auto inline-flex items-center gap-1 bg-transparent border-0 px-0 py-1 text-[11px] font-semibold text-brand hover:text-brand-hover transition-colors disabled:opacity-50"
                        >
                          {sendingPhotosNotif &&
                          (item.action === 'Solicitar Fotos' || item.action === 'Solicitar Renovação')
                            ? 'Enviando…'
                            : item.action}{' '}
                          <ArrowRight size={11} weight="bold" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Histórico de Treinos */}
              <div className="bg-surface-1 border-0 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                  Histórico de treinos
                </p>
                {historicoTreinos.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: 'Treinos', value: stats30.workouts.toString(), icon: CalendarBlank },
                        { label: 'Duração', value: `${Math.floor(stats30.minutes / 60)}h ${stats30.minutes % 60}m`, icon: Clock },
                        { label: 'Volume', value: stats30.volume > 0 ? `${(stats30.volume / 1000).toFixed(1)}k kg` : `${stats30.sets} séries`, icon: ChartLine },
                        { label: 'Séries', value: stats30.sets.toString(), icon: Barbell },
                      ].map((stat) => {
                        const Icon = stat.icon;
                        return (
                          <div key={stat.label} className="bg-surface-2/40 border-0 rounded-xl px-2.5 py-2 flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <Icon className="w-3 h-3 text-text-tertiary" />
                              <span className="text-[9px] font-semibold text-text-tertiary uppercase tracking-wider">{stat.label}</span>
                            </div>
                            <p className="text-sm font-bold text-text-primary font-mono tabular-nums lining-nums">{stat.value}</p>
                          </div>
                        );
                      })}
                    </div>

                    <ul className="flex max-h-[18rem] flex-col divide-y divide-[color:var(--list-row-divider)] overflow-y-auto overscroll-contain scrollbar-brand-thin pr-0.5">
                      {sessoesRecentes.map((sessao) => {
                        const expanded = sessaoHistoricoExpandida === sessao.key;
                        const hasFeedback = !!(sessao.satisfacao || sessao.nivelDor != null);
                        const dorColor =
                          sessao.nivelDor == null
                            ? undefined
                            : sessao.nivelDor <= 3
                              ? 'var(--success)'
                              : sessao.nivelDor <= 6
                                ? 'var(--warning)'
                                : 'var(--danger)';
                        return (
                          <li key={sessao.key} className="py-2 first:pt-0.5 last:pb-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setSessaoHistoricoExpandida(expanded ? null : sessao.key)
                              }
                              className="flex w-full items-center gap-3 text-left touch-manipulation"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-medium text-text-primary truncate leading-snug">
                                  {sessao.nomeRotina}
                                </p>
                                <p className="mt-0.5 text-[10px] text-text-tertiary">
                                  {sessao.dateLabel}
                                  {hasFeedback ? ' · com feedback' : ''}
                                </p>
                              </div>
                              <span className="shrink-0 text-[10px] font-semibold tabular-nums lining-nums text-text-secondary">
                                {sessao.exercicios} ex.
                              </span>
                              <CaretDown
                                size={14}
                                className={cn(
                                  'shrink-0 text-text-tertiary transition-transform',
                                  expanded && 'rotate-180',
                                )}
                                aria-hidden
                              />
                            </button>

                            {expanded && (
                              <div className="mt-2 rounded-xl bg-surface-2/50 px-3 py-2.5 space-y-2">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-text-disabled">
                                  Exercícios
                                </p>
                                <ul className="space-y-1.5">
                                  {sessao.exerciciosDetalhe.map((ex, i) => (
                                    <li
                                      key={`${ex.nome}-${i}`}
                                      className="flex items-center justify-between gap-2 text-[12px]"
                                    >
                                      <span className="truncate text-text-primary font-medium">
                                        {ex.nome}
                                      </span>
                                      <span className="shrink-0 tabular-nums text-text-tertiary text-[11px]">
                                        {ex.seriesCompletas}{' '}
                                        {ex.seriesCompletas === 1 ? 'série' : 'séries'}
                                      </span>
                                    </li>
                                  ))}
                                </ul>

                                <div className="pt-2 mt-1 border-t border-border-divider space-y-1.5">
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-text-disabled">
                                    Feedback do aluno
                                  </p>
                                  {hasFeedback ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                      {sessao.satisfacao ? (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-brand/10 border border-brand/20 px-2 py-1 text-[11px] font-semibold text-brand">
                                          <Smiley size={13} weight="fill" aria-hidden />
                                          {sessao.satisfacao}
                                        </span>
                                      ) : null}
                                      {sessao.nivelDor != null ? (
                                        <span
                                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold border"
                                          style={{
                                            color: dorColor,
                                            borderColor: `color-mix(in srgb, ${dorColor} 35%, transparent)`,
                                            background: `color-mix(in srgb, ${dorColor} 12%, transparent)`,
                                          }}
                                        >
                                          Dor {sessao.nivelDor}/10
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-text-tertiary">
                                      Sem avaliação de satisfação/dor nesta sessão.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : (
                  <p className="text-xs text-text-tertiary py-1">
                    Sem treinos concluídos ainda — os dados aparecem aqui após o primeiro treino registrado.
                  </p>
                )}
              </div>

              <AlunoObservacoesCard
                alunoId={id}
                coachId={coachUserId}
                legacyOrientacoes={profile?.orientacoes}
              />

            </div>

            {/* Direita: Plano */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <StudentPlanCard
                planLabel={planDisplayName(profile?.tipo_plano, planosPersonalizados)}
                valorPlano={profile?.valor_plano}
                dataInicio={profile?.data_inicio}
                dataExpiracao={profile?.data_expiracao}
                isActive={isPaid && !isExpired}
                onManage={() => setActiveTab('financeiro')}
              />

              <div className="bg-surface-1 border-0 rounded-2xl p-4 shadow-sm">
                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text-tertiary font-medium">Último check-in</span>
                    <span className="font-bold text-text-primary">
                      {profile?.ultimo_checkin ? new Date(profile.ultimo_checkin).toLocaleDateString("pt-BR") : "Nenhum"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text-tertiary font-medium">Total de pontos</span>
                    <span className="font-bold text-text-primary tabular-nums lining-nums">{pontosTotais} pts</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── TREINOS TAB ── */}
        {activeTab === 'treinos' && (
          <div className="flex flex-col gap-4">

            <FichasKanban
              fichas={fichas as FichaKanbanItem[]}
              alunoId={id}
              currentFichaId={activeFicha?.id ?? null}
              onReorderFichas={handleReorderFichas}
              onUpdateFichaExercicios={handleUpdateFichaExercicios}
              onDeleteFicha={handleDeleteFicha}
              onCloneFicha={(f) => void abrirClonarFicha(f)}
              onDuplicateFicha={(f) => void handleDuplicateFicha(f)}
              onArchiveFicha={handleArchiveFicha}
              onUnarchiveFicha={(fichaId) => void handleUnarchiveFicha(fichaId)}
              onFichaSaved={() => void load()}
              onAddExercise={(fichaId) => void openAddExercise(fichaId)}
            />

            {/* Dinâmica de Carga */}
            <div className="rounded-2xl bg-surface-1 border-0 p-4 md:p-5">
              <WorkoutLoadReport
                alunoId={id}
                profileName={profile?.full_name ?? ''}
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border-0 bg-surface-2 text-[11px] font-semibold text-white hover:bg-surface-3 transition-colors"
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
                      "flex items-center justify-center gap-2 min-h-12 md:min-h-20 rounded-lg transition-all",
                      "md:border md:border-dashed",
                      pdfFile
                        ? "border-brand/50 bg-brand/5 md:border-brand/50"
                        : "bg-surface-2 md:border-transparent md:bg-surface-1 md:hover:border-brand/40",
                    )}>
                      <UploadSimple className={cn("w-4 h-4 shrink-0", pdfFile ? "text-brand" : "text-[#7a8aab]")} />
                      <span className={cn("text-xs text-center px-4 truncate max-w-full", pdfFile ? "text-white font-medium" : "text-[#7a8aab]")}>
                        {pdfFile ? (
                          pdfFile.name
                        ) : (
                          <>
                            <span className="md:hidden">Toque para selecionar o PDF</span>
                            <span className="hidden md:inline">Clique ou arraste o PDF do treino</span>
                          </>
                        )}
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
                              <a href={t.url_pdf} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:underline font-semibold">
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

            <PlanosNutricaoKanban
              planos={digitalPlans}
              alunoId={id}
              checkins={digitalCheckins}
              onRefresh={() => void load()}
            />

            {/* Seção 2: PDF compacto / colapsável */}
            <div className="bg-surface-1 border-0 rounded-xl">
              <div className="min-h-14 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setNutritionPdfOpen((open) => !open)}
                  className="flex items-center gap-2 min-w-0 text-left"
                  aria-expanded={nutritionPdfOpen}
                >
                  <FilePdf size={16} className="text-text-tertiary shrink-0" />
                  <span className="text-[13px] text-text-secondary font-medium">
                    Plano em PDF
                  </span>
                  {planosAlimentares.length > 0 && (
                    <span className="text-[11px] text-text-tertiary tabular-nums">
                      {planosAlimentares.length} arquivo{planosAlimentares.length === 1 ? '' : 's'}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setUploadNutritionOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border-0 bg-surface-2 text-[11px] font-semibold text-text-primary hover:bg-surface-3 transition-colors shrink-0"
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
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-2/40 border-0">
                          <div className="min-w-0">
                            <p className="text-xs text-text-primary truncate font-medium">{p.nome_arquivo}</p>
                            <span className="text-[10px] text-text-tertiary font-mono">
                              {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={p.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brand hover:underline font-semibold"
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
                    <p className="text-xs text-text-tertiary py-2">
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
                <MeasurementsView
                  variant="embedded"
                  readOnly
                  medicoes={medidas as MedicaoRecord[]}
                  headerAction={
                    medidas.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleExportPDF}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-brand px-4 py-2 text-xs font-semibold text-text-primary shadow-sm transition-all duration-200 hover:bg-brand-hover"
                      >
                        <FilePdf className="h-4 w-4" /> Exportar Relatório PDF
                      </button>
                    ) : null
                  }
                />
              </div>

              {/* Tabela de Medidas Corporais */}
              <div className="bg-surface-1 border-0 rounded-2xl p-6 shadow-sm">
                {medidas.length > 0 ? (
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-xs min-w-[600px]">
                      <thead>
                        <tr>
                          <th className="pb-3 text-left font-semibold text-brand uppercase">Data</th>
                          <th className="pb-3 text-center font-semibold text-brand uppercase">Peso</th>
                          <th className="pb-3 text-center font-semibold text-brand uppercase">Gordura</th>
                          <th className="pb-3 text-center font-semibold text-brand uppercase">Cintura</th>
                          <th className="pb-3 text-center font-semibold text-brand uppercase">Peitoral</th>
                          <th className="pb-3 text-center font-semibold text-brand uppercase">Braço E</th>
                          <th className="pb-3 text-center font-semibold text-brand uppercase">Braço D</th>
                          <th className="pb-3 text-center font-semibold text-brand uppercase">Coxa E</th>
                          <th className="pb-3 text-center font-semibold text-brand uppercase">Coxa D</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medidas.map((m: any) => (
                          <tr key={m.id} className="hover:bg-surface-2/40 transition-colors">
                            <td className="py-3 font-semibold text-text-primary">
                              {new Date(m.data_medicao).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                              })}
                            </td>
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
                  <div className="max-h-[10.5rem] overflow-y-auto overscroll-contain pr-0.5 flex flex-col gap-3 scrollbar-brand-thin">
                    {Array.from(sessoesPorData.entries()).map(([dia, sessao]) => {
                      const ds0 = (sessao[0]?.dados_sessao ?? {}) as Record<string, unknown>;
                      const satisfacao = (ds0.satisfacao_treino as string | null | undefined) || null;
                      const nivelDorRaw = ds0.nivel_dor;
                      const nivelDor =
                        typeof nivelDorRaw === 'number'
                          ? nivelDorRaw
                          : typeof nivelDorRaw === 'string' && nivelDorRaw !== ''
                            ? Number(nivelDorRaw)
                            : null;
                      const hasFeedback = !!(satisfacao || (nivelDor != null && !Number.isNaN(nivelDor)));
                      const dorColor =
                        nivelDor == null || Number.isNaN(nivelDor)
                          ? undefined
                          : nivelDor <= 3
                            ? 'var(--success)'
                            : nivelDor <= 6
                              ? 'var(--warning)'
                              : 'var(--danger)';

                      return (
                      <div key={dia} className="rounded-xl bg-surface-1 border-0 overflow-hidden">
                        <div className="px-3 py-1.5 bg-surface-3 border-b border-divider flex items-center justify-between text-[9px] uppercase tracking-wider font-bold text-text-tertiary">
                          <span>{dia}</span>
                          <span className="truncate max-w-[120px]">{(ds0.nome_rotina as string) || "Treino"}</span>
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
                        {hasFeedback && (
                          <div className="px-3 py-2.5 border-t border-divider bg-surface-2/40 flex flex-wrap items-center gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-text-disabled w-full mb-0.5">
                              Feedback
                            </span>
                            {satisfacao ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-brand/10 border border-brand/20 px-2 py-1 text-[11px] font-semibold text-brand">
                                <Smiley size={13} weight="fill" aria-hidden />
                                {satisfacao}
                              </span>
                            ) : null}
                            {nivelDor != null && !Number.isNaN(nivelDor) ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold border"
                                style={{
                                  color: dorColor,
                                  borderColor: `color-mix(in srgb, ${dorColor} 35%, transparent)`,
                                  background: `color-mix(in srgb, ${dorColor} 12%, transparent)`,
                                }}
                              >
                                Dor {nivelDor}/10
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                      );
                    })}
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

              <button
                type="button"
                onClick={() => setEditingProfile(true)}
                className="inline-flex items-center gap-1.5 self-start bg-transparent border-0 px-0 py-1 text-[12px] font-semibold text-brand hover:text-brand-hover transition-colors"
              >
                <Coins className="w-4 h-4" />
                Renovar plano
              </button>
            </div>

            {/* Histórico de planos */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              <div className="bg-surface-1 border-0 rounded-2xl p-6 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-3">
                  Histórico de planos
                </p>
                {historicoExibido.length === 0 ? (
                  <p className="text-xs text-text-tertiary">
                    Ainda não há registros de planos para este aluno.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {historicoExibido.map((item) => {
                      const dataCaixa =
                        item.data_pagamento?.slice(0, 10) ||
                        item.registrado_em;
                      const formaLabel =
                        item.forma_pagamento &&
                        item.forma_pagamento in FORMA_PAGAMENTO_LABEL
                          ? FORMA_PAGAMENTO_LABEL[
                              item.forma_pagamento as FormaPagamento
                            ]
                          : null;
                      const canCancel =
                        item.origem !== "profile" && item.id !== "profile-current";
                      return (
                        <div
                          key={item.id}
                          className="relative flex items-center justify-between rounded-xl border-0 bg-surface-2/40 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-text-primary capitalize">
                              {planDisplayName(item.tipo_plano, planosPersonalizados)}
                              {item.origem === "profile" ? (
                                <span className="ml-1.5 text-[9px] font-semibold uppercase text-brand">
                                  atual
                                </span>
                              ) : null}
                            </p>
                            <p className="text-[10px] text-text-tertiary">
                              {new Date(dataCaixa).toLocaleDateString("pt-BR")}
                              {formaLabel ? ` · ${formaLabel}` : ""}
                              {" · "}
                              {new Date(item.data_inicio).toLocaleDateString("pt-BR")} →{" "}
                              {new Date(item.data_expiracao).toLocaleDateString("pt-BR")}
                            </p>
                            {item.observacao ? (
                              <p className="text-[10px] text-text-disabled mt-0.5 truncate">
                                {item.observacao}
                              </p>
                            ) : null}
                          </div>
                          <div className="ml-3 shrink-0 flex items-start gap-1">
                            <div className="text-right">
                              <p
                                className={cn(
                                  "text-xs font-bold font-kpi tabular-nums lining-nums",
                                  item.status_pagamento === "pago"
                                    ? "text-success"
                                    : "text-text-primary",
                                )}
                              >
                                {item.valor_plano.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </p>
                              <span
                                className={cn(
                                  "text-[9px] font-bold uppercase",
                                  item.status_pagamento === "pago"
                                    ? "text-success"
                                    : "text-warning",
                                )}
                              >
                                {item.status_pagamento}
                              </span>
                            </div>
                            {canCancel && (
                              <div className="relative">
                                <button
                                  type="button"
                                  aria-label="Mais opções do registro"
                                  onClick={() =>
                                    setHistoricoMenuId((cur) =>
                                      cur === item.id ? null : item.id,
                                    )
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 border-0 bg-transparent cursor-pointer"
                                >
                                  <DotsThree size={16} weight="bold" />
                                </button>
                                {historicoMenuId === item.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-20"
                                      aria-hidden
                                      onClick={() => setHistoricoMenuId(null)}
                                    />
                                    <div className="absolute right-0 top-8 z-30 min-w-[148px] rounded-lg border border-border-subtle bg-surface-1 py-1 shadow-elev-2">
                                      <button
                                        type="button"
                                        disabled={cancellingHistoricoId === item.id}
                                        onClick={() =>
                                          void handleCancelarHistorico(item.id)
                                        }
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-danger hover:bg-danger/5 border-0 bg-transparent cursor-pointer disabled:opacity-50"
                                      >
                                        {cancellingHistoricoId === item.id
                                          ? "Cancelando…"
                                          : "Cancelar registro"}
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        <RenovarPlanoModal
          open={editingProfile}
          onClose={() => setEditingProfile(false)}
          onSaved={() => load()}
          alunoId={id}
          alunoNome={profileName}
          profile={{
            status_pagamento: profile?.status_pagamento,
            tipo_plano: profile?.tipo_plano,
            valor_plano: profile?.valor_plano,
            data_expiracao: profile?.data_expiracao,
          }}
          planosPersonalizados={planosPersonalizados}
        />

        {/* ── FOTOS TAB ── */}
        {activeTab === 'fotos' && (
          <div className="bg-surface-1 border-0 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-6">
              <button
                type="button"
                disabled={sendingPhotosNotif}
                onClick={() => void handleSolicitarFotos()}
                className="inline-flex items-center gap-1.5 bg-transparent border-0 px-0 py-1 text-[12px] font-semibold text-brand hover:text-brand-hover transition-colors disabled:opacity-50"
              >
                {sendingPhotosNotif ? 'Enviando…' : 'Solicitar fotos'}
                <ArrowRight size={12} weight="bold" />
              </button>
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
                <button
                  type="button"
                  disabled={sendingPhotosNotif}
                  onClick={() => void handleSolicitarFotos()}
                  className="mt-1 inline-flex items-center gap-1 bg-transparent border-0 text-[12px] font-semibold text-brand hover:text-brand-hover disabled:opacity-50"
                >
                  {sendingPhotosNotif ? 'Enviando…' : 'Solicitar fotos ao aluno'}
                  <ArrowRight size={12} weight="bold" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CARDIO TAB ── */}
        {activeTab === 'cardio' && <CoachCardioTab alunoId={id} />}

      </div>

      {notifToast && (
        <div
          role="status"
          className="fixed left-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[70] flex max-w-[min(92vw,360px)] -translate-x-1/2 items-center gap-2 rounded-xl border border-border-subtle bg-surface-1 px-3.5 py-2.5 text-[12px] font-medium text-text-primary shadow-elev-2 animate-backdrop-in"
        >
          {notifToastTone === 'error' ? (
            <WarningCircle size={16} weight="bold" className="shrink-0 text-danger" />
          ) : (
            <Check size={16} weight="bold" className="shrink-0 text-success" />
          )}
          <span>{notifToast}</span>
        </div>
      )}

      {addExerciseFichaId && (() => {
        const ficha = fichas.find((f) => f.id === addExerciseFichaId);
        const current = parseFichaItems(
          (ficha?.configuracao as { exercicios?: unknown[] })?.exercicios || [],
        );
        const existingIds = new Set<string>();
        for (const item of current) {
          if (isBiSetFichaItem(item as never)) {
            const bi = item as { exercicioA?: { id?: string }; exercicioB?: { id?: string } };
            if (bi.exercicioA?.id) existingIds.add(bi.exercicioA.id);
            if (bi.exercicioB?.id) existingIds.add(bi.exercicioB.id);
          } else {
            const eid = (item as { id?: string })?.id;
            if (eid) existingIds.add(eid);
          }
        }
        return (
          <ExerciseLibraryModal
            catalog={exerciseCatalog}
            existingIds={existingIds}
            onClose={() => setAddExerciseFichaId(null)}
            onAdd={(selected) => void handleAddExercisesToFicha(selected)}
          />
        );
      })()}

      {/* Modal de upload de nutrição */}
      <UploadNutritionPlan
        isOpen={uploadNutritionOpen}
        onClose={() => setUploadNutritionOpen(false)}
        alunoId={id}
        alunoName={profile?.full_name || "Aluno"}
        onUploadSuccess={() => { setUploadNutritionOpen(false); load(); }}
      />

      {/* Modal Clonar Ficha */}
      <CloneToStudentsModal
        open={!!clonandoFicha}
        title="Clonar ficha"
        subtitle={clonandoFicha?.nome_rotina}
        students={alunosCoach}
        loadingStudents={alunosCoachLoading}
        confirming={cloning}
        onClose={() => setClonandoFicha(null)}
        onConfirm={(ids) => void handleClonarFicha(ids)}
      />

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

      {/* ── Confirm Modal ── */}
      {confirmModal && (() => {
        const m = confirmModal;
        return (
          <ConfirmModal
            title={m.title}
            message={m.message}
            confirmLabel={m.confirmLabel}
            destructive={m.destructive}
            onConfirm={() => { setConfirmModal(null); m.onConfirm(); }}
            onCancel={() => setConfirmModal(null)}
          />
        );
      })()}
    </div>
  );
}
