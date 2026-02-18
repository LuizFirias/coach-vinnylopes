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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelatorios = async () => {
      setLoading(true);
      setError(null);
      try {
        const { count: totalCount } = await supabaseClient
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('role', 'aluno');

        const { count: ativosCount } = await supabaseClient
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('role', 'aluno')
          .eq('status_pagamento', 'pago');

        const { count: inadimplenteCount } = await supabaseClient
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('role', 'aluno')
          .neq('status_pagamento', 'pago');

        const { data: valoresData, error: valoresError } = await supabaseClient
          .from('profiles')
          .select('valor_plano, tipo_plano')
          .eq('role', 'aluno')
          .eq('status_pagamento', 'pago');

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

        setTotalAlunos(totalCount || 0);
        setAtivos(ativosCount || 0);
        setInadimplentes(inadimplenteCount || 0);
        setReceitaTotal(soma);
        setAlunosSemValor(semValor);
        setReceitaPorPlano(porPlano);
        setAlunosPorPlano(countsPlano);
        setReceitaMensal(totalMensal);
        setReceitaMulti(totalMulti);
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar relatorios');
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 pt-16 md:pt-24">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-[0.2em] uppercase mb-4">
            RELATÓRIOS
            <span className="block text-brand-purple text-lg tracking-[0.3em] mt-2">Financeiro & Performance</span>
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm animate-pulse">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-12 md:p-20 bg-white rounded-2xl shadow-xl shadow-slate-200/50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-50 flex flex-col items-center text-center">
                <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black mb-2">Total Alunos</p>
                <p className="text-slate-900 text-4xl md:text-5xl font-black">{totalAlunos}</p>
              </div>
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-50 flex flex-col items-center text-center hover:scale-[1.02] transition-transform">
                <p className="text-green-500 text-[10px] uppercase tracking-[0.2em] font-black mb-2">Alunos Pagos</p>
                <p className="text-green-600 text-4xl md:text-5xl font-black">{ativos}</p>
              </div>
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-50 flex flex-col items-center text-center hover:scale-[1.02] transition-transform">
                <p className="text-red-500 text-[10px] uppercase tracking-[0.2em] font-black mb-2">Pendentes</p>
                <p className="text-red-600 text-4xl md:text-5xl font-black">{inadimplentes}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
              <div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 rounded-bl-[100px] transition-all group-hover:scale-110"></div>
                <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black mb-3 md:mb-4">Receita Total Bruta</p>
                <p className="text-brand-purple text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter">
                  {receitaTotal !== null
                    ? receitaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : '—'}
                </p>
                {alunosSemValor > 0 ? (
                  <div className="mt-4 md:mt-6 p-3 bg-amber-50 rounded-2xl flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    <p className="text-amber-700 text-xs font-medium leading-tight">
                      {alunosSemValor} alunos pagos sem valor definido no perfil.
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mt-4 md:mt-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Baseado em status "Pago"
                  </p>
                )}
              </div>

              <div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-50">
                <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black mb-4 md:mb-6">Distribuição por Plano</p>
                <div className="space-y-4">
                  {[
                    { label: 'Mensal', count: alunosPorPlano.mensal || 0, color: 'bg-brand-purple' },
                    { label: 'Trimestral', count: alunosPorPlano.trimestral || 0, color: 'bg-indigo-400' },
                    { label: 'Semestral', count: alunosPorPlano.semestral || 0, color: 'bg-slate-400' }
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className={`w-3 h-3 rounded-full ${item.color} shadow-sm`}></span>
                        <span className="font-black text-slate-700 text-xs uppercase tracking-widest">{item.label}</span>
                      </div>
                      <span className="font-black text-slate-900 text-lg">{item.count} <span className="text-[10px] text-slate-400 uppercase font-bold ml-1">UN</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:gap-8">
              {/* Gráfico de Receita */}
              <div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-50 h-[350px] md:h-[450px] flex flex-col">
                <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black mb-6 md:mb-10">Faturamento Realizado (R$)</p>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: 'none', 
                          borderRadius: '24px', 
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                          padding: '16px'
                        }}
                        itemStyle={{ color: '#7C3AED', fontWeight: 'bold' }}
                        formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Receita']}
                      />
                      <Bar dataKey="receita" radius={[12, 12, 12, 12]} barSize={40}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#7C3AED' : index === 1 ? '#818CF8' : '#94A3B8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de Alunos */}
              <div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-50 h-[350px] md:h-[450px] flex flex-col">
                <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black mb-6 md:mb-10">Adesão por Categoria</p>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: 'none', 
                          borderRadius: '24px', 
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                          padding: '16px'
                        }}
                        labelClassName="font-black text-slate-900 border-b border-slate-100 mb-2 pb-2 block uppercase tracking-widest text-[10px]"
                        itemStyle={{ color: '#7C3AED', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="alunos" name="Alunos" fill="#7C3AED" radius={[12, 12, 12, 12]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-50">
              <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black mb-6 md:mb-8 text-center md:text-left">Resumo Financeiro Estratégico</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <p className="text-[10px] text-brand-purple font-black uppercase tracking-[0.3em] pl-2 border-l-4 border-brand-purple">Composição de Carteira</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-3xl">
                      <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Planos Mensais</span>
                      <span className="text-slate-900 font-black text-lg">{(receitaPorPlano.mensal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-3xl">
                      <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Planos Trimestrais</span>
                      <span className="text-slate-900 font-black text-lg">{(receitaPorPlano.trimestral || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-3xl">
                      <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Planos Semestrais</span>
                      <span className="text-slate-900 font-black text-lg">{(receitaPorPlano.semestral || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] pl-2 border-l-4 border-slate-200">Previsão de Fluxo</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-brand-purple/5 rounded-3xl border border-brand-purple/10">
                      <span className="text-brand-purple text-xs font-bold uppercase tracking-wider">Recorrência Mensal</span>
                      <span className="text-brand-purple font-black text-xl">{(receitaMensal ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-3xl">
                      <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Receita LTV (Planos Longos)</span>
                      <span className="text-slate-900 font-black text-lg">{(receitaMulti ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
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
