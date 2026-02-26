'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';

import { PlusCircle, FileUp, CheckCircle2, AlertCircle, Loader2, Trash2, ArrowLeft, ChevronDown } from 'lucide-react';
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
      const fileName = `${selectedAlunoId}/${Date.now()}_${selectedFile.name}`;
      
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
    <div className="min-h-screen bg-black p-4 md:p-6 lg:p-10 lg:pl-28">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
            <div>
              <Link 
                href="/admin/dashboard" 
                className="inline-flex items-center gap-2 text-[#D4AF37] font-black text-[10px] uppercase tracking-widest mb-3 md:mb-4 hover:gap-3 transition-all"
              >
                <ArrowLeft size={14} /> Painel de Controle
              </Link>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-2 uppercase">
                Gestão de <span className="text-zinc-500">Treinos</span>
              </h1>
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-black italic">Expedição de treinos técnicos para atletas</p>
            </div>
            
            <button
              onClick={() => router.push('/admin/treinos/nova-ficha')}
              className="flex items-center gap-3 px-8 py-4 bg-[#D4AF37] text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-white transition-all active:scale-95"
            >
              <PlusCircle size={18} />
              Nova Ficha Digital
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:gap-8">
          {/* Form Container */}
          <div className="bg-[#0F0F0F] rounded-3xl shadow-2xl p-8 md:p-12 border border-[#1a1a1a]">
            <div className="flex items-center gap-4 mb-10 pb-6 border-b border-[#1a1a1a]">
              <div className="w-14 h-14 rounded-2xl bg-black border border-[#1a1a1a] flex items-center justify-center text-[#D4AF37] shadow-lg">
                <FileUp size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Upload de PDF</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-loose">Sincronização imediata com o app do atleta</p>
              </div>
            </div>

            {/* Mensagens */}
            {error && (
              <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500 text-[10px] font-black uppercase tracking-widest">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-8 p-6 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl flex items-center gap-4 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest">
                <CheckCircle2 size={18} />
                {success}
              </div>
            )}

            {fetchingAlunos ? (
              <div className="flex flex-col items-center justify-center py-20 gap-6 text-zinc-500">
                <Loader2 size={40} className="animate-spin text-[#D4AF37]" />
                <p className="text-[10px] font-black uppercase tracking-widest italic tracking-[0.4em]">Indexando Atletas...</p>
              </div>
            ) : (
              <form onSubmit={handleUpload} className="space-y-10">
                {/* Select Aluno */}
                <div className="space-y-4">
                  <label htmlFor="aluno" className="inline-block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700 ml-1">
                    SELECIONE O ATLETA
                  </label>
                  <div className="relative group">
                    <select
                      id="aluno"
                      value={selectedAlunoId}
                      onChange={(e) => setSelectedAlunoId(e.target.value)}
                      disabled={loading}
                      className="w-full h-14 md:h-16 px-8 bg-black border border-[#1a1a1a] rounded-2xl text-white font-medium focus:outline-none focus:border-[#D4AF37] transition-all cursor-pointer disabled:opacity-50 appearance-none uppercase tracking-widest text-sm"
                    >
                      <option value="" className="bg-[#0F0F0F]">Aperte para escolher...</option>
                      {alunos.map((aluno) => (
                        <option key={aluno.id} value={aluno.id} className="bg-[#0F0F0F]">
                            {aluno.full_name || aluno.email}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-800">
                      <ChevronDown size={20} />
                    </div>
                  </div>
                </div>

                {/* File Upload Area */}
                <div className="space-y-4">
                  <label className="inline-block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700 ml-1">
                    PROTOCOLAR ARQUIVO (PDF)
                  </label>

                  {!selectedFile ? (
                    <label className="relative flex flex-col items-center justify-center w-full h-32 md:h-40 border-2 border-dashed border-[#1a1a1a] rounded-3xl bg-black/50 hover:bg-[#D4AF37]/5 hover:border-[#D4AF37]/30 transition-all cursor-pointer group shadow-2xl">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        disabled={loading}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div className="w-16 h-16 mb-4 rounded-2xl bg-black border border-[#1a1a1a] shadow-lg flex items-center justify-center text-zinc-500 group-hover:text-[#D4AF37] transition-colors">
                          <FileUp size={28} />
                        </div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Arraste ou clique para selecionar</p>
                      </div>
                    </label>
                  ) : (
                    <div className="relative p-6 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-3xl">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-black border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] shadow-xl">
                          <FileUp size={24} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-black text-white uppercase tracking-tighter truncate">{selectedFile.name}</p>
                          <p className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest">Documento Válido</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setFilePreview(''); }}
                          className="w-12 h-12 flex items-center justify-center text-zinc-700 hover:text-red-500 bg-black rounded-xl border border-[#1a1a1a] transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || !selectedAlunoId || !selectedFile}
                  className="w-full h-16 md:h-20 bg-[#D4AF37] text-black rounded-3xl font-black text-[12px] uppercase tracking-[0.4em] flex items-center justify-center gap-4 shadow-[#D4AF37]/10 hover:bg-white transition-all active:scale-[0.98] disabled:opacity-30"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      PROCESSANDO...
                    </>
                  ) : (
                    <>
                      PROTOCOLAR TREINO AGORA
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
