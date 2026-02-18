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

export default function ParceirosAdminPage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nomeProduto, setNomeProduto] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cupom, setCupom] = useState('');
  const [linkDesconto, setLinkDesconto] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParceiros = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabaseClient
          .from('parceiros')
          .select('id, nome_marca, descricao, cupom, link_desconto, logo_url, imagens')
          .order('ordem', { ascending: true })
          .order('nome_marca', { ascending: true });

        if (fetchError) throw fetchError;
        setParceiros((data as Parceiro[]) || []);
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar parceiros');
      } finally {
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
    setDescricao('');
    setCupom('');
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

    if (!nomeProduto.trim() || !descricao.trim() || !cupom.trim() || !linkDesconto.trim()) {
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
          descricao: descricao.trim(),
          cupom: cupom.trim(),
          link_desconto: linkDesconto.trim(),
          logo_url: logoUrl,
          imagens: uploadedUrls,
        });

      if (insertError) throw insertError;

      setModalOpen(false);
      resetForm();
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

  return (
    <div className="min-h-screen bg-coach-black p-8 pt-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Parceiros</h1>
            <p className="text-gray-400">Gerencie produtos, imagens, cupons e links de desconto.</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-4 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98]"
          >
            Adicionar Novo Parceiro
          </button>
        </div>

        {error && <div className="mb-4 text-red-400">{error}</div>}

        {loading ? (
          <div className="card-glass text-gray-300">Carregando...</div>
        ) : parceiros.length === 0 ? (
          <div className="card-glass text-gray-300">Nenhum parceiro cadastrado ainda.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parceiros.map((parceiro) => (
              <div key={parceiro.id} className="card-glass flex gap-4 items-start">
                <div className="w-20 h-20 bg-black/40 rounded-lg overflow-hidden flex items-center justify-center">
                  {parceiro.logo_url ? (
                    <img
                      src={parceiro.logo_url}
                      alt={parceiro.nome_marca}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-gray-500 text-xs">Sem logo</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold">{parceiro.nome_marca}</div>
                  <p className="text-gray-400 text-sm mt-1">{parceiro.descricao}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded bg-white/5 text-gray-200">Cupom: {parceiro.cupom}</span>
                    <a
                      href={parceiro.link_desconto}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded bg-white/5 text-coach-gold"
                    >
                      Acessar link
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
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
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
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
                    value={cupom}
                    onChange={(e) => setCupom(e.target.value)}
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
