"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { extractStoragePath, getSignedStorageUrl } from "@/lib/storageUrls";
import UploadNutritionPlan from "@/app/components/UploadNutritionPlan";
import { getTodayBrazil } from '@/lib/dateUtils';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  FileText, 
  Upload, 
  Image as ImageIcon,
  LineChart,
  Activity,
  Trash2,
  Settings,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Dumbbell,
  Edit2,
  Apple,
  Trophy,
  Ruler
} from "lucide-react";

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

  useEffect(() => {
    load();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Tem certeza que deseja desativar (arquivar) este aluno? O acesso será bloqueado, mas o histórico e dados serão mantidos para seus relatórios.")) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/delete-student?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Falha ao remover aluno");
      }

      router.push("/admin/alunos");
    } catch (err: any) {
      setError(err?.message || String(err));
      setDeleting(false);
    }
  };

  const load = async () => {
    setError(null);
    try {
      // Verificar role do usuário autenticado
      const { data: authData } = await supabaseClient.auth.getUser();
      if (authData.user) {
        const { data: userData } = await supabaseClient
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();
        
        setIsSuperAdmin(userData?.role === "super_admin");
      }

      const { data: prof } = await supabaseClient.from("profiles").select("*").eq("id", id).single();
      setProfile(prof as Profile);
      
      if (prof) {
        setEditStatus(prof.status_pagamento || "pago");
        setEditPlano(prof.tipo_plano || "mensal");
        setEditValorPlano(
          prof.valor_plano !== null && prof.valor_plano !== undefined
            ? String(prof.valor_plano)
            : ""
        );
        setEditDataInicio(prof.data_inicio ? new Date(prof.data_inicio).toISOString().slice(0, 10) : "");
      }

      const { data: fotosData, error: fotosError } = await supabaseClient
        .from("fotos_evolucao")
        .select("id, posicao, url_foto, data_upload")
        .eq("aluno_id", id)
        .order("data_upload", { ascending: false })
        .limit(10);
      
      if (fotosError) {
        console.error("Erro ao buscar fotos:", fotosError);
      }
      
      console.log("Fotos encontradas:", fotosData?.length || 0, fotosData);
      
      // Assinar URLs das fotos para o coach
      const fotosAssinadas = await Promise.all((fotosData || []).map(async (f: any) => {
        // url_foto agora contém apenas o fileName, não a URL completa
        console.log("Tentando assinar foto:", f.url_foto);
        const { data: signedData, error: signError } = await supabaseClient.storage.from('evolucao-fotos').createSignedUrl(f.url_foto, 3600);
        if (signError) {
          console.error("Erro ao assinar URL:", signError, "para arquivo:", f.url_foto);
        }
        return { ...f, url_foto: signedData?.signedUrl || f.url_foto };
      }));
      console.log("Fotos assinadas:", fotosAssinadas.length, fotosAssinadas);
      setFotos(fotosAssinadas);

      const { data: treinosData } = await supabaseClient
        .from("treinos_alunos")
        .select("*")
        .eq("aluno_id", id)
        .order("data_upload", { ascending: false });
      
      // Assinar URLs dos PDFs para visualização do coach
      const treinosAssinados = await Promise.all((treinosData || []).map(async (t: any) => {
        const signed = await getSignedStorageUrl('treinos-pdf', t.url_pdf, 3600);
        return { ...t, original_url_pdf: t.url_pdf, url_pdf: signed || t.url_pdf };
      }));
      setTreinosPdf(treinosAssinados);

      // Buscar fichas digitais
      const { data: fichasData } = await supabaseClient
        .from("fichas_treino")
        .select("*")
        .eq("aluno_id", id)
        .eq("ativo", true)
        .order("criado_em", { ascending: false });
      
      setFichas((fichasData || []) as FichaTreino[]);

      const { data: medidasData } = await supabaseClient
        .from("medidas_aluno")
        .select("id, peso, peitoral, cintura, braco_esquerdo, braco_direito, coxa_esquerda, coxa_direita, panturrilha_direita, data_medicao, gordura_corporal")
        .eq("aluno_id", id)
        .order("data_medicao", { ascending: false });
      setMedidas(medidasData || []);

      // Carregar planos alimentares
      const { data: planosData } = await supabaseClient
        .from("plano_alimentar_pdf")
        .select("*")
        .eq("aluno_id", id)
        .order("criado_em", { ascending: false });
      
      // Assinar URLs dos PDFs de nutrição
      const planosAssinados = await Promise.all((planosData || []).map(async (p: any) => {
        // Support both url_pdf (new) and pdf_url (legacy) field names
        const pdfPath = p.url_pdf || p.pdf_url;
        if (!pdfPath) {
          console.error('PDF path not found for plan:', p.id);
          return p;
        }

        const signed = await getSignedStorageUrl('plano_alimentar', pdfPath, 3600);
        return {
          ...p,
          pdf_url: signed || pdfPath,
          original_path: pdfPath // Keep original path for deletion
        };
      }));
      setPlanosAlimentares(planosAssinados);

      // Carregar lista de coaches apenas se super-admin
      if (isSuperAdmin) {
        const { data: coachesData } = await supabaseClient
          .from("profiles")
          .select("id, full_name")
          .eq("role", "coach")
          .order("full_name", { ascending: true });
        setCoaches(coachesData || []);
      }

      // Armazenar coach_id atual
      if (prof && prof.coach_id) {
        setCurrentCoachId(prof.coach_id);
        setSelectedNewCoach(prof.coach_id);
      }

      // Buscar última atividade (fichas concluídas + check-ins manuais)
      const { data: ultimaFicha } = await supabaseClient
        .from('historico_treinos')
        .select('data_conclusao')
        .eq('aluno_id', id)
        .order('data_conclusao', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: ultimoCheckin } = await supabaseClient
        .from('treinos_manuais')
        .select('data_treino')
        .eq('aluno_id', id)
        .eq('concluido', true)
        .order('data_treino', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Determinar qual é mais recente
      let dataUltimaAtividade: string | null = null;
      if (ultimaFicha && ultimoCheckin) {
        const dataFicha = new Date(ultimaFicha.data_conclusao);
        const dataCheckin = new Date(ultimoCheckin.data_treino);
        dataUltimaAtividade = dataFicha > dataCheckin 
          ? ultimaFicha.data_conclusao 
          : ultimoCheckin.data_treino;
      } else if (ultimaFicha) {
        dataUltimaAtividade = ultimaFicha.data_conclusao;
      } else if (ultimoCheckin) {
        dataUltimaAtividade = ultimoCheckin.data_treino;
      }
      setUltimaAtividade(dataUltimaAtividade);

      // Buscar pontos totais do aluno
      const { data: pontuacaoData } = await supabaseClient
        .from('pontuacao_alunos')
        .select('total_pontos')
        .eq('aluno_id', id)
        .maybeSingle();
      
      setPontosTotais(pontuacaoData?.total_pontos || 0);
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
        .from("treinos-pdf")
        .upload(fileName, pdfFile, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      // Salva APENAS o path no banco (bucket treinos-pdf é privado, URL é assinada na exibição)
      const { error: dbError } = await supabaseClient.from("treinos_alunos").insert({
        aluno_id: id,
        url_pdf: fileName,
        nome_arquivo: pdfFile.name,
        data_upload: new Date().toISOString(),
      });
      if (dbError) throw dbError;

      setPdfFile(null);
      // Resetar o input
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
      // 1. Deletar do Storage (suporta path novo ou URL legada)
      const filePath = extractStoragePath('treinos-pdf', urlPdf) || urlPdf;

      const { error: storageError } = await supabaseClient.storage
        .from("treinos-pdf")
        .remove([filePath]);
      
      if (storageError) console.error("Erro ao remover do storage:", storageError);

      // 2. Deletar do Banco
      const { error: dbError } = await supabaseClient
        .from("treinos_alunos")
        .delete()
        .eq("id", treinoId);
      
      if (dbError) throw dbError;

      await load();
    } catch (err: any) {
      setError("Erro ao deletar treino: " + err.message);
    }
  };

  const handleDeleteFicha = async (fichaId: string) => {
    if (!window.confirm("Tem certeza que deseja desativar esta ficha digital? O aluno perderá acesso, mas o histórico será mantido.")) return;
    
    try {
      // Marcar como inativa em vez de deletar
      const { error } = await supabaseClient
        .from("fichas_treino")
        .update({ ativo: false })
        .eq("id", fichaId);
      
      if (error) throw error;

      await load();
    } catch (err: any) {
      setError("Erro ao deletar ficha: " + err.message);
    }
  };

  const handleChangeCoach = async () => {
    if (!selectedNewCoach) return setError("Selecione um coach");
    if (selectedNewCoach === currentCoachId) return setError("Este é o coach atual do aluno");

    if (!window.confirm("Deseja transferir este aluno para outro coach? A tabela de relacionamento será atualizada corretamente.")) {
      return;
    }

    setChangingCoach(true);
    setError(null);

    try {
      const oldCoachId = currentCoachId;

      // 1. Remover da tabela coach_alunos (coach antigo)
      if (oldCoachId) {
        const { error: deleteError } = await supabaseClient
          .from("coach_alunos")
          .delete()
          .eq("coach_id", oldCoachId)
          .eq("aluno_id", id);
        
        if (deleteError) console.error("Erro ao remover coach anterior:", deleteError);
      }

      // 2. Adicionar à tabela coach_alunos (coach novo)
      const { error: insertError } = await supabaseClient
        .from("coach_alunos")
        .insert([{ coach_id: selectedNewCoach, aluno_id: id }]);
      
      if (insertError && !insertError.message.includes("unique")) {
        throw insertError;
      }

      // 3. Atualizar coach_id no profiles
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ coach_id: selectedNewCoach })
        .eq("id", id);
      
      if (updateError) throw updateError;

      setCurrentCoachId(selectedNewCoach);
      setError(null);
      
      // Recarregar dados
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
      // 1. Deletar do Storage
      if (!pdfUrl) {
        console.error('PDF URL is undefined');
        throw new Error('URL do PDF não encontrada');
      }
      
      const pathParts = pdfUrl.split('/plano_alimentar/');
      const filePath = pathParts.length > 1 ? pathParts[1] : pdfUrl;
      
      const { error: storageError } = await supabaseClient.storage
        .from("plano_alimentar")
        .remove([filePath]);
      
      if (storageError) console.error("Erro ao remover do storage:", storageError);

      // 2. Deletar do Banco
      const { error: dbError } = await supabaseClient
        .from("plano_alimentar_pdf")
        .delete()
        .eq("id", planId);
      
      if (dbError) throw dbError;

      await load();
    } catch (err: any) {
      setError("Erro ao deletar plano: " + err.message);
    }
  };;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDataInicio) return setError("Selecione a data de início do plano");
    
    setSavingProfile(true);
    setError(null);
    
    try {
      const dataInicio = new Date(editDataInicio);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      dataInicio.setHours(0, 0, 0, 0);
      
      // Validação de segurança: impedir datas passadas (proteção backend)
      if (dataInicio < hoje) {
        setError("⚠️ A data de início não pode ser anterior à data atual");
        setSavingProfile(false);
        return;
      }
      
      let dataExpiracao = new Date(editDataInicio);
      switch (editPlano) {
        case "mensal":
          dataExpiracao.setMonth(dataExpiracao.getMonth() + 1);
          break;
        case "trimestral":
          dataExpiracao.setMonth(dataExpiracao.getMonth() + 3);
          break;
        case "semestral":
          dataExpiracao.setMonth(dataExpiracao.getMonth() + 6);
          break;
      }

      const valorPlanoNumber = editValorPlano.trim().length
        ? Number(editValorPlano.replace(",", "."))
        : null;

      const { error } = await supabaseClient
        .from("profiles")
        .update({
          status_pagamento: editStatus,
          tipo_plano: editPlano,
          valor_plano: Number.isFinite(valorPlanoNumber) ? valorPlanoNumber : null,
          data_inicio: dataInicio.toISOString(),
          data_expiracao: dataExpiracao.toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      
      await load();
      setEditingProfile(false);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-iron-black p-4 md:p-6 lg:p-12 lg:pl-28">
      <div className="max-w-7xl mx-auto">
        
        {/* Navigation & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-8 md:mb-12">
          <div className="flex items-center gap-4">
             <button 
                onClick={() => router.back()} 
                className="p-4 bg-iron-gray rounded-2xl border border-white/5 hover:bg-white/5 transition-all group"
              >
                <ArrowLeft size={20} className="text-zinc-500 group-hover:text-white group-hover:-translate-x-1 transition-all" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl  text-white tracking-tight  uppercase">Dossiê do <span className="text-iron-red">Atleta</span></h1>
                <p className="text-zinc-500 text-sm font-medium">Controle completo de performance e adesão.</p>
              </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              className="px-4 md:px-6 py-3 md:py-4 bg-iron-gray text-white text-[10px]  uppercase tracking-[0.2em] rounded-2xl hover:bg-white/5 border border-white/5 transition-all shadow-xl flex items-center gap-3"
            >
              <Settings className={`w-4 h-4 ${editingProfile && 'rotate-90'} transition-transform`} />
              Configurações
            </button>
            <button 
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 md:px-6 py-3 md:py-4 bg-iron-red/10 text-iron-red text-[10px]  uppercase tracking-[0.2em] rounded-2xl border border-iron-red/20 hover:bg-iron-red hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-neon-red"
            >
              <Trash2 size={16} />
              {deleting ? "Arquivando..." : "Desativar"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-6 bg-red-50 border border-red-100 rounded-3xl text-red-600 text-xs  flex items-center gap-4 animate-in fade-in">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Profile Card Principal */}
        {profile && (
          <div className="bg-black rounded-[40px] border border-white/5 p-6 md:p-10 lg:p-14 mb-8 md:mb-12 relative overflow-hidden shadow-2xl group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-iron-gold/5 rounded-bl-[200px] pointer-events-none blur-3xl opacity-50 group-hover:bg-iron-gold/10 transition-all duration-1000" />
            
            <div className="flex flex-col lg:flex-row gap-8 md:gap-16 relative z-10">
              {/* Header Info */}
              <div className="flex-1">
                <div className="flex items-center gap-6 md:gap-8 mb-10 md:mb-12 flex-wrap">
                  <div className="w-20 h-20 md:w-28 md:h-28 bg-zinc-900 rounded-[35px] flex items-center justify-center text-zinc-800 border border-white/5 relative group/avatar">
                    <User size={48} className="group-hover/avatar:text-iron-gold transition-colors" />
                    <div className="absolute inset-0 rounded-[35px] border border-iron-gold/20 group-hover/avatar:scale-110 transition-transform opacity-0 group-hover/avatar:opacity-100"></div>
                  </div>
                  <div>
                    <h2 className="text-3xl md:text-5xl  text-white tracking-tighter uppercase  leading-none mb-3">
                       {profile.coaching_reference || 'Protocolo Sem Nome'}
                    </h2>
                    <p className="text-xs text-zinc-400 mb-4">{profile.email || 'Email não cadastrado'}</p>
                    <div className={`inline-flex items-center gap-3 px-6 py-2 rounded-full text-[10px]  uppercase tracking-[0.2em] ${
                      profile.status_pagamento === 'pago' 
                        ? 'bg-iron-gold/10 text-iron-gold border border-iron-gold/20' 
                        : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${profile.status_pagamento === 'pago' ? 'bg-iron-gold' : 'bg-red-500'} animate-pulse`} />
                      {profile.status_pagamento === 'pago' ? 'Acesso Premium Ativo' : 'Acesso Bloqueado / Pendente'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div className="flex items-center gap-3 text-zinc-500">
                      <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center border border-white/5">
                        <CreditCard size={16} className="text-iron-gold" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px]  uppercase tracking-wider text-zinc-600">Plano</span>
                        <span className="text-sm  text-white uppercase  tracking-tight">{profile.tipo_plano || 'Nenhum'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-zinc-500">
                       <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center border border-white/5">
                        <DollarSign size={16} className="text-iron-gold" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px]  uppercase tracking-wider text-zinc-600">Ticket</span>
                        <span className="text-sm  text-white tracking-tight">
                          {profile.valor_plano?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-zinc-500">
                      <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center border border-white/5">
                        <Calendar size={16} className="text-iron-gold" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px]  uppercase tracking-wider text-zinc-600">Renovação</span>
                        <span className="text-sm  text-white tracking-tight">
                          {profile.data_expiracao ? new Date(profile.data_expiracao).toLocaleDateString('pt-BR') : 'A definir'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-zinc-500">
                      <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center border border-white/5">
                        <Clock size={16} className="text-iron-gold" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px]  uppercase tracking-wider text-zinc-600">Última Atividade</span>
                        <span className="text-sm  text-white tracking-tight uppercase ">
                          {ultimaAtividade ? new Date(ultimaAtividade).toLocaleDateString('pt-BR') : 'Nenhuma'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-zinc-500">
                      <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center border border-white/5">
                        <Trophy size={16} className="text-iron-gold" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px]  uppercase tracking-wider text-zinc-600">Pontos</span>
                        <span className="text-sm  text-iron-gold tracking-tight font-bold">
                          {pontosTotais} pts
                        </span>
                      </div>
                    </div>
                </div>
              </div>

              {/* Action Side */}
              <div className="lg:w-64 flex flex-col gap-6">
                  <button
                    onClick={() => setEditingProfile(!editingProfile)}
                    className="w-full py-5 bg-iron-gold text-black text-[10px]  uppercase tracking-[0.3em] rounded-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(212,175,55,0.1)]"
                  >
                    <Settings size={18} className={`${editingProfile && 'rotate-90'} transition-transform`} />
                    {editingProfile ? 'Cancelar Gestão' : 'Gerenciar Plano'}
                  </button>
              </div>
            </div>

            {/* Expansão de Edição */}
            {editingProfile && (
              <div className="mt-12 md:mt-16 pt-12 md:pt-16 border-t border-white/5 animate-in slide-in-from-top-6 duration-700">
                <form onSubmit={handleSaveProfile} className="space-y-8 md:space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                    <div className="space-y-3">
                      <label className="text-[10px]  uppercase tracking-widest text-zinc-500 ml-1">Status Financeiro</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full px-6 py-4 bg-zinc-900 border border-white/10 rounded-2xl text-white  text-sm focus:ring-2 focus:ring-iron-gold transition-all appearance-none cursor-pointer"
                      >
                        <option value="pago">SITUAÇÃO: PAGO</option>
                        <option value="pendente">SITUAÇÃO: PENDENTE</option>
                        <option value="atrasado">SITUAÇÃO: EM ATRASO</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px]  uppercase tracking-widest text-zinc-500 ml-1">Periodicidade</label>
                      <select
                        value={editPlano}
                        onChange={(e) => setEditPlano(e.target.value)}
                        className="w-full px-6 py-4 bg-zinc-900 border border-white/10 rounded-2xl text-white  text-sm focus:ring-2 focus:ring-iron-gold transition-all appearance-none cursor-pointer"
                      >
                        <option value="mensal">PLANO: MENSAL (30D)</option>
                        <option value="trimestral">PLANO: TRIMESTRAL (90D)</option>
                        <option value="semestral">PLANO: SEMESTRAL (180D)</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px]  uppercase tracking-widest text-zinc-500 ml-1">Valor Contratado (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editValorPlano}
                        onChange={(e) => setEditValorPlano(e.target.value)}
                        placeholder="Ex: 149,90"
                        className="w-full px-6 py-4 bg-zinc-900 border border-white/10 rounded-2xl text-white  text-sm focus:ring-2 focus:ring-iron-gold transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 max-w-md">
                    <label className="text-[10px]  uppercase tracking-widest text-zinc-500 ml-1">Data de Início do Novo Ciclo</label>
                    <input
                      type="date"
                      value={editDataInicio}
                      onChange={(e) => setEditDataInicio(e.target.value)}
                      min={getTodayBrazil()}
                      className="w-full px-6 py-4 bg-zinc-900 border border-white/10 rounded-2xl text-iron-gold  text-sm focus:ring-2 focus:ring-iron-gold transition-all"
                      required
                    />
                    <p className="text-[9px] text-zinc-600 ml-1">⚠️ Apenas datas a partir de hoje para evitar planos já vencidos</p>
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-12 py-5 bg-iron-gold text-black text-[10px]  uppercase tracking-[0.3em] rounded-2xl shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {savingProfile ? 'Sincronizando...' : 'Confirmar Atualização'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Orientações do Coach */}
        <div className="bg-black rounded-3xl p-3 md:p-5 border border-white/5 shadow-2xl mb-4 md:mb-6 relative overflow-hidden group">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-iron-gold/10 rounded-2xl text-iron-gold">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl  text-white tracking-tight uppercase ">Notas do Especialista</h3>
              <p className="text-zinc-500 text-[10px]  uppercase tracking-widest">Orientações Internas (Privado)</p>
            </div>
          </div>
          
          <textarea
            value={profile?.orientacoes || ""}
            onChange={async (e) => {
              const newVal = e.target.value;
              setProfile(prev => prev ? { ...prev, orientacoes: newVal } : null);
              // Debounce ou Save button? Vamos simplificar com um save sutil
            }}
            onBlur={async () => {
              try {
                await supabaseClient
                  .from("profiles")
                  .update({ orientacoes: profile?.orientacoes })
                  .eq("id", id);
              } catch (err) {
                console.error("Erro ao salvar nota:", err);
              }
            }}
            placeholder="Digite aqui observações estratégicas, ajustes de dieta ou feedback de evolução que apenas você poderá ver..."
            className="w-full h-32 bg-zinc-900/50 border border-white/10 rounded-2xl p-6 text-zinc-300 text-sm focus:outline-none focus:border-iron-gold/40 transition-all resize-none antialiased"
          />
          <p className="mt-3 text-[9px] text-zinc-600  uppercase tracking-widest text-right">Auto-save ao sair do campo</p>
        </div>

        {/* Seção de Mudança de Coach - Apenas Super Admin */}
        {isSuperAdmin && (
        <div className="bg-black rounded-3xl p-3 md:p-5 border border-white/5 shadow-2xl mb-4 md:mb-6 relative overflow-hidden group">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-iron-gold/10 rounded-2xl text-iron-gold">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl  text-white tracking-tight uppercase ">Tutor Responsável</h3>
              <p className="text-zinc-500 text-[10px]  uppercase tracking-widest">Transferência de Coach</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-[10px]  uppercase tracking-widest text-zinc-500">Atribuir a Novo Coach</label>
              <select
                value={selectedNewCoach || ""}
                onChange={(e) => setSelectedNewCoach(e.target.value || null)}
                disabled={changingCoach}
                className="w-full px-6 py-4 bg-zinc-900 border border-white/10 rounded-2xl text-white  text-sm focus:ring-2 focus:ring-iron-gold transition-all appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="">Selecione um coach...</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.full_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleChangeCoach}
              disabled={changingCoach || !selectedNewCoach || selectedNewCoach === currentCoachId}
              className="w-full py-4 bg-iron-gold text-black text-[10px]  uppercase tracking-[0.3em] rounded-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(212,175,55,0.1)]"
            >
              {changingCoach ? 'Transferindo...' : 'Confirmar Transferência'}
            </button>
          </div>
        </div>
        )}

        {/* Fichas Digitais */}
        <div className="bg-black rounded-3xl p-3 md:p-5 border border-white/5 shadow-2xl mb-4 md:mb-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-32 h-32 bg-iron-gold/5 rounded-full -ml-16 -mt-16 blur-3xl group-hover:bg-iron-gold/10 transition-colors"></div>
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-iron-gold/10 rounded-2xl text-iron-gold">
                <Dumbbell size={20} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl  text-white tracking-tight uppercase ">Fichas <span className="text-iron-gold">Digitais</span></h3>
                <p className="text-zinc-500 text-[10px]  uppercase tracking-widest">Treinos Estruturados</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin/treinos/nova-ficha')}
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-iron-gold/10 hover:bg-iron-gold/20 text-iron-gold border border-iron-gold/20 hover:border-iron-gold/40 transition-all flex items-center justify-center shrink-0"
              title="Criar nova ficha"
            >
              <span className="text-2xl leading-none mb-1">+</span>
            </button>
          </div>

          <div className="relative z-10">
            {fichas.length > 0 ? (
              <div className="space-y-2">
                <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                  {fichas.map((ficha) => (
                    <div key={ficha.id} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/50 border border-white/5 group/ficha hover:border-iron-gold/30 transition-all">
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <div className="w-8 h-8 rounded-xl bg-iron-gold/10 flex items-center justify-center shrink-0">
                          <Dumbbell size={14} className="text-iron-gold" />
                        </div>
                        <div className="overflow-hidden flex-1">
                          <p className="text-[11px]  text-white uppercase tracking-tight truncate">
                            {ficha.nome_rotina}
                          </p>
                          <p className="text-[9px] text-zinc-500  uppercase tracking-widest mt-1">
                            {new Date(ficha.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => router.push(`/admin/aluno/${id}/ficha/${ficha.id}`)}
                          className="p-2 bg-iron-gold/10 text-iron-gold rounded-xl hover:bg-iron-gold/20 transition-colors"
                          title="Editar ficha"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteFicha(ficha.id)}
                          className="p-2 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                          title="Desativar ficha"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-zinc-600  uppercase tracking-widest text-center mt-4 pt-4 border-t border-white/5">
                  {fichas.length} Ficha{fichas.length !== 1 ? 's' : ''} Ativa{fichas.length !== 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center text-center text-zinc-600">
                <Dumbbell size={32} className="text-zinc-800 mb-3 opacity-50" />
                <p className="text-[10px]  uppercase tracking-widest">Sem Fichas Digitais</p>
                <p className="text-[9px] text-zinc-700 mt-1">Crie fichas em Gestão de Treinos</p>
              </div>
            )}
          </div>
        </div>

        {/* Upload de Treino (Protocolo PDF) */}
        <div className="bg-black rounded-3xl p-3 md:p-5 border border-white/5 shadow-2xl mb-4 md:mb-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-iron-gold/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-iron-gold/10 transition-colors"></div>
          
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="p-3 bg-iron-gold/10 rounded-2xl text-iron-gold">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl  text-white tracking-tight uppercase ">Protocolo de Treino</h3>
              <p className="text-zinc-500 text-[10px]  uppercase tracking-widest">Enviar PDF Individual</p>
            </div>
          </div>

          <form onSubmit={handleUploadPdf} className="space-y-2 md:space-y-3 relative z-10">
            <div className="group/input relative">
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handlePdfChange} 
                className="w-full px-4 md:px-6 py-5.5 md:py-6 bg-zinc-900/50 border-2 border-dashed border-white/10 rounded-2xl text-zinc-500 text-xs  text-center file:hidden cursor-pointer hover:bg-black hover:border-iron-gold/30 transition-all"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-zinc-500 group-hover/input:text-iron-gold transition-colors">
                <Upload size={18} className="mb-0" />
                <span className="max-w-[90%] truncate">{pdfFile ? pdfFile.name : 'Selecione o arquivo PDF'}</span>
              </div>
            </div>

            {/* Lista de Treinos Enviados */}
            {treinosPdf.length > 0 && (
              <div className="space-y-3 mb-3">
                <h4 className="text-[10px]  text-zinc-600 uppercase tracking-widest mb-2">Protocolos Ativos</h4>
                <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                  {treinosPdf.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-white/5 group/item">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText size={14} className="text-iron-gold shrink-0" />
                        <span className="text-[10px]  text-zinc-400 truncate tracking-tight">{t.nome_arquivo}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteTreino(t.id, t.original_url_pdf || t.url_pdf)}
                        className="p-2 text-zinc-700 hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={uploading || !pdfFile}
              className="w-full py-4 md:py-5 bg-iron-gold text-black text-[10px]  uppercase tracking-[0.3em] rounded-2xl hover:scale-[1.02] transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(212,175,55,0.1)]"
            >
              {uploading ? 'Processando...' : 'Publicar Protocolo PDF'}
            </button>
          </form>
        </div>

        {/* Upload de Nutrição (Plano Alimentar) */}
        <div className="bg-black rounded-3xl p-3 md:p-5 border border-white/5 shadow-2xl mb-4 md:mb-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-iron-gold/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-iron-gold/10 transition-colors"></div>
          
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="p-3 bg-iron-gold/10 rounded-2xl text-iron-gold">
              <Apple size={20} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl  text-white tracking-tight uppercase ">Plano <span className="text-iron-gold">Alimentar</span></h3>
              <p className="text-zinc-500 text-[10px]  uppercase tracking-widest">Uploads de PDF</p>
            </div>
          </div>

          <button
            onClick={() => setUploadNutritionOpen(true)}
            className="w-full py-4 md:py-5 bg-iron-gold text-black text-[10px]  uppercase tracking-[0.3em] rounded-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(212,175,55,0.1)] mb-3 relative z-10"
          >
            <Upload size={16} />
            Adicionar Plano Alimentar
          </button>

          {/* Lista de Planos Alimentares */}
          {planosAlimentares.length > 0 && (
            <div className="space-y-3 relative z-10">
              <h4 className="text-[10px]  text-zinc-600 uppercase tracking-widest mb-2">Planos Ativos</h4>
              <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {planosAlimentares.map((p) => (
                  <div key={p.id} className="flex items-start justify-between p-3 bg-zinc-900/50 rounded-xl border border-white/5 group/item">
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-3 mb-1">
                        <Apple size={14} className="text-iron-gold shrink-0" />
                        <span className="text-[10px]  text-white truncate">{p.nome_arquivo}</span>
                      </div>
                      {p.descricao && (
                        <p className="text-[9px] text-zinc-500 truncate ml-[22px]">{p.descricao}</p>
                      )}
                      <p className="text-[8px] text-zinc-600 ml-[22px] mt-1">
                        {new Date(p.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <a
                        href={p.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-zinc-500 hover:text-iron-gold transition-colors"
                      >
                        <FileText size={12} />
                      </a>
                      <button
                        onClick={() => handleDeleteNutritionPlan(p.id, p.original_path || p.url_pdf || p.pdf_url)}
                        className="p-2 text-zinc-700 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {planosAlimentares.length === 0 && (
            <div className="flex items-center justify-center text-center p-6 relative z-10 h-32">
              <div>
                <Apple size={32} className="text-zinc-800 mx-auto mb-3" />
                <p className="text-zinc-600 text-[10px]  uppercase tracking-widest">Nenhum plano enviado ainda</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          {/* Histórico de Medidas */}
          <div className="bg-black rounded-3xl p-3 md:p-5 border border-white/5 shadow-2xl relative overflow-hidden group lg:col-span-2">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-iron-gold/5 rounded-full -mr-16 -mb-16 blur-3xl opacity-50"></div>
            
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="p-3 bg-iron-gold/10 rounded-2xl text-iron-gold">
                <Ruler size={20} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl text-white tracking-tight uppercase">Histórico de Medidas</h3>
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest">Evolução Completa do Aluno</p>
              </div>
            </div>

            <div className="relative z-10">
              {medidas.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left p-2 text-zinc-500 uppercase tracking-widest text-[9px]">Data</th>
                        <th className="text-center p-2 text-zinc-500 uppercase tracking-widest text-[9px]">Peso (kg)</th>
                        <th className="text-center p-2 text-zinc-500 uppercase tracking-widest text-[9px]">% Gordura</th>
                        <th className="text-center p-2 text-zinc-500 uppercase tracking-widest text-[9px]">Peitoral (cm)</th>
                        <th className="text-center p-2 text-zinc-500 uppercase tracking-widest text-[9px]">Cintura (cm)</th>
                        <th className="text-center p-2 text-zinc-500 uppercase tracking-widest text-[9px]">Braço E (cm)</th>
                        <th className="text-center p-2 text-zinc-500 uppercase tracking-widest text-[9px]">Braço D (cm)</th>
                        <th className="text-center p-2 text-zinc-500 uppercase tracking-widest text-[9px]">Coxa E (cm)</th>
                        <th className="text-center p-2 text-zinc-500 uppercase tracking-widest text-[9px]">Coxa D (cm)</th>
                        <th className="text-center p-2 text-zinc-500 uppercase tracking-widest text-[9px]">Panturrilha (cm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medidas.map((m: any, idx: number) => (
                        <tr key={m.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-2 text-white">
                            {new Date(m.data_medicao).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-2 text-center text-iron-gold font-semibold">
                            {m.peso?.toFixed(1) || '-'}
                          </td>
                          <td className="p-2 text-center text-white">
                            {m.gordura_corporal ? `${m.gordura_corporal.toFixed(1)}%` : '-'}
                          </td>
                          <td className="p-2 text-center text-white">
                            {m.peitoral?.toFixed(1) || '-'}
                          </td>
                          <td className="p-2 text-center text-white">
                            {m.cintura?.toFixed(1) || '-'}
                          </td>
                          <td className="p-2 text-center text-white">
                            {m.braco_esquerdo?.toFixed(1) || '-'}
                          </td>
                          <td className="p-2 text-center text-white">
                            {m.braco_direito?.toFixed(1) || '-'}
                          </td>
                          <td className="p-2 text-center text-white">
                            {m.coxa_esquerda?.toFixed(1) || '-'}
                          </td>
                          <td className="p-2 text-center text-white">
                            {m.coxa_direita?.toFixed(1) || '-'}
                          </td>
                          <td className="p-2 text-center text-white">
                            {m.panturrilha_direita?.toFixed(1) || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-36 md:h-44 flex flex-col items-center justify-center text-center p-4 md:p-6 bg-zinc-900/30 rounded-2xl border border-white/5">
                  <AlertCircle size={32} className="text-zinc-800 mb-4" />
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest leading-loose">
                    Nenhuma medida registrada ainda.<br/>Peça ao aluno para adicionar suas medidas.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Gráfico de Evolução */}
          <div className="bg-black rounded-3xl p-3 md:p-5 border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-iron-gold/5 rounded-full -ml-16 -mb-16 blur-3xl opacity-50"></div>
            
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="p-3 bg-iron-gold/10 rounded-2xl text-iron-gold">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl  text-white tracking-tight uppercase ">Dinâmica de Carga</h3>
                <p className="text-zinc-500 text-[10px]  uppercase tracking-widest">Acompanhamento Biométrico</p>
              </div>
            </div>

            <div className="relative z-10">
              {medidas.length > 1 ? (
                <div className="w-full h-36 md:h-44 bg-zinc-900/50 rounded-2xl flex items-center justify-center border border-white/5 border-dashed relative group/chart">
                  <div className="flex flex-col items-center gap-3">
                    <LineChart size={32} className="text-zinc-800 group-hover/chart:text-iron-gold/20 transition-colors" />
                    <p className="text-zinc-600 text-[10px]  uppercase tracking-widest">DNA de Evolução Ativo</p>
                  </div>
                </div>
              ) : (
                <div className="h-36 md:h-44 flex flex-col items-center justify-center text-center p-4 md:p-6 bg-zinc-900/30 rounded-2xl border border-white/5">
                  <AlertCircle size={32} className="text-zinc-800 mb-4" />
                  <p className="text-zinc-500 text-[10px]  uppercase tracking-widest leading-loose">
                    Dados Insuficientes.<br/>O aluno requer registros.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Galeria de Evolução */}
        <div className="mb-12 md:mb-20">
          <div className="flex items-center gap-4 mb-6 md:mb-8 px-4">
            <div className="p-3 bg-iron-gold/10 rounded-2xl text-iron-gold">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl  text-white tracking-tight uppercase ">Linha do Tempo Visual</h3>
              <p className="text-zinc-500 text-[10px]  uppercase tracking-widest">Evolução Fisiológica</p>
            </div>
          </div>

          {fotos.length > 0 ? (
            <div className="relative">
              {/* Carrossel horizontal com scroll */}
              <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-iron-gold/20 scrollbar-track-transparent">
                {fotos.map((f) => (
                  <div key={f.id} className="group shrink-0 w-72 md:w-80 bg-zinc-900/40 rounded-3xl overflow-hidden shadow-2xl border border-white/5 hover:border-iron-gold/30 transition-all duration-500 snap-center">
                    <div className="relative aspect-3/4 bg-zinc-950 overflow-hidden">
                      <img src={f.url_foto} alt={f.posicao} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-1000" />
                      <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent opacity-60" />
                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                          <span className="text-[8px]  text-white uppercase tracking-widest">{f.posicao}</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="text-zinc-500 text-[10px]  uppercase tracking-widest flex items-center gap-2">
                         <Calendar size={12} className="text-iron-gold" />
                         {new Date(f.data_upload).toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: 'long', 
                            year: 'numeric'
                         })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Indicador de scroll */}
              {fotos.length > 3 && (
                <div className="mt-4 text-center">
                  <p className="text-zinc-600 text-[8px] uppercase tracking-widest">
                    ← Arraste para visualizar todas ({fotos.length} fotos) →
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-zinc-900/20 rounded-[40px] p-12 md:p-24 text-center border border-dashed border-white/5">
               <ImageIcon size={48} className="text-zinc-800 mx-auto mb-6" />
               <p className="text-zinc-600 text-[10px]  uppercase tracking-[0.4em]">Aguardando Capturas</p>
            </div>
          )}
        </div>

        {/* Modal de Upload de Nutrição */}
        <UploadNutritionPlan
          isOpen={uploadNutritionOpen}
          onClose={() => setUploadNutritionOpen(false)}
          alunoId={id}
          alunoName={profile?.full_name || "Aluno"}
          onUploadSuccess={() => {
            setUploadNutritionOpen(false);
            load();
          }}
        />
      </div>
    </div>
  );
}
