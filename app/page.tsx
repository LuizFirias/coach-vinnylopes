"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { 
  ShieldAlert, 
  Calendar, 
  Dumbbell, 
  TrendingUp, 
  Trophy 
} from "lucide-react";
import WeeklyAgenda from "./components/WeeklyAgenda";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Medida {
  id: string;
  peso: number;
  data_medicao: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.[0]) {
    return (
      <div className="bg-iron-gray border border-white/10 shadow-2xl rounded-2xl p-4 text-sm text-white backdrop-blur-xl">
        <p className="font-black text-iron-gold text-lg mb-1">{`${payload[0].value} kg`}</p>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{payload[0].payload.data}</p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState<string>("Aluno");
  const [loading, setLoading] = useState(true);
  const [planExpiry, setPlanExpiry] = useState<string | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [lastTreino, setLastTreino] = useState<string | null>(null);
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [rankingPos, setRankingPos] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusPagamento, setStatusPagamento] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: authData } = await supabaseClient.auth.getUser();
        const user = authData?.user;
        if (!user) {
          router.replace("/login");
          return;
        }

        const userId = user.id;

        // Get profile info
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("full_name, data_expiracao, status_pagamento, role")
          .eq("id", userId)
          .single();

        if (profile?.role === "coach") {
          router.replace("/admin/alunos");
          return;
        }

        if (profile?.role === "super_admin") {
          router.replace("/super-admin");
          return;
        }

        const displayName = profile?.full_name || user.email?.split("@")[0] || "Aluno";
        setName(displayName);

        setStatusPagamento(profile?.status_pagamento || "pendente");

        // Check if subscription is active
        if (profile?.data_expiracao) {
          setPlanExpiry(profile.data_expiracao);
          const exp = new Date(profile.data_expiracao);
          const now = new Date();
          const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          setDaysLeft(diff);

          // Block if expired or payment pending
          if (diff <= 0 || profile.status_pagamento === "atrasado") {
            setIsBlocked(true);
            setLoading(false);
            return;
          }
        }

        // Last treino PDF
        const { data: lastTreinoData } = await supabaseClient
          .from("treinos_alunos")
          .select("nome_arquivo")
          .eq("aluno_id", userId)
          .order("data_upload", { ascending: false })
          .limit(1)
          .single();

        if (lastTreinoData?.nome_arquivo) setLastTreino(lastTreinoData.nome_arquivo);

        // Medidas (peso)
        const { data: medidasData } = await supabaseClient
          .from("medidas_aluno")
          .select("id, peso, data_medicao")
          .eq("aluno_id", userId)
          .order("data_medicao", { ascending: true });

        setMedidas((medidasData as Medida[]) || []);

        // Ranking position
        const { data: allProfiles } = await supabaseClient
          .from("profiles")
          .select("id, ultimo_checkin")
          .eq("role", "aluno")
          .order("ultimo_checkin", { ascending: false, nullsFirst: false });

        if (allProfiles) {
          const idx = (allProfiles as any[]).findIndex((p) => p.id === userId);
          setRankingPos(idx >= 0 ? idx + 1 : null);
        }
      } catch (err: any) {
        setError("Erro ao carregar dashboard: " + (err.message || String(err)));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const pesoAtual = medidas.length ? medidas[medidas.length - 1].peso : null;
  const pesoAnterior = medidas.length > 1 ? medidas[medidas.length - 2].peso : null;
  const variacao = pesoAtual != null && pesoAnterior != null ? (pesoAtual - pesoAnterior).toFixed(1) : null;

  const dadosGrafico = medidas.map((m) => ({
    data: new Date(m.data_medicao).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' }),
    peso: m.peso,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-iron-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-iron-gold/20 border-t-iron-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  // Paywall screen
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-iron-black flex items-center justify-center px-4 py-12">
        <div className="max-w-sm w-full">
          <div className="bg-iron-gray/20 rounded-xl shadow-2xl p-10 text-center border border-white/3 backdrop-blur-md">
            <div className="w-16 h-16 bg-iron-gold/5 rounded-xl flex items-center justify-center mx-auto mb-8 border border-iron-gold/10">
              <ShieldAlert className="w-8 h-8 text-iron-gold" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3 tracking-tight uppercase">
              Acesso <span className="text-iron-gold">Expirado</span>
            </h2>
            <p className="text-zinc-600 mb-10 leading-relaxed text-xs font-medium uppercase tracking-wider italic">
              Sua jornada de evolução pausou. Renove sua assinatura para liberar o acesso.
            </p>
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-iron-gold text-black rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-white transition-all block shadow-lg shadow-iron-gold/5"
            >
              Renovar Agora
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-iron-black px-6 sm:px-8 lg:px-12 pt-20 lg:pt-10 pb-10 font-sans">
      <div className="max-w-7xl mx-auto lg:pl-20">
        {/* Welcome header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold tracking-widest text-iron-gold uppercase">Dashboard</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Olá, <span className="text-zinc-400">{name.split(' ')[0]}</span>
            </h2>
          </div>
          
          {planExpiry && (
            <div className="flex items-center gap-3 text-zinc-500">
              <Calendar size={14} />
              <p className="text-[11px] font-medium tracking-wide">Plano até {new Date(planExpiry).toLocaleDateString("pt-BR")}</p>
            </div>
          )}
        </div>

        {/* Agenda Semanal */}
        <div className="mb-10">
           <WeeklyAgenda />
        </div>

        {/* Top cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="bg-iron-gray/40 border border-white-[0.03] p-6 rounded-xl relative overflow-hidden group">
            <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Último Treino</h3>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-iron-gold/5 rounded-lg text-iron-gold">
                <Dumbbell size={18} strokeWidth={1.5} />
              </div>
              <p className="text-sm text-white font-medium truncate">
                {lastTreino || "Disponível em breve"}
              </p>
            </div>
          </div>

          <div className="bg-iron-gray/40 border border-white-[0.03] p-6 rounded-xl relative overflow-hidden group">
            <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Peso Atual</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <p className="text-2xl text-white font-bold">{pesoAtual || "—"}</p>
                <span className="text-[10px] text-zinc-600 font-medium">KG</span>
              </div>
              {variacao != null && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  parseFloat(variacao) < 0 ? 'bg-green-500/10 text-green-500' : 'bg-iron-red/10 text-iron-red'
                }`}>
                  {parseFloat(variacao) > 0 ? '+' : ''}{variacao} kg
                </span>
              )}
            </div>
          </div>

          <div className="bg-iron-gray/40 border border-white-[0.03] p-6 rounded-xl relative overflow-hidden group">
            <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Ranking</h3>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-iron-gold/5 rounded-lg text-iron-gold">
                <Trophy size={18} strokeWidth={1.5} />
              </div>
              <p className="text-xl text-white font-bold">
                {rankingPos != null ? `#${rankingPos}` : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        {dadosGrafico.length > 1 && (
          <div className="bg-iron-gray/20 border border-white-[0.03] p-6 sm:p-8 rounded-2xl relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-sm font-semibold text-white tracking-widest uppercase mb-1">
                  Evolução
                </h2>
                <p className="text-zinc-600 text-[10px] font-medium tracking-wide">Acompanhamento de peso corporal</p>
              </div>
            </div>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.02)" vertical={false} />
                  <XAxis 
                    dataKey="data" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#3f3f46", fontSize: 10, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#3f3f46", fontSize: 10, fontWeight: 500 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(212, 175, 55, 0.1)', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="peso"
                    stroke="#D4AF37"
                    strokeWidth={2}
                    fill="url(#colorPeso)"
                    dot={{ r: 3, fill: "#D4AF37", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#D4AF37", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
