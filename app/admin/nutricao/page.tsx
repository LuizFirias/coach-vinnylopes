'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { 
  FileArrowUp, CircleNotch, Trash, AppleLogo, 
  FilePdf, Eye, MagnifyingGlass, User, Info, CheckCircle
} from '@phosphor-icons/react';
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
  full_name?: string | null;
}

interface PlanoAlimentar {
  id: string;
  aluno_id: string;
  nome_arquivo: string;
  descricao: string | null;
  criado_em: string;
  url_pdf: string;
  aluno_ref?: string;
  aluno_email?: string;
  aluno_nome?: string;
}

export default function NutricaoPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [planos, setPlanos] = useState<PlanoAlimentar[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'pdf' | 'digital'>('todos');

  const fetchPlansAndAlunos = useCallback(async () => {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) { 
        setError('Sessão inválida. Faça login novamente.'); 
        setFetchingData(false); 
        return; 
      }

      // Fetch links for the coach's students
      const { data: alunoLinks, error: linkError } = await supabaseClient
        .from('coach_alunos')
        .select('aluno_id')
        .eq('coach_id', coachId);

      if (linkError) throw linkError;

      const ids = alunoLinks?.map(link => link.aluno_id) || [];
      if (ids.length === 0) { 
        setAlunos([]); 
        setPlanos([]);
        setFetchingData(false); 
        return; 
      }

      // Fetch students profiles
      const { data: profilesData, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('id, coaching_reference, email, full_name')
        .in('id', ids)
        .eq('arquivado', false)
        .order('coaching_reference', { ascending: true });

      if (profilesError) throw profilesError;
      setAlunos(profilesData || []);

      // Fetch sent food plans
      const { data: plansData, error: plansError } = await supabaseClient
        .from('plano_alimentar_pdf')
        .select('id, aluno_id, nome_arquivo, descricao, criado_em, url_pdf')
        .eq('coach_id', coachId)
        .order('criado_em', { ascending: false });

      if (plansError) throw plansError;

      // Map student data to plans
      const mappedPlans = (plansData || []).map((plan: any) => {
        const student = (profilesData || []).find(p => p.id === plan.aluno_id);
        return {
          ...plan,
          aluno_ref: student?.coaching_reference || '',
          aluno_email: student?.email || '',
          aluno_nome: student?.full_name || '',
        };
      });

      setPlanos(mappedPlans);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar dados: ' + (err.message || 'Erro de conexão'));
    } finally {
      setFetchingData(false);
    }
  }, []);

  useEffect(() => {
    fetchPlansAndAlunos();
  }, [fetchPlansAndAlunos]);

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
      fetchPlansAndAlunos(); // reload list
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Erro ao realizar upload: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPlan = async (urlPdf: string) => {
    try {
      const { data, error } = await supabaseClient.storage
        .from('plano_alimentar')
        .createSignedUrl(urlPdf, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      alert('Erro ao abrir plano: ' + err.message);
    }
  };

  const handleDeletePlan = async (planId: string, urlPdf: string) => {
    if (!confirm('Deseja realmente excluir este plano alimentar?')) return;
    try {
      setError(null);
      
      // Attempt removal from storage first
      await supabaseClient.storage.from('plano_alimentar').remove([urlPdf]);
      
      // Delete from db
      const { error } = await supabaseClient
        .from('plano_alimentar_pdf')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      setSuccess('Plano deletado com sucesso!');
      fetchPlansAndAlunos();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Erro ao deletar: ' + (err.message || 'Erro desconhecido'));
    }
  };

  // KPIs
  const totalStudents = alunos.length;
  const uniqueStudentsWithPlans = new Set(planos.map(p => p.aluno_id)).size;
  const studentsWithoutPlan = Math.max(0, totalStudents - uniqueStudentsWithPlans);
  
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);
  const plansSentThisMonth = planos.filter(p => new Date(p.criado_em) >= currentMonthStart).length;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const plansPendingUpdate = planos.filter(p => {
    // Get the most recent plan for each student
    const studentPlans = planos.filter(sp => sp.aluno_id === p.aluno_id);
    const isMostRecent = studentPlans[0]?.id === p.id;
    return isMostRecent && new Date(p.criado_em) < thirtyDaysAgo;
  }).length;

  // Filter plans based on search query and active tab
  const filteredPlanos = planos.filter(plan => {
    const matchesSearch = 
      (plan.aluno_nome?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (plan.aluno_ref?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (plan.aluno_email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (plan.nome_arquivo?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (plan.descricao?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
    if (activeTab === 'pdf') {
      return matchesSearch && plan.nome_arquivo.endsWith('.pdf');
    }
    if (activeTab === 'digital') {
      return false; // Digital plan not implemented yet
    }
    return matchesSearch;
  });

  if (fetchingData) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Preparando gestão de nutrição..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-28">
      {/* Header and Actions tab */}
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 border-b border-border-subtle">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Gestão de Nutrição</h1>
            <p className="text-xs md:text-sm text-text-tertiary mt-1">
              Envie, organize e acompanhe planos alimentares dos seus alunos
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="h-10 px-4 bg-brand text-text-on-brand text-xs font-semibold rounded-xl shadow-glow-brand flex items-center gap-1.5 hover:opacity-90 transition-opacity">
              <FileArrowUp size={16} /> Enviar PDF
            </button>
            <button 
              disabled 
              className="h-10 px-4 bg-surface-2 border border-border-subtle text-text-disabled text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-not-allowed"
              title="Recurso em desenvolvimento"
            >
              Criar plano digital
            </button>
            <button 
              disabled 
              className="h-10 px-4 bg-surface-2 border border-border-subtle text-text-disabled text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-not-allowed"
              title="Recurso em desenvolvimento"
            >
              Templates
            </button>
          </div>
        </div>

        {/* KPIs Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Card className="p-4 bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Com plano ativo</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-mono text-3xl font-bold text-text-primary leading-none">{uniqueStudentsWithPlans}</span>
              <span className="text-xs text-text-secondary">aluno{uniqueStudentsWithPlans !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-[10px] text-success mt-2 flex items-center gap-1 font-medium">
              <CheckCircle size={12} className="shrink-0" /> Acompanhamento ativo
            </p>
          </Card>
          
          <Card className="p-4 bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Alunos sem plano</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-mono text-3xl font-bold text-text-primary leading-none">{studentsWithoutPlan}</span>
              <span className="text-xs text-text-secondary">aluno{studentsWithoutPlan !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-[10px] text-warning mt-2 flex items-center gap-1 font-medium">
              <Info size={12} className="shrink-0" /> Requer atenção
            </p>
          </Card>

          <Card className="p-4 bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Enviados no mês</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-mono text-3xl font-bold text-text-primary leading-none">{plansSentThisMonth}</span>
              <span className="text-xs text-text-secondary">plano{plansSentThisMonth !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-[10px] text-text-tertiary mt-2">Atualizados recentemente</p>
          </Card>

          <Card className="p-4 bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Pendentes de atualização</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-mono text-3xl font-bold text-text-primary leading-none">{plansPendingUpdate}</span>
              <span className="text-xs text-text-secondary">aluno{plansPendingUpdate !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-[10px] text-warning mt-2 font-medium">Mais de 30 dias atrás</p>
          </Card>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm">
            <div className="w-2 h-2 rounded-full bg-danger flex-shrink-0 animate-pulse" />
            {error}
          </div>
        )}
        {success && (
          <div className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-success-subtle border border-success-border text-success text-sm">
            <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
          
          {/* Left Column: Upload Form */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="rounded-2xl border border-border-subtle shadow-elev-1 p-5">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-caps mb-4">
                Enviar Plano Alimentar
              </h2>
              
              <form onSubmit={handleUpload} className="flex flex-col gap-4">
                {/* Select aluno */}
                <Select
                  label="Selecione o Aluno"
                  value={selectedAlunoId}
                  onChange={setSelectedAlunoId}
                  placeholder="Escolher aluno..."
                  disabled={loading}
                  options={alunos.map((a) => ({
                    value: a.id,
                    label: a.coaching_reference || a.full_name || a.email || a.id,
                  }))}
                />

                {/* Descrição */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary ml-1">Descrição</label>
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Ex: Dieta bulking limpo, 3200 kcal/dia"
                    disabled={loading}
                    maxLength={200}
                    rows={2}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-default rounded-xl text-text-primary text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-all resize-none disabled:opacity-50"
                  />
                  <p className="text-[9px] text-text-disabled text-right">{descricao.length}/200</p>
                </div>

                {/* Upload */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary ml-1">Arquivo PDF</label>
                  {!selectedFile ? (
                    <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border-default rounded-xl bg-surface-2 hover:bg-brand-subtle hover:border-brand-border transition-all cursor-pointer group">
                      <input type="file" accept=".pdf" onChange={handleFileChange} disabled={loading} className="hidden" />
                      <FileArrowUp size={22} className="text-text-disabled group-hover:text-brand transition-colors mb-1.5" />
                      <p className="text-xs text-text-tertiary">Clique ou arraste o PDF</p>
                      <p className="text-[9px] text-text-disabled mt-0.5">Máximo 50MB</p>
                    </label>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-brand-subtle border border-brand-border rounded-xl">
                      <div className="w-9 h-9 rounded-lg bg-surface-1 border border-brand-border flex items-center justify-center text-brand shrink-0">
                        <FilePdf size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-primary font-medium truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-brand">PDF Pronto</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="p-1.5 text-text-tertiary hover:text-danger transition-colors"
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
                  className="mt-2 h-11"
                >
                  Protocolar Plano
                </Button>
              </form>
            </Card>
          </div>

          {/* Right Column: Recent Plans list/table */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <Card className="rounded-2xl border border-border-subtle shadow-elev-1 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-caps">
                  Histórico de Planos Enviados
                </h2>
                
                {/* Search query input */}
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
                    <MagnifyingGlass size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar aluno ou plano..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-surface-2 border border-border-default rounded-xl text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
                  />
                </div>
              </div>

              {/* Tabs filter */}
              <div className="flex gap-2 border-b border-border-subtle pb-3 mb-4 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setActiveTab('todos')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
                    activeTab === 'todos' ? 'bg-brand/10 text-brand' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  Todos ({planos.length})
                </button>
                <button
                  onClick={() => setActiveTab('pdf')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
                    activeTab === 'pdf' ? 'bg-brand/10 text-brand' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  PDF ({planos.filter(p => p.nome_arquivo.endsWith('.pdf')).length})
                </button>
                <button
                  onClick={() => setActiveTab('digital')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap opacity-50 cursor-not-allowed',
                    activeTab === 'digital' ? 'bg-brand/10 text-brand' : 'text-text-secondary'
                  )}
                  disabled
                  title="Em breve"
                >
                  Digital (0)
                </button>
              </div>

              {/* Table / List */}
              {filteredPlanos.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border-subtle rounded-xl">
                  <AppleLogo size={32} className="text-text-disabled mx-auto mb-2" />
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-caps">
                    {searchQuery ? 'Nenhum plano corresponde à busca' : 'Nenhum plano alimentar enviado'}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-1 max-w-xs mx-auto">
                    {searchQuery 
                      ? 'Tente ajustar sua palavra-chave ou limpar os filtros.' 
                      : 'Envie um plano em PDF ou use um template para gerenciar a nutrição dos seus alunos.'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-border-subtle">
                        <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Aluno</th>
                        <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Descrição</th>
                        <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Tipo</th>
                        <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Enviado em</th>
                        <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-text-tertiary text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/55">
                      {filteredPlanos.map((plan) => {
                        const isStale = new Date(plan.criado_em) < thirtyDaysAgo;
                        return (
                          <tr key={plan.id} className="hover:bg-surface-2/40 transition-colors group">
                            <td className="py-3.5 pr-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center border border-border-subtle text-text-secondary shrink-0">
                                  <User size={14} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-text-primary truncate">
                                    {plan.aluno_ref || plan.aluno_nome || 'Aluno'}
                                  </p>
                                  <p className="text-[10px] text-text-tertiary truncate">{plan.aluno_email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 pr-2 max-w-[200px]">
                              <p className="text-xs text-text-secondary truncate font-medium" title={plan.descricao || plan.nome_arquivo}>
                                {plan.descricao || plan.nome_arquivo}
                              </p>
                            </td>
                            <td className="py-3.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-caps bg-brand/10 text-brand">
                                PDF
                              </span>
                            </td>
                            <td className="py-3.5 pr-2">
                              <div className="flex flex-col">
                                <span className="text-xs text-text-secondary font-mono">
                                  {new Date(plan.criado_em).toLocaleDateString('pt-BR')}
                                </span>
                                {isStale && (
                                  <span className="text-[8px] font-semibold text-warning">Desatualizado</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handlePreviewPlan(plan.url_pdf)}
                                  className="w-8 h-8 rounded-lg bg-surface-2 border border-border-subtle text-text-secondary hover:text-brand hover:border-brand-border flex items-center justify-center transition-colors"
                                  title="Visualizar PDF"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeletePlan(plan.id, plan.url_pdf)}
                                  className="w-8 h-8 rounded-lg bg-surface-2 border border-border-subtle text-text-secondary hover:text-danger hover:border-danger-border flex items-center justify-center transition-colors"
                                  title="Excluir Plano"
                                >
                                  <Trash size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
