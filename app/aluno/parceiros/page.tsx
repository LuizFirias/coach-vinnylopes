'use client';

import { useMemo, useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { 
  ShoppingBag, 
  Tag, 
  ExternalLink, 
  Copy, 
  Check, 
  Plus, 
  X,
  Upload,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Star
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Parceiro {
  id: string;
  nome_marca: string;
  descricao: string;
  cupom: string;
  link_desconto: string;
  logo_url?: string | null;
  imagens?: string[] | null;
}

export default function ParceirosPage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCupom, setCopiedCupom] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nomeProduto, setNomeProduto] = useState('');
  const [descricaoForm, setDescricaoForm] = useState('');
  const [cupomForm, setCupomForm] = useState('');
  const [linkDesconto, setLinkDesconto] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParceiros = async () => {
      try {
        const { data: authData } = await supabaseClient.auth.getUser();
        const user = authData?.user;
        if (user) {
          const { data: profileData } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          setUserRole(profileData?.role || null);
        }

        const { data, error: fetchError } = await supabaseClient
          .from('parceiros')
          .select('id, nome_marca, descricao, cupom, link_desconto, logo_url, imagens')
          .order('ordem', { ascending: true })
          .order('nome_marca', { ascending: true });

        if (fetchError) {
          setError('Erro ao carregar parceiros: ' + fetchError.message);
          setLoading(false);
          return;
        }

        setParceiros(data || []);
        setLoading(false);
      } catch (err) {
        setError('Erro ao conectar com o servidor');
        setLoading(false);
      }
    };

    fetchParceiros();
  }, []);

  const imagePreviews = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles]
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const resetForm = () => {
    setNomeProduto('');
    setDescricaoForm('');
    setCupomForm('');
    setLinkDesconto('');
    setImageFiles([]);
    setFormError(null);
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      setFormError('Selecione no máximo 5 imagens');
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setFormError('Envie apenas imagens');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Cada imagem deve ter no máximo 5MB');
        return;
      }
    }

    setFormError(null);
    setImageFiles(files);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!nomeProduto.trim() || !descricaoForm.trim() || !cupomForm.trim() || !linkDesconto.trim()) {
      setFormError('Preencha todos os campos');
      return;
    }

    if (imageFiles.length === 0) {
      setFormError('Envie pelo menos 1 imagem');
      return;
    }

    setSaving(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const fileName = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabaseClient.storage
          .from('parceiros-logos')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabaseClient.storage
          .from('parceiros-logos')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl.publicUrl);
      }

      const logoUrl = uploadedUrls[0] || null;

      const { error: insertError } = await supabaseClient
        .from('parceiros')
        .insert({
          nome_marca: nomeProduto.trim(),
          descricao: descricaoForm.trim(),
          cupom: cupomForm.trim(),
          link_desconto: linkDesconto.trim(),
          logo_url: logoUrl,
          imagens: uploadedUrls,
        });

      if (insertError) throw insertError;

      resetForm();
      setModalOpen(false);

      const { data, error: fetchError } = await supabaseClient
        .from('parceiros')
        .select('id, nome_marca, descricao, cupom, link_desconto, logo_url, imagens')
        .order('ordem', { ascending: true })
        .order('nome_marca', { ascending: true });

      if (fetchError) throw fetchError;
      setParceiros((data as Parceiro[]) || []);
    } catch (err: any) {
      setFormError(err?.message || 'Erro ao cadastrar parceiro');
    } finally {
      setSaving(false);
    }
  };

  const handleCopiarCupom = (cupom: string) => {
    navigator.clipboard.writeText(cupom);
    setCopiedCupom(cupom);

    setTimeout(() => {
      setCopiedCupom(null);
    }, 2000);
  };

  const handleIrParaSite = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    window.open(url, '_blank');
  };

  const handleScroll = (id: string, direction: number) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * direction, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 lg:pl-28">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-12 h-12 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin"></div>
          <span className="font-bold uppercase tracking-widest text-[10px]">Carregando benefícios...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 lg:pl-28 font-sans pb-32">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8 mb-8 md:mb-16">
          <div>
            <Link href="/aluno/dashboard" className="inline-flex items-center gap-2 text-brand-purple font-black text-[9px] md:text-[10px] uppercase tracking-widest mb-3 md:mb-4 hover:ml-1 transition-all">
              <ArrowLeft size={12} /> Voltar ao Painel
            </Link>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-2 md:mb-3">
              Clube de <span className="text-brand-purple underline decoration-slate-200 decoration-8 underline-offset-4">Vantagens</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm">Benefícios exclusivos para alunos Coach Vinny em marcas parceiras.</p>
          </div>

          {userRole === 'coach' && (
            <button
              onClick={() => setModalOpen(true)}
              className="px-6 md:px-8 py-4 md:py-5 bg-slate-900 text-white rounded-2xl md:rounded-[24px] font-black shadow-2xl shadow-slate-900/20 hover:bg-brand-purple hover:shadow-brand-purple/30 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]"
            >
              <Plus size={18} strokeWidth={3} />
              Adicionar Parceiro
            </button>
          )}
        </div>

        {error && (
            <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 mb-10 font-bold text-sm">
              🚨 {error}
            </div>
        )}

        {/* Partners Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
          {parceiros.map((parceiro) => (
            <div
              key={parceiro.id}
              className="bg-white rounded-2xl md:rounded-[50px] border border-white shadow-2xl shadow-slate-200/40 overflow-hidden flex flex-col group transition-all duration-500 hover:shadow-brand-purple/5"
            >
              {/* Image Carousel */}
              <div className="relative h-[280px] md:h-[340px] w-full overflow-hidden bg-slate-100">
                <div
                  id={`carousel-${parceiro.id}`}
                  className="flex h-full transition-transform duration-500 ease-out overflow-x-hidden"
                >
                  {(parceiro.imagens || [parceiro.logo_url || '']).map((img, idx) => (
                    <div key={idx} className="min-w-full h-full relative p-4">
                      <div className="w-full h-full rounded-[40px] overflow-hidden relative border-8 border-white shadow-inner bg-white">
                        <Image
                          src={img}
                          alt={`${parceiro.nome_marca} view ${idx + 1}`}
                          fill
                          className="object-contain transition-transform duration-700 group-hover:scale-105"
                          sizes="(max-w-768px) 100vw, 50vw"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Badges Overlay */}
                <div className="absolute top-8 left-8 flex flex-col gap-2 z-10">
                   <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
                      <Star size={14} className="fill-brand-purple text-brand-purple" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Premium Partner</span>
                   </div>
                </div>

                {/* Carousel Navigation */}
                {(parceiro.imagens && parceiro.imagens.length > 1) && (
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleScroll(`carousel-${parceiro.id}`, -1)}
                      className="w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-slate-900 shadow-xl hover:bg-brand-purple hover:text-white transition-all border border-slate-100"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="px-4 py-2 bg-slate-900/80 backdrop-blur text-white rounded-full text-[10px] font-black tabular-nums">
                       GALERIA
                    </div>
                    <button
                      onClick={() => handleScroll(`carousel-${parceiro.id}`, 1)}
                      className="w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-slate-900 shadow-xl hover:bg-brand-purple hover:text-white transition-all border border-slate-100"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="p-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 leading-none mb-2 uppercase italic tracking-tighter group-hover:text-brand-purple transition-colors">
                      {parceiro.nome_marca}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-400">
                       <ShieldCheck size={14} />
                       <span className="text-[10px] font-black uppercase tracking-widest">Verificado pelo Coach</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-purple shadow-inner border border-white">
                     <ShoppingBag size={24} />
                  </div>
                </div>

                <p className="text-slate-500 font-medium text-sm mb-10 leading-relaxed max-w-lg">
                  {parceiro.descricao}
                </p>

                <div className="mt-auto space-y-6">
                   {/* Coupon Action */}
                   <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex items-center justify-between group/cupom">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                           <Tag size={12} className="text-brand-purple" />
                           Cupom Exclusivo
                        </p>
                        <span className="text-xl font-black text-slate-900 tracking-wider font-mono uppercase">{parceiro.cupom}</span>
                      </div>
                      <button
                         onClick={() => handleCopiarCupom(parceiro.cupom)}
                         className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg ${
                            copiedCupom === parceiro.cupom 
                             ? 'bg-green-500 text-white shadow-green-200' 
                             : 'bg-white text-slate-900 hover:bg-slate-900 hover:text-white shadow-slate-100'
                         }`}
                      >
                         {copiedCupom === parceiro.cupom ? (
                           <><Check size={14} strokeWidth={3} /> Copiado</>
                         ) : (
                           <><Copy size={14} /> Copiar</>
                         )}
                      </button>
                   </div>

                   {/* External Link */}
                   <button
                     onClick={() => handleIrParaSite(parceiro.link_desconto)}
                     className="w-full py-5 bg-brand-purple text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-purple/30 hover:-translate-y-1 hover:shadow-brand-purple/40 transition-all flex items-center justify-center gap-3 relative overflow-hidden active:scale-95"
                   >
                     Aproveitar Desconto
                     <ExternalLink size={18} />
                   </button>
                </div>
              </div>
            </div>
          ))}

          {parceiros.length === 0 && (
            <div className="col-span-full bg-white rounded-[50px] p-24 text-center border border-dashed border-slate-200 shadow-xl shadow-slate-100 flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200 mb-8 border border-white">
                <ShieldCheck size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Clube em Formação</h3>
              <p className="max-w-xs text-slate-400 font-medium mb-6">
                Estamos finalizando parcerias com as melhores marcas para trazer benefícios únicos para você.
              </p>
              <div className="px-6 py-3 bg-slate-50 rounded-2xl flex items-center gap-3 opacity-50">
                 <div className="w-2 h-2 rounded-full bg-brand-purple animate-pulse"></div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Em negociação estratégica</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Adicionar Parceiro (Coach) */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 lg:pl-28 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[50px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Novo Parceiro</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cadastro Estratégico</p>
                  </div>
                </div>
                <button
                  onClick={() => { setModalOpen(false); resetForm(); }}
                  className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:rotate-90 transition-all shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-10 max-h-[70vh] overflow-y-auto">
                <form onSubmit={handleCreate} className="space-y-8">
                  {formError && (
                    <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 font-bold text-xs animate-bounce">
                      🚨 {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Marca/Produto</label>
                       <input
                         type="text"
                         value={nomeProduto}
                         onChange={(e) => setNomeProduto(e.target.value)}
                         placeholder="Ex: Growth Supplements"
                         className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 text-slate-900 font-bold focus:bg-white focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/5 transition-all outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Cupom de Desconto</label>
                       <input
                         type="text"
                         value={cupomForm}
                         onChange={(e) => setCupomForm(e.target.value)}
                         placeholder="Ex: VINNY10"
                         className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 text-slate-900 font-mono font-black focus:bg-white focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/5 transition-all outline-none uppercase"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Descrição Curta</label>
                    <textarea
                      value={descricaoForm}
                      onChange={(e) => setDescricaoForm(e.target.value)}
                      placeholder="Benefícios e sobre a marca..."
                      rows={3}
                      className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 text-slate-900 font-medium focus:bg-white focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/5 transition-all outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Link Afiliado/Desconto</label>
                    <input
                      type="text"
                      value={linkDesconto}
                      onChange={(e) => setLinkDesconto(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 text-slate-900 font-bold focus:bg-white focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/5 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Imagens (Max 5)</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                       {imagePreviews.map((url, idx) => (
                         <div key={idx} className="relative aspect-square bg-slate-50 rounded-2xl border-2 border-slate-100 overflow-hidden shadow-inner group/preview">
                            <Image src={url} alt="preview" fill className="object-cover" />
                            <div className="absolute inset-0 bg-brand-purple/20 opacity-0 group-hover/preview:opacity-100 transition-opacity"></div>
                         </div>
                       ))}
                       {imageFiles.length < 5 && (
                         <label className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-300 hover:border-brand-purple hover:text-brand-purple transition-all cursor-pointer hover:bg-brand-purple/5 group/add">
                            <Upload size={18} className="group-hover/add:scale-110 transition-transform" />
                            <input type="file" multiple accept="image/*" className="hidden" onChange={handleImagesChange} />
                         </label>
                       )}
                    </div>
                  </div>

                  <div className="pt-6 flex flex-col sm:flex-row gap-4">
                    <button
                      type="button"
                      onClick={() => { setModalOpen(false); resetForm(); }}
                      className="flex-1 py-5 bg-slate-50 text-slate-500 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100 active:scale-95"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-[2] py-5 bg-slate-900 text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-brand-purple hover:shadow-brand-purple/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                    >
                      {saving ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>Salvar Parceiro <Check size={16} strokeWidth={4} /></>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
