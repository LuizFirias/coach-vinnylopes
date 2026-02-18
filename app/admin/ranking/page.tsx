'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';

interface Profile {
  id: string;
  full_name?: string | null;
  email?: string | null;
  ultimo_checkin?: string | null;
  avatar_url?: string | null;
}

export default function AdminRankingPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabaseClient
          .from('profiles')
          .select('id, full_name, email, ultimo_checkin, avatar_url')
          .eq('role', 'aluno')
          .order('ultimo_checkin', { ascending: false, nullsFirst: false })
          .limit(200);

        if (fetchError) throw fetchError;
        setProfiles((data as Profile[]) || []);
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar ranking');
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, []);

  return (
    <div className="min-h-screen bg-coach-black p-8 pt-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Ranking de Frequencia</h1>
          <p className="text-gray-400">Classificacao baseada em frequencia de treinos.</p>
        </div>

        {error && <div className="mb-4 text-red-400">{error}</div>}

        {loading ? (
          <div className="card-glass text-gray-300">Carregando...</div>
        ) : profiles.length === 0 ? (
          <div className="card-glass text-gray-300">Nenhum aluno encontrado.</div>
        ) : (
          <div className="card-glass overflow-x-auto p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-coach-gold/10">
                  <th className="px-4 py-3 text-sm text-gray-300">Posicao</th>
                  <th className="px-4 py-3 text-sm text-gray-300">Aluno</th>
                  <th className="px-4 py-3 text-sm text-gray-300">Ultimo Check-in</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p, index) => {
                  const displayName = p.full_name || p.email?.split('@')[0] || 'Aluno';
                  return (
                    <tr key={p.id} className="border-b border-coach-gold/10">
                      <td className="px-4 py-3 text-white">{index + 1}º</td>
                      <td className="px-4 py-3 text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white overflow-hidden">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm">{displayName.slice(0, 1)}</span>
                            )}
                          </div>
                          <span>{displayName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {p.ultimo_checkin ? new Date(p.ultimo_checkin).toLocaleString('pt-BR') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
