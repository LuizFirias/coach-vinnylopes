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
  ArrowCounterClockwise,
  Eye,
  PencilSimple,
  X
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
  const [selectedRoutineForPreview, setSelectedRoutineForPreview] = useState<any | null>(null);

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
      let profilesList: Aluno[] = [];
      if (ids.length > 0) {
        const { data: profilesData, error: profilesError } = await supabaseClient
          .from('profiles').select('id, coaching_reference, full_name, email')
          .in('id', ids).eq('arquivado', false).order('coaching_reference', { ascending: true });

        if (profilesError) throw profilesError;
        profilesList = (profilesData as Aluno[]) || [];
        setAlunos(profilesList);
      } else {
        setAlunos([]);
      }

      // Dates
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      // 3. Fetch Digital sheets (fichas_treino) by coach_id
      const { data: digitalData, error: digitalError } = await supabaseClient
        .from('fichas_treino')
        .select('id, aluno_id, nome_rotina, configuracao, ativo, criado_em')
        .eq('coach_id', coachId)
        .order('criado_em', { ascending: false });

      if (digitalError) throw digitalError;

      // 4. Fetch PDF sheets (treinos_alunos) by coach_id
      const { data: pdfData, error: pdfError } = await supabaseClient
        .from('treinos_alunos')
        .select('id, aluno_id, nome_arquivo, url_pdf, data_upload')
        .eq('coach_id', coachId)
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
      let executionsCount = 0;
      if (ids.length > 0) {
        const { count } = await supabaseClient
          .from('historico_treinos')
          .select('id', { count: 'exact', head: true })
          .in('aluno_id', ids)
          .gte('data_conclusao', trintaDiasAtras.toISOString());
        executionsCount = count || 0;
      }

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

  const handleDeleteRoutine = async (id: string, tipo: string, urlPdf?: string | null) => {
    if (!window.confirm("Deseja remover este planejamento permanentemente?")) return;
    setLoading(true);
    try {
      if (tipo === 'pdf' && urlPdf) {
        await supabaseClient.storage.from('treinos-pdf').remove([urlPdf]);
        const { error } = await supabaseClient.from('treinos_alunos').delete().eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabaseClient.from('fichas_treino').delete().eq('id', id);
        if (error) throw error;
      }
      await loadData();
      setSuccess("Planejamento removido com sucesso.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError("Erro ao remover: " + err.message);
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
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const normalizedQuery = normalize(query);
    const matchesSearch = 
      normalize(f.aluno_nome).includes(normalizedQuery) || 
      normalize(f.nome_rotina).includes(normalizedQuery);
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 border-b border-border-subtle">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary font-display">
              Gestão de Treinos
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Crie, organize e distribua fichas digitais e PDFs para seus alunos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => router.push('/admin/treinos/nova-ficha')}
              className="inline-flex items-center gap-1.5 px-3 h-9 bg-brand hover:bg-brand/90 text-text-on-brand text-xs font-semibold rounded-lg transition-all active:scale-95 shadow-sm"
            >
              <PlusCircle size={14} weight="bold" /> Nova Ficha Digital
            </button>
            <button
              onClick={() => setShowPdfUpload(!showPdfUpload)}
              className="inline-flex items-center gap-1.5 px-3 h-9 bg-surface-2 border border-border-default hover:bg-surface-3 text-text-primary text-xs font-semibold rounded-lg transition-all active:scale-95"
            >
              <FileArrowUp size={14} /> Upload de PDF
            </button>
            <Link
              href="/admin/biblioteca-exercicios"
              className="inline-flex items-center gap-1.5 px-3 h-9 bg-surface-2 border border-border-default hover:bg-surface-3 text-text-primary text-xs font-semibold rounded-lg transition-all"
            >
              <BookOpen size={14} /> Biblioteca
            </Link>
          </div>
        </div>

        {/* ── Alerts ── */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-danger-subtle border border-danger-border text-danger text-xs font-semibold">
            <WarningCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-success-subtle border border-success-border text-success text-xs font-semibold">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {alunos.length === 0 ? (
          /* Empty State - No students registered yet */
          <div className="bg-surface-1 border border-border-subtle rounded-xl p-12 text-center max-w-lg mx-auto shadow-sm">
            <Barbell size={44} className="text-brand/40 mx-auto mb-4" />
            <h3 className="text-base font-bold text-text-primary mb-2">Nenhum aluno vinculado ainda</h3>
            <p className="text-text-secondary text-xs mb-6">
              Você precisa possuir alunos vinculados para começar a prescrever e gerenciar treinos digitais e PDFs.
            </p>
            <button onClick={() => router.push("/admin/alunos/novo")} className="btn-primary inline-flex items-center gap-2 max-w-xs mx-auto text-xs py-2 rounded-lg">
              Cadastrar Aluno
            </button>
          </div>
        ) : (
          /* Training Hub Content */
          <div className="flex flex-col gap-6">

            {/* ── Metrics Cards Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Fichas Digitais Ativas", value: fichasAtivas, dotColor: "bg-brand" },
                { label: "Prescrições (Mês)", value: fichasCriadasMes, dotColor: "bg-brand" },
                { label: "Alunos Atendidos", value: alunosAtendidos, dotColor: "bg-success" },
                { label: "Execuções (30d)", value: treinosExecutados, dotColor: "bg-warning" },
              ].map(({ label, value, dotColor }) => (
                <div key={label} className="bg-surface-1 rounded-lg p-4 border border-border-subtle shadow-sm flex flex-col justify-center h-20">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{label}</span>
                  </div>
                  <span className="text-xl font-bold tracking-tight text-text-primary mt-1.5 font-mono tabular-nums leading-none">{value}</span>
                </div>
              ))}
            </div>

            {/* ── Main Workspace split layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Coluna Esquerda: Listagem de Fichas Recentes */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                
                {/* Search & Filters */}
                <div className="bg-surface-1 border border-border-subtle rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <div className="relative w-full sm:max-w-xs">
                    <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar por rotina ou aluno..."
                      className="w-full pl-9 pr-4 h-7.5 bg-surface-2 border border-border-subtle rounded-md text-2xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand/40 transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-surface-2 border border-border-subtle rounded-lg p-1">
                      {(['todas', 'ativas', 'inativas'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={cn(
                            "px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded transition-all",
                            statusFilter === status
                              ? "bg-brand text-text-on-brand shadow-sm"
                              : "text-text-secondary hover:text-text-primary"
                          )}
                        >
                          {status}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleResetFilters}
                      className="p-2 bg-surface-2 hover:bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                      title="Resetar busca"
                    >
                      <ArrowCounterClockwise size={13} />
                    </button>
                  </div>
                </div>

                {/* Table list */}
                <div className="bg-surface-1 border border-border-subtle rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-border-subtle bg-surface-2/40">
                    <h3 className="text-xs font-bold text-text-primary">Fichas e Protocolos</h3>
                    <p className="text-[10px] text-text-tertiary">Grade completa de planejamentos cadastrados</p>
                  </div>

                  {processedRoutines.length === 0 ? (
                    <div className="p-10 text-center">
                      <WarningCircle size={28} className="text-text-disabled mx-auto mb-2" />
                      <p className="text-xs text-text-secondary font-medium">Nenhum treino localizado</p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">Limpe os filtros ou crie um novo treino.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto scrollbar-hide">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-border-subtle bg-surface-2/10">
                            <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Aluno</th>
                            <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Rotina</th>
                            <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Estrutura</th>
                            <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Status</th>
                            <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Criado em</th>
                            <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle/50">
                          {processedRoutines.map((item) => (
                            <tr key={item.id} className="hover:bg-surface-2/40 transition-colors">
                              <td className="p-3 font-bold text-text-primary">
                                {item.aluno_nome}
                              </td>
                              <td className="p-3">
                                <span className="font-semibold text-text-secondary">{item.nome_rotina}</span>
                              </td>
                              <td className="p-3 text-text-tertiary font-medium">
                                {item.tipo === 'digital' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-surface-2 text-text-secondary rounded border border-border-subtle font-semibold">
                                    {item.exercicios_count} exercícios
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/10">
                                    PDF
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase",
                                  item.ativo ? "bg-success-subtle text-success border border-success/15" : "bg-surface-3 text-text-disabled border border-border-subtle"
                                )}>
                                  {item.ativo ? "Ativo" : "Inativo"}
                                </span>
                              </td>
                              <td className="p-3 text-text-secondary">
                                {new Date(item.criado_em).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {item.tipo === 'digital' ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedRoutineForPreview(item)}
                                        className="w-7 h-7 rounded-md bg-surface-2 border border-border-subtle text-text-secondary hover:text-brand flex items-center justify-center transition-colors cursor-pointer"
                                        title="Visualizar Ficha"
                                      >
                                        <Eye size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => router.push(`/admin/aluno/${item.aluno_id}/ficha/${item.id}`)}
                                        className="w-7 h-7 rounded-md bg-surface-2 border border-border-subtle text-text-secondary hover:text-brand flex items-center justify-center transition-colors cursor-pointer"
                                        title="Editar Ficha"
                                      >
                                        <PencilSimple size={13} />
                                      </button>
                                    </>
                                  ) : (
                                    <a
                                      href={item.pdf_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-7 h-7 rounded-md bg-surface-2 border border-border-subtle text-text-secondary hover:text-brand flex items-center justify-center transition-colors cursor-pointer"
                                      title="Visualizar PDF"
                                    >
                                      <Eye size={13} />
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRoutine(item.id, item.tipo, item.pdf_url)}
                                    className="w-7 h-7 rounded-md bg-surface-2 border border-border-subtle text-text-secondary hover:text-danger flex items-center justify-center transition-colors cursor-pointer"
                                    title="Excluir Planejamento"
                                  >
                                    <Trash size={13} />
                                  </button>
                                </div>
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
                  <Card className="rounded-xl border border-border-subtle p-4 bg-surface-1 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                      <div className="flex items-center gap-2">
                        <FileArrowUp size={16} className="text-brand" />
                        <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider">Protocolar PDF</h4>
                      </div>
                      <button onClick={() => { setShowPdfUpload(false); setSelectedFile(null); }} className="text-[10px] text-text-tertiary hover:text-text-primary font-bold uppercase">
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
                          <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-border-default rounded-lg bg-surface-2 hover:bg-brand/5 hover:border-brand/35 transition-all cursor-pointer group">
                            <input type="file" accept=".pdf" onChange={handleFileChange} disabled={loading} className="hidden" />
                            <FileArrowUp size={18} className="text-text-disabled group-hover:text-brand transition-colors mb-1" />
                            <p className="text-xs text-text-tertiary">Clique para escolher PDF</p>
                          </label>
                        ) : (
                          <div className="flex items-center justify-between p-2 bg-brand-subtle border border-brand-border rounded-lg">
                            <div className="min-w-0">
                              <p className="text-xs text-text-primary font-bold truncate max-w-[160px]">{selectedFile.name}</p>
                              <p className="text-[9px] text-brand">PDF pronto para envio</p>
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
                        className="h-10 rounded-lg text-xs"
                      >
                        Enviar PDF
                      </Button>
                    </form>
                  </Card>
                )}

                {/* Quick actions panel */}
                <div className="bg-surface-1 border border-border-subtle rounded-xl p-4 md:p-5 shadow-sm flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-subtle pb-2">Rotas Rápidas</h3>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => router.push('/admin/treinos/nova-ficha')}
                      className="w-full py-2.5 px-3.5 bg-surface-2 hover:bg-surface-3 border border-border-subtle rounded-lg text-left flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <Barbell size={16} className="text-brand shrink-0" />
                        <span className="text-xs font-bold text-text-primary group-hover:text-brand transition-colors">Nova Ficha Digital</span>
                      </div>
                      <ArrowRight size={12} className="text-text-disabled group-hover:translate-x-0.5 transition-all" />
                    </button>
                    <button
                      onClick={() => setShowPdfUpload(!showPdfUpload)}
                      className="w-full py-2.5 px-3.5 bg-surface-2 hover:bg-surface-3 border border-border-subtle rounded-lg text-left flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileArrowUp size={16} className="text-brand shrink-0" />
                        <span className="text-xs font-bold text-text-primary group-hover:text-brand transition-colors">Cadastrar PDF</span>
                      </div>
                      <ArrowRight size={12} className="text-text-disabled group-hover:translate-x-0.5 transition-all" />
                    </button>
                    <button
                      onClick={() => router.push('/admin/biblioteca-exercicios')}
                      className="w-full py-2.5 px-3.5 bg-surface-2 hover:bg-surface-3 border border-border-subtle rounded-lg text-left flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <BookOpen size={16} className="text-brand shrink-0" />
                        <span className="text-xs font-bold text-text-primary group-hover:text-brand transition-colors">Biblioteca</span>
                      </div>
                      <ArrowRight size={12} className="text-text-disabled group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </div>
                </div>

                {/* Alunos sem Ficha Ativa list card */}
                <div className="bg-surface-1 border border-border-subtle rounded-xl p-4 md:p-5 shadow-sm flex flex-col gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Alunos sem Ficha Ativa</h3>
                    <p className="text-[10px] text-text-tertiary mt-0.5">Alunos que estão sem planejamento ativo</p>
                  </div>

                  <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {alunosSemFicha.length === 0 ? (
                      <div className="py-4 text-center text-xs text-text-tertiary">
                        Todos os alunos possuem fichas/PDFs ativos.
                      </div>
                    ) : (
                      alunosSemFicha.map((aluno) => (
                        <div key={aluno.id} className="flex items-center justify-between gap-3 p-2.5 bg-surface-2 border border-border-subtle rounded-lg">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text-primary truncate">{aluno.coaching_reference || aluno.full_name || 'Atleta'}</p>
                            <p className="text-[9px] text-text-tertiary truncate leading-none mt-0.5">{aluno.email}</p>
                          </div>
                          <button
                            onClick={() => router.push(`/admin/treinos/nova-ficha?alunoId=${aluno.id}`)}
                            className="px-2.5 py-1 bg-brand hover:bg-brand/90 text-text-on-brand text-[9px] font-bold uppercase rounded-lg transition-all shrink-0 active:scale-95"
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

      {/* Simplified Routine Preview Modal */}
      {selectedRoutineForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="bg-surface-1 border border-border-default rounded-3xl w-full max-w-lg overflow-hidden shadow-elev-3 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-surface-2/40">
              <div>
                <span className="text-[9px] uppercase font-bold text-brand tracking-wider bg-brand/10 px-2 py-0.5 rounded border border-brand/20">Ficha Digital</span>
                <h3 className="text-sm font-bold text-text-primary mt-2 uppercase">{selectedRoutineForPreview.nome_rotina || selectedRoutineForPreview.nome}</h3>
              </div>
              <button
                onClick={() => setSelectedRoutineForPreview(null)}
                className="w-8 h-8 rounded-full hover:bg-surface-3 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {(() => {
                const exercises = (selectedRoutineForPreview.configuracao as any)?.exercicios || [];
                if (exercises.length === 0) {
                  return <p className="text-xs text-text-tertiary text-center py-4">Nenhum exercício cadastrado nesta ficha.</p>;
                }
                return exercises.map((ex: any, idx: number) => (
                  <div key={idx} className="p-4 bg-surface-2 border border-border-subtle rounded-xl space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-bold text-text-primary">{idx + 1}. {ex.nome}</h4>
                      {ex.descanso && (
                        <span className="text-[10px] text-text-tertiary font-mono bg-surface-3 px-1.5 py-0.5 rounded">
                          Descanso: {ex.descanso}
                        </span>
                      )}
                    </div>
                    {ex.observacoes && (
                      <p className="text-[11px] text-text-secondary italic">Obs: {ex.observacoes}</p>
                    )}
                    
                    {/* Series List */}
                    <div className="pt-2 border-t border-border-subtle/40 space-y-1.5">
                      {ex.series?.map((s: any, sIdx: number) => (
                        <div key={sIdx} className="flex items-center gap-3 text-[11px] text-text-secondary font-medium">
                          <span className="w-5 h-5 rounded bg-brand/10 text-brand text-[9px] font-bold flex items-center justify-center">
                            {s.ordem || (sIdx + 1)}
                          </span>
                          <span>
                            {s.reps_sugerido ? `${s.reps_sugerido} reps` : ""}
                            {s.tempo_sugerido ? `${s.tempo_sugerido} tempo` : ""}
                            {s.distancia_sugerida ? ` • ${s.distancia_sugerida}m` : ""}
                          </span>
                          {(s.tecnica || s.tecnica_extra) && (
                            <span className="text-[9px] uppercase font-bold text-brand tracking-wider bg-brand/5 px-1 rounded">
                              {[s.tecnica, s.tecnica_extra].filter(Boolean).join(" + ")}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border-subtle bg-surface-2/40 flex justify-end">
              <button
                onClick={() => setSelectedRoutineForPreview(null)}
                className="px-4 py-2 bg-surface-3 hover:bg-surface-4 text-text-primary rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
