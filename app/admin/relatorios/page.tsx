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

        // Receita por mês (últimos 12 meses) com distribuição proporcional por tipo de plano:
        // mensal→1x, trimestral→÷3, semestral→÷6, anual→÷12
        // Busca até 23 meses atrás para capturar semestral/anual ainda ativos no janela
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
        // 12 meses passados + mês atual + 6 meses futuros = 19 entradas
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
    backgroundColor: '#1c1c1e',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    padding: '12px 16px',
  };

  const fmt = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-8 lg:p-10 lg:pl-28 pb-24">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight uppercase mb-1">
            Relatórios
          </h1>
          <p className="text-sm text-brand uppercase tracking-caps">Financeiro & Performance</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 text-danger rounded-2xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-20 bg-surface-1 border border-border-subtle rounded-2xl shadow-elev-1">
            <DumbbellLoader />
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Total Alunos Ativos', value: totalAlunos, color: 'text-text-primary' },
                { label: 'Alunos Pagos', value: ativos, color: 'text-success' },
                { label: 'Pendentes', value: inadimplentes, color: 'text-danger' },
              ].map(item => (
                <div
                  key={item.label}
                  className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-6 flex flex-col items-center text-center"
                >
                  <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-2">{item.label}</p>
                  <p className={cn('text-4xl font-bold', item.color)}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Revenue + Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Receita Total */}
              <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-bl-[100px]" />
                <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-3">Receita Total Bruta</p>
                <p className="text-brand text-4xl font-bold tracking-tighter">
                  {receitaTotal !== null ? fmt(receitaTotal) : '—'}
                </p>
                {alunosSemValor > 0 ? (
                  <div className="mt-4 p-3 bg-brand-subtle border border-brand-border rounded-xl flex items-center gap-3">
                    <span className="text-lg">⚠️</span>
                    <p className="text-xs text-text-secondary leading-tight">
                      {alunosSemValor} alunos pagos sem valor definido no perfil.
                    </p>
                  </div>
                ) : (
                  <p className="text-2xs text-text-tertiary uppercase tracking-caps mt-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Baseado em status "Pago" e plano vigente
                  </p>
                )}
              </div>

              {/* Distribuição por plano */}
              <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-6">
                <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-4">Distribuição por Plano</p>
                <div className="space-y-3">
                  {[
                    { label: 'Mensal', count: alunosPorPlano.mensal || 0, color: 'bg-brand' },
                    { label: 'Trimestral', count: alunosPorPlano.trimestral || 0, color: 'bg-brand/60' },
                    { label: 'Semestral', count: alunosPorPlano.semestral || 0, color: 'bg-brand/30' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-3 bg-surface-2 border border-border-subtle rounded-xl hover:border-brand/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={cn('w-2.5 h-2.5 rounded-full', item.color)} />
                        <span className="text-xs font-semibold uppercase tracking-caps text-text-secondary">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold text-text-primary">
                        {item.count} <span className="text-2xs text-text-tertiary uppercase ml-1">UN</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Receita mensal — passado + projeção, rolável */}
            <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-6 mb-6">
              <div className="flex items-start justify-between mb-1 gap-4">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Receita por Mês</p>
                  <p className="text-xs text-text-disabled mt-0.5">Distribuição proporcional por plano · últimos 12 meses + projeção 6 meses</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="flex items-center gap-1.5 text-2xs text-text-tertiary uppercase tracking-caps">
                    <span className="w-2.5 h-2.5 rounded-sm bg-brand inline-block" />
                    Realizado
                  </span>
                  <span className="flex items-center gap-1.5 text-2xs text-text-tertiary uppercase tracking-caps">
                    <span className="w-2.5 h-2.5 rounded-sm bg-brand/30 border border-brand/40 inline-block" />
                    Projeção
                  </span>
                </div>
              </div>
              {/* scroll container */}
              <div className="overflow-x-auto mt-4 pb-2"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.3) transparent' }}>
                <div style={{ width: `${receitaPorMes.length * 56}px`, height: '220px' }}>
                  <BarChart
                    width={receitaPorMes.length * 56}
                    height={220}
                    data={receitaPorMes}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <XAxis dataKey="mes" stroke="#6b7280" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#6b7280" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} width={52} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: '#a0a0a0', fontWeight: 'bold' }}
                      labelStyle={{ color: '#ffffff', marginBottom: 4 }}
                      formatter={(value: number, _name: string, props: any) => [
                        fmt(value),
                        props.payload.futuro ? 'Projeção' : 'Realizado',
                      ]}
                    />
                    <Bar dataKey="receita" radius={[6, 6, 6, 6]} barSize={22}>
                      {receitaPorMes.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.futuro ? 'rgba(99,102,241,0.30)' : '#6366f1'}
                          stroke={entry.futuro ? 'rgba(99,102,241,0.6)' : 'none'}
                          strokeWidth={entry.futuro ? 1 : 0}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </div>
              </div>
            </div>

            {/* Charts por tipo de plano */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-6 h-[380px] flex flex-col">
                <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-6">Faturamento Atual por Tipo de Plano (R$)</p>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#6b7280" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        contentStyle={tooltipStyle}
                        itemStyle={{ color: '#a0a0a0', fontWeight: 'bold' }}
                        labelStyle={{ color: '#ffffff', marginBottom: 4 }}
                        formatter={(value: number) => [fmt(value), 'Receita']}
                      />
                      <Bar dataKey="receita" radius={[8, 8, 8, 8]} barSize={36}>
                        {chartData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? '#6366f1' : index === 1 ? '#818cf8' : '#4b5563'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-6 h-[380px] flex flex-col">
                <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-6">Adesão por Categoria</p>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#6b7280" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        contentStyle={tooltipStyle}
                        labelStyle={{ color: '#ffffff', marginBottom: 4 }}
                        itemStyle={{ color: '#a0a0a0', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="alunos" name="Alunos" fill="#6366f1" radius={[8, 8, 8, 8]} barSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Financial summary */}
            <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-6">
              <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-6">Resumo Financeiro Estratégico</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-2xs font-semibold uppercase tracking-caps text-brand pl-2 border-l-2 border-brand">Composição de Carteira</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Planos Mensais', val: receitaPorPlano.mensal || 0 },
                      { label: 'Planos Trimestrais', val: receitaPorPlano.trimestral || 0 },
                      { label: 'Planos Semestrais', val: receitaPorPlano.semestral || 0 },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center p-3 bg-surface-2 border border-border-subtle rounded-xl">
                        <span className="text-xs text-text-tertiary uppercase tracking-caps">{item.label}</span>
                        <span className="text-sm font-bold text-text-primary">{fmt(item.val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary pl-2 border-l-2 border-border-subtle">Previsão de Fluxo</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-brand-subtle border border-brand-border rounded-xl">
                      <span className="text-xs font-semibold text-brand uppercase tracking-caps">Recorrência Mensal</span>
                      <span className="text-base font-bold text-brand">{fmt(receitaMensal ?? 0)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-surface-2 border border-border-subtle rounded-xl">
                      <span className="text-xs text-text-tertiary uppercase tracking-caps">Receita LTV (Planos Longos)</span>
                      <span className="text-sm font-bold text-text-primary">{fmt(receitaMulti ?? 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
