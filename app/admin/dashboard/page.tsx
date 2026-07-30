"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/app/components/AuthProvider";
import { Users, WarningCircle, Plus } from "@phosphor-icons/react";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import {
  groupActivities,
  type RawActivity,
  type GroupedActivity,
} from "@/lib/utils/activityGrouping";
import { DashboardHeader } from "@/app/components/dashboard/coach/DashboardHeader";
import { DashboardKpiRow } from "@/app/components/dashboard/coach/DashboardKpiRow";
import { MrrChartCard } from "@/app/components/dashboard/coach/MrrChartCard";
import { PlanDistributionCard } from "@/app/components/dashboard/coach/PlanDistributionCard";
import { PriorityActionsCard, type PriorityAction } from "@/app/components/dashboard/coach/PriorityActionsCard";
import { RecentActivityFeed } from "@/app/components/dashboard/coach/RecentActivityFeed";
import { StudentHealthTable } from "@/app/components/dashboard/coach/StudentHealthTable";
import { fetchSubscriptionStatusCached } from "@/lib/subscriptions/statusClientCache";
import {
  fetchCoachCustomPlans,
  mergedPlans,
  buildPlanDurationMap,
  type CoachPlan,
} from "@/lib/coachPlans";

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

/** Deriva o início do ciclo vigente do plano com fallback progressivo.
 *  `duracaoMeses`: mapa slug → meses (planos padrão + personalizados do coach). */
function inicioDoCiclo(
  r: { data_inicio?: string | null; data_expiracao?: string | null; created_at?: string | null; tipo_plano?: string | null },
  duracaoMeses: Record<string, number>
): Date | null {
  if (r.data_inicio) return new Date(r.data_inicio);
  if (r.data_expiracao) {
    const dur = duracaoMeses[r.tipo_plano || 'mensal'] || 1;
    const d = new Date(r.data_expiracao);
    d.setMonth(d.getMonth() - dur);
    return d;
  }
  if (r.created_at) return new Date(r.created_at);
  return null;
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
  const isMobile = useBreakpoint("mobile");
  const hasDataRef = useRef(false);
  
  const today = new Date();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Financial Metrics States
  const [mrr, setMrr] = useState(0);

  // Operational Metrics States
  const [alunosAtivos, setAlunosAtivos] = useState(0);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [alunosEmRisco, setAlunosEmRisco] = useState(0);
  const [checkinsPendentes, setCheckinsPendentes] = useState(0);

  // Lists & Panel States
  const [prioridades, setPrioridades] = useState<PriorityAction[]>([]);
  const [saudeAlunos, setSaudeAlunos] = useState<ProfileRow[]>([]);
  const [groupedAtividades, setGroupedAtividades] = useState<GroupedActivity[]>([]);
  const [chartData, setChartData] = useState<{ mes: string; receita: number; futuro: boolean }[]>([]);
  const [alunosPorPlano, setAlunosPorPlano] = useState<{ name: string; count: number }[]>([]);
  const [coachAccountType, setCoachAccountType] = useState<string>("padrao");
  const [coachStudentLimit, setCoachStudentLimit] = useState<number | null>(null);
  const [linkedStudentCount, setLinkedStudentCount] = useState(0);
  const [coachName, setCoachName] = useState("");

  const activeStudentsSubtitle = useMemo(() => {
    if (coachStudentLimit !== null) {
      return `${linkedStudentCount}/${coachStudentLimit} vinculados`;
    }
    if (coachAccountType === "parceiro") {
      return "Ilimitados na conta parceiro";
    }
    return "Perfis pagantes vigentes";
  }, [coachStudentLimit, linkedStudentCount, coachAccountType]);

  const loadDashboardData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const coachId = session?.user?.id;
      if (!coachId) { setError("Sessão inválida"); setLoading(false); return; }

      // Status + alunos + nome de exibição + planos personalizados em paralelo
      const [statusResult, coachAlunosResult, coachProfileResult, customPlans] = await Promise.all([
        session.access_token
          ? fetchSubscriptionStatusCached(session.access_token)
          : Promise.resolve(null),
        supabaseClient
          .from('coach_alunos')
          .select('aluno_id')
          .eq('coach_id', coachId),
        supabaseClient
          .from('profiles')
          .select('full_name')
          .eq('id', coachId)
          .single(),
        fetchCoachCustomPlans(coachId).catch(() => [] as CoachPlan[]),
      ]);

      const duracaoMap = buildPlanDurationMap(customPlans);

      if (statusResult) {
        setCoachAccountType(statusResult.accountType ?? "padrao");
        setCoachStudentLimit(statusResult.studentLimit ?? null);
        setLinkedStudentCount(statusResult.activeStudentCount ?? 0);
      }

      // Mesmo campo "Nome de exibição" de /admin/perfil (profiles.full_name)
      setCoachName(coachProfileResult.data?.full_name?.trim() || "");

      if (coachAlunosResult.error) throw coachAlunosResult.error;
      
      const alunosIds = (coachAlunosResult.data || []).map(ca => ca.aluno_id);
      
      if (alunosIds.length === 0) {
        setTotalAlunos(0);
        setAlunosAtivos(0);
        setLoading(false);
        return;
      }

      // Dates
      const today = new Date();
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      const seteDiasAtrasIso = seteDiasAtras.toISOString();

      // Profiles + planos de nutrição + check-ins em paralelo
      // (check-ins por student_id em vez de plan_id — filtramos por plano ativo depois)
      const [{ data: profiles, error: profilesError }, { data: activePlans }, { data: checkinsRaw }] = await Promise.all([
        supabaseClient
          .from('profiles')
          .select('id, full_name, coaching_reference, email, status_pagamento, tipo_plano, ultimo_checkin, avatar_url, data_expiracao, data_inicio, created_at, valor_plano, arquivado')
          .in('id', alunosIds)
          .eq('arquivado', false),
        supabaseClient
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
          .eq('status', 'active'),
        supabaseClient
          .from('nutrition_meal_checkins')
          .select('plan_id, meal_id, status, checkin_date, student_id')
          .in('student_id', alunosIds)
          .gte('checkin_date', seteDiasAtrasIso.slice(0, 10)),
      ]);

      if (profilesError) throw profilesError;

      const rows = (profiles as ProfileRow[]) || [];
      setTotalAlunos(rows.length);
      setSaudeAlunos(rows);

      const activePlanIds = new Set(activePlans?.map(p => p.id) || []);
      const checkins7d = (checkinsRaw || []).filter(c => activePlanIds.has(c.plan_id));

      // 3. Compute Financial and Operation Base Metrics
      let tempReceitaMes = 0; // Faturamento do mÃªs = regime de CAIXA (entrou neste mÃªs civil)
      let tempMrr = 0;
      let tempPendencias = 0;
      let tempActiveCount = 0;
      let tempRiscoCount = 0;

      const inicioDoMes = new Date(today.getFullYear(), today.getMonth(), 1);

      const tempPrioridades: PriorityAction[] = [];

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

          // Faturamento do mÃªs (CAIXA): conta o valor cheio do plano se o ciclo
          // vigente iniciou dentro do mÃªs corrente (venda/renovaÃ§Ã£o neste mÃªs).
          const cicloInicio = inicioDoCiclo(r, duracaoMap);
          if (cicloInicio && cicloInicio >= inicioDoMes && cicloInicio <= today) {
            tempReceitaMes += valor;
          }

          // MRR normalizado pela duração do plano (padrão ou personalizado)
          tempMrr += valor / (duracaoMap[r.tipo_plano || 'mensal'] || 1);

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

            const studentCheckins = (checkins7d || []).filter(c => c.student_id === r.id);
            let weightSum = 0;
            studentCheckins.forEach(c => {
              if (c.status === 'done' || c.status === 'substituted') weightSum += 1.0;
              else if (c.status === 'partial') weightSum += 0.5;
            });

            const studentAdherence = Math.min(100, Math.round((weightSum / expectedMeals) * 100));

            // Alerts based on adherence
            if (studentAdherence < 60) {
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

      setMrr(tempMrr);
      setAlunosAtivos(tempActiveCount);
      setAlunosEmRisco(tempRiscoCount);

      // Plan counts distribution — padrão + personalizados; slugs desconhecidos
      // caem em "Outros". A lista vai completa (com zeros) para o donut manter
      // a cor atrelada ao plano, não à posição após filtrar.
      const counts = rows.reduce<Record<string, number>>((acc, r) => {
        const plano = r.tipo_plano || 'sem_plano';
        acc[plano] = (acc[plano] || 0) + 1;
        return acc;
      }, {});
      const planosDoCoach = mergedPlans(customPlans);
      const conhecidos = new Set(planosDoCoach.map(p => p.slug));
      const outrosCount = Object.entries(counts)
        .filter(([slug]) => !conhecidos.has(slug))
        .reduce((acc, [, n]) => acc + n, 0);
      setAlunosPorPlano([
        ...planosDoCoach.map(p => ({ name: p.nome, count: counts[p.slug] || 0 })),
        { name: 'Outros', count: outrosCount },
      ]);

      // 5. Counts + feeds recentes em paralelo
      const [
        { count: photosCount },
        { count: medidasCount },
        { count: feedbacksCount },
        { data: recentWorkouts },
        { data: recentManual },
        { data: recentFeedbacks },
      ] = await Promise.all([
        supabaseClient
          .from('fotos_evolucao')
          .select('id', { count: 'exact', head: true })
          .in('aluno_id', alunosIds)
          .gte('data_upload', seteDiasAtrasIso),
        supabaseClient
          .from('medidas_aluno')
          .select('id', { count: 'exact', head: true })
          .in('aluno_id', alunosIds)
          .gte('data_medicao', seteDiasAtrasIso),
        supabaseClient
          .from('feedbacks_treinos')
          .select('id', { count: 'exact', head: true })
          .in('aluno_id', alunosIds)
          .gte('created_at', seteDiasAtrasIso),
        supabaseClient
          .from('historico_treinos')
          .select('id, aluno_id, ficha_id, data_conclusao, ficha:fichas_treino(nome_rotina)')
          .in('aluno_id', alunosIds)
          .order('data_conclusao', { ascending: false })
          .limit(30),
        supabaseClient
          .from('treinos_manuais')
          .select('id, aluno_id, descricao, data_treino')
          .in('aluno_id', alunosIds)
          .eq('concluido', true)
          .order('data_treino', { ascending: false })
          .limit(20),
        supabaseClient
          .from('feedbacks_treinos')
          .select('id, aluno_id, feedback, created_at')
          .in('aluno_id', alunosIds)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      setCheckinsPendentes((photosCount || 0) + (medidasCount || 0) + (feedbacksCount || 0));

      const rawActivities: RawActivity[] = [];

      (recentWorkouts || []).forEach((w) => {
        const student = rows.find((r) => r.id === w.aluno_id);
        const routine = (w as any).ficha as { nome_rotina?: string } | null;
        rawActivities.push({
          id: w.id,
          studentId: w.aluno_id,
          studentName: student?.coaching_reference || student?.full_name || "Atleta",
          type: "workout_completed",
          workoutName: routine?.nome_rotina || "Treino Digital",
          timestamp: new Date(w.data_conclusao),
          link: `/admin/aluno/${w.aluno_id}?tab=treinos`,
        });
      });

      (recentManual || []).forEach((m) => {
        const student = rows.find((r) => r.id === m.aluno_id);
        rawActivities.push({
          id: m.id,
          studentId: m.aluno_id,
          studentName: student?.coaching_reference || student?.full_name || "Atleta",
          type: "workout_manual",
          description: m.descricao || "Treino livre",
          timestamp: new Date(m.data_treino),
          link: `/admin/aluno/${m.aluno_id}?tab=treinos`,
        });
      });

      (recentFeedbacks || []).forEach((f) => {
        const student = rows.find((r) => r.id === f.aluno_id);
        const snippet =
          f.feedback.length > 40 ? `${f.feedback.substring(0, 38)}...` : f.feedback;
        rawActivities.push({
          id: f.id,
          studentId: f.aluno_id,
          studentName: student?.coaching_reference || student?.full_name || "Atleta",
          type: "checkin_sent",
          description: `Enviou feedback: "${snippet}"`,
          timestamp: new Date(f.created_at),
          link: `/admin/aluno/${f.aluno_id}?tab=visao-geral`,
        });
      });

      setGroupedAtividades(groupActivities(rawActivities));

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

      setPrioridades(tempPrioridades);

      // 7. Faturamento mensal â€” sÃ©rie NORMALIZADA (valor rateado pela duraÃ§Ã£o do plano).
      // Eixo X: inÃ­cio fixo em Jan/2026 (inÃ­cio da operaÃ§Ã£o) atÃ© mÃªs atual + 6 (projeÃ§Ã£o).
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

      // Reutiliza os perfis jÃ¡ carregados (rows) â€” derivando o inÃ­cio do ciclo com fallback.
      for (const r of rows) {
        const valor = r.valor_plano ?? 0;
        if (valor <= 0) continue;
        const meses = duracaoMap[r.tipo_plano || 'mensal'] || 1;
        const valorPorMes = valor / meses;
        const inicio = inicioDoCiclo(r, duracaoMap);
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
      hasDataRef.current = true;
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      router.replace("/login");
      return;
    }
    void loadDashboardData({ silent: hasDataRef.current });
    // Depende só do id — evita refetch quando AuthProvider troca a referência do user
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

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
        <button onClick={() => void loadDashboardData()} className="btn-primary max-w-xs">
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-8 lg:p-10 lg:pl-28 pb-24 text-text-primary font-sans">
      <div className="w-full max-w-[min(1600px,96vw)] mx-auto">
        <DashboardHeader
          isMobile={isMobile}
          userName={coachName}
          coachStudentLimit={coachStudentLimit}
          linkedStudentCount={linkedStudentCount}
          coachAccountType={coachAccountType}
          showNotificationBadge={checkinsPendentes > 0}
        />

        {totalAlunos === 0 ? (
          <div className="bg-surface-1 border-0 rounded-xl p-12 text-center max-w-lg mx-auto mt-12 shadow-sm">
            <Users size={44} className="text-brand/40 mx-auto mb-4" />
            <h3 className="text-base font-bold text-text-primary mb-2">Nenhum aluno cadastrado ainda</h3>
            <p className="text-text-secondary text-xs mb-6">
              Adicione seu primeiro aluno para começar a prescrever treinos, acompanhar adesão e gerenciar cobranças.
            </p>
            <Link href="/admin/alunos/novo" className="btn-primary inline-flex items-center gap-2 justify-center max-w-xs mx-auto text-xs py-2 rounded-lg">
              <Plus size={14} weight="bold" /> Cadastrar Aluno
            </Link>
          </div>
        ) : isMobile ? (
          <div className="flex flex-col gap-6">
            <PriorityActionsCard actions={prioridades} />
            <DashboardKpiRow
              activeStudents={alunosAtivos}
              mrr={mrr}
              studentsAtRisk={alunosEmRisco}
              pendingCheckIns={checkinsPendentes}
              activeStudentsSubtitle={activeStudentsSubtitle}
              compact
            />
            <MrrChartCard currentMrr={mrr} chartData={chartData} />
            <PlanDistributionCard
              plans={alunosPorPlano}
              totalStudents={totalAlunos}
              collapsed
            />
            <RecentActivityFeed
              activities={groupedAtividades}
              limit={3}
              showViewAll
            />
            <StudentHealthTable
              students={saudeAlunos}
              today={today}
              formatLastWorkout={(d) => timeAgo(d) ?? "Sem treinos"}
              isMobile
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <DashboardKpiRow
              activeStudents={alunosAtivos}
              mrr={mrr}
              studentsAtRisk={alunosEmRisco}
              pendingCheckIns={checkinsPendentes}
              activeStudentsSubtitle={activeStudentsSubtitle}
            />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <MrrChartCard currentMrr={mrr} chartData={chartData} className="lg:col-span-7" />
              <PlanDistributionCard
                plans={alunosPorPlano}
                totalStudents={totalAlunos}
                className="lg:col-span-5 h-full"
              />
            </div>
            <PriorityActionsCard actions={prioridades} />
            <RecentActivityFeed activities={groupedAtividades} />
            <StudentHealthTable
              students={saudeAlunos}
              today={today}
              formatLastWorkout={(d) => timeAgo(d) ?? "Sem treinos"}
            />
          </div>
        )}
      </div>
    </div>
  );
}
