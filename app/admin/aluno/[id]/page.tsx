"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

interface Profile {
  id: string;
  full_name?: string | null;
  email?: string | null;
  ultimo_checkin?: string | null;
  status_pagamento?: string | null;
  tipo_plano?: string | null;
  data_inicio?: string | null;
  data_expiracao?: string | null;
}

interface Foto {
  id: string;
  tipo: string;
  url_foto: string;
  data_upload: string;
}

export default function AdminAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params); // Unwrap params Promise corretamente
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [medidas, setMedidas] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editStatus, setEditStatus] = useState<string>("pago");
  const [editPlano, setEditPlano] = useState<string>("mensal");
  const [editDataInicio, setEditDataInicio] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setError(null);
    try {
      const { data: prof } = await supabaseClient.from("profiles").select("*").eq("id", id).single();
      setProfile(prof as Profile);
      
      // Preencher os campos de edição com valores atuais
      if (prof) {
        setEditStatus(prof.status_pagamento || "pago");
        setEditPlano(prof.tipo_plano || "mensal");
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
        .from("medidas")
        .select("id, peso, data_medicao")
        .eq("user_id", id)
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
      // Calcular data de expiração baseada no tipo de plano
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

      const { error } = await supabaseClient
        .from("profiles")
        .update({
          status_pagamento: editStatus,
          tipo_plano: editPlano,
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
    <div className="min-h-screen bg-coach-black p-3 md:p-8 pt-3 md:pt-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Mobile-First */}
        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-white">Perfil do Aluno</h1>
            <p className="text-xs md:text-sm text-gray-400 mt-0.5">Gerencie planos, status e uploads</p>
          </div>
          <button 
            onClick={() => router.back()} 
            className="w-full sm:w-auto px-4 py-2 md:px-6 md:py-3 bg-white/[0.03] border border-white/10 text-white text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-white/[0.05] transition-all duration-300"
          >
            Voltar
          </button>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-xs md:text-sm">
            {error}
          </div>
        )}

        {/* Informações do Aluno - Card Premium com Status */}
        {profile && (
          <div className="mb-4 md:mb-6 bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
              <div className="flex-1">
                <h2 className="text-lg md:text-2xl font-bold text-white mb-1.5 md:mb-2">
                  {profile.full_name || profile.email || 'Aluno'}
                </h2>
                <div className="space-y-1 md:space-y-1.5 text-xs md:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">{profile.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Último check-in:</span>
                    <span className="text-yellow-500 font-semibold">
                      {profile.ultimo_checkin ? new Date(profile.ultimo_checkin).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Status:</span>
                    <span className={`inline-flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold ${
                      profile.status_pagamento === 'pago' 
                        ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                        : profile.status_pagamento === 'atrasado'
                        ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                        : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                    }`}>
                      {profile.status_pagamento === 'pago' && <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-green-400 rounded-full animate-pulse" />}
                      {profile.status_pagamento === 'pago' ? 'Pago' : profile.status_pagamento === 'atrasado' ? 'Atrasado' : 'Pendente'}
                    </span>
                  </div>
                  {profile.tipo_plano && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Plano:</span>
                      <span className="text-white font-semibold capitalize">{profile.tipo_plano}</span>
                    </div>
                  )}
                  {profile.data_inicio && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Início:</span>
                      <span className="text-white">{new Date(profile.data_inicio).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                  {profile.data_expiracao && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Validade:</span>
                      <span className="text-yellow-500 font-semibold">
                        {new Date(profile.data_expiracao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botão Editar - Mobile Full Width */}
              <button
                onClick={() => setEditingProfile(!editingProfile)}
                className="w-full md:w-auto px-4 py-2 md:px-6 md:py-3 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[10px] md:text-xs font-black uppercase tracking-wider rounded-lg md:rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98]"
              >
                {editingProfile ? 'Cancelar' : 'Editar Plano'}
              </button>
            </div>

            {/* Formulário de Edição */}
            {editingProfile && (
              <form onSubmit={handleSaveProfile} className="mt-4 pt-4 border-t border-white/10 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] text-gray-400 ml-1 mb-1.5">
                      Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-2 md:px-4 md:py-3 bg-white/[0.03] border border-white/10 rounded-lg md:rounded-xl text-white text-sm focus:outline-none focus:border-yellow-500/40 focus:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300"
                    >
                      <option value="pago" className="bg-gray-800 text-white">Pago</option>
                      <option value="pendente" className="bg-gray-800 text-white">Pendente</option>
                      <option value="atrasado" className="bg-gray-800 text-white">Atrasado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] text-gray-400 ml-1 mb-1.5">
                      Tipo de Plano
                    </label>
                    <select
                      value={editPlano}
                      onChange={(e) => setEditPlano(e.target.value)}
                      className="w-full px-3 py-2 md:px-4 md:py-3 bg-white/[0.03] border border-white/10 rounded-lg md:rounded-xl text-white text-sm focus:outline-none focus:border-yellow-500/40 focus:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300"
                    >
                      <option value="mensal" className="bg-gray-800 text-white">Mensal (30 dias)</option>
                      <option value="trimestral" className="bg-gray-800 text-white">Trimestral (90 dias)</option>
                      <option value="semestral" className="bg-gray-800 text-white">Semestral (180 dias)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] text-gray-400 ml-1 mb-1.5">
                    Data de Início do Plano
                  </label>
                  <input
                    type="date"
                    value={editDataInicio}
                    onChange={(e) => setEditDataInicio(e.target.value)}
                    className="w-full px-3 py-2 md:px-4 md:py-3 bg-white/[0.03] border border-white/10 rounded-lg md:rounded-xl text-white text-sm focus:outline-none focus:border-yellow-500/40 focus:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300"
                    required
                  />
                  <p className="text-[10px] md:text-xs text-gray-500 mt-1.5">
                    💡 A data de validade será calculada automaticamente
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-3 md:py-4 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[10px] md:text-xs font-black uppercase tracking-wider rounded-lg md:rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98] disabled:opacity-50"
                >
                  {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Upload PDF - Mobile Optimized */}
        <div className="mb-4 md:mb-6 bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-6">
          <h3 className="text-white font-semibold text-base md:text-lg mb-3 md:mb-4">Enviar PDF de Treino para este aluno</h3>
          <form onSubmit={handleUploadPdf} className="space-y-3">
            <div>
              <label className="block text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] text-gray-400 ml-1 mb-1.5">
                Escolher ficheiro PDF
              </label>
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handlePdfChange} 
                className="w-full px-3 py-2 md:px-4 md:py-3 bg-white/[0.03] border border-white/10 rounded-lg md:rounded-xl text-white text-xs md:text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] md:file:text-xs file:font-semibold file:bg-yellow-500/20 file:text-yellow-500 hover:file:bg-yellow-500/30 transition-all duration-300"
              />
            </div>
            <button 
              type="submit" 
              disabled={uploading || !pdfFile}
              className="w-full py-2.5 md:py-4 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[10px] md:text-xs font-black uppercase tracking-wider rounded-lg md:rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Enviando...' : 'Fazer Upload'}
            </button>
          </form>
        </div>

        {/* Fotos recentes - Grid Responsivo */}
        <div className="mb-4 md:mb-6">
          <h4 className="text-white font-semibold text-base md:text-lg mb-3 md:mb-4 px-1">Fotos Recentes</h4>
          {fotos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {fotos.map((f) => (
                <div key={f.id} className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl overflow-hidden hover:border-yellow-500/20 transition-all duration-300">
                  <div className="relative aspect-square bg-black">
                    <img src={f.url_foto} alt={f.tipo} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2 md:p-3">
                    <div className="text-white font-medium text-xs md:text-sm mb-0.5">{f.tipo}</div>
                    <div className="text-gray-400 text-[10px] md:text-xs">
                      {new Date(f.data_upload).toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-6 md:p-8 text-center">
              <div className="text-gray-400 text-sm mb-1">Nenhuma foto encontrada.</div>
              <p className="text-[10px] md:text-xs text-gray-500">As fotos de evolução aparecerão aqui</p>
            </div>
          )}
        </div>

        {/* Gráfico de peso - Mobile Optimized */}
        <div className="mb-4 md:mb-6 bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-6">
          <h4 className="text-white font-semibold text-base md:text-lg mb-3 md:mb-4">Evolução de Peso</h4>
          {medidas.length > 1 ? (
            <div className="w-full h-48 md:h-80 bg-black/20 rounded-lg md:rounded-xl flex items-center justify-center border border-white/5">
              <p className="text-gray-500 text-xs md:text-sm">Gráfico em desenvolvimento</p>
            </div>
          ) : (
            <div className="text-center py-6 md:py-8">
              <p className="text-gray-400 text-sm">Mais de uma medição necessária para visualizar o gráfico.</p>
              <p className="text-[10px] md:text-xs text-gray-500 mt-1.5">O aluno precisa registrar pelo menos 2 medições</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
