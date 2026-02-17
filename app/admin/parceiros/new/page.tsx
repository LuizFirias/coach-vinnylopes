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
}

export default function NovoParceiroPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    nome_marca: '',
    descricao: '',
    cupom: '',
    link_site: '',
    verificado: false,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione uma imagem válida');
        setLogoFile(null);
        setLogoPreview('');
        return;
      }

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo muito grande. Máximo 5MB');
        setLogoFile(null);
        setLogoPreview('');
        return;
      }

      setLogoFile(file);

      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validações
    if (!formData.nome_marca.trim()) {
      setError('Nome da marca é obrigatório');
      return;
    }
    if (!formData.descricao.trim()) {
      setError('Descrição é obrigatória');
      return;
    }
    if (!formData.cupom.trim()) {
      setError('Cupom é obrigatório');
      return;
    }
    if (!formData.link_site.trim()) {
      setError('Link do site é obrigatório');
      return;
    }
    if (!logoFile) {
      setError('Logo é obrigatória');
      return;
    }

    setLoading(true);

    try {
      // 1. Upload da logo
      const fileName = `${Date.now()}_${logoFile.name}`;

      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('parceiros-logos')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        setError('Erro ao fazer upload da logo: ' + uploadError.message);
        setLoading(false);
        return;
      }

      // 2. Obter URL pública
      const { data: publicUrlData } = supabaseClient
        .storage
        .from('parceiros-logos')
        .getPublicUrl(fileName);

      const urlLogo = publicUrlData.publicUrl;

      // 3. Salvar na tabela
      const { error: dbError } = await supabaseClient
        .from('parceiros')
        .insert({
          nome_marca: formData.nome_marca,
          descricao: formData.descricao,
          cupom: formData.cupom,
          link_site: formData.link_site,
          url_logo: urlLogo,
          verificado: formData.verificado,
        });

      if (dbError) {
        setError('Erro ao salvar parceiro: ' + dbError.message);
        setLoading(false);
        return;
      }

      setSuccess('Parceiro cadastrado com sucesso!');

      // Limpar formulário
      setFormData({
        nome_marca: '',
        descricao: '',
        cupom: '',
        link_site: '',
        verificado: false,
      });
      setLogoFile(null);
      setLogoPreview('');

      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push('/admin/parceiros');
      }, 2000);
    } catch (err) {
      setError('Erro ao processar a solicitação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-coach-black p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Novo Parceiro</h1>
          <p className="text-gray-400">Cadastrar uma nova marca ou serviço parceiro</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg text-green-400">
            ✓ {success}
          </div>
        )}

        {/* Form Container */}
        <div className="card-glass">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Nome da Marca */}
            <div>
              <label htmlFor="nome_marca" className="block text-sm font-medium text-gray-300 mb-2">
                Nome da Marca *
              </label>
              <input
                id="nome_marca"
                type="text"
                name="nome_marca"
                value={formData.nome_marca}
                onChange={handleInputChange}
                placeholder="Nike, Adidas, etc."
                disabled={loading}
                className="w-full px-4 py-3 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:ring-1 focus:ring-coach-gold transition disabled:opacity-50"
                required
              />
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-300 mb-2">
                Descrição *
              </label>
              <textarea
                id="descricao"
                name="descricao"
                value={formData.descricao}
                onChange={handleInputChange}
                placeholder="Breve descrição do serviço/produto..."
                disabled={loading}
                rows={3}
                className="w-full px-4 py-3 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:ring-1 focus:ring-coach-gold transition disabled:opacity-50 resize-none"
                required
              />
            </div>

            {/* Cupom */}
            <div>
              <label htmlFor="cupom" className="block text-sm font-medium text-gray-300 mb-2">
                Código do Cupom *
              </label>
              <input
                id="cupom"
                type="text"
                name="cupom"
                value={formData.cupom}
                onChange={handleInputChange}
                placeholder="COACHVINNY20"
                disabled={loading}
                className="w-full px-4 py-3 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:ring-1 focus:ring-coach-gold transition disabled:opacity-50"
                required
              />
            </div>

            {/* Link do Site */}
            <div>
              <label htmlFor="link_site" className="block text-sm font-medium text-gray-300 mb-2">
                Link do Site *
              </label>
              <input
                id="link_site"
                type="text"
                name="link_site"
                value={formData.link_site}
                onChange={handleInputChange}
                placeholder="https://exemplo.com"
                disabled={loading}
                className="w-full px-4 py-3 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:ring-1 focus:ring-coach-gold transition disabled:opacity-50"
                required
              />
            </div>

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
