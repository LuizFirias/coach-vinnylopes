'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { Info, X } from '@phosphor-icons/react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  Rectangle,
} from 'recharts';
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { cn } from '@/lib/utils/cn';
import { GlassPanel, DASHBOARD_KPI_GLASS } from '@/components/ui/GlassPanel';
import { PlanDistributionCard } from '@/app/components/dashboard/coach/PlanDistributionCard';
import {
  fetchCoachCustomPlans,
  buildPlanDurationMap,
  mergedPlans,
  type CoachPlan,
} from '@/lib/coachPlans';
import { dataCaixaISO } from '@/lib/financeiro/types';
import { withReturnUrl } from '@/lib/utils/adminNav';

type ContratoAtencao = {
  id: string;
  nome: string;
  dataExpiracao: string;
  dias: number; // negativo = já vencido
  vencido: boolean;
};

function ChartActiveBar(props: any) {
  return (
    <Rectangle
      {...props}
      fill="#a855f7"
      stroke="none"
      strokeWidth={0}
    />
  );
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

export default function RelatoriosPage() {
  const router = useRouter();
  const receitaMesScrollRef = useRef<HTMLDivElement | null>(null);
  const receitaAcumuladaCardRef = useRef<HTMLDivElement | null>(null);
  const receitaAcumuladaInfoBtnRef = useRef<HTMLButtonElement | null>(null);
  const receitaAcumuladaTooltipRef = useRef<HTMLDivElement | null>(null);
  const [coachName, setCoachName] = useState('');
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [ativos, setAtivos] = useState(0);
  const [inadimplentes, setInadimplentes] = useState(0);
  const [receitaTotal, setReceitaTotal] = useState<number | null>(null);
  const [receitaMesVigente, setReceitaMesVigente] = useState<number | null>(null);
  const [receitaAcumuladaAno, setReceitaAcumuladaAno] = useState<number | null>(null);
  const [alunosSemValor, setAlunosSemValor] = useState(0);
  const [receitaPorPlano, setReceitaPorPlano] = useState<Record<string, number>>({});
  const [alunosPorPlano, setAlunosPorPlano] = useState<{ name: string; count: number }[]>([]);
  const [planosCatalog, setPlanosCatalog] = useState<CoachPlan[]>([]);
  const [receitaPorMes, setReceitaPorMes] = useState<{ mes: string; receita: number; futuro: boolean }[]>([]);
  const [contratosAtencao, setContratosAtencao] = useState<ContratoAtencao[]>([]);
  const [contratosModalOpen, setContratosModalOpen] = useState(false);
  const [planoDigitalAtivos, setPlanoDigitalAtivos] = useState(0);
  const [alunosSemPlano, setAlunosSemPlano] = useState(0);
  const [checkinsNoPeriodo, setCheckinsNoPeriodo] = useState(0);
  const [adesaoAlimentarMedia, setAdesaoAlimentarMedia] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receitaAcumuladaInfoOpen, setReceitaAcumuladaInfoOpen] = useState(false);
  const [receitaAcumuladaTooltipPos, setReceitaAcumuladaTooltipPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    const fetchRelatorios = async () => {
      setLoading(true);
      setError(null);
      try {
        const coachId = (await getSafeSession())?.user?.id;

        if (!coachId) { setError('Sessão inválida'); setLoading(false); return; }

        const { data: coachAlunosData, error: coachAlunosError } = await supabaseClient
          .from('coach_alunos').select('aluno_id').eq('coach_id', coachId);

        if (coachAlunosError) throw coachAlunosError;

        const customPlans: CoachPlan[] = await fetchCoachCustomPlans(coachId).catch(() => []);
        const duracaoMap = buildPlanDurationMap(customPlans);

        const { data: coachProfile } = await supabaseClient
          .from('profiles')
          .select('full_name')
          .eq('id', coachId)
          .single();
        setCoachName((coachProfile?.full_name ?? '').trim());

        const alunosIds = (coachAlunosData || []).map(ca => ca.aluno_id);

        if (alunosIds.length === 0) {
          setTotalAlunos(0); setAtivos(0); setInadimplentes(0);
          setReceitaTotal(0); setAlunosSemValor(0); setReceitaPorPlano({});
          setAlunosPorPlano([]);
          setPlanosCatalog(customPlans);
          setReceitaMesVigente(0);
          setReceitaAcumuladaAno(0);
          setReceitaPorMes([]);
          setContratosAtencao([]);
          setLoading(false); return;
        }

        // Apenas alunos não arquivados
        const baseQuery = supabaseClient
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('role', 'aluno')
          .neq('arquivado', true)
          .in('id', alunosIds);

        const { count: totalCount } = await baseQuery;

        const { count: ativosCount } = await supabaseClient
          .from('profiles').select('id', { count: 'exact' })
          .eq('role', 'aluno')
          .neq('arquivado', true)
          .eq('status_pagamento', 'pago')
          .gte('data_expiracao', new Date().toISOString())
          .in('id', alunosIds);

        const { count: inadimplenteCount } = await supabaseClient
          .from('profiles').select('id', { count: 'exact' })
          .eq('role', 'aluno')
          .neq('arquivado', true)
          .or(`status_pagamento.neq.pago,data_expiracao.lt.${new Date().toISOString()}`)
          .in('id', alunosIds);

        const { data: valoresData, error: valoresError } = await supabaseClient
          .from('profiles').select('valor_plano, tipo_plano')
          .eq('role', 'aluno')
          .neq('arquivado', true)
          .eq('status_pagamento', 'pago')
          .gte('data_expiracao', new Date().toISOString())
          .in('id', alunosIds);

        if (valoresError) throw valoresError;

        const valores = (valoresData as { valor_plano: number | null; tipo_plano: string | null }[]) || [];
        const soma = valores.reduce((acc, row) => acc + (row.valor_plano ?? 0), 0);
        const semValor = valores.filter((row) => row.valor_plano === null).length;

        const porPlano = valores.reduce<Record<string, number>>((acc, row) => {
          const plano = row.tipo_plano || 'sem_plano';
          acc[plano] = (acc[plano] || 0) + (row.valor_plano ?? 0);
          return acc;
        }, {});

        const countsPlano = valores.reduce<Record<string, number>>((acc, row) => {
          const plano = row.tipo_plano || 'sem_plano';
          acc[plano] = (acc[plano] || 0) + 1;
          return acc;
        }, {});

        // Mesma lógica da dashboard: padrão + personalizados; slugs desconhecidos → "Outros"
        const planosDoCoach = mergedPlans(customPlans);
        const conhecidos = new Set(planosDoCoach.map((p) => p.slug));
        const outrosCount = Object.entries(countsPlano)
          .filter(([slug]) => !conhecidos.has(slug))
          .reduce((acc, [, n]) => acc + n, 0);
        const alunosPorPlanoList = [
          ...planosDoCoach.map((p) => ({ name: p.nome, count: countsPlano[p.slug] || 0 })),
          { name: 'Outros', count: outrosCount },
        ];

        // Projeção & Receita por mês — série NORMALIZADA (valor rateado pela duração do plano).
        // Eixo X: início fixo em Jan/2026 (início da operação) até mês atual + 6 (projeção).
        const { data: historicoData } = await supabaseClient
          .from('profiles')
          .select('id, coaching_reference, full_name, valor_plano, data_inicio, data_expiracao, created_at, tipo_plano')
          .eq('role', 'aluno')
          .neq('arquivado', true)
          .in('id', alunosIds);

        const { data: historicoFinanceiroData } = await supabaseClient
          .from('aluno_planos_historico')
          .select('valor_plano, registrado_em, data_pagamento, status_pagamento')
          .in('aluno_id', alunosIds)
          .eq('status_pagamento', 'pago');

        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtualKey = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
        const rangeStart = new Date(2026, 0, 1);
        const rangeEnd = new Date(hoje.getFullYear(), hoje.getMonth() + 6, 1);
        const mesMap: Record<string, number> = {};
        const receitaPagamentosAcumulada = (historicoFinanceiroData || [])
          .filter((row) => {
            const iso = dataCaixaISO(row);
            if (!iso) return false;
            return Number(iso.slice(0, 4)) === anoAtual;
          })
          .reduce((acc, row) => acc + (row.valor_plano ?? 0), 0);
        // Receita do mês vigente = valor rateado pela duração (ex.: trimestral 450 → 150/mês)
        const receitaMesRateada = valores.reduce((acc, row) => {
          const meses = duracaoMap[row.tipo_plano || 'mensal'] || 1;
          return acc + (row.valor_plano ?? 0) / meses;
        }, 0);
        const mesKeys: string[] = [];
        for (let d = new Date(rangeStart); d <= rangeEnd; d.setMonth(d.getMonth() + 1)) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          mesMap[key] = 0;
          mesKeys.push(key);
        }

        for (const row of (historicoData || []) as {
          id: string;
          coaching_reference: string | null;
          full_name: string | null;
          valor_plano: number | null;
          data_inicio: string | null;
          data_expiracao: string | null;
          created_at: string | null;
          tipo_plano: string | null;
        }[]) {
          const valor = row.valor_plano ?? 0;
          if (valor <= 0) continue;
          const meses = duracaoMap[row.tipo_plano || 'mensal'] || 1;
          const valorPorMes = valor / meses;
          const inicio = inicioDoCiclo(row, duracaoMap);
          if (!inicio) continue;
          for (let m = 0; m < meses; m++) {
            const d = new Date(inicio.getFullYear(), inicio.getMonth() + m, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (key in mesMap) mesMap[key] += valorPorMes;
          }
        }

        const contratos: ContratoAtencao[] = [];
        for (const row of (historicoData || []) as {
          id: string;
          coaching_reference: string | null;
          full_name: string | null;
          data_expiracao: string | null;
        }[]) {
          if (!row.data_expiracao) continue;
          const expiration = new Date(row.data_expiracao);
          if (Number.isNaN(expiration.getTime())) continue;
          const diffDays = Math.ceil(
            (expiration.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
          );
          // Já vencidos OU a ≤ 10 dias do vencimento
          if (diffDays > 10) continue;
          contratos.push({
            id: row.id,
            nome: row.coaching_reference || row.full_name || 'Atleta',
            dataExpiracao: row.data_expiracao,
            dias: diffDays,
            vencido: diffDays < 0,
          });
        }
        contratos.sort((a, b) => a.dias - b.dias);
        const mesList = mesKeys.map((mes) => {
          const [ano, m] = mes.split('-');
          const label = new Date(Number(ano), Number(m) - 1, 1)
            .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          return { mes: label, receita: Math.round(mesMap[mes]), futuro: mes > mesAtualKey };
        });

        // 2c. Fetch active digital plans
        const { data: activePlans } = await supabaseClient
          .from('nutrition_plans')
          .select(`
            id,
            student_id,
            days:nutrition_plan_days (
              id,
              meals:nutrition_meals (
                id
              )
            )
          `)
          .in('student_id', alunosIds)
          .eq('status', 'active');

        const activePlanIds = activePlans?.map(p => p.id) || [];
        
        // Check-ins for the current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);
        
        const { data: checkinsThisMonth } = activePlanIds.length > 0
          ? await supabaseClient
              .from('nutrition_meal_checkins')
              .select('id, status, checkin_date')
              .in('plan_id', activePlanIds)
              .gte('checkin_date', startOfMonth.toISOString().slice(0, 10))
          : { data: [] };

        // Adherence 7 days calculation
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: checkins7d } = activePlanIds.length > 0
          ? await supabaseClient
              .from('nutrition_meal_checkins')
              .select('status')
              .in('plan_id', activePlanIds)
              .gte('checkin_date', sevenDaysAgo.toISOString().slice(0, 10))
          : { data: [] };

        let totalExpected7dMeals = 0;
        let totalChecked7dWeight = 0;
        activePlans?.forEach(p => {
          const mCount = p.days?.[0]?.meals?.length || 0;
          totalExpected7dMeals += mCount * 7;
        });

        checkins7d?.forEach(c => {
          if (c.status === 'done' || c.status === 'substituted') totalChecked7dWeight += 1.0;
          else if (c.status === 'partial') totalChecked7dWeight += 0.5;
        });

        const adherence7d = totalExpected7dMeals > 0
          ? Math.min(100, Math.round((totalChecked7dWeight / totalExpected7dMeals) * 100))
          : 0;

        setPlanoDigitalAtivos(activePlans?.length || 0);
        setAlunosSemPlano((totalCount || 0) - (activePlans?.length || 0));
        setCheckinsNoPeriodo(checkinsThisMonth?.length || 0);
        setAdesaoAlimentarMedia(adherence7d);

        setTotalAlunos(totalCount || 0); setAtivos(ativosCount || 0);
        setInadimplentes(inadimplenteCount || 0); setReceitaTotal(soma);
        setAlunosSemValor(semValor); setReceitaPorPlano(porPlano);
        setAlunosPorPlano(alunosPorPlanoList);
        setPlanosCatalog(customPlans);
        setReceitaMesVigente(receitaMesRateada);
        setReceitaAcumuladaAno(receitaPagamentosAcumulada);
        setReceitaPorMes(mesList);
        setContratosAtencao(contratos);
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar relatórios');
      } finally {
        setLoading(false);
      }
    };

    fetchRelatorios();
  }, []);

  const planosDoCoach = mergedPlans(planosCatalog);
  const chartData = planosDoCoach
    .map((p) => ({
      name: p.nome,
      receita: receitaPorPlano[p.slug] || 0,
    }))
    .filter((p) => p.receita > 0);

  const lastRealizadoIdx = (() => {
    for (let i = receitaPorMes.length - 1; i >= 0; i--) {
      if (!receitaPorMes[i]?.futuro) return i;
    }
    return -1;
  })();
  const receitaLinhaData = receitaPorMes.map((d, i) => ({
    mes: d.mes,
    futuro: d.futuro,
    receita: d.receita,
    realizado: d.futuro ? null : d.receita,
    projecao: d.futuro || i === lastRealizadoIdx ? d.receita : null,
  }));
  const receitaPorPlanoResumo = [
    ...planosDoCoach.map((p) => ({
      label: p.nome,
      val: receitaPorPlano[p.slug] || 0,
    })),
    {
      label: 'Outros',
      val: Object.entries(receitaPorPlano)
        .filter(([slug]) => !planosDoCoach.some((p) => p.slug === slug))
        .reduce((acc, [, n]) => acc + n, 0),
    },
  ].filter((item) => item.val > 0);

  const tooltipStyle = {
    backgroundColor: '#1F1F23',
    border: '1px solid #27272A',
    borderRadius: '6px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    padding: '8px 12px',
  };

  const fmt = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const primeiroNome =
    coachName.trim().split(/\s+/).filter(Boolean)[0] || 'Coach';

  /** Adesão: baixo vermelho → médio amarelo → alto verde */
  const adesaoColorClass =
    adesaoAlimentarMedia > 80
      ? 'text-success'
      : adesaoAlimentarMedia > 33
        ? 'text-warning'
        : 'text-danger';

  /** Sem plano: 0 = bom (verde); até 33% dos ativos = amarelo; acima = vermelho */
  const semPlanoColorClass = (() => {
    if (alunosSemPlano === 0) return 'text-success';
    if (ativos <= 0) return 'text-danger';
    const ratioPct = (alunosSemPlano / ativos) * 100;
    return ratioPct > 33 ? 'text-danger' : 'text-warning';
  })();

  useEffect(() => {
    if (!contratosModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContratosModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [contratosModalOpen]);

  useEffect(() => {
    if (!receitaMesScrollRef.current || receitaPorMes.length === 0) return;

    const barStep = 52; // acompanha o width usado no gráfico
    let mesAtualIndex = 0;
    for (let i = receitaPorMes.length - 1; i >= 0; i--) {
      if (!receitaPorMes[i]?.futuro) {
        mesAtualIndex = i;
        break;
      }
    }

    const targetCenter = mesAtualIndex * barStep + barStep / 2;
    const targetScrollLeft = Math.max(
      0,
      targetCenter - receitaMesScrollRef.current.clientWidth / 2,
    );
    receitaMesScrollRef.current.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
  }, [receitaPorMes]);

  useEffect(() => {
    if (!receitaAcumuladaInfoOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const clickedCard = receitaAcumuladaCardRef.current?.contains(target);
      const clickedTooltip = receitaAcumuladaTooltipRef.current?.contains(target);
      if (!clickedCard && !clickedTooltip) {
        setReceitaAcumuladaInfoOpen(false);
        setReceitaAcumuladaTooltipPos(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setReceitaAcumuladaInfoOpen(false);
        setReceitaAcumuladaTooltipPos(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [receitaAcumuladaInfoOpen]);

  useEffect(() => {
    if (!receitaAcumuladaInfoOpen) return;

    const updateTooltipPosition = () => {
      const rect = receitaAcumuladaInfoBtnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(320, window.innerWidth - 24);
      const left = Math.min(
        Math.max(12, rect.right - width),
        window.innerWidth - width - 12,
      );
      setReceitaAcumuladaTooltipPos({
        top: rect.bottom + 8,
        left,
        width,
      });
    };

    updateTooltipPosition();
    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition, true);
    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition, true);
    };
  }, [receitaAcumuladaInfoOpen]);

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:pl-28 pb-24">
      <div className="w-full max-w-[min(1600px,96vw)] mx-auto">

        {/* Header */}
        <div className="mb-6 py-4 border-b border-divider">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-text-primary font-display">
            Olá, <span className="text-brand">{primeiroNome}</span>
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-danger/10 border border-danger/20 text-danger rounded-lg text-xs font-semibold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <DumbbellLoader variant="inline" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Alunos', value: totalAlunos, color: 'text-text-primary' },
                { label: 'Alunos Pagos', value: ativos, color: 'text-success' },
                { label: 'Pendentes', value: inadimplentes, color: inadimplentes > 0 ? 'text-danger font-semibold' : 'text-success font-semibold' },
              ].map(item => (
                <div
                  key={item.label}
                  className="bg-surface-1 border-0 shadow-sm rounded-lg p-4 h-20 flex flex-col justify-center"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">{item.label}</p>
                  <p className={cn('text-xl font-bold mt-0.5', item.color)}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Revenue + Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mobile: cards de receita arrastáveis */}
              <div className="md:hidden -mx-1 overflow-x-auto overflow-y-visible px-1 pb-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex gap-3 min-w-max">
                  <div className="snap-start w-[88vw] max-w-[420px] rounded-xl border border-white/10 bg-[rgba(117, 27, 180,0.12)] px-4 pb-4 pt-3 backdrop-blur-xl backdrop-saturate-125 shadow-[0_4px_12px_rgba(0,0,0,0.12)] relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-bl-[80px]" />
                    <div>
                      <p className="coach-kpi-label text-[10px] font-semibold uppercase tracking-wider mb-1">
                        Receita Mensal
                      </p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="coach-kpi-subtitle text-sm font-semibold">R$</span>
                        <span className="coach-kpi-value text-2xl font-bold font-kpi tabular-nums lining-nums tracking-headline leading-none">
                          {receitaMesVigente !== null
                            ? receitaMesVigente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '—'}
                        </span>
                      </div>
                    </div>
                    <p className="text-[9px] text-text-tertiary mt-2 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-brand/80" />
                      Planos ativos rateados neste mês (ex.: trimestral ÷ 3)
                    </p>
                  </div>

                  <div className="snap-start w-[88vw] max-w-[420px] rounded-xl border border-white/10 bg-[rgba(117, 27, 180,0.12)] px-4 pb-4 pt-3 backdrop-blur-xl backdrop-saturate-125 shadow-[0_4px_12px_rgba(0,0,0,0.12)] relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-bl-[80px]" />
                    <div>
                      <p className="coach-kpi-label text-[10px] font-semibold uppercase tracking-wider mb-1">
                        Receita Total Bruta
                      </p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="coach-kpi-subtitle text-sm font-semibold">R$</span>
                        <span className="coach-kpi-value text-2xl font-bold font-kpi tabular-nums lining-nums tracking-headline leading-none">
                          {receitaTotal !== null ? receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </span>
                      </div>
                    </div>
                    {alunosSemValor > 0 ? (
                      <div className="mt-3 p-2 bg-brand-subtle/50 border border-brand-border/20 rounded-lg flex items-center gap-2">
                        <span className="text-xs">⚠️</span>
                        <p className="text-[10px] text-text-secondary leading-tight">
                          {alunosSemValor} alunos pagos sem valor definido no perfil.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[9px] text-text-tertiary mt-2 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-text-disabled" />
                        Baseado em status &quot;Pago&quot; e plano vigente
                      </p>
                    )}
                  </div>

                  <div
                    ref={receitaAcumuladaCardRef}
                    className="snap-start w-[88vw] max-w-[420px] rounded-xl border border-white/10 bg-[rgba(117, 27, 180,0.12)] px-4 pb-4 pt-3 backdrop-blur-xl backdrop-saturate-125 shadow-[0_4px_12px_rgba(0,0,0,0.12)] relative overflow-visible flex flex-col justify-between min-h-[140px]"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 rounded-bl-[80px]" />
                    {receitaAcumuladaInfoOpen && (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 z-20 rounded-xl bg-black/25"
                      />
                    )}
                    <div>
                      <div className="relative mb-1 flex items-center justify-between gap-2">
                        <p className="coach-kpi-label text-[10px] font-semibold uppercase tracking-wider">
                          Faturamento anual
                        </p>
                        <button
                          ref={receitaAcumuladaInfoBtnRef}
                          type="button"
                          aria-label="Como calculamos faturamento anual"
                          aria-expanded={receitaAcumuladaInfoOpen}
                          onClick={() =>
                            setReceitaAcumuladaInfoOpen((open) => {
                              if (open) setReceitaAcumuladaTooltipPos(null);
                              return !open;
                            })
                          }
                          className={cn(
                            'coach-kpi-info-btn z-20 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all active:scale-95',
                            receitaAcumuladaInfoOpen && 'is-open',
                          )}
                        >
                          <Info size={14} weight="bold" />
                        </button>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="coach-kpi-subtitle text-sm font-semibold">R$</span>
                        <span className="coach-kpi-value text-2xl font-bold font-kpi tabular-nums lining-nums tracking-headline leading-none">
                          {receitaAcumuladaAno !== null
                            ? receitaAcumuladaAno.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '—'}
                        </span>
                      </div>
                    </div>
                    <p className="text-[9px] text-text-tertiary mt-2 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-success/80" />
                      Soma de planos pagos e renovações registradas no ano
                    </p>
                  </div>
                </div>
              </div>

              {/* Desktop: stack Receita Mensal → Bruta */}
              <div className="hidden md:flex flex-col gap-4">
                <div className="rounded-xl border border-white/10 bg-[rgba(117, 27, 180,0.12)] px-4 pb-4 pt-3 backdrop-blur-xl backdrop-saturate-125 shadow-[0_4px_12px_rgba(0,0,0,0.12)] relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-bl-[80px]" />
                  <div>
                    <p className="coach-kpi-label text-[10px] font-semibold uppercase tracking-wider mb-1">
                      Receita Mensal
                    </p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="coach-kpi-subtitle text-sm font-semibold">R$</span>
                      <span className="coach-kpi-value text-2xl font-bold font-kpi tabular-nums lining-nums tracking-headline leading-none">
                        {receitaMesVigente !== null
                          ? receitaMesVigente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : '—'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] text-text-tertiary mt-2 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-brand/80" />
                    Planos ativos rateados neste mês (ex.: trimestral ÷ 3)
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-[rgba(117, 27, 180,0.12)] px-4 pb-4 pt-3 backdrop-blur-xl backdrop-saturate-125 shadow-[0_4px_12px_rgba(0,0,0,0.12)] relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-bl-[80px]" />
                  <div>
                    <p className="coach-kpi-label text-[10px] font-semibold uppercase tracking-wider mb-1">
                      Receita Total Bruta
                    </p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="coach-kpi-subtitle text-sm font-semibold">R$</span>
                      <span className="coach-kpi-value text-2xl font-bold font-kpi tabular-nums lining-nums tracking-headline leading-none">
                        {receitaTotal !== null ? receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                      </span>
                    </div>
                  </div>
                  {alunosSemValor > 0 ? (
                    <div className="mt-3 p-2 bg-brand-subtle/50 border border-brand-border/20 rounded-lg flex items-center gap-2">
                      <span className="text-xs">⚠️</span>
                      <p className="text-[10px] text-text-secondary leading-tight">
                        {alunosSemValor} alunos pagos sem valor definido no perfil.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[9px] text-text-tertiary mt-2 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-text-disabled" />
                      Baseado em status &quot;Pago&quot; e plano vigente
                    </p>
                  )}
                </div>
              </div>

              {/* Distribuição por plano — mesmo donut da dashboard */}
              <div className="bg-surface-1 border-0 shadow-sm rounded-xl p-4 md:p-5">
                <PlanDistributionCard
                  plans={alunosPorPlano}
                  totalStudents={ativos}
                  align="start"
                />
              </div>
            </div>

            {/* Receita mensal — passado + projeção (linha) */}
            <div className="bg-surface-1 border-0 shadow-sm rounded-lg p-4 md:p-5">
              <div className="mb-2 flex justify-end">
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="flex items-center gap-1 text-[9px] text-text-tertiary font-bold uppercase">
                    <span className="w-2 h-0.5 rounded bg-brand/40 inline-block border-t border-dashed border-brand/50" />
                    Projeção
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-text-tertiary font-bold uppercase">
                    <span className="w-2 h-0.5 rounded bg-brand inline-block" />
                    Realizado
                  </span>
                </div>
              </div>
              
              <div
                ref={receitaMesScrollRef}
                className="overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                <div style={{ width: `${Math.max(receitaPorMes.length * 52, 1)}px`, height: 180, minWidth: 0, minHeight: 180 }}>
                  <LineChart
                    width={Math.max(receitaPorMes.length * 52, 1)}
                    height={180}
                    data={receitaLinhaData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <XAxis dataKey="mes" stroke="#8e8e93" fontSize={8} fontWeight="bold" tickLine={false} axisLine={false} dy={8} />
                    <YAxis stroke="#8e8e93" fontSize={8} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} width={44} />
                    <Tooltip
                      cursor={{ stroke: 'rgba(117, 27, 180,0.25)', strokeWidth: 1 }}
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: '#a0a0a0', fontWeight: 'bold', fontSize: 10 }}
                      labelStyle={{ color: '#ffffff', marginBottom: 2, fontSize: 10 }}
                      formatter={(value: number, name: string) => [
                        fmt(value),
                        name === 'projecao' ? 'Projeção' : 'Realizado',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="realizado"
                      stroke="#751BB4"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#751BB4', strokeWidth: 0 }}
                      activeDot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="projecao"
                      stroke="rgba(117, 27, 180,0.45)"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={{ r: 3, fill: 'rgba(117, 27, 180,0.45)', strokeWidth: 0 }}
                      activeDot={{ r: 4, fill: 'rgba(117, 27, 180,0.7)', strokeWidth: 0 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </div>
              </div>
            </div>

            {/* Contratos próximos do fim */}
            <div
              className={cn(
                'rounded-xl px-4 py-3 flex items-center justify-between gap-3 min-h-[3.25rem]',
                contratosAtencao.length > 0
                  ? 'border border-warning/25 bg-warning/10'
                  : 'border border-white/10 bg-surface-1',
              )}
            >
              <p
                className={cn(
                  'text-[11px] font-bold uppercase tracking-wider',
                  contratosAtencao.length > 0 ? 'text-warning' : 'text-text-secondary',
                )}
              >
                Contratos próximos do fim
              </p>
              <button
                type="button"
                onClick={() => setContratosModalOpen(true)}
                style={{ touchAction: 'manipulation' }}
                className={cn(
                  'shrink-0 text-[11px] font-semibold bg-transparent border-0 cursor-pointer transition-colors',
                  contratosAtencao.length > 0
                    ? 'text-warning hover:text-warning/80'
                    : 'text-brand hover:text-brand-hover',
                )}
              >
                Ver mais
              </button>
            </div>

            {/* Receita por tipo de plano */}
            <div className="bg-surface-1 border-0 shadow-sm rounded-lg p-3 md:p-4">
              <div className="w-full min-w-0" style={{ height: 160, minHeight: 160 }}>
                <ResponsiveContainer width="100%" height={160} debounce={50} minWidth={0}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#8e8e93" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} dy={4} />
                    <YAxis stroke="#8e8e93" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                    <Tooltip
                      cursor={false}
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: '#a0a0a0', fontWeight: 'bold', fontSize: 10 }}
                      labelStyle={{ color: '#ffffff', marginBottom: 2, fontSize: 10 }}
                      formatter={(value: number) => [fmt(value), 'Receita']}
                    />
                    <Bar dataKey="receita" radius={[2, 2, 0, 0]} barSize={26} activeBar={<ChartActiveBar />}>
                      {chartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === 0
                              ? '#751BB4'
                              : `rgba(117, 27, 180,${Math.max(0.25, 1 - index * 0.15)})`
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Receita por plano (escrito) — todos os planos com receita > 0 */}
            <div className="bg-surface-1 border-0 shadow-sm rounded-lg p-3 md:p-4">
              <div className="space-y-1">
                {receitaPorPlanoResumo.length === 0 ? (
                  <p className="text-[11px] text-text-tertiary py-1">Nenhuma receita por plano no momento.</p>
                ) : (
                  receitaPorPlanoResumo.map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between items-center px-2.5 py-2 rounded-lg"
                    >
                      <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wide">
                        {item.label}
                      </span>
                      <span className="text-xs font-bold text-text-primary font-kpi tabular-nums lining-nums">
                        {fmt(item.val)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Nutrition summary */}
            <div className="bg-surface-1 border-0 shadow-sm rounded-lg p-4 md:p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-surface-1 border-0 rounded-lg flex flex-col justify-center">
                  <span className="text-[8px] uppercase font-bold text-text-tertiary">Adesão Alimentar Média</span>
                  <span className={cn('text-base font-bold font-kpi tabular-nums lining-nums mt-1', adesaoColorClass)}>
                    {adesaoAlimentarMedia}%
                  </span>
                </div>
                <div className="p-3 bg-surface-1 border-0 rounded-lg flex flex-col justify-center">
                  <span className="text-[8px] uppercase font-bold text-text-tertiary">Planos Digitais Ativos</span>
                  <span className="text-base font-bold text-text-primary font-kpi tabular-nums lining-nums mt-1">{planoDigitalAtivos}</span>
                </div>
                <div className="p-3 bg-surface-1 border-0 rounded-lg flex flex-col justify-center">
                  <span className="text-[8px] uppercase font-bold text-text-tertiary">Alunos Sem Plano</span>
                  <span className={cn('text-base font-bold font-kpi tabular-nums lining-nums mt-1', semPlanoColorClass)}>
                    {alunosSemPlano}
                  </span>
                </div>
                <div className="p-3 bg-surface-1 border-0 rounded-lg flex flex-col justify-center">
                  <span className="text-[8px] uppercase font-bold text-text-tertiary">Check-ins no Mês</span>
                  <span className="text-base font-bold text-brand font-kpi tabular-nums lining-nums mt-1">{checkinsNoPeriodo}</span>
                </div>
              </div>
            </div>
            
          </div>
        )}

        {receitaAcumuladaInfoOpen && receitaAcumuladaTooltipPos && (
          <div
            ref={receitaAcumuladaTooltipRef}
            className="fixed z-[120]"
            style={{
              top: receitaAcumuladaTooltipPos.top,
              left: receitaAcumuladaTooltipPos.left,
              width: receitaAcumuladaTooltipPos.width,
            }}
          >
            <GlassPanel
              role="tooltip"
              variant={DASHBOARD_KPI_GLASS}
              shine="subtle"
              className="coach-kpi-tooltip"
            >
              <div className="px-3 py-2.5">
                <p className="coach-kpi-tooltip-title text-[10px] font-semibold uppercase tracking-wider mb-1">
                  Faturamento anual
                </p>
                <p className="coach-kpi-tooltip-body text-[11px] leading-relaxed">
                  Soma dos registros de planos com status pago no histórico financeiro do aluno, incluindo novas contratações e renovações do ano corrente.
                </p>
              </div>
            </GlassPanel>
          </div>
        )}

        {contratosModalOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] animate-backdrop-in"
                onClick={() => setContratosModalOpen(false)}
                aria-hidden
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="contratos-modal-title"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    'pointer-events-auto relative w-full max-w-md rounded-2xl',
                    'bg-brand shadow-[0_20px_60px_rgba(147,51,234,0.45)]',
                    'animate-sheet-up max-h-[min(85vh,520px)] flex flex-col overflow-hidden',
                  )}
                >
                  <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-white/15 shrink-0">
                    <div className="min-w-0">
                      <p
                        id="contratos-modal-title"
                        className="text-[16px] font-bold text-white"
                      >
                        Contratos próximos do fim
                      </p>
                      <p className="text-[12px] text-white/70 mt-0.5">
                        Vencidos e a vencer em até 10 dias
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setContratosModalOpen(false)}
                      aria-label="Fechar"
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white hover:bg-white/10 active:scale-95 border-0 bg-transparent cursor-pointer"
                    >
                      <X size={16} weight="bold" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
                    {contratosAtencao.length === 0 ? (
                      <p className="text-[13px] text-white/70 py-6 text-center">
                        Nenhum contrato vencido ou próximo do vencimento.
                      </p>
                    ) : (
                      <ul className="flex flex-col divide-y divide-white/10">
                        {contratosAtencao.map((aluno) => (
                          <li
                            key={aluno.id}
                            className="py-3 flex items-center justify-between gap-3"
                          >
                            <span className="text-[14px] font-medium text-white truncate min-w-0">
                              {aluno.nome}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setContratosModalOpen(false);
                                router.push(
                                  withReturnUrl(
                                    `/admin/aluno/${aluno.id}?tab=financeiro&renovar=1`,
                                    '/admin/relatorios',
                                  ),
                                );
                              }}
                              className="shrink-0 text-[12px] font-semibold text-white/90 hover:text-white underline-offset-2 hover:underline bg-transparent border-0 cursor-pointer"
                            >
                              Renovar
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </>,
            document.body,
          )}
      </div>
    </div>
  );
}
