'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabaseClient';
import {
  FileArrowUp,
  CircleNotch,
  Trash,
  PlusCircle,
  Barbell,
  CaretRight,
  BookOpen,
  Calendar,
  Users,
  Clock,
  WarningCircle,
  MagnifyingGlass,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Receipt,
  ArrowCounterClockwise
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { cn } from '@/lib/utils/cn';

interface Aluno {
  id: string;
  coaching_reference: string | null;
  full_name: string | null;
  email: string | null;
}

interface RoutineItem {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  nome_rotina: string;
  ativo: boolean;
  criado_em: string;
  tipo: 'digital' | 'pdf';
  exercicios_count: number;
  pdf_url?: string;
}

export default function TreinosPage() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPdfUpload, setShowPdfUpload] = useState(false);

  // Fichas & Listagem States
  const [fichas, setFichas] = useState<RoutineItem[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todas' | 'ativas' | 'inativas'>('todas');
  const [alunosSemFicha, setAlunosSemFicha] = useState<Aluno[]>([]);

  // Stats
  const [fichasAtivas, setFichasAtivas] = useState(0);
  const [fichasCriadasMes, setFichasCriadasMes] = useState(0);
  const [alunosAtendidos, setAlunosAtendidos] = useState(0);
  const [treinosExecutados, setTreinosExecutados] = useState(0);

  const loadData = useCallback(async () => {
    setFetchingData(true);
    setError(null);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) { setError('Sessão inválida'); setFetchingData(false); return; }

      // 1. Fetch coach's student associations
      const { data: links, error: linkError } = await supabaseClient
        .from('coach_alunos').select('aluno_id').eq('coach_id', coachId);

      if (linkError) throw linkError;
      const ids = links?.map(l => l.aluno_id) || [];
      
      if (ids.length === 0) {
        setAlunos([]);
        setFichas([]);
        setAlunosSemFicha([]);
        setFetchingData(false);
        return;
      }

      // 2. Fetch profiles
      const { data: profilesData, error: profilesError } = await supabaseClient
        .from('profiles').select('id, coaching_reference, full_name, email')
        .in('id', ids).eq('arquivado', false).order('coaching_reference', { ascending: true });

      if (profilesError) throw profilesError;
      const profilesList = (profilesData as Aluno[]) || [];
      setAlunos(profilesList);

      // Dates
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      // 3. Fetch Digital sheets (fichas_treino)
      const { data: digitalData, error: digitalError } = await supabaseClient
        .from('fichas_treino')
        .select('id, aluno_id, nome_rotina, configuracao, ativo, criado_em')
        .in('aluno_id', ids)
        .order('criado_em', { ascending: false });

      if (digitalError) throw digitalError;

      // 4. Fetch PDF sheets (treinos_alunos)
      const { data: pdfData, error: pdfError } = await supabaseClient
        .from('treinos_alunos')
        .select('id, aluno_id, nome_arquivo, url_pdf, data_upload')
        .in('aluno_id', ids)
        .order('data_upload', { ascending: false });

      if (pdfError) throw pdfError;

      // Map combined routines list
      const combinedRoutines: RoutineItem[] = [];
      let activeCount = 0;
      let monthCreatedCount = 0;
      const uniqueStudentsActive = new Set<string>();

      (digitalData || []).forEach(f => {
        const student = profilesList.find(p => p.id === f.aluno_id);
        const exCount = f.configuracao?.exercicios?.length || 0;
        
        if (f.ativo) {
          activeCount++;
          uniqueStudentsActive.add(f.aluno_id);
        }
        
        const createdDate = new Date(f.criado_em);
        if (createdDate >= trintaDiasAtras) {
          monthCreatedCount++;
        }

        combinedRoutines.push({
          id: f.id,
          aluno_id: f.aluno_id,
          aluno_nome: student?.coaching_reference || student?.full_name || student?.email || 'Atleta',
          nome_rotina: f.nome_rotina,
          ativo: f.ativo,
          criado_em: f.criado_em,
          tipo: 'digital',
          exercicios_count: exCount
        });
      });

      (pdfData || []).forEach(p => {
        const student = profilesList.find(prof => prof.id === p.aluno_id);
        const createdDate = new Date(p.data_upload);
        if (createdDate >= trintaDiasAtras) {
          monthCreatedCount++;
        }
        
        // PDFs are active by definition in simple schema
        uniqueStudentsActive.add(p.aluno_id);

        combinedRoutines.push({
          id: p.id,
          aluno_id: p.aluno_id,
          aluno_nome: student?.coaching_reference || student?.full_name || student?.email || 'Atleta',
          nome_rotina: p.nome_arquivo || 'Plano de Treino PDF',
          ativo: true, // PDFs default to active
          criado_em: p.data_upload,
          tipo: 'pdf',
          exercicios_count: 0,
          pdf_url: p.url_pdf
        });
      });

      // Sort combined list by date descending
      combinedRoutines.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
      setFichas(combinedRoutines);

      // 5. Fetch executions in the last 30 days (historico_treinos)
      const { count: executionsCount } = await supabaseClient
        .from('historico_treinos')
        .select('id', { count: 'exact', head: true })
        .in('aluno_id', ids)
        .gte('data_conclusao', trintaDiasAtras.toISOString());

      setFichasAtivas(activeCount);
      setFichasCriadasMes(monthCreatedCount);
      setAlunosAtendidos(uniqueStudentsActive.size);
      setTreinosExecutados(executionsCount || 0);

      // 6. Identify students without active routines
      const studentsWithoutActiveRoutine = profilesList.filter(p => !uniqueStudentsActive.has(p.id));
      setAlunosSemFicha(studentsWithoutActiveRoutine);

    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar dados do módulo de treinos');
    } finally {
      setFetchingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleDeletePDFRoutine = async (id: string, urlPdf: string) => {
    if (!window.confirm("Deseja remover este treino em PDF permanentemente?")) return;
    setLoading(true);
    try {
      // Remove file from storage
      const filePath = urlPdf;
      await supabaseClient.storage.from('treinos-pdf').remove([filePath]);
      
      // Delete record
      const { error } = await supabaseClient.from('treinos_alunos').delete().eq('id', id);
      if (error) throw error;
      await loadData();
      setSuccess("Treino PDF removido com sucesso.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError("Erro ao remover treino: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setQuery('');
    setStatusFilter('todas');
  };

  // Filter in-memory routines
  const processedRoutines = fichas.filter(f => {
    const student = f.aluno_nome.toLowerCase();
    const name = f.nome_rotina.toLowerCase();
    const matchesSearch = student.includes(query.toLowerCase()) || name.includes(query.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'ativas') return f.ativo;
    if (statusFilter === 'inativas') return !f.ativo;
    return true; // 'todas'
  });

  if (fetchingData) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center lg:pl-28">
        <DumbbellLoader text="Sincronizando gestão de treinos..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-8 lg:p-10 lg:pl-28 pb-24 text-text-primary font-sans">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary font-display uppercase">
              Gestão de Treinos
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Crie, organize e distribua fichas digitais e PDFs para seus alunos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => router.push('/admin/treinos/nova-ficha')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-hover text-text-on-brand text-xs font-semibold uppercase tracking-wider rounded-lg transition-all active:scale-95 shadow-md shadow-brand/10"
            >
              <PlusCircle size={14} weight="bold" /> Nova Ficha Digital
            </button>
            <button
              onClick={() => setShowPdfUpload(!showPdfUpload)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-2 border border-border-default hover:bg-surface-3 text-text-primary text-xs font-semibold uppercase tracking-wider rounded-lg transition-all active:scale-95"
            >
              <FileArrowUp size={14} /> Upload de PDF
            </button>
            <Link
              href="/admin/biblioteca-exercicios"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-2 border border-border-default hover:bg-surface-3 text-text-primary text-xs font-semibold uppercase tracking-wider rounded-lg transition-all"
            >
              <BookOpen size={14} /> Biblioteca
            </Link>
          </div>
        </div>

        {/* ── Alerts ── */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm">
            <WarningCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-success-subtle border border-success-border text-success text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {alunos.length === 0 ? (
          /* Empty State - No students registered yet */
          <div className="bg-surface-1 border border-border-subtle rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xl">
            <Barbell size={48} className="text-brand/40 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-text-primary mb-2">Nenhum aluno vinculado ainda</h3>
            <p className="text-text-secondary text-sm mb-6">
              Você precisa possuir alunos vinculados para começar a prescrever e gerenciar treinos digitais e PDFs.
            </p>
            <button onClick={() => router.push("/admin/alunos/novo")} className="btn-primary inline-flex items-center gap-2 max-w-xs mx-auto">
              Cadastrar Aluno
            </button>
          </div>
        ) : (
          /* Training Hub Content */
          <div className="flex flex-col gap-8">

            {/* ── Metrics Cards Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Fichas Digitais Ativas", value: fichasAtivas, icon: Barbell, color: "text-brand", bg: "bg-brand/10 border-brand/20" },
                { label: "Prescrições (Mês)", value: fichasCriadasMes, icon: Calendar, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/15" },
                { label: "Alunos Atendidos", value: alunosAtendidos, icon: Users, color: "text-success", bg: "bg-success-subtle border-success/15" },
                { label: "Execuções (30d)", value: treinosExecutados, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/15" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-surface-1 rounded-xl p-5 border border-border-subtle shadow-sm flex items-center justify-between gap-4">
                  <div>
                    <span className="text-2xs font-medium text-text-tertiary uppercase tracking-wider block">{label}</span>
                    <span className="text-2xl font-bold tracking-tight text-text-primary mt-1 font-display block">{value}</span>
                  </div>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", bg)}>
                    <Icon size={18} className={color} />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Main Workspace split layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* Coluna Esquerda: Listagem de Fichas Recentes */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Search & Filters */}
                <div className="bg-surface-1 border border-border-subtle rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <div className="relative w-full sm:max-w-xs">
                    <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar por rotina ou aluno..."
                      className="w-full pl-10 pr-4 py-2.5 bg-surface-2 border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand/40 transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-surface-2 border border-border-subtle rounded-lg p-1">
                      {(['todas', 'ativas', 'inativas'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={cn(
                            "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                            statusFilter === status
                              ? "bg-brand text-text-on-brand shadow-sm shadow-brand/10"
                              : "text-text-secondary hover:text-text-primary"
                          )}
                        >
                          {status}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleResetFilters}
                      className="p-2.5 bg-surface-2 hover:bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                      title="Resetar busca"
                    >
                      <ArrowCounterClockwise size={14} />
                    </button>
                  </div>
                </div>

                {/* Table list */}
                <div className="bg-surface-1 border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-border-subtle">
                    <h3 className="text-sm font-bold text-text-primary">Fichas e Protocolos</h3>
                    <p className="text-2xs text-text-tertiary">Grade completa de planejamentos cadastrados</p>
                  </div>

                  {processedRoutines.length === 0 ? (
                    <div className="p-12 text-center">
                      <WarningCircle size={32} className="text-text-disabled mx-auto mb-3" />
                      <p className="text-sm text-text-secondary font-medium">Nenhum treino localizado</p>
                      <p className="text-2xs text-text-tertiary mt-1">Limpe os filtros ou crie um novo treino.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-border-subtle bg-surface-2/40">
                            <th className="p-4 text-2xs font-semibold tracking-caps text-text-tertiary uppercase">Aluno</th>
                            <th className="p-4 text-2xs font-semibold tracking-caps text-text-tertiary uppercase">Rotina</th>
                            <th className="p-4 text-2xs font-semibold tracking-caps text-text-tertiary uppercase">Estrutura</th>
                            <th className="p-4 text-2xs font-semibold tracking-caps text-text-tertiary uppercase">Status</th>
                            <th className="p-4 text-2xs font-semibold tracking-caps text-text-tertiary uppercase">Criado em</th>
                            <th className="p-4 text-2xs font-semibold tracking-caps text-text-tertiary uppercase text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {processedRoutines.map((item) => (
                            <tr key={item.id} className="border-b border-border-subtle last:border-b-0 hover:bg-surface-2/40 transition-colors">
                              <td className="p-4 font-bold text-text-primary">
                                {item.aluno_nome}
                              </td>
                              <td className="p-4">
                                <span className="font-semibold text-text-secondary">{item.nome_rotina}</span>
                              </td>
                              <td className="p-4 text-text-tertiary font-medium">
                                {item.tipo === 'digital' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-brand/10 text-brand rounded border border-brand/10">
                                    {item.exercicios_count} exercícios
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/10">
                                    PDF
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                  item.ativo ? "bg-success-subtle text-success border border-success/15" : "bg-surface-3 text-text-disabled border border-border-subtle"
                                )}>
                                  {item.ativo ? "Ativo" : "Inativo"}
                                </span>
                              </td>
                              <td className="p-4 text-text-secondary">
                                {new Date(item.criado_em).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="p-4 text-right">
                                {item.tipo === 'digital' ? (
                                  <button
                                    onClick={() => router.push(`/admin/aluno/${item.aluno_id}/ficha/${item.id}`)}
                                    className="px-2 py-1 bg-surface-2 hover:bg-surface-3 border border-border-subtle text-brand text-[10px] font-bold uppercase rounded"
                                  >
                                    Editar
                                  </button>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 justify-end">
                                    <a
                                      href={item.pdf_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1 bg-surface-2 hover:bg-surface-3 border border-border-subtle text-brand text-[10px] font-bold uppercase rounded"
                                    >
                                      Baixar
                                    </a>
                                    <button
                                      onClick={() => handleDeletePDFRoutine(item.id, item.pdf_url || '')}
                                      className="text-text-disabled hover:text-danger p-1"
                                      title="Remover PDF"
                                    >
                                      <Trash size={12} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              {/* Coluna Direita: Ações, Formulário PDF inline & Alunos sem Ficha */}
              <div className="lg:col-span-4 flex flex-col gap-6">

                {/* Inline PDF Upload Form */}
                {showPdfUpload && (
                  <Card className="rounded-2xl border border-border-subtle p-5 bg-surface-1 shadow-md animate-fade-in flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                      <div className="flex items-center gap-2">
                        <FileArrowUp size={18} className="text-brand" />
                        <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider">Protocolar PDF</h4>
                      </div>
                      <button onClick={() => { setShowPdfUpload(false); setSelectedFile(null); }} className="text-xs text-text-tertiary hover:text-text-primary">
                        Cancelar
                      </button>
                    </div>

                    <form onSubmit={handleUpload} className="flex flex-col gap-4">
                      <Select
                        label="Selecione o Atleta"
                        value={selectedAlunoId}
                        onChange={setSelectedAlunoId}
                        placeholder="Escolher atleta..."
                        disabled={loading}
                        options={alunos.map((a) => ({
                          value: a.id,
                          label: a.coaching_reference || a.full_name || a.email || a.id,
                        }))}
                      />

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary ml-0.5">Arquivo PDF</label>
                        {!selectedFile ? (
                          <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border-default rounded-xl bg-surface-2 hover:bg-brand/5 hover:border-brand/35 transition-all cursor-pointer group">
                            <input type="file" accept=".pdf" onChange={handleFileChange} disabled={loading} className="hidden" />
                            <FileArrowUp size={20} className="text-text-disabled group-hover:text-brand transition-colors mb-1.5" />
                            <p className="text-[10px] text-text-tertiary font-medium">Clique para escolher PDF</p>
                          </label>
                        ) : (
                          <div className="flex items-center justify-between p-3 bg-brand/5 border border-brand/20 rounded-xl">
                            <div className="min-w-0">
                              <p className="text-xs text-text-primary font-bold truncate max-w-[160px]">{selectedFile.name}</p>
                              <p className="text-[10px] text-brand font-semibold">PDF pronto para envio</p>
                            </div>
                            <button type="button" onClick={() => setSelectedFile(null)} className="text-text-disabled hover:text-danger p-1">
                              <Trash size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      <Button
                        type="submit"
                        loading={loading}
                        disabled={loading || !selectedAlunoId || !selectedFile}
                        fullWidth
                        size="sm"
                      >
                        Enviar PDF
                      </Button>
                    </form>
                  </Card>
                )}

                {/* Quick actions panel */}
                <div className="bg-surface-1 border border-border-subtle rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-text-primary">Rotas Rápidas</h3>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => router.push('/admin/treinos/nova-ficha')}
                      className="w-full py-3 px-4 bg-surface-2 hover:bg-surface-3 border border-border-subtle rounded-xl text-left flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Barbell size={16} className="text-brand shrink-0" />
                        <span className="text-xs font-bold text-text-primary group-hover:text-brand transition-colors">Nova Ficha Digital</span>
                      </div>
                      <ArrowRight size={12} className="text-text-disabled group-hover:translate-x-0.5 transition-all" />
                    </button>
                    <button
                      onClick={() => setShowPdfUpload(!showPdfUpload)}
                      className="w-full py-3 px-4 bg-surface-2 hover:bg-surface-3 border border-border-subtle rounded-xl text-left flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <FileArrowUp size={16} className="text-brand shrink-0" />
                        <span className="text-xs font-bold text-text-primary group-hover:text-brand transition-colors">Cadastrar PDF</span>
                      </div>
                      <ArrowRight size={12} className="text-text-disabled group-hover:translate-x-0.5 transition-all" />
                    </button>
                    <button
                      onClick={() => router.push('/admin/biblioteca-exercicios')}
                      className="w-full py-3 px-4 bg-surface-2 hover:bg-surface-3 border border-border-subtle rounded-xl text-left flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen size={16} className="text-brand shrink-0" />
                        <span className="text-xs font-bold text-text-primary group-hover:text-brand transition-colors">Biblioteca</span>
                      </div>
                      <ArrowRight size={12} className="text-text-disabled group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </div>
                </div>

                {/* Alunos sem Ficha Ativa list card */}
                <div className="bg-surface-1 border border-border-subtle rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Alunos sem Ficha Ativa</h3>
                    <p className="text-2xs text-text-tertiary">Alunos que estão sem planejamento ativo</p>
                  </div>

                  <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                    {alunosSemFicha.length === 0 ? (
                      <div className="py-4 text-center text-xs text-text-tertiary">
                        🎉 Todos os atletas possuem fichas/PDFs ativos!
                      </div>
                    ) : (
                      alunosSemFicha.map((aluno) => (
                        <div key={aluno.id} className="flex items-center justify-between gap-3 p-3 bg-surface-2 border border-border-subtle rounded-xl">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text-primary truncate">{aluno.coaching_reference || aluno.full_name || 'Atleta'}</p>
                            <p className="text-[10px] text-text-tertiary truncate">{aluno.email}</p>
                          </div>
                          <button
                            onClick={() => router.push(`/admin/treinos/nova-ficha?alunoId=${aluno.id}`)}
                            className="px-2 py-1.5 bg-brand hover:bg-brand-hover text-text-on-brand text-[9px] font-bold uppercase rounded transition-all shrink-0"
                          >
                            + Prescrever
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
