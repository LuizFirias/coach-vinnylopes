'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';

import { PlusCircle, FileUp, CheckCircle2, AlertCircle, Loader2, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Aluno {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function TreinosPage() {
  const router = useRouter();
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
          .from('profiles')
          .select('id, full_name, email')
          .eq('role', 'aluno')
          .eq('arquivado', false)
          .order('full_name', { ascending: true });

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
      if (file.type !== 'application/pdf') {
        setError('Por favor, selecione um arquivo PDF');
        setSelectedFile(null);
        setFilePreview('');
        return;
      }

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
      const fileName = `${selectedAlunoId}_${Date.now()}_${selectedFile.name}`;
      
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('treinos-pdf')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('treinos-pdf')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabaseClient
        .from('treinos_alunos')
        .insert({
          aluno_id: selectedAlunoId,
          url_pdf: publicUrl,
          nome_arquivo: selectedFile.name,
          data_upload: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      setSuccess('Ficha de treino enviada com sucesso!');
      setSelectedFile(null);
      setFilePreview('');
      setSelectedAlunoId('');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Erro no upload:', err);
      setError('Erro ao realizar upload: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] p-4 md:p-6 lg:p-10 lg:pl-28">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
            <div>
              <Link 
                href="/admin/dashboard" 
                className="inline-flex items-center gap-2 text-[#E30613] font-black text-[10px] uppercase tracking-widest mb-3 md:mb-4 hover:gap-3 transition-all"
              >
                <ArrowLeft size={14} /> Voltar ao Painel
              </Link>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
                Gestão de <span className="text-[#E30613]">Treinos</span>
              </h1>
              <p className="text-zinc-500 font-medium">Envie a ficha de treino para o atleta</p>
            </div>
            
            <button
              onClick={() => router.push('/admin/treinos/nova-ficha')}
              className="flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 bg-[#E30613] text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-[#E30613]/20 hover:scale-[1.02] transition-all active:scale-95"
            >
              <PlusCircle size={18} />
              Nova Ficha Digital
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:gap-8">
          {/* Form Container */}
          <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-8 lg:p-12 border border-white/5">
            <div className="flex items-center gap-4 mb-6 md:mb-10 pb-4 md:pb-6 border-b border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-[#E30613]/10 flex items-center justify-center text-[#E30613]">
                <FileUp size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white leading-tight">Upload de PDF</h2>
                <p className="text-sm text-zinc-500">O arquivo ficará disponível imediatamente para o aluno</p>
              </div>
            </div>

            {/* Mensagens */}
            {error && (
              <div className="mb-8 p-4 bg-red-950/20 border border-red-900/50 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-medium">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-8 p-4 bg-green-950/20 border border-green-900/50 rounded-2xl flex items-center gap-3 text-green-500 text-sm font-medium">
                <CheckCircle2 size={18} />
                {success}
              </div>
            )}

            {fetchingAlunos ? (
              <div className="flex flex-col items-center justify-center py-12 md:py-20 gap-4 text-zinc-500">
                <Loader2 size={40} className="animate-spin text-[#E30613]" />
                <p className="text-sm font-black uppercase tracking-widest">Carregando alunos...</p>
              </div>
            ) : (
              <form onSubmit={handleUpload} className="space-y-6 md:space-y-10">
                {/* Select Aluno */}
                <div className="space-y-4">
                  <label htmlFor="aluno" className="inline-block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">
                    SELECIONE O ALUNO
                  </label>
                  <div className="relative group">
                    <select
                      id="aluno"
                      value={selectedAlunoId}
                      onChange={(e) => setSelectedAlunoId(e.target.value)}
                      disabled={loading}
                      className="w-full h-14 md:h-16 px-6 bg-white/[0.03] border border-white/10 rounded-2xl text-white font-semibold focus:outline-none focus:border-[#E30613]/50 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <option value="" className="bg-zinc-900">Aperte para escolher...</option>
                      {alunos.map((aluno) => (
                        <option key={aluno.id} value={aluno.id} className="bg-zinc-900">
                            {aluno.full_name || aluno.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* File Upload Area */}
                <div className="space-y-4">
                  <label className="inline-block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">
                    ARQUIVO DO TREINO (PDF)
                  </label>

                  {!selectedFile ? (
                    <label className="relative flex flex-col items-center justify-center w-full h-32 md:h-40 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02] hover:bg-[#E30613]/5 hover:border-[#E30613]/30 transition-all cursor-pointer group">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        disabled={loading}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div className="w-12 h-12 mb-3 rounded-xl bg-zinc-800 shadow-sm flex items-center justify-center text-zinc-500 group-hover:text-[#E30613] transition-colors">
                          <FileUp size={24} />
                        </div>
                        <p className="text-sm font-bold text-zinc-400">Arraste ou clique para selecionar</p>
                      </div>
                    </label>
                  ) : (
                    <div className="relative p-4 md:p-6 bg-[#E30613]/5 border border-[#E30613]/20 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-[#E30613]/10 flex items-center justify-center text-[#E30613] shadow-sm">
                          <FileUp size={20} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-bold text-white truncate">{selectedFile.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setFilePreview(''); }}
                          className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-[#E30613] rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || !selectedAlunoId || !selectedFile}
                  className="w-full h-14 md:h-16 bg-[#E30613] text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl shadow-[#E30613]/20 hover:bg-[#ff0717] transition-all active:scale-[0.98] disabled:opacity-30"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      ENVIANDO...
                    </>
                  ) : (
                    <>
                      ENVIAR TREINO PARA O ALUNO
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
