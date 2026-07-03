'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getPublicStorageUrl } from '@/lib/storageUrls';
import { getSafeSession } from '@/lib/authErrorHandler';
import { Trophy, Lightning, ArrowLeft } from '@phosphor-icons/react';
import Link from 'next/link';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { cn } from '@/lib/utils/cn';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  aluno_id: string;
  full_name: string | null;
  coaching_reference: string | null;
  avatar_url: string | null;
  pontos: number;
  streak: number;
  posicao: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const COMO_GANHAR = [
  { label: 'Consistência (Treino concluído)',       pts: '+20 pts' },
  { label: 'Performance (Recorde pessoal batido)', pts: '+10 pts' },
  { label: 'Check-in visual (Foto de evolução)',    pts: '+5 pts'  },
  { label: 'Registro de evolução (Medida)',         pts: '+3 pts'  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return 'A';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function RankingPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [minha, setMinha] = useState<LeaderboardEntry | null>(null);
  const [atletasAtivos, setAtletasAtivos] = useState(0);
  const [periodo, setPeriodo] = useState<'total' | 'mes_atual' | 'mes_anterior'>('total');

  // ── Carregar ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    const session = await getSafeSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    try {
      const agora = new Date();
      let inicioPeriodo: string | null = null;
      let fimPeriodo: string | null = null;

      if (periodo !== 'total') {
        const mesRef = periodo === 'mes_atual' ? agora : new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
        inicioPeriodo = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1).toISOString();
        fimPeriodo = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0, 23, 59, 59).toISOString();
      }

      const { data: rawEntries, error } = await supabaseClient.rpc('get_ranking_colegas', {
        p_periodo: periodo,
        p_inicio_periodo: inicioPeriodo,
        p_fim_periodo: fimPeriodo,
      });

      if (error) console.error('[Ranking RPC]', error.message, error.code);

      const entries: LeaderboardEntry[] = (rawEntries || []).map((r: any, idx: number) => ({
        aluno_id: r.aluno_id,
        full_name: r.full_name,
        coaching_reference: r.coaching_reference,
        avatar_url: getPublicStorageUrl('avatars', r.avatar_url),
        pontos: r.pontos,
        streak: r.streak,
        posicao: idx + 1,
      }));

      setLeaderboard(entries);
      setMinha(entries.find(e => e.aluno_id === user.id) ?? null);

      // Atletas ativos na semana (filtrado pelo coach)
      const { data: ativos } = await supabaseClient
        .from('v_atletas_ativos_semana')
        .select('quantidade')
        .maybeSingle();

      setAtletasAtivos(ativos?.quantidade ?? 0);
    } catch (err) {
      console.error('[Ranking]', err);
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Carregando ranking..." />
      </div>
    );
  }

  const isSolo = leaderboard.length <= 1;
  const pontos = minha?.pontos ?? 0;
  const posicao = minha?.posicao ?? null;

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-24">
      <div className="max-w-lg mx-auto flex flex-col gap-5">

        {/* ── Header ── */}
        <div>
          <Link href="/aluno/dashboard" className="inline-flex items-center gap-1.5 text-brand text-2xs uppercase tracking-caps mb-4">
            <ArrowLeft className="w-3 h-3" /> Dashboard
          </Link>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">Ranking</h1>
              <p className="text-xs text-text-tertiary mt-0.5">
                {isSolo
                  ? periodo === 'total' ? 'Sua jornada completa' : periodo === 'mes_atual' ? 'Sua jornada este mês' : 'Sua jornada no mês anterior'
                  : periodo === 'total'
                    ? `${atletasAtivos} atleta${atletasAtivos !== 1 ? 's' : ''} ativo${atletasAtivos !== 1 ? 's' : ''} esta semana`
                    : periodo === 'mes_atual'
                      ? `Classificação deste mês`
                      : `Classificação do mês anterior`}
              </p>
            </div>
            {minha != null && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-brand/10 border border-brand/20 rounded-md">
                <Lightning size={12} weight="fill" className="text-brand" />
                <span className="text-xs font-bold text-brand font-mono tabular-nums">{pontos} pts</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Filtro de Período ── */}
        <div className="flex border-b border-border-subtle">
          {[
            { key: 'total', label: 'Total' },
            { key: 'mes_atual', label: 'Este mês' },
            { key: 'mes_anterior', label: 'Mês anterior' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriodo(key as typeof periodo)}
              className={cn(
                'flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-caps transition-all border-b-2 -mb-px',
                periodo === key
                  ? 'text-brand border-brand'
                  : 'text-text-tertiary border-transparent hover:text-text-primary'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Estado SOLO ── */}
        {isSolo && (
          <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-5 text-center">
            <p className="text-4xl font-bold text-text-primary">{pontos}</p>
            <p className="text-xs text-text-tertiary mt-1">pontos totais</p>
          </div>
        )}

        {/* ── Estado COMUNIDADE ── */}
        {!isSolo && (
          <>
            {/* Sua posição */}
            {minha && posicao !== null && (
              <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-4 flex items-center gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-lg',
                  posicao === 1 ? 'bg-brand text-text-on-brand' : 'bg-surface-3 text-text-primary'
                )}>
                  {posicao === 1 ? <Trophy className="w-6 h-6" /> : `#${posicao}`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary">
                    {posicao === 1 ? 'Você está em 1º lugar!' : `#${posicao} de ${leaderboard.length}`}
                  </p>
                  {posicao > 1 && leaderboard[posicao - 2] && (
                    <p className="text-xs text-text-tertiary mt-0.5">
                      Faltam <span className="font-semibold text-text-primary">
                        {leaderboard[posicao - 2].pontos - pontos} pts
                      </span> para o #{posicao - 1}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Lightning className="w-3.5 h-3.5 text-brand" />
                  <span className="text-sm font-bold text-brand">{pontos} pts</span>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl overflow-hidden mb-4">
              <div className="px-4 py-2.5 bg-surface-2 border-b border-border-subtle">
                <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Classificação</span>
              </div>
              <div>
                {leaderboard.map((entry, idx) => {
                  const isMe = entry.aluno_id === userId;
                  return (
                    <div key={entry.aluno_id} className={cn(
                      'flex items-center gap-3 px-4 py-3 border-b border-border-subtle last:border-b-0',
                      isMe && 'bg-brand/8 border-l-2 border-l-brand'
                    )}>
                      {/* Posição */}
                      <span className={cn(
                        'w-8 text-center text-sm font-bold flex-shrink-0 font-mono',
                        idx < 3 ? 'text-brand' : 'text-text-tertiary'
                      )}>
                        #{idx + 1}
                      </span>

                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-surface-3 border border-border-subtle flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {entry.avatar_url
                          ? <img src={entry.avatar_url} alt={entry.coaching_reference ?? entry.full_name ?? ''} className="w-full h-full object-cover" />
                          : <span className="text-xs font-semibold text-text-secondary">{getInitials(entry.coaching_reference ?? entry.full_name)}</span>}
                      </div>

                      {/* Nome */}
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium truncate', isMe ? 'text-brand' : 'text-text-primary')}>
                          {isMe ? 'Você' : (entry.coaching_reference ?? entry.full_name?.split(' ')[0] ?? 'Atleta')}
                        </p>
                        {entry.streak > 0 && (
                          <div className="flex items-center gap-1 text-[9px] text-brand font-bold mt-0.5 uppercase tracking-wider">
                            <span className="w-1 h-1 rounded-full bg-brand animate-pulse" />
                            <span>{entry.streak} {entry.streak === 1 ? 'semana ativa' : 'semanas ativas'}</span>
                          </div>
                        )}
                      </div>

                      {/* Pontos */}
                      <span className={cn('text-sm font-bold flex-shrink-0', isMe ? 'text-brand' : 'text-text-secondary')}>
                        {entry.pontos} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Como ganhar pontos (sempre visível) ── */}
        <div className="bg-surface-1 border border-border-subtle rounded-2xl p-4">
          <span className="block text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-3">Como ganhar pontos</span>
          <div>
            {COMO_GANHAR.map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-b-0">
                <span className="text-sm text-text-primary">{item.label}</span>
                <span className="text-sm font-bold text-brand">{item.pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mensagem solo */}
        {isSolo && leaderboard.length === 0 && (
          <p className="text-xs text-text-tertiary text-center px-4">
            Quando outros atletas se juntarem à consultoria, vocês vão se ver aqui.
          </p>
        )}

      </div>
    </div>
  );
}
