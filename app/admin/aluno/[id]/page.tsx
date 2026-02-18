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
  Trash2,
  Settings,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle
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
}

interface Foto {
  id: string;
  tipo: string;
  url_foto: string;
  data_upload: string;
}

export default function AdminAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params); 
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [medidas, setMedidas] = useState<any[]>([]);
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
        .eq("user_id", id)
        .order("data_upload", { ascending: false })
        .limit(10);
      setFotos((fotosData as Foto[]) || []);

      const { data: medidasData } = await supabaseClient
        .from("medidas_aluno")
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
      const fileName = `${id}_${Date.now()}_${pdfFile.name}`;
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
      await load();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setUploading(false);
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
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8 lg:p-12 mb-6 md:mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-purple/5 rounded-bl-[120px] pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row gap-8 md:gap-12 relative">
              {/* Header Info */}
              <div className="flex-1">
                <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-8 flex-wrap">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                    <User size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase mb-2">
                       {profile.full_name || 'Usuário sem Nome'}
                    </h2>
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      profile.status_pagamento === 'pago' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${profile.status_pagamento === 'pago' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                      {profile.status_pagamento === 'pago' ? 'Acesso Ativo' : 'Pendente / Atrasado'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 md:gap-y-6 gap-x-8 md:gap-x-12">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-slate-400">
                      <CreditCard size={18} className="text-brand-purple/40" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Plano Atual</span>
                        <span className="text-sm font-bold text-slate-900 capitalize">{profile.tipo_plano || 'Nenhum'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <DollarSign size={18} className="text-brand-purple/40" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Investimento</span>
                        <span className="text-sm font-bold text-slate-900">
                          {profile.valor_plano?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-slate-400">
                      <Calendar size={18} className="text-brand-purple/40" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Ciclo de Renovação</span>
                        <span className="text-sm font-bold text-slate-900">
                          {profile.data_expiracao ? new Date(profile.data_expiracao).toLocaleDateString('pt-BR') : 'Sem data'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <Clock size={18} className="text-brand-purple/40" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Último Check-in</span>
                        <span className="text-sm font-bold text-slate-900">
                          {profile.ultimo_checkin ? new Date(profile.ultimo_checkin).toLocaleDateString('pt-BR') : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Side */}
              <div className="lg:w-72 flex flex-col gap-4">
                  <button
                    onClick={() => setEditingProfile(!editingProfile)}
                    className="w-full py-4 md:py-5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-brand-purple transition-all flex items-center justify-center gap-3 group shadow-xl shadow-slate-200"
                  >
                    <Settings size={18} className="group-hover:rotate-45 transition-transform" />
                    {editingProfile ? 'Cancelar Edição' : 'Gerenciar Plano'}
                  </button>
                  
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Vínculo de E-mail</p>
                    <p className="text-xs font-bold text-slate-600 truncate">{profile.email || 'Não informado'}</p>
                  </div>
              </div>
            </div>

            {/* Expansão de Edição */}
            {editingProfile && (
              <div className="mt-8 md:mt-12 pt-8 md:pt-12 border-t border-slate-100 animate-in slide-in-from-top-4 duration-500">
                <form onSubmit={handleSaveProfile} className="space-y-6 md:space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Status Financeiro</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold text-sm focus:ring-2 focus:ring-brand-purple transition-all appearance-none cursor-pointer"
                      >
                        <option value="pago">SITUAÇÃO: PAGO</option>
                        <option value="pendente">SITUAÇÃO: PENDENTE</option>
                        <option value="atrasado">SITUAÇÃO: EM ATRASO</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Periodicidade</label>
                      <select
                        value={editPlano}
                        onChange={(e) => setEditPlano(e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold text-sm focus:ring-2 focus:ring-brand-purple transition-all appearance-none cursor-pointer"
                      >
                        <option value="mensal">PLANO: MENSAL (30D)</option>
                        <option value="trimestral">PLANO: TRIMESTRAL (90D)</option>
                        <option value="semestral">PLANO: SEMESTRAL (180D)</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Valor Contratado (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editValorPlano}
                        onChange={(e) => setEditValorPlano(e.target.value)}
                        placeholder="Ex: 149,90"
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold text-sm focus:ring-2 focus:ring-brand-purple transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 max-w-md">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Data de Início do Novo Ciclo</label>
                    <input
                      type="date"
                      value={editDataInicio}
                      onChange={(e) => setEditDataInicio(e.target.value)}
                      className="w-full px-6 py-4 bg-brand-purple/5 border-none rounded-2xl text-brand-purple font-black text-sm focus:ring-2 focus:ring-brand-purple transition-all"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-8 md:px-12 py-4 md:py-5 bg-brand-purple text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-brand-purple/20 hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {savingProfile ? 'Sincronizando...' : 'Confirmar Atualização'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
           {/* Upload de Treino */}
          <div className="bg-white rounded-2xl p-6 md:p-10 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col h-full">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-brand-purple/10 rounded-2xl text-brand-purple">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Prescrição de Treino</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Enviar PDF Individual</p>
              </div>
            </div>

            <form onSubmit={handleUploadPdf} className="space-y-4 md:space-y-6 flex-1 flex flex-col justify-between">
              <div className="group relative">
                <input 
                  type="file" 
                  accept="application/pdf" 
                  onChange={handlePdfChange} 
                  className="w-full px-4 md:px-6 py-8 md:py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-bold text-center file:hidden cursor-pointer hover:bg-white hover:border-brand-purple/30 transition-all"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 group-hover:text-brand-purple transition-colors">
                  <Upload size={24} className="mb-2" />
                  <span>{pdfFile ? pdfFile.name : 'Clique para selecionar PDF'}</span>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={uploading || !pdfFile}
                className="w-full py-4 md:py-5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-brand-purple transition-all disabled:opacity-30 flex items-center justify-center gap-3"
              >
                {uploading ? 'Processando Arquivo...' : 'Publicar Treino PDF'}
              </button>
            </form>
          </div>

          {/* Gráfico de Evolução */}
          <div className="bg-white rounded-2xl p-6 md:p-10 border border-slate-100 shadow-xl shadow-slate-200/50">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-brand-purple/10 rounded-2xl text-brand-purple">
                <LineChart size={20} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Dinâmica de Peso</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Acompanhamento Biométrico</p>
              </div>
            </div>

            {medidas.length > 1 ? (
              <div className="w-full h-40 md:h-48 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 border-dashed relative group">
                <div className="flex flex-col items-center gap-3">
                  <LineChart size={32} className="text-slate-200 group-hover:text-brand-purple/20 transition-colors" />
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Vetor de Evolução Ativo</p>
                </div>
              </div>
            ) : (
              <div className="h-40 md:h-48 flex flex-col items-center justify-center text-center p-6 md:p-8 bg-slate-50 rounded-2xl">
                <AlertCircle size={32} className="text-slate-200 mb-4" />
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-loose">
                  Dados Insuficientes.<br/>O aluno requer +1 registro.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Galeria de Evolução */}
        <div className="mb-12 md:mb-20">
          <div className="flex items-center gap-4 mb-6 md:mb-8 px-4">
            <div className="p-3 bg-brand-purple/10 rounded-2xl text-brand-purple">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Histórico de Visualização</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Fotos de Evolução Fisiológica</p>
            </div>
          </div>

          {fotos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {fotos.map((f) => (
                <div key={f.id} className="group bg-white rounded-2xl overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-all duration-500">
                  <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
                    <img src={f.url_foto} alt={f.tipo} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none" />
                  </div>
                  <div className="p-6">
                    <div className="bg-brand-purple/10 text-brand-purple text-[8px] font-black uppercase tracking-[0.2em] inline-block px-3 py-1 rounded-full mb-3">
                      REGISTRO: {f.tipo}
                    </div>
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                       <Calendar size={12} />
                       {new Date(f.data_upload).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: 'long', 
                       })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 md:p-20 text-center border border-dashed border-slate-200">
               <ImageIcon size={48} className="text-slate-100 mx-auto mb-6" />
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Nenhuma evidência visual</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
