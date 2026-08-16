'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import {
  FileArrowUp, Trash, MagnifyingGlass, User, Info, PlusCircle, AppleLogo
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { cn } from '@/lib/utils/cn';
import { withReturnUrl } from '@/lib/utils/adminNav';
import { AiDietUpgradeBanner } from '@/app/components/nutrition/AiDietUpgradeBanner';
import { planHasAiDiet } from '@/lib/subscriptions/plans';

interface Aluno {
  id: string;
  coaching_reference: string | null;
  email: string | null;
  full_name?: string | null;
}

interface StudentNutritionStat {
  id: string;
  name: string;
  email: string | null;
  planName: string;
  todayMeals: string;
  adherence7d: number;
  lastCheckin: string;
  status: 'em-dia' | 'atencao' | 'sem-checkin' | 'sem-plano';
  planId?: string;
}

export default function NutricaoPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [studentNutritionList, setStudentNutritionList] = useState<StudentNutritionStat[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Search and filters
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [showPdfUpload, setShowPdfUpload] = useState(false);
  const [showAiUpgrade, setShowAiUpgrade] = useState(false);



  const fetchPlansAndAlunos = useCallback(async () => {
    try {
      const session = await getSafeSession();
      const coachId = session?.user?.id;
      if (!coachId) {
        setError('SessÃ£o invÃ¡lida. FaÃ§a login novamente.');
        setFetchingData(false);
        return;
      }

      const { data: coachProfile } = await supabaseClient
        .from('profiles')
        .select('plan_tier, role')
        .eq('id', coachId)
        .maybeSingle();
      setShowAiUpgrade(
        coachProfile?.role !== 'super_admin' && !planHasAiDiet(coachProfile?.plan_tier),
      );

      // EstÃ¡gio 1 em paralelo: vÃ­nculos + planos digitais
      const [
        { data: alunoLinks, error: linkError },
        { data: digitalPlansData, error: digitalPlansError },
      ] = await Promise.all([
        supabaseClient
          .from('coach_alunos')
          .select('aluno_id')
          .eq('coach_id', coachId),
        supabaseClient
          .from('nutrition_plans')
          .select('id, student_id, name, goal, status, created_at, calories_target, days:nutrition_plan_days(meals:nutrition_meals(id))')
          .eq('coach_id', coachId)
          .order('created_at', { ascending: false }),
      ]);

      if (linkError) throw linkError;
      if (digitalPlansError) throw digitalPlansError;

      const ids = alunoLinks?.map(link => link.aluno_id) || [];
      if (ids.length === 0) {
        setAlunos([]);
        setStudentNutritionList([]);
        setFetchingData(false);
        return;
      }

      // EstÃ¡gio 2 em paralelo: perfis + check-ins dos alunos
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const [
        { data: profilesData, error: profilesError },
        { data: allCheckins },
      ] = await Promise.all([
        supabaseClient
          .from('profiles')
          .select('id, coaching_reference, email, full_name')
          .in('id', ids)
          .eq('arquivado', false)
          .order('coaching_reference', { ascending: true }),
        supabaseClient
          .from('nutrition_meal_checkins')
          .select('*')
          .in('student_id', ids)
          .gte('checkin_date', sevenDaysAgo.toISOString().slice(0, 10)),
      ]);

      if (profilesError) throw profilesError;
      setAlunos(profilesData || []);

      const todayISO = new Date().toISOString().slice(0, 10);

      // Map profiles/students to their nutrition stats
      const mappedList: StudentNutritionStat[] = (profilesData || []).map((profile: any) => {
        const activePlan = (digitalPlansData || []).find(p => p.student_id === profile.id && p.status === 'active');
        
        if (!activePlan) {
          return {
            id: profile.id,
            name: profile.coaching_reference || profile.full_name || 'Atleta',
            email: profile.email,
            planName: 'Sem plano',
            todayMeals: '0/0',
            adherence7d: 0,
            lastCheckin: '—',
            status: 'sem-plano'
          };
        }

        const mealsList = activePlan.days?.[0]?.meals || [];
        const mealsCount = mealsList.length;

        const studentCheckins = (allCheckins || []).filter(c => c.student_id === profile.id);
        const todayCheckins = studentCheckins.filter(c => c.checkin_date === todayISO);
        
        let todayCompleted = 0;
        todayCheckins.forEach(c => {
          if (c.status === 'done' || c.status === 'substituted') todayCompleted++;
        });

        // 7 days adherence
        const expectedMeals = mealsCount * 7;
        let weightSum = 0;
        studentCheckins.forEach(c => {
          if (c.status === 'done' || c.status === 'substituted') weightSum += 1.0;
          else if (c.status === 'partial') weightSum += 0.5;
        });

        const adherence7d = expectedMeals > 0 ? Math.min(100, Math.round((weightSum / expectedMeals) * 100)) : 0;

        // Last checkin date
        let lastCheckinStr = '—';
        if (studentCheckins.length > 0) {
          const dates = studentCheckins.map(c => new Date(c.checkin_date).getTime());
          const maxDate = new Date(Math.max(...dates));
          lastCheckinStr = maxDate.toLocaleDateString('pt-BR');
        }

        // Status logic
        let status: 'em-dia' | 'atencao' | 'sem-checkin' | 'sem-plano' = 'em-dia';
        if (studentCheckins.length === 0) {
          status = 'sem-checkin';
        } else if (adherence7d < 60) {
          status = 'atencao';
        }

        return {
          id: profile.id,
          name: profile.coaching_reference || profile.full_name || 'Atleta',
          email: profile.email,
          planName: activePlan.name,
          todayMeals: `${todayCompleted}/${mealsCount}`,
          adherence7d,
          lastCheckin: lastCheckinStr,
          status,
          planId: activePlan.id
        };
      });

      setStudentNutritionList(mappedList);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar dados: ' + (err.message || 'Erro de conexÃ£o'));
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
    if (file.size > 50 * 1024 * 1024) { setError('Arquivo muito grande. MÃ¡ximo 50MB'); return; }
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
      if (!session) { setError('SessÃ£o invÃ¡lida'); return; }

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
      fetchPlansAndAlunos();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Erro ao realizar upload: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };



  // Calculate digital nutrition metrics
  const activeDigPlansCount = studentNutritionList.filter(s => s.planName !== 'Sem plano').length;
  const studentsWithoutPlan = studentNutritionList.filter(s => s.planName === 'Sem plano').length;
  const lowAdherenceCount = studentNutritionList.filter(s => s.planName !== 'Sem plano' && s.adherence7d < 70).length;

  const totalAdherenceSum = studentNutritionList
    .filter(s => s.planName !== 'Sem plano')
    .reduce((sum, s) => sum + s.adherence7d, 0);
  const avgAdherence = activeDigPlansCount > 0 ? Math.round(totalAdherenceSum / activeDigPlansCount) : 0;

  /** AdesÃ£o: baixo vermelho â†’ mÃ©dio amarelo â†’ alto verde (mesmo padrÃ£o dos RelatÃ³rios) */
  const adesaoColorClass =
    avgAdherence > 80
      ? 'text-success'
      : avgAdherence > 33
        ? 'text-warning'
        : 'text-danger';
  const adesaoDotClass =
    avgAdherence > 80
      ? 'bg-success'
      : avgAdherence > 33
        ? 'bg-warning'
        : 'bg-danger';

  const filteredStudents = studentNutritionList.filter((student) => {
    const q = studentSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      student.name.toLowerCase().includes(q) ||
      student.planName.toLowerCase().includes(q)
    );
  });

  if (fetchingData) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-10 lg:pl-8 pb-28">
      <div className="w-full max-w-[min(1600px,96vw)] mx-auto">
          <div className="flex flex-col gap-5">
            {/* Título no topo */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h1 className="text-lg font-bold text-text-primary tracking-tight">Nutrição</h1>
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 w-full sm:w-auto">
                <Link
                  href={withReturnUrl('/admin/nutricao/novo-plano', '/admin/nutricao')}
                  className="btn-primary inline-flex items-center justify-center gap-1.5 w-full sm:!w-auto px-3 h-9 !min-h-0 text-xs font-semibold rounded-lg !py-0"
                >
                  <PlusCircle size={14} weight="bold" /> Criar Plano Digital
                </Link>
                <button
                  type="button"
                  onClick={() => setShowPdfUpload((v) => !v)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-3 h-9 border-0 text-xs font-semibold rounded-lg transition-all active:scale-95",
                    showPdfUpload
                      ? "bg-brand/15 text-brand"
                      : "bg-surface-2 hover:bg-surface-3 text-text-primary"
                  )}
                >
                  <FileArrowUp size={14} /> Upload de PDF
                </button>
              </div>
            </div>

            {showAiUpgrade && <AiDietUpgradeBanner />}

            {error && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-danger-subtle border border-danger-border text-danger text-xs font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0 animate-pulse" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-success-subtle border border-success-border text-success text-xs font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
                {success}
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="coach-list-kpi-card px-4 pb-3.5 pt-2.5 bg-surface-1 border border-border-subtle shadow-sm rounded-xl flex flex-col justify-center min-h-[4.75rem] h-auto">
                <div className="flex items-center gap-1.5 leading-none relative group">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-brand" />
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-text-tertiary">Planos digitais ativos</span>
                  <Info size={11} className="text-text-disabled hover:text-brand transition-colors cursor-help shrink-0" />
                  <div className="absolute bottom-full mb-2 left-0 w-56 bg-surface-1 border-0 p-2.5 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-20">
                    <p className="text-[10px] text-text-secondary leading-normal normal-case font-medium">
                      Quantidade de alunos que possuem um plano digital atualmente com o status <strong className="text-text-primary">Ativo</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold text-text-primary font-mono tabular-nums lining-nums leading-none">{activeDigPlansCount}</span>
                  <span className="text-[10px] text-text-secondary">ativo{activeDigPlansCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="coach-list-kpi-card px-4 pb-3.5 pt-2.5 bg-surface-1 border border-border-subtle shadow-sm rounded-xl flex flex-col justify-center min-h-[4.75rem] h-auto">
                <div className="flex items-center gap-1.5 leading-none relative group">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', adesaoDotClass)} />
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-text-tertiary">Adesão Média</span>
                  <Info size={11} className={cn('text-text-disabled transition-colors cursor-help shrink-0 hover:opacity-80', adesaoColorClass)} />
                  <div className="absolute bottom-full mb-2 left-0 w-56 bg-surface-1 border-0 p-2.5 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-20">
                    <p className="text-[10px] text-text-secondary leading-normal normal-case font-medium">
                      Média de check-ins marcados como <strong className="text-success">Feito</strong> nos últimos 7 dias pelos alunos que possuem plano digital ativo.
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={cn('text-xl font-bold font-mono tabular-nums lining-nums leading-none', adesaoColorClass)}>{avgAdherence}%</span>
                  <span className="text-[10px] text-text-secondary">adesão à dieta</span>
                </div>
              </div>

              <div className="coach-list-kpi-card px-4 pb-3.5 pt-2.5 bg-surface-1 border border-border-subtle shadow-sm rounded-xl flex flex-col justify-center min-h-[4.75rem] h-auto">
                <div className="flex items-center gap-1.5 leading-none relative group">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-warning" />
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-text-tertiary">Alunos sem plano</span>
                  <Info size={11} className="text-text-disabled hover:text-warning transition-colors cursor-help shrink-0" />
                  <div className="absolute bottom-full mb-2 left-0 w-56 bg-surface-1 border-0 p-2.5 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-20">
                    <p className="text-[10px] text-text-secondary leading-normal normal-case font-medium">
                      Número de alunos ativos que não possuem nenhum plano digital prescrito (<strong className="text-text-primary">Ativo</strong> ou <strong className="text-text-primary">Rascunho</strong>).
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold text-text-primary font-mono tabular-nums lining-nums leading-none">{studentsWithoutPlan}</span>
                  <span className="text-[10px] text-text-secondary">aluno{studentsWithoutPlan !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div
                className={cn(
                  "coach-list-kpi-card px-4 pb-3.5 pt-2.5 shadow-sm rounded-xl flex flex-col justify-center min-h-[4.75rem] h-auto border",
                  lowAdherenceCount >= 1
                    ? "bg-danger-subtle border-danger-border"
                    : "bg-surface-1 border-border-subtle"
                )}
              >
                <div className="flex items-center gap-1.5 leading-none relative group">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-danger" />
                  <span
                    className={cn(
                      "text-[10px] uppercase font-semibold tracking-wider",
                      lowAdherenceCount >= 1 ? "text-danger" : "text-text-tertiary"
                    )}
                  >
                    Baixa Adesão
                  </span>
                  <Info
                    size={11}
                    className={cn(
                      "transition-colors cursor-help shrink-0",
                      lowAdherenceCount >= 1
                        ? "text-danger/70 hover:text-danger"
                        : "text-text-disabled hover:text-danger"
                    )}
                  />
                  <div className="absolute bottom-full mb-2 right-0 lg:left-0 lg:right-auto w-56 bg-surface-1 border-0 p-2.5 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-20">
                    <p className="text-[10px] text-text-secondary leading-normal normal-case font-medium">
                      Alunos ativos cuja taxa de cumprimento alimentar média nos últimos 7 dias é inferior a <strong className="text-danger">70%</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span
                    className={cn(
                      "text-xl font-bold font-mono tabular-nums lining-nums leading-none",
                      lowAdherenceCount >= 1 ? "text-danger" : "text-text-primary"
                    )}
                  >
                    {lowAdherenceCount}
                  </span>
                  <span
                    className={cn(
                      "text-[10px]",
                      lowAdherenceCount >= 1 ? "text-danger/80" : "text-text-secondary"
                    )}
                  >
                    aluno{lowAdherenceCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Lista — cards no padrão do perfil do aluno */}
            <div className="nutricao-acompanhamento-panel flex flex-col gap-3">
              <div className="field-flat-input bg-surface-1 border-0 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="relative w-full pl-6">
                    <MagnifyingGlass
                      size={14}
                      className="pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2 text-text-disabled"
                    />
                    <input
                      type="search"
                      placeholder="Buscar aluno ou plano..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      aria-label="Buscar alunos na nutrição"
                      style={{ touchAction: 'manipulation' }}
                      className="w-full bg-transparent border-0 outline-none shadow-none text-sm text-text-primary placeholder:text-text-disabled"
                    />
                  </div>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="text-center py-10 rounded-xl bg-surface-1 shadow-sm">
                  <User size={24} className="text-text-disabled mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-text-secondary">
                    {studentSearchQuery ? 'Nenhum aluno corresponde' : 'Nenhum aluno vinculado'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredStudents.map((student) => {
                    const statusLabels = {
                      'em-dia': 'Em dia',
                      'atencao': 'Atenção',
                      'sem-checkin': 'Sem check-in',
                      'sem-plano': 'Sem plano',
                    } as const;
                    const statusColors = {
                      'em-dia': 'bg-success/15 text-success',
                      'atencao': 'bg-warning/15 text-warning',
                      'sem-checkin': 'bg-danger/15 text-danger',
                      'sem-plano': 'bg-surface-2 text-text-tertiary',
                    } as const;
                    const temPlano = student.planName !== 'Sem plano';
                    const adesaoAlunoClass =
                      !temPlano
                        ? 'text-text-tertiary'
                        : student.adherence7d > 80
                          ? 'text-success'
                          : student.adherence7d > 33
                            ? 'text-warning'
                            : 'text-danger';

                    return (
                      <div
                        key={student.id}
                        className="relative rounded-xl border-0 bg-surface-1 shadow-sm overflow-hidden"
                      >
                        <div className="flex items-start gap-3 px-4 py-3.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center text-brand">
                            <AppleLogo size={18} weight="bold" />
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-text-primary truncate leading-tight">
                                {student.name}
                              </p>
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                                  statusColors[student.status],
                                )}
                              >
                                <span
                                  className={cn(
                                    'w-1.5 h-1.5 rounded-full',
                                    student.status === 'em-dia' && 'bg-success',
                                    student.status === 'atencao' && 'bg-warning',
                                    student.status === 'sem-checkin' && 'bg-danger',
                                    student.status === 'sem-plano' && 'bg-text-tertiary',
                                  )}
                                />
                                {statusLabels[student.status]}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-text-tertiary truncate">
                              {student.planName}
                              {temPlano ? ` · ${student.todayMeals} hoje` : ''}
                              {student.lastCheckin ? ` · ${student.lastCheckin}` : ''}
                            </p>
                            {temPlano && (
                              <p className={cn('mt-1 text-[11px] font-bold font-mono tabular-nums lining-nums', adesaoAlunoClass)}>
                                Adesão 7d · {student.adherence7d}%
                              </p>
                            )}
                          </div>
                          <Link
                            href={
                              student.planId
                                ? withReturnUrl(
                                    `/admin/nutricao/planos/${student.planId}`,
                                    '/admin/nutricao',
                                  )
                                : withReturnUrl(
                                    '/admin/nutricao/novo-plano',
                                    '/admin/nutricao',
                                  )
                            }
                            className="mt-2.5 shrink-0 text-[11px] font-semibold text-brand hover:text-brand-hover transition-colors whitespace-nowrap"
                          >
                            {student.planId ? 'Ver plano' : 'Prescrever'}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {showPdfUpload && (
              <Card className="rounded-xl border-0 p-4 bg-surface-1 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-border-divider/40">
                  <div className="flex items-center gap-2">
                    <FileArrowUp size={16} className="text-brand" />
                    <span className="text-xs font-semibold text-text-primary">Enviar plano por PDF</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowPdfUpload(false); setSelectedFile(null); }}
                    className="text-[10px] text-text-tertiary hover:text-text-primary font-bold uppercase"
                  >
                    Cancelar
                  </button>
                </div>

                <form onSubmit={handleUpload} className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex-1 min-w-0">
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
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary ml-0.5">Descrição</label>
                    <textarea
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Ex: Dieta bulking, 3200 kcal"
                      disabled={loading}
                      maxLength={200}
                      rows={2}
                      className="w-full px-3 py-2 bg-surface-2 border-0 rounded-lg text-text-primary text-xs placeholder:text-text-disabled focus:outline-none focus:ring-1 focus:ring-brand/30 resize-none disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary ml-0.5">Arquivo PDF</label>
                    {!selectedFile ? (
                        <label className="flex flex-col items-center justify-center h-20 border border-dashed border-brand/30 rounded-lg bg-surface-2 hover:bg-brand/5 hover:border-brand/40 transition-all cursor-pointer group">
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
                    className="h-10 rounded-lg text-xs shrink-0 w-full sm:w-auto bg-brand text-text-on-brand hover:bg-brand-hover border-0 shadow-none"
                  >
                    Protocolar Plano
                  </Button>
                </form>
              </Card>
            )}
          </div>
      </div>
    </div>
  );
}
