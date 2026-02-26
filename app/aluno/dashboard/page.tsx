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

import { Trophy, Medal, Dumbbell, Activity, Camera, Ruler, Users, User, ArrowRight, Loader2, Calendar, TrendingUp } from 'lucide-react';
import WeeklyAgenda from "@/app/components/WeeklyAgenda";

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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 gap-4">
        <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" />
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Preparando seu dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6 lg:p-10 lg:pl-28 pb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-3 block">Dashboard Executivo</span>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
              Bem-vindo, <span className="text-zinc-500">{userName.split(' ')[0]}</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3 bg-[#0F0F0F] px-4 py-2 rounded-xl border border-[#1a1a1a]">
            <Calendar size={14} className="text-[#D4AF37]" strokeWidth={2.5} />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>

        {/* Weekly Agenda Section */}
        <div className="mb-12">
          <WeeklyAgenda />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <div className="bg-[#0F0F0F] p-6 rounded-2xl border border-[#1a1a1a] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Dumbbell size={48} className="text-white" />
            </div>
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-4">Treinos Concluídos</p>
            <p className="text-3xl font-black text-white leading-none">{stats.treinosConcluidos}</p>
          </div>

          <div className="bg-[#0F0F0F] p-6 rounded-2xl border border-[#1a1a1a] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <TrendingUp size={48} className="text-white" />
            </div>
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-4">Peso Atual</p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black text-white leading-none">{stats.peso?.toFixed(1) || "--"}</p>
              <span className="text-[10px] font-bold text-zinc-600">KG</span>
            </div>
          </div>

          <div className="bg-[#0F0F0F] p-6 rounded-2xl border border-[#1a1a1a] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Activity size={48} className="text-[#D4AF37]" />
            </div>
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-4">Gordura Corporal</p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black text-[#D4AF37] leading-none">{stats.gorduraCorporal?.toFixed(1) || "--"}</p>
              <span className="text-[10px] font-bold text-[#D4AF37]/50">%</span>
            </div>
          </div>

          <div className="bg-[#0F0F0F] p-6 rounded-2xl border border-[#1a1a1a] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Trophy size={48} className="text-white" />
            </div>
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-4">Rotinas Ativas</p>
            <p className="text-3xl font-black text-white leading-none">{stats.fichasTreino}</p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/aluno/treinos" className="group bg-[#0F0F0F] p-8 rounded-2xl border border-[#1a1a1a] flex items-center justify-between hover:border-[#D4AF37]/30 transition-all">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-black rounded-xl border border-[#1a1a1a] flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black transition-all">
                <Dumbbell size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Iniciar Treino</h3>
                <p className="text-xs text-zinc-500 font-medium mt-1">Acesse sua rotina técnica e execute hoje.</p>
              </div>
            </div>
            <ArrowRight className="text-zinc-800 group-hover:text-white transition-colors" />
          </Link>

          <Link href="/aluno/medidas" className="group bg-[#0F0F0F] p-8 rounded-2xl border border-[#1a1a1a] flex items-center justify-between hover:border-[#D4AF37]/30 transition-all">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-black rounded-xl border border-[#1a1a1a] flex items-center justify-center text-zinc-500 group-hover:bg-white group-hover:text-black transition-all">
                <Ruler size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Registro de Evolução</h3>
                <p className="text-xs text-zinc-500 font-medium mt-1">Atualize seu peso e acompanhe seus ganhos.</p>
              </div>
            </div>
            <ArrowRight className="text-zinc-800 group-hover:text-white transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}
