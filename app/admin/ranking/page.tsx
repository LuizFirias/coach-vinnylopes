'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { Trophy, Star, Clock, WarningCircle, Lightning } from '@phosphor-icons/react';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { StudentAvatar } from '@/app/components/profile/StudentAvatar';
import { cn } from '@/lib/utils/cn';
import { toBrazilDateString } from '@/lib/dateUtils';

interface RankingEntry {
  id: string;
  coaching_reference?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  sexo?: string | null;
  total_pontos: number;
  oculto_no_ranking?: boolean | null;
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

      const coachId = (await getSafeSession())?.user?.id;
      if (!coachId) { setError('Sessão inválida'); return; }

      const { data: links, error: linksError } = await supabaseClient
        .from('coach_alunos')
        .select('aluno_id')
        .eq('coach_id', coachId);

      if (linksError) throw linksError;

      const alunoIds = (links || []).map(l => l.aluno_id);
      if (alunoIds.length === 0) { setEntries([]); return; }

      // Buscar perfis dos alunos
      const { data: profiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('id, coaching_reference, email, avatar_url, sexo, oculto_no_ranking')
        .in('id', alunoIds)
        .eq('arquivado', false);

      if (profilesError) throw profilesError;

      let pontsMap: Map<string, number>;

      if (periodo === 'total') {
        const { data: pontuacoes, error: pontsError } = await supabaseClient
          .from('pontuacao_alunos')
          .select('aluno_id, total_pontos')
          .in('aluno_id', alunoIds);

        if (pontsError) throw pontsError;
        pontsMap = new Map((pontuacoes || []).map(p => [p.aluno_id, p.total_pontos]));
      } else {
        const agora = new Date();
        const mesReferencia = periodo === 'mes_atual' ? agora : new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
        const inicioPeriodo = new Date(mesReferencia.getFullYear(), mesReferencia.getMonth(), 1).toISOString();
        const fimPeriodo = new Date(mesReferencia.getFullYear(), mesReferencia.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const { data: fichasSessoes, error: fichasError } = await supabaseClient
          .from('historico_treinos')
          .select('aluno_id, data_conclusao')
          .in('aluno_id', alunoIds)
          .gte('data_conclusao', inicioPeriodo)
          .lte('data_conclusao', fimPeriodo);
        if (fichasError) throw fichasError;

        const sessoesUnicas = (fichasSessoes || []).reduce((acc: Record<string, Set<string>>, r) => {
          if (!acc[r.aluno_id]) acc[r.aluno_id] = new Set();
          acc[r.aluno_id].add(toBrazilDateString(r.data_conclusao));
          return acc;
        }, {});

        const { data: treirosManuais, error: manuaisError } = await supabaseClient
          .from('treinos_manuais')
          .select('aluno_id, pontos_earn')
          .in('aluno_id', alunoIds)
          .eq('concluido', true)
          .gte('data_treino', inicioPeriodo)
          .lte('data_treino', fimPeriodo);
        if (manuaisError) throw manuaisError;

        const pontosManuais = (treirosManuais || []).reduce((acc: Record<string, number>, r) => {
          acc[r.aluno_id] = (acc[r.aluno_id] || 0) + (r.pontos_earn || 20);
          return acc;
        }, {});

        pontsMap = new Map(
          alunoIds.map(id => [
            id,
            (sessoesUnicas[id]?.size || 0) * 20 + (pontosManuais[id] || 0),
          ])
        );
      }

      const sorted = (profiles || [])
        .map(p => ({
          id: p.id,
          coaching_reference: p.coaching_reference,
          email: p.email,
          avatar_url: p.avatar_url,
          sexo: p.sexo,
          oculto_no_ranking: p.oculto_no_ranking,
          total_pontos: pontsMap.get(p.id) ?? 0,
        }))
        .sort((a, b) => b.total_pontos - a.total_pontos);

      setEntries(sorted);
    } catch (err: any) {
      console.error('Erro ao buscar ranking:', err);
      setError('Não foi possível carregar o ranking.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleVisibilidade(alunoId: string, atualOculto: boolean) {
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ oculto_no_ranking: !atualOculto })
        .eq('id', alunoId);
      if (error) throw error;
      setEntries(prev => prev.map(e => e.id === alunoId ? { ...e, oculto_no_ranking: !atualOculto } : e));
    } catch (err) {
      console.error('Erro ao atualizar visibilidade:', err);
      alert('Erro ao atualizar visibilidade');
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:pl-8 pb-24">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6 py-4 border-b border-divider flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight font-display">
              Ranking de Performance
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">Classificação por consistência e treinos concluídos</p>
          </div>

          {/* Filtro de Período */}
          <div className="flex gap-1 p-0.5 bg-surface-2 border-0 rounded-lg sm:w-80 w-full shrink-0 h-9.5 items-center">
            {[
              { key: 'total', label: 'Total' },
              { key: 'mes_atual', label: 'Este mês' },
              { key: 'mes_anterior', label: 'Mês anterior' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriodo(key as typeof periodo)}
                className={cn(
                  'flex-1 py-1 px-2 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all h-8.5',
                  periodo === key
                    ? 'bg-surface-0 border-0 text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger flex items-center gap-3 text-xs font-semibold">
            <WarningCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <DumbbellLoader text="Calculando posições..." variant="inline" />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-surface-1 border-0 shadow-sm rounded-xl py-12 px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-10 h-10 rounded-lg bg-surface-2 border-0 flex items-center justify-center text-text-disabled mb-4">
              <Star className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-text-primary mb-1">Nenhum aluno listado</h2>
            <p className="text-xs text-text-tertiary max-w-xs leading-normal">O ranking será preenchido conforme os alunos concluírem treinos e acumularem pontos.</p>
          </div>
        ) : (
          <div className="bg-surface-1 border-0 shadow-sm rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[60px_1fr_120px_120px] px-5 py-2.5 bg-surface-2 border-b border-divider">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Posição</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Aluno</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary text-right">Pontuação</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary text-right">Visibilidade</span>
            </div>

            <div className="divide-y divide-border-subtle/50">
              {entries.map((entry, index) => {
                const displayName = entry.coaching_reference || entry.email?.split('@')[0] || 'Aluno';
                const isTop3 = index < 3;

                return (
                  <div key={entry.id} className={cn(
                    'flex items-center gap-4 px-4 md:px-5 py-2.5 hover:bg-surface-2/40 transition-colors',
                    entry.oculto_no_ranking && 'opacity-70'
                  )}>
                    <div className="w-8 flex-shrink-0 flex items-center gap-1">
                      <span className={cn('text-xs font-mono font-medium', isTop3 ? 'text-brand' : 'text-text-tertiary')}>
                        #{index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <StudentAvatar
                        name={displayName}
                        avatarUrl={entry.avatar_url}
                        sexo={entry.sexo}
                        sizeClassName="w-7 h-7"
                        className={isTop3 ? "border-brand/30" : undefined}
                      />
                      <span className={cn(
                        'font-bold truncate text-xs',
                        isTop3 ? 'text-text-primary' : 'text-text-secondary'
                      )}>
                        {displayName}
                      </span>
                    </div>

                    <div className="hidden md:flex items-center justify-end gap-1 flex-shrink-0 min-w-[120px]">
                      <Lightning className="w-3.5 h-3.5 text-brand" />
                      <span className="text-xs font-bold text-brand font-mono tabular-nums lining-nums">{entry.total_pontos} pts</span>
                    </div>

                    <div className="hidden md:flex items-center justify-end flex-shrink-0 min-w-[120px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibilidade(entry.id, !!entry.oculto_no_ranking);
                        }}
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded transition-colors",
                          entry.oculto_no_ranking
                            ? "bg-surface-3 border-0 text-text-tertiary hover:bg-surface-4"
                            : "bg-brand/10 border border-brand/20 text-brand hover:bg-brand/20"
                        )}
                      >
                        {entry.oculto_no_ranking ? "Oculto" : "Visível"}
                      </button>
                    </div>

                    {/* Mobile pontos */}
                    <div className="flex md:hidden items-center gap-0.5 flex-shrink-0">
                      <Lightning className="w-3 h-3 text-brand" />
                      <span className="text-xs font-bold text-brand font-mono tabular-nums lining-nums">{entry.total_pontos}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
