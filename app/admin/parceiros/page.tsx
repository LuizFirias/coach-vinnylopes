'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';

interface Parceiro {
  id: string;
  nome_marca: string;
  descricao: string;
  cupom: string;
  link_desconto: string;
  logo_url?: string | null;
  imagens?: string[] | null;
}

import { Plus, Tag, ExternalLink, Image as ImageIcon, X, Loader2, AlertCircle, ShoppingBag } from 'lucide-react';

export default function ParceirosAdminPage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [nomeProduto, setNomeProduto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cupom, setCupom] = useState("");
  const [linkDesconto, setLinkDesconto] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const imagePreviews = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles]
  );

  useEffect(() => {
    fetchParceiros();
  }, []);

  const fetchParceiros = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('parceiros')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setParceiros(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      setFormError("Máximo 5 imagens");
      return;
    }
    setImageFiles(files);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const fileName = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabaseClient.storage
          .from('parceiros-logos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseClient.storage
          .from('parceiros-logos')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      const { error: dbError } = await supabaseClient
        .from('parceiros')
        .insert({
          nome_marca: nomeProduto,
          descricao,
          cupom,
          link_desconto: linkDesconto,
          logo_url: uploadedUrls[0] || null,
          imagens: uploadedUrls
        });

      if (dbError) throw dbError;

      setModalOpen(false);
      resetForm();
      fetchParceiros();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNomeProduto("");
    setDescricao("");
    setCupom("");
    setLinkDesconto("");
    setImageFiles([]);
    setFormError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-10 lg:pl-28">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
              Gestão de <span className="text-brand-purple">Parceiros</span>
            </h1>
            <p className="text-slate-500 font-medium">Configure benefícios e cupons exclusivos para seus alunos</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 bg-brand-purple text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-brand-purple/20 hover:scale-[1.02] transition-all active:scale-95"
          >
            <Plus size={18} />
            ADICIONAR PARCEIRO
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 flex items-center gap-3 font-medium">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 md:py-32 gap-4 text-slate-400">
            <Loader2 size={40} className="animate-spin text-brand-purple" />
            <p className="text-xs font-black uppercase tracking-[0.3em]">Carregando rede...</p>
          </div>
        ) : parceiros.length === 0 ? (
          <div className="bg-white rounded-2xl p-20 md:p-32 border border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 mb-8">
              <ShoppingBag size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Nenhum parceiro ativo</h2>
            <p className="text-slate-500 max-w-sm">Cadastre marcas parceiras para que seus alunos tenham acesso a descontos exclusivos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {parceiros.map((parceiro) => (
              <div key={parceiro.id} className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 md:p-8 border border-slate-50 relative group hover:scale-[1.02] transition-all duration-500">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center mb-6 border border-slate-100 shadow-sm">
                  {parceiro.logo_url ? (
                    <img
                      src={parceiro.logo_url}
                      alt={parceiro.nome_marca}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <ImageIcon size={32} className="text-slate-200" />
                  )}
                </div>
                
                <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-3">{parceiro.nome_marca}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6 md:mb-8 line-clamp-3 min-h-18">{parceiro.descricao}</p>
                
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-5 py-3 bg-brand-purple/5 rounded-2xl border border-brand-purple/10">
                    <span className="text-[10px] font-black text-brand-purple/60 uppercase tracking-widest">CUPOM</span>
                    <span className="font-black text-brand-purple tracking-wider font-mono">{parceiro.cupom}</span>
                  </div>
                  
                  <a
                    href={parceiro.link_desconto}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"
                  >
                    ACESSAR LOJA <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 md:p-10 overflow-hidden">
            <div className="flex items-center justify-between mb-6 md:mb-10 border-b border-slate-50 pb-4 md:pb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900">Novo <span className="text-brand-purple">Parceiro</span></h2>
                <p className="text-slate-400 font-medium text-sm">Preencha os dados da marca parceira</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {formError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 flex items-center gap-3 text-sm font-medium">
                <AlertCircle size={18} />
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-6 md:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">NOME DA MARCA</label>
                  <input
                    type="text"
                    value={nomeProduto}
                    onChange={(e) => setNomeProduto(e.target.value)}
                    className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:border-brand-purple transition-all"
                    placeholder="Ex: Growth Supplements"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">CÓDIGO DO CUPOM</label>
                  <div className="relative">
                    <Tag className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="text"
                      value={cupom}
                      onChange={(e) => setCupom(e.target.value)}
                      className="w-full h-14 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:border-brand-purple transition-all"
                      placeholder="COACHVINNY"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">DESCRIÇÃO CURTA</label>
                <textarea
                  rows={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-medium focus:outline-none focus:border-brand-purple transition-all resize-none"
                  placeholder="Explique o beneficio em poucas palavras..."
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">LINK DE DESCONTO</label>
                <div className="relative">
                  <ExternalLink className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="url"
                    value={linkDesconto}
                    onChange={(e) => setLinkDesconto(e.target.value)}
                    className="w-full h-14 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-medium focus:outline-none focus:border-brand-purple transition-all"
                    placeholder="https://loja.com/alunovinny"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">IMAGENS (MÁX 5)</label>
                <div className="relative flex flex-col items-center justify-center w-full h-28 md:h-32 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-brand-purple/5 hover:border-brand-purple/30 transition-all cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagesChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center p-4">
                    <ImageIcon size={24} className="text-slate-300 mb-2 group-hover:text-brand-purple" />
                    <p className="text-xs font-bold text-slate-500">Clique para selecionar</p>
                  </div>
                </div>
                
                {imagePreviews.length > 0 && (
                  <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="shrink-0 w-20 h-20 rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm">
                        <img src={src} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-14 md:h-16 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10 hover:bg-brand-purple transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    PROCESSANDO...
                  </>
                ) : (
                  'CADASTRAR PARCEIRO'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
