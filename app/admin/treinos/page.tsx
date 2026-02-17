'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';

interface Aluno {
  id: string;
  nome: string;
  email: string;
}

export default function TreinosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchingAlunos, setFetchingAlunos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Buscar alunos ao montar o componente
  useEffect(() => {
    const fetchAlunos = async () => {
      try {
        const { data, error: fetchError } = await supabaseClient
          .from('alunos')
          .select('id, nome, email')
          .order('nome', { ascending: true });

        if (fetchError) {
          setError('Erro ao carregar alunos: ' + fetchError.message);
          setFetchingAlunos(false);
          return;
        }

        setAlunos(data || []);
        setFetchingAlunos(false);
      } catch (err) {
        setError('Erro ao conectar com o banco de dados');
        setFetchingAlunos(false);
      }
    };

    fetchAlunos();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar que é PDF
      if (file.type !== 'application/pdf') {
        setError('Por favor, selecione um arquivo PDF');
        setSelectedFile(null);
        setFilePreview('');
        return;
      }

      // Validar tamanho (máximo 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError('Arquivo muito grande. Máximo 50MB');
        setSelectedFile(null);
        setFilePreview('');
        return;
      }

      setSelectedFile(file);
      setFilePreview(file.name);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validações
    if (!selectedAlunoId) {
      setError('Por favor, selecione um aluno');
      return;
    }

    if (!selectedFile) {
      setError('Por favor, selecione um arquivo PDF');
      return;
    }

    setLoading(true);

    try {
      // 1. Fazer upload do arquivo para storage
      const fileName = `${selectedAlunoId}_${Date.now()}_${selectedFile.name}`;
      
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('treinos-pdf')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        setError('Erro ao fazer upload: ' + uploadError.message);
        setLoading(false);
        return;
      }

      // 2. Obter URL pública do arquivo
      const { data: publicUrlData } = supabaseClient
        .storage
        .from('treinos-pdf')
        .getPublicUrl(fileName);

      const urlPdf = publicUrlData.publicUrl;

      // 3. Salvar na tabela treinos_alunos
      const { error: dbError } = await supabaseClient
        .from('treinos_alunos')
        .insert({
          aluno_id: selectedAlunoId,
          url_pdf: urlPdf,
          nome_arquivo: selectedFile.name,
          data_upload: new Date().toISOString(),
        });

      if (dbError) {
        setError('Erro ao salvar arquivo no banco: ' + dbError.message);
        setLoading(false);
        return;
      }

      // Sucesso!
      setSuccess(`Treino enviado com sucesso para ${alunos.find(a => a.id === selectedAlunoId)?.nome}!`);
      setSelectedFile(null);
      setFilePreview('');
      setSelectedAlunoId('');

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao processar o upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-coach-black p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Gerenciar Treinos</h1>
          <p className="text-gray-400">Envie arquivos PDF de treinos para seus alunos</p>
        </div>

        {/* Form Container */}
        <div className="card-glass">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded text-green-400 text-sm">
              ✓ {success}
            </div>
          )}

          {fetchingAlunos ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Carregando alunos...</p>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-8">
              {/* Select Aluno */}
              <div>
                <label htmlFor="aluno" className="block text-sm font-medium text-gray-300 mb-3">
                  Selecione o Aluno
                </label>
                <select
                  id="aluno"
                  value={selectedAlunoId}
                  onChange={(e) => setSelectedAlunoId(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-coach-black border border-gray-700 rounded text-white focus:outline-none focus:border-coach-gold focus:ring-1 focus:ring-coach-gold transition disabled:opacity-50 cursor-pointer"
                >
                  <option value="">-- Escolha um aluno --</option>
                  {alunos.map((aluno) => (
                    <option key={aluno.id} value={aluno.id}>
                      {aluno.nome} ({aluno.email})
                    </option>
                  ))}
                </select>
                {alunos.length === 0 && (
                  <p className="mt-2 text-yellow-400 text-sm">
                    Nenhum aluno encontrado. Crie alunos primeiro.
                  </p>
                )}
              </div>

              {/* File Upload */}
              <div>
                <label htmlFor="file-input" className="block text-sm font-medium text-gray-300 mb-3">
                  Arquivo PDF do Treino
                </label>

                {/* Hidden File Input */}
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="hidden"
                />

                {/* Custom File Button */}
                <div className="flex gap-3">
                  <label
                    htmlFor="file-input"
                    className="flex-1 px-6 py-4 bg-linear-to-r from-coach-gold to-coach-gold-dark text-black font-semibold rounded cursor-pointer hover:from-coach-gold-dark hover:to-coach-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
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
                    Selecionar PDF
                  </label>
                </div>

                {/* File Preview */}
                {filePreview && (
                  <div className="mt-4 card-glass">
                    <p className="text-gray-300 text-sm">
                      <span className="text-coach-gold font-semibold">Arquivo selecionado:</span> {filePreview}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePreview('');
                      }}
                      disabled={loading}
                      className="mt-2 text-red-400 hover:text-red-300 text-sm transition"
                    >
                      Remover arquivo
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !selectedAlunoId || !selectedFile || alunos.length === 0}
                className="w-full py-4 font-semibold text-black rounded bg-linear-to-r from-coach-gold to-coach-gold-dark hover:from-coach-gold-dark hover:to-coach-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Enviando...
                  </span>
                ) : (
                  'Fazer Upload'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 card-glass">
          <h3 className="text-coach-gold font-semibold mb-2">ℹ Informações</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Apenas arquivos PDF são aceitos</li>
            <li>• Tamanho máximo: 50MB</li>
            <li>• O aluno receberá acesso ao link automaticamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
