'use client';

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface FormData {
  nome_marca: string;
  descricao: string;
  cupom: string;
  link_site: string;
  verificado: boolean;
"use client";

import { useMemo, useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function NovoParceiroPage() {
  const router = useRouter();
  const [nomeProduto, setNomeProduto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cupom, setCupom] = useState("");
  const [linkDesconto, setLinkDesconto] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const imagePreviews = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles]
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      setError("Selecione no maximo 5 imagens");
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setError("Envie apenas imagens");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Cada imagem deve ter no maximo 5MB");
        return;
      }
    }

    setError(null);
    setImageFiles(files);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!nomeProduto.trim() || !descricao.trim() || !cupom.trim() || !linkDesconto.trim()) {
      setError("Preencha todos os campos");
      return;
    }

    if (imageFiles.length === 0) {
      setError("Envie pelo menos 1 imagem");
      return;
    }

    setLoading(true);

    try {
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const fileName = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabaseClient.storage
          .from("parceiros-logos")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabaseClient
          .storage
          .from("parceiros-logos")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      const logoUrl = uploadedUrls[0] || null;

      const { error: dbError } = await supabaseClient
        .from("parceiros")
        .insert({
          nome_marca: nomeProduto.trim(),
          descricao: descricao.trim(),
          cupom: cupom.trim(),
          link_desconto: linkDesconto.trim(),
          logo_url: logoUrl,
          imagens: uploadedUrls,
        });

      if (dbError) {
        throw dbError;
      }

      setSuccess("Parceiro cadastrado com sucesso!");
      setNomeProduto("");
      setDescricao("");
      setCupom("");
      setLinkDesconto("");
      setImageFiles([]);

      setTimeout(() => {
        router.push("/admin/parceiros");
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Erro ao processar a solicitacao");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-coach-black p-8 pt-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Novo Parceiro</h1>
          <p className="text-gray-400">Cadastrar uma nova marca ou produto parceiro</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg text-green-400">
            ✓ {success}
          </div>
        )}

        <div className="card-glass">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1 mb-2">Nome do Produto</label>
              <input
                type="text"
                value={nomeProduto}
                onChange={(e) => setNomeProduto(e.target.value)}
                placeholder="Nome do produto"
                disabled={loading}
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/40 focus:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300 disabled:opacity-50"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1 mb-2">Descrição</label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Breve descricao do produto"
                disabled={loading}
                rows={3}
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/40 focus:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300 disabled:opacity-50 resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1 mb-2">Código do Cupom</label>
              <input
                type="text"
                value={cupom}
                onChange={(e) => setCupom(e.target.value)}
                placeholder="COACH10"
                disabled={loading}
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/40 focus:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300 disabled:opacity-50"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1 mb-2">Link de Desconto</label>
              <input
                type="url"
                value={linkDesconto}
                onChange={(e) => setLinkDesconto(e.target.value)}
                placeholder="https://loja.com"
                disabled={loading}
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/40 focus:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300 disabled:opacity-50"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1 mb-2">Imagens (até 5)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesChange}
                className="w-full text-sm text-gray-300"
                disabled={loading}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Cadastrar Parceiro"}
            </button>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Logo da Marca *
              </label>

              <div className="space-y-4">
                {/* Upload Input */}
                <div>
                  <input
                    id="logo-input"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    disabled={loading}
                    className="hidden"
                  />

                  <label
                    htmlFor="logo-input"
                    className="flex items-center justify-center w-full px-6 py-8 border-2 border-dashed border-coach-gold/30 rounded cursor-pointer hover:border-coach-gold/60 transition bg-coach-black/30"
                  >
                    <div className="text-center">
                      <svg
                        className="w-8 h-8 mx-auto mb-2 text-coach-gold"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-gray-300">Clique ou arraste a logo</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG até 5MB</p>
                    </div>
                  </label>
                </div>

                {/* Logo Preview */}
                {logoPreview && (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full max-w-64 h-48 object-contain bg-coach-black rounded border border-coach-gold/30 p-4"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview('');
                      }}
                      disabled={loading}
                      className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 rounded text-white transition"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Checkbox Verificado */}
            <div className="flex items-center gap-3">
              <input
                id="verificado"
                type="checkbox"
                name="verificado"
                checked={formData.verificado}
                onChange={handleInputChange}
                disabled={loading}
                className="w-5 h-5 border border-gray-700 rounded text-coach-gold focus:ring-coach-gold cursor-pointer"
              />
              <label htmlFor="verificado" className="text-sm text-gray-300 cursor-pointer">
                Marcar como Parceiro Verificado
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-4 font-semibold text-black rounded bg-linear-to-r from-coach-gold to-coach-gold-dark hover:from-coach-gold-dark hover:to-coach-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5 animate-spin"
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
                    Cadastrando...
                  </span>
                ) : (
                  'Cadastrar Parceiro'
                )}
              </button>

              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className="px-6 py-4 font-semibold text-white rounded border border-gray-700 hover:border-gray-600 transition disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-8 card-glass">
          <p className="text-gray-300 text-sm">
            <span className="text-coach-gold font-semibold">ℹ Dica:</span> Marque como "Verificado" para exibir
            um selo na página de alunos!
          </p>
        </div>
      </div>
    </div>
  );
}
