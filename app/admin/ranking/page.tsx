'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getPublicStorageUrl } from '@/lib/storageUrls';
import { Trophy, Star, User, WarningCircle, Lightning } from '@phosphor-icons/react';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import PageHeader from '@/app/components/PageHeader';
import DataTable from '@/app/components/DataTable';
import { cn } from '@/lib/utils/cn';

interface RankingEntry {
  id: string;
  coaching_reference?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  total_pontos: number;
  oculto_no_ranking?: boolean | null;
  posicao: number;
  streak: number;
  treinos_periodo: number;
}

export default function AdminRankingPage() {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<'total' | 'mes_atual' | 'mes_anterior'>('total');

  useEffect(() => {
    fetchRanking();
  }, [periodo]);

  async function fetchRanking() {
    try {
      setLoading(true);
      setError(null);

      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) { setError('Sessão inválida'); return; }

      const { data: links, error: linksError } = await supabaseClient
        .from('coach_alunos')
        .select('aluno_id')
        .eq('coach_id', coachId);

      if (linksError) throw linksError;

      const alunoIds = (links || []).map(l => l.aluno_id);
      if (alunoIds.length === 0) { setEntries([]); return; }

      // 1. Buscar perfis dos alunos
      const { data: profiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('id, coaching_reference, email, avatar_url, oculto_no_ranking')
        .in('id', alunoIds)
        .eq('arquivado', false);

      if (profilesError) throw profilesError;

      // 2. Buscar sequência (streak) de v_streak_aluno
      const { data: streaksData, error: streaksError } = await supabaseClient
        .from('v_streak_aluno')
        .select('aluno_id, streak_atual')
        .in('aluno_id', alunoIds);

      const streakMap = new Map<string, number>();
      if (!streaksError && streaksData) {
        streaksData.forEach(s => streakMap.set(s.aluno_id, s.streak_atual || 0));
      }

      // 3. Definir limites de data com base no período selecionado
      const agora = new Date();
      let inicioPeriodo: string | null = null;
      let fimPeriodo: string | null = null;

      if (periodo !== 'total') {
        const mesReferencia = periodo === 'mes_atual' ? agora : new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
        inicioPeriodo = new Date(mesReferencia.getFullYear(), mesReferencia.getMonth(), 1).toISOString();
        fimPeriodo = new Date(mesReferencia.getFullYear(), mesReferencia.getMonth() + 1, 0, 23, 59, 59).toISOString();
      }

      // 4. Buscar treinos digitais (historico_treinos) no período
      let queryDigital = supabaseClient
        .from('historico_treinos')
        .select('aluno_id, data_conclusao')
        .in('aluno_id', alunoIds);

      if (inicioPeriodo && fimPeriodo) {
        queryDigital = queryDigital.gte('data_conclusao', inicioPeriodo).lte('data_conclusao', fimPeriodo);
      }
      const { data: rawDigital, error: digitalErr } = await queryDigital;
      if (digitalErr) throw digitalErr;

      // Agrupar treinos digitais por dia único
      const digitalDaysMap = new Map<string, Set<string>>();
      (rawDigital || []).forEach(d => {
        if (!digitalDaysMap.has(d.aluno_id)) {
          digitalDaysMap.set(d.aluno_id, new Set<string>());
        }
        digitalDaysMap.get(d.aluno_id)!.add(d.data_conclusao.slice(0, 10));
      });

      // 5. Buscar treinos manuais (treinos_manuais) no período
      let queryManual = supabaseClient
        .from('treinos_manuais')
        .select('aluno_id, pontos_earn')
        .in('aluno_id', alunoIds)
        .eq('concluido', true);

      if (inicioPeriodo && fimPeriodo) {
        queryManual = queryManual.gte('data_treino', inicioPeriodo).lte('data_treino', fimPeriodo);
      }
      const { data: rawManual, error: manualErr } = await queryManual;
      if (manualErr) throw manualErr;

      // Contabilizar treinos manuais e pontos
      const manualCountMap = new Map<string, number>();
      const manualPointsMap = new Map<string, number>();
      (rawManual || []).forEach(m => {
        manualCountMap.set(m.aluno_id, (manualCountMap.get(m.aluno_id) || 0) + 1);
        manualPointsMap.set(m.aluno_id, (manualPointsMap.get(m.aluno_id) || 0) + (m.pontos_earn || 20));
      });

      // 6. Definir mapa de pontos com base no período
      let pointsMap = new Map<string, number>();
      if (periodo === 'total') {
        const { data: totalPointsData, error: pointsError } = await supabaseClient
          .from('pontuacao_alunos')
          .select('aluno_id, total_pontos')
          .in('aluno_id', alunoIds);

        if (pointsError) throw pointsError;
        (totalPointsData || []).forEach(p => pointsMap.set(p.aluno_id, p.total_pontos || 0));
      } else {
        alunoIds.forEach(id => {
          const digitalUniqueCount = digitalDaysMap.get(id)?.size || 0;
          const manualPts = manualPointsMap.get(id) || 0;
          pointsMap.set(id, (digitalUniqueCount * 20) + manualPts);
        });
      }

      // Mapear e estruturar registros
      const mappedEntries: RankingEntry[] = (profiles || []).map(p => {
        const digitalCount = digitalDaysMap.get(p.id)?.size || 0;
        const manualCount = manualCountMap.get(p.id) || 0;
        const totalWorkouts = digitalCount + manualCount;

        return {
          id: p.id,
          coaching_reference: p.coaching_reference,
          email: p.email,
          avatar_url: p.avatar_url,
          oculto_no_ranking: p.oculto_no_ranking,
          total_pontos: pointsMap.get(p.id) ?? 0,
          streak: streakMap.get(p.id) ?? 0,
          treinos_periodo: totalWorkouts,
          posicao: 0
        };
      });

      // Ordenar decrescente por pontos
      mappedEntries.sort((a, b) => b.total_pontos - a.total_pontos);

      // Atribuir as posições oficiais
      mappedEntries.forEach((entry, idx) => {
        entry.posicao = idx + 1;
      });

      setEntries(mappedEntries);
    } catch (err: any) {
      console.error('Erro ao buscar ranking:', err);
      setError('Não foi possível carregar o ranking.');
    } finally {
      setLoading(false);
    }
  }

  const toggleVisibilidade = async (entry: RankingEntry) => {
    try {
      const newValue = !entry.oculto_no_ranking;
      const { error } = await supabaseClient
        .from('profiles')
        .update({ oculto_no_ranking: newValue })
        .eq('id', entry.id);
      if (error) throw error;
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, oculto_no_ranking: newValue } : e));
    } catch (err: any) {
      alert('Erro ao alterar visibilidade: ' + err.message);
    }
  };

  const columns = [
    {
      key: 'posicao',
      label: 'Posição',
      sortable: true,
      width: '90px',
      render: (row: RankingEntry) => {
        const medalha = ['🥇', '🥈', '🥉'][row.posicao - 1] ?? null;
        if (medalha) {
          return <span className="text-base select-none">{medalha}</span>;
        }
        return <span className="font-bold text-text-secondary text-xs font-mono">{row.posicao}º</span>;
      }
    },
    {
      key: 'coaching_reference',
      label: 'Atleta',
      sortable: true,
      width: '280px',
      render: (row: RankingEntry) => {
        const displayName = row.coaching_reference || row.email?.split('@')[0] || 'Atleta';
        const avatarSrc = row.avatar_url ? getPublicStorageUrl('avatars', row.avatar_url) : null;
        return (
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full overflow-hidden border-2 shrink-0 flex items-center justify-center font-bold text-xs text-white shadow-sm",
              row.posicao <= 3 ? "border-brand/35 bg-brand-subtle" : "border-border-subtle bg-surface-3"
            )}>
              {avatarSrc ? (
                <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                displayName[0].toUpperCase()
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-text-primary truncate text-xs">{displayName}</span>
              <span className="text-[10px] text-text-secondary truncate leading-none mt-0.5">{row.email}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'streak',
      label: 'Sequência',
      sortable: true,
      render: (row: RankingEntry) => {
        if (row.streak <= 0) return <span className="text-text-tertiary text-xs">—</span>;
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-brand font-mono">
            🔥 {row.streak} {row.streak === 1 ? 'dia' : 'dias'}
          </span>
        );
      }
    },
    {
      key: 'treinos_periodo',
      label: 'Treinos no Período',
      sortable: true,
      render: (row: RankingEntry) => (
        <span className="text-xs text-text-secondary font-mono font-medium">
          {row.treinos_periodo} {row.treinos_periodo === 1 ? 'treino' : 'treinos'}
        </span>
      )
    },
    {
      key: 'total_pontos',
      label: 'Pontos',
      sortable: true,
      render: (row: RankingEntry) => (
        <div className="flex items-center gap-1.5 text-brand font-mono font-bold text-xs">
          <Lightning size={14} className="fill-brand shrink-0" />
          <span>{row.total_pontos} pts</span>
        </div>
      )
    },
    {
      key: 'oculto_no_ranking',
      label: 'Visibilidade',
      sortable: true,
      render: (row: RankingEntry) => {
        const isOculto = row.oculto_no_ranking;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleVisibilidade(row);
            }}
            className={cn(
              "px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wide border transition-all cursor-pointer",
              isOculto 
                ? "bg-surface-3 border-border-default text-text-disabled hover:border-brand/20 hover:text-text-secondary" 
                : "bg-brand-subtle border-brand-border text-brand hover:opacity-90"
            )}
          >
            {isOculto ? 'Oculto' : 'Visível'}
          </button>
        );
      }
    }
  ];

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-16 xl:pl-[240px]">
      <div className="max-w-[1440px] px-6 md:px-10 py-8 mx-auto w-full flex flex-col gap-6 animate-fade-in">
        
        {/* Header */}
        <PageHeader
          title="Ranking de Pontuação"
          subtitle="Classificação por pontos acumulados e engajamento dos atletas"
          breadcrumbs={[
            { label: "Atletas", href: "/admin/alunos" },
            { label: "Ranking" }
          ]}
        />

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[6px] bg-danger-subtle border border-danger-border text-danger text-sm">
            <WarningCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Filtro de Período */}
        <div className="flex bg-surface-2 p-1 rounded-[6px] border border-border-subtle w-fit mb-2">
          {[
            { key: 'total', label: 'Total' },
            { key: 'mes_atual', label: 'Este mês' },
            { key: 'mes_anterior', label: 'Mês anterior' },
          ].map(({ key, label }) => {
            const active = periodo === key;
            return (
              <button
                key={key}
                onClick={() => setPeriodo(key as typeof periodo)}
                className={cn(
                  "px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-[4px] transition-colors whitespace-nowrap",
                  active
                    ? "bg-brand text-text-on-brand shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Tabela Principal */}
        {loading ? (
          <div className="flex items-center justify-center py-24 bg-surface-1 border border-border-subtle rounded-[10px] shadow-sm">
            <DumbbellLoader text="Calculando posições e sequências..." />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-surface-1 border border-border-subtle shadow-sm rounded-[10px] p-16 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center text-text-disabled mb-5">
              <Trophy className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-text-primary mb-2">Nenhum atleta ativo no período</h2>
            <p className="text-xs text-text-tertiary max-w-sm">O ranking será atualizado automaticamente assim que os atletas realizarem novos treinos ou check-ins.</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={entries}
            pagination={{ pageSize: 15 }}
            emptyState={
              <div className="text-center py-12 flex flex-col items-center justify-center gap-2">
                <Trophy size={28} className="text-text-disabled" />
                <p className="text-xs text-text-tertiary">Nenhum atleta com pontuação no período selecionado</p>
              </div>
            }
          />
        )}

      </div>
    </div>
  );
}
