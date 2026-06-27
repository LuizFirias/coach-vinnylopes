'use client';

import { useEffect, useState, useMemo } from 'react';
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
import PageHeader from "@/app/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { cn } from '@/lib/utils/cn';
import { WarningCircle } from '@phosphor-icons/react';

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

  // Período filter
  const [periodoFilter, setPeriodoFilter] = useState<'mes' | 'trimestre' | 'semestre' | 'ano' | 'tudo'>('ano');

  // Comparativos vs mês anterior (porcentagens)
  const [comparativoTotal, setComparativoTotal] = useState(0);
  const [comparativoAtivos, setComparativoAtivos] = useState(0);
  const [comparativoInadimplentes, setComparativoInadimplentes] = useState(0);

  useEffect(() => {
    const parseDateSafe = (value: string) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
      }
      return new Date(value);
    };

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

        // Fetch all active profiles (not archived) once to calculate stats in-memory
        const { data: profiles, error: profilesError } = await supabaseClient
          .from('profiles')
          .select('id, full_name, data_inicio, data_expiracao, status_pagamento, valor_plano, tipo_plano')
          .eq('role', 'aluno')
          .neq('arquivado', true)
          .in('id', alunosIds);

        if (profilesError) throw profilesError;

        const allProfiles = profiles || [];
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Core Counts
        const totalCount = allProfiles.length;
        const ativosCount = allProfiles.filter(p => p.status_pagamento === "pago" && p.data_expiracao && new Date(p.data_expiracao) >= now).length;
        const inadimplenteCount = allProfiles.filter(p => p.status_pagamento !== "pago" || !p.data_expiracao || new Date(p.data_expiracao) < now).length;

        // Last month metrics comparison
        const totalLastMonth = allProfiles.filter(p => p.data_inicio && new Date(p.data_inicio) < startOfThisMonth).length;
        const ativosLastMonth = allProfiles.filter(p => {
          if (!p.data_inicio || !p.data_expiracao) return false;
          const start = new Date(p.data_inicio);
          const exp = new Date(p.data_expiracao);
          return start < startOfThisMonth && exp >= startOfThisMonth && p.status_pagamento === 'pago';
        }).length;
        const inadimplentesLastMonth = totalLastMonth - ativosLastMonth;

        const pctTotal = totalLastMonth > 0 ? Math.round(((totalCount - totalLastMonth) / totalLastMonth) * 100) : 0;
        const pctAtivos = ativosLastMonth > 0 ? Math.round(((ativosCount - ativosLastMonth) / ativosLastMonth) * 100) : 0;
        const pctInadimplentes = inadimplentesLastMonth > 0 ? Math.round(((inadimplenteCount - inadimplentesLastMonth) / inadimplentesLastMonth) * 100) : 0;

        setComparativoTotal(pctTotal);
        setComparativoAtivos(pctAtivos);
        setComparativoInadimplentes(pctInadimplentes);

        // Revenue calculations
        const paidActiveProfiles = allProfiles.filter(p => p.status_pagamento === "pago" && p.data_expiracao && new Date(p.data_expiracao) >= now);
        const soma = paidActiveProfiles.reduce((acc, row) => acc + (row.valor_plano ?? 0), 0);
        const semValor = paidActiveProfiles.filter((row) => row.valor_plano === null).length;

        const porPlano = paidActiveProfiles.reduce<Record<string, number>>((acc, row) => {
          const plano = row.tipo_plano || 'sem_plano';
          acc[plano] = (acc[plano] || 0) + (row.valor_plano ?? 0);
          return acc;
        }, {});

        const countsPlano = paidActiveProfiles.reduce<Record<string, number>>((acc, row) => {
          const plano = row.tipo_plano || 'sem_plano';
          acc[plano] = (acc[plano] || 0) + 1;
          return acc;
        }, {});

        const totalMensal = paidActiveProfiles
          .filter((row) => row.tipo_plano === 'mensal')
          .reduce((acc, row) => acc + (row.valor_plano ?? 0), 0);

        const totalMulti = paidActiveProfiles
          .filter((row) => row.tipo_plano === 'trimestral' || row.tipo_plano === 'semestral')
          .reduce((acc, row) => acc + (row.valor_plano ?? 0), 0);

        // Monthly historical projections
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
          .gte('data_inicio', vinteQuatroAtras.toISOString().slice(0, 10))
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
          const inicio = parseDateSafe(row.data_inicio);
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

        setTotalAlunos(totalCount); setAtivos(ativosCount);
        setInadimplentes(inadimplenteCount); setReceitaTotal(soma);
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

  // Slices around the current month (or from the end/middle) depending on filter
  const filteredReceitaPorMes = useMemo(() => {
    if (receitaPorMes.length === 0) return [];
    if (periodoFilter === 'tudo') return receitaPorMes;

    const currentIdx = 11; // Index 11 is the current month
    const pastCount = { mes: 1, trimestre: 3, semestre: 6, ano: 12 }[periodoFilter] || 12;
    const futureCount = { mes: 1, trimestre: 2, semestre: 3, ano: 6 }[periodoFilter] || 6;

    const startIdx = Math.max(0, currentIdx - pastCount);
    const endIdx = Math.min(receitaPorMes.length, currentIdx + 1 + futureCount);

    return receitaPorMes.slice(startIdx, endIdx);
  }, [receitaPorMes, periodoFilter]);

  const handleExportar = () => {
    const headers = "Periodo,Receita (R$)\n";
    const rows = filteredReceitaPorMes.map(r => `"${r.mes}",${r.receita.toFixed(2)}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_receita_${periodoFilter}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tooltipStyle = {
    backgroundColor: '#1c1c1e',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    padding: '12px 16px',
  };

  const fmt = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-16 xl:pl-[240px]">
      <div className="max-w-[1440px] px-6 md:px-10 py-8 mx-auto w-full flex flex-col gap-6 animate-fade-in">
        
        {/* Header */}
        <PageHeader
          title="Relatórios Financeiros"
          subtitle="Financeiro & Performance Geral do Negócio"
          breadcrumbs={[
            { label: "Atletas", href: "/admin/alunos" },
            { label: "Relatórios" }
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              {/* Period selector */}
              <div className="flex bg-surface-2 p-1 rounded-[6px] border border-border-subtle">
                {(['mes', 'trimestre', 'semestre', 'ano', 'tudo'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriodoFilter(p)}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-bold uppercase rounded-[4px] transition-colors",
                      periodoFilter === p
                        ? "bg-brand text-text-on-brand"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {p === 'mes' ? 'Mês' : p === 'trimestre' ? 'Trim' : p === 'semestre' ? 'Sem' : p === 'ano' ? 'Ano' : 'Tudo'}
                  </button>
                ))}
              </div>

              <button
                onClick={handleExportar}
                className="flex items-center gap-1.5 px-4 h-9 bg-brand text-text-on-brand rounded-[8px] text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-95 transition-opacity"
              >
                Exportar Relatório
              </button>
            </div>
          }
        />

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[6px] bg-danger-subtle border border-danger-border text-danger text-sm">
            <WarningCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-20 bg-surface-1 border border-border-subtle rounded-[10px] shadow-sm">
            <DumbbellLoader />
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Alunos Ativos', value: totalAlunos, comp: comparativoTotal, color: 'text-text-primary' },
                { label: 'Alunos Pagos', value: ativos, comp: comparativoAtivos, color: 'text-success' },
                { label: 'Pendentes', value: inadimplentes, comp: comparativoInadimplentes, color: 'text-danger' },
              ].map(item => (
                <div
                  key={item.label}
                  className="bg-surface-1 border border-border-subtle shadow-sm rounded-[10px] p-5 flex flex-col items-center text-center"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1.5">{item.label}</p>
                  <p className={cn('text-3xl font-bold', item.color)}>{item.value}</p>
                  
                  {/* Comparativo vs mês anterior */}
                  <span className={cn(
                    "text-[10px] font-bold mt-1.5",
                    item.comp > 0 ? "text-success" : item.comp < 0 ? "text-danger" : "text-text-disabled"
                  )}>
                    {item.comp > 0 ? `+${item.comp}%` : `${item.comp}%`} vs. mês ant.
                  </span>
                </div>
              ))}
            </div>

            {/* Revenue + Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Receita Total */}
              <Card className="rounded-[10px] shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-bl-[100px] pointer-events-none" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-2">Receita Total Bruta</p>
                  <p className="text-brand text-3xl font-bold tracking-tighter">
                    {receitaTotal !== null ? fmt(receitaTotal) : '—'}
                  </p>
                </div>
                {alunosSemValor > 0 ? (
                  <div className="mt-4 p-2.5 bg-brand-subtle border border-brand-border rounded-[6px] flex items-center gap-2">
                    <span className="text-sm">⚠️</span>
                    <p className="text-[10px] text-text-secondary leading-tight">
                      {alunosSemValor} alunos pagos sem valor definido no perfil.
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-text-tertiary font-medium mt-4 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    Baseado em status "Pago" e plano vigente
                  </p>
                )}
              </Card>

              {/* Distribuição por plano */}
              <Card className="rounded-[10px] shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-3">Distribuição por Plano</p>
                <div className="space-y-2">
                  {[
                    { label: 'Mensal', count: alunosPorPlano.mensal || 0, color: 'bg-brand' },
                    { label: 'Trimestral', count: alunosPorPlano.trimestral || 0, color: 'bg-brand/60' },
                    { label: 'Semestral', count: alunosPorPlano.semestral || 0, color: 'bg-brand/30' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-2.5 bg-surface-2 border border-border-subtle rounded-[6px] hover:border-brand/20 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', item.color)} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{item.label}</span>
                      </div>
                      <span className="text-xs font-bold text-text-primary">
                        {item.count} <span className="text-[9px] text-text-tertiary uppercase ml-1">UN</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Receita mensal — passado + projeção, rolável */}
            <Card className="rounded-[10px] shadow-sm">
              <div className="flex items-start justify-between mb-1 gap-4">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Receita por Mês</h3>
                  <p className="text-xs text-text-tertiary mt-0.5">Distribuição proporcional por plano · realizados e projetados</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="flex items-center gap-1.5 text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-[2px] bg-brand inline-block" />
                    Realizado
                  </span>
                  <span className="flex items-center gap-1.5 text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-[2px] bg-brand/30 border border-brand/40 inline-block" />
                    Projeção
                  </span>
                </div>
              </div>
              
              {/* scroll container */}
              <div className="overflow-x-auto mt-4 pb-2" style={{ scrollbarWidth: 'thin' }}>
                <div style={{ width: `${filteredReceitaPorMes.length * 56}px`, height: '220px' }}>
                  <BarChart
                    width={filteredReceitaPorMes.length * 56}
                    height={220}
                    data={filteredReceitaPorMes}
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
                    <Bar dataKey="receita" radius={[4, 4, 4, 4]} barSize={20}>
                      {filteredReceitaPorMes.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.futuro ? 'rgba(212, 168, 67, 0.20)' : '#D4A843'}
                          stroke={entry.futuro ? '#D4A843' : 'none'}
                          strokeWidth={entry.futuro ? 1 : 0}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </div>
              </div>
            </Card>

            {/* Charts por tipo de plano */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="rounded-[10px] shadow-sm h-[320px] flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-4">Faturamento por Tipo de Plano (R$)</p>
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
                      <Bar dataKey="receita" radius={[4, 4, 4, 4]} barSize={32}>
                        {chartData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? '#D4A843' : index === 1 ? 'rgba(212, 168, 67, 0.7)' : 'rgba(212, 168, 67, 0.4)'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="rounded-[10px] shadow-sm h-[320px] flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-4">Adesão por Categoria</p>
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
                      <Bar dataKey="alunos" name="Alunos" fill="#D4A843" radius={[4, 4, 4, 4]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Financial summary */}
            <Card className="rounded-[10px] shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-4">Resumo Financeiro Estratégico</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand pl-2 border-l-2 border-brand">Composição de Carteira</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Planos Mensais', val: receitaPorPlano.mensal || 0 },
                      { label: 'Planos Trimestrais', val: receitaPorPlano.trimestral || 0 },
                      { label: 'Planos Semestrais', val: receitaPorPlano.semestral || 0 },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center p-2.5 bg-surface-2 border border-border-subtle rounded-[6px]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{item.label}</span>
                        <span className="text-xs font-bold text-text-primary">{fmt(item.val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary pl-2 border-l-2 border-border-subtle">Previsão de Fluxo</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2.5 bg-brand-subtle border border-brand-border rounded-[6px]">
                      <span className="text-[10px] font-bold text-brand uppercase tracking-wider">Recorrência Mensal</span>
                      <span className="text-sm font-bold text-brand">{fmt(receitaMensal ?? 0)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-surface-2 border border-border-subtle rounded-[6px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Receita LTV (Planos Longos)</span>
                      <span className="text-xs font-bold text-text-primary">{fmt(receitaMulti ?? 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
