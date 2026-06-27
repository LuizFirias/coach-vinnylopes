"use client";

import { useEffect, useState, useMemo } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/app/components/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell
} from 'recharts';
import {
  Coins,
  Users,
  Barbell,
  ChatCircle,
  Warning,
  TrendUp,
  ArrowUpRight,
  User,
  CheckCircle
} from '@phosphor-icons/react';
import DumbbellLoader from "@/app/components/DumbbellLoader";
import PageHeader from "@/app/components/PageHeader";
import { getPublicStorageUrl } from '@/lib/storageUrls';
import { cn } from '@/lib/utils/cn';

interface ActivityItem {
  id: string;
  type: 'payment' | 'workout' | 'feedback';
  title: string;
  subtitle: string;
  time: Date;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Metrics state
  const [receitaMes, setReceitaMes] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [valorPendente, setValorPendente] = useState(0);
  const [alunosPendentesCount, setAlunosPendentesCount] = useState(0);
  
  const [alunosAtivos, setAlunosAtivos] = useState(0);
  const [taxaAdesao, setTaxaAdesao] = useState(0);
  const [alunosInativos7d, setAlunosInativos7d] = useState(0);
  
  const [receitaPorMes, setReceitaPorMes] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || userRole !== 'coach') {
      router.replace('/login');
      return;
    }

    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const coachId = user.id;

        // 1. Fetch coach students mapping
        const { data: coachAlunosData, error: coachAlunosError } = await supabaseClient
          .from('coach_alunos')
          .select('aluno_id')
          .eq('coach_id', coachId);

        if (coachAlunosError) throw coachAlunosError;
        const alunoIds = (coachAlunosData || []).map(ca => ca.aluno_id);

        if (alunoIds.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Fetch profiles for these student ids (not archived)
        const { data: profilesData, error: profilesError } = await supabaseClient
          .from('profiles')
          .select('id, full_name, email, status_pagamento, data_expiracao, valor_plano, tipo_plano, data_inicio, avatar_url')
          .in('id', alunoIds)
          .eq('role', 'aluno')
          .neq('arquivado', true);

        if (profilesError) throw profilesError;
        const profiles = profilesData || [];

        // 3. Calculate Financial Metrics
        const now = new Date();
        const activeStudents = profiles.filter(
          p => p.status_pagamento === 'pago' && p.data_expiracao && new Date(p.data_expiracao) >= now
        );
        const pendingStudents = profiles.filter(
          p => p.status_pagamento !== 'pago' || !p.data_expiracao || new Date(p.data_expiracao) < now
        );

        setAlunosAtivos(activeStudents.length);
        setAlunosPendentesCount(pendingStudents.length);

        // Sum pending values in R$
        const sumPending = pendingStudents.reduce((acc, p) => acc + (p.valor_plano ?? 0), 0);
        setValorPendente(sumPending);

        // MRR
        const computedMrr = activeStudents.reduce((acc, p) => {
          const divisor = p.tipo_plano === 'trimestral' ? 3 : p.tipo_plano === 'semestral' ? 6 : p.tipo_plano === 'anual' ? 12 : 1;
          return acc + ((p.valor_plano ?? 0) / divisor);
        }, 0);
        setMrr(computedMrr);

        // Receita por mês (Current Month, past 12, future 6)
        const mesMap: Record<string, number> = {};
        const mesAtualKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        for (let i = 11; i >= -6; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          mesMap[key] = 0;
        }

        // Fetch historically active records for monthly revenue calculation
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
          .in('id', alunoIds);

        const duracaoPlano: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };
        for (const row of (historicoData || []) as any[]) {
          const meses = duracaoPlano[row.tipo_plano || 'mensal'] || 1;
          const valorPorMes = (row.valor_plano ?? 0) / meses;
          
          let dateParts = row.data_inicio.split('-');
          const inicio = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]) || 1);
          
          for (let m = 0; m < meses; m++) {
            const d = new Date(inicio.getFullYear(), inicio.getMonth() + m, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (key in mesMap) {
              mesMap[key] += valorPorMes;
            }
          }
        }

        // Current Month Revenue
        setReceitaMes(mesMap[mesAtualKey] || 0);

        const mesList = Object.entries(mesMap).map(([mes, receita]) => {
          const [ano, m] = mes.split('-');
          const label = new Date(Number(ano), Number(m) - 1, 1)
            .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          return { mes: label, receita, futuro: mes > mesAtualKey };
        });
        setReceitaPorMes(mesList);

        // 4. Query Training compliance in last 30 days
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        
        const { data: treinosData } = await supabaseClient
          .from('historico_treinos')
          .select('aluno_id, data_conclusao')
          .in('aluno_id', alunoIds)
          .gte('data_conclusao', trintaDiasAtras.toISOString());

        // Adherence: Unique session entries (same day, same student)
        const uniqueSessions = new Set();
        (treinosData || []).forEach(t => {
          const dayKey = `${t.aluno_id}_${t.data_conclusao.slice(0, 10)}`;
          uniqueSessions.add(dayKey);
        });

        // 12 workouts per active student monthly baseline
        const totalExpectedSessions = activeStudents.length * 12;
        const calculatedAdherence = totalExpectedSessions > 0 
          ? Math.min(100, Math.round((uniqueSessions.size / totalExpectedSessions) * 100))
          : 0;
        setTaxaAdesao(calculatedAdherence);

        // Churn risk (active students with no workouts in last 7 days)
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

        const inactiveCount = activeStudents.filter(student => {
          const studentWorkouts = (treinosData || []).filter(
            t => t.aluno_id === student.id && new Date(t.data_conclusao) >= seteDiasAtras
          );
          return studentWorkouts.length === 0;
        }).length;
        setAlunosInativos7d(inactiveCount);

        // 5. Build Recent Activity Feed
        const feedItems: ActivityItem[] = [];

        // A. Recent paid signups / updates
        const recentSignups = activeStudents
          .filter(s => s.data_inicio)
          .sort((a, b) => new Date(b.data_inicio!).getTime() - new Date(a.data_inicio!).getTime())
          .slice(0, 3);
        
        recentSignups.forEach(s => {
          feedItems.push({
            id: `signup_${s.id}`,
            type: 'payment',
            title: `Assinatura Ativa: ${s.full_name}`,
            subtitle: `Plano ${s.tipo_plano || 'Sem plano'} · ${s.valor_plano ? `R$ ${s.valor_plano}` : 'Sem valor definido'}`,
            time: new Date(s.data_inicio!)
          });
        });

        // B. Recent workouts completed
        const recentWorkouts = [...(treinosData || [])]
          .sort((a, b) => new Date(b.data_conclusao).getTime() - new Date(a.data_conclusao).getTime())
          .slice(0, 3);
        
        recentWorkouts.forEach((w, wIdx) => {
          const studentName = profiles.find(p => p.id === w.aluno_id)?.full_name || 'Atleta';
          feedItems.push({
            id: `workout_${w.aluno_id}_${wIdx}`,
            type: 'workout',
            title: `${studentName} concluiu um treino`,
            subtitle: `Sessão registrada no histórico`,
            time: new Date(w.data_conclusao)
          });
        });

        // C. Recent feedbacks
        const { data: feedbacksData } = await supabaseClient
          .from('feedbacks_treinos')
          .select('id, aluno_id, feedback, created_at')
          .eq('coach_id', coachId)
          .order('created_at', { ascending: false })
          .limit(3);

        (feedbacksData || []).forEach(f => {
          const studentName = profiles.find(p => p.id === f.aluno_id)?.full_name || 'Atleta';
          feedItems.push({
            id: `fb_${f.id}`,
            type: 'feedback',
            title: `Feedback de ${studentName}`,
            subtitle: `"${f.feedback.length > 60 ? f.feedback.slice(0, 60) + '...' : f.feedback}"`,
            time: new Date(f.created_at)
          });
        });

        // Sort items by time desc
        feedItems.sort((a, b) => b.time.getTime() - a.time.getTime());
        setAtividades(feedItems.slice(0, 6));

      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Erro ao carregar dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user, userRole, authLoading, router]);

  const fmtCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const fmtTime = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const tooltipStyle = {
    backgroundColor: '#131313',
    border: '1px solid rgba(212,168,67,0.2)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    padding: '8px 12px',
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Preparando painel..." />
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] px-6 md:px-10 py-8 mx-auto w-full flex flex-col gap-6 animate-fade-in">
      <PageHeader title="Dashboard" subtitle="Visão geral e saúde do negócio" />

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger text-xs flex items-center gap-2">
          <Warning className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Linha 1 — Receita, prioridade máxima */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-surface-1 border border-border-subtle rounded-lg p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-bl-[80px]" />
          <div>
            <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
              <Coins className="w-4 h-4 text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-caps">Receita do Mês</span>
            </div>
            <p className="text-3xl font-black text-brand tracking-tighter tabular-nums font-mono leading-none">
              {fmtCurrency(receitaMes)}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 border border-success/20 rounded px-1.5 py-0.5 w-fit">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>MRR Estimado: {fmtCurrency(mrr)}</span>
          </div>
        </div>

        <div className="bg-surface-1 border border-border-subtle rounded-lg p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
              <TrendUp className="w-4 h-4 text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-caps">MRR Ativo</span>
            </div>
            <p className="text-3xl font-black text-text-primary tracking-tighter tabular-nums font-mono leading-none">
              {fmtCurrency(mrr)}
            </p>
          </div>
          <p className="mt-4 text-2xs text-text-secondary leading-none uppercase tracking-wide">
            Receita Recorrente Mensal Vigente
          </p>
        </div>

        <div className="bg-surface-1 border border-border-subtle rounded-lg p-5 flex flex-col justify-between shadow-sm relative">
          <div>
            <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
              <Warning className="w-4 h-4 text-warning" />
              <span className="text-[10px] font-bold uppercase tracking-caps">Pendências em Risco</span>
            </div>
            <p className="text-3xl font-black text-warning tracking-tighter tabular-nums font-mono leading-none">
              {fmtCurrency(valorPendente)}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-semibold text-warning bg-warning/10 border border-warning/20 rounded px-1.5 py-0.5 w-fit">
            <span>{alunosPendentesCount} aluno(s) pendente(s)</span>
          </div>
        </div>
      </div>

      {/* Linha 2 — Operação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-surface-1 border border-border-subtle rounded-lg p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
              <Users className="w-4 h-4 text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-caps">Alunos Ativos</span>
            </div>
            <p className="text-3xl font-black text-text-primary tracking-tighter font-mono leading-none">
              {alunosAtivos}
            </p>
          </div>
          <p className="mt-4 text-2xs text-text-secondary uppercase tracking-wide">
            Clientes pagantes e vigentes
          </p>
        </div>

        <div className="bg-surface-1 border border-border-subtle rounded-lg p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
              <Barbell className="w-4 h-4 text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-caps">Adesão aos Treinos</span>
            </div>
            <p className="text-3xl font-black text-text-primary tracking-tighter font-mono leading-none">
              {taxaAdesao}%
            </p>
          </div>
          <div className="w-full bg-surface-3 rounded-full h-1.5 mt-4 overflow-hidden">
            <div className="bg-brand h-full rounded-full transition-all duration-500" style={{ width: `${taxaAdesao}%` }} />
          </div>
        </div>

        <div className="bg-surface-1 border border-border-subtle rounded-lg p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
              <Warning className="w-4 h-4 text-danger" />
              <span className="text-[10px] font-bold uppercase tracking-caps">Risco de Churn</span>
            </div>
            <p className="text-3xl font-black text-danger tracking-tighter font-mono leading-none">
              {alunosInativos7d}
            </p>
          </div>
          <p className="mt-4 text-2xs text-text-secondary uppercase tracking-wide">
            Inativos há mais de 7 dias
          </p>
        </div>
      </div>

      {/* Linha 3 — Gráfico de receita (largura total) */}
      <div className="bg-surface-1 border border-border-subtle rounded-lg p-6 flex flex-col shadow-sm">
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <h2 className="text-sm font-bold text-text-primary">Evolução do Faturamento</h2>
            <p className="text-[10px] text-text-secondary mt-0.5">Histórico proporcional 12 meses + projeção 6 meses</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-2xs text-text-secondary uppercase tracking-caps font-bold">
              <span className="w-2.5 h-2.5 rounded bg-brand inline-block" />
              Realizado
            </span>
            <span className="flex items-center gap-1.5 text-2xs text-text-secondary uppercase tracking-caps font-bold">
              <span className="w-2.5 h-2.5 rounded bg-brand/35 border border-brand/50 inline-block" />
              Projeção
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto pb-2 scrollable-area">
          <div style={{ minWidth: '700px', width: '100%', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={receitaPorMes} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="mes" stroke="#555555" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="#555555" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} width={54} />
                <Tooltip
                  cursor={{ fill: 'rgba(212,168,67,0.02)' }}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: '#F5F5F5', fontWeight: 'bold' }}
                  labelStyle={{ color: '#8A8A8A', fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}
                  formatter={(value: number, _name: string, props: any) => [
                    fmtCurrency(value),
                    props.payload.futuro ? 'Projeção' : 'Realizado',
                  ]}
                />
                <Bar dataKey="receita" radius={[4, 4, 0, 0]} barSize={24}>
                  {receitaPorMes.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.futuro ? 'rgba(212, 168, 67, 0.3)' : '#D4A843'}
                      stroke={entry.futuro ? 'rgba(212, 168, 67, 0.6)' : 'none'}
                      strokeWidth={entry.futuro ? 1 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Linha 4 — Atividade recente */}
      <div className="bg-surface-1 border border-border-subtle rounded-lg p-6 shadow-sm flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-bold text-text-primary">Monitoramento em Tempo Real</h2>
          <p className="text-[10px] text-text-secondary mt-0.5">Últimos eventos do painel nas seções de alunos, feedbacks e treinos</p>
        </div>

        <div className="overflow-x-auto w-full scrollable-area">
          <table className="min-w-full divide-y divide-border-subtle/50 text-left text-xs">
            <thead className="bg-surface-2 text-[10px] font-bold uppercase tracking-caps text-text-secondary">
              <tr>
                <th scope="col" className="px-5 py-3">Tipo</th>
                <th scope="col" className="px-5 py-3">Evento</th>
                <th scope="col" className="px-5 py-3">Descrição</th>
                <th scope="col" className="px-5 py-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/30 bg-surface-1 text-text-secondary">
              {atividades.length > 0 ? (
                atividades.map((act) => (
                  <tr key={act.id} className="hover:bg-brand/5 transition-colors">
                    <td className="px-5 py-3.5 align-middle">
                      {act.type === 'payment' && (
                        <span className="inline-flex px-1.5 py-0.5 bg-success-subtle text-success text-[9px] font-bold uppercase tracking-caps rounded">
                          Faturamento
                        </span>
                      )}
                      {act.type === 'workout' && (
                        <span className="inline-flex px-1.5 py-0.5 bg-brand-subtle text-brand text-[9px] font-bold uppercase tracking-caps rounded">
                          Treino
                        </span>
                      )}
                      {act.type === 'feedback' && (
                        <span className="inline-flex px-1.5 py-0.5 bg-surface-3 border border-border-default text-text-primary text-[9px] font-bold uppercase tracking-caps rounded">
                          Feedback
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 align-middle font-semibold text-text-primary">
                      {act.title}
                    </td>
                    <td className="px-5 py-3.5 align-middle truncate max-w-xs font-mono text-[11px]">
                      {act.subtitle}
                    </td>
                    <td className="px-5 py-3.5 align-middle text-text-tertiary whitespace-nowrap">
                      {fmtTime(act.time)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-text-tertiary text-xs">
                    Nenhuma atividade recente registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
