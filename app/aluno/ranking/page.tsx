'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getPublicStorageUrl } from '@/lib/storageUrls';
import { formatCount } from '@/lib/utils/pluralize';
import { Trophy, Medal, Star, Zap, User, Loader2, Target, ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';

interface RankingEntry {
  aluno_id: string;
  total_pontos: number;
  full_name: string | null;
  avatar_url: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export default function RankingPage() {
  const [profiles, setProfiles] = useState<RankingEntry[]>([]);
  const [userProfile, setUserProfile] = useState<{profile: Profile, points: number} | null>(null);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        setLoading(true);
        
        // Get current user first
        const { data: authData } = await supabaseClient.auth.getUser();
        const user = authData?.user;

        if (!user) {
          setLoading(false);
          return;
        }

        // Get user's profile and coach_id
        const { data: meData, error: meError } = await supabaseClient
          .from('profiles')
          .select('id, full_name, email, avatar_url, coach_id, role')
          .eq('id', user.id)
          .single();

        if (meError || !meData) {
          throw new Error('Não foi possível carregar seu perfil');
        }

        let mappedData: RankingEntry[] = [];
        let currentProfile: {profile: Profile, points: number} | null = null;
        let position: number | null = null;

        // If user is a student, fetch only their coach's students
        if (meData.role === 'aluno') {
          const coachId = meData.coach_id;
          
          if (!coachId) {
            setError('Você não está atribuído a nenhum coach ainda.');
            setLoading(false);
            return;
          }

          // Fetch all students of the same coach
          const { data: coachStudents, error: coachError } = await supabaseClient
            .from('coach_alunos')
            .select('aluno_id')
            .eq('coach_id', coachId);

          if (coachError) throw coachError;

          const alunoIds = (coachStudents || []).map(s => s.aluno_id);

          if (alunoIds.length === 0) {
            setProfiles([]);
            setLoading(false);
            return;
          }

          // Fetch points for all students
          const { data: pontuacaoData, error: pontuacaoError } = await supabaseClient
            .from('pontuacao_alunos')
            .select('aluno_id, total_pontos')
            .in('aluno_id', alunoIds);

          if (pontuacaoError) throw pontuacaoError;

          // Fetch profiles for all students
          const { data: profilesData, error: profilesError } = await supabaseClient
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', alunoIds);

          if (profilesError) throw profilesError;

          // Combine data
          mappedData = (pontuacaoData || [])
            .map((pontos) => {
              const profile = (profilesData || []).find(p => p.id === pontos.aluno_id);
              return {
                aluno_id: pontos.aluno_id,
                total_pontos: pontos.total_pontos || 0,
                full_name: profile?.full_name || null,
                avatar_url: profile?.avatar_url || null
              };
            })
            .sort((a, b) => b.total_pontos - a.total_pontos);

          // Get user's points
          const { data: pointsData } = await supabaseClient
            .from('pontuacao_alunos')
            .select('total_pontos')
            .eq('aluno_id', user.id)
            .maybeSingle();

          currentProfile = {
            profile: meData as Profile,
            points: pointsData?.total_pontos || 0
          };

          // Calculate user's position
          const usersWithMorePoints = mappedData.filter(p => p.total_pontos > (pointsData?.total_pontos || 0)).length;
          position = usersWithMorePoints + 1;
        }
        // If user is a coach, show their students
        else if (meData.role === 'coach') {
          const { data: coachStudents, error: coachError } = await supabaseClient
            .from('coach_alunos')
            .select('aluno_id')
            .eq('coach_id', user.id);

          if (coachError) throw coachError;

          const alunoIds = (coachStudents || []).map(s => s.aluno_id);

          if (alunoIds.length === 0) {
            setProfiles([]);
            setLoading(false);
            return;
          }

          // Fetch points for all students
          const { data: pontuacaoData, error: pontuacaoError } = await supabaseClient
            .from('pontuacao_alunos')
            .select('aluno_id, total_pontos')
            .in('aluno_id', alunoIds);

          if (pontuacaoError) throw pontuacaoError;

          // Fetch profiles for all students
          const { data: profilesData, error: profilesError } = await supabaseClient
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', alunoIds);

          if (profilesError) throw profilesError;

          // Combine data
          mappedData = (pontuacaoData || [])
            .map((pontos) => {
              const profile = (profilesData || []).find(p => p.id === pontos.aluno_id);
              return {
                aluno_id: pontos.aluno_id,
                total_pontos: pontos.total_pontos || 0,
                full_name: profile?.full_name || null,
                avatar_url: profile?.avatar_url || null
              };
            })
            .sort((a, b) => b.total_pontos - a.total_pontos);

          currentProfile = {
            profile: meData as Profile,
            points: 0
          };
        }

        // Resolver URL pública de cada avatar (suporta path novo e URL legada)
        const processedData = mappedData.map((entry) => ({
          ...entry,
          avatar_url: getPublicStorageUrl('avatars', entry.avatar_url),
        }));

        setProfiles(processedData);
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
    <div className="min-h-screen bg-bg-base p-4 md:p-6 lg:p-10 lg:pl-28">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div>
            <Link href="/aluno/dashboard" className="inline-flex items-center gap-2 text-gold-light text-[9px] md:text-[10px] uppercase tracking-widest mb-3 md:mb-4 hover:gap-3 transition-all">
              <ArrowLeft size={12} /> Voltar ao Painel
            </Link>
            <h1 className="heading-h1 text-text-primary mb-2">
              Ranking de <span className="text-gold-light">Desempenho</span>
            </h1>
            <p className="body-text text-text-secondary text-sm">Os atletas mais dedicados da consultoria</p>
          </div>
          
          {userProfile && (
            <div className="bg-bg-card px-5 md:px-8 py-4 md:py-5 rounded-lg md:rounded-lg border border-border-subtle shadow-2xl shadow-gold-default/5 flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-lg bg-gold-default/10 flex items-center justify-center text-gold-light">
                <Zap size={20} />
              </div>
              <div>
                <span className="block label-small text-text-secondary leading-none mb-1">Seus Pontos</span>
                <span className="text-xl md:text-2xl text-text-primary font-700">{userProfile.points} pts</span>
              </div>
            </div>
          )}

          {userPosition && (
            <div className="bg-bg-card px-5 md:px-8 py-4 md:py-5 rounded-lg md:rounded-lg border border-border-subtle shadow-2xl shadow-gold-default/5 flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-lg bg-danger/10 flex items-center justify-center text-danger">
                <Target size={20} />
              </div>
              <div>
                <span className="block label-small text-text-secondary leading-none mb-1">Sua Posição</span>
                <span className="text-xl md:text-2xl text-text-primary font-700">#{userPosition}º</span>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-text-secondary">
            <Loader2 size={40} className="animate-spin text-gold-light" />
            <p className="label-small text-text-secondary">Calculando posições...</p>
          </div>
        ) : error ? (
          <div className="mb-8 p-6 bg-danger/10 border border-danger/30 rounded-lg text-danger flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center text-danger font-bold">!</div>
            {error}
          </div>
        ) : profiles.length === 0 ? (
          <div className="bg-bg-card rounded-lg p-24 border border-border-subtle flex flex-col items-center justify-center text-center shadow-lg shadow-gold-default/5">
            <div className="w-20 h-20 rounded-full bg-bg-elevated flex items-center justify-center text-text-disabled mb-6">
              <Star size={40} />
            </div>
            <h2 className="heading-h2 text-text-primary mb-2">Ranking vazio</h2>
            <p className="text-text-secondary max-w-sm">Comece a treinar para aparecer no topo do ranking!</p>
          </div>
        ) : (
          <div className="space-y-8 md:space-y-12">
            {/* Top 3 Visual */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8 items-end">
              {/* 2nd Place */}
              {profiles[1] && (
                <div className="order-2 md:order-1 bg-bg-card p-6 md:p-8 rounded-lg md:rounded-lg border border-border-subtle shadow-lg shadow-gold-default/5 flex flex-col items-center text-center relative group">
                  <div className="absolute -top-3 md:-top-4 bg-bg-elevated text-text-secondary px-3 md:px-4 py-1 rounded-full text-[9px] md:text-[10px] uppercase tracking-widest">2º LUGAR</div>
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-border-subtle overflow-hidden mb-3 md:mb-4 shadow-lg group-hover:scale-110 transition-transform">
                    {profiles[1].avatar_url ? (
                      <img src={profiles[1].avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-bg-elevated flex items-center justify-center text-gold-light"><User /></div>
                    )}
                  </div>
                  <h3 className="text-text-primary truncate w-full text-sm md:text-base font-600">{profiles[1].full_name?.split(' ')[0] || 'Atleta'}</h3>
                  <div className="mt-3 md:mt-4 flex items-center gap-2 text-text-secondary text-[9px] md:text-[10px] uppercase tracking-widest">
                    <Zap size={12} /> {profiles[1].total_pontos} pts
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {profiles[0] && (
                <div className="order-1 md:order-2 bg-bg-card p-10 rounded-lg shadow-2xl shadow-gold-light/10 border border-gold-default/30 flex flex-col items-center text-center relative group scale-105">
                  <div className="absolute -top-5 bg-gold-default text-black px-6 py-2 rounded-full text-[10px] uppercase tracking-widest shadow-lg shadow-gold-default/40 flex items-center gap-2 font-600">
                    <Trophy size={14} /> CAMPEÃO
                  </div>
                  <div className="w-28 h-28 rounded-full border-4 border-gold-light/30 overflow-hidden mb-6 shadow-2xl group-hover:scale-110 transition-transform relative">
                    {profiles[0].avatar_url ? (
                      <img src={profiles[0].avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-bg-elevated flex items-center justify-center text-gold-light"><User size={40} /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-gold-light/20 to-transparent" />
                  </div>
                  <h3 className="text-xl text-text-primary truncate w-full font-700">{profiles[0].full_name?.split(' ')[0] || 'Atleta'}</h3>
                  <p className="text-gold-light text-[12px] uppercase tracking-widest mt-2 font-600">{profiles[0].total_pontos} pontos</p>
                </div>
              )}

              {/* 3rd Place */}
              {profiles[2] && (
                <div className="order-3 bg-bg-card p-8 rounded-lg border border-border-subtle shadow-lg shadow-gold-default/5 flex flex-col items-center text-center relative group">
                  <div className="absolute -top-4 bg-gold-default/20 text-gold-light border border-gold-default/20 px-4 py-1 rounded-full text-[10px] uppercase tracking-widest">3º LUGAR</div>
                  <div className="w-20 h-20 rounded-full border-4 border-gold-default/10 overflow-hidden mb-4 shadow-lg group-hover:scale-110 transition-transform">
                    {profiles[2].avatar_url ? (
                      <img src={profiles[2].avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-bg-elevated flex items-center justify-center text-gold-light"><User /></div>
                    )}
                  </div>
                  <h3 className="text-text-primary truncate w-full font-600">{profiles[2].full_name?.split(' ')[0] || 'Atleta'}</h3>
                  <div className="mt-4 flex items-center gap-2 text-text-secondary text-[10px] uppercase tracking-widest">
                    <Zap size={12} /> {profiles[2].total_pontos} pts
                  </div>
                </div>
              )}
            </div>

            {/* General List */}
            <div className="bg-bg-card rounded-lg shadow-2xl shadow-gold-default/5 border border-border-subtle overflow-hidden">
               <div className="px-10 py-8 border-b border-border-subtle bg-bg-elevated flex items-center justify-between">
                  <h2 className="label-overline text-text-secondary">Classificação Geral</h2>
                  <div className="flex items-center gap-2 px-4 py-1 bg-bg-card rounded-full border border-border-subtle text-text-secondary text-[10px]">
                    {formatCount(profiles.length, 'atleta ativo')}
                  </div>
               </div>
               
               <div className="divide-y divide-border-subtle">
                {profiles.map((p, index) => {
                  const isCurrentUser = userProfile?.profile.id === p.aluno_id;
                  
                  return (
                    <div key={p.aluno_id} className={`px-10 py-6 flex items-center justify-between hover:bg-bg-elevated transition-colors ${isCurrentUser ? 'bg-gold-default/5' : ''}`}>
                      <div className="flex items-center gap-6">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm shadow-sm font-700 ${
                          index < 3 ? 'bg-gold-default text-black' : 'bg-bg-elevated text-text-secondary'
                        }`}>
                          {index + 1}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full border-2 overflow-hidden shadow-sm ${isCurrentUser ? 'border-gold-light' : 'border-border-subtle'}`}>
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-bg-elevated flex items-center justify-center text-text-disabled">
                                <User size={18} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className={`${isCurrentUser ? 'text-gold-light' : 'text-text-primary'} font-500`}>
                              {p.full_name || 'Atleta'}
                              {isCurrentUser && <span className="ml-2 text-[8px] uppercase bg-gold-default text-black px-2 py-0.5 rounded-full tracking-widest font-600">VOCÊ</span>}
                            </p>
                            <p className="text-[10px] text-text-disabled uppercase tracking-widest">Elite Athlete</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-text-primary font-700">
                          {p.total_pontos} pts
                        </p>
                        <p className="text-[9px] text-text-secondary uppercase tracking-widest">Pontuação Total</p>
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
