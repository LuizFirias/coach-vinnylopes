"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import Link from "next/link";

interface DashboardStats {
  treinosConcluidos: number;
  ultimoTreino: string | null;
  gorduraCorporal: number | null;
  peso: number | null;
  proximoTreino: string | null;
  fichasTreino: number;
}

import { Trophy, Medal, Dumbbell, Activity, Camera, Ruler, Users, User, ArrowRight, Loader2, Calendar } from 'lucide-react';

export default function AlunoDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    treinosConcluidos: 0,
    ultimoTreino: null,
    gorduraCorporal: null,
    peso: null,
    proximoTreino: null,
    fichasTreino: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        const user = authData?.user;

        if (authError || !user) {
          router.push("/login");
          return;
        }

        const userId = user.id;

        // Buscar informações do perfil
        const { data: profileData } = await supabaseClient
          .from("profiles")
          .select("full_name, role")
          .eq("id", userId)
          .single();

        if (profileData?.role === "coach" || profileData?.role === "super_admin") {
          router.push("/admin/alunos");
          return;
        }

        setUserName(profileData?.full_name || user.email?.split("@")[0] || "Aluno");

        // Buscar treinos concluídos
        const { count: treinosCount } = await supabaseClient
          .from("historico_treinos")
          .select("*", { count: "exact", head: true })
          .eq("aluno_id", userId);

        // Buscar último treino
        const { data: ultimoTreinoData } = await supabaseClient
          .from("historico_treinos")
          .select("data_conclusao")
          .eq("aluno_id", userId)
          .order("data_conclusao", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Buscar medidas mais recentes
        const { data: medidaData } = await supabaseClient
          .from("medidas_aluno")
          .select("gordura_corporal, peso")
          .eq("aluno_id", userId)
          .order("data_medicao", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Buscar fichas de treino ativas
        const { count: fichasCount } = await supabaseClient
          .from("fichas_treino")
          .select("*", { count: "exact", head: true })
          .eq("aluno_id", userId)
          .eq("ativo", true);

        setStats({
          treinosConcluidos: treinosCount || 0,
          ultimoTreino: ultimoTreinoData?.data_conclusao || null,
          gorduraCorporal: medidaData?.gordura_corporal || null,
          peso: medidaData?.peso || null,
          proximoTreino: null,
          fichasTreino: fichasCount || 0,
        });

        setLoading(false);
      } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [router]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const getDaysSince = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-iron-black flex flex-col items-center justify-center p-6 gap-4">
        <Loader2 className="w-12 h-12 text-iron-red animate-spin" />
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Preparando seu dashboard...</p>
      </div>
    );
  }

  const daysSinceLastWorkout = getDaysSince(stats.ultimoTreino);

  return (
    <div className="min-h-screen bg-iron-black p-4 md:p-6 lg:p-10 lg:pl-28">
      <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
              Olá, <span className="text-gradient-red">{userName.split(' ')[0]}</span>
            </h1>
            <p className="text-zinc-500 font-medium text-sm">Foco total na sua evolução hoje.</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-3 bg-iron-gray rounded-xl md:rounded-2xl border border-white/5 shadow-sm">
            <Calendar size={16} className="text-iron-gold" />
            <span className="text-xs md:text-sm font-bold text-zinc-300">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Meus Treinos */}
          <Link
            href="/aluno/treinos"
            className="group relative bg-iron-gray rounded-2xl md:rounded-3xl p-5 md:p-8 border border-white/5 shadow-2xl hover:border-iron-red/30 transition-all duration-500 overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-iron-red/5 rounded-full blur-3xl group-hover:bg-iron-red/10 transition-colors" />
            <div className="relative">
              <div className="flex items-center justify-between mb-5 md:mb-8">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-iron-red/10 rounded-xl md:rounded-2xl flex items-center justify-center text-iron-red group-hover:bg-iron-red group-hover:text-white transition-all duration-500 shadow-neon-red">
                  <Dumbbell size={24} />
                </div>
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-600">TREINO ATUAL</span>
              </div>
              
              <div className="space-y-1">
                <p className="text-4xl md:text-5xl font-black text-white">{stats.fichasTreino}</p>
                <p className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  {stats.fichasTreino === 1 ? 'Ficha Ativa' : 'Fichas Ativas'}
                </p>
              </div>
              
              {daysSinceLastWorkout !== null && (
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-2">
                  <Activity size={14} className="text-iron-red" />
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Visto há {daysSinceLastWorkout === 0 ? 'algumas horas' : `${daysSinceLastWorkout}d atrás`}
                  </p>
                </div>
              )}
            </div>
          </Link>

          {/* Avaliação Física */}
          <Link
            href="/aluno/medidas"
            className="group relative bg-iron-gray rounded-[40px] p-8 border border-white/5 shadow-2xl hover:border-iron-gold/30 transition-all duration-500 overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-iron-gold/5 rounded-full blur-3xl group-hover:bg-iron-gold/10 transition-colors" />
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 bg-iron-gold/10 rounded-2xl flex items-center justify-center text-iron-gold group-hover:bg-iron-gold group-hover:text-white transition-all duration-500 shadow-neon-gold">
                  <Ruler size={28} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">COMPOSIÇÃO</span>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <p className="text-5xl font-black text-white">
                    {stats.gorduraCorporal !== null ? stats.gorduraCorporal.toFixed(1) : '—'}
                  </p>
                  {stats.gorduraCorporal !== null && <span className="text-xl font-black text-zinc-500">%</span>}
                </div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Gordura Corporal
                </p>
              </div>
              
              {stats.peso && (
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-iron-gold animate-pulse" />
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Peso atual: {stats.peso.toFixed(1)} kg
                  </p>
                </div>
              )}
            </div>
          </Link>

          {/* Leaderboard/Ranking */}
          <Link
            href="/aluno/ranking"
            className="group relative bg-iron-gray rounded-[40px] p-8 border border-white/5 shadow-2xl hover:border-iron-red/30 transition-all duration-500 overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all duration-500">
                  <Trophy size={28} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">FREQUÊNCIA</span>
              </div>
              
              <div className="space-y-1">
                <p className="text-5xl font-black text-white">{stats.treinosConcluidos}</p>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Checks Realizados
                </p>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <p className="text-[10px] font-black text-iron-red uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                  Ver Ranking completo
                </p>
                <ArrowRight size={14} className="text-iron-red" />
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bg-iron-gray rounded-2xl md:rounded-3xl border border-white/5 shadow-2xl p-6 md:p-10">
          <h2 className="text-lg md:text-xl font-black text-white mb-6 md:mb-10 flex items-center gap-3">
            Ações <span className="text-iron-red">Rápidas</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <Link
              href="/aluno/fotos"
              className="group flex flex-col items-center justify-center p-5 md:p-8 bg-white/5 rounded-2xl md:rounded-3xl border border-transparent hover:border-iron-red/20 hover:bg-white/10 transition-all"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-iron-red group-hover:scale-110 transition-all mb-3 md:mb-4 shadow-sm border border-white/5">
                <Camera size={24} />
              </div>
              <span className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-white text-center">Fotos de Evolução</span>
            </Link>

            <Link
              href="/aluno/medidas"
              className="group flex flex-col items-center justify-center p-8 bg-white/5 rounded-3xl border border-transparent hover:border-iron-gold/20 hover:bg-white/10 transition-all"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-iron-gold group-hover:scale-110 transition-all mb-4 shadow-sm border border-white/5">
                <Ruler size={32} />
              </div>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-white">Minhas Medidas</span>
            </Link>

            <Link
              href="/aluno/parceiros"
              className="group flex flex-col items-center justify-center p-8 bg-white/5 rounded-3xl border border-transparent hover:border-white/20 hover:bg-white/10 transition-all"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:scale-110 transition-all mb-4 shadow-sm border border-white/5">
                <Users size={32} />
              </div>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-white">Vantagens & Descontos</span>
            </Link>

            <Link
              href="/aluno/perfil"
              className="group flex flex-col items-center justify-center p-8 bg-white/5 rounded-3xl border border-transparent hover:border-iron-red/20 hover:bg-white/10 transition-all"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-iron-red group-hover:scale-110 transition-all mb-4 shadow-sm border border-white/5">
                <User size={32} />
              </div>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-white">Meu Perfil</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
