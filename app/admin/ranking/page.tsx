'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getPublicStorageUrl } from '@/lib/storageUrls';
import { Trophy, Star, Clock, User, WarningCircle, Lightning } from '@phosphor-icons/react';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { cn } from '@/lib/utils/cn';

interface RankingEntry {
  id: string;
  coaching_reference?: string | null;
  email?: string | null;
  avatar_url?: string | null;
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

      // Buscar perfis dos alunos (inclui oculto_no_ranking — coach vê todos)
      const { data: profiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('id, coaching_reference, email, avatar_url, oculto_no_ranking')
        .in('id', alunoIds)
        .eq('arquivado', false);

      if (profilesError) throw profilesError;

      let pontsMap: Map<string, number>;

      if (periodo === 'total') {
        // Buscar pontuações totais
        const { data: pontuacoes, error: pontsError } = await supabaseClient
          .from('pontuacao_alunos')
          .select('aluno_id, total_pontos')
          .in('aluno_id', alunoIds);

        if (pontsError) throw pontsError;
        pontsMap = new Map((pontuacoes || []).map(p => [p.aluno_id, p.total_pontos]));
      } else {
        // Calcular pontos por mês usando historico_treinos + treinos_manuais
        const agora = new Date();
        const mesReferencia = periodo === 'mes_atual' ? agora : new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
        const inicioPeriodo = new Date(mesReferencia.getFullYear(), mesReferencia.getMonth(), 1).toISOString();
        const fimPeriodo = new Date(mesReferencia.getFullYear(), mesReferencia.getMonth() + 1, 0, 23, 59, 59).toISOString();

        // Fichas digitais: 20 pts por sessão única (por dia)
        const { data: fichasSessoes, error: fichasError } = await supabaseClient
          .from('historico_treinos')
          .select('aluno_id, data_conclusao')
          .in('aluno_id', alunoIds)
          .gte('data_conclusao', inicioPeriodo)
          .lte('data_conclusao', fimPeriodo);
        if (fichasError) throw fichasError;

        const sessoesUnicas = (fichasSessoes || []).reduce((acc: Record<string, Set<string>>, r) => {
          if (!acc[r.aluno_id]) acc[r.aluno_id] = new Set();
          acc[r.aluno_id].add(r.data_conclusao.slice(0, 10));
          return acc;
        }, {});

        // Checkins manuais
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

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-24">
      <div className="max-w-5xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight mb-1">
            Ranking de <span className="text-brand">Pontuação</span>
          </h1>
          <p className="text-sm text-text-tertiary">Classificação por pontos acumulados · todos os atletas visíveis para o coach</p>
        </div>

        {/* Filtro de Período */}
        <div className="mb-6 flex gap-2 p-1 bg-surface-2 border border-border-subtle rounded-xl max-w-md">
          {[
            { key: 'total', label: 'Total' },
            { key: 'mes_atual', label: 'Este mês' },
            { key: 'mes_anterior', label: 'Mês anterior' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriodo(key as typeof periodo)}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-caps transition-all',
                periodo === key
                  ? 'bg-brand text-text-on-brand shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger flex items-center gap-3 text-sm">
            <WarningCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <DumbbellLoader text="Calculando posições..." />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-16 md:p-24 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-disabled mb-6">
              <Star className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-text-primary mb-2">Nenhum atleta listado</h2>
            <p className="text-sm text-text-tertiary max-w-sm">O ranking será preenchido conforme os alunos realizarem treinos e acumularem pontos.</p>
          </div>
        ) : (
          <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[80px_1fr_160px_120px] px-6 py-3 bg-surface-2 border-b border-border-subtle">
              <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Posição</span>
              <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Atleta</span>
              <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary text-right">Pontos</span>
              <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary text-right">Visibilidade</span>
            </div>

            <div className="divide-y divide-border-subtle/50">
              {entries.map((entry, index) => {
                const displayName = entry.coaching_reference || entry.email?.split('@')[0] || 'Aluno';
                const isTop3 = index < 3;
                const medalha = ['🥇', '🥈', '🥉'][index] ?? null;
                const avatarSrc = entry.avatar_url ? getPublicStorageUrl('avatars', entry.avatar_url) : null;

                return (
                  <div key={entry.id} className={cn(
                    'flex items-center gap-4 px-4 md:px-6 py-4 hover:bg-surface-2/50 transition-colors',
                    entry.oculto_no_ranking && 'opacity-70'
                  )}>
                    <div className="w-12 flex-shrink-0 flex items-center gap-2">
                      {medalha ? (
                        <span className="text-xl">{medalha}</span>
                      ) : (
                        <span className={cn('text-sm font-bold', isTop3 ? 'text-text-primary' : 'text-text-tertiary')}>
                          {index + 1}º
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden border-2 flex-shrink-0',
                        isTop3 ? 'border-brand/30' : 'border-border-subtle',
                        !avatarSrc && 'bg-surface-3'
                      )}>
                        {avatarSrc ? (
                          <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-text-tertiary" />
                        )}
                      </div>
                      <span className={cn(
                        'font-semibold truncate',
                        isTop3 ? 'text-text-primary text-sm' : 'text-text-secondary text-sm'
                      )}>
                        {displayName}
                      </span>
                    </div>

                    <div className="hidden md:flex items-center justify-end gap-1.5 flex-shrink-0 min-w-[160px]">
                      <Lightning className="w-3.5 h-3.5 text-brand" />
                      <span className="text-sm font-bold text-brand">{entry.total_pontos} pts</span>
                    </div>

                    <div className="hidden md:flex items-center justify-end flex-shrink-0 min-w-[120px]">
                      {entry.oculto_no_ranking ? (
                        <span className="text-2xs px-2 py-1 rounded-full bg-surface-3 border border-border-subtle text-text-tertiary">
                          Oculto para alunos
                        </span>
                      ) : (
                        <span className="text-2xs px-2 py-1 rounded-full bg-brand-subtle border border-brand-border text-brand">
                          Visível
                        </span>
                      )}
                    </div>

                    {/* Mobile pontos */}
                    <div className="flex md:hidden items-center gap-1 flex-shrink-0">
                      <Lightning className="w-3 h-3 text-brand" />
                      <span className="text-xs font-bold text-brand">{entry.total_pontos}</span>
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
