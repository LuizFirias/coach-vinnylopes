'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell
} from 'recharts';
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { cn } from '@/lib/utils/cn';

export default function RelatoriosPage() {
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [ativos, setAtivos] = useState(0);
  const [inadimplentes, setInadimplentes] = useState(0);
  const [receitaTotal, setReceitaTotal] = useState<number | null>(null);
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

  useEffect(() => {
    const fetchRelatorios = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: authData } = await supabaseClient.auth.getUser();
        const coachId = authData?.user?.id;

        if (!coachId) { setError('Sessão inválida'); setLoading(false); return; }

        const { data: coachAlunosData, error: coachAlunosError } = await supabaseClient
          .from('coach_alunos').select('aluno_id').eq('coach_id', coachId);

        if (coachAlunosError) throw coachAlunosError;

        const alunosIds = (coachAlunosData || []).map(ca => ca.aluno_id);

        if (alunosIds.length === 0) {
          setTotalAlunos(0); setAtivos(0); setInadimplentes(0);
          setReceitaTotal(0); setAlunosSemValor(0); setReceitaPorPlano({});
          setAlunosPorPlano({}); setReceitaMensal(0); setReceitaMulti(0);
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

        // Receita por mês (últimos 12 meses) com distribuição proporcional por tipo de plano
        const vinteQuatroAtras = new Date();
        vinteQuatroAtras.setMonth(vinteQuatroAtras.getMonth() - 23);
        vinteQuatroAtras.setDate(1);
        vinteQuatroAtras.setHours(0, 0, 0, 0);

        const { data: historicoData } = await supabaseClient
          .from('profiles')
          .select('valor_plano, data_inicio, tipo_plano')
          .eq('role', 'aluno')
          .neq('arquivado', true)
          .not('data_inicio', 'is', null)
          .not('valor_plano', 'is', null)
          .gte('data_inicio', vinteQuatroAtras.toISOString())
          .in('id', alunosIds);

        const mesMap: Record<string, number> = {};
        const hoje = new Date();
        const mesAtualKey = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
        for (let i = 11; i >= -6; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          mesMap[key] = 0;
        }

        const duracaoPlano: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };

        for (const row of (historicoData || []) as { valor_plano: number; data_inicio: string; tipo_plano: string | null }[]) {
          const meses = duracaoPlano[row.tipo_plano || 'mensal'] || 1;
          const valorPorMes = (row.valor_plano ?? 0) / meses;
          const inicio = new Date(row.data_inicio);
          for (let m = 0; m < meses; m++) {
            const d = new Date(inicio.getFullYear(), inicio.getMonth() + m, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (key in mesMap) mesMap[key] += valorPorMes;
          }
        }
        const mesList = Object.entries(mesMap).map(([mes, receita]) => {
          const [ano, m] = mes.split('-');
          const label = new Date(Number(ano), Number(m) - 1, 1)
            .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          return { mes: label, receita, futuro: mes > mesAtualKey };
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

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:pl-28 pb-24">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6 py-4 border-b border-border-subtle">
          <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight font-display">
            Relatórios
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">Financeiro e performance da consultoria</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-danger/10 border border-danger/20 text-danger rounded-lg text-xs font-semibold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <DumbbellLoader />
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
                  className="bg-surface-1 border border-border-subtle shadow-sm rounded-lg p-4 h-20 flex flex-col justify-center"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">{item.label}</p>
                  <p className={cn('text-xl font-bold mt-0.5', item.color)}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Revenue + Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Receita Total */}
              <div className="bg-surface-1 border border-border-subtle shadow-sm rounded-lg p-4 md:p-5 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-bl-[80px]" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-1">Receita Total Bruta</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-sm font-sans font-semibold text-text-secondary">R$</span>
                    <span className="text-2xl font-bold tracking-tight text-text-primary font-mono tabular-nums leading-none">
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
                    Baseado em status "Pago" e plano vigente
                  </p>
                )}
              </div>

              {/* Distribuição por plano */}
              <div className="bg-surface-1 border border-border-subtle shadow-sm rounded-xl p-4 md:p-5 flex flex-col justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-3">Distribuição por Plano</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Mensal', count: alunosPorPlano.mensal || 0, color: 'bg-brand' },
                    { label: 'Trimestral', count: alunosPorPlano.trimestral || 0, color: 'bg-brand/60' },
                    { label: 'Semestral', count: alunosPorPlano.semestral || 0, color: 'bg-brand/30' },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col justify-between p-2 bg-surface-2 border border-border-subtle rounded-lg">
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
            <div className="bg-surface-1 border border-border-subtle shadow-sm rounded-lg p-4 md:p-5">
              <div className="flex items-start justify-between mb-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Projeção & Receita por Mês</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">Distribuição proporcional por plano · últimos 12 meses + projeção 6 meses</p>
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span className="flex items-center gap-1 text-[9px] text-text-tertiary font-bold uppercase">
                    <span className="w-2 h-2 rounded bg-brand inline-block" />
                    Realizado
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-text-tertiary font-bold uppercase">
                    <span className="w-2 h-2 rounded bg-brand/30 border border-brand/40 inline-block" />
                    Projeção
                  </span>
                </div>
              </div>
              
              <div className="overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div style={{ width: `${receitaPorMes.length * 52}px`, height: '180px' }}>
                  <BarChart
                    width={receitaPorMes.length * 52}
                    height={180}
                    data={receitaPorMes}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <XAxis dataKey="mes" stroke="#8e8e93" fontSize={8} fontWeight="bold" tickLine={false} axisLine={false} dy={8} />
                    <YAxis stroke="#8e8e93" fontSize={8} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} width={44} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: '#a0a0a0', fontWeight: 'bold', fontSize: 10 }}
                      labelStyle={{ color: '#ffffff', marginBottom: 2, fontSize: 10 }}
                      formatter={(value: number, _name: string, props: any) => [
                        fmt(value),
                        props.payload.futuro ? 'Projeção' : 'Realizado',
                      ]}
                    />
                    <Bar dataKey="receita" radius={[2, 2, 0, 0]} barSize={18}>
                      {receitaPorMes.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.futuro ? 'rgba(37,99,235,0.25)' : '#2563EB'}
                          stroke={entry.futuro ? 'rgba(37,99,235,0.5)' : 'none'}
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
              <div className="bg-surface-1 border border-border-subtle shadow-sm rounded-lg p-4 md:p-5 h-[280px] flex flex-col justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Faturamento Atual por Tipo de Plano (R$)</p>
                <div className="flex-1 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#8e8e93" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} dy={8} />
                      <YAxis stroke="#8e8e93" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        contentStyle={tooltipStyle}
                        itemStyle={{ color: '#a0a0a0', fontWeight: 'bold', fontSize: 10 }}
                        labelStyle={{ color: '#ffffff', marginBottom: 2, fontSize: 10 }}
                        formatter={(value: number) => [fmt(value), 'Receita']}
                      />
                      <Bar dataKey="receita" radius={[2, 2, 0, 0]} barSize={26}>
                        {chartData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? '#2563EB' : index === 1 ? 'rgba(37,99,235,0.6)' : '#52525B'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-surface-1 border border-border-subtle shadow-sm rounded-lg p-4 md:p-5 h-[280px] flex flex-col justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Adesão por Categoria</p>
                <div className="flex-1 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#8e8e93" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} dy={8} />
                      <YAxis stroke="#8e8e93" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        contentStyle={tooltipStyle}
                        labelStyle={{ color: '#ffffff', marginBottom: 2, fontSize: 10 }}
                        itemStyle={{ color: '#a0a0a0', fontWeight: 'bold', fontSize: 10 }}
                      />
                      <Bar dataKey="alunos" name="Alunos" fill="#2563EB" radius={[2, 2, 0, 0]} barSize={26} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Financial summary */}
            <div className="bg-surface-1 border border-border-subtle shadow-sm rounded-lg p-4 md:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-4">Resumo Financeiro Estratégico</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand pl-2 border-l-2 border-brand leading-none">Composição de Carteira</p>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Planos Mensais', val: receitaPorPlano.mensal || 0 },
                      { label: 'Planos Trimestrais', val: receitaPorPlano.trimestral || 0 },
                      { label: 'Planos Semestrais', val: receitaPorPlano.semestral || 0 },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center p-2.5 bg-surface-2 border border-border-subtle rounded-lg">
                        <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wide">{item.label}</span>
                        <span className="text-xs font-bold text-text-primary font-mono tabular-nums">{fmt(item.val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary pl-2 border-l-2 border-border-subtle leading-none">Previsão de Fluxo</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center p-2.5 bg-brand-subtle/40 border border-brand-border/20 rounded-lg">
                      <span className="text-[10px] font-bold text-brand uppercase tracking-wide">Recorrência Mensal</span>
                      <span className="text-sm font-bold text-brand font-mono tabular-nums">{fmt(receitaMensal ?? 0)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-surface-2 border border-border-subtle rounded-lg">
                      <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wide">Receita LTV (Planos Longos)</span>
                      <span className="text-xs font-bold text-text-primary font-mono tabular-nums">{fmt(receitaMulti ?? 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nutrition summary */}
            <div className="bg-surface-1 border border-border-subtle shadow-sm rounded-lg p-4 md:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-4">Acompanhamento Nutricional</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-surface-2 border border-border-subtle rounded-lg flex flex-col justify-center">
                  <span className="text-[8px] uppercase font-bold text-text-tertiary">Adesão Alimentar Média</span>
                  <span className="text-base font-bold text-success font-mono mt-1">{adesaoAlimentarMedia}%</span>
                </div>
                <div className="p-3 bg-surface-2 border border-border-subtle rounded-lg flex flex-col justify-center">
                  <span className="text-[8px] uppercase font-bold text-text-tertiary">Planos Digitais Ativos</span>
                  <span className="text-base font-bold text-text-primary font-mono mt-1">{planoDigitalAtivos}</span>
                </div>
                <div className="p-3 bg-surface-2 border border-border-subtle rounded-lg flex flex-col justify-center">
                  <span className="text-[8px] uppercase font-bold text-text-tertiary">Alunos Sem Plano</span>
                  <span className="text-base font-bold text-warning font-mono mt-1">{alunosSemPlano}</span>
                </div>
                <div className="p-3 bg-surface-2 border border-border-subtle rounded-lg flex flex-col justify-center">
                  <span className="text-[8px] uppercase font-bold text-text-tertiary">Check-ins no Mês</span>
                  <span className="text-base font-bold text-brand font-mono mt-1">{checkinsNoPeriodo}</span>
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
