"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/app/components/AuthProvider";
import {
  Users,
  WarningCircle,
  ChatCircle,
  Calendar,
  Barbell,
  Plus,
  Coins,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  User,
  ChartBar,
  Receipt
} from "@phosphor-icons/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell
} from "recharts";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { cn } from "@/lib/utils/cn";

// Interfaces
interface ProfileRow {
  id: string;
  coaching_reference?: string | null;
  full_name?: string | null;
  email?: string | null;
  status_pagamento?: string | null;
  tipo_plano?: string | null;
  ultimo_checkin?: string | null;
  avatar_url?: string | null;
  data_expiracao?: string | null;
  data_inicio?: string | null;
  created_at?: string | null;
  valor_plano?: number | null;
  arquivado?: boolean | null;
}

// Duração dos ciclos por tipo de plano (usado para caixa e projeção)
const DURACAO_PLANO_MESES: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };

/** Deriva o início do ciclo vigente do plano com fallback progressivo. */
function inicioDoCiclo(r: { data_inicio?: string | null; data_expiracao?: string | null; created_at?: string | null; tipo_plano?: string | null }): Date | null {
  if (r.data_inicio) return new Date(r.data_inicio);
  if (r.data_expiracao) {
    const dur = DURACAO_PLANO_MESES[r.tipo_plano || 'mensal'] || 1;
    const d = new Date(r.data_expiracao);
    d.setMonth(d.getMonth() - dur);
    return d;
  }
  if (r.created_at) return new Date(r.created_at);
  return null;
}

interface PriorityAction {
  id: string;
  aluno_id: string;
  nome: string;
  tipo: 'danger' | 'warning' | 'info' | 'success';
  descricao: string;
  acao: string;
  link: string;
}

interface RecentActivity {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  tipo: 'feedback' | 'treino_digital' | 'treino_manual';
  descricao: string;
  data: string;
  created_at_date: Date;
}

function timeAgo(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return "ontem";
  if (days < 30) return `${days} dias atrás`;
  return `${Math.floor(days / 30)} meses atrás`;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const today = new Date();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Financial Metrics States
  const [receitaMes, setReceitaMes] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [pendencias, setPendencias] = useState(0);
  const [previsao, setPrevisao] = useState(0);

  // Operational Metrics States
  const [alunosAtivos, setAlunosAtivos] = useState(0);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [adesao, setAdesao] = useState(0);
  const [alunosEmRisco, setAlunosEmRisco] = useState(0);
  const [checkinsPendentes, setCheckinsPendentes] = useState(0);

  // Lists & Panel States
  const [prioridades, setPrioridades] = useState<PriorityAction[]>([]);
  const [saudeAlunos, setSaudeAlunos] = useState<ProfileRow[]>([]);
  const [atividades, setAtividades] = useState<RecentActivity[]>([]);
  const [chartData, setChartData] = useState<{ mes: string; receita: number; futuro: boolean }[]>([]);
  const [alunosPorPlano, setAlunosPorPlano] = useState<{ name: string; count: number }[]>([]);
  // Nutrition States
  const [planoDigitalAtivos, setPlanoDigitalAtivos] = useState(0);
  const [adesaoAlimentar, setAdesaoAlimentar] = useState(0);
  const [alunosSemPlanoDig, setAlunosSemPlanoDig] = useState(0);
  const [alunosBaixaAdesaoDig, setAlunosBaixaAdesaoDig] = useState(0);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) { setError("Sessão inválida"); setLoading(false); return; }

      // 1. Fetch coach's student associations
      const { data: coachAlunosData, error: coachAlunosError } = await supabaseClient
        .from('coach_alunos')
        .select('aluno_id')
        .eq('coach_id', coachId);

      if (coachAlunosError) throw coachAlunosError;
      
      const alunosIds = (coachAlunosData || []).map(ca => ca.aluno_id);
      
      if (alunosIds.length === 0) {
        setTotalAlunos(0);
        setAlunosAtivos(0);
        setLoading(false);
        return;
      }

      // 2. Fetch profiles
      const { data: profiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('id, full_name, coaching_reference, email, status_pagamento, tipo_plano, ultimo_checkin, avatar_url, data_expiracao, data_inicio, created_at, valor_plano, arquivado')
        .in('id', alunosIds)
        .eq('arquivado', false);

      if (profilesError) throw profilesError;
      
      const rows = (profiles as ProfileRow[]) || [];
      setTotalAlunos(rows.length);
      setSaudeAlunos(rows);

      // 2b. Fetch active digital nutrition plans and day 1 meals count
      const { data: activePlans } = await supabaseClient
        .from('nutrition_plans')
        .select(`
          id,
          student_id,
          name,
          days:nutrition_plan_days (
            id,
            meals:nutrition_meals (
              id
            )
          )
        `)
        .in('student_id', alunosIds)
        .eq('status', 'active');

      // Dates
      const today = new Date();
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      const seteDiasAtrasIso = seteDiasAtras.toISOString();

      // Fetch meal check-ins in the last 7 days
      const activePlanIds = activePlans?.map(p => p.id) || [];
      const { data: checkins7d } = activePlanIds.length > 0
        ? await supabaseClient
            .from('nutrition_meal_checkins')
            .select('plan_id, meal_id, status, checkin_date, student_id')
            .in('plan_id', activePlanIds)
            .gte('checkin_date', seteDiasAtrasIso.slice(0, 10))
        : { data: [] };

      // 3. Compute Financial and Operation Base Metrics
      let tempReceitaMes = 0; // Faturamento do mês = regime de CAIXA (entrou neste mês civil)
      let tempMrr = 0;
      let tempPendencias = 0;
      let tempActiveCount = 0;
      let tempRiscoCount = 0;

      const inicioDoMes = new Date(today.getFullYear(), today.getMonth(), 1);

      const tempPrioridades: PriorityAction[] = [];

      // Nutrition adherence calculations variables
      let totalExpectedMeals = 0;
      let totalWeighedCompletedMeals = 0;
      let tempLowAdherenceCount = 0;
      const plansMap = new Map(activePlans?.map(p => [p.student_id, p]));

      rows.forEach((r) => {
        const valor = r.valor_plano || 0;
        const isPaid = r.status_pagamento === 'pago';
        const expiration = r.data_expiracao ? new Date(r.data_expiracao) : null;
        const isExpired = expiration && expiration < today;
        const isActive = isPaid && (!expiration || expiration >= today);

        // Operational calculations
        if (isActive) {
          tempActiveCount++;

          // Faturamento do mês (CAIXA): conta o valor cheio do plano se o ciclo
          // vigente iniciou dentro do mês corrente (venda/renovação neste mês).
          const cicloInicio = inicioDoCiclo(r);
          if (cicloInicio && cicloInicio >= inicioDoMes && cicloInicio <= today) {
            tempReceitaMes += valor;
          }

          if (r.tipo_plano === 'trimestral') {
            tempMrr += valor / 3;
          } else if (r.tipo_plano === 'semestral') {
            tempMrr += valor / 6;
          } else if (r.tipo_plano === 'anual') {
            tempMrr += valor / 12;
          } else {
            tempMrr += valor;
          }

          // Check if active student is expiring within 7 days
          if (expiration) {
            const diffTime = expiration.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 7) {
              tempPrioridades.push({
                id: `expiring-${r.id}`,
                aluno_id: r.id,
                nome: r.coaching_reference || r.full_name || "Atleta",
                tipo: 'warning',
                descricao: `Plano vence em ${diffDays} dias`,
                acao: 'Renovar',
                link: `/admin/aluno/${r.id}`
              });
            }
          }
        } else {
          // Unpaid or Expired
          tempPendencias += valor;
          
          tempPrioridades.push({
            id: `expired-${r.id}`,
            aluno_id: r.id,
            nome: r.coaching_reference || r.full_name || "Atleta",
            tipo: 'danger',
            descricao: isExpired ? 'Plano Expirado' : 'Pagamento Pendente',
            acao: 'Cobrar',
            link: `/admin/aluno/${r.id}`
          });
        }

        // Student Inactivity (No workouts for 7+ days)
        if (r.ultimo_checkin) {
          const checkinTime = new Date(r.ultimo_checkin).getTime();
          const diffDays = Math.floor((today.getTime() - checkinTime) / (1000 * 60 * 60 * 24));
          if (diffDays > 7) {
            tempRiscoCount++;
            tempPrioridades.push({
              id: `inactive-${r.id}`,
              aluno_id: r.id,
              nome: r.coaching_reference || r.full_name || "Atleta",
              tipo: 'danger',
              descricao: `Sem treinar há ${diffDays} dias`,
              acao: 'Enviar Mensagem',
              link: `/admin/aluno/${r.id}`
            });
          }
        } else if (isActive) {
          // Active student with no workout at all
          tempPrioridades.push({
            id: `nocheckin-${r.id}`,
            aluno_id: r.id,
            nome: r.coaching_reference || r.full_name || "Atleta",
            tipo: 'info',
            descricao: 'Nenhum treino realizado ainda',
            acao: 'Prescrever',
            link: `/admin/aluno/${r.id}`
          });
        }

        // Digital Nutrition adherence metrics calculations per student
        const studentPlan: any = plansMap.get(r.id);
        if (studentPlan) {
          const mealsCount = studentPlan.days?.[0]?.meals?.length || 0;
          if (mealsCount > 0) {
            const expectedMeals = mealsCount * 7;
            totalExpectedMeals += expectedMeals;

            const studentCheckins = (checkins7d || []).filter(c => c.student_id === r.id);
            let weightSum = 0;
            studentCheckins.forEach(c => {
              if (c.status === 'done' || c.status === 'substituted') weightSum += 1.0;
              else if (c.status === 'partial') weightSum += 0.5;
            });
            totalWeighedCompletedMeals += weightSum;

            const studentAdherence = Math.min(100, Math.round((weightSum / expectedMeals) * 100));

            // Alerts based on adherence
            if (studentAdherence < 60) {
              tempLowAdherenceCount++;
              tempPrioridades.push({
                id: `low-adherence-${r.id}`,
                aluno_id: r.id,
                nome: r.coaching_reference || r.full_name || "Atleta",
                tipo: 'warning',
                descricao: `Adesão à dieta baixa: ${studentAdherence}%`,
                acao: 'Ver Plano',
                link: `/admin/nutricao/planos/${studentPlan.id}`
              });
            }

            // Sem marcar refeições há 3 dias check
            if (studentCheckins.length > 0) {
              const dates = studentCheckins.map(c => new Date(c.checkin_date).getTime());
              const lastCheckinTime = Math.max(...dates);
              const diffDays = Math.floor((today.getTime() - lastCheckinTime) / (1000 * 60 * 60 * 24));
              if (diffDays >= 3) {
                tempPrioridades.push({
                  id: `no-diet-checkin-${r.id}`,
                  aluno_id: r.id,
                  nome: r.coaching_reference || r.full_name || "Atleta",
                  tipo: 'danger',
                  descricao: `Sem registrar dieta há ${diffDays} dias`,
                  acao: 'Cobrar Check-in',
                  link: `/admin/aluno/${r.id}`
                });
              }
            } else {
              // No nutrition check-in at all in 7 days
              tempPrioridades.push({
                id: `no-diet-checkin-at-all-${r.id}`,
                aluno_id: r.id,
                nome: r.coaching_reference || r.full_name || "Atleta",
                tipo: 'warning',
                descricao: `Sem check-in de dieta na semana`,
                acao: 'Cobrar Check-in',
                link: `/admin/aluno/${r.id}`
              });
            }
          }
        } else if (isActive) {
          // Student is active but has no digital plan
          tempPrioridades.push({
            id: `nodigitalplan-${r.id}`,
            aluno_id: r.id,
            nome: r.coaching_reference || r.full_name || "Atleta",
            tipo: 'info',
            descricao: `Sem plano de nutrição digital`,
            acao: 'Criar Plano',
            link: `/admin/nutricao/novo-plano`
          });
        }
      });

      setReceitaMes(tempReceitaMes);
      setMrr(tempMrr);
      setPendencias(tempPendencias);
      setPrevisao(tempReceitaMes + tempPendencias);
      setAlunosAtivos(tempActiveCount);
      setAlunosEmRisco(tempRiscoCount);

      // Nutrition dashboard stats state updates
      setPlanoDigitalAtivos(activePlans?.length || 0);
      setAlunosSemPlanoDig(rows.length - (activePlans?.length || 0));
      setAlunosBaixaAdesaoDig(tempLowAdherenceCount);

      const calculatedAdesaoDig = totalExpectedMeals > 0 
        ? Math.min(100, Math.round((totalWeighedCompletedMeals / totalExpectedMeals) * 100))
        : 0;
      setAdesaoAlimentar(calculatedAdesaoDig);

      // Plan counts distribution
      const counts = rows.reduce<Record<string, number>>((acc, r) => {
        const plano = r.tipo_plano || 'sem_plano';
        acc[plano] = (acc[plano] || 0) + 1;
        return acc;
      }, {});
      setAlunosPorPlano([
        { name: 'Mensal', count: counts.mensal || 0 },
        { name: 'Trimestral', count: counts.trimestral || 0 },
        { name: 'Semestral', count: counts.semestral || 0 },
        { name: 'Anual', count: counts.anual || 0 },
      ].filter(p => p.count > 0));

      // 4. Fetch Workout completion details (historico_treinos) for last 7 days
      const { data: histWeek } = await supabaseClient
        .from('historico_treinos')
        .select('id, aluno_id')
        .in('aluno_id', alunosIds)
        .gte('data_conclusao', seteDiasAtrasIso);

      const { data: manualWeek } = await supabaseClient
        .from('treinos_manuais')
        .select('id, aluno_id')
        .in('aluno_id', alunosIds)
        .eq('concluido', true)
        .gte('data_treino', seteDiasAtrasIso);

      const totalConcluido = (histWeek?.length || 0) + (manualWeek?.length || 0);
      const expectedTotal = tempActiveCount * 3; // Goal of 3 workouts per week per active student
      const adesaoPercent = expectedTotal > 0 ? Math.min(100, Math.round((totalConcluido / expectedTotal) * 100)) : 0;
      setAdesao(adesaoPercent);

      // 5. Fetch Pending checkins (counts of photos, measures, feedbacks in last 7 days)
      const { count: photosCount } = await supabaseClient
        .from('fotos_evolucao')
        .select('id', { count: 'exact', head: true })
        .in('aluno_id', alunosIds)
        .gte('data_upload', seteDiasAtrasIso);

      const { count: medidasCount } = await supabaseClient
        .from('medidas_aluno')
        .select('id', { count: 'exact', head: true })
        .in('aluno_id', alunosIds)
        .gte('data_medicao', seteDiasAtrasIso);

      const { count: feedbacksCount } = await supabaseClient
        .from('feedbacks_treinos')
        .select('id', { count: 'exact', head: true })
        .in('aluno_id', alunosIds)
        .gte('created_at', seteDiasAtrasIso);

      setCheckinsPendentes((photosCount || 0) + (medidasCount || 0) + (feedbacksCount || 0));

      // 6. Fetch Recent Activity & Feedbacks
      const { data: recentWorkouts } = await supabaseClient
        .from('historico_treinos')
        .select('id, aluno_id, ficha_id, data_conclusao')
        .in('aluno_id', alunosIds)
        .order('data_conclusao', { ascending: false })
        .limit(5);

      const { data: recentManual } = await supabaseClient
        .from('treinos_manuais')
        .select('id, aluno_id, descricao, data_treino')
        .in('aluno_id', alunosIds)
        .eq('concluido', true)
        .order('data_treino', { ascending: false })
        .limit(5);

      const { data: recentFeedbacks } = await supabaseClient
        .from('feedbacks_treinos')
        .select('id, aluno_id, feedback, created_at')
        .in('aluno_id', alunosIds)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch related routine names to translate ficha_id
      const fichaIds = (recentWorkouts || []).filter(w => w.ficha_id).map(w => w.ficha_id);
      const { data: routineNames } = fichaIds.length > 0
        ? await supabaseClient.from('fichas_treino').select('id, nome_rotina').in('id', fichaIds)
        : { data: [] };

      // Map combined list
      const listAtividades: RecentActivity[] = [];

      (recentWorkouts || []).forEach(w => {
        const student = rows.find(r => r.id === w.aluno_id);
        const routine = (routineNames || []).find(f => f.id === w.ficha_id);
        listAtividades.push({
          id: w.id,
          aluno_id: w.aluno_id,
          aluno_nome: student?.coaching_reference || student?.full_name || "Atleta",
          tipo: 'treino_digital',
          descricao: `Concluiu o treino: ${routine?.nome_rotina || "Treino Digital"}`,
          data: timeAgo(w.data_conclusao) || "recentemente",
          created_at_date: new Date(w.data_conclusao)
        });
      });

      (recentManual || []).forEach(m => {
        const student = rows.find(r => r.id === m.aluno_id);
        listAtividades.push({
          id: m.id,
          aluno_id: m.aluno_id,
          aluno_nome: student?.coaching_reference || student?.full_name || "Atleta",
          tipo: 'treino_manual',
          descricao: `Registrou treino manual: ${m.descricao || 'Treino livre'}`,
          data: timeAgo(m.data_treino) || "recentemente",
          created_at_date: new Date(m.data_treino)
        });
      });

      (recentFeedbacks || []).forEach(f => {
        const student = rows.find(r => r.id === f.aluno_id);
        listAtividades.push({
          id: f.id,
          aluno_id: f.aluno_id,
          aluno_nome: student?.coaching_reference || student?.full_name || "Atleta",
          tipo: 'feedback',
          descricao: `Enviou feedback: "${f.feedback.length > 40 ? f.feedback.substring(0, 38) + '...' : f.feedback}"`,
          data: timeAgo(f.created_at) || "recentemente",
          created_at_date: new Date(f.created_at)
        });
      });

      // Sort combined activities by date descending
      listAtividades.sort((a, b) => b.created_at_date.getTime() - a.created_at_date.getTime());
      setAtividades(listAtividades.slice(0, 8));

      // Append feedbacks alerts to priorities
      (recentFeedbacks || []).forEach(f => {
        const student = rows.find(r => r.id === f.aluno_id);
        tempPrioridades.push({
          id: `feedback-${f.id}`,
          aluno_id: f.aluno_id,
          nome: student?.coaching_reference || student?.full_name || "Atleta",
          tipo: 'info',
          descricao: `Novo feedback enviado`,
          acao: 'Visualizar',
          link: `/admin/feedbacks`
        });
      });

      setPrioridades(tempPrioridades.slice(0, 6));

      // 7. Faturamento mensal — série NORMALIZADA (valor rateado pela duração do plano).
      // Eixo X: início fixo em Jan/2026 (início da operação) até mês atual + 6 (projeção).
      const rangeStart = new Date(2026, 0, 1);
      const rangeEnd = new Date(today.getFullYear(), today.getMonth() + 6, 1);
      const mesMap: Record<string, number> = {};
      const mesKeys: string[] = [];
      for (let d = new Date(rangeStart); d <= rangeEnd; d.setMonth(d.getMonth() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        mesMap[key] = 0;
        mesKeys.push(key);
      }
      const mesAtualKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      // Reutiliza os perfis já carregados (rows) — derivando o início do ciclo com fallback.
      for (const r of rows) {
        const valor = r.valor_plano ?? 0;
        if (valor <= 0) continue;
        const meses = DURACAO_PLANO_MESES[r.tipo_plano || 'mensal'] || 1;
        const valorPorMes = valor / meses;
        const inicio = inicioDoCiclo(r);
        if (!inicio) continue;
        for (let m = 0; m < meses; m++) {
          const d = new Date(inicio.getFullYear(), inicio.getMonth() + m, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (key in mesMap) mesMap[key] += valorPorMes;
        }
      }

      const mesList = mesKeys.map((mes) => {
        const [ano, m] = mes.split('-');
        const label = new Date(Number(ano), Number(m) - 1, 1)
          .toLocaleDateString('pt-BR', { month: 'short' });
        return { mes: label, receita: Math.round(mesMap[mes]), futuro: mes > mesAtualKey };
      });
      setChartData(mesList);

    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar dados da dashboard");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
      } else {
        loadDashboardData();
      }
    }
  }, [user, authLoading, router, loadDashboardData]);

  const fmt = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center lg:pl-28">
        <DumbbellLoader text="Carregando central de comando..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center lg:pl-28 p-6 text-center">
        <WarningCircle size={48} className="text-danger mb-4" />
        <h2 className="text-lg font-bold text-text-primary mb-2">Ops! Ocorreu um erro</h2>
        <p className="text-text-secondary text-sm max-w-sm mb-6">{error}</p>
        <button onClick={loadDashboardData} className="btn-primary max-w-xs">
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-8 lg:p-10 lg:pl-28 pb-24 text-text-primary font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary font-display">
              Dashboard
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Visão geral da sua consultoria
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/alunos/novo" className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hover text-text-on-brand text-xs font-semibold rounded-lg transition-all active:scale-95 shadow-md shadow-brand/10">
              <Plus size={13} weight="bold" /> Adicionar aluno
            </Link>
            <Link href="/admin/treinos/nova-ficha" className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-border-default hover:bg-surface-3 text-text-primary text-xs font-semibold rounded-lg transition-all active:scale-95">
              Criar Treino
            </Link>
            <Link href="/admin/relatorios" className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-border-default hover:bg-surface-3 text-text-primary text-xs font-semibold rounded-lg transition-all active:scale-95">
              <ChartBar size={13} /> Relatórios
            </Link>
          </div>
        </div>

        {totalAlunos === 0 ? (
          /* Empty State Dashboard */
          <div className="bg-surface-1 border border-border-subtle rounded-xl p-12 text-center max-w-lg mx-auto mt-12 shadow-sm">
            <Users size={44} className="text-brand/40 mx-auto mb-4" />
            <h3 className="text-base font-bold text-text-primary mb-2">Nenhum aluno cadastrado ainda</h3>
            <p className="text-text-secondary text-xs mb-6">
              Adicione seu primeiro aluno para começar a prescrever treinos, acompanhar adesão e gerenciar cobranças.
            </p>
            <Link href="/admin/alunos/novo" className="btn-primary inline-flex items-center gap-2 justify-center max-w-xs mx-auto text-xs py-2 rounded-lg">
              <Plus size={14} weight="bold" /> Cadastrar Aluno
            </Link>
          </div>
        ) : (
          /* Dashboard Layout */
          <div className="flex flex-col gap-6">
            
            {/* Bloco 1 — Métricas Financeiras */}
            <div>
              <h2 className="text-[10px] font-bold tracking-wider text-text-tertiary uppercase border-t border-border-subtle/50 pt-3 mt-1 mb-2.5 block">Faturamento & Prospecção</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Faturamento do mês (caixa) */}
                <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 shadow-sm flex flex-col justify-center h-20">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-brand" />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Faturamento do Mês</span>
                  </div>
                  <div className="text-xl font-bold tracking-tight text-text-primary font-mono tabular-nums mt-1 leading-none">{fmt(receitaMes)}</div>
                  <span className="text-[9px] text-text-disabled mt-1 leading-none">Entrou no caixa neste mês</span>
                </div>

                {/* MRR ativo */}
                <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 shadow-sm flex flex-col justify-center h-20">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-success" />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">MRR Ativo</span>
                  </div>
                  <div className="text-xl font-bold tracking-tight text-text-primary font-mono tabular-nums mt-1 leading-none">{fmt(mrr)}</div>
                  <span className="text-[9px] text-text-disabled mt-1 leading-none">Recorrência mensal ativa</span>
                </div>

                {/* Pendências */}
                <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 shadow-sm flex flex-col justify-center h-20">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-danger" />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Pendências</span>
                  </div>
                  <div className="text-xl font-bold tracking-tight text-text-primary font-mono tabular-nums mt-1 leading-none">{fmt(pendencias)}</div>
                  <span className="text-[9px] text-danger font-medium mt-1 leading-none">Contas atrasadas ou vencidas</span>
                </div>

                {/* Previsão do mês */}
                <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 shadow-sm flex flex-col justify-center h-20">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-text-disabled" />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Previsão do Mês</span>
                  </div>
                  <div className="text-xl font-bold tracking-tight text-text-primary font-mono tabular-nums mt-1 leading-none">{fmt(previsao)}</div>
                  <span className="text-[9px] text-text-disabled mt-1 leading-none">Projeção por planos ativos</span>
                </div>

              </div>
            </div>

            {/* Bloco 2 — Saúde da Operação */}
            <div>
              <h2 className="text-[10px] font-bold tracking-wider text-text-tertiary uppercase border-t border-border-subtle/50 pt-3 mt-1 mb-2.5 block">Saúde da Operação</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Alunos ativos */}
                <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 shadow-sm flex flex-col justify-center h-20">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-success" />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Alunos Ativos</span>
                  </div>
                  <div className="text-xl font-bold tracking-tight text-text-primary font-mono tabular-nums mt-1.5 leading-none">{alunosAtivos}</div>
                  <span className="text-[9px] text-text-disabled mt-1.5 leading-none">Perfis pagantes vigentes</span>
                </div>

                {/* Adesão média */}
                <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 shadow-sm flex flex-col justify-center h-20">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-brand" />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Adesão Média</span>
                  </div>
                  <div className="text-xl font-bold tracking-tight text-text-primary font-mono tabular-nums mt-1.5 leading-none">{adesao}%</div>
                  <span className="text-[9px] text-text-disabled mt-1.5 leading-none">Presença nos treinos na semana</span>
                </div>

                {/* Alunos em risco */}
                <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 shadow-sm flex flex-col justify-center h-20">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-danger" />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Alunos em Risco</span>
                  </div>
                  <div className="text-xl font-bold tracking-tight text-text-primary font-mono tabular-nums mt-1.5 leading-none">{alunosEmRisco}</div>
                  <span className="text-[9px] text-danger font-medium mt-1.5 leading-none">Inativos há mais de 7 dias</span>
                </div>

                {/* Check-ins pendentes */}
                <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 shadow-sm flex flex-col justify-center h-20">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-warning" />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Check-ins Pendentes</span>
                  </div>
                  <div className="text-xl font-bold tracking-tight text-text-primary font-mono tabular-nums mt-1.5 leading-none">{checkinsPendentes}</div>
                  <span className="text-[9px] text-text-disabled mt-1.5 leading-none">Novos relatos ou fotos enviados</span>
                </div>

              </div>
            </div>

            {/* Bloco 2b — Acompanhamento Nutricional */}
            <div>
              <h2 className="text-[10px] font-bold tracking-wider text-text-tertiary uppercase border-t border-border-subtle/50 pt-3 mt-1 mb-2.5 block">Acompanhamento Nutricional</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Adesão Alimentar */}
                <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 shadow-sm flex flex-col justify-center h-20">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-success" />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Adesão Alimentar Média</span>
                  </div>
                  <div className="text-xl font-bold tracking-tight text-text-primary font-mono tabular-nums mt-1.5 leading-none">{adesaoAlimentar}%</div>
                  <span className="text-[9px] text-text-disabled mt-1.5 leading-none">Adesão semanal à dieta prescrita</span>
                </div>

                {/* Planos Digitais Ativos */}
                <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 shadow-sm flex flex-col justify-center h-20">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-brand" />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Planos Digitais Ativos</span>
                  </div>
                  <div className="text-xl font-bold tracking-tight text-text-primary font-mono tabular-nums mt-1.5 leading-none">{planoDigitalAtivos}</div>
                  <span className="text-[9px] text-text-disabled mt-1.5 leading-none">Planos alimentares digitais vigentes</span>
                </div>

                {/* Alunos Sem Plano */}
                <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 shadow-sm flex flex-col justify-center h-20">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-warning" />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Alunos Sem Plano</span>
                  </div>
                  <div className="text-xl font-bold tracking-tight text-text-primary font-mono tabular-nums mt-1.5 leading-none">{alunosSemPlanoDig}</div>
                  <span className="text-[9px] text-text-disabled mt-1.5 leading-none">Alunos sem dieta digital prescrita</span>
                </div>

                {/* Baixa Adesão */}
                <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 shadow-sm flex flex-col justify-center h-20">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-danger" />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Baixa Adesão</span>
                  </div>
                  <div className="text-xl font-bold tracking-tight text-text-primary font-mono tabular-nums mt-1.5 leading-none">{alunosBaixaAdesaoDig}</div>
                  <span className="text-[9px] text-danger font-medium mt-1.5 leading-none">Adesão na semana abaixo de 60%</span>
                </div>

              </div>
            </div>

            {/* Bloco 3 — Ações Prioritárias (Subiu na tela e mais compacto) */}
            {prioridades.length > 0 && (
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <WarningCircle className="text-brand w-4 h-4" />
                    <h3 className="text-xs font-bold text-text-primary">Ações prioritárias</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-danger/10 text-danger text-[9px] font-semibold uppercase rounded-full">
                    Ação Requerida
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {prioridades.map((action) => (
                    <div key={action.id} className="p-3 bg-surface-2 border border-border-subtle hover:border-border-strong rounded-lg flex items-center justify-between gap-3 transition-all h-14">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          action.tipo === 'danger' && "bg-danger animate-pulse",
                          action.tipo === 'warning' && "bg-warning",
                          action.tipo === 'info' && "bg-info",
                          action.tipo === 'success' && "bg-success"
                        )} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-text-primary leading-tight truncate">{action.nome}</span>
                          <span className="text-[10px] text-text-secondary mt-0.5 leading-none truncate">{action.descricao}</span>
                        </div>
                      </div>
                      <Link href={action.link} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover transition-colors shrink-0">
                        {action.acao === 'Prescrever' ? 'Prescrever' : action.acao} <ArrowRight size={12} />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grid Principal - 2 Colunas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Coluna Esquerda - Atividade Recente */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                
                {/* Atividade Recente */}
                <div className="bg-surface-1 border border-border-subtle rounded-xl p-4 shadow-sm">
                  <h3 className="text-xs font-bold text-text-primary mb-0.5">Atividade recente</h3>
                  <p className="text-[10px] text-text-tertiary mb-4">Atualizações em tempo real dos seus alunos</p>

                  <div className="flex flex-col gap-3">
                    {atividades.length === 0 ? (
                      <div className="py-8 text-center text-xs text-text-tertiary">
                        Nenhuma atividade recente encontrada.
                      </div>
                    ) : (
                      atividades.map((act) => (
                        <div key={act.id} className="flex items-start justify-between gap-4 border-b border-border-subtle/50 pb-2.5 last:border-b-0 last:pb-0">
                          <div className="flex gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 border border-border-subtle bg-surface-2 text-text-secondary">
                              {act.tipo === 'feedback' && <ChatCircle size={14} />}
                              {act.tipo === 'treino_digital' && <Barbell size={14} />}
                              {act.tipo === 'treino_manual' && <Calendar size={14} />}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-text-primary leading-tight truncate">{act.aluno_nome}</span>
                              <span className="text-[11px] text-text-secondary mt-0.5 leading-tight truncate">{act.descricao}</span>
                            </div>
                          </div>
                          <span className="text-[9px] text-text-tertiary whitespace-nowrap shrink-0 pt-0.5">{act.data}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Coluna Direita - Gráficos */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                
                {/* Grafico Receita */}
                <div className="bg-surface-1 border border-border-subtle rounded-xl p-4 shadow-sm">
                  <h3 className="text-xs font-bold text-text-primary mb-0.5">Faturamento Mensal</h3>
                  <p className="text-[10px] text-text-tertiary mb-4">Realizado e projeção mensal</p>

                  <div className="h-44">
                    {chartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-text-tertiary">
                        Sem dados suficientes para gerar gráfico.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <XAxis dataKey="mes" stroke="#6B7280" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis stroke="#6B7280" fontSize={9} tickFormatter={(v) => `R$${v}`} tickLine={false} axisLine={false} />
                          <Tooltip
                             contentStyle={{
                               backgroundColor: '#1F1F23',
                               border: '1px solid #27272A',
                               borderRadius: '6px',
                               padding: '6px',
                             }}
                             labelStyle={{ color: '#FAFAFA', fontWeight: 'bold', fontSize: '10px' }}
                             itemStyle={{ color: '#2563EB', fontSize: '10px', padding: '2px 0' }}
                             formatter={(v: any) => [fmt(Number(v)), 'Faturamento']}
                           />
                          <Bar dataKey="receita" radius={[3, 3, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.futuro ? 'rgba(37, 99, 235, 0.4)' : '#2563EB'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Planos Ativos */}
                <div className="bg-surface-1 border border-border-subtle rounded-xl p-4 shadow-sm">
                  <h3 className="text-xs font-bold text-text-primary mb-0.5">Distribuição de Planos</h3>
                  <p className="text-[10px] text-text-tertiary mb-4">Modalidades vigentes</p>

                  <div className="flex flex-col gap-2.5">
                    {alunosPorPlano.length === 0 ? (
                      <div className="py-2 text-center text-xs text-text-tertiary">
                        Nenhum plano ativo encontrado.
                      </div>
                    ) : (
                      alunosPorPlano.map((plano) => (
                        <div key={plano.name} className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-text-secondary capitalize">{plano.name}</span>
                            <span className="font-medium text-text-primary">{plano.count} alunos</span>
                          </div>
                          <div className="w-full h-1 bg-surface-3 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand rounded-full"
                              style={{ width: `${Math.min(100, (plano.count / totalAlunos) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Bloco 5 - Saúde dos Alunos (Compacta) */}
            <div className="bg-surface-1 border border-border-subtle rounded-xl p-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-text-primary">Saúde dos alunos</h3>
                  <p className="text-[10px] text-text-tertiary">Métricas de engajamento e status de evolução</p>
                </div>
                <Link href="/admin/alunos" className="inline-flex items-center gap-1 text-brand text-xs font-semibold hover:underline">
                  Ver todos os alunos <ArrowRight size={10} />
                </Link>
              </div>

              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="pb-2 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Nome</th>
                      <th className="pb-2 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Status</th>
                      <th className="pb-2 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Plano</th>
                      <th className="pb-2 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Último Treino</th>
                      <th className="pb-2 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Expiração</th>
                      <th className="pb-2 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saudeAlunos.slice(0, 5).map((aluno) => {
                      const expiration = aluno.data_expiracao ? new Date(aluno.data_expiracao) : null;
                      const isPaid = aluno.status_pagamento === 'pago';
                      const isExpired = expiration && expiration < today;
                      const isActive = isPaid && (!expiration || expiration >= today);

                      return (
                        <tr key={aluno.id} className="border-b border-border-subtle/50 last:border-b-0 hover:bg-surface-2/40 transition-colors">
                          <td className="py-2.5 text-xs font-bold text-text-primary">
                            {aluno.coaching_reference || aluno.full_name || "Aluno"}
                          </td>
                          <td className="py-2.5 text-xs">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full font-semibold uppercase text-[8px] tracking-wider",
                              isActive ? "bg-success-subtle text-success border border-success/10" : "bg-danger-subtle text-danger border border-danger/10"
                            )}>
                              {isActive ? "Ativo" : isExpired ? "Expirado" : "Pendente"}
                            </span>
                          </td>
                          <td className="py-2.5 text-xs text-text-secondary capitalize">
                            {aluno.tipo_plano || "Sem plano"}
                          </td>
                          <td className="py-2.5 text-xs text-text-secondary">
                            {aluno.ultimo_checkin ? timeAgo(aluno.ultimo_checkin) : "Sem treinos"}
                          </td>
                          <td className="py-2.5 text-xs text-text-secondary">
                            {expiration ? expiration.toLocaleDateString('pt-BR') : "Sem vencimento"}
                          </td>
                          <td className="py-2.5 text-xs">
                            <Link href={`/admin/aluno/${aluno.id}`} className="text-brand hover:underline font-semibold inline-flex items-center gap-0.5">
                              Perfil <ArrowRight size={10} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
