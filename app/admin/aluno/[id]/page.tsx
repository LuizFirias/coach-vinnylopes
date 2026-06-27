"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
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
  Trophy,
  Ruler,
  Copy,
  X,
  DownloadSimple,
  CircleNotch,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import PageHeader from "@/app/components/PageHeader";
import { pdf } from "@react-pdf/renderer";
import { getDinamicaCargaReport } from "@/lib/reports/getDinamicaCargaReport";
import { DinamicaCargaReportDocument } from "@/app/components/reports/DinamicaCargaReportDocument";

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

const fieldCls = cn(
  "w-full px-4 py-2.5 rounded-[6px] text-sm text-text-primary",
  "bg-surface-3 border border-border-default",
  "focus:outline-none focus:border-brand transition-colors",
  "appearance-none"
);

function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function parseDateSafe(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
  }
  return new Date(value);
}

function formatDatePtBrSafe(value: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  return parseDateSafe(value).toLocaleDateString("pt-BR", options);
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
  const [editValorPlano, setEditValorPlano] = useState<string>("");
  const [editDataInicio, setEditDataInicio] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [planosAlimentares, setPlanosAlimentares] = useState<any[]>([]);
  const [uploadNutritionOpen, setUploadNutritionOpen] = useState(false);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [selectedNewCoach, setSelectedNewCoach] = useState<string | null>(null);
  const [changingCoach, setChangingCoach] = useState(false);
  const [currentCoachId, setCurrentCoachId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [ultimaAtividade, setUltimaAtividade] = useState<string | null>(null);
  const [pontosTotais, setPontosTotais] = useState<number>(0);
  const [diasParaRenovacao, setDiasParaRenovacao] = useState<number | null>(null);
  const [mostrarAvisoRenovacao, setMostrarAvisoRenovacao] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [historicoTreinos, setHistoricoTreinos] = useState<any[]>([]);
  const [notasOriginais, setNotasOriginais] = useState<string>("");
  const [salvandoNotas, setSalvandoNotas] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [pdfPeriod, setPdfPeriod] = useState<'semanal' | 'mensal'>('semanal');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) setActiveTab(tab);
    }
  }, []);

  useEffect(() => { load(); }, [id]);

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

  const handleDownloadReport = async (periodo: 'semanal' | 'mensal') => {
    setGeneratingPdf(true);
    try {
      const reportData = await getDinamicaCargaReport(id, periodo);
      const blob = await pdf(<DinamicaCargaReportDocument data={reportData} />).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-carga-${reportData.aluno.nome.toLowerCase().replace(/\s+/g, '-')}-${periodo}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Erro ao gerar relatório:', err);
      alert('Erro ao gerar o relatório. Tente novamente.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const load = async () => {
    setError(null);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      let isAdmin = false;
      if (authData.user) {
        const { data: userData } = await supabaseClient
          .from("profiles").select("role").eq("id", authData.user.id).single();
        isAdmin = userData?.role === "super_admin";
        setIsSuperAdmin(isAdmin);

        if (userData?.role === "coach") {
          const { data: ownership } = await supabaseClient
            .from("coach_alunos")
            .select("aluno_id")
            .eq("coach_id", authData.user.id)
            .eq("aluno_id", id)
            .maybeSingle();
          if (!ownership) {
            setError("Acesso negado: este aluno não pertence ao seu perfil.");
            return;
          }
        }
      }

      const { data: prof } = await supabaseClient.from("profiles").select("*").eq("id", id).single();
      setProfile(prof as Profile);
      if (prof) {
        setEditStatus(prof.status_pagamento || "pago");
        setEditPlano(prof.tipo_plano || "mensal");
        setEditValorPlano(prof.valor_plano != null ? String(prof.valor_plano) : "");
        setEditDataInicio(toDateInputValue(prof.data_inicio));
        setNotasOriginais(prof.orientacoes || "");

        // Carregar avatar se existir
        if (prof.avatar_url) {
          setAvatarUrl(getPublicStorageUrl('avatars', prof.avatar_url));
        } else {
          setAvatarUrl(null);
        }
      }

      const { data: fotosData } = await supabaseClient
        .from("fotos_evolucao").select("id, posicao, url_foto, data_upload")
        .eq("aluno_id", id).order("data_upload", { ascending: false }).limit(10);

      const fotosAssinadas = await Promise.all((fotosData || []).map(async (f: any) => {
        const { data: signedData } = await supabaseClient.storage.from("evolucao-fotos").createSignedUrl(f.url_foto, 3600);
        return { ...f, url_foto: signedData?.signedUrl || f.url_foto };
      }));
      setFotos(fotosAssinadas);

      const { data: treinosData } = await supabaseClient
        .from("treinos_alunos").select("*").eq("aluno_id", id).order("data_upload", { ascending: false });
      const treinosAssinados = await Promise.all((treinosData || []).map(async (t: any) => {
        const signed = await getSignedStorageUrl("treinos-pdf", t.url_pdf, 3600);
        return { ...t, original_url_pdf: t.url_pdf, url_pdf: signed || t.url_pdf };
      }));
      setTreinosPdf(treinosAssinados);

      const { data: fichasData } = await supabaseClient
        .from("fichas_treino").select("*").eq("aluno_id", id).eq("ativo", true).order("criado_em", { ascending: false });
      setFichas((fichasData || []) as FichaTreino[]);

      const { data: medidasData } = await supabaseClient
        .from("medidas_aluno")
        .select("id, peso, peitoral, cintura, braco_esquerdo, braco_direito, coxa_esquerda, coxa_direita, panturrilha_direita, data_medicao, gordura_corporal")
        .eq("aluno_id", id).order("data_medicao", { ascending: false });
      setMedidas(medidasData || []);

      const { data: planosData } = await supabaseClient
        .from("plano_alimentar_pdf").select("*").eq("aluno_id", id).order("criado_em", { ascending: false });
      const planosAssinados = await Promise.all((planosData || []).map(async (p: any) => {
        const pdfPath = p.url_pdf || p.pdf_url;
        if (!pdfPath) return p;
        const signed = await getSignedStorageUrl("plano_alimentar", pdfPath, 3600);
        return { ...p, pdf_url: signed || pdfPath, original_path: pdfPath };
      }));
      setPlanosAlimentares(planosAssinados);

      if (isSuperAdmin) {
        const { data: coachesData } = await supabaseClient
          .from("profiles").select("id, full_name").eq("role", "coach").order("full_name", { ascending: true });
        setCoaches(coachesData || []);
      }
      if (prof?.coach_id) {
        setCurrentCoachId(prof.coach_id);
        setSelectedNewCoach(prof.coach_id);
      }

      const { data: ultimaFicha } = await supabaseClient
        .from("historico_treinos").select("data_conclusao").eq("aluno_id", id)
        .order("data_conclusao", { ascending: false }).limit(1).maybeSingle();
      const { data: ultimoCheckin } = await supabaseClient
        .from("treinos_manuais").select("data_treino").eq("aluno_id", id).eq("concluido", true)
        .order("data_treino", { ascending: false }).limit(1).maybeSingle();

      let dataUltimaAtividade: string | null = null;
      if (ultimaFicha && ultimoCheckin) {
        dataUltimaAtividade = parseDateSafe(ultimaFicha.data_conclusao) > parseDateSafe(ultimoCheckin.data_treino)
          ? ultimaFicha.data_conclusao : ultimoCheckin.data_treino;
      } else if (ultimaFicha) {
        dataUltimaAtividade = ultimaFicha.data_conclusao;
      } else if (ultimoCheckin) {
        dataUltimaAtividade = ultimoCheckin.data_treino;
      }
      setUltimaAtividade(dataUltimaAtividade);

      const { data: pontuacaoData } = await supabaseClient
        .from("pontuacao_alunos").select("total_pontos").eq("aluno_id", id).maybeSingle();
      setPontosTotais(pontuacaoData?.total_pontos || 0);

      const { data: historicoData } = await supabaseClient
        .from("historico_treinos")
        .select("id, data_conclusao, dados_sessao")
        .eq("aluno_id", id)
        .order("data_conclusao", { ascending: false })
        .limit(30);
      setHistoricoTreinos(historicoData || []);

      // Calcular dias para renovação
      if (prof?.data_expiracao) {
        const hoje = new Date();
        const dataExp = parseDateSafe(prof.data_expiracao);
        const diffTime = dataExp.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDiasParaRenovacao(diffDays);
        setMostrarAvisoRenovacao(diffDays > 0 && diffDays <= 5);
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

  const abrirClonarFicha = async (ficha: FichaTreino) => {
    setClonandoFicha(ficha);
    setAlunoAlvoId("");
    if (alunosCoach.length === 0) {
      try {
        const { data: authData } = await supabaseClient.auth.getUser();
        const coachId = authData?.user?.id;
        if (!coachId) {
          setError("Sessão inválida");
          return;
        }

        // Buscar alunos do coach
        const { data: alunosRel, error: relError } = await supabaseClient
          .from("coach_alunos")
          .select("aluno_id")
          .eq("coach_id", coachId);

        if (relError) {
          console.error("Erro ao buscar relação coach-alunos:", relError);
          setError("Erro ao carregar alunos");
          return;
        }

        if (!alunosRel || alunosRel.length === 0) {
          setAlunosCoach([]);
          return;
        }

        // Buscar perfis dos alunos
        const alunoIds = alunosRel.map(r => r.aluno_id);
        const { data: profiles, error: profilesError } = await supabaseClient
          .from("profiles")
          .select("id, coaching_reference, email")
          .in("id", alunoIds);

        if (profilesError) {
          console.error("Erro ao buscar perfis:", profilesError);
          setError("Erro ao carregar perfis dos alunos");
          return;
        }

        const lista = (profiles || [])
          .map((p: any) => ({
            id: p.id,
            nome: p.coaching_reference || p.email || p.id,
          }))
          .filter(a => a.id !== id);

        setAlunosCoach(lista);
      } catch (err: any) {
        console.error("Erro ao abrir modal de clonar:", err);
        setError("Erro ao carregar lista de alunos");
      }
    }
  };

  const handleClonarFicha = async () => {
    if (!clonandoFicha || !alunoAlvoId) return;
    setCloning(true);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) throw new Error("Sessão inválida");
      const { error } = await supabaseClient.from("fichas_treino").insert({
        coach_id: coachId,
        aluno_id: alunoAlvoId,
        nome_rotina: clonandoFicha.nome_rotina,
        configuracao: clonandoFicha.configuracao,
        ativo: true,
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

  const handleChangeCoach = async () => {
    if (!selectedNewCoach) return setError("Selecione um coach");
    if (selectedNewCoach === currentCoachId) return setError("Este é o coach atual do aluno");
    if (!window.confirm("Deseja transferir este aluno para outro coach?")) return;
    setChangingCoach(true);
    setError(null);
    try {
      if (currentCoachId) {
        await supabaseClient.from("coach_alunos").delete().eq("coach_id", currentCoachId).eq("aluno_id", id);
      }
      const { error: insertError } = await supabaseClient.from("coach_alunos").insert([{ coach_id: selectedNewCoach, aluno_id: id }]);
      if (insertError && !insertError.message.includes("unique")) throw insertError;
      const { error: updateError } = await supabaseClient.from("profiles").update({ coach_id: selectedNewCoach }).eq("id", id);
      if (updateError) throw updateError;
      setCurrentCoachId(selectedNewCoach);
      await load();
    } catch (err: any) {
      setError("Erro ao transferir aluno: " + err.message);
      setSelectedNewCoach(currentCoachId);
    } finally {
      setChangingCoach(false);
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
      const dataInicio = parseDateSafe(editDataInicio);
      let dataExpiracao = parseDateSafe(editDataInicio);
      switch (editPlano) {
        case "mensal":     dataExpiracao.setMonth(dataExpiracao.getMonth() + 1); break;
        case "trimestral": dataExpiracao.setMonth(dataExpiracao.getMonth() + 3); break;
        case "semestral":  dataExpiracao.setMonth(dataExpiracao.getMonth() + 6); break;
        case "anual":      dataExpiracao.setFullYear(dataExpiracao.getFullYear() + 1); break;
      }
      const valorPlanoNumber = editValorPlano.trim().length ? Number(editValorPlano.replace(",", ".")) : null;
      const { error } = await supabaseClient.from("profiles").update({
        status_pagamento: editStatus,
        tipo_plano: editPlano,
        valor_plano: Number.isFinite(valorPlanoNumber) ? valorPlanoNumber : null,
        data_inicio: toDateInputValue(dataInicio.toISOString()),
        data_expiracao: toDateInputValue(dataExpiracao.toISOString()),
      }).eq("id", id);
      if (error) throw error;
      await load();
      setEditingProfile(false);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const AVATAR_COLORS = [
    "from-amber-500/50 to-amber-700/30",
    "from-orange-500/50 to-orange-700/30",
    "from-yellow-500/50 to-yellow-700/30",
    "from-brand/50 to-brand/20",
  ];
  const avatarGrad = (name: string) =>
    AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

  const profileName = profile?.coaching_reference || profile?.full_name || "Aluno";

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-16 xl:pl-[240px]">
      <div className="max-w-[1440px] px-6 md:px-10 py-8 mx-auto w-full flex flex-col gap-6 animate-fade-in">
        
        {/* Header */}
        <PageHeader
          title={profileName}
          subtitle={profile?.email || ""}
          breadcrumbs={[
            { label: "Atletas", href: "/admin/alunos" },
            { label: profileName }
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Gear className={cn("w-4 h-4 transition-transform", editingProfile && "rotate-90")} />}
                onClick={() => setEditingProfile(!editingProfile)}
              >
                {editingProfile ? "Cancelar" : "Gerir plano"}
              </Button>
              {profile?.arquivado ? (
                <Button
                  variant="primary"
                  size="sm"
                  loading={deleting}
                  onClick={handleReactivate}
                >
                  Reativar
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash className="w-4 h-4" />}
                  loading={deleting}
                  onClick={handleDelete}
                >
                  Desativar
                </Button>
              )}
            </div>
          }
        />

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[6px] bg-danger-subtle border border-danger-border text-danger text-sm">
            <WarningCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Aviso de Renovação */}
        {mostrarAvisoRenovacao && diasParaRenovacao !== null && (
          <div className="relative overflow-hidden rounded-[10px] bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
            <div className="relative flex items-center gap-3 px-4 py-4">
              <div className="w-10 h-10 rounded-[6px] bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-200">
                  Renovação próxima
                </p>
                <p className="text-xs text-amber-300/80">
                  {diasParaRenovacao === 1
                    ? "Plano vence amanhã!"
                    : `Faltam ${diasParaRenovacao} dias para o vencimento do plano`}
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-amber-500/30 border border-amber-500/50">
                <span className="text-xs font-bold text-amber-200 tabular-nums">
                  {diasParaRenovacao}d
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main Identity Info Section (Compact header status) */}
        {profile && (
          <Card className="rounded-[10px] shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-border-subtle flex-shrink-0 shadow-sm">
                    <img src={avatarUrl} alt={profileName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={cn(
                    "w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-lg text-white flex-shrink-0 shadow-sm border border-border-subtle",
                    avatarGrad(profileName)
                  )}>
                    {profileName[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold text-text-primary">
                    {profileName}
                  </h2>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wide",
                    profile.arquivado
                      ? "bg-surface-3 border border-border-default text-text-disabled"
                      : profile.status_pagamento === "pago"
                        ? "bg-brand-subtle border border-brand-border text-brand"
                        : "bg-danger-subtle border border-danger-border text-danger"
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      profile.arquivado
                        ? "bg-text-disabled"
                        : profile.status_pagamento === "pago" ? "bg-brand animate-pulse" : "bg-danger"
                    )} />
                    {profile.arquivado
                      ? "Desativado"
                      : profile.status_pagamento === "pago" ? "Ativo" : "Pendente"}
                  </span>
                </div>
              </div>

              {/* Pontos */}
              <div className="relative overflow-hidden flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-brand-subtle border border-brand-border w-fit shrink-0">
                <Trophy className="w-4 h-4 text-brand" />
                <span className="text-xs font-bold text-brand tabular-nums">{pontosTotais} pontos</span>
              </div>
            </div>

            {/* Formulário de edição do plano */}
            {editingProfile && (
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <p className="text-xs font-semibold text-text-tertiary mb-3">Atualizar plano</p>
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-text-secondary">Status financeiro</label>
                      <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={fieldCls}>
                        <option value="pago">Pago</option>
                        <option value="pendente">Pendente</option>
                        <option value="atrasado">Em atraso</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-text-secondary">Periodicidade</label>
                      <select value={editPlano} onChange={(e) => setEditPlano(e.target.value)} className={fieldCls}>
                        <option value="mensal">Mensal (30d)</option>
                        <option value="trimestral">Trimestral (90d)</option>
                        <option value="semestral">Semestral (180d)</option>
                        <option value="anual">Anual (365d)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-text-secondary">Valor (R$)</label>
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
                  <div className="flex flex-col gap-1.5 max-w-xs">
                    <label className="text-xs font-medium text-text-secondary">Data de início do ciclo</label>
                    <input
                      type="date"
                      value={editDataInicio}
                      onChange={(e) => setEditDataInicio(e.target.value)}
                      className={cn(fieldCls, "text-brand")}
                      required
                    />
                  </div>
                  <div>
                    <Button type="submit" loading={savingProfile} size="sm">
                      Confirmar atualização
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </Card>
        )}

        {/* Tab system navigation */}
        <div className="flex border-b border-border-subtle gap-2 overflow-x-auto scrollbar-none">
          {[
            { value: "overview", label: "Visão Geral" },
            { value: "treinos", label: "Treinos" },
            { value: "nutricao", label: "Nutrição" },
            { value: "medidas", label: "Medidas & Evolução" },
            { value: "notas", label: "Notas" }
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap",
                activeTab === t.value
                  ? "border-brand text-brand"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}

        {activeTab === "overview" && (
          <div className="flex flex-col gap-6">
            {/* KPIs */}
            {profile && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: CreditCard, label: "Plano", value: profile.tipo_plano || "Nenhum", iconColor: "text-blue-400" },
                  { icon: CurrencyDollar, label: "Ticket", value: profile.valor_plano?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "—", iconColor: "text-emerald-400" },
                  { icon: Calendar, label: "Renovação", value: profile.data_expiracao ? formatDatePtBrSafe(profile.data_expiracao) : "A definir", iconColor: "text-purple-400" },
                  { icon: Clock, label: "Última atividade", value: ultimaAtividade ? formatDatePtBrSafe(ultimaAtividade) : "Nenhuma", iconColor: "text-amber-400" },
                ].map(({ icon: Icon, label, value, iconColor }) => (
                  <div key={label} className="relative overflow-hidden flex items-center gap-3 p-3 rounded-[10px] bg-surface-3 border border-border-subtle">
                    <Icon className={cn("w-5 h-5 flex-shrink-0 relative z-10", iconColor)} />
                    <div className="min-w-0 relative z-10">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-0.5">{label}</p>
                      <p className="text-xs font-semibold text-text-primary truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Últimas 3 atividades */}
              <Card className="rounded-[10px] shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-[6px] bg-brand-subtle border border-brand-border flex items-center justify-center text-brand flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Atividade recente</h3>
                    <p className="text-xs text-text-tertiary">Últimos registros de treino do aluno</p>
                  </div>
                </div>

                {historicoTreinos.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {historicoTreinos.slice(0, 3).map((h, i) => {
                      const ds = h.dados_sessao as any;
                      const dia = formatDatePtBrSafe(h.data_conclusao);
                      return (
                        <div key={i} className="flex items-center justify-between p-3 rounded-[8px] bg-surface-3 border border-border-subtle">
                          <div>
                            <p className="text-xs font-bold text-text-primary">{ds?.nome_rotina || "Sessão de Treino"}</p>
                            <p className="text-[10px] text-text-tertiary mt-0.5">{dia}</p>
                          </div>
                          {ds?.nome_exercicio && (
                            <span className="text-[10px] font-semibold text-brand px-2 py-0.5 rounded-[4px] bg-brand-subtle border border-brand-border">
                              {ds.nome_exercicio}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-28 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-border-default rounded-[10px]">
                    <Clock className="w-6 h-6 text-text-disabled" />
                    <p className="text-xs text-text-tertiary">Nenhuma atividade recente</p>
                  </div>
                )}
              </Card>

              {/* Dinâmica de carga */}
              <Card className="rounded-[10px] shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[6px] bg-brand-subtle border border-brand-border flex items-center justify-center text-brand flex-shrink-0">
                      <ChartLineUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">Dinâmica de carga</h3>
                      <p className="text-xs text-text-tertiary">Cargas máximas registradas</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Toggle Semanal / Mensal */}
                    <div className="flex rounded-[6px] bg-surface-2 p-0.5 border border-border-subtle">
                      <button
                        type="button"
                        onClick={() => setPdfPeriod("semanal")}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-bold rounded-[4px] transition-all",
                          pdfPeriod === "semanal"
                            ? "bg-brand text-text-on-brand shadow-sm"
                            : "text-text-secondary hover:text-text-primary"
                        )}
                      >
                        Semanal
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfPeriod("mensal")}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-bold rounded-[4px] transition-all",
                          pdfPeriod === "mensal"
                            ? "bg-brand text-text-on-brand shadow-sm"
                            : "text-text-secondary hover:text-text-primary"
                        )}
                      >
                        Mensal
                      </button>
                    </div>

                    {/* Botão de Download PDF */}
                    <button
                      type="button"
                      disabled={generatingPdf}
                      onClick={() => handleDownloadReport(pdfPeriod)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-[6px] bg-surface-3 border border-border-default text-text-primary hover:bg-surface-2 hover:border-brand-border transition-colors disabled:opacity-50"
                    >
                      {generatingPdf ? (
                        <CircleNotch className="w-3 h-3 animate-spin text-brand" />
                      ) : (
                        <DownloadSimple className="w-3.5 h-3.5" />
                      )}
                      {generatingPdf ? "Gerando..." : "PDF"}
                    </button>
                  </div>
                </div>

                {historicoTreinos.length > 0 ? (() => {
                  const sessoesPorData = new Map<string, any[]>();
                  historicoTreinos.forEach(h => {
                    const dia = formatDatePtBrSafe(h.data_conclusao);
                    if (!sessoesPorData.has(dia)) sessoesPorData.set(dia, []);
                    sessoesPorData.get(dia)!.push(h);
                  });

                  return (
                    <div className="max-h-[220px] overflow-y-auto flex flex-col gap-3 pr-1 scrollbar-thin">
                      {Array.from(sessoesPorData.entries()).slice(0, 5).map(([dia, sessao]) => (
                        <div key={dia} className="rounded-[8px] bg-surface-3 border border-border-subtle overflow-hidden">
                          <div className="px-3 py-1.5 bg-surface-2 border-b border-border-subtle flex items-center justify-between">
                            <span className="text-[10px] font-bold text-text-tertiary">{dia}</span>
                            <span className="text-[10px] font-semibold text-brand truncate max-w-[60%]">{sessao[0]?.dados_sessao?.nome_rotina}</span>
                          </div>
                          <div className="divide-y divide-border-subtle/50">
                            {sessao.map((h: any, i: number) => {
                              const ds = h.dados_sessao as any;
                              if (!ds) return null;
                              const series = (ds.series || []).filter((s: any) => s.completado && s.peso_atual > 0);
                              if (series.length === 0) return null;
                              const maxCarga = Math.max(...series.map((s: any) => s.peso_atual));
                              return (
                                <div key={i} className="flex items-center justify-between px-3 py-1.5">
                                  <span className="text-xs text-text-primary truncate max-w-[80%]">{ds.nome_exercicio}</span>
                                  <span className="text-xs font-bold text-brand shrink-0">{maxCarga} kg</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })() : (
                  <div className="h-28 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-border-default rounded-[10px]">
                    <ChartLineUp className="w-6 h-6 text-text-disabled" />
                    <p className="text-xs text-text-tertiary">Aguardando dados</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === "treinos" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Fichas digitais */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <Card className="rounded-[10px] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[6px] bg-brand-subtle border border-brand-border flex items-center justify-center text-brand flex-shrink-0">
                      <Barbell className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">Fichas digitais</h3>
                      <p className="text-xs text-text-tertiary">Treinos ativos estruturados</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push("/admin/treinos/nova-ficha")}
                    className="w-8 h-8 rounded-[8px] bg-brand-subtle border border-brand-border flex items-center justify-center text-brand hover:bg-brand hover:text-text-on-brand transition-colors font-bold text-lg"
                  >
                    +
                  </button>
                </div>

                {fichas.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {fichas.map((ficha) => (
                      <div key={ficha.id} className="flex items-center justify-between p-3 rounded-[8px] bg-surface-3 border border-border-subtle hover:border-brand-border transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <Barbell className="w-4 h-4 text-brand flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text-primary truncate">{ficha.nome_rotina}</p>
                            <p className="text-[10px] text-text-tertiary mt-0.5">
                              {formatDatePtBrSafe(ficha.criado_em)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/admin/aluno/${id}/ficha/${ficha.id}`)}
                            className="w-8 h-8 rounded-[6px] bg-brand-subtle border border-brand-border flex items-center justify-center text-brand hover:opacity-85 transition-opacity"
                            title="Editar ficha"
                          >
                            <PencilSimple className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => abrirClonarFicha(ficha)}
                            className="w-8 h-8 rounded-[6px] bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary hover:bg-surface-3 transition-colors"
                            title="Clonar ficha"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteFicha(ficha.id)}
                            className="w-8 h-8 rounded-[6px] bg-danger/10 border border-danger/20 flex items-center justify-center text-danger hover:opacity-85 transition-opacity"
                            title="Deletar ficha"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-28 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-border-default rounded-[10px]">
                    <Barbell className="w-6 h-6 text-text-disabled" />
                    <p className="text-xs text-text-tertiary">Nenhuma ficha criada</p>
                  </div>
                )}
              </Card>
            </div>

            {/* Protocolo PDF */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <Card className="rounded-[10px] shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-[6px] bg-brand-subtle border border-brand-border flex items-center justify-center text-brand flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Protocolo de treino</h3>
                    <p className="text-xs text-text-tertiary">Upload individual de PDF</p>
                  </div>
                </div>

                <form onSubmit={handleUploadPdf} className="flex flex-col gap-4">
                  <div className="relative">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                    />
                    <div className={cn(
                      "flex items-center justify-center gap-2 py-4 rounded-[6px] border-2 border-dashed transition-colors",
                      pdfFile ? "border-brand bg-brand-subtle" : "border-border-default bg-surface-3 hover:border-brand/50"
                    )}>
                      <UploadSimple className={cn("w-4 h-4", pdfFile ? "text-brand" : "text-text-tertiary")} />
                      <span className={cn("text-xs max-w-[80%] truncate", pdfFile ? "text-brand font-medium" : "text-text-tertiary")}>
                        {pdfFile ? pdfFile.name : "Selecione o arquivo PDF"}
                      </span>
                    </div>
                  </div>

                  {treinosPdf.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Protocolos enviados</p>
                      {treinosPdf.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-2.5 rounded-[8px] bg-surface-3 border border-border-subtle">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-brand flex-shrink-0" />
                            <a href={t.url_pdf} target="_blank" rel="noopener noreferrer" className="text-xs text-text-secondary truncate hover:text-brand transition-colors">
                              {t.nome_arquivo}
                            </a>
                          </div>
                          <button onClick={() => handleDeleteTreino(t.id, t.original_url_pdf || t.url_pdf)} className="text-text-disabled hover:text-danger transition-colors shrink-0 p-1">
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button type="submit" loading={uploading} disabled={!pdfFile} fullWidth>
                    Publicar protocolo PDF
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "nutricao" && (
          <div className="max-w-2xl">
            <Card className="rounded-[10px] shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-[6px] bg-brand-subtle border border-brand-border flex items-center justify-center text-brand flex-shrink-0">
                  <AppleLogo className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Plano alimentar</h3>
                  <p className="text-xs text-text-tertiary">Histórico de planos enviados</p>
                </div>
              </div>

              <Button variant="secondary" leftIcon={<UploadSimple className="w-4 h-4" />} onClick={() => setUploadNutritionOpen(true)} fullWidth>
                Adicionar plano alimentar
              </Button>

              {planosAlimentares.length > 0 ? (
                <div className="flex flex-col gap-2 mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Planos ativos</p>
                  {planosAlimentares.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-[8px] bg-surface-3 border border-border-subtle">
                      <div className="flex items-center gap-3 min-w-0">
                        <AppleLogo className="w-4 h-4 text-brand flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate">{p.nome_arquivo}</p>
                          {p.descricao && <p className="text-[10px] text-text-tertiary truncate">{p.descricao}</p>}
                          <p className="text-[9px] text-text-disabled mt-0.5">{formatDatePtBrSafe(p.criado_em)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={p.pdf_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-[6px] bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-brand transition-colors">
                          <FileText className="w-3.5 h-3.5" />
                        </a>
                        <button onClick={() => handleDeleteNutritionPlan(p.id, p.original_path || p.url_pdf || p.pdf_url)} className="w-8 h-8 rounded-[6px] bg-danger/10 border border-danger/20 flex items-center justify-center text-danger hover:opacity-85 transition-opacity">
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center mt-4 border border-dashed border-border-default rounded-[10px]">
                  <p className="text-xs text-text-tertiary">Nenhum plano alimentar enviado ainda</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === "medidas" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Tabela de medidas */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              <Card className="rounded-[10px] shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-[6px] bg-brand-subtle border border-brand-border flex items-center justify-center text-brand flex-shrink-0">
                    <Ruler className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Histórico de medidas</h3>
                    <p className="text-xs text-text-tertiary">Registro completo de antropometria</p>
                  </div>
                </div>

                {medidas.length > 0 ? (
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-xs min-w-max">
                      <thead>
                        <tr className="border-b border-border-subtle">
                          {["Data", "Peso (kg)", "Gordura %", "Peitoral", "Cintura", "Braço E", "Braço D", "Coxa E", "Coxa D", "Panturrilha"].map((h) => (
                            <th key={h} className="text-left px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {medidas.map((m: any) => (
                          <tr key={m.id} className="border-b border-border-subtle hover:bg-surface-3 transition-colors">
                            <td className="px-2.5 py-2 text-text-primary whitespace-nowrap">{formatDatePtBrSafe(m.data_medicao)}</td>
                            <td className="px-2.5 py-2 text-brand font-semibold">{m.peso?.toFixed(1) || "—"}</td>
                            <td className="px-2.5 py-2 text-text-primary">{m.gordura_corporal ? `${m.gordura_corporal.toFixed(1)}%` : "—"}</td>
                            {[m.peitoral, m.cintura, m.braco_esquerdo, m.braco_direito, m.coxa_esquerda, m.coxa_direita, m.panturrilha_direita].map((v, i) => (
                              <td key={i} className="px-2.5 py-2 text-text-secondary">{v?.toFixed(1) || "—"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-28 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-border-default rounded-[10px]">
                    <WarningCircle className="w-6 h-6 text-text-disabled" />
                    <p className="text-xs text-text-tertiary">Nenhuma medida cadastrada</p>
                  </div>
                )}
              </Card>
            </div>

            {/* Galeria de fotos */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              <Card className="rounded-[10px] shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-[6px] bg-brand-subtle border border-brand-border flex items-center justify-center text-brand flex-shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Evolução visual</h3>
                    <p className="text-xs text-text-tertiary">Fotos de evolução do aluno</p>
                  </div>
                </div>

                {fotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                    {fotos.map((f) => (
                      <div key={f.id} className="group bg-surface-2 rounded-[8px] border border-border-subtle overflow-hidden shadow-sm relative aspect-[3/4]">
                        <img src={f.url_foto} alt={f.posicao} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-2 left-2 right-2 flex flex-col">
                          <span className="text-[10px] font-bold text-white uppercase">{f.posicao}</span>
                          <span className="text-[8px] text-text-disabled">{formatDatePtBrSafe(f.data_upload, { day: '2-digit', month: 'short' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-36 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-border-default rounded-[10px]">
                    <ImageIcon className="w-7 h-7 text-text-disabled" />
                    <p className="text-xs text-text-tertiary">Aguardando fotos</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === "notas" && (
          <div className="max-w-2xl flex flex-col gap-6">
            {/* Notas do coach */}
            <Card className="rounded-[10px] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-[6px] bg-brand-subtle border border-brand-border flex items-center justify-center text-brand flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Notas do especialista</h3>
                  <p className="text-xs text-text-tertiary">Anotações e orientações internas privativas</p>
                </div>
              </div>
              <textarea
                value={profile?.orientacoes || ""}
                onChange={(e) => {
                  const newVal = e.target.value;
                  setProfile((prev) => prev ? { ...prev, orientacoes: newVal } : null);
                }}
                placeholder="Insira as observações sobre o atleta..."
                className={cn(fieldCls, "h-32 resize-none")}
              />
              {profile?.orientacoes !== notasOriginais && (
                <div className="mt-3 flex items-center gap-2 justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setProfile((prev) => prev ? { ...prev, orientacoes: notasOriginais } : null);
                    }}
                  >
                    Cancelar
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
                    Salvar notas
                  </Button>
                </div>
              )}
            </Card>

            {/* Transferência de coach (super admin) */}
            {isSuperAdmin && (
              <Card className="rounded-[10px] shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-[6px] bg-brand-subtle border border-brand-border flex items-center justify-center text-brand flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Tutor responsável</h3>
                    <p className="text-xs text-text-tertiary">Alterar tutor do atleta</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <select
                    value={selectedNewCoach || ""}
                    onChange={(e) => setSelectedNewCoach(e.target.value || null)}
                    disabled={changingCoach}
                    className={cn(fieldCls, "disabled:opacity-50")}
                  >
                    <option value="">Selecione um coach...</option>
                    {coaches.map((coach) => (
                      <option key={coach.id} value={coach.id}>{coach.full_name}</option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={changingCoach}
                    disabled={!selectedNewCoach || selectedNewCoach === currentCoachId}
                    onClick={handleChangeCoach}
                  >
                    Confirmar transferência
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

      </div>

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
          <div className="w-full max-w-sm bg-surface-1 border border-border-default rounded-[10px] p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-text-primary">Clonar Ficha</p>
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
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-2 block">
                Selecionar aluno destino
              </label>
              {alunosCoach.length === 0 ? (
                <p className="text-xs text-text-tertiary py-3 text-center">Carregando alunos…</p>
              ) : (
                <select
                  value={alunoAlvoId}
                  onChange={e => setAlunoAlvoId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface-3 border border-border-default rounded-[6px] text-sm text-text-primary focus:outline-none focus:border-brand transition-all"
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
                className="flex-1 py-2.5 rounded-[8px] text-xs font-semibold text-text-secondary bg-surface-3 border border-border-subtle hover:bg-surface-2 transition-colors"
              >
                Cancelar
              </button>
              <Button
                onClick={handleClonarFicha}
                disabled={!alunoAlvoId || cloning}
                loading={cloning}
                leftIcon={<Copy className="w-4 h-4" />}
                className="flex-1"
              >
                Clonar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
