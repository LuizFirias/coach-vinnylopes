"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
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
      <div className="bg-white border border-slate-100 shadow-xl rounded-2xl p-3 text-sm text-slate-900">
        <p className="font-bold text-brand-purple">{`${payload[0].value} kg`}</p>
        <p className="text-xs text-slate-500">{payload[0].payload.data}</p>
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Paywall screen
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-sm w-full">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200 p-8 text-center border border-slate-100">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
              Acesso Expirado
            </h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Sua assinatura precisa ser renovada para que você continue acessando os treinos e acompanhamento.
            </p>
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-brand-purple text-white rounded-2xl font-bold hover:bg-brand-purple/90 transition-all block shadow-lg shadow-brand-purple/20"
            >
              Renovar pelo WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 pt-24 lg:pt-12 pb-12">
      <div className="max-w-5xl mx-auto">
        {/* Welcome header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Olá, {name.split(' ')[0]}! 👋
            </h2>
            <p className="text-slate-500 mt-1 font-medium">
              Pronto para evoluir hoje?
            </p>
          </div>
          
          {planExpiry && (
            <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acesso até {new Date(planExpiry).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' })}</span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Top cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-brand-purple/10 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-brand-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Último Treino</h3>
            <p className="text-lg text-slate-900 font-bold truncate">
              {lastTreino || "Aguardando envio..."}
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-brand-purple/10 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-brand-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Peso Atual</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl text-slate-900 font-bold">
                {pesoAtual != null ? `${pesoAtual} kg` : "—"}
              </p>
              {variacao != null && (
                <span className={`text-sm font-bold ${
                  parseFloat(variacao) < 0 ? 'text-green-500' : 'text-slate-400'
                }`}>
                  {parseFloat(variacao) > 0 ? '+' : ''}{variacao} kg
                </span>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-brand-purple/10 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-brand-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Ranking</h3>
            <p className="text-2xl text-slate-900 font-bold">
              {rankingPos != null ? `#${rankingPos}` : "—"}
            </p>
            <p className="text-xs text-slate-400 font-medium">Posição em frequência</p>
          </div>
        </div>

        {/* Chart */}
        {dadosGrafico.length > 1 && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Evolução do Peso
              </h2>
              <div className="flex gap-2">
                 <div className="flex items-center gap-1.5">
                   <div className="w-3 h-3 rounded-full bg-brand-purple"></div>
                   <span className="text-xs font-bold text-slate-400 uppercase">KG</span>
                 </div>
              </div>
            </div>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="data" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="peso"
                    stroke="#7C3AED"
                    strokeWidth={3}
                    fill="url(#colorPeso)"
                    dot={{ r: 4, fill: "#7C3AED", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
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
