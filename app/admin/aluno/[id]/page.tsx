"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
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
  Edit2
} from "lucide-react";

interface Profile {
  id: string;
  full_name?: string | null;
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
  tipo: string;
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

      const { data: fotosData } = await supabaseClient
        .from("fotos_evolucao")
        .select("id, tipo, url_foto, data_upload")
        .eq("aluno_id", id)
        .order("data_upload", { ascending: false })
        .limit(10);
      
      // Assinar URLs das fotos para o coach
      const fotosAssinadas = await Promise.all((fotosData || []).map(async (f: any) => {
        const pathParts = f.url_foto.split('/evolucao-fotos/');
        const filePath = pathParts.length > 1 ? pathParts[1] : f.url_foto;
        const { data: signedData } = await supabaseClient.storage.from('evolucao-fotos').createSignedUrl(filePath, 3600);
        return { ...f, url_foto: signedData?.signedUrl || f.url_foto };
      }));
      setFotos(fotosAssinadas);

      const { data: treinosData } = await supabaseClient
        .from("treinos_alunos")
        .select("*")
        .eq("aluno_id", id)
        .order("data_upload", { ascending: false });
      
      // Assinar URLs dos PDFs para visualização do coach
      const treinosAssinados = await Promise.all((treinosData || []).map(async (t: any) => {
        const pathParts = t.url_pdf.split('/treinos-pdf/');
        const filePath = pathParts.length > 1 ? pathParts[1] : t.url_pdf;
        const { data: signedData } = await supabaseClient.storage.from('treinos-pdf').createSignedUrl(filePath, 3600);
        return { ...t, url_pdf: signedData?.signedUrl || t.url_pdf };
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
        .from("medidas")
        .select("id, peso, data_medicao")
        .eq("aluno_id", id)
        .order("data_medicao", { ascending: true });
      setMedidas(medidasData || []);
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
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from("treinos-pdf")
        .upload(fileName, pdfFile, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabaseClient.storage.from("treinos-pdf").getPublicUrl(fileName);
      const urlPdf = publicUrlData.publicUrl;

      const { error: dbError } = await supabaseClient.from("treinos_alunos").insert({
        aluno_id: id,
        url_pdf: urlPdf,
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
      // 1. Deletar do Storage
      const pathParts = urlPdf.split('/treinos-pdf/');
      const filePath = pathParts.length > 1 ? pathParts[1] : urlPdf;
      
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDataInicio) return setError("Selecione a data de início do plano");
    
    setSavingProfile(true);
    setError(null);
    
    try {
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
          data_inicio: new Date(editDataInicio).toISOString(),
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
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight italic uppercase">Dossiê do <span className="text-iron-red">Atleta</span></h1>
                <p className="text-zinc-500 text-sm font-medium">Controle completo de performance e adesão.</p>
              </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              className="px-4 md:px-6 py-3 md:py-4 bg-iron-gray text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white/5 border border-white/5 transition-all shadow-xl flex items-center gap-3"
            >
              <Settings className={`w-4 h-4 ${editingProfile && 'rotate-90'} transition-transform`} />
              Configurações
            </button>
            <button 
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 md:px-6 py-3 md:py-4 bg-iron-red/10 text-iron-red text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-iron-red/20 hover:bg-iron-red hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-neon-red"
            >
              <Trash2 size={16} />
              {deleting ? "Arquivando..." : "Desativar"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-6 bg-red-50 border border-red-100 rounded-3xl text-red-600 text-xs font-bold flex items-center gap-4 animate-in fade-in">
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
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase italic leading-none mb-4">
                       {profile.full_name || 'Protocolo Sem Nome'}
                    </h2>
                    <div className={`inline-flex items-center gap-3 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${
                      profile.status_pagamento === 'pago' 
                        ? 'bg-iron-gold/10 text-iron-gold border border-iron-gold/20' 
                        : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${profile.status_pagamento === 'pago' ? 'bg-iron-gold' : 'bg-red-500'} animate-pulse`} />
                      {profile.status_pagamento === 'pago' ? 'Acesso Premium Ativo' : 'Acesso Bloqueado / Pendente'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 md:gap-y-10 gap-x-12 md:gap-x-16">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 text-zinc-500">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-white/5">
                        <CreditCard size={18} className="text-iron-gold" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Categoria do Plano</span>
                        <span className="text-base font-bold text-white uppercase italic tracking-tight">{profile.tipo_plano || 'Nenhum'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-zinc-500">
                       <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-white/5">
                        <DollarSign size={18} className="text-iron-gold" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Ticket de Investimento</span>
                        <span className="text-base font-bold text-white tracking-tight">
                          {profile.valor_plano?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4 text-zinc-500">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-white/5">
                        <Calendar size={18} className="text-iron-gold" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Janela de Renovação</span>
                        <span className="text-base font-bold text-white tracking-tight">
                          {profile.data_expiracao ? new Date(profile.data_expiracao).toLocaleDateString('pt-BR') : 'A definir'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-zinc-500">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-white/5">
                        <Clock size={18} className="text-iron-gold" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Última Atividade</span>
                        <span className="text-base font-bold text-white tracking-tight uppercase italic">
                          {profile.ultimo_checkin ? new Date(profile.ultimo_checkin).toLocaleDateString('pt-BR') : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Side */}
              <div className="lg:w-80 flex flex-col gap-6">
                  <div className="p-6 bg-zinc-900/50 rounded-3xl border border-white/5 group-hover:border-iron-gold/20 transition-all">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3">Vínculo Direto</p>
                    <p className="text-xs font-bold text-zinc-400 truncate tracking-tight">{profile.email || 'Não informado'}</p>
                  </div>

                  <button
                    onClick={() => setEditingProfile(!editingProfile)}
                    className="w-full py-5 bg-iron-gold text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(212,175,55,0.1)]"
                  >
                    <Settings size={18} className={`${editingProfile && 'rotate-90'} transition-transform`} />
                    {editingProfile ? 'Cancelar Gestão' : 'Gerenciar Protocolo'}
                  </button>
              </div>
            </div>

            {/* Expansão de Edição */}
            {editingProfile && (
              <div className="mt-12 md:mt-16 pt-12 md:pt-16 border-t border-white/5 animate-in slide-in-from-top-6 duration-700">
                <form onSubmit={handleSaveProfile} className="space-y-8 md:space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Status Financeiro</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full px-6 py-4 bg-zinc-900 border border-white/10 rounded-2xl text-white font-bold text-sm focus:ring-2 focus:ring-iron-gold transition-all appearance-none cursor-pointer"
                      >
                        <option value="pago">SITUAÇÃO: PAGO</option>
                        <option value="pendente">SITUAÇÃO: PENDENTE</option>
                        <option value="atrasado">SITUAÇÃO: EM ATRASO</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Periodicidade</label>
                      <select
                        value={editPlano}
                        onChange={(e) => setEditPlano(e.target.value)}
                        className="w-full px-6 py-4 bg-zinc-900 border border-white/10 rounded-2xl text-white font-bold text-sm focus:ring-2 focus:ring-iron-gold transition-all appearance-none cursor-pointer"
                      >
                        <option value="mensal">PLANO: MENSAL (30D)</option>
                        <option value="trimestral">PLANO: TRIMESTRAL (90D)</option>
                        <option value="semestral">PLANO: SEMESTRAL (180D)</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Valor Contratado (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editValorPlano}
                        onChange={(e) => setEditValorPlano(e.target.value)}
                        placeholder="Ex: 149,90"
                        className="w-full px-6 py-4 bg-zinc-900 border border-white/10 rounded-2xl text-white font-bold text-sm focus:ring-2 focus:ring-iron-gold transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 max-w-md">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Data de Início do Novo Ciclo</label>
                    <input
                      type="date"
                      value={editDataInicio}
                      onChange={(e) => setEditDataInicio(e.target.value)}
                      className="w-full px-6 py-4 bg-zinc-900 border border-white/10 rounded-2xl text-iron-gold font-black text-sm focus:ring-2 focus:ring-iron-gold transition-all"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-12 py-5 bg-iron-gold text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {savingProfile ? 'Sincronizando...' : 'Confirmar Atualização'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Orientações do Coach */}
        <div className="bg-black rounded-3xl p-6 md:p-10 border border-white/5 shadow-2xl mb-8 md:mb-12 relative overflow-hidden group">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-iron-gold/10 rounded-2xl text-iron-gold">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-white tracking-tight uppercase italic">Notas do Especialista</h3>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Orientações Internas (Privado)</p>
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
          <p className="mt-3 text-[9px] text-zinc-600 font-bold uppercase tracking-widest text-right">Auto-save ao sair do campo</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
           {/* Upload de Treino */}
          <div className="bg-black rounded-3xl p-6 md:p-10 border border-white/5 shadow-2xl flex flex-col h-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-iron-gold/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-iron-gold/10 transition-colors"></div>
            
            <div className="flex items-center gap-4 mb-8 relative z-10">
              <div className="p-3 bg-iron-gold/10 rounded-2xl text-iron-gold">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-white tracking-tight uppercase italic">Protocolo de Treino</h3>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Enviar PDF Individual</p>
              </div>
            </div>

            <form onSubmit={handleUploadPdf} className="space-y-4 md:space-y-6 flex-1 flex flex-col justify-between relative z-10">
              <div className="group/input relative">
                <input 
                  type="file" 
                  accept="application/pdf" 
                  onChange={handlePdfChange} 
                  className="w-full px-4 md:px-6 py-8 md:py-12 bg-zinc-900/50 border-2 border-dashed border-white/10 rounded-2xl text-zinc-500 text-xs font-bold text-center file:hidden cursor-pointer hover:bg-black hover:border-iron-gold/30 transition-all"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-zinc-500 group-hover/input:text-iron-gold transition-colors">
                  <Upload size={24} className="mb-2" />
                  <span className="max-w-[80%] truncate">{pdfFile ? pdfFile.name : 'Selecione o arquivo PDF'}</span>
                </div>
              </div>

              {/* Lista de Treinos Enviados */}
              {treinosPdf.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Protocolos Ativos</h4>
                  <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                    {treinosPdf.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-white/5 group/item">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText size={14} className="text-iron-gold shrink-0" />
                          <span className="text-[10px] font-bold text-zinc-400 truncate tracking-tight">{t.nome_arquivo}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteTreino(t.id, t.url_pdf)}
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
                className="w-full py-4 md:py-5 bg-iron-gold text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:scale-[1.02] transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(212,175,55,0.1)]"
              >
                {uploading ? 'Processando...' : 'Publicar Protocolo PDF'}
              </button>
            </form>
          </div>

          {/* Fichas Digitais */}
          <div className="bg-black rounded-3xl p-6 md:p-10 border border-white/5 shadow-2xl flex flex-col h-full relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-32 h-32 bg-iron-gold/5 rounded-full -ml-16 -mt-16 blur-3xl group-hover:bg-iron-gold/10 transition-colors"></div>
            
            <div className="flex items-center gap-4 mb-8 relative z-10">
              <div className="p-3 bg-iron-gold/10 rounded-2xl text-iron-gold">
                <Dumbbell size={20} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-white tracking-tight uppercase italic">Fichas <span className="text-iron-gold">Digitais</span></h3>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Treinos Estruturados</p>
              </div>
            </div>

            <div className="relative z-10 flex-1">
              {fichas.length > 0 ? (
                <div className="space-y-3">
                  <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {fichas.map((ficha) => (
                      <div key={ficha.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/50 border border-white/5 group/ficha hover:border-iron-gold/30 transition-all">
                        <div className="flex items-center gap-4 overflow-hidden flex-1">
                          <div className="w-10 h-10 rounded-xl bg-iron-gold/10 flex items-center justify-center shrink-0">
                            <Dumbbell size={16} className="text-iron-gold" />
                          </div>
                          <div className="overflow-hidden flex-1">
                            <p className="text-[11px] font-black text-white uppercase tracking-tight truncate">
                              {ficha.nome_rotina}
                            </p>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
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
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest text-center mt-4 pt-4 border-t border-white/5">
                    {fichas.length} Ficha{fichas.length !== 1 ? 's' : ''} Ativa{fichas.length !== 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center text-center text-zinc-600">
                  <Dumbbell size={32} className="text-zinc-800 mb-3 opacity-50" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sem Fichas Digitais</p>
                  <p className="text-[9px] text-zinc-700 mt-1">Crie fichas em Gestão de Treinos</p>
                </div>
              )}
            </div>
          </div>

          {/* Gráfico de Evolução */}
          <div className="bg-black rounded-3xl p-6 md:p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-iron-gold/5 rounded-full -ml-16 -mb-16 blur-3xl opacity-50"></div>
            
            <div className="flex items-center gap-4 mb-8 relative z-10">
              <div className="p-3 bg-iron-gold/10 rounded-2xl text-iron-gold">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-white tracking-tight uppercase italic">Dinâmica de Carga</h3>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Acompanhamento Biométrico</p>
              </div>
            </div>

            <div className="relative z-10">
              {medidas.length > 1 ? (
                <div className="w-full h-44 md:h-52 bg-zinc-900/50 rounded-2xl flex items-center justify-center border border-white/5 border-dashed relative group/chart">
                  <div className="flex flex-col items-center gap-3">
                    <LineChart size={32} className="text-zinc-800 group-hover/chart:text-iron-gold/20 transition-colors" />
                    <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">DNA de Evolução Ativo</p>
                  </div>
                </div>
              ) : (
                <div className="h-44 md:h-52 flex flex-col items-center justify-center text-center p-6 md:p-8 bg-zinc-900/30 rounded-2xl border border-white/5">
                  <AlertCircle size={32} className="text-zinc-800 mb-4" />
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-loose">
                    Dados Insuficientes.<br/>O aluno requer registros.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notas do Especialista */}
        <div className="bg-black rounded-3xl p-6 md:p-10 border border-white/5 shadow-2xl relative overflow-hidden group mb-12">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-iron-gold/10 rounded-2xl text-iron-gold">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-white tracking-tight uppercase italic">Orientações do Especialista</h3>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Notas Privadas do Coach</p>
              </div>
            </div>

            <textarea
              value={profile?.orientacoes || ""}
              onChange={(e) => setProfile(prev => prev ? { ...prev, orientacoes: e.target.value } : null)}
              onBlur={async () => {
                if (!profile) return;
                try {
                  await supabaseClient
                    .from("profiles")
                    .update({ orientacoes: profile.orientacoes })
                    .eq("id", id);
                } catch (err) {
                  console.error("Erro ao salvar orientações:", err);
                }
              }}
              placeholder="Escreva aqui observações, pontos de atenção ou notas técnicas sobre a evolução do atleta..."
              className="w-full h-48 bg-zinc-900/50 border border-white/5 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-iron-gold/30 transition-all resize-none placeholder:text-zinc-700 font-medium"
            />
            <div className="mt-4 flex justify-end">
              <p className="text-[9px] text-zinc-700 font-black uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={10} className="text-iron-gold" /> Salvamento Automático Ativo
              </p>
            </div>
        </div>

        {/* Galeria de Evolução */}
        <div className="mb-12 md:mb-20">
          <div className="flex items-center gap-4 mb-6 md:mb-8 px-4">
            <div className="p-3 bg-iron-gold/10 rounded-2xl text-iron-gold">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-white tracking-tight uppercase italic">Linha do Tempo Visual</h3>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Evolução Fisiológica</p>
            </div>
          </div>

          {fotos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {fotos.map((f) => (
                <div key={f.id} className="group bg-zinc-900/40 rounded-3xl overflow-hidden shadow-2xl border border-white/5 hover:border-iron-gold/30 transition-all duration-500">
                  <div className="relative aspect-3/4 bg-zinc-950 overflow-hidden">
                    <img src={f.url_foto} alt={f.tipo} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000" />
                    <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent opacity-60" />
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        <span className="text-[8px] font-black text-white uppercase tracking-widest">{f.tipo}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
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
          ) : (
            <div className="bg-zinc-900/20 rounded-[40px] p-12 md:p-24 text-center border border-dashed border-white/5">
               <ImageIcon size={48} className="text-zinc-800 mx-auto mb-6" />
               <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.4em]">Aguardando Capturas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
