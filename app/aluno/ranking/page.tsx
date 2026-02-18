'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { Trophy, Medal, Star, Clock, User, Loader2, Target, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  ultimo_checkin: string | null;
  avatar_url: string | null;
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
        setLoading(true);
        // top 50 alunos para o ranking
        const { data: topData, error: topError } = await supabaseClient
          .from('profiles')
          .select('id, full_name, email, ultimo_checkin, avatar_url')
          .eq('role', 'aluno')
          .order('ultimo_checkin', { ascending: false, nullsFirst: false })
          .limit(50);

        if (topError) throw topError;

        // current user
        const { data: authData } = await supabaseClient.auth.getUser();
        const user = authData?.user;
        let currentProfile: Profile | null = null;
        let position: number | null = null;

        if (user) {
          const { data: meData, error: meError } = await supabaseClient
            .from('profiles')
            .select('id, full_name, email, ultimo_checkin, avatar_url')
            .eq('id', user.id)
            .single();

          if (!meError && meData) {
            currentProfile = meData as Profile;

            if (currentProfile.ultimo_checkin) {
              const { count, error: countError } = await supabaseClient
                .from('profiles')
                .select('id', { count: 'exact' })
                .eq('role', 'aluno')
                .gt('ultimo_checkin', currentProfile.ultimo_checkin);

              if (!countError) {
                position = (count || 0) + 1;
              }
            }
          }
        }

        setProfiles((topData as Profile[]) || []);
        setUserProfile(currentProfile);
        setUserPosition(position);
      } catch (err) {
        console.error('Erro ao buscar ranking:', err);
        setError('Não foi possível carregar o ranking.');
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, []);

  return (
    <div className="min-h-screen bg-iron-black p-4 md:p-6 lg:p-10 lg:pl-28">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div>
            <Link href="/aluno/dashboard" className="inline-flex items-center gap-2 text-iron-red font-black text-[9px] md:text-[10px] uppercase tracking-widest mb-3 md:mb-4 hover:gap-3 transition-all">
              <ArrowLeft size={12} /> Voltar ao Painel
            </Link>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
              Ranking de <span className="text-iron-red">Frequência</span>
            </h1>
            <p className="text-zinc-500 font-medium text-sm">Os atletas mais consistentes da consultoria</p>
          </div>
          
          {userPosition && (
            <div className="bg-zinc-900/50 backdrop-blur-xl px-5 md:px-8 py-4 md:py-5 rounded-xl md:rounded-2xl border border-white/5 shadow-2xl flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-iron-red/10 flex items-center justify-center text-iron-red">
                <Target size={20} />
              </div>
              <div>
                <span className="block text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Sua Posição</span>
                <span className="text-xl md:text-2xl font-black text-white">#{userPosition}º</span>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-zinc-500">
            <Loader2 size={40} className="animate-spin text-[#E30613]" />
            <p className="text-xs font-black uppercase tracking-[0.3em]">Calculando posições...</p>
          </div>
        ) : error ? (
          <div className="mb-8 p-6 bg-red-950/20 border border-red-900/50 rounded-2xl text-red-500 flex items-center gap-4 font-bold shadow-sm">
            <div className="w-10 h-10 rounded-full bg-red-950 flex items-center justify-center">!</div>
            {error}
          </div>
        ) : profiles.length === 0 ? (
          <div className="bg-zinc-900/50 backdrop-blur-xl rounded-[40px] p-24 border border-white/5 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-zinc-700 mb-6">
              <Star size={40} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Ranking vazio</h2>
            <p className="text-zinc-500 max-w-sm">Comece a treinar para aparecer no topo do ranking!</p>
          </div>
        ) : (
          <div className="space-y-8 md:space-y-12">
            {/* Top 3 Visual */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8 items-end">
              {/* 2nd Place */}
              {profiles[1] && (
                <div className="order-2 md:order-1 bg-zinc-900/50 backdrop-blur-xl p-6 md:p-8 rounded-2xl md:rounded-3xl border border-white/5 shadow-2xl flex flex-col items-center text-center relative group">
                  <div className="absolute -top-3 md:-top-4 bg-zinc-800 text-zinc-400 px-3 md:px-4 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest">2º LUGAR</div>
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-zinc-800 overflow-hidden mb-3 md:mb-4 shadow-lg group-hover:scale-110 transition-transform">
                    {profiles[1].avatar_url ? (
                      <img src={profiles[1].avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-500"><User /></div>
                    )}
                  </div>
                  <h3 className="font-black text-white truncate w-full text-sm md:text-base">{profiles[1].full_name?.split(' ')[0] || 'Atleta'}</h3>
                  <div className="mt-3 md:mt-4 flex items-center gap-2 text-zinc-500 font-bold text-[9px] md:text-[10px] uppercase tracking-widest">
                    <Clock size={12} /> {profiles[1].ultimo_checkin ? new Date(profiles[1].ultimo_checkin).toLocaleDateString('pt-BR') : '—'}
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {profiles[0] && (
                <div className="order-1 md:order-2 bg-zinc-900 p-10 rounded-[48px] shadow-[0_0_50px_rgba(227,6,19,0.15)] border border-[#E30613]/20 flex flex-col items-center text-center relative group scale-105">
                  <div className="absolute -top-5 bg-[#E30613] text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#E30613]/30 flex items-center gap-2">
                    <Trophy size={14} /> CAMPEÃO
                  </div>
                  <div className="w-28 h-28 rounded-full border-4 border-[#E30613]/30 overflow-hidden mb-6 shadow-2xl group-hover:scale-110 transition-transform relative">
                    {profiles[0].avatar_url ? (
                      <img src={profiles[0].avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-500"><User size={40} /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#E30613]/20 to-transparent" />
                  </div>
                  <h3 className="text-xl font-black text-white truncate w-full">{profiles[0].full_name?.split(' ')[0] || 'Atleta'}</h3>
                  <p className="text-[#E30613] font-black text-[10px] uppercase tracking-widest mt-2">Elite Performance</p>
                </div>
              )}

              {/* 3rd Place */}
              {profiles[2] && (
                <div className="order-3 bg-zinc-900/50 backdrop-blur-xl p-8 rounded-[40px] border border-white/5 shadow-2xl flex flex-col items-center text-center relative group">
                  <div className="absolute -top-4 bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">3º LUGAR</div>
                  <div className="w-20 h-20 rounded-full border-4 border-[#D4AF37]/10 overflow-hidden mb-4 shadow-lg group-hover:scale-110 transition-transform">
                    {profiles[2].avatar_url ? (
                      <img src={profiles[2].avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-500"><User /></div>
                    )}
                  </div>
                  <h3 className="font-black text-white truncate w-full">{profiles[2].full_name?.split(' ')[0] || 'Atleta'}</h3>
                  <div className="mt-4 flex items-center gap-2 text-zinc-500 font-bold text-[10px] uppercase tracking-widest">
                    <Clock size={12} /> {profiles[2].ultimo_checkin ? new Date(profiles[2].ultimo_checkin).toLocaleDateString('pt-BR') : '—'}
                  </div>
                </div>
              )}
            </div>

            {/* General List */}
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/5 overflow-hidden">
               <div className="px-10 py-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Classificação Geral</h2>
                  <div className="flex items-center gap-2 px-4 py-1 bg-white/5 rounded-full border border-white/5 text-zinc-400 font-bold text-[10px]">
                    {profiles.length} ATLETAS ATIVOS
                  </div>
               </div>
               
               <div className="divide-y divide-white/5">
                {profiles.map((p, index) => {
                  const isCurrentUser = userProfile?.id === p.id;
                  
                  return (
                    <div key={p.id} className={`px-10 py-6 flex items-center justify-between hover:bg-white/5 transition-colors ${isCurrentUser ? 'bg-[#E30613]/5' : ''}`}>
                      <div className="flex items-center gap-6">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${
                          index < 3 ? 'bg-[#E30613] text-white' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {index + 1}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full border-2 overflow-hidden shadow-sm ${isCurrentUser ? 'border-[#E30613]' : 'border-zinc-800'}`}>
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600 font-bold">
                                <User size={18} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className={`font-bold ${isCurrentUser ? 'text-[#E30613]' : 'text-white'}`}>
                              {p.full_name || p.email?.split('@')[0]}
                              {isCurrentUser && <span className="ml-2 text-[8px] font-black uppercase bg-[#E30613] text-white px-2 py-0.5 rounded-full tracking-widest">VOCÊ</span>}
                            </p>
                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Atleta Ironberg</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm font-black text-white">
                          {p.ultimo_checkin ? new Date(p.ultimo_checkin).toLocaleDateString('pt-BR') : '—'}
                        </p>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Último Check-in</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
