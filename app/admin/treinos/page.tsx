'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { FileArrowUp, CircleNotch, Trash, PlusCircle, Barbell, CaretRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import DumbbellLoader from '@/app/components/DumbbellLoader';

interface Aluno {
  id: string;
  coaching_reference: string | null;
  email: string | null;
}

export default function TreinosPage() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingAlunos, setFetchingAlunos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPdfUpload, setShowPdfUpload] = useState(false);

  useEffect(() => {
    const fetchAlunos = async () => {
      try {
        const { data: authData } = await supabaseClient.auth.getUser();
        const coachId = authData?.user?.id;
        if (!coachId) { setError('Sessão inválida'); setFetchingAlunos(false); return; }

        const { data: alunoLinks, error: linkError } = await supabaseClient
          .from('coach_alunos').select('aluno_id').eq('coach_id', coachId);

        if (linkError) { setError('Erro ao carregar alunos: ' + linkError.message); setFetchingAlunos(false); return; }

        const ids = alunoLinks?.map(link => link.aluno_id) || [];
        if (ids.length === 0) { setAlunos([]); setFetchingAlunos(false); return; }

        const { data, error: fetchError } = await supabaseClient
          .from('profiles').select('id, coaching_reference, email')
          .in('id', ids).eq('arquivado', false).order('coaching_reference', { ascending: true });

        if (fetchError) { setError('Erro ao carregar alunos: ' + fetchError.message); setFetchingAlunos(false); return; }

        setAlunos(data || []);
        setFetchingAlunos(false);
      } catch {
        setError('Erro ao conectar com o banco de dados');
        setFetchingAlunos(false);
      }
    };

    fetchAlunos();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('Por favor, selecione um arquivo PDF'); return; }
    if (file.size > 50 * 1024 * 1024) { setError('Arquivo muito grande. Máximo 50MB'); return; }
    setSelectedFile(file);
    setError(null);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedAlunoId) { setError('Por favor, selecione um aluno'); return; }
    if (!selectedFile) { setError('Por favor, selecione um arquivo PDF'); return; }

    setLoading(true);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) throw new Error('Sessão inválida');

      const fileName = `${selectedAlunoId}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabaseClient.storage
        .from('treinos-pdf').upload(fileName, selectedFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabaseClient.from('treinos_alunos').insert({
        aluno_id: selectedAlunoId,
        coach_id: coachId,
        url_pdf: fileName,
        nome_arquivo: selectedFile.name,
        data_upload: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      setSuccess('PDF enviado com sucesso!');
      setSelectedFile(null);
      setSelectedAlunoId('');
      setShowPdfUpload(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Erro ao realizar upload: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-28">
      <ScreenHeader
        title="Gestão de Treinos"
        subtitle="Expedição de treinos técnicos para atletas"
      />

      <div className="px-4 max-w-2xl space-y-4">

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm">
            <div className="w-2 h-2 rounded-full bg-danger flex-shrink-0 animate-pulse" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-success-subtle border border-success-border text-success text-sm">
            <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
            {success}
          </div>
        )}

        {/* ── Nova Ficha Digital — card principal ── */}
        <button
          onClick={() => router.push('/admin/treinos/nova-ficha')}
          className="w-full text-left bg-brand/5 border-2 border-brand/20 hover:border-brand/40 hover:bg-brand/10 rounded-2xl p-6 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand text-text-on-brand flex items-center justify-center shadow-sm shadow-brand/30 flex-shrink-0">
                <Barbell size={26} />
              </div>
              <div>
                <p className="text-base font-bold text-text-primary group-hover:text-brand transition-colors">Nova Ficha Digital</p>
                <p className="text-xs text-text-tertiary mt-0.5">Séries, cargas, técnicas e vídeos em tempo real</p>
              </div>
            </div>
            <CaretRight size={20} className="text-text-tertiary group-hover:text-brand group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </div>
        </button>

        {/* ── Upload PDF — card secundário ── */}
        {!showPdfUpload ? (
          <button
            onClick={() => setShowPdfUpload(true)}
            className="w-full text-left bg-surface-1 border border-border-subtle hover:border-border-default shadow-elev-1 rounded-2xl p-5 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-tertiary group-hover:text-brand group-hover:border-brand/20 group-hover:bg-brand/5 transition-all flex-shrink-0">
                  <FileArrowUp size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Upload de PDF</p>
                  <p className="text-xs text-text-tertiary mt-0.5">Enviar ficha em PDF para o acervo do atleta</p>
                </div>
              </div>
              <CaretRight size={16} className="text-text-disabled group-hover:text-brand group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </div>
          </button>
        ) : (
          <Card className="rounded-2xl shadow-elev-1">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-subtle border border-brand-border flex items-center justify-center text-brand">
                  <FileArrowUp size={18} />
                </div>
                <div>
                  <p className="font-semibold text-text-primary text-sm">Upload de PDF</p>
                  <p className="text-xs text-text-tertiary mt-0.5">Sincronização imediata com o app do atleta</p>
                </div>
              </div>
              <button
                onClick={() => { setShowPdfUpload(false); setSelectedFile(null); setError(null); }}
                className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
              >
                Cancelar
              </button>
            </div>

            {fetchingAlunos ? (
              <div className="flex items-center justify-center py-8">
                <DumbbellLoader text="Carregando atletas..." />
              </div>
            ) : (
              <form onSubmit={handleUpload} className="flex flex-col gap-4">
                <Select
                  label="Selecione o Atleta"
                  value={selectedAlunoId}
                  onChange={setSelectedAlunoId}
                  placeholder="Escolher atleta..."
                  disabled={loading}
                  options={alunos.map((a) => ({
                    value: a.id,
                    label: a.coaching_reference || a.email || a.id,
                  }))}
                />

                <div className="flex flex-col gap-2">
                  <label className="text-2xs uppercase tracking-caps text-text-tertiary ml-1">Arquivo PDF</label>
                  {!selectedFile ? (
                    <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border-default rounded-xl bg-surface-2 hover:bg-brand-subtle hover:border-brand-border transition-all cursor-pointer group">
                      <input type="file" accept=".pdf" onChange={handleFileChange} disabled={loading} className="hidden" />
                      <FileArrowUp size={22} className="text-text-disabled group-hover:text-brand transition-colors mb-2" />
                      <p className="text-xs text-text-tertiary">Arraste ou clique para selecionar</p>
                    </label>
                  ) : (
                    <div className="flex items-center gap-4 p-4 bg-brand-subtle border border-brand-border rounded-xl">
                      <div className="w-9 h-9 rounded-xl bg-surface-3 border border-brand-border flex items-center justify-center text-brand shrink-0">
                        <FileArrowUp size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-brand">Documento válido</p>
                      </div>
                      <button type="button" onClick={() => setSelectedFile(null)} className="p-2 text-text-tertiary hover:text-danger transition-colors">
                        <Trash size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={loading || !selectedAlunoId || !selectedFile}
                  fullWidth
                >
                  Protocolar Treino Agora
                </Button>
              </form>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

