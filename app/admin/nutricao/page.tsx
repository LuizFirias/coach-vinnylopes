'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { FileArrowUp, CircleNotch, Trash, AppleLogo, FileText } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import PageHeader from '@/app/components/PageHeader';
import DataTable from '@/app/components/DataTable';
import { getSignedStorageUrl } from "@/lib/storageUrls";
import { cn } from '@/lib/utils/cn';

interface Aluno {
  id: string;
  coaching_reference: string | null;
  email: string | null;
}

interface PlanoEnviado {
  id: string;
  nome_arquivo: string;
  descricao: string | null;
  criado_em: string;
  aluno_id: string;
  pdf_url: string;
  original_path: string;
}

export default function NutricaoPage() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingAlunos, setFetchingAlunos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Planos enviados list
  const [planosEnviados, setPlanosEnviados] = useState<PlanoEnviado[]>([]);
  const [loadingPlanos, setLoadingPlanos] = useState(true);

  const fetchPlanos = async (alunosList: Aluno[]) => {
    setLoadingPlanos(true);
    try {
      const ids = alunosList.map(a => a.id);
      if (ids.length === 0) {
        setPlanosEnviados([]);
        return;
      }

      const { data, error: planosError } = await supabaseClient
        .from('plano_alimentar_pdf')
        .select('id, nome_arquivo, descricao, criado_em, aluno_id, pdf_url, url_pdf')
        .in('aluno_id', ids)
        .order('criado_em', { ascending: false })
        .limit(30);

      if (planosError) throw planosError;

      // Sign the URLs
      const signedData = await Promise.all(((data as any[]) || []).map(async (p: any) => {
        const pdfPath = p.url_pdf || p.pdf_url;
        if (!pdfPath) return { ...p, pdf_url: '', original_path: '' };
        const signed = await getSignedStorageUrl("plano_alimentar", pdfPath, 3600);
        return {
          ...p,
          pdf_url: signed || pdfPath,
          original_path: pdfPath
        };
      }));

      setPlanosEnviados(signedData);
    } catch (err) {
      console.error('Erro ao buscar planos alimentares:', err);
    } finally {
      setLoadingPlanos(false);
    }
  };

  const loadData = async () => {
    setFetchingAlunos(true);
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

      const loadedAlunos = data || [];
      setAlunos(loadedAlunos);
      await fetchPlanos(loadedAlunos);
    } catch {
      setError('Erro ao conectar com o banco de dados');
    } finally {
      setFetchingAlunos(false);
    }
  };

  useEffect(() => {
    loadData();
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

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Erro ao fazer upload');

      setSuccess('Plano alimentar enviado com sucesso!');
      setSelectedFile(null);
      setSelectedAlunoId('');
      setDescricao('');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Erro ao realizar upload: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNutritionPlan = async (planId: string, pdfUrl: string) => {
    if (!window.confirm("Remover este plano alimentar permanentemente?")) return;
    try {
      if (!pdfUrl) throw new Error("URL do PDF não encontrada");
      const pathParts = pdfUrl.split("/plano_alimentar/");
      const filePath = pathParts.length > 1 ? pathParts[1] : pdfUrl;
      await supabaseClient.storage.from("plano_alimentar").remove([filePath]);
      const { error: dbError } = await supabaseClient.from("plano_alimentar_pdf").delete().eq("id", planId);
      if (dbError) throw dbError;
      await loadData();
    } catch (err: any) {
      setError("Erro ao deletar plano: " + err.message);
    }
  };

  // Maps student details in memory
  const studentMap = new Map(alunos.map(a => [a.id, a]));

  const columns = [
    {
      key: 'aluno_id',
      label: 'Atleta',
      sortable: true,
      render: (row: PlanoEnviado) => {
        const student = studentMap.get(row.aluno_id);
        const name = student?.coaching_reference || student?.email || 'Atleta';
        return (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-subtle flex items-center justify-center font-bold text-[9px] text-brand border border-brand-border shrink-0">
              {name[0].toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-text-primary truncate">{name}</span>
          </div>
        );
      }
    },
    {
      key: 'descricao',
      label: 'Descrição / Arquivo',
      sortable: true,
      render: (row: PlanoEnviado) => (
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-text-secondary truncate max-w-[200px]" title={row.descricao || row.nome_arquivo}>
            {row.descricao || row.nome_arquivo}
          </span>
          {row.descricao && (
            <span className="text-[10px] text-text-tertiary truncate max-w-[200px]">
              {row.nome_arquivo}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'criado_em',
      label: 'Enviado em',
      sortable: true,
      render: (row: PlanoEnviado) => (
        <span className="text-xs text-text-tertiary">
          {new Date(row.criado_em).toLocaleDateString('pt-BR')}
        </span>
      )
    },
    {
      key: 'acoes',
      label: 'Ações',
      render: (row: PlanoEnviado) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <a
            href={row.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-[6px] bg-brand-subtle border border-brand-border flex items-center justify-center text-brand hover:bg-brand hover:text-text-on-brand transition-colors"
            title="Visualizar PDF"
          >
            <FileText size={15} />
          </a>
          <button
            onClick={() => handleDeleteNutritionPlan(row.id, row.original_path || row.pdf_url)}
            className="w-8 h-8 rounded-[6px] bg-danger/10 border border-danger/20 flex items-center justify-center text-danger hover:opacity-85 transition-opacity"
            title="Excluir Plano"
          >
            <Trash size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-16 xl:pl-[240px]">
      <div className="max-w-[1440px] px-6 md:px-10 py-8 mx-auto w-full flex flex-col gap-6 animate-fade-in">
        
        <PageHeader
          title="Gestão de Nutrição"
          subtitle="Expedição de planos alimentares para atletas"
        />

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[6px] bg-danger-subtle border border-danger-border text-danger text-sm animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-danger flex-shrink-0 animate-pulse" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[6px] bg-success-subtle border border-success-border text-success text-sm animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Coluna Esquerda: Formulário de Upload */}
          <div className="xl:col-span-5">
            <Card className="rounded-[10px] shadow-sm">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border-subtle">
                <div className="w-10 h-10 rounded-[6px] bg-brand-subtle border border-brand-border flex items-center justify-center text-brand">
                  <AppleLogo size={20} />
                </div>
                <div>
                  <p className="font-bold text-text-primary text-sm">Upload de Plano Alimentar</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">Sincronização imediata</p>
                </div>
              </div>

              {fetchingAlunos ? (
                <div className="flex items-center justify-center py-8">
                  <DumbbellLoader text="Carregando atletas..." />
                </div>
              ) : (
                <form onSubmit={handleUpload} className="flex flex-col gap-4">
                  
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
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-text-tertiary ml-1">Descrição (opcional)</label>
                    <textarea
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Ex: Plano de 2800 kcal/dia - Fase de Bulking"
                      disabled={loading}
                      maxLength={500}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-surface-3 border border-border-default rounded-[6px] text-text-primary text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand transition-all resize-none disabled:opacity-50"
                    />
                    <p className="text-[10px] text-text-disabled text-right">{descricao.length}/500</p>
                  </div>

                  {/* Upload */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-text-tertiary ml-1">Arquivo PDF</label>
                    {!selectedFile ? (
                      <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border-default rounded-[6px] bg-surface-2 hover:bg-brand-subtle hover:border-brand-border transition-all cursor-pointer group">
                        <input type="file" accept=".pdf" onChange={handleFileChange} disabled={loading} className="hidden" />
                        <FileArrowUp size={22} className="text-text-disabled group-hover:text-brand transition-colors mb-1.5" />
                        <p className="text-[11px] text-text-tertiary">Selecionar documento</p>
                      </label>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-brand-subtle border border-brand-border rounded-[6px]">
                        <div className="w-8 h-8 rounded-[6px] bg-surface-3 border border-brand-border flex items-center justify-center text-brand shrink-0">
                          <FileArrowUp size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-primary font-medium truncate">{selectedFile.name}</p>
                          <p className="text-[10px] text-brand">Válido</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="p-1.5 text-text-tertiary hover:text-danger transition-colors"
                        >
                          <Trash size={15} />
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

          {/* Coluna Direita: Planos Enviados DataTable */}
          <div className="xl:col-span-7">
            <Card className="rounded-[10px] shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-text-primary">Planos Enviados Recentemente</h3>
                <p className="text-xs text-text-tertiary">Lista de planos alimentares expedidos para os atletas</p>
              </div>

              {loadingPlanos ? (
                <div className="flex items-center justify-center py-16">
                  <DumbbellLoader text="Carregando nutrição..." />
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={planosEnviados}
                  searchable
                  searchPlaceholder="Buscar por atleta ou descrição..."
                  onRowClick={(row) => router.push(`/admin/aluno/${row.aluno_id}?tab=nutricao`)}
                  emptyState={
                    <div className="text-center py-12 flex flex-col items-center justify-center gap-2">
                      <AppleLogo size={28} className="text-text-disabled" />
                      <p className="text-xs text-text-tertiary">Nenhum plano alimentar enviado recentemente</p>
                    </div>
                  }
                />
              )}
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
}
