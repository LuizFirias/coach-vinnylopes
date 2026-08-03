'use client';

import { useEffect, useRef, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { Info } from '@phosphor-icons/react';
import {
  BarChart,
  Bar,
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
import { fetchCoachCustomPlans, buildPlanDurationMap, type CoachPlan } from '@/lib/coachPlans';

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
  const receitaMesScrollRef = useRef<HTMLDivElement | null>(null);
  const receitaAcumuladaCardRef = useRef<HTMLDivElement | null>(null);
  const receitaAcumuladaInfoBtnRef = useRef<HTMLButtonElement | null>(null);
  const receitaAcumuladaTooltipRef = useRef<HTMLDivElement | null>(null);
  const [coachName, setCoachName] = useState('');
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [ativos, setAtivos] = useState(0);
  const [inadimplentes, setInadimplentes] = useState(0);
  const [receitaTotal, setReceitaTotal] = useState<number | null>(null);
  const [receitaAcumuladaAno, setReceitaAcumuladaAno] = useState<number | null>(null);
  const [alunosSemValor, setAlunosSemValor] = useState(0);
  const [receitaMensal, setReceitaMensal] = useState<number | null>(null);
  const [receitaMulti, setReceitaMulti] = useState<number | null>(null);
  const [receitaPorPlano, setReceitaPorPlano] = useState<Record<string, number>>({});
  const [alunosPorPlano, setAlunosPorPlano] = useState<Record<string, number>>({});
  const [receitaPorMes, setReceitaPorMes] = useState<{ mes: string; receita: number; futuro: boolean }[]>([]);
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
          setAlunosPorPlano({}); setReceitaMensal(0); setReceitaMulti(0);
          setReceitaAcumuladaAno(0);
          setReceitaPorMes([]); setLoading(false); return;
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

        const totalMensal = valores
          .filter((row) => row.tipo_plano === 'mensal')
          .reduce((acc, row) => acc + (row.valor_plano ?? 0), 0);

        const totalMulti = valores
          .filter((row) => row.tipo_plano === 'trimestral' || row.tipo_plano === 'semestral')
          .reduce((acc, row) => acc + (row.valor_plano ?? 0), 0);

        // Projeção & Receita por mês — série NORMALIZADA (valor rateado pela duração do plano).
        // Eixo X: início fixo em Jan/2026 (início da operação) até mês atual + 6 (projeção).
        const { data: historicoData } = await supabaseClient
          .from('profiles')
          .select('valor_plano, data_inicio, data_expiracao, created_at, tipo_plano')
          .eq('role', 'aluno')
          .neq('arquivado', true)
          .not('valor_plano', 'is', null)
          .in('id', alunosIds);

        const { data: historicoFinanceiroData } = await supabaseClient
          .from('aluno_planos_historico')
          .select('valor_plano, registrado_em, status_pagamento')
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
            const d = new Date(row.registrado_em);
            return !Number.isNaN(d.getTime()) && d.getFullYear() === anoAtual;
          })
          .reduce((acc, row) => acc + (row.valor_plano ?? 0), 0);
        const mesKeys: string[] = [];
        for (let d = new Date(rangeStart); d <= rangeEnd; d.setMonth(d.getMonth() + 1)) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          mesMap[key] = 0;
          mesKeys.push(key);
        }

        for (const row of (historicoData || []) as { valor_plano: number; data_inicio: string | null; data_expiracao: string | null; created_at: string | null; tipo_plano: string | null }[]) {
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
        setAlunosPorPlano(countsPlano); setReceitaMensal(totalMensal); setReceitaMulti(totalMulti);
        setReceitaAcumuladaAno(receitaPagamentosAcumulada);
        setReceitaPorMes(mesList);
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar relatórios');
      } finally {
        setLoading(false);
      }
    };

    fetchRelatorios();
  }, []);

  const chartData = [
    { name: 'Mensal', receita: receitaPorPlano.mensal || 0, alunos: alunosPorPlano.mensal || 0 },
    { name: 'Trimestral', receita: receitaPorPlano.trimestral || 0, alunos: alunosPorPlano.trimestral || 0 },
    { name: 'Semestral', receita: receitaPorPlano.semestral || 0, alunos: alunosPorPlano.semestral || 0 },
  ];

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
                  <div className="snap-start w-[88vw] max-w-[420px] rounded-xl border border-white/10 bg-[rgba(117, 27, 180,0.12)] px-4 pb-4 pt-3 backdrop-blur-xl backdrop-saturate-125 shadow-[0_8px_24px_rgba(0,0,0,0.28)] relative overflow-hidden flex flex-col justify-between min-h-[140px]">
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
                    className="snap-start w-[88vw] max-w-[420px] rounded-xl border border-white/10 bg-[rgba(117, 27, 180,0.12)] px-4 pb-4 pt-3 backdrop-blur-xl backdrop-saturate-125 shadow-[0_8px_24px_rgba(0,0,0,0.28)] relative overflow-visible flex flex-col justify-between min-h-[140px]"
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

              {/* Desktop: receita total (mantém leitura original) */}
              <div className="hidden md:flex rounded-xl border border-white/10 bg-[rgba(117, 27, 180,0.12)] px-4 pb-4 pt-3 backdrop-blur-xl backdrop-saturate-125 shadow-[0_8px_24px_rgba(0,0,0,0.28)] relative overflow-hidden flex-col justify-between min-h-[140px]">
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

              {/* Distribuição por plano */}
              <div className="bg-surface-1 border-0 shadow-sm rounded-xl p-4 md:p-5 flex flex-col justify-between">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Mensal', count: alunosPorPlano.mensal || 0, color: 'bg-brand' },
                    { label: 'Trimestral', count: alunosPorPlano.trimestral || 0, color: 'bg-brand/60' },
                    { label: 'Semestral', count: alunosPorPlano.semestral || 0, color: 'bg-brand/30' },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col justify-between p-2 bg-surface-1 border-0 rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', item.color)} />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary truncate">{item.label}</span>
                      </div>
                      <span className="text-xs font-bold text-text-primary mt-2">
                        {item.count} <span className="text-[9px] text-text-tertiary font-medium">UN</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Receita mensal — passado + projeção */}
            <div className="bg-surface-1 border-0 shadow-sm rounded-lg p-4 md:p-5">
              <div className="mb-2 flex justify-end">
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="flex items-center gap-1 text-[9px] text-text-tertiary font-bold uppercase">
                    <span className="w-2 h-2 rounded bg-brand/30 border border-brand/40 inline-block" />
                    Projeção
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-text-tertiary font-bold uppercase">
                    <span className="w-2 h-2 rounded bg-brand inline-block" />
                    Realizado
                  </span>
                </div>
              </div>
              
              <div
                ref={receitaMesScrollRef}
                className="overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                <div style={{ width: `${Math.max(receitaPorMes.length * 52, 1)}px`, height: 180, minWidth: 0, minHeight: 180 }}>
                  <BarChart
                    width={Math.max(receitaPorMes.length * 52, 1)}
                    height={180}
                    data={receitaPorMes}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <XAxis dataKey="mes" stroke="#8e8e93" fontSize={8} fontWeight="bold" tickLine={false} axisLine={false} dy={8} />
                    <YAxis stroke="#8e8e93" fontSize={8} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} width={44} />
                    <Tooltip
                      cursor={false}
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: '#a0a0a0', fontWeight: 'bold', fontSize: 10 }}
                      labelStyle={{ color: '#ffffff', marginBottom: 2, fontSize: 10 }}
                      formatter={(value: number, _name: string, props: any) => [
                        fmt(value),
                        props.payload.futuro ? 'Projeção' : 'Realizado',
                      ]}
                    />
                    <Bar dataKey="receita" radius={[2, 2, 0, 0]} barSize={18} activeBar={<ChartActiveBar />}>
                      {receitaPorMes.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.futuro ? 'rgba(117, 27, 180,0.25)' : '#751BB4'}
                          stroke={entry.futuro ? 'rgba(117, 27, 180,0.5)' : 'none'}
                          strokeWidth={entry.futuro ? 1 : 0}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </div>
              </div>
            </div>

            {/* Charts por tipo de plano */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-surface-1 border-0 shadow-sm rounded-lg p-4 md:p-5 h-[280px] flex flex-col justify-between">
                <div className="w-full min-w-0" style={{ height: 220, minHeight: 220 }}>
                  <ResponsiveContainer width="100%" height={220} debounce={50} minWidth={0}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#8e8e93" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} dy={8} />
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
                            fill={index === 0 ? '#751BB4' : index === 1 ? 'rgba(117, 27, 180,0.6)' : '#52525B'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-surface-1 border-0 shadow-sm rounded-lg p-4 md:p-5 h-[280px] flex flex-col justify-between">
                <div className="w-full min-w-0" style={{ height: 220, minHeight: 220 }}>
                  <ResponsiveContainer width="100%" height={220} debounce={50} minWidth={0}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#8e8e93" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} dy={8} />
                      <YAxis stroke="#8e8e93" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={false}
                        contentStyle={tooltipStyle}
                        labelStyle={{ color: '#ffffff', marginBottom: 2, fontSize: 10 }}
                        itemStyle={{ color: '#a0a0a0', fontWeight: 'bold', fontSize: 10 }}
                      />
                      <Bar dataKey="alunos" name="Alunos" fill="#751BB4" radius={[2, 2, 0, 0]} barSize={26} activeBar={<ChartActiveBar />} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Financial summary */}
            <div className="bg-surface-1 border-0 shadow-sm rounded-lg p-4 md:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    {[
                      { label: 'Planos Mensais', val: receitaPorPlano.mensal || 0 },
                      { label: 'Planos Trimestrais', val: receitaPorPlano.trimestral || 0 },
                      { label: 'Planos Semestrais', val: receitaPorPlano.semestral || 0 },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center p-2.5 bg-surface-1 border-0 rounded-lg">
                        <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wide">{item.label}</span>
                        <span className="text-xs font-bold text-text-primary font-kpi tabular-nums lining-nums">{fmt(item.val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center p-2.5 bg-brand-subtle/40 border border-brand-border/20 rounded-lg">
                      <span className="text-[10px] font-bold text-brand uppercase tracking-wide">Recorrência Mensal</span>
                      <span className="text-sm font-bold text-brand font-kpi tabular-nums lining-nums">{fmt(receitaMensal ?? 0)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-surface-1 border-0 rounded-lg">
                      <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wide">Receita LTV (Planos Longos)</span>
                      <span className="text-xs font-bold text-text-primary font-kpi tabular-nums lining-nums">{fmt(receitaMulti ?? 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nutrition summary */}
            <div className="bg-surface-1 border-0 shadow-sm rounded-lg p-4 md:p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-surface-1 border-0 rounded-lg flex flex-col justify-center">
                  <span className="text-[8px] uppercase font-bold text-text-tertiary">Adesão Alimentar Média</span>
                  <span className="text-base font-bold text-success font-kpi tabular-nums lining-nums mt-1">{adesaoAlimentarMedia}%</span>
                </div>
                <div className="p-3 bg-surface-1 border-0 rounded-lg flex flex-col justify-center">
                  <span className="text-[8px] uppercase font-bold text-text-tertiary">Planos Digitais Ativos</span>
                  <span className="text-base font-bold text-text-primary font-kpi tabular-nums lining-nums mt-1">{planoDigitalAtivos}</span>
                </div>
                <div className="p-3 bg-surface-1 border-0 rounded-lg flex flex-col justify-center">
                  <span className="text-[8px] uppercase font-bold text-text-tertiary">Alunos Sem Plano</span>
                  <span className="text-base font-bold text-warning font-kpi tabular-nums lining-nums mt-1">{alunosSemPlano}</span>
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
      </div>
    </div>
  );
}
