'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { 
  FileArrowUp, CircleNotch, Trash, FileText, 
  FilePdf, Eye, MagnifyingGlass, User, Info, CheckCircle, PencilSimple, AppleLogo, Clock
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { MobileListRow } from '@/app/components/MobileListRow';
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
  url_pdf?: string;
  tipo: 'pdf' | 'digital';
  status?: string;
  calories_target?: number | null;
  aluno_ref?: string;
  aluno_email?: string;
  aluno_nome?: string;
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
  const router = useRouter();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [planos, setPlanos] = useState<PlanoAlimentar[]>([]);
  const [studentNutritionList, setStudentNutritionList] = useState<StudentNutritionStat[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'pdf' | 'digital' | 'templates'>('todos');

  // Template action states
  const [showUseTemplateModal, setShowUseTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [useTemplateStudentId, setUseTemplateStudentId] = useState('');
  const [useTemplatePlanName, setUseTemplatePlanName] = useState('');
  const [useTemplateLoading, setUseTemplateLoading] = useState(false);

  const handleUseTemplate = async () => {
    if (!useTemplateStudentId || !selectedTemplate) return;
    setUseTemplateLoading(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const resDetails = await fetch(`/api/admin/nutricao/plans/${selectedTemplate.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const dataDetails = await resDetails.json();
      if (!resDetails.ok) throw new Error(dataDetails.error || 'Erro ao carregar detalhes do template');
      const tempPlan = dataDetails.plan;

      const clonedMeals = tempPlan.days?.[0]?.meals?.map((m: any) => {
        const clonedMeal = {
          meal_type: m.meal_type,
          title: m.title,
          time_suggestion: m.time_suggestion,
          notes: m.notes,
          sort_order: m.sort_order,
          items: m.items?.map((item: any) => ({
            food_id: item.food_id,
            quantity_grams: item.quantity_grams,
            portion_label: item.portion_label,
            notes: item.notes,
            sort_order: item.sort_order,
            substitutions: item.substitutions?.map((sub: any) => ({
              substitute_food_id: sub.substitute_food_id,
              quantity_grams: sub.quantity_grams,
              portion_label: sub.portion_label,
              notes: sub.notes
            }))
          }))
        };
        return clonedMeal;
      }) || [];

      const payload = {
        plan: {
          student_id: useTemplateStudentId,
          name: useTemplatePlanName || tempPlan.name.replace('Template: ', ''),
          goal: tempPlan.goal,
          notes: tempPlan.notes,
          calories_target: tempPlan.calories_target,
          protein_target: tempPlan.protein_target,
          carbs_target: tempPlan.carbs_target,
          fat_target: tempPlan.fat_target,
          status: 'draft'
        },
        meals: clonedMeals
      };

      const resCreate = await fetch('/api/admin/nutricao/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const resultCreate = await resCreate.json();
      if (!resCreate.ok) throw new Error(resultCreate.error || 'Erro ao criar plano a partir do template');

      alert('Plano alimentar criado com sucesso! Redirecionando para edição...');
      router.push(`/admin/nutricao/planos/${resultCreate.planId}/editar`);
    } catch (err: any) {
      alert(err.message || 'Erro ao criar plano');
    } finally {
      setUseTemplateLoading(false);
      setShowUseTemplateModal(false);
      setSelectedTemplate(null);
    }
  };

  const fetchPlansAndAlunos = useCallback(async () => {
    try {
      const session = await getSafeSession();
      const coachId = session?.user?.id;
      if (!coachId) {
        setError('Sessão inválida. Faça login novamente.');
        setFetchingData(false);
        return;
      }

      // Estágio 1 em paralelo: vínculos + tudo que filtra por coach_id
      const [
        { data: alunoLinks, error: linkError },
        { data: plansData, error: plansError },
        { data: digitalPlansData, error: digitalPlansError },
      ] = await Promise.all([
        supabaseClient
          .from('coach_alunos')
          .select('aluno_id')
          .eq('coach_id', coachId),
        supabaseClient
          .from('plano_alimentar_pdf')
          .select('id, aluno_id, nome_arquivo, descricao, criado_em, url_pdf')
          .eq('coach_id', coachId)
          .order('criado_em', { ascending: false }),
        supabaseClient
          .from('nutrition_plans')
          .select('id, student_id, name, goal, status, created_at, calories_target, days:nutrition_plan_days(meals:nutrition_meals(id))')
          .eq('coach_id', coachId)
          .order('created_at', { ascending: false }),
      ]);

      if (linkError) throw linkError;
      if (plansError) throw plansError;
      if (digitalPlansError) throw digitalPlansError;

      const ids = alunoLinks?.map(link => link.aluno_id) || [];
      if (ids.length === 0) {
        setAlunos([]);
        setPlanos([]);
        setStudentNutritionList([]);
        setFetchingData(false);
        return;
      }

      // Estágio 2 em paralelo: perfis + check-ins dos alunos
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

      const mappedPdfPlans = (plansData || []).map((plan: any) => {
        const student = (profilesData || []).find(p => p.id === plan.aluno_id);
        return {
          id: plan.id,
          aluno_id: plan.aluno_id,
          nome_arquivo: plan.nome_arquivo,
          descricao: plan.descricao,
          criado_em: plan.criado_em,
          url_pdf: plan.url_pdf,
          tipo: 'pdf' as const,
          aluno_ref: student?.coaching_reference || '',
          aluno_email: student?.email || '',
          aluno_nome: student?.full_name || '',
        };
      });

      const mappedDigitalPlans = (digitalPlansData || []).map((plan: any) => {
        const student = (profilesData || []).find(p => p.id === plan.student_id);
        return {
          id: plan.id,
          aluno_id: plan.student_id,
          nome_arquivo: `${plan.name}.json`,
          descricao: plan.goal || `Meta: ${plan.calories_target ? plan.calories_target + ' kcal' : 'Não definida'}`,
          criado_em: plan.created_at,
          tipo: 'digital' as const,
          status: plan.status,
          calories_target: plan.calories_target,
          aluno_ref: student?.coaching_reference || '',
          aluno_email: student?.email || '',
          aluno_nome: student?.full_name || '',
        };
      });

      const combined = [...mappedPdfPlans, ...mappedDigitalPlans].sort(
        (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
      );

      setPlanos(combined);
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
      fetchPlansAndAlunos();
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

  const handleDeletePlan = async (planId: string, urlPdf?: string, tipo?: 'pdf' | 'digital') => {
    if (!confirm('Deseja realmente excluir este plano alimentar?')) return;
    try {
      setError(null);
      
      if (tipo === 'digital') {
        const { error } = await supabaseClient
          .from('nutrition_plans')
          .delete()
          .eq('id', planId);
        if (error) throw error;
      } else {
        if (urlPdf) {
          await supabaseClient.storage.from('plano_alimentar').remove([urlPdf]);
        }
        
        const { error } = await supabaseClient
          .from('plano_alimentar_pdf')
          .delete()
          .eq('id', planId);

        if (error) throw error;
      }

      setSuccess('Plano deletado com sucesso!');
      fetchPlansAndAlunos();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Erro ao deletar: ' + (err.message || 'Erro desconhecido'));
    }
  };

  // KPIs
  const totalStudents = alunos.length;
  
  // Calculate digital nutrition metrics
  const activeDigPlansCount = studentNutritionList.filter(s => s.planName !== 'Sem plano').length;
  const studentsWithoutPlan = studentNutritionList.filter(s => s.planName === 'Sem plano').length;
  const lowAdherenceCount = studentNutritionList.filter(s => s.planName !== 'Sem plano' && s.adherence7d < 60).length;

  const totalAdherenceSum = studentNutritionList
    .filter(s => s.planName !== 'Sem plano')
    .reduce((sum, s) => sum + s.adherence7d, 0);
  const avgAdherence = activeDigPlansCount > 0 ? Math.round(totalAdherenceSum / activeDigPlansCount) : 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Filter plans based on search query and active tab
  const filteredPlanos = planos.filter(plan => {
    const studentName = (plan.aluno_ref || plan.aluno_nome || '').toLowerCase();
    const studentEmail = (plan.aluno_email || '').toLowerCase();
    const planDesc = (plan.descricao || '').toLowerCase();
    const planFile = (plan.nome_arquivo || '').toLowerCase();
    
    const matchesSearch = 
      studentName.includes(searchQuery.toLowerCase()) ||
      studentEmail.includes(searchQuery.toLowerCase()) ||
      planDesc.includes(searchQuery.toLowerCase()) ||
      planFile.includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'pdf') return plan.tipo === 'pdf';
    if (activeTab === 'digital') return plan.tipo === 'digital' && plan.status !== 'template';
    if (activeTab === 'templates') return plan.tipo === 'digital' && plan.status === 'template';
    return plan.status !== 'template';
  });

  if (fetchingData) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-28">
      <div className="w-full max-w-[min(1600px,96vw)] mx-auto">
        <ScreenHeader
          title="Gestão de Nutrição"
          subtitle="Crie planos alimentares interativos digitais ou faça upload de PDFs para seus alunos"
        />

        <div className="px-4">
          <div className="flex flex-col gap-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-surface-1 border-0 shadow-sm rounded-lg flex flex-col justify-center h-20">
                <div className="flex items-center gap-1.5 leading-none relative group">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-brand" />
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-text-tertiary">Planos digitais ativos</span>
                  <Info size={11} className="text-text-disabled hover:text-brand transition-colors cursor-help shrink-0" />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-0 w-56 bg-surface-1 border-0 p-2.5 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-20">
                    <p className="text-[10px] text-text-secondary leading-normal normal-case font-medium">
                      Quantidade de alunos que possuem um plano digital atualmente com o status <strong className="text-text-primary">Ativo</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-xl font-bold text-text-primary font-mono tabular-nums lining-nums leading-none">{activeDigPlansCount}</span>
                  <span className="text-[10px] text-text-secondary">ativo{activeDigPlansCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="p-4 bg-surface-1 border-0 shadow-sm rounded-lg flex flex-col justify-center h-20">
                <div className="flex items-center gap-1.5 leading-none relative group">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-success" />
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-text-tertiary">Adesão Média</span>
                  <Info size={11} className="text-text-disabled hover:text-success transition-colors cursor-help shrink-0" />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-0 w-56 bg-surface-1 border-0 p-2.5 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-20">
                    <p className="text-[10px] text-text-secondary leading-normal normal-case font-medium">
                      Média de check-ins marcados como <strong className="text-success">Feito</strong> nos últimos 7 dias pelos alunos que possuem plano digital ativo.
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-xl font-bold text-text-primary font-mono tabular-nums lining-nums leading-none">{avgAdherence}%</span>
                  <span className="text-[10px] text-text-secondary">adesão à dieta</span>
                </div>
              </div>

              <div className="p-4 bg-surface-1 border-0 shadow-sm rounded-lg flex flex-col justify-center h-20">
                <div className="flex items-center gap-1.5 leading-none relative group">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-warning" />
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-text-tertiary">Alunos sem plano</span>
                  <Info size={11} className="text-text-disabled hover:text-warning transition-colors cursor-help shrink-0" />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-0 w-56 bg-surface-1 border-0 p-2.5 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-20">
                    <p className="text-[10px] text-text-secondary leading-normal normal-case font-medium">
                      Número de alunos ativos que não possuem nenhum plano digital prescrito (<strong className="text-text-primary">Ativo</strong> ou <strong className="text-text-primary">Rascunho</strong>).
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-xl font-bold text-text-primary font-mono tabular-nums lining-nums leading-none">{studentsWithoutPlan}</span>
                  <span className="text-[10px] text-text-secondary">aluno{studentsWithoutPlan !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="p-4 bg-surface-1 border-0 shadow-sm rounded-lg flex flex-col justify-center h-20">
                <div className="flex items-center gap-1.5 leading-none relative group">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-danger" />
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-text-tertiary">Baixa Adesão</span>
                  <Info size={11} className="text-text-disabled hover:text-danger transition-colors cursor-help shrink-0" />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 right-0 lg:left-0 lg:right-auto w-56 bg-surface-1 border-0 p-2.5 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-20">
                    <p className="text-[10px] text-text-secondary leading-normal normal-case font-medium">
                      Alunos ativos cuja taxa de cumprimento alimentar média nos últimos 7 dias é inferior a <strong className="text-danger">70%</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-xl font-bold text-text-primary font-mono tabular-nums lining-nums leading-none">{lowAdherenceCount}</span>
                  <span className="text-[10px] text-text-secondary">aluno{lowAdherenceCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Feedback Messages */}
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

            {/* Acompanhamento Alimentar Table (Section 7) */}
            <Card className="rounded-xl border-0 p-4 md:p-5">
              <div className="border-b border-divider/50 pb-2 mb-4">
                <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <AppleLogo size={14} className="text-brand" />
                  Acompanhamento Alimentar dos Alunos
                </h2>
                <p className="text-[10px] text-text-tertiary mt-0.5">Visão geral do engajamento e cumprimento das metas nutricionais prescritas</p>
              </div>

              {studentNutritionList.length === 0 ? (
                <p className="text-xs text-text-disabled text-center py-6">Nenhum aluno vinculado.</p>
              ) : (
                <>
                <div className="hidden md:block overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left border-collapse min-w-[600px] text-xs">
                    <thead>
                      <tr className="border-b border-divider">
                        <th className="pb-2 text-[10px] uppercase font-bold tracking-wider text-text-tertiary">Aluno</th>
                        <th className="pb-2 text-[10px] uppercase font-bold tracking-wider text-text-tertiary">Plano Ativo</th>
                        <th className="pb-2 text-[10px] uppercase font-bold tracking-wider text-text-tertiary">Refeições Hoje</th>
                        <th className="pb-2 text-[10px] uppercase font-bold tracking-wider text-text-tertiary">Adesão 7d</th>
                        <th className="pb-2 text-[10px] uppercase font-bold tracking-wider text-text-tertiary">Último Check-in</th>
                        <th className="pb-2 text-[10px] uppercase font-bold tracking-wider text-text-tertiary">Status</th>
                        <th className="pb-2 text-[10px] uppercase font-bold tracking-wider text-text-tertiary text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/40">
                      {studentNutritionList.map((student) => {
                        const statusLabels = {
                          'em-dia': 'Em dia',
                          'atencao': 'Atenção',
                          'sem-checkin': 'Sem check-in',
                          'sem-plano': 'Sem plano'
                        };
                        const statusColors = {
                          'em-dia': 'bg-success/10 text-success border-success/20',
                          'atencao': 'bg-warning/10 text-warning border-warning/20',
                          'sem-checkin': 'bg-danger/10 text-danger border-danger/20',
                          'sem-plano': 'bg-surface-3 text-text-tertiary border-transparent'
                        };

                        return (
                          <tr key={student.id} className="hover:bg-surface-2/30 transition-colors">
                            <td className="py-2.5 font-bold text-text-primary">{student.name}</td>
                            <td className="py-2.5 text-text-secondary">{student.planName}</td>
                            <td className="py-2.5 font-mono text-text-secondary">{student.todayMeals}</td>
                            <td className="py-2.5 font-mono font-bold text-text-secondary">{student.planName !== 'Sem plano' ? `${student.adherence7d}%` : '—'}</td>
                            <td className="py-2.5 text-text-secondary">{student.lastCheckin}</td>
                            <td className="py-2.5 relative group">
                               <span className={cn(
                                 "inline-flex px-1.5 py-0.5 border rounded text-[8px] font-bold uppercase tracking-wider cursor-help transition-all hover:scale-[1.03]",
                                 statusColors[student.status]
                               )}>
                                 {statusLabels[student.status]}
                               </span>
                               
                               {/* Status Tooltip */}
                               <div className="absolute bottom-full mb-1 right-0 w-56 bg-surface-1 border-0 p-2.5 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-20">
                                 <p className="text-[10px] text-text-secondary leading-normal normal-case font-medium">
                                   {student.status === 'em-dia' && (
                                     <>O aluno está com excelente cumprimento das refeições. Adesão superior a <strong className="text-success">80%</strong> nos últimos 7 dias.</>
                                   )}
                                   {student.status === 'atencao' && (
                                     <>O aluno precisa de acompanhamento. Adesão intermediária entre <strong className="text-warning">50% e 79%</strong> nos últimos 7 dias.</>
                                   )}
                                   {student.status === 'sem-checkin' && (
                                     <>Adesão crítica inferior a <strong className="text-danger">50%</strong> nos últimos 7 dias ou nenhuma refeição marcada.</>
                                   )}
                                   {student.status === 'sem-plano' && (
                                     <>Este aluno não possui nenhuma rotina alimentar digital ativa cadastrada.</>
                                   )}
                                 </p>
                               </div>
                             </td>
                            <td className="py-2.5 text-right">
                              {student.planId ? (
                                <Link href={`/admin/nutricao/planos/${student.planId}`}>
                                  <Button variant="secondary" size="sm" className="h-6.5 text-[9px] px-2 rounded-md border-0 cursor-pointer">
                                    Ver Plano
                                  </Button>
                                </Link>
                              ) : (
                                <Link href={`/admin/nutricao/novo-plano`}>
                                  <Button variant="secondary" size="sm" className="h-6.5 text-[9px] px-2 rounded-md border-0 cursor-pointer">
                                    Criar
                                  </Button>
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile — card list (Fase 7) */}
                <div className="md:hidden">
                  {studentNutritionList.map((student) => {
                    const statusLabels = {
                      'em-dia': 'Em dia',
                      'atencao': 'Atenção',
                      'sem-checkin': 'Sem check-in',
                      'sem-plano': 'Sem plano'
                    };
                    const statusColors = {
                      'em-dia': 'bg-success/10 text-success border-success/20',
                      'atencao': 'bg-warning/10 text-warning border-warning/20',
                      'sem-checkin': 'bg-danger/10 text-danger border-danger/20',
                      'sem-plano': 'bg-surface-3 text-text-tertiary border-transparent'
                    };
                    const temPlano = student.planName !== 'Sem plano';
                    return (
                      <MobileListRow
                        key={student.id}
                        name={student.name}
                        badge={
                          <span className={cn(
                            "inline-flex px-1.5 py-0.5 border rounded text-[8px] font-bold uppercase tracking-wider shrink-0",
                            statusColors[student.status]
                          )}>
                            {statusLabels[student.status]}
                          </span>
                        }
                        topRight={
                          <>
                            <span className="font-mono font-bold text-xs text-text-secondary">
                              {temPlano ? `${student.adherence7d}%` : '—'}
                            </span>
                            <Link
                              href={student.planId ? `/admin/nutricao/planos/${student.planId}` : `/admin/nutricao/novo-plano`}
                              className="text-[11px] font-medium text-brand whitespace-nowrap"
                            >
                              {student.planId ? 'Ver plano →' : 'Criar →'}
                            </Link>
                          </>
                        }
                        meta={
                          <>
                            <span className="truncate max-w-[45%]">{student.planName}</span>
                            <span className="text-text-tertiary">•</span>
                            <span className="font-mono">{student.todayMeals} hoje</span>
                            <span className="text-text-tertiary">•</span>
                            <span className="truncate">{student.lastCheckin}</span>
                          </>
                        }
                      />
                    );
                  })}
                </div>
                </>
              )}
            </Card>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Recent Plans list/table (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <Card className="rounded-xl border-0 shadow-sm p-4 md:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Histórico de Planos Enviados
                    </h2>
                    {/* Search query input */}
                    <div className="relative w-full sm:w-[280px]">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
                        <MagnifyingGlass size={14} />
                      </span>
                      <input
                        type="text"
                        placeholder="Buscar aluno ou plano..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 h-7.5 bg-surface-2 border border-input rounded-md text-2xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Tabs filter */}
                  <div className="flex gap-1 p-0.5 bg-surface-2 border-0 rounded-md h-8.5 w-max items-center mb-4">
                    <button
                      onClick={() => setActiveTab('todos')}
                      className={cn(
                        'px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all h-6.5 flex items-center justify-center whitespace-nowrap',
                        activeTab === 'todos' ? 'bg-surface-0 border-0 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                      )}
                    >
                      Todos ({planos.filter(p => p.status !== 'template').length})
                    </button>
                    <button
                      onClick={() => setActiveTab('pdf')}
                      className={cn(
                        'px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all h-6.5 flex items-center justify-center whitespace-nowrap',
                        activeTab === 'pdf' ? 'bg-surface-0 border-0 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                      )}
                    >
                      PDF ({planos.filter(p => p.tipo === 'pdf').length})
                    </button>
                    <button
                      onClick={() => setActiveTab('digital')}
                      className={cn(
                        'px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all h-6.5 flex items-center justify-center whitespace-nowrap',
                        activeTab === 'digital' ? 'bg-surface-0 border-0 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                      )}
                    >
                      Digital ({planos.filter(p => p.tipo === 'digital' && p.status !== 'template').length})
                    </button>
                    <button
                      onClick={() => setActiveTab('templates')}
                      className={cn(
                        'px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all h-6.5 flex items-center justify-center whitespace-nowrap',
                        activeTab === 'templates' ? 'bg-surface-0 border-0 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                      )}
                    >
                      Templates ({planos.filter(p => p.tipo === 'digital' && p.status === 'template').length})
                    </button>
                  </div>

                  {/* Table / List */}
                  {filteredPlanos.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-divider rounded-md">
                      <FileText size={24} className="text-text-disabled mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-text-secondary">
                        {searchQuery ? 'Nenhum plano corresponde' : 'Nenhum plano alimentar'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto scrollbar-hide">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="border-b border-divider">
                            <th className="pb-2 text-[10px] uppercase font-bold tracking-wider text-text-tertiary">Aluno</th>
                            <th className="pb-2 text-[10px] uppercase font-bold tracking-wider text-text-tertiary">Descrição</th>
                            <th className="pb-2 text-[10px] uppercase font-bold tracking-wider text-text-tertiary">Tipo</th>
                            <th className="pb-2 text-[10px] uppercase font-bold tracking-wider text-text-tertiary">Enviado em</th>
                            <th className="pb-2 text-[10px] uppercase font-bold tracking-wider text-text-tertiary text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle/50">
                          {filteredPlanos.map((plan) => {
                            const name = plan.aluno_ref || plan.aluno_nome || 'Aluno';
                            const isStale = new Date(plan.criado_em) < thirtyDaysAgo;
                            const isTemplate = plan.status === 'template';

                            return (
                              <tr key={plan.id} className="hover:bg-surface-2/40 transition-colors group">
                                <td className="py-2.5 pr-2">
                                  {isTemplate ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-md bg-brand/15 flex items-center justify-center border border-brand-border/20 text-brand shrink-0">
                                        <AppleLogo size={13} />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-text-primary truncate">
                                          Template
                                        </p>
                                        <p className="text-[10px] text-text-tertiary truncate">Reutilizável</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-md bg-surface-3 flex items-center justify-center border-0 text-text-secondary shrink-0">
                                        <User size={13} />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-text-primary truncate">
                                          {name}
                                        </p>
                                        <p className="text-[10px] text-text-tertiary truncate">{plan.aluno_email}</p>
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 pr-2 max-w-[180px]">
                                  <p className="text-xs text-text-secondary truncate font-medium" title={plan.descricao || plan.nome_arquivo}>
                                    {plan.descricao || plan.nome_arquivo}
                                  </p>
                                </td>
                                <td className="py-2.5">
                                  <span className={cn(
                                    "inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border",
                                    isTemplate 
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                      : plan.tipo === 'digital' 
                                        ? "bg-success/10 text-success border-success/20" 
                                        : "bg-brand/10 text-brand border-brand/20"
                                  )}>
                                    {isTemplate ? 'TEMPLATE' : plan.tipo.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-2">
                                  <div className="flex flex-col">
                                    <span className="text-xs text-text-secondary font-mono">
                                      {new Date(plan.criado_em).toLocaleDateString('pt-BR')}
                                    </span>
                                    {isStale && plan.tipo === 'pdf' && (
                                      <span className="text-[8px] font-bold text-warning mt-0.5">Desatualizado</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {isTemplate && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedTemplate(plan);
                                          setUseTemplatePlanName(plan.descricao || plan.nome_arquivo.replace('.json', ''));
                                          setShowUseTemplateModal(true);
                                        }}
                                        className="px-2 h-7 rounded bg-brand/10 border border-brand/20 hover:bg-brand/20 text-brand text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                        title="Usar Template"
                                      >
                                        Usar Template
                                      </button>
                                    )}
                                    {plan.tipo === 'pdf' ? (
                                      <button
                                        onClick={() => handlePreviewPlan(plan.url_pdf!)}
                                        className="w-7 h-7 rounded-md bg-surface-2 border-0 text-text-secondary hover:text-brand flex items-center justify-center transition-colors cursor-pointer"
                                        title="Visualizar PDF"
                                      >
                                        <Eye size={13} />
                                      </button>
                                    ) : (
                                      <>
                                        <Link href={`/admin/nutricao/planos/${plan.id}`}>
                                          <button
                                            className="w-7 h-7 rounded-md bg-surface-2 border-0 text-text-secondary hover:text-brand flex items-center justify-center transition-colors cursor-pointer"
                                            title="Visualizar Detalhes"
                                          >
                                            <Eye size={13} />
                                          </button>
                                        </Link>
                                        <Link href={`/admin/nutricao/planos/${plan.id}/editar`}>
                                          <button
                                            className="w-7 h-7 rounded-md bg-surface-2 border-0 text-text-secondary hover:text-brand flex items-center justify-center transition-colors cursor-pointer"
                                            title="Editar Plano"
                                          >
                                            <PencilSimple size={13} />
                                          </button>
                                        </Link>
                                      </>
                                    )}
                                    <button
                                      onClick={() => handleDeletePlan(plan.id, plan.url_pdf, plan.tipo)}
                                      className="w-7 h-7 rounded-md bg-surface-2 border-0 text-text-secondary hover:text-danger flex items-center justify-center transition-colors cursor-pointer"
                                      title="Excluir Plano"
                                    >
                                      <Trash size={13} />
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

              {/* Right Column: Actions & Upload Form (4 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                {/* Criar Plano Digital Card */}
                <Card className="rounded-xl border-0 shadow-sm p-4 md:p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-subtle border border-brand-border flex items-center justify-center text-brand shrink-0">
                      <AppleLogo size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Dieta Digital</h3>
                      <p className="text-[10px] text-text-tertiary">Monte rotinas de refeições interativas integradas ao app</p>
                    </div>
                  </div>
                  <Link href="/admin/nutricao/novo-plano" className="w-full mt-1">
                    <Button variant="primary" fullWidth className="h-10 rounded-lg text-xs font-bold cursor-pointer">
                      Criar Plano Digital
                    </Button>
                  </Link>
                </Card>

                {/* Enviar Plano Alimentar PDF */}
                <Card className="rounded-xl border-0 shadow-sm p-4 md:p-5">
                  <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4 border-b border-divider pb-2">
                    Enviar Plano Alimentar PDF
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
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary ml-1">Descrição</label>
                      <textarea
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        placeholder="Ex: Dieta bulking limpo, 3200 kcal/dia"
                        disabled={loading}
                        maxLength={200}
                        rows={2}
                        className="w-full px-3 py-2 bg-surface-2 border-0 rounded-md text-text-primary text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-all resize-none disabled:opacity-50"
                      />
                      <p className="text-[9px] text-text-disabled text-right">{descricao.length}/200</p>
                    </div>

                    {/* Upload */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary ml-1">Arquivo PDF</label>
                      {!selectedFile ? (
                        <label className="flex flex-col items-center justify-center h-20 border border-dashed border-border-default rounded-md bg-surface-2 hover:bg-brand-subtle/5 hover:border-brand/30 transition-all cursor-pointer group">
                          <input type="file" accept=".pdf" onChange={handleFileChange} disabled={loading} className="hidden" />
                          <FileArrowUp size={16} className="text-text-disabled group-hover:text-brand transition-colors mb-1" />
                          <p className="text-xs text-text-tertiary">Clique ou arraste o PDF</p>
                          <p className="text-[9px] text-text-disabled mt-0.5">Máximo 50MB</p>
                        </label>
                      ) : (
                        <div className="flex items-center gap-2.5 p-2 bg-brand-subtle border border-brand-border rounded-md">
                          <div className="w-8 h-8 rounded bg-surface-1 border border-brand-border flex items-center justify-center text-brand shrink-0">
                            <FilePdf size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-primary font-medium truncate">{selectedFile.name}</p>
                            <p className="text-[9px] text-brand">PDF Pronto</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="p-1 text-text-tertiary hover:text-danger transition-colors"
                          >
                            <Trash size={14} />
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
                      className="mt-2 h-10 rounded-lg text-xs font-bold"
                    >
                      Protocolar Plano
                    </Button>
                  </form>
                </Card>
              </div>
            </div>
          </div>
        </div>

      {/* Usar Template Modal Overlay */}
      {showUseTemplateModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-1 border-0 rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-scale-in">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Prescrever a partir de Template</h3>
              <p className="text-2xs text-text-tertiary">Selecione o aluno e o nome do novo plano alimentar</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Aluno de Destino</label>
              <select
                value={useTemplateStudentId}
                onChange={(e) => setUseTemplateStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-2 border-0 rounded-md text-text-primary text-xs focus:outline-none focus:border-brand/40"
              >
                <option value="">Selecione um aluno...</option>
                {alunos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.coaching_reference || a.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Nome do Plano</label>
              <input
                type="text"
                value={useTemplatePlanName}
                onChange={(e) => setUseTemplatePlanName(e.target.value)}
                placeholder="Ex: Dieta de Definição 2000 kcal"
                className="w-full px-3 py-2 bg-surface-2 border-0 rounded-md text-text-primary text-xs focus:outline-none focus:border-brand/40 font-medium"
              />
            </div>

            <div className="flex justify-end gap-2.5 mt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowUseTemplateModal(false);
                  setSelectedTemplate(null);
                }}
                disabled={useTemplateLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={useTemplateLoading}
                onClick={handleUseTemplate}
                disabled={useTemplateLoading || !useTemplateStudentId || !useTemplatePlanName}
              >
                Criar Plano
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
