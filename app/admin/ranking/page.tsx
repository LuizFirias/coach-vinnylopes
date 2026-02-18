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

import { Trophy, Medal, Star, Clock, User, Loader2, AlertCircle } from 'lucide-react';

export default function AdminRankingPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRanking();
  }, []);

  async function fetchRanking() {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabaseClient
        .from('profiles')
        .select('id, full_name, email, ultimo_checkin, avatar_url, role')
        .eq('role', 'aluno')
        // Order by latest check-in first. If multiple have the same, secondary sort can be anything.
        .order('ultimo_checkin', { ascending: false, nullsFirst: false });

      if (fetchError) throw fetchError;
      setProfiles(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar ranking:', err);
      setError('Não foi possível carregar o ranking.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-10 lg:pl-28">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Ranking de <span className="text-brand-purple">Frequência</span>
          </h1>
          <p className="text-slate-500 font-medium">Classificação baseada nos check-ins mais recentes dos atletas</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 flex items-center gap-3 font-medium">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 md:py-32 gap-4 text-slate-400">
            <Loader2 size={40} className="animate-spin text-brand-purple" />
            <p className="text-xs font-black uppercase tracking-[0.3em]">Calculando posições...</p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 md:p-24 border border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 mb-6">
              <Star size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Nenhum atleta listado</h2>
            <p className="text-slate-500 max-w-sm">O ranking será preenchido conforme os alunos realizarem check-ins nos treinos.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-50 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">POSIÇÃO</th>
                  <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ALUNO</th>
                  <th className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ÚTIMA ATIVIDADE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {profiles.map((p, index) => {
                  const displayName = p.full_name || p.email?.split('@')[0] || 'Aluno';
                  const isTop3 = index < 3;
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 md:px-8 py-4 md:py-6">
                        <div className="flex items-center gap-3">
                          {index === 0 && <Trophy className="text-yellow-500" size={20} />}
                          {index === 1 && <Medal className="text-slate-400" size={20} />}
                          {index === 2 && <Medal className="text-amber-600" size={20} />}
                          <span className={`text-lg font-black ${isTop3 ? 'text-slate-900' : 'text-slate-400'}`}>
                            {index + 1}º
                          </span>
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-4 md:py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden border-2 ${isTop3 ? 'border-brand-purple/20 shadow-lg shadow-brand-purple/5' : 'border-slate-100'}`}>
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-400">
                                <User size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className={`block font-bold truncate max-w-50 ${isTop3 ? 'text-slate-900 text-base' : 'text-slate-600 text-sm'}`}>
                                {displayName}
                            </span>
                            {isTop3 && <span className="text-[9px] font-black text-brand-purple uppercase tracking-tight">Elite Performance</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-4 md:py-6">
                        <div className="flex items-center gap-2 text-slate-500 font-medium">
                          <Clock size={14} className="text-slate-300" />
                          <span className="text-sm">
                            {p.ultimo_checkin ? new Date(p.ultimo_checkin).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Nenhuma atividade'}
                          </span>
                        </div>
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
