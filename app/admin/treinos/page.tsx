'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import {
  FileArrowUp,
  Trash,
  PlusCircle,
  Barbell,
  BookOpen,
  WarningCircle,
  MagnifyingGlass,
  CheckCircle,
  ArrowCounterClockwise,
  X
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import { cn } from '@/lib/utils/cn';
import { textIncludes } from '@/lib/utils/textNormalize';
import { alunoTreinosReturnUrl, withReturnUrl } from '@/lib/utils/adminNav';
import type { WorkoutPlan, AlunoSemFicha } from '@/app/components/admin/workouts/types';
import { WorkoutsTable, WorkoutsEmptyState } from '@/app/components/admin/workouts/WorkoutsTable';
import { WorkoutsMobileList } from '@/app/components/admin/workouts/WorkoutsMobileList';
import { StudentsWithoutWorkoutAlert } from '@/app/components/admin/workouts/StudentsWithoutWorkoutAlert';
import { DeleteWorkoutModal } from '@/app/components/admin/workouts/DeleteWorkoutModal';

interface Aluno {
  id: string;
  coaching_reference: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
}

export default function TreinosPage() {
  const router = useRouter();
  const isMobile = useBreakpoint('mobile');
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPdfUpload, setShowPdfUpload] = useState(false);
  const [selectedRoutineForPreview, setSelectedRoutineForPreview] = useState<WorkoutPlan | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutPlan | null>(null);

  const [fichas, setFichas] = useState<WorkoutPlan[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todas' | 'ativas' | 'inativas'>('todas');
  const [alunosSemFicha, setAlunosSemFicha] = useState<AlunoSemFicha[]>([]);

  // Stats
  const [fichasAtivas, setFichasAtivas] = useState(0);
  const [fichasCriadasMes, setFichasCriadasMes] = useState(0);
  const [alunosAtendidos, setAlunosAtendidos] = useState(0);
  const [treinosExecutados, setTreinosExecutados] = useState(0);

  const loadData = useCallback(async () => {
    setFetchingData(true);
    setError(null);
    try {
      const session = await getSafeSession();
      const coachId = session?.user?.id;
      if (!coachId) { setError('Sessão inválida'); setFetchingData(false); return; }

      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      const trintaDiasIso = trintaDiasAtras.toISOString();

      // Cada .from() do supabase-js é um HTTP request independente ao PostgREST
      // (JWT por request). Promise.all paraleliza round-trips reais; não compartilham
      // a mesma sessão Postgres — o pool (Supavisor) atende em paralelo.
      const listSelectWithCount =
        'id, aluno_id, nome_rotina, ativo, criado_em, exercicios_count';
      const listSelectLegacy =
        'id, aluno_id, nome_rotina, ativo, criado_em, configuracao';

      // Vínculos+perfis (embed) e listas por coach_id — tudo em paralelo
      const [linksResult, digitalPrimary, pdfResult] = await Promise.all([
        supabaseClient
          .from('coach_alunos')
          .select('aluno:profiles!aluno_id(id, coaching_reference, full_name, email, avatar_url, arquivado)')
          .eq('coach_id', coachId),
        supabaseClient
          .from('fichas_treino')
          .select(listSelectWithCount)
          .eq('coach_id', coachId)
          .order('criado_em', { ascending: false }),
        supabaseClient
          .from('treinos_alunos')
          .select('id, aluno_id, nome_arquivo, url_pdf, data_upload')
          .eq('coach_id', coachId)
          .order('data_upload', { ascending: false }),
      ]);

      if (linksResult.error) throw linksResult.error;
      if (pdfResult.error) throw pdfResult.error;

      const linkedProfiles = ((linksResult.data ?? []) as unknown as Array<{ aluno: (Aluno & { arquivado?: boolean | null }) | null }>)
        .map((r) => r.aluno)
        .filter((p): p is Aluno & { arquivado?: boolean | null } => Boolean(p));
      const ids = linkedProfiles.map((p) => p.id);

      if (ids.length === 0) {
        setAlunos([]);
        setFichas([]);
        setAlunosSemFicha([]);
        setFichasAtivas(0);
        setFichasCriadasMes(0);
        setAlunosAtendidos(0);
        setTreinosExecutados(0);
        setFetchingData(false);
        return;
      }

      // Fallback se a migration 0043 (coluna exercicios_count) ainda não foi aplicada
      let digitalData: Array<{
        id: string;
        aluno_id: string;
        nome_rotina: string;
        ativo: boolean;
        criado_em: string;
        exercicios_count?: number | null;
        configuracao?: { exercicios?: unknown[] } | null;
      }> = digitalPrimary.data || [];

      if (digitalPrimary.error) {
        const digitalFallback = await supabaseClient
          .from('fichas_treino')
          .select(listSelectLegacy)
          .eq('coach_id', coachId)
          .order('criado_em', { ascending: false });
        if (digitalFallback.error) throw digitalFallback.error;
        digitalData = digitalFallback.data || [];
      }

      const profilesList = linkedProfiles
        .filter((p) => !p.arquivado)
        .sort((a, b) => (a.coaching_reference || '').localeCompare(b.coaching_reference || '')) as Aluno[];
      setAlunos(profilesList);

      const pdfData = pdfResult.data || [];
      const digitalIds = digitalData.map((f) => f.id);

      // Contagem de execuções (30d) + última execução por ficha em paralelo
      const [executionsResult, execListResult] = await Promise.all([
        supabaseClient
          .from('historico_treinos')
          .select('id', { count: 'exact', head: true })
          .in('aluno_id', ids)
          .gte('data_conclusao', trintaDiasIso),
        digitalIds.length > 0
          ? supabaseClient
              .from('historico_treinos')
              .select('ficha_id, data_conclusao')
              .in('ficha_id', digitalIds)
              .order('data_conclusao', { ascending: false })
              .limit(2000)
          : Promise.resolve({ data: null as null }),
      ]);

      const lastExecByFicha = new Map<string, string>();
      (execListResult.data || []).forEach((row: { ficha_id: string | null; data_conclusao: string }) => {
        if (row.ficha_id && !lastExecByFicha.has(row.ficha_id)) {
          lastExecByFicha.set(row.ficha_id, row.data_conclusao);
        }
      });

      const combinedRoutines: WorkoutPlan[] = [];
      let activeCount = 0;
      let monthCreatedCount = 0;
      const uniqueStudentsActive = new Set<string>();
      const profilesById = new Map(profilesList.map((p) => [p.id, p]));

      digitalData.forEach((f) => {
        const student = profilesById.get(f.aluno_id);
        const exCount =
          typeof f.exercicios_count === 'number'
            ? f.exercicios_count
            : f.configuracao?.exercicios?.length || 0;

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
          aluno_email: student?.email ?? null,
          aluno_avatar_url: student?.avatar_url ?? null,
          nome_rotina: f.nome_rotina,
          ativo: f.ativo,
          criado_em: f.criado_em,
          tipo: 'digital',
          exercicios_count: exCount,
          ultima_execucao: lastExecByFicha.get(f.id) ?? null,
          configuracao: null,
        });
      });

      pdfData.forEach((p) => {
        const student = profilesById.get(p.aluno_id);
        const createdDate = new Date(p.data_upload);
        if (createdDate >= trintaDiasAtras) {
          monthCreatedCount++;
        }

        uniqueStudentsActive.add(p.aluno_id);

        combinedRoutines.push({
          id: p.id,
          aluno_id: p.aluno_id,
          aluno_nome: student?.coaching_reference || student?.full_name || student?.email || 'Atleta',
          aluno_email: student?.email ?? null,
          aluno_avatar_url: student?.avatar_url ?? null,
          nome_rotina: p.nome_arquivo || 'Plano de Treino PDF',
          ativo: true,
          criado_em: p.data_upload,
          tipo: 'pdf',
          exercicios_count: 0,
          pdf_url: p.url_pdf,
          ultima_execucao: null,
        });
      });

      combinedRoutines.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
      setFichas(combinedRoutines);

      setFichasAtivas(activeCount);
      setFichasCriadasMes(monthCreatedCount);
      setAlunosAtendidos(uniqueStudentsActive.size);
      setTreinosExecutados(executionsResult.count || 0);

      setAlunosSemFicha(profilesList.filter((p) => !uniqueStudentsActive.has(p.id)));

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
      const coachId = (await getSafeSession())?.user?.id;
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

  const handleDeleteRoutine = async (item: WorkoutPlan) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Sessão inválida');

      const res = await fetch('/api/admin/treinos/plan', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: item.id,
          tipo: item.tipo,
          pdf_url: item.pdf_url ?? null,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'Erro ao remover planejamento');
      }

      await loadData();
      setSuccess('Planejamento removido com sucesso.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Erro ao remover: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
      setDeleteTarget(null);
    }
  };

  const handleResetFilters = () => {
    setQuery('');
    setStatusFilter('todas');
  };

  const handleViewWorkout = async (plan: WorkoutPlan) => {
    if (plan.tipo !== 'digital') {
      setSelectedRoutineForPreview(plan);
      return;
    }

    setSelectedRoutineForPreview(plan);
    setPreviewLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('fichas_treino')
        .select('configuracao')
        .eq('id', plan.id)
        .single();
      if (error) throw error;
      setSelectedRoutineForPreview({
        ...plan,
        configuracao: data?.configuracao ?? null,
      });
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar preview da ficha');
    } finally {
      setPreviewLoading(false);
    }
  };
  const handleEditWorkout = (plan: WorkoutPlan) =>
    router.push(
      withReturnUrl(
        `/admin/aluno/${plan.aluno_id}/ficha/${plan.id}`,
        "/admin/treinos",
      ),
    );

  // Filter in-memory routines
  const processedRoutines = fichas.filter(f => {
    const matchesSearch =
      textIncludes(f.aluno_nome, query) ||
      textIncludes(f.nome_rotina, query);
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
      <div className="w-full max-w-[min(1600px,96vw)] mx-auto flex flex-col gap-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 py-4 border-b border-divider">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => router.push('/admin/treinos/nova-ficha')}
              className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-3 h-9 bg-brand hover:bg-brand/90 text-text-on-brand text-xs font-semibold rounded-lg transition-all active:scale-95 shadow-sm"
            >
              <PlusCircle size={14} weight="bold" /> Nova Ficha Digital
            </button>
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5">
              <button
                onClick={() => setShowPdfUpload(!showPdfUpload)}
                className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-3 h-9 bg-surface-2 border-0 hover:bg-surface-3 text-text-primary text-xs font-semibold rounded-lg transition-all active:scale-95"
              >
                <FileArrowUp size={14} /> Upload de PDF
              </button>
              <Link
                href="/admin/biblioteca-exercicios"
                className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-3 h-9 bg-surface-2 border-0 hover:bg-surface-3 text-text-primary text-xs font-semibold rounded-lg transition-all"
              >
                <BookOpen size={14} /> Biblioteca
              </Link>
            </div>
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
          <div className="bg-surface-1 border-0 rounded-xl p-12 text-center max-w-lg mx-auto shadow-sm">
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
                <div key={label} className="bg-surface-1 rounded-lg p-4 border-0 shadow-sm flex flex-col justify-center h-20">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{label}</span>
                  </div>
                  <span className="text-xl font-bold tracking-tight text-text-primary mt-1.5 font-mono tabular-nums lining-nums leading-none">{value}</span>
                </div>
              ))}
            </div>

            {/* ── Main Workspace — full width ── */}
            <div className="flex flex-col gap-6">

              {/* Inline PDF Upload Form */}
              {showPdfUpload && (
                <Card className="rounded-xl border-0 p-4 bg-surface-1 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-divider">
                    <div className="flex items-center gap-2">
                      <FileArrowUp size={16} className="text-brand" />
                    </div>
                    <button onClick={() => { setShowPdfUpload(false); setSelectedFile(null); }} className="text-[10px] text-text-tertiary hover:text-text-primary font-bold uppercase">
                      Cancelar
                    </button>
                  </div>

                  <form onSubmit={handleUpload} className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="flex-1 min-w-0">
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
                    </div>

                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
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
                            <p className="text-xs text-text-primary font-bold truncate max-w-[200px]">{selectedFile.name}</p>
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
                      size="sm"
                      className="h-10 rounded-lg text-xs shrink-0 w-full sm:w-auto"
                    >
                      Enviar PDF
                    </Button>
                  </form>
                </Card>
              )}

              {/* Search & Filters */}
              <div className="bg-surface-1 border-0 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <div className="relative w-full sm:max-w-xs">
                    <MagnifyingGlass
                      size={12}
                      className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--filter-placeholder)]"
                    />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar por rotina ou aluno..."
                      aria-label="Buscar treinos"
                      style={{ touchAction: "manipulation" }}
                      className="filter-control filter-control-search filter-control-compact w-full shadow-sm"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-surface-2 border-0 rounded-lg p-1">
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
                      className="p-2 bg-surface-2 hover:bg-surface-3 border-0 text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                      title="Resetar busca"
                    >
                      <ArrowCounterClockwise size={13} />
                    </button>
                  </div>
                </div>

              {/* Table / Mobile cards */}
              <div className="bg-surface-1 border-0 rounded-xl overflow-hidden shadow-sm">
                {processedRoutines.length === 0 ? (
                  <WorkoutsEmptyState />
                ) : isMobile ? (
                  <WorkoutsMobileList
                    plans={processedRoutines}
                    onView={handleViewWorkout}
                    onEdit={handleEditWorkout}
                    onDelete={setDeleteTarget}
                  />
                ) : (
                  <WorkoutsTable
                    plans={processedRoutines}
                    onView={handleViewWorkout}
                    onEdit={handleEditWorkout}
                    onDelete={setDeleteTarget}
                  />
                )}
              </div>

              <StudentsWithoutWorkoutAlert
                students={alunosSemFicha}
                onAssignWorkout={(alunoId) =>
                  router.push(
                    withReturnUrl(
                      `/admin/treinos/nova-ficha?alunoId=${alunoId}`,
                      "/admin/treinos",
                    ),
                  )
                }
              />

            </div>

          </div>
        )}

      </div>

      {deleteTarget && (
        <DeleteWorkoutModal
          plan={deleteTarget}
          loading={loading}
          onConfirm={() => handleDeleteRoutine(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Simplified Routine Preview Modal */}
      {selectedRoutineForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="bg-surface-1 border-0 rounded-3xl w-full max-w-lg overflow-hidden shadow-elev-3 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-divider flex justify-between items-center bg-surface-2/40">
              <div>
                <span className="text-[9px] uppercase font-bold text-brand tracking-wider bg-brand/10 px-2 py-0.5 rounded border border-brand/20">Ficha Digital</span>
                <h3 className="text-sm font-bold text-text-primary mt-2 uppercase">{selectedRoutineForPreview.nome_rotina}</h3>
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
              {previewLoading ? (
                <div className="flex justify-center py-8">
                  <DumbbellLoader text="Carregando exercícios..." variant="inline" />
                </div>
              ) : (() => {
                const exercises = selectedRoutineForPreview.configuracao?.exercicios || [];
                if (exercises.length === 0) {
                  return <p className="text-xs text-text-tertiary text-center py-4">Nenhum exercício cadastrado nesta ficha.</p>;
                }
                return exercises.map((ex: any, idx: number) => (
                  <div key={idx} className="p-4 bg-surface-1 border-0 rounded-xl space-y-2">
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
                    <div className="pt-2 border-t border-divider/40 space-y-1.5">
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
            <div className="p-4 border-t border-divider bg-surface-2/40 flex justify-end">
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
