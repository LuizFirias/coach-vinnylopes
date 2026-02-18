'use client';

import { useMemo, useState, useEffect } from 'react';
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
      setFormError('Selecione no maximo 5 imagens');
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setFormError('Envie apenas imagens');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Cada imagem deve ter no maximo 5MB');
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

  return (
    <div className="min-h-screen bg-coach-black p-8 pt-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Parceiros Exclusivos</h1>
          <p className="text-gray-400">
            Descontos especiais para alunos Coach Vinny
          </p>
        </div>

        {userRole === 'coach' && (
          <div className="mb-8">
            <button
              onClick={() => setModalOpen(true)}
              className="px-6 py-4 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98]"
            >
              Adicionar Novo Parceiro
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <svg
                className="w-12 h-12 animate-spin text-coach-gold mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-gray-400">Carregando parceiros...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && parceiros.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center max-w-md">
              <svg
                className="w-20 h-20 mx-auto mb-6 text-coach-gray"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.5m0 0H9m0 0H3.5m0 0H1m5.5 0a2.121 2.121 0 00-3 3m7-7a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h2 className="text-2xl font-semibold text-white mb-3">
                Nenhum parceiro cadastrado
              </h2>
              <p className="text-gray-400">
                Em breve adicionaremos as melhores marcas e serviços exclusivos para você!
              </p>
            </div>
          </div>
        )}

        {/* Parceiros Grid */}
        {!loading && !error && parceiros.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parceiros.map((parceiro) => {
              const images = (parceiro.imagens && parceiro.imagens.length > 0)
                ? parceiro.imagens
                : (parceiro.logo_url ? [parceiro.logo_url] : []);
              const carouselId = `carousel-${parceiro.id}`;

              return (
              <div
                key={parceiro.id}
                className="group card-glass overflow-hidden transition-all duration-300 hover:shadow-lg"
              >
                {/* Carousel Section */}
                <div className="relative h-52 bg-coach-black overflow-hidden">
                  <div
                    id={carouselId}
                    className="flex h-full overflow-x-auto snap-x snap-mandatory scroll-smooth"
                  >
                    {images.length > 0 ? (
                      images.map((src, idx) => (
                        <div key={`${parceiro.id}-${idx}`} className="min-w-full h-52 snap-center">
                          <img
                            src={src}
                            alt={parceiro.nome_marca}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="min-w-full h-52 flex items-center justify-center text-gray-500">
                        Sem imagens
                      </div>
                    )}
                  </div>

                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => handleScroll(carouselId, -1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-white/10 text-white"
                        aria-label="Imagem anterior"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => handleScroll(carouselId, 1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-white/10 text-white"
                        aria-label="Proxima imagem"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                {/* Content Section */}
                  <div className="p-6">
                  {/* Nome da Marca */}
                  <h3 className="text-xl font-bold text-white mb-2">
                    {parceiro.nome_marca}
                  </h3>

                  {/* Descrição */}
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {parceiro.descricao}
                  </p>

                  {/* Cupom em Destaque */}
                  <div className="mb-6 p-4 card-glass cursor-pointer" onClick={() => handleCopiarCupom(parceiro.cupom)}>
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-widest">
                      Cupom de Desconto
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-coach-gold">
                        {parceiro.cupom}
                      </p>
                      <span className="text-xs text-gray-300">Copiar</span>
                    </div>
                    {copiedCupom === parceiro.cupom && (
                      <p className="text-xs text-green-400 mt-2">✓ Copiado!</p>
                    )}
                  </div>

                  {/* Botão IR PARA O SITE */}
                  <button
                    onClick={() => handleIrParaSite(parceiro.link_desconto)}
                    className="w-full py-4 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98]"
                  >
                    Ir para Loja
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        )}

        {/* Info Box */}
        {!loading && !error && parceiros.length > 0 && (
          <div className="mt-12 card-glass text-center">
            <p className="text-gray-300">
              <span className="text-coach-gold font-semibold">💝 Aproveite!</span>
              {' '}Todos esses parceiros oferecem descontos exclusivos para alunos Coach Vinny
            </p>
          </div>
        )}
      </div>

      {modalOpen && userRole === 'coach' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-2xl card-glass">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Novo Parceiro</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                Fechar
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1 mb-2">Nome do Produto</label>
                <input
                  type="text"
                  value={nomeProduto}
                  onChange={(e) => setNomeProduto(e.target.value)}
                  className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/40 focus:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300"
                  placeholder="Nome do produto"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1 mb-2">Descrição</label>
                <textarea
                  rows={3}
                  value={descricaoForm}
                  onChange={(e) => setDescricaoForm(e.target.value)}
                  className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/40 focus:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300 resize-none"
                  placeholder="Descricao do produto"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1 mb-2">Código do Cupom</label>
                  <input
                    type="text"
                    value={cupomForm}
                    onChange={(e) => setCupomForm(e.target.value)}
                    className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/40 focus:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300"
                    placeholder="COACH10"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1 mb-2">Link de Desconto</label>
                  <input
                    type="url"
                    value={linkDesconto}
                    onChange={(e) => setLinkDesconto(e.target.value)}
                    className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/40 focus:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300"
                    placeholder="https://loja.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Imagens (ate 5)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesChange}
                  className="w-full text-sm text-gray-300"
                />
                {imagePreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {imagePreviews.map((src) => (
                      <div key={src} className="h-16 rounded bg-black/40 overflow-hidden">
                        <img src={src} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="px-6 py-4 bg-white/[0.03] border border-white/10 text-white text-[11px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-white/[0.05] transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-4 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Parceiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
