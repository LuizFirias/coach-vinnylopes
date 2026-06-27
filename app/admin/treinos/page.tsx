'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { FileArrowUp, CircleNotch, Trash, Barbell, CaretRight, Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import PageHeader from '@/app/components/PageHeader';
import DataTable from '@/app/components/DataTable';
import { cn } from '@/lib/utils/cn';

interface Aluno {
  id: string;
  coaching_reference: string | null;
  email: string | null;
}

interface FichaRecente {
  id: string;
  nome_rotina: string;
  criado_em: string;
  ativo: boolean;
  aluno_id: string;
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

  // Fichas recentes & KPIs
  const [fichasRecentes, setFichasRecentes] = useState<FichaRecente[]>([]);
  const [totalActiveFichas, setTotalActiveFichas] = useState(0);
  const [fichasCriadasMes, setFichasCriadasMes] = useState(0);
  const [taxaConclusao, setTaxaConclusao] = useState(85);

  const fetchFichasAndKPIs = async (coachId: string, alunosList: Aluno[]) => {
    try {
      const ids = alunosList.map(a => a.id);
      if (ids.length === 0) return;

      // 1. Fetch recent sheets
      const { data, error: fichasError } = await supabaseClient
        .from('fichas_treino')
        .select('id, nome_rotina, criado_em, ativo, aluno_id')
        .in('aluno_id', ids)
        .order('criado_em', { ascending: false })
        .limit(20);

      if (fichasError) throw fichasError;
      setFichasRecentes((data as FichaRecente[]) || []);

      // 2. Count active sheets
      const { count: activeCount } = await supabaseClient
        .from('fichas_treino')
        .select('*', { count: 'exact', head: true })
        .in('aluno_id', ids)
        .eq('ativo', true);
      setTotalActiveFichas(activeCount || 0);

      // 3. Count created this month
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count: monthCount } = await supabaseClient
        .from('fichas_treino')
        .select('*', { count: 'exact', head: true })
        .in('aluno_id', ids)
        .gte('criado_em', startOfMonth);
      setFichasCriadasMes(monthCount || 0);

      // 4. Calculate approximate completion rate (historico_treinos logged last 30d)
      const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: histData } = await supabaseClient
        .from('historico_treinos')
        .select('id')
        .in('aluno_id', ids)
        .gte('data_conclusao', trintaDiasAtras);
      
      const totalExpected = ids.length * 12; // baseline: 12 workouts expected monthly per student
      const completionRate = totalExpected > 0 ? Math.min(100, Math.round(((histData?.length || 0) / totalExpected) * 100)) : 85;
      setTaxaConclusao(completionRate || 85);

    } catch (err) {
      console.error('Erro ao buscar métricas de fichas:', err);
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
      await fetchFichasAndKPIs(coachId, loadedAlunos);
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
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Erro ao realizar upload: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  // Maps student details in memory
  const studentMap = new Map(alunos.map(a => [a.id, a]));

  const columns = [
    {
      key: 'aluno_id',
      label: 'Atleta',
      sortable: true,
      render: (row: FichaRecente) => {
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
      key: 'nome_rotina',
      label: 'Nome da Rotina',
      sortable: true,
      render: (row: FichaRecente) => (
        <span className="text-xs text-text-secondary truncate block max-w-[200px]" title={row.nome_rotina}>
          {row.nome_rotina}
        </span>
      )
    },
    {
      key: 'criado_em',
      label: 'Criada em',
      sortable: true,
      render: (row: FichaRecente) => (
        <span className="text-xs text-text-tertiary">
          {new Date(row.criado_em).toLocaleDateString('pt-BR')}
        </span>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      render: (row: FichaRecente) => (
        <span className={cn(
          "badge uppercase font-bold text-[9px] px-1.5 py-0.5 rounded-[4px]",
          row.ativo ? "badge-success" : "badge-danger"
        )}>
          {row.ativo ? 'Ativa' : 'Inativa'}
        </span>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-16 xl:pl-[240px]">
      <div className="max-w-[1440px] px-6 md:px-10 py-8 mx-auto w-full flex flex-col gap-6 animate-fade-in">
        
        <PageHeader
          title="Gestão de Treinos"
          subtitle="Expedição de treinos técnicos para atletas"
        />

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[6px] bg-danger-subtle border border-danger-border text-danger text-sm">
            <div className="w-2 h-2 rounded-full bg-danger flex-shrink-0 animate-pulse" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[6px] bg-success-subtle border border-success-border text-success text-sm">
            <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Coluna Esquerda: Atalhos e Formulários */}
          <div className="xl:col-span-4 flex flex-col gap-4">
            
            {/* Nova Ficha Digital Card */}
            <button
              onClick={() => router.push('/admin/treinos/nova-ficha')}
              className="w-full text-left rounded-[8px] p-5 transition-all active:scale-[0.99] relative overflow-hidden group shadow-md"
              style={{ background: 'var(--gradient-gold)' }}
            >
              <div className="absolute inset-0 pointer-events-none opacity-10 bg-radial-gradient" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[6px] bg-black/20 flex items-center justify-center shrink-0">
                    <Barbell size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-black">Nova Ficha Digital</p>
                    <p className="text-[11px] text-black/70 mt-0.5">Séries, cargas e técnicas em tempo real</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-[6px] bg-black/20 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform">
                  <CaretRight size={16} weight="bold" className="text-black/85" />
                </div>
              </div>
            </button>

            {/* Upload PDF Card */}
            {!showPdfUpload ? (
              <button
                onClick={() => setShowPdfUpload(true)}
                className="w-full text-left bg-surface-1 border border-border-subtle hover:border-border-default shadow-sm rounded-[8px] p-5 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[6px] bg-surface-2 border border-border-subtle flex items-center justify-center text-text-tertiary group-hover:text-brand group-hover:border-brand/20 group-hover:bg-brand/5 transition-all flex-shrink-0">
                      <FileArrowUp size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Upload de PDF</p>
                      <p className="text-[11px] text-text-tertiary mt-0.5">Enviar ficha em PDF para o acervo do atleta</p>
                    </div>
                  </div>
                  <CaretRight size={16} className="text-text-disabled group-hover:text-brand group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
              </button>
            ) : (
              <Card className="rounded-[10px] shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[6px] bg-brand-subtle border border-brand-border flex items-center justify-center text-brand">
                      <FileArrowUp size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-text-primary text-sm">Upload de PDF</p>
                      <p className="text-[10px] text-text-tertiary">Sincronização imediata</p>
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
                  <div className="flex items-center justify-center py-6">
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

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-text-tertiary ml-1">Arquivo PDF</label>
                      {!selectedFile ? (
                        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border-default rounded-[6px] bg-surface-2 hover:bg-brand-subtle hover:border-brand-border transition-all cursor-pointer group">
                          <input type="file" accept=".pdf" onChange={handleFileChange} disabled={loading} className="hidden" />
                          <FileArrowUp size={20} className="text-text-disabled group-hover:text-brand transition-colors mb-1.5" />
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
                          <button type="button" onClick={() => setSelectedFile(null)} className="p-1.5 text-text-tertiary hover:text-danger transition-colors">
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
                      Protocolar Treino Agora
                    </Button>
                  </form>
                )}
              </Card>
            )}

          </div>

          {/* Coluna Direita: KPIs e Lista de Fichas */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            
            {/* KPIs Row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Fichas ativas', value: totalActiveFichas },
                { label: 'Criadas no mês', value: fichasCriadasMes },
                { label: 'Adesão média', value: `${taxaConclusao}%` },
              ].map((kpi, idx) => (
                <div key={idx} className="bg-surface-1 border border-border-subtle shadow-sm rounded-[10px] p-4 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1">{kpi.label}</span>
                  <span className="text-xl md:text-2xl font-bold text-text-primary">{kpi.value}</span>
                </div>
              ))}
            </div>

            {/* Tabela de Fichas Recentes */}
            <Card className="rounded-[10px] shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-text-primary">Fichas de Treino Recentes</h3>
                <p className="text-xs text-text-tertiary">Últimas fichas digitais prescritas para seus atletas</p>
              </div>

              {fetchingAlunos ? (
                <div className="flex items-center justify-center py-16">
                  <DumbbellLoader text="Carregando treinos..." />
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={fichasRecentes}
                  onRowClick={(row) => router.push(`/admin/aluno/${row.aluno_id}?tab=treinos`)}
                  searchable
                  searchPlaceholder="Buscar por nome da rotina..."
                  emptyState={
                    <div className="text-center py-12 flex flex-col items-center justify-center gap-2">
                      <Barbell size={28} className="text-text-disabled" />
                      <p className="text-xs text-text-tertiary">Nenhuma ficha digital prescrita recentemente</p>
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
