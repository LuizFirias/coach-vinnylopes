'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';

interface Profile {
  id: string;
  nome: string;
  frequencia_treino: number;
  avatar_url?: string | null;
}

export default function RankingPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        // top 10 alunos
        const { data: topData, error: topError } = await supabaseClient
          .from('profiles')
          .select('id, nome, frequencia_treino, avatar_url')
          .eq('type', 'aluno')
          .order('frequencia_treino', { ascending: false });
        // current user
        const { data: authData } = await supabaseClient.auth.getUser();
        const user = authData?.user;
        let currentProfile: Profile | null = null;
        let position: number | null = null;

        if (user) {
          const { data: meData, error: meError } = await supabaseClient
            .from('profiles')
            .select('id, nome, frequencia_treino, avatar_url')
            .eq('id', user.id)
            .single();

          if (!meError && meData) {
            currentProfile = meData as Profile;

            // count how many have greater frequencia_treino
            const userFreq = currentProfile.frequencia_treino ?? 0;
            const { count, error: countError } = await supabaseClient
              .from('profiles')
              .select('id', { count: 'exact' })
              .eq('type', 'aluno')
              .gt('frequencia_treino', userFreq);

            if (!countError) {
              position = (count || 0) + 1;
            }
          }
        }

        setProfiles((topData as Profile[]) || []);
        setUserProfile(currentProfile);
        setUserPosition(position);
      } catch (err) {
        setError('Erro ao conectar com o servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, []);

  const medalForPosition = (pos: number) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `${pos}`;
  };

  return (
    <div className="min-h-screen bg-coach-black p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Ranking dos Alunos</h1>
          <p className="text-gray-400">Mantenha a consistência — todo treino conta.</p>
        </div>

        {/* Motivational Banner */}
        <div className="mb-8 card-glass">
          <p className="text-center text-gray-200">
            <span className="text-coach-gold font-semibold">Mantenha o foco.</span>
            {' '}Os alunos mais assíduos aparecem aqui — inspire-se e suba no ranking!
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <svg className="w-12 h-12 animate-spin text-coach-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
            {error}
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-8 card-glass text-center">
            <p className="text-gray-300">Nenhum aluno encontrado no ranking ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top 3 em destaque */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {profiles.slice(0, 3).map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-4 ${
                    idx === 0 ? 'card-glass border-coach-gold/80 bg-gradient-to-b from-coach-gold/10 to-transparent' : 'card-glass'
                  }`}
                >
                  <div className="text-3xl">{medalForPosition(idx + 1)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-white overflow-hidden">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt={p.nome} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm">{p.nome?.slice(0,1) || 'A'}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{p.nome}</div>
                        <div className="text-sm text-gray-400">Treinos: <span className="text-coach-gold font-semibold">{p.frequencia_treino ?? 0}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Full list */}
            <div className="bg-coach-gray rounded-lg p-4 border border-coach-gold/10">
              <ul className="divide-y divide-gray-800">
                {profiles.map((p, index) => (
                  <li key={p.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white overflow-hidden">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt={p.nome} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm">{p.nome?.slice(0,1) || 'A'}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-white font-medium">{p.nome}</div>
                        <div className="text-xs text-gray-400">Posição: {index + 1}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-coach-gold font-semibold text-lg">{p.frequencia_treino ?? 0}</div>
                      <div className="text-xs text-gray-400">treinos</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
