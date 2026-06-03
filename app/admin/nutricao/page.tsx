'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { FileArrowUp, CircleNotch, Trash, AppleLogo } from '@phosphor-icons/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { cn } from '@/lib/utils/cn';

interface Aluno {
  id: string;
  coaching_reference: string | null;
  email: string | null;
}

export default function NutricaoPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingAlunos, setFetchingAlunos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) { setError('Sessão inválida'); return; }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('aluno_id', selectedAlunoId);
      if (descricao) formData.append('descricao', descricao);

      const response = await fetch('/api/admin/nutricao', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao fazer upload');

      setSuccess('Plano alimentar enviado com sucesso!');
      setSelectedFile(null);
      setSelectedAlunoId('');
      setDescricao('');
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
        title="Gestão de Nutrição"
        subtitle="Expedição de planos alimentares para atletas"
      />

      <div className="px-4 max-w-2xl">

        {error && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm">
            <div className="w-2 h-2 rounded-full bg-danger flex-shrink-0 animate-pulse" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-success-subtle border border-success-border text-success text-sm">
            <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
            {success}
          </div>
        )}

        <Card className="rounded-2xl shadow-elev-1">
          <div className="flex items-center gap-4 mb-6 pb-5 border-b border-border-subtle">
            <div className="w-12 h-12 rounded-2xl bg-brand-subtle border border-brand-border flex items-center justify-center text-brand">
              <AppleLogo size={22} />
            </div>
            <div>
              <p className="font-semibold text-text-primary">Upload de Plano Alimentar</p>
              <p className="text-xs text-text-tertiary mt-0.5">Sincronização imediata com o app do atleta</p>
            </div>
          </div>

          {fetchingAlunos ? (
            <div className="flex items-center justify-center py-12">
              <DumbbellLoader text="Carregando atletas..." />
            </div>
          ) : (
            <form onSubmit={handleUpload} className="flex flex-col gap-5">

              {/* Select aluno */}
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

              {/* Descrição */}
              <div className="flex flex-col gap-2">
                <label className="text-2xs uppercase tracking-caps text-text-tertiary ml-1">Descrição (opcional)</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Plano para ganho de massa, cardápio de 2800 cal/dia"
                  disabled={loading}
                  maxLength={500}
                  rows={3}
                  className="w-full px-4 py-3 bg-surface-3 border border-border-default rounded-xl text-text-primary text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-all resize-none disabled:opacity-50"
                />
                <p className="text-2xs text-text-disabled text-right">{descricao.length}/500</p>
              </div>

              {/* Upload */}
              <div className="flex flex-col gap-2">
                <label className="text-2xs uppercase tracking-caps text-text-tertiary ml-1">Arquivo PDF</label>
                {!selectedFile ? (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border-default rounded-xl bg-surface-2 hover:bg-brand-subtle hover:border-brand-border transition-all cursor-pointer group">
                    <input type="file" accept=".pdf" onChange={handleFileChange} disabled={loading} className="hidden" />
                    <FileArrowUp size={24} className="text-text-disabled group-hover:text-brand transition-colors mb-2" />
                    <p className="text-xs text-text-tertiary">Arraste ou clique para selecionar</p>
                  </label>
                ) : (
                  <div className="flex items-center gap-4 p-4 bg-brand-subtle border border-brand-border rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-surface-3 border border-brand-border flex items-center justify-center text-brand shrink-0">
                      <FileArrowUp size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-brand">Documento válido</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-2 text-text-tertiary hover:text-danger transition-colors"
                    >
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
                Protocolar Plano Agora
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
